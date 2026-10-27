import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../state/useUIStore';
import { MAIN_TOOLS_I18N } from '../constants/i18n';
import { SPRING_TACTILE } from '../motion/appleSprings';
import {
  MousePointer,
  Route,
  LayoutGrid,
  Building2,
  Trees,
  Waves,
  Trash2,
  SlidersHorizontal,
  LucideIcon
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  select: MousePointer,
  road: Route,
  zone: LayoutGrid,
  build: Building2,
  nature: Trees,
  terraform: Waves,
  demolish: Trash2,
  analyze: SlidersHorizontal
};

export const ContextualHintBar: React.FC = React.memo(() => {
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);

  const toolInfo = MAIN_TOOLS_I18N[activeTool] || MAIN_TOOLS_I18N.select;
  const ToolIcon = ICON_MAP[activeTool] || MousePointer;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTool}
        initial={{ opacity: 0, y: 6, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.96 }}
        transition={SPRING_TACTILE}
        className="arscity-glass-bar interactive"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '5px 14px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
          marginBottom: '8px',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
        role="status"
        aria-live="polite"
      >
        {/* Tool Icon + Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#007AFF',
            fontWeight: 700,
            fontSize: '12px'
          }}
        >
          <ToolIcon size={14} strokeWidth={2} style={{ color: '#007AFF' }} />
          <span>{toolInfo.label}:</span>
        </div>

        {/* Step-by-Step Contextual Hint */}
        <span
          style={{
            fontSize: '12px',
            color: '#334155',
            fontWeight: 500,
            letterSpacing: '-0.01em'
          }}
        >
          {toolInfo.hint}
        </span>

        {/* Separator Dot */}
        <span style={{ color: '#CBD5E1', fontSize: '10px' }}>•</span>

        {/* Esc to Cancel Pill Button */}
        {activeTool !== 'select' ? (
          <button
            onClick={() => setActiveTool('select')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              background: 'rgba(0, 122, 255, 0.08)',
              border: '1px solid rgba(0, 122, 255, 0.25)',
              color: '#007AFF',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            title="Batal dan kembali ke alat Pilih (Tekan Esc)"
            aria-label="Batal dan kembali ke alat Pilih"
          >
            <kbd
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                padding: '0 3px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid rgba(0, 122, 255, 0.2)',
                color: '#007AFF'
              }}
            >
              Esc
            </kbd>
            <span>Batal</span>
          </button>
        ) : (
          <span
            style={{
              fontSize: '11px',
              color: '#64748B',
              fontWeight: 500
            }}
          >
            Pintas: 1–8
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
});
