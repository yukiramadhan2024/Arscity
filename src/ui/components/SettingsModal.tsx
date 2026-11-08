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
    cameraBobbing,
    setCameraBobbing,
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
    showLODOverlay,
    toggleShowLODOverlay,
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
          background: 'linear-gradient(145deg, #DBF2FC 0%, #EBF7FD 100%)',
          borderRadius: '24px',
          border: '2px solid #072D59',
          boxShadow: '0 12px 36px rgba(7, 45, 89, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#072D59',
          fontFamily: 'var(--font-sans)'
        }}
      >
        {/* Modal Header (Navy Blue Structural Panel) */}
        <div
          className="modal-sheet-header"
          style={{
            padding: '20px 24px 16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#072D59',
            borderBottom: '2px solid rgba(7, 45, 89, 0.20)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: '#FD6E8E',
                border: '2px solid #072D59',
                boxShadow: '2px 2px 0px #072D59',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#FFFFFF'
              }}
            >
              <Settings size={20} style={{ color: 'currentColor' }} strokeWidth={2.4} />
            </div>
            <div>
              <div
                id="settings-modal-title"
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#DBF2FC',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2
                }}
              >
                Pengaturan Kota
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'rgba(219, 242, 252, 0.80)',
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
            className="icon-btn btn-3d-pastel-pink"
            aria-label="Tutup Pengaturan"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#FFFFFF'
            }}
          >
            <X size={16} strokeWidth={2.4} />
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
            gap: '16px',
            background: 'linear-gradient(145deg, #DBF2FC 0%, #EBF7FD 100%)'
          }}
        >
          {/* BAGIAN 1: TAMPILAN & AKSESIBILITAS */}
          <div>
            <div
              className="inset-header"
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#072D59',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              TAMPILAN &amp; AKSESIBILITAS
            </div>
            <div
              className="inset-group"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid rgba(7, 45, 89, 0.14)',
                boxShadow: '0 4px 12px rgba(7, 45, 89, 0.06)',
                overflow: 'hidden',
                color: '#072D59',
                '--label': '#072D59',
                '--label-secondary': 'rgba(7, 45, 89, 0.70)',
                '--labelSecondary': 'rgba(7, 45, 89, 0.70)',
                '--foreground': '#072D59',
                '--fill-control': '#DBF2FC',
                '--hairline': 'rgba(7, 45, 89, 0.16)',
              } as React.CSSProperties}
            >
              {/* Toggle Kurangi Animasi Antarmuka */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Kurangi Animasi Antarmuka
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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

              {/* Toggle Goyangan Kamera (T3.6) */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Goyangan Kamera
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
                    Simulasi gerak langkah alami saat berjalan di mode pejalan kaki
                  </div>
                </div>
                <label className="ios-switch">
                  <input
                    type="checkbox"
                    checked={cameraBobbing}
                    onChange={(e) => setCameraBobbing(e.target.checked)}
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
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Kontras Tinggi
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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
                fontWeight: 800,
                color: '#072D59',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              KUALITAS GRAFIS &amp; PERFORMA
            </div>
            <div
              className="inset-group"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid rgba(7, 45, 89, 0.14)',
                boxShadow: '0 4px 12px rgba(7, 45, 89, 0.06)',
                overflow: 'hidden',
                color: '#072D59',
                '--label': '#072D59',
                '--label-secondary': 'rgba(7, 45, 89, 0.70)',
                '--labelSecondary': 'rgba(7, 45, 89, 0.70)',
                '--foreground': '#072D59',
                '--fill-control': '#DBF2FC',
                '--hairline': 'rgba(7, 45, 89, 0.16)',
              } as React.CSSProperties}
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
                  borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Preset Grafis
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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
                  style={{
                    width: '100%',
                    backgroundColor: '#DBF2FC',
                    border: '1.5px solid rgba(7, 45, 89, 0.16)'
                  }}
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
                  borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Bayangan Matahari Halus
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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
                  borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Efek Cahaya dan Bayangan Sudut
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Akselerator Grafis Terdeteksi
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#072D59',
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
                fontWeight: 800,
                color: '#072D59',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}
            >
              SUARA &amp; KAMERA
            </div>
            <div
              className="inset-group"
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1.5px solid rgba(7, 45, 89, 0.14)',
                boxShadow: '0 4px 12px rgba(7, 45, 89, 0.06)',
                overflow: 'hidden',
                color: '#072D59',
                '--label': '#072D59',
                '--label-secondary': 'rgba(7, 45, 89, 0.70)',
                '--labelSecondary': 'rgba(7, 45, 89, 0.70)',
                '--foreground': '#072D59',
                '--fill-control': '#DBF2FC',
                '--hairline': 'rgba(7, 45, 89, 0.16)',
              } as React.CSSProperties}
            >
              {/* Toggle Efek Suara Interaksi */}
              <div
                className="inset-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Efek Suara Interaksi
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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
                  borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                    Suara Suasana Kota
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                      Sensitivitas Kamera &amp; Mousepad
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
                      Responsivitas pergerakan kamera saat digeser atau diputar
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#072D59'
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
                    height: '6px',
                    borderRadius: '9999px',
                    accentColor: '#FD6E8E',
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
                fontWeight: 800,
                color: '#072D59',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              <span>PENGEMBANG &amp; DIAGNOSTIK</span>
              <ChevronDown
                size={14}
                style={{
                  transform: devSectionOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                  color: '#072D59'
                }}
              />
            </button>

            {devSectionOpen && (
              <div
                className="inset-group"
                style={{
                  marginTop: '6px',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1.5px solid rgba(7, 45, 89, 0.14)',
                  boxShadow: '0 4px 12px rgba(7, 45, 89, 0.06)',
                  overflow: 'hidden',
                  color: '#072D59',
                  '--label': '#072D59',
                  '--label-secondary': 'rgba(7, 45, 89, 0.70)',
                  '--foreground': '#072D59',
                  '--fill-control': '#DBF2FC',
                } as React.CSSProperties}
              >
                {/* Indikator FPS */}
                <div
                  className="inset-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                      Indikator FPS Real-Time
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
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

                {/* Telemetri 3-Zona LOD (Tahap 2 / T2.6) */}
                <div
                  className="inset-row"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(7, 45, 89, 0.08)'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                      Telemetri 3-Zona LOD Real-Time
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
                      Tampilkan jumlah gedung di Zona 0 (dekat), 1 (menengah), dan 2 (jauh) di bilah atas
                    </div>
                  </div>
                  <label className="ios-switch">
                    <input
                      type="checkbox"
                      checked={showLODOverlay}
                      onChange={toggleShowLODOverlay}
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
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>
                      Uji Stres Performa
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(7, 45, 89, 0.70)', marginTop: '2px', fontWeight: 500 }}>
                      Simulasi beban rendering 300 gedung sekaligus
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowLoadTest(true);
                      onClose();
                    }}
                    className="btn-3d-pastel-light"
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
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
              className="btn-3d-pastel-pink"
              style={{
                padding: '9px 28px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
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
