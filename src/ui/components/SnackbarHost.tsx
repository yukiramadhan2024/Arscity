import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Trash2,
  X,
  Undo2,
  Wand2,
} from 'lucide-react';
import {
  useSnackbarStore,
  SnackbarItem,
  SnackbarVariant,
} from '../state/useSnackbarStore';
import { useUIStore } from '../state/useUIStore';
import { SPRING_TACTILE } from '../motion/appleSprings';

const VARIANT_ICONS: Record<SnackbarVariant, React.ReactNode> = {
  success: <CheckCircle2 size={16} strokeWidth={2.2} style={{ color: '#10B981', flexShrink: 0 }} />,
  info: <Sparkles size={16} strokeWidth={2.2} style={{ color: '#007AFF', flexShrink: 0 }} />,
  warning: <AlertTriangle size={16} strokeWidth={2.2} style={{ color: '#F59E0B', flexShrink: 0 }} />,
  destructive: <Trash2 size={16} strokeWidth={2.2} style={{ color: '#EF4444', flexShrink: 0 }} />,
};

const VARIANT_ACCENT_COLORS: Record<SnackbarVariant, string> = {
  success: '#10B981',
  info: '#007AFF',
  warning: '#F59E0B',
  destructive: '#EF4444',
};

interface SnackbarCapsuleProps {
  item: SnackbarItem;
  isPaused: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onDismiss: () => void;
}

