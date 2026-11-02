import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, BookOpen, X, Sparkles } from 'lucide-react';
import { useUIStore } from '../state/useUIStore';

export const EmptyStateGuide: React.FC = () => {
  const { stats, setActiveTool, setShowTutorial } = useUIStore();
  const [dismissed, setDismissed] = useState(false);

  // Only show when the city has 0 roads and 0 buildings, and hasn't been dismissed
  const isEmpty = (stats.roadLengthKm === 0 || !stats.roadLengthKm) && (stats.buildingCount === 0 || !stats.buildingCount);
  
  if (!isEmpty || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 14px 8px 16px',
          background: 'var(--glass-surface-card, rgba(255, 255, 255, 0.85))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border, rgba(0, 0, 0, 0.08))',
          borderRadius: 9999,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
          color: 'var(--glass-text-primary, #0F172A)',
          pointerEvents: 'auto',
          maxWidth: 'min(92vw, 680px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 122, 255, 0.1)',
            color: '#007AFF',
            flexShrink: 0,
          }}
        >
          <Sparkles size={16} strokeWidth={1.75} />
        </div>

        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.35, flex: 1 }}>
          <span>Mulai rancang kota tropis Anda: </span>
          <span style={{ color: 'var(--glass-text-secondary, #64748B)' }}>
            letakkan jalan pertama untuk memandu tata ruang
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setActiveTool('road')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#007AFF',
              border: 'none',
              borderRadius: 9999,
              cursor: 'pointer',
              transition: 'background-color 0.15s, transform 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0062CC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007AFF';
            }}
          >
            <Route size={14} strokeWidth={2} />
            <span>Alat Jalan</span>
          </button>

          <button
            onClick={() => setShowTutorial(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--glass-text-primary, #0F172A)',
              backgroundColor: 'var(--fill-control)',
              border: '1px solid var(--glass-border, rgba(0, 0, 0, 0.08))',
              borderRadius: 9999,
              cursor: 'pointer',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--fill-control-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--fill-control)';
            }}
          >
            <BookOpen size={13} strokeWidth={1.75} />
            <span>Panduan</span>
          </button>

          <button
            onClick={() => setDismissed(true)}
            aria-label="Tutup petunjuk"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              padding: 0,
              color: 'var(--glass-text-muted, #94A3B8)',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              transition: 'color 0.15s, background-color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--glass-text-primary, #0F172A)';
              e.currentTarget.style.backgroundColor = 'var(--fill-control)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--glass-text-muted, #94A3B8)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
