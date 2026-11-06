import React from 'react';
import { useUIStore, ThemeMode, GlassStyle } from '../state/useUIStore';
import { Building, Sparkles, Eye, Check } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

export const OnboardingModal: React.FC = () => {
  const {
    showOnboarding,
    setShowOnboarding,
    themeMode,
    setThemeMode,
    glassStyle,
    setGlassStyle,
    glassOpacity,
    setGlassOpacity
  } = useUIStore();

  const modalRef = useModalA11y(showOnboarding, () => setShowOnboarding(false));

  if (!showOnboarding) return null;

  return (
    <div
      className="modal-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setShowOnboarding(false);
      }}
    >
      <div
        ref={modalRef}
        className="modal-sheet"
        style={{
          width: '540px',
          maxWidth: '92vw',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(10, 132, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#007AFF',
                flexShrink: 0
              }}
            >
              <Building size={20} color="#007AFF" strokeWidth={2.2} />
            </div>
            <div>
              <div id="onboarding-modal-title" style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                Selamat Datang di Arscity
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
                Konfigurasi Awal Antarmuka Laboratorium Analisis
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="modal-sheet-body">
          <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.55, marginBottom: '16px' }}>
            Arscity menghadirkan pengalaman sandbox arsitektur dan tata kota tropis dengan antarmuka kaca translusen yang disempurnakan untuk kenyamanan visual dan keterbacaan optimal.
          </p>

          {/* Setup Transparansi Kaca */}
          <div className="inset-header">PENGATURAN AWAL MATERIAL KACA</div>
          <div className="inset-group">
            {/* Slider */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Transparansi Kaca</span>
                <span className="tabular-nums font-mono font-bold" style={{ fontSize: '13px', color: '#007AFF' }}>
                  {Math.round(glassOpacity * 100)}%
                </span>
              </div>

              <input
                type="range"
                min="0.35"
                max="0.95"
                step="0.01"
                value={glassOpacity}
                onChange={(e) => setGlassOpacity(parseFloat(e.target.value))}
                className="ios-slider"
                aria-label="Slider Transparansi Onboarding"
              />

              {/* Live Preview Card */}
              <div
                style={{
                  position: 'relative',
                  height: '74px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, rgba(240, 246, 252, 0.9) 0%, rgba(226, 232, 240, 0.9) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  border: '1px solid #CBD5E1'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(0,122,255,0.15) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(52,199,89,0.15) 0%, transparent 40%)'
                  }}
                />
                <div
                  className="glass-surface"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 2,
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
                  }}
                >
                  <Eye size={16} strokeWidth={2.2} style={{ color: '#007AFF' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      Pratinjau Kaca Langsung
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>
                      Keterbacaan teks teruji di atas viewport 3D
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tema */}
            <div className="inset-row">
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Tema</span>
              <div className="segmented-control">
                {[
                  { id: 'auto' as ThemeMode, label: 'Otomatis' },
                  { id: 'light' as ThemeMode, label: 'Terang' },
                  { id: 'dark' as ThemeMode, label: 'Gelap' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setThemeMode(t.id)}
                    className={`segmented-item ${themeMode === t.id ? 'active' : ''}`}
                  >
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Gaya Kaca */}
            <div className="inset-row">
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>Gaya Kaca</span>
              <div className="segmented-control">
                {[
                  { id: 'clear' as GlassStyle, label: 'Bening' },
                  { id: 'tinted' as GlassStyle, label: 'Berwarna' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setGlassStyle(s.id)}
                    className={`segmented-item ${glassStyle === s.id ? 'active' : ''}`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
            <button
              onClick={() => setShowOnboarding(false)}
              className="ios-btn ios-btn-primary"
              style={{
                padding: '10px 28px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '14px',
                background: 'var(--accent)',
                color: '#FFFFFF',
                border: 'none',
                boxShadow: 'var(--shadow-accent)',
                cursor: 'pointer'
              }}
            >
              Mulai Menata Kota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
