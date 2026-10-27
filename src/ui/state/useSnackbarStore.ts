import { create } from 'zustand';
import { proceduralAudio } from '../../audio/ProceduralAudio';

export type SnackbarVariant = 'success' | 'info' | 'warning' | 'destructive';

export interface SnackbarAction {
  label: string;
  onClick: () => void;
}

export interface SnackbarItem {
  id: string;
  groupKey?: string;
  variant: SnackbarVariant;
  title: string;
  detail?: string;
  count: number;
  undoable?: boolean;
  onUndo?: () => void;
  action?: SnackbarAction;
  durationMs?: number;
  createdAt: number;
  lastUpdatedAt: number;
}

export interface ShowSnackbarInput {
  id?: string;
  groupKey?: string;
  variant?: SnackbarVariant;
  title: string;
  detail?: string;
  undoable?: boolean;
  onUndo?: () => void;
  action?: SnackbarAction;
  durationMs?: number;
  count?: number;
}

interface SnackbarStoreState {
  items: SnackbarItem[];
  pausedItemIds: Set<string>;
  showSnackbar: (input: ShowSnackbarInput) => string;
  dismissSnackbar: (id: string) => void;
  clearAll: () => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  isPaused: (id: string) => boolean;
}

const MAX_VISIBLE_SNACKBARS = 2;
const DEFAULT_DURATION_MS = 2400;
const COALESCE_WINDOW_MS = 2000;

// Store-managed timers independent of React render cycle
const dismissTimerMap = new Map<string, ReturnType<typeof setTimeout>>();

const clearDismissTimer = (id: string): void => {
  const existing = dismissTimerMap.get(id);
  if (existing) {
    clearTimeout(existing);
    dismissTimerMap.delete(id);
  }
};

const scheduleDismissTimer = (id: string, durationMs: number = DEFAULT_DURATION_MS): void => {
  clearDismissTimer(id);
  const timer = setTimeout(() => {
    useSnackbarStore.getState().dismissSnackbar(id);
  }, durationMs);
  dismissTimerMap.set(id, timer);
};

export const useSnackbarStore = create<SnackbarStoreState>((set, get) => ({
  items: [],
  pausedItemIds: new Set<string>(),

  showSnackbar: (input: ShowSnackbarInput) => {
    const variant: SnackbarVariant = input.variant || 'info';
    const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
    const now = Date.now();

    // Trigger haptic / procedural sound feedback
    if (variant === 'destructive') {
      proceduralAudio.playTaptic('medium');
    } else if (variant === 'warning') {
      proceduralAudio.playTaptic('boundary');
    } else {
      proceduralAudio.playTaptic('light');
    }

    const state = get();
    const existingIndex = input.groupKey
      ? state.items.findIndex((item) => item.groupKey === input.groupKey)
      : -1;

    let targetId = '';

    if (existingIndex !== -1) {
      const existing = state.items[existingIndex];
      targetId = existing.id;
      const isWithinCoalesceWindow = (now - existing.lastUpdatedAt < COALESCE_WINDOW_MS);

      // Coalescing: only increment counter if within 2000ms, otherwise reset count back to 1
      const newCount = isWithinCoalesceWindow
        ? existing.count + (input.count ?? 1)
        : (input.count ?? 1);

      const updatedItem: SnackbarItem = {
        ...existing,
        title: input.title,
        detail: input.detail !== undefined ? input.detail : existing.detail,
        variant,
        undoable: input.undoable !== undefined ? input.undoable : existing.undoable,
        onUndo: input.onUndo !== undefined ? input.onUndo : existing.onUndo,
        action: input.action !== undefined ? input.action : existing.action,
        count: newCount,
        durationMs,
        lastUpdatedAt: now,
      };

      const newItems = [...state.items];
      newItems[existingIndex] = updatedItem;
      set({ items: newItems });

      // Refresh auto-dismiss timeout to a fresh 2400ms
      if (!state.pausedItemIds.has(targetId)) {
        scheduleDismissTimer(targetId, durationMs);
      }
    } else {
      // Create fresh snackbar item
      targetId = input.id || `snack_${now}_${Math.random().toString(36).substring(2, 7)}`;
      const newItem: SnackbarItem = {
        id: targetId,
        groupKey: input.groupKey,
        variant,
        title: input.title,
        detail: input.detail,
        count: input.count ?? 1,
        undoable: input.undoable,
        onUndo: input.onUndo,
        action: input.action,
        durationMs,
        createdAt: now,
        lastUpdatedAt: now,
      };

      let newItems = [...state.items, newItem];
      if (newItems.length > MAX_VISIBLE_SNACKBARS) {
        // Evict oldest snackbars and clear their timers
        const evicted = newItems.slice(0, newItems.length - MAX_VISIBLE_SNACKBARS);
        for (const ev of evicted) {
          clearDismissTimer(ev.id);
        }
        newItems = newItems.slice(newItems.length - MAX_VISIBLE_SNACKBARS);
      }
      set({ items: newItems });

      // Schedule auto-dismiss timer
      scheduleDismissTimer(targetId, durationMs);
    }

    return targetId;
  },

  dismissSnackbar: (id: string) => {
    clearDismissTimer(id);
    set((state) => {
      const nextPaused = new Set(state.pausedItemIds);
      nextPaused.delete(id);
      return {
        items: state.items.filter((item) => item.id !== id),
        pausedItemIds: nextPaused,
      };
    });
  },

  clearAll: () => {
    for (const [id, timer] of dismissTimerMap.entries()) {
      clearTimeout(timer);
    }
    dismissTimerMap.clear();
    set({ items: [], pausedItemIds: new Set() });
  },

  pauseTimer: (id: string) => {
    clearDismissTimer(id);
    set((state) => {
      const next = new Set(state.pausedItemIds);
      next.add(id);
      return { pausedItemIds: next };
    });
  },

  resumeTimer: (id: string) => {
    set((state) => {
      const next = new Set(state.pausedItemIds);
      next.delete(id);
      return { pausedItemIds: next };
    });
    scheduleDismissTimer(id, DEFAULT_DURATION_MS);
  },

  pause: (id: string) => {
    get().pauseTimer(id);
  },

  resume: (id: string) => {
    get().resumeTimer(id);
  },

  isPaused: (id: string) => {
    return get().pausedItemIds.has(id);
  },
}));

/**
 * Imperative helper for calling showSnackbar from anywhere (Engine, Tools, Commands, Handlers).
 */
export const showSnackbar = (input: ShowSnackbarInput): string => {
  return useSnackbarStore.getState().showSnackbar(input);
};

export const dismissSnackbar = (id: string): void => {
  useSnackbarStore.getState().dismissSnackbar(id);
};
