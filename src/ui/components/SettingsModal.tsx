import React, { useState } from 'react';
import { useUIStore, GraphicsQuality } from '../state/useUIStore';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { X, Settings, Activity, ChevronDown } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';
import { SegmentedControl } from '../primitives/SegmentedControl';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useModalA11y(isOpen, onClose);
  const {
    reduceMotion,
    setReduceMotion,
    highContrast,
    setHighContrast,
    graphicsQuality,
    setGraphicsQuality,
    soundEnabled,
    toggleSound,
    mousepadSensitivity,
    setMousepadSensitivity,
    setShowLoadTest,
    showFps,
    toggleShowFps,
    engine
  } = useUIStore();

  const [softShadows, setSoftShadows] = useState<boolean>(true);
  const [bloomSSAO, setBloomSSAO] = useState<boolean>(graphicsQuality === 'ultra');
  const [ambientSound, setAmbientSound] = useState<boolean>(true);
  const [devSectionOpen, setDevSectionOpen] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleQualityChange = (q: GraphicsQuality) => {
    setGraphicsQuality(q);
    if (q === 'low') {
      setSoftShadows(false);
      setBloomSSAO(false);
    } else if (q === 'ultra') {
      setSoftShadows(true);
      setBloomSSAO(true);
    }
    proceduralAudio.playClick();
  };

  const handleToggleShadows = (enabled: boolean) => {
    setSoftShadows(enabled);
    if (engine?.renderer) {
      engine.renderer.shadowMap.enabled = enabled;
      engine.renderer.shadowMap.needsUpdate = true;
    }
  };

  const handleToggleBloomSSAO = (enabled: boolean) => {
    setBloomSSAO(enabled);
    if (engine?.postProcessingManager) {
      engine.postProcessingManager.setEnabled(enabled);
    }
  };

  const handleSoundToggle = () => {
    toggleSound();
    proceduralAudio.enabled = !soundEnabled;
    if (!soundEnabled) {
      proceduralAudio.playClick();
    }
  };

  const gpuInfo = engine?.getGpuInfo();
  const gpuName = gpuInfo?.renderer || 'Akselerator Grafis WebGL';
  const cleanGpuName = (() => {
    if (!gpuName) return 'Akselerator Grafis WebGL';
    const match = gpuName.match(/(?:NVIDIA\s+GeForce\s+[^,)]+|Apple\s+M\d+[^,)]*|AMD\s+Radeon\s+[^,)]+|Intel\s+[^,)]+)/i);
    if (match) return match[0];
    const angleMatch = gpuName.match(/ANGLE\s*\([^,]+,\s*([^,)]+)/i);
    if (angleMatch) return angleMatch[1];
    return gpuName.length > 36 ? gpuName.slice(0, 36) + '...' : gpuName;
  })();

  return (
    <div
      className="modal-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--scrim)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        ref={modalRef}
        className="modal-sheet"
        style={{
          width: '560px',
          maxWidth: '92vw',
          maxHeight: '88vh',
          background: 'rgba(248, 250, 252, 0.92)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.6) inset',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#0F172A',
          fontFamily: 'var(--font-sans)'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-sheet-header"
          style={{
            padding: '20px 24px 16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.15), rgba(0, 212, 255, 0.15))',
                border: '1px solid rgba(0, 102, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Settings size={20} color="#0066FF" strokeWidth={2.2} />
            </div>
            <div>
              <div
                id="settings-modal-title"
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                Pengaturan Kota
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: '#475569',
                  marginTop: '3px',
                  fontWeight: 500
                }}
              >
                Konfigurasi grafis, kontrol kamera, suara, dan tampilan antarmuka
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Tutup Pengaturan"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--fill-control)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--label-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} strokeWidth={2.2} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-sheet-body"
          style={{
            padding: '18px 24px 24px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* BAGIAN 1: TAMPILAN & AKSESIBILITAS */}
          <div>
            <div
              className="inset-header"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              TAMPILAN &amp; AKSESIBILITAS
            </div>
            <div
              className="inset-group"
              style={{
                background: 'rgba(255, 255, 255, 0.78)',
                borderRadius: '16px',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                overflow: 'hidden'
              }}
            >
              {/* Toggle Kurangi Animasi Antarmuka */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Kurangi Animasi Antarmuka
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                    Menonaktifkan efek transisi gerak demi kenyamanan mata
                  </div>
                </div>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={reduceMotion}
                    onChange={(e) => setReduceMotion(e.target.checked)}
                  />
                  <span className="ios-switch-slider" />
                </label>
              </div>

              {/* Toggle Kontras Tinggi */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Kontras Tinggi
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                    Mempertegas garis tepi panel dan keterbacaan teks
                  </div>
                </div>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={highContrast}
                    onChange={(e) => setHighContrast(e.target.checked)}
                  />
                  <span className="ios-switch-slider" />
                </label>
              </div>
            </div>
          </div>

          {/* BAGIAN 2: KUALITAS GRAFIS & PERFORMA */}
          <div>
            <div
              className="inset-header"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              KUALITAS GRAFIS &amp; PERFORMA
            </div>
            <div
              className="inset-group"
              style={{
                background: 'rgba(255, 255, 255, 0.78)',
                borderRadius: '16px',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                overflow: 'hidden'
              }}
            >
              {/* Segmented Control iOS Preset Grafis */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '10px',
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Preset Grafis
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                    Optimasi otomatis untuk resolusi, bayangan, dan refresh rate monitor
                  </div>
                </div>
                <SegmentedControl<GraphicsQuality>
                  ariaLabel="Preset Kualitas Grafis"
                  options={[
                    { value: 'low', label: 'Rendah' },
                    { value: 'medium', label: 'Sedang' },
                    { value: 'high', label: 'Tinggi' },
                    { value: 'ultra', label: 'Ultra 144Hz' }
                  ]}
                  value={graphicsQuality}
                  onChange={handleQualityChange}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Soft Shadows Toggle */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Bayangan Matahari Halus
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                    Pencahayaan realistis dengan bayangan dinamis sesuai posisi matahari
                  </div>
                </div>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={softShadows}
                    onChange={(e) => handleToggleShadows(e.target.checked)}
                  />
                  <span className="ios-switch-slider" />
                </label>
              </div>

              {/* Bloom & SSAO Toggle */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Efek Cahaya dan Bayangan Sudut
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                    Pendaran cahaya lembut dan bayangan sudut ruang arsitektur
                  </div>
                </div>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={bloomSSAO}
                    onChange={(e) => handleToggleBloomSSAO(e.target.checked)}
                  />
                  <span className="ios-switch-slider" />
                </label>
              </div>

              {/* Perangkat Grafis */}
              <div
                className="inset-row"
                style={{
                  padding: '12px 16px'
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Akselerator Grafis Terdeteksi
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#0F172A',
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: 'var(--font-mono)'
                    }}
                    title={gpuName}
                  >
                    {cleanGpuName}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BAGIAN 3: SUARA & KAMERA */}
          <div>
            <div
              className="inset-header"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#0F172A',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              SUARA &amp; KAMERA
            </div>
            <div
              className="inset-group"
              style={{
                background: 'rgba(255, 255, 255, 0.78)',
                borderRadius: '16px',
                border: '1px solid rgba(15, 23, 42, 0.06)',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                overflow: 'hidden'
              }}
            >
              {/* Toggle Efek Suara Interaksi */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Efek Suara Interaksi
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                    Suara tombol antarmuka, penempatan jalan, dan konstruksi bangunan
                  </div>
                </div>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={handleSoundToggle}
                  />
                  <span className="ios-switch-slider" />
                </label>
              </div>

              {/* Toggle Suara Suasana Kota */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                    Suara Suasana Kota
                  </div>
                  <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                    Efek angin tropis, tetesan hujan, dan hembusan udara lingkungan
                  </div>
                </div>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={ambientSound}
                    onChange={(e) => setAmbientSound(e.target.checked)}
                  />
                  <span className="ios-switch-slider" />
                </label>
              </div>

              {/* Slider Kecepatan Geser & Putar Kamera (Sensitivitas) */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: '8px',
                  padding: '12px 16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Sensitivitas Kamera &amp; Mousepad
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                      Responsivitas pergerakan kamera saat digeser atau diputar
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#0066FF'
                    }}
                  >
                    {mousepadSensitivity.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={mousepadSensitivity}
                  onChange={(e) => setMousepadSensitivity(parseFloat(e.target.value))}
                  className="ios-slider"
                  aria-label="Sensitivitas Kamera"
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '9999px',
                    accentColor: '#0066FF',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>
          </div>

          {/* BAGIAN 4: PENGEMBANG (Collapsible) */}
          <div style={{ marginTop: '4px' }}>
            <button
              onClick={() => setDevSectionOpen(!devSectionOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
                color: '#475569',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              <span>PENGEMBANG &amp; DIAGNOSTIK</span>
              <ChevronDown
                size={14}
                style={{
                  transform: devSectionOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  color: '#475569'
                }}
              />
            </button>

            {devSectionOpen && (
              <div
                className="inset-group"
                style={{
                  marginTop: '6px',
                  background: 'rgba(255, 255, 255, 0.78)',
                  borderRadius: '16px',
                  border: '1px solid rgba(15, 23, 42, 0.06)',
                  boxShadow: '0 2px 10px rgba(15, 23, 42, 0.03)',
                  overflow: 'hidden'
                }}
              >
                {/* Indikator FPS */}
                <div
                  className="inset-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Indikator FPS Real-Time
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                      Tampilkan kapsul frame rate rendering real-time di bilah atas
                    </div>
                  </div>
                  <label className="ios-switch">
                    <input
                      type="checkbox"
                      checked={showFps}
                      onChange={toggleShowFps}
                    />
                    <span className="ios-switch-slider" />
                  </label>
                </div>

                {/* Uji Beban 300 Gedung */}
                <div
                  className="inset-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
                      Uji Stres Performa
                    </div>
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontWeight: 500 }}>
                      Simulasi beban rendering 300 gedung sekaligus
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowLoadTest(true);
                      onClose();
                    }}
                    className="ios-btn"
                    style={{
                      background: 'rgba(0, 102, 255, 0.1)',
                      color: '#0066FF',
                      border: '1px solid rgba(0, 102, 255, 0.25)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '6px 14px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Activity size={13} strokeWidth={2.2} />
                    <span>Uji Beban 300 Gedung</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Done Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={onClose}
              className="ios-btn ios-btn-primary"
              style={{
                padding: '9px 28px',
                borderRadius: '12px',
                background: '#0066FF',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 102, 255, 0.3)'
              }}
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
