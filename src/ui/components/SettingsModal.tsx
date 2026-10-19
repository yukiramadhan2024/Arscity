import React, { useState } from 'react';
import { useUIStore, GraphicsQuality } from '../state/useUIStore';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { X, Settings, Activity } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
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
          maxHeight: '88vh',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-sheet-header"
          style={{
            padding: '16px 20px',
            background: 'rgba(15, 23, 42, 0.86)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} strokeWidth={1.8} style={{ color: '#0A84FF' }} />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#F8FAFC' }}>
                Pengaturan Kota
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Konfigurasi grafis, kontrol kamera, suara, dan tampilan antarmuka
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#F8FAFC',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Tutup Pengaturan"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-sheet-body" style={{ padding: '16px 20px', overflowY: 'auto' }}>
          {/* BAGIAN 1: KUALITAS GRAFIS & PERFORMA */}
          <div className="inset-header" style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
            KUALITAS GRAFIS & PERFORMA
          </div>
          <div className="inset-group" style={{ background: 'rgba(30, 41, 59, 0.65)', border: '1px solid rgba(255, 255, 255, 0.10)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
            {/* 4 Preset Buttons */}
            <div className="inset-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '10px', padding: '12px 14px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#F8FAFC' }}>
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
                        borderRadius: '10px',
                        border: isActive ? '1px solid rgba(10, 132, 255, 0.8)' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isActive ? 'rgba(10, 132, 255, 0.28)' : 'rgba(255, 255, 255, 0.05)',
                        color: isActive ? '#FFFFFF' : '#CBD5E1',
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
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                  Bayangan Matahari Halus (Soft Shadows)
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                  Efek Cahaya & Atmosfer (Bloom & SSAO)
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ maxWidth: '65%' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                  Kartu Grafis Aktif
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {gpuName}
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLoadTest(true);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(10, 132, 255, 0.16)',
                  border: '1px solid rgba(10, 132, 255, 0.4)',
                  color: '#38BDF8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Activity size={13} />
                <span>Uji Beban 300 Gedung</span>
              </button>
            </div>
          </div>

          {/* BAGIAN 2: SUARA & KAMERA */}
          <div className="inset-header" style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
            SUARA & KAMERA
          </div>
          <div className="inset-group" style={{ background: 'rgba(30, 41, 59, 0.65)', border: '1px solid rgba(255, 255, 255, 0.10)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
            {/* Toggle Efek Suara Interaksi */}
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                  Efek Suara Interaksi
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                  Suara Suasana Kota
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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
            <div className="inset-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', padding: '12px 14px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                    Kecepatan Geser & Putar Kamera (Sensitivitas Mousepad & Kamera)
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Responsivitas pergerakan kamera saat digeser atau diputar
                  </div>
                </div>
                <span className="font-mono tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: '#38BDF8' }}>
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

          {/* BAGIAN 3: TAMPILAN TEKS & AKSESIBILITAS */}
          <div className="inset-header" style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
            TAMPILAN TEKS & AKSESIBILITAS
          </div>
          <div className="inset-group" style={{ background: 'rgba(30, 41, 59, 0.65)', border: '1px solid rgba(255, 255, 255, 0.10)', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
            {/* Pilihan Ukuran Teks UI: Kecil, Normal, Besar */}
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                  Ukuran Teks UI
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                  Skala keterbacaan huruf pada seluruh antarmuka
                </div>
              </div>
              <div className="segmented-control" style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '9999px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {[
                  { val: 0.9, label: 'Kecil' },
                  { val: 1.0, label: 'Normal' },
                  { val: 1.2, label: 'Besar' }
                ].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setTextScale(s.val)}
                    className={`segmented-item ${Math.abs(textScale - s.val) < 0.05 ? 'active' : ''}`}
                    style={{
                      padding: '4px 12px',
                      fontSize: '11px',
                      color: Math.abs(textScale - s.val) < 0.05 ? '#FFFFFF' : '#CBD5E1',
                      background: Math.abs(textScale - s.val) < 0.05 ? '#0A84FF' : 'transparent',
                      borderRadius: '9999px'
                    }}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Kurangi Animasi Antarmuka */}
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                  Kurangi Animasi Antarmuka
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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
            <div className="inset-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '0.5px solid rgba(255, 255, 255, 0.08)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#F8FAFC' }}>
                  Kontras Tinggi
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>
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

          {/* Modal Footer Done Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px',
                borderRadius: '9999px',
                background: '#0A84FF',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.15s ease'
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
