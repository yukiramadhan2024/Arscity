import React, { useState } from 'react';
import { useUIStore, GraphicsQuality, ThemeMode } from '../state/useUIStore';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { X, Settings, Activity, Sun, Moon, Laptop } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    themeMode,
    setThemeMode,
    textScale,
    setTextScale,
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
    engine
  } = useUIStore();

  const [softShadows, setSoftShadows] = useState<boolean>(true);
  const [bloomSSAO, setBloomSSAO] = useState<boolean>(graphicsQuality === 'ultra');
  const [ambientSound, setAmbientSound] = useState<boolean>(true);

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

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '560px',
          maxWidth: '92vw',
          maxHeight: '88vh'
        }}
      >
        {/* Modal Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(10, 132, 255, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Settings size={20} color="#0A84FF" strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--lab-title-color)', letterSpacing: '-0.01em' }}>
                Pengaturan Kota
              </div>
              <div style={{ fontSize: '13px', color: 'var(--lab-subtitle-color)', marginTop: '2px' }}>
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
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--label-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-sheet-body">
          {/* BAGIAN 1: TEMA & TAMPILAN */}
          <div className="inset-header">
            TEMA & TAMPILAN ANTARMUKA
          </div>
          <div className="inset-group">
            {/* Pilihan Tema: Gelap, Terang, Ikuti Sistem */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Tema Antarmuka
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Mode tampilan visual antarmuka pengguna
                </div>
              </div>
              <div className="segmented-control">
                {[
                  { id: 'dark' as ThemeMode, label: 'Gelap', icon: Moon },
                  { id: 'light' as ThemeMode, label: 'Terang', icon: Sun },
                  { id: 'auto' as ThemeMode, label: 'Sistem', icon: Laptop }
                ].map((t) => {
                  const IconComp = t.icon;
                  const isActive = themeMode === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setThemeMode(t.id)}
                      className={`segmented-item ${isActive ? 'active' : ''}`}
                    >
                      <IconComp size={12} strokeWidth={2} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan Ukuran Teks UI: Kecil, Normal, Besar */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Ukuran Teks UI
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Skala keterbacaan huruf pada seluruh antarmuka
                </div>
              </div>
              <div className="segmented-control">
                {[
                  { val: 0.9, label: 'Kecil' },
                  { val: 1.0, label: 'Normal' },
                  { val: 1.2, label: 'Besar' }
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setTextScale(s.val)}
                    className={`segmented-item ${Math.abs(textScale - s.val) < 0.05 ? 'active' : ''}`}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Kurangi Animasi Antarmuka */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Kurangi Animasi Antarmuka
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
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
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Kontras Tinggi
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
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

          {/* BAGIAN 2: KUALITAS GRAFIS & PERFORMA */}
          <div className="inset-header">
            KUALITAS GRAFIS & PERFORMA
          </div>
          <div className="inset-group">
            {/* 4 Preset Buttons */}
            <div className="inset-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                Preset Grafis
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { id: 'low' as GraphicsQuality, label: 'Rendah' },
                  { id: 'medium' as GraphicsQuality, label: 'Sedang' },
                  { id: 'high' as GraphicsQuality, label: 'Tinggi' },
                  { id: 'ultra' as GraphicsQuality, label: 'Ultra RTX' }
                ].map((preset) => {
                  const isActive = graphicsQuality === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleQualityChange(preset.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sub)',
                        border: isActive ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                        background: isActive ? 'var(--accent)' : 'var(--fill-control)',
                        color: isActive ? '#FFFFFF' : 'var(--label)',
                        boxShadow: isActive ? '0 2px 8px rgba(10, 132, 255, 0.4)' : 'none',
                        fontSize: '12px',
                        fontWeight: isActive ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'center'
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Soft Shadows Toggle */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Bayangan Matahari Halus (Soft Shadows)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
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
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Efek Cahaya & Atmosfer (Bloom & SSAO)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Pendaran cahaya lembut dan oklusi ambien pada sudut arsitektur
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

            {/* GPU Status & Load Test Button */}
            <div className="inset-row">
              <div style={{ maxWidth: '65%' }}>
                <div style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>
                  Kartu Grafis Aktif
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {gpuName}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLoadTest(true);
                  onClose();
                }}
                className="ios-btn"
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                <Activity size={13} />
                <span>Uji Beban 300 Gedung</span>
              </button>
            </div>
          </div>

          {/* BAGIAN 3: SUARA & KAMERA */}
          <div className="inset-header">
            SUARA & KAMERA
          </div>
          <div className="inset-group">
            {/* Toggle Efek Suara Interaksi */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Efek Suara Interaksi
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
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
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                  Suara Suasana Kota
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
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
            <div className="inset-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                    Sensitivitas Kamera & Mousepad
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Responsivitas pergerakan kamera saat digeser atau diputar
                  </div>
                </div>
                <span className="font-mono tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--info)' }}>
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
              />
            </div>
          </div>

          {/* Modal Footer Done Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button
              onClick={onClose}
              className="ios-btn ios-btn-primary"
              style={{ padding: '8px 24px' }}
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
