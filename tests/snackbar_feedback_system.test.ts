import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useSnackbarStore, showSnackbar, dismissSnackbar } from '../src/ui/state/useSnackbarStore';
import { CommandManager, ICommand } from '../src/core/commands/CommandManager';

class MockActionCommand implements ICommand {
  public description: string;
  private onExecute: () => void;
  private onUndo: () => void;

  constructor(description: string, onExecute: () => void, onUndo: () => void) {
    this.description = description;
    this.onExecute = onExecute;
    this.onUndo = onUndo;
  }

  public execute(): void {
    this.onExecute();
  }

  public undo(): void {
    this.onUndo();
  }
}

describe('Snackbar Feedback System (Apple HIG & Taptic Feedback)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    useSnackbarStore.getState().clearAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    useSnackbarStore.getState().clearAll();
  });

  describe('Anti-Spam Coalescing & 2000ms Window', () => {
    it('merges repeated consecutive actions within 2000ms with identical groupKey into one item and increments count badge', () => {
      // Menanam 3 Pohon Tabebuya Emas berturut-turut
      showSnackbar({
        groupKey: 'place_landscape_tree_tabebuya_gold',
        variant: 'success',
        title: 'Pohon Tabebuya Emas Ditempatkan',
        detail: 'Pendinginan -2.0°C • Estetika Ruang Publik'
      });

      let items = useSnackbarStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].count).toBe(1);
      expect(items[0].groupKey).toBe('place_landscape_tree_tabebuya_gold');
      const originalId = items[0].id;

      // Pemanggilan kedua
      showSnackbar({
        groupKey: 'place_landscape_tree_tabebuya_gold',
        variant: 'success',
        title: 'Pohon Tabebuya Emas Ditempatkan',
        detail: 'Pendinginan -2.0°C • Estetika Ruang Publik'
      });

      items = useSnackbarStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].id).toBe(originalId);
      expect(items[0].count).toBe(2);

      // Pemanggilan ketiga
      showSnackbar({
        groupKey: 'place_landscape_tree_tabebuya_gold',
        variant: 'success',
        title: 'Pohon Tabebuya Emas Ditempatkan',
        detail: 'Pendinginan -2.0°C • Estetika Ruang Publik'
      });

      items = useSnackbarStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].count).toBe(3);
    });

    it('resets count back to 1 if action occurs after 2000ms window', () => {
      vi.useFakeTimers();

      showSnackbar({
        groupKey: 'place_landscape_tree_tabebuya_gold',
        variant: 'success',
        title: 'Pohon Tabebuya Emas Ditempatkan',
      });

      expect(useSnackbarStore.getState().items[0].count).toBe(1);

      // Lewat 2100ms: snackbar lama sudah expired / lewat window 2000ms
      vi.advanceTimersByTime(2100);

      // Pemanggilan berikutnya harus mulai kembali dari count = 1
      showSnackbar({
        groupKey: 'place_landscape_tree_tabebuya_gold',
        variant: 'success',
        title: 'Pohon Tabebuya Emas Ditempatkan',
      });

      const items = useSnackbarStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].count).toBe(1);
    });

    it('creates distinct items if groupKey differs', () => {
      showSnackbar({
        groupKey: 'place_bld_villa',
        variant: 'success',
        title: 'Membangun Villa Bali Tropis'
      });

      showSnackbar({
        groupKey: 'place_tree_palem',
        variant: 'success',
        title: 'Pohon Palem Raja Ditempatkan'
      });

      const items = useSnackbarStore.getState().items;
      expect(items.length).toBe(2);
      expect(items[0].groupKey).toBe('place_bld_villa');
      expect(items[1].groupKey).toBe('place_tree_palem');
    });
  });

  describe('Queue Constraints (Maksimal 2 Kapsul)', () => {
    it('caps active capsules at 2 and shifts out the oldest when 3rd enters', () => {
      showSnackbar({
        groupKey: 'action_1',
        variant: 'info',
        title: 'Aksi Pertama'
      });
      showSnackbar({
        groupKey: 'action_2',
        variant: 'info',
        title: 'Aksi Kedua'
      });

      expect(useSnackbarStore.getState().items.length).toBe(2);
      expect(useSnackbarStore.getState().items[0].title).toBe('Aksi Pertama');
      expect(useSnackbarStore.getState().items[1].title).toBe('Aksi Kedua');

      // Masuk aksi ke-3: harus geser keluar aksi pertama
      showSnackbar({
        groupKey: 'action_3',
        variant: 'warning',
        title: 'Aksi Ketiga'
      });

      const items = useSnackbarStore.getState().items;
      expect(items.length).toBe(2);
      expect(items[0].title).toBe('Aksi Kedua');
      expect(items[1].title).toBe('Aksi Ketiga');
    });
  });

  describe('Store-Managed 2400ms Auto-Dismiss Timer & Hover Pause', () => {
    it('automatically dismisses snackbar after 2400ms duration', () => {
      vi.useFakeTimers();

      const id = showSnackbar({
        groupKey: 'test_auto_dismiss',
        variant: 'info',
        title: 'Pesan Sementara'
      });

      expect(useSnackbarStore.getState().items.length).toBe(1);

      // Setelah 1200ms masih ada
      vi.advanceTimersByTime(1200);
      expect(useSnackbarStore.getState().items.length).toBe(1);

      // Setelah total 2400ms sudah terhapus bersih
      vi.advanceTimersByTime(1200);
      expect(useSnackbarStore.getState().items.length).toBe(0);
    });

    it('pauses and resumes timer countdown on pointer hover', () => {
      vi.useFakeTimers();

      const id = showSnackbar({
        groupKey: 'test_pause',
        variant: 'info',
        title: 'Uji Jeda Waktu'
      });

      const store = useSnackbarStore.getState();
      expect(store.isPaused(id)).toBe(false);

      // Kursor hover: timer dijeda
      store.pause(id);
      expect(useSnackbarStore.getState().isPaused(id)).toBe(true);

      // Maju 3000ms: snackbar tidak boleh terhapus karena dijeda
      vi.advanceTimersByTime(3000);
      expect(useSnackbarStore.getState().items.length).toBe(1);

      // Kursor keluar: timer dilanjutkan
      store.resume(id);
      expect(useSnackbarStore.getState().isPaused(id)).toBe(false);

      // Maju 2400ms lagi: snackbar baru terhapus
      vi.advanceTimersByTime(2400);
      expect(useSnackbarStore.getState().items.length).toBe(0);
    });

    it('removes item immediately when dismissSnackbar is called manually', () => {
      const id = showSnackbar({
        groupKey: 'test_dismiss',
        variant: 'info',
        title: 'Uji Hapus Manual'
      });

      expect(useSnackbarStore.getState().items.length).toBe(1);
      dismissSnackbar(id);
      expect(useSnackbarStore.getState().items.length).toBe(0);
    });
  });

  describe('Single-Source Construction Execution via CommandManager', () => {
    it('planting 3 trees consecutively through executeCommand produces exactly count = 3', () => {
      const manager = new CommandManager();

      class MockAddTreeCommand implements ICommand {
        public description = 'Tambah Pohon Tabebuya Emas';
        public execute(): void {
          showSnackbar({
            variant: 'success',
            title: 'Pohon Tabebuya Emas Ditempatkan',
            detail: 'Pendinginan -2.0°C • Estetika Ruang Publik',
            undoable: true,
            groupKey: 'place_landscape_tree_tabebuya_gold'
          });
        }
        public undo(): void {}
      }

      // Tanam 3 pohon berturut-turut melalui executeCommand
      manager.executeCommand(new MockAddTreeCommand());
      manager.executeCommand(new MockAddTreeCommand());
      manager.executeCommand(new MockAddTreeCommand());

      const items = useSnackbarStore.getState().items;
      expect(items.length).toBe(1);
      expect(items[0].title).toBe('Pohon Tabebuya Emas Ditempatkan');
      expect(items[0].count).toBe(3); // Tepat count = 3, bukan x41
    });

    it('undo displays Aksi Dibatalkan without undoable button', () => {
      const manager = new CommandManager();
      let state = 0;

      const cmd = new MockActionCommand(
        'Tanam Pohon',
        () => { state += 1; },
        () => { state -= 1; }
      );

      manager.execute(cmd);
      expect(state).toBe(1);

      // Undo dipanggil
      manager.undo();
      expect(state).toBe(0);

      const items = useSnackbarStore.getState().items;
      const lastItem = items[items.length - 1];
      expect(lastItem.title).toBe('Aksi Dibatalkan');
      expect(lastItem.undoable).toBeFalsy(); // Tidak ada tombol Urungkan di dalam toast Aksi Dibatalkan
    });
  });

  describe('Inline Action Button (Perbaiki Sekarang)', () => {
    it('executes the custom action callback when clicked', () => {
      const autoFixMock = vi.fn();

      showSnackbar({
        groupKey: 'regulatory_violation_gsb',
        variant: 'warning',
        title: 'Gedung Melebihi Garis GSB',
        detail: 'Jarak ke aspal < 4.0 m',
        action: {
          label: 'Perbaiki Sekarang',
          onClick: autoFixMock
        }
      });

      const item = useSnackbarStore.getState().items[0];
      expect(item.action).toBeDefined();
      expect(item.action?.label).toBe('Perbaiki Sekarang');

      item.action?.onClick();
      expect(autoFixMock).toHaveBeenCalledTimes(1);
    });
  });
});