const SnackbarCapsule: React.FC<SnackbarCapsuleProps> = ({
  item,
  isPaused,
  onHoverStart,
  onHoverEnd,
  onDismiss,
}) => {
  const duration = item.durationMs ?? 2400;
  const [remainingMs, setRemainingMs] = useState<number>(duration);
  const lastTickRef = useRef<number>(Date.now());

  // Reset remaining time whenever count or lastUpdatedAt changes
  useEffect(() => {
    setRemainingMs(duration);
    lastTickRef.current = Date.now();
  }, [item.count, item.lastUpdatedAt, duration]);

  // Visual countdown progress bar
  useEffect(() => {
    if (isPaused) {
      lastTickRef.current = Date.now();
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;

      setRemainingMs((prev) => {
        const next = prev - delta;
        return next > 0 ? next : 0;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [isPaused]);

  const progressPercent = Math.max(0, Math.min(100, (remainingMs / duration) * 100));
  const accentColor = VARIANT_ACCENT_COLORS[item.variant];

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    // a. Langsung tutup snackbar tersebut
    onDismiss();

    // b. Panggil commandManager.undo() tepat 1 kali
    if (item.onUndo) {
      item.onUndo();
    } else {
      const engine = useUIStore.getState().engine;
      if (engine) {
        engine.undo();
      }
    }

    // c. Tampilkan snackbar singkat bertuliskan Aksi Dibatalkan tanpa tombol Urungkan
    useSnackbarStore.getState().showSnackbar({
      variant: 'info',
      title: 'Aksi Dibatalkan',
      undoable: false,
      groupKey: 'action_undone',
    });
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.action) {
      item.action.onClick();
    }
    onDismiss();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={SPRING_TACTILE}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      style={{
        position: 'relative',
        width: 'fit-content',
        maxWidth: 'min(480px, calc(100vw - 48px))',
        padding: '8px 12px',
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(240, 245, 250, 0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1.5px solid rgba(255, 255, 255, 0.85)',
        boxShadow:
          '0 10px 30px -4px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(0, 0, 0, 0.04)',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      {/* 1. Ikon SVG 16px */}
      {VARIANT_ICONS[item.variant]}

      {/* 2. Teks Judul Ringkas (font-weight 600, max 260px text-overflow ellipsis) */}
      <span
        style={{
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          fontSize: '12px',
          fontWeight: 600,
          color: '#0F172A',
          letterSpacing: '-0.01em',
          maxWidth: '260px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 1,
        }}
        title={item.title}
      >
        {item.title}
      </span>

      {/* 3. Badge Counter (x2, x3...) jika count > 1 */}
      <AnimatePresence>
        {item.count > 1 && (
          <motion.span
            key={`badge-${item.count}`}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={SPRING_TACTILE}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              fontWeight: 700,
              color: '#0F172A',
              background: 'rgba(15, 23, 42, 0.08)',
              padding: '1px 6px',
              borderRadius: '9999px',
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            x{item.count}
          </motion.span>
        )}
      </AnimatePresence>

      {/* 4. Chip Detail Singkat */}
      {item.detail && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            fontWeight: 600,
            color: '#007AFF',
            background: 'rgba(0, 122, 255, 0.08)',
            padding: '2px 7px',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}
        >
          {item.detail}
        </span>
      )}

      {/* Action Button (e.g. "Perbaiki Sekarang") */}
      {item.action && (
        <button
          onClick={handleAction}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            color: '#FFFFFF',
            background: '#007AFF',
            padding: '3px 9px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 122, 255, 0.35)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Wand2 size={12} strokeWidth={2.2} />
          <span>{item.action.label}</span>
        </button>
      )}

      {/* 5. Tombol Urungkan */}
      {item.undoable && (
        <button
          onClick={handleUndo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            color: '#007AFF',
            background: 'rgba(0, 122, 255, 0.10)',
            padding: '3px 8px',
            borderRadius: '9999px',
            border: '1px solid rgba(0, 122, 255, 0.22)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'all 0.1s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Undo2 size={12} strokeWidth={2.2} />
          <span>Urungkan</span>
        </button>
      )}

      {/* 6. Tombol Tutup X */}
      <button
        onClick={onDismiss}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'transparent',
          border: 'none',
          color: '#64748B',
          cursor: 'pointer',
          padding: 0,
          opacity: 0.7,
          flexShrink: 0,
          transition: 'opacity 0.1s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
        title="Tutup Notifikasi"
      >
        <X size={12} strokeWidth={2.4} />
      </button>

      {/* Micro-Progress Bar (1.5px) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '12px',
          right: '12px',
          height: '1.5px',
          borderRadius: '1px',
          overflow: 'hidden',
          background: 'rgba(15, 23, 42, 0.06)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: accentColor,
            opacity: 0.85,
            transition: isPaused ? 'none' : 'width 40ms linear',
          }}
        />
      </div>
    </motion.div>
  );
};

/**
 * Calculates adaptive bottom offset so the snackbar capsule always floats
 * cleanly above the main dock and whichever contextual sub-toolbar is active,
 * preventing any overlap with bottom navbar buttons.
 */
const getSnackbarBottomOffset = (tool: string): number => {
  switch (tool) {
    case 'build':
      return 304; // Safely above Building Catalog (~290px from screen bottom)
    case 'nature':
    case 'landscape':
      return 224; // Safely above Landscape Subtoolbar (~202px from screen bottom)
    case 'terraform':
      return 190; // Safely above Terraform Sculptor (~170px from screen bottom)
    case 'road':
    case 'zone':
    case 'demolish':
      return 165; // Safely above Road / Zone palettes and Bulldozer banner (~145px)
    case 'select':
    case 'analyze':
    default:
      return 112; // Safely above Main Dock (~95px from screen bottom)
  }
};

export const SnackbarHost: React.FC = () => {
  const items = useSnackbarStore((s) => s.items);
  const pausedItemIds = useSnackbarStore((s) => s.pausedItemIds);
  const dismissSnackbar = useSnackbarStore((s) => s.dismissSnackbar);
  const pauseTimer = useSnackbarStore((s) => s.pauseTimer);
  const resumeTimer = useSnackbarStore((s) => s.resumeTimer);
  const activeTool = useUIStore((s) => s.activeTool);

  const bottomOffset = getSnackbarBottomOffset(activeTool);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${bottomOffset}px`,
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'none',
        transition: 'bottom 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <SnackbarCapsule
            key={item.id}
            item={item}
            isPaused={pausedItemIds.has(item.id)}
            onHoverStart={() => pauseTimer(item.id)}
            onHoverEnd={() => resumeTimer(item.id)}
            onDismiss={() => dismissSnackbar(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
