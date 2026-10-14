import React from 'react';
import { useUIStore, ThemeMode, GlassStyle } from '../state/useUIStore';
import { Building, Sparkles, Eye, Check } from 'lucide-react';

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

  if (!showOnboarding) return null;

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '540px',
          maxWidth: '92vw',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--fill-control-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)'
              }}
            >
              <Building size={18} strokeWidth={1.75} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--label)' }}>
                Selamat Datang di Arscity
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Konfigurasi Awal Antarmuka iOS 27 Liquid Glass
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="modal-sheet-body">
          <p style={{ fontSize: '13px', color: 'var(--label)', lineHeight: 1.5, marginBottom: '14px' }}>
            Arscity menghadirkan pengalaman sandbox arsitektur dan tata kota tropis dengan antarmuka Liquid Glass yang disempurnakan untuk kenyamanan visual dan keterbacaan optimal.
          </p>

          {/* Setup Transparansi Kaca */}
          <div className="inset-header">PENGATURAN AWAL MATERIAL KACA</div>
          <div className="inset-group">
            {/* Slider */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Transparansi Kaca</span>
                <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
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
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(0,122,255,0.4) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(52,199,89,0.3) 0%, transparent 40%)'
                  }}
                />
                <div
                  className="glass-surface"
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: 2
                  }}
                >
                  <Eye size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)' }}>
                      Pratinjau Kaca Langsung
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                      Keterbacaan teks teruji di atas viewport 3D
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tema */}
            <div className="inset-row">
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Tema</span>
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
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Gaya Kaca</span>
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
              style={{ padding: '8px 24px', fontSize: '13px' }}
            >
              Mulai Menata Kota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
