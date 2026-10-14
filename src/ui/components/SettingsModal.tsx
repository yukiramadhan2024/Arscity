import React from 'react';
import { useUIStore, ThemeMode, GlassStyle, GraphicsQuality } from '../state/useUIStore';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { ZONE_RULES, ZoneType, BUILDING_CODE_DISCLAIMER } from '../../zones/ZoneTypes';
import { X, Settings, Sun, Moon, Sparkles, Check, Eye, RotateCcw, Activity } from 'lucide-react';
import { roomStandardsRegistry } from '../../buildings/RoomStandards';
import { runoffSimulator } from '../../simulation/RunoffSimulator';
import { structuralChecker } from '../../simulation/StructuralChecker';
import { costEstimator } from '../../simulation/CostEstimator';
import { advancedBuildingCodeRegistry } from '../../zones/AdvancedBuildingCode';
import { cityScoreAnalyzer } from '../../analysis/CityScoreAnalyzer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    themeMode,
    setThemeMode,
    glassStyle,
    setGlassStyle,
    glassOpacity,
    setGlassOpacity,
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

  const [selectedZoneTab, setSelectedZoneTab] = React.useState<ZoneType>('residential');
  const [, setRuleVersion] = React.useState<number>(0);
  const [, setSimVersion] = React.useState<number>(0);
  const triggerSimUpdate = () => setSimVersion((v) => v + 1);

  if (!isOpen) return null;

  const handleQualityChange = (q: GraphicsQuality) => {
    setGraphicsQuality(q);
    proceduralAudio.playClick();
  };

  const handleSoundToggle = () => {
    toggleSound();
    proceduralAudio.enabled = !soundEnabled;
    if (!soundEnabled) {
      proceduralAudio.playClick();
    }
  };

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '580px',
          maxWidth: '92vw',
          maxHeight: '88vh'
        }}
      >
        {/* Modal Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label)' }}>
                Pengaturan Tampilan & Sistem
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Bahasa Desain iOS 27 Liquid Glass Refined
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup Pengaturan">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Inset Grouped Settings Body */}
        <div className="modal-sheet-body">
          {/* SECTION 1: TAMPILAN LIQUID GLASS */}
          <div className="inset-header">TAMPILAN & MATERIAL KACA</div>
          <div className="inset-group">
            {/* Tema */}
            <div className="inset-row">
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Tema Antarmuka</span>
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
              <span style={{ fontSize: '13px', fontWeight: 500 }}>Gaya Material Kaca</span>
              <div className="segmented-control">
                {[
                  { id: 'clear' as GlassStyle, label: 'Bening (Clear)' },
                  { id: 'tinted' as GlassStyle, label: 'Berwarna (Tinted)' }
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

            {/* Slider Transparansi Kaca */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Transparansi Kaca</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Rentang opasitas 35% sampai 95% (standar 60%)
                  </div>
                </div>
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
                aria-label="Slider Transparansi Kaca"
              />

              {/* Live Preview Card */}
              <div
                style={{
                  position: 'relative',
                  height: '76px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #0f172a 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px'
                }}
              >
                {/* Background geometric mockup representing 3D scene underneath */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(0,122,255,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(52,199,89,0.3) 0%, transparent 40%)'
                  }}
                />
                <div
                  className="glass-surface"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    zIndex: 2,
                    maxWidth: '90%'
                  }}
                >
                  <Eye size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)' }}>
                      Pratinjau Keterbacaan Teks
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                      Teks kontras tinggi di atas Liquid Glass
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: AKSESIBILITAS & TIPOGRAFI */}
          <div className="inset-header">AKSESIBILITAS & TEKS</div>
          <div className="inset-group">
            {/* Ukuran Teks */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Ukuran Teks</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Skala font antarmuka
                </div>
              </div>
              <div className="segmented-control">
                {[
                  { val: 0.9, label: '90%' },
                  { val: 1.0, label: '100%' },
                  { val: 1.15, label: '115%' },
                  { val: 1.3, label: '130%' }
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setTextScale(s.val)}
                    className={`segmented-item ${Math.abs(textScale - s.val) < 0.05 ? 'active' : ''}`}
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kurangi Gerakan */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Kurangi Gerakan (Reduce Motion)</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Ganti animasi spring dengan transisi fade 120ms
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

            {/* Kontras Tinggi */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Kontras Tinggi (Increase Contrast)</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Pertegas garis pemisah dan kepekatan teks
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

          {/* SECTION 3: GRAFIS 3D PRESETS */}
          <div className="inset-header">PERFORMA & KUALITAS GRAFIS</div>
          <div className="inset-group">
            {[
              { id: 'low' as GraphicsQuality, title: 'Low (Ringan)', desc: 'Tanpa blur kaca (solid A 0.94), tanpa bayangan 3D, hemat daya' },
              { id: 'medium' as GraphicsQuality, title: 'Medium (Standar)', desc: 'Blur kaca 16px, soft shadow 1024, resolusi seimbang' },
              { id: 'high' as GraphicsQuality, title: 'High (Optimal)', desc: 'Blur kaca 24px, PCF shadow 2048, kejernihan penuh' }
            ].map((preset) => {
              const isActive = graphicsQuality === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleQualityChange(preset.id)}
                  className="inset-row inset-row-clickable"
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isActive ? 'var(--accent)' : 'var(--label)' }}>
                      {preset.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                      {preset.desc}
                    </div>
                  </div>
                  {isActive && <Check size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />}
                </div>
              );
            })}

            {/* Status Tekstur PBR (T1.1) */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Status Material PBR</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  {MaterialLibrary.getInstance().isUsingFallback()
                    ? 'Memakai generator kanvas in-engine karena berkas gagal dimuat'
                    : '13 paket tekstur foto CC0 1K (AmbientCG & Three.js) aktif'}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-capsule)',
                  backgroundColor: MaterialLibrary.getInstance().isUsingFallback() ? 'rgba(255, 149, 0, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                  color: MaterialLibrary.getInstance().isUsingFallback() ? 'var(--warn)' : 'var(--good)'
                }}
              >
                {MaterialLibrary.getInstance().isUsingFallback() ? 'Tekstur Sementara' : 'Tekstur CC0 Nyata (1K)'}
              </span>
            </div>

            {/* Uji Beban Dev Tool (Milestone T3) */}
            <div
              className="inset-row inset-row-clickable"
              onClick={() => {
                setShowLoadTest(true);
                onClose();
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                  Alat Uji Beban & Telemetri (300 Gedung + 3 km Jalan)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Uji 60 FPS dan pantau draw calls, segitiga, serta memori buffer WebGL
                </div>
              </div>
              <Activity size={16} style={{ color: 'var(--accent)' }} />
            </div>
          </div>

          {/* SECTION 4: AUDIO SINTESIS */}
          <div className="inset-header">AUDIO PROSEDURAL</div>
          <div className="inset-group">
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Efek Suara Sintetis (Web Audio)</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Suara interaksi klik, jalan, dan konstruksi berbasis osilator murni
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
          </div>

          {/* SECTION 5: PENGATURAN ATURAN ZONASI & SEMPADAN (PBG / RDTR) */}
          <div className="inset-header">PENGATURAN ATURAN ZONASI & SEMPADAN (PBG / RDTR)</div>
          <div className="inset-group">
            {/* Zone Selector */}
            <div className="inset-row" style={{ overflowX: 'auto', gap: '4px', padding: '8px' }}>
              {(Object.keys(ZONE_RULES) as ZoneType[]).map((zt) => {
                const zr = ZONE_RULES[zt];
                const isSel = selectedZoneTab === zt;
                return (
                  <button
                    key={zt}
                    onClick={() => setSelectedZoneTab(zt)}
                    className={`segmented-item ${isSel ? 'active' : ''}`}
                    style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                  >
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: zr.color, marginRight: '5px' }} />
                    {zr.name.split(' (')[0]}
                  </button>
                );
              })}
            </div>

            {/* Editable Fields for Active Zone */}
            {(() => {
              const rule = ZONE_RULES[selectedZoneTab];
              const triggerUpdate = () => {
                setRuleVersion((v) => v + 1);
                engine?.lotManager.evaluateAllLots();
              };

              return (
                <>
                  {/* Max KDB */}
                  <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>KDB Maksimum (Kepadatan Dasar)</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Sumber: {rule.sources.kdb}
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                        {rule.maxKDB}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={rule.maxKDB}
                      onChange={(e) => {
                        rule.maxKDB = parseInt(e.target.value);
                        triggerUpdate();
                      }}
                      className="ios-slider"
                      aria-label="KDB Maksimum"
                    />
                  </div>

                  {/* Max KLB */}
                  <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>KLB Maksimum (Lantai Bangunan)</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Sumber: {rule.sources.klb}
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                        {rule.maxKLB}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="8.0"
                      step="0.1"
                      value={rule.maxKLB}
                      onChange={(e) => {
                        rule.maxKLB = parseFloat(e.target.value);
                        triggerUpdate();
                      }}
                      className="ios-slider"
                      aria-label="KLB Maksimum"
                    />
                  </div>

                  {/* Min KDH */}
                  <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>KDH Minimum (Ruang Hijau Resapan)</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Sumber: {rule.sources.kdh}
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--good)' }}>
                        {rule.minKDH}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="90"
                      step="5"
                      value={rule.minKDH}
                      onChange={(e) => {
                        rule.minKDH = parseInt(e.target.value);
                        triggerUpdate();
                      }}
                      className="ios-slider"
                      aria-label="KDH Minimum"
                    />
                  </div>

                  {/* Min GSB Depan */}
                  <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>GSB Depan Minimum (ke Jalan)</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Sumber: {rule.sources.gsb}
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warn)' }}>
                        {rule.minGSBFront} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="10.0"
                      step="0.5"
                      value={rule.minGSBFront}
                      onChange={(e) => {
                        rule.minGSBFront = parseFloat(e.target.value);
                        rule.minGSB = rule.minGSBFront;
                        triggerUpdate();
                      }}
                      className="ios-slider"
                      aria-label="GSB Depan Minimum"
                    />
                  </div>

                  {/* Min GSB Samping */}
                  <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>GSB Samping Minimum</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Sumber: Permen PUPR 29/2006 (Ilustrasi)
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                        {rule.minGSBSide} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="5.0"
                      step="0.5"
                      value={rule.minGSBSide}
                      onChange={(e) => {
                        rule.minGSBSide = parseFloat(e.target.value);
                        triggerUpdate();
                      }}
                      className="ios-slider"
                      aria-label="GSB Samping Minimum"
                    />
                  </div>

                  {/* Min GSB Belakang */}
                  <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>GSB Belakang Minimum</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Sumber: Permen PUPR 29/2006 (Ilustrasi)
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                        {rule.minGSBRear} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="6.0"
                      step="0.5"
                      value={rule.minGSBRear}
                      onChange={(e) => {
                        rule.minGSBRear = parseFloat(e.target.value);
                        triggerUpdate();
                      }}
                      className="ios-slider"
                      aria-label="GSB Belakang Minimum"
                    />
                  </div>

                  {/* Max Floors */}
                  <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>Batas Maksimum Lantai</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Sumber: {rule.sources.height}
                        </div>
                      </div>
                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                        {rule.maxFloors} Lantai
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      step="1"
                      value={rule.maxFloors}
                      onChange={(e) => {
                        rule.maxFloors = parseInt(e.target.value);
                        triggerUpdate();
                      }}
                      className="ios-slider"
                      aria-label="Batas Maksimum Lantai"
                    />
                  </div>
                </>
              );
            })()}
          </div>

          {/* SECTION: STANDAR RUANG & PLAFON INTERIOR */}
          <div className="inset-header">STANDAR RUANG & PLAFON (SNI & PERMEN PUPR)</div>
          <div className="inset-group">
            {/* Kamar Tidur Utama */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Luas Minimum Kamar Tidur Utama</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: SNI 03-1733-2004 / Kepmenkes 829/1999
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {roomStandardsRegistry.getStandard('bedroom').minAreaM2} m²
                </span>
              </div>
              <input
                type="range"
                min="6"
                max="16"
                step="0.5"
                value={roomStandardsRegistry.getStandard('bedroom').minAreaM2}
                onChange={(e) => {
                  roomStandardsRegistry.updateStandard('bedroom', { minAreaM2: parseFloat(e.target.value) });
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Luas Minimum Kamar Tidur"
              />
            </div>

            {/* Tinggi Plafon Kamar Tidur */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Tinggi Minimum Plafon Kamar Tidur</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: Permen PUPR 29/2006
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {roomStandardsRegistry.getStandard('bedroom').minCeilingHeightM} m
                </span>
              </div>
              <input
                type="range"
                min="2.2"
                max="4.0"
                step="0.1"
                value={roomStandardsRegistry.getStandard('bedroom').minCeilingHeightM}
                onChange={(e) => {
                  roomStandardsRegistry.updateStandard('bedroom', { minCeilingHeightM: parseFloat(e.target.value) });
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Tinggi Plafon Kamar Tidur"
              />
            </div>

            {/* Ruang Keluarga */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Luas Minimum Ruang Keluarga / Tamu</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: SNI 03-1733-2004
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {roomStandardsRegistry.getStandard('living_room').minAreaM2} m²
                </span>
              </div>
              <input
                type="range"
                min="8"
                max="24"
                step="1"
                value={roomStandardsRegistry.getStandard('living_room').minAreaM2}
                onChange={(e) => {
                  roomStandardsRegistry.updateStandard('living_room', { minAreaM2: parseFloat(e.target.value) });
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Luas Minimum Ruang Keluarga"
              />
            </div>

            {/* Kamar Mandi */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Luas Minimum Kamar Mandi / WC</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: Permen PUPR 29/2006
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {roomStandardsRegistry.getStandard('bathroom').minAreaM2} m²
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="5.0"
                step="0.25"
                value={roomStandardsRegistry.getStandard('bathroom').minAreaM2}
                onChange={(e) => {
                  roomStandardsRegistry.updateStandard('bathroom', { minAreaM2: parseFloat(e.target.value) });
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Luas Minimum Kamar Mandi"
              />
            </div>

            {/* Tebal Dinding Interior */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Ketebalan Dinding Sekat Interior</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Standar pasangan bata setengah batu + plesteran acian
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {(roomStandardsRegistry.defaultWallThicknessM * 100).toFixed(0)} cm
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.25"
                step="0.01"
                value={roomStandardsRegistry.defaultWallThicknessM}
                onChange={(e) => {
                  roomStandardsRegistry.defaultWallThicknessM = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Ketebalan Dinding Interior"
              />
            </div>
          </div>

          {/* SECTION: SIMULASI HUJAN & KOEFISIEN LIMPASAN */}
          <div className="inset-header">SIMULASI HUJAN & LIMPASAN AIR (SNI 03-2453)</div>
          <div className="inset-group">
            {/* Koefisien Atap */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Koefisien Limpasan Atap Bangunan (C Atap)</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: {runoffSimulator.coefficientSources.roof}
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {runoffSimulator.coefficients.roof.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.95"
                step="0.05"
                value={runoffSimulator.coefficients.roof}
                onChange={(e) => {
                  runoffSimulator.coefficients.roof = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Koefisien Limpasan Atap"
              />
            </div>

            {/* Koefisien Paving */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Koefisien Limpasan Paving Block (C Paving)</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: {runoffSimulator.coefficientSources.paving}
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {runoffSimulator.coefficients.paving.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.40"
                max="0.80"
                step="0.05"
                value={runoffSimulator.coefficients.paving}
                onChange={(e) => {
                  runoffSimulator.coefficients.paving = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Koefisien Limpasan Paving"
              />
            </div>

            {/* Koefisien Rumput */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Koefisien Limpasan Taman Rumput (C Rumput)</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: {runoffSimulator.coefficientSources.grass}
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--good)' }}>
                  {runoffSimulator.coefficients.grass.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.35"
                step="0.05"
                value={runoffSimulator.coefficients.grass}
                onChange={(e) => {
                  runoffSimulator.coefficients.grass = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Koefisien Limpasan Rumput"
              />
            </div>

            {/* Intensitas Hujan */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Intensitas Hujan Rencana (I)</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: {runoffSimulator.coefficientSources.rainfallIntensity}
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {runoffSimulator.coefficients.rainfallIntensityMmHr} mm/jam
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="120"
                step="10"
                value={runoffSimulator.coefficients.rainfallIntensityMmHr}
                onChange={(e) => {
                  runoffSimulator.coefficients.rainfallIntensityMmHr = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Intensitas Hujan Rencana"
              />
            </div>
          </div>

          {/* SECTION: STRUKTUR & KETAHANAN GEMPA */}
          <div className="inset-header">STRUKTUR & KETAHANAN SEISMIK (SNI 1726 & SNI 2847)</div>
          <div className="inset-group">
            {/* Batas Bentang Balok */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Batas Bentang Bebas Tanpa Kolom Antara</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: {structuralChecker.standardsSources.span}
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {structuralChecker.config.maxAllowableSpanM} m
                </span>
              </div>
              <input
                type="range"
                min="4.0"
                max="10.0"
                step="0.5"
                value={structuralChecker.config.maxAllowableSpanM}
                onChange={(e) => {
                  structuralChecker.config.maxAllowableSpanM = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Batas Bentang Balok"
              />
            </div>

            {/* Batas Rasio Denah Pipih */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Batas Rasio Denah Pipih (Torsi Seismik)</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: {structuralChecker.standardsSources.planRegularity}
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {structuralChecker.config.maxPlanAspectRatio}:1
                </span>
              </div>
              <input
                type="range"
                min="2.0"
                max="5.0"
                step="0.5"
                value={structuralChecker.config.maxPlanAspectRatio}
                onChange={(e) => {
                  structuralChecker.config.maxPlanAspectRatio = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Batas Rasio Denah"
              />
            </div>

            {/* Batas Overhang Kantilever */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Batas Overhang Teritisan Tanpa Penopang</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: {structuralChecker.standardsSources.cantilever}
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {structuralChecker.config.maxCantileverOverhangM} m
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.25"
                value={structuralChecker.config.maxCantileverOverhangM}
                onChange={(e) => {
                  structuralChecker.config.maxCantileverOverhangM = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Batas Overhang Kantilever"
              />
            </div>
          </div>

          {/* SECTION: HARGA SATUAN KONSTRUKSI (RAB) */}
          <div className="inset-header">HARGA SATUAN KONSTRUKSI (RAB)</div>
          <div className="inset-group">
            {/* Struktur per m2 */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Biaya Struktur Beton per m²</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Label: Ilustrasi edukatif, bukan acuan harga pasar riil
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {costEstimator.formatRupiah(costEstimator.unitRates.structurePerM2)}
                </span>
              </div>
              <input
                type="range"
                min="1000000"
                max="3500000"
                step="100000"
                value={costEstimator.unitRates.structurePerM2}
                onChange={(e) => {
                  costEstimator.unitRates.structurePerM2 = parseInt(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Biaya Struktur per m²"
              />
            </div>

            {/* Dinding per m2 */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Biaya Dinding & Plesteran per m²</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Label: Ilustrasi edukatif, bukan acuan harga pasar riil
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {costEstimator.formatRupiah(costEstimator.unitRates.wallsPerM2)}
                </span>
              </div>
              <input
                type="range"
                min="400000"
                max="1200000"
                step="50000"
                value={costEstimator.unitRates.wallsPerM2}
                onChange={(e) => {
                  costEstimator.unitRates.wallsPerM2 = parseInt(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Biaya Dinding per m²"
              />
            </div>

            {/* Atap per m2 */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Biaya Rangka & Penutup Atap per m²</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Label: Ilustrasi edukatif, bukan acuan harga pasar riil
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {costEstimator.formatRupiah(costEstimator.unitRates.roofPerM2)}
                </span>
              </div>
              <input
                type="range"
                min="350000"
                max="1000000"
                step="50000"
                value={costEstimator.unitRates.roofPerM2}
                onChange={(e) => {
                  costEstimator.unitRates.roofPerM2 = parseInt(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Biaya Atap per m²"
              />
            </div>
          </div>

          {/* SECTION 6: ATURAN LANJUTAN & SKALA KOTA (T6) */}
          <div className="inset-header">ATURAN LANJUTAN & SKALA KOTA (T6)</div>
          <div className="inset-group">
            {/* Radius Pejalan Kaki */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Radius Akses Pejalan Kaki Fasilitas Publik</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: Permen PU No. 03/PRT/M/2014 (Standar 5 menit jalan kaki)
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {cityScoreAnalyzer.settings.walkabilityRadiusM} m
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="1000"
                step="50"
                value={cityScoreAnalyzer.settings.walkabilityRadiusM}
                onChange={(e) => {
                  cityScoreAnalyzer.settings.walkabilityRadiusM = parseInt(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Radius Pejalan Kaki"
              />
            </div>

            {/* Target RTH Kota */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Target Rasio Ruang Terbuka Hijau (RTH) Kota</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: UU No. 26/2007 tentang Penataan Ruang (Minimal 30%)
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {cityScoreAnalyzer.settings.targetGreenSpacePercent}%
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={cityScoreAnalyzer.settings.targetGreenSpacePercent}
                onChange={(e) => {
                  cityScoreAnalyzer.settings.targetGreenSpacePercent = parseInt(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Target RTH Kota"
              />
            </div>

            {/* Rasio Tinggi terhadap Lebar Jalan */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Rasio Maksimum Tinggi Bangunan / Lebar Jalan</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: Permen PUPR No. 29/PRT/M/2006 (Pencegahan Urban Canyon)
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {advancedBuildingCodeRegistry.config.heightToRoadWidthRatio.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={advancedBuildingCodeRegistry.config.heightToRoadWidthRatio}
                onChange={(e) => {
                  advancedBuildingCodeRegistry.config.heightToRoadWidthRatio = parseFloat(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Rasio Tinggi Bangunan terhadap Lebar Jalan"
              />
            </div>

            {/* Ambang Tangga Darurat Kebakaran */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>Ambang Wajib Tangga Darurat Kebakaran</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Sumber: Permen PU No. 26/PRT/M/2008 (Sistem Proteksi Kebakaran)
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  ≥ {advancedBuildingCodeRegistry.config.emergencyStairsFloorThreshold} Lantai
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="8"
                step="1"
                value={advancedBuildingCodeRegistry.config.emergencyStairsFloorThreshold}
                onChange={(e) => {
                  advancedBuildingCodeRegistry.config.emergencyStairsFloorThreshold = parseInt(e.target.value);
                  triggerSimUpdate();
                }}
                className="ios-slider"
                aria-label="Ambang Tangga Darurat"
              />
            </div>
          </div>

          {/* SECTION 7: KONTROL MOUSEPAD & TRACKPAD */}
          <div className="inset-header">KONTROL MOUSEPAD & TRACKPAD</div>
          <div className="inset-group">
            {/* Slider Sensitivitas Mousepad */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Sensitivitas Mousepad / Trackpad</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Kecepatan putar kamera 360° dan gestur zoom trackpad
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                  {mousepadSensitivity.toFixed(2)}x
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
                aria-label="Sensitivitas Mousepad"
              />
            </div>

            {/* Panduan Putar 360 Derajat */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Putar Kamera 360°</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)', lineHeight: '1.4' }}>
                  • Geser 2 jari horizontal di trackpad untuk muter 360°<br />
                  • Tahan Alt + Klik Kiri atau Tahan Shift + Dua Jari<br />
                  • Tombol keyboard Q / E untuk putar cepat
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={onClose}
              className="ios-btn ios-btn-primary"
              style={{ padding: '8px 22px', fontSize: '13px' }}
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
