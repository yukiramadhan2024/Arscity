import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SPRING_SHEET } from '../motion/appleSprings';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { useUIStore } from '../state/useUIStore';
import {
  Sun,
  Wind,
  Droplets,
  Scissors,
  Ruler,
  RotateCcw,
  Activity,
  AlertTriangle,
  RefreshCw,
  Layers,
  Volume2,
  ShieldCheck,
  X
} from 'lucide-react';
import { CutMode } from '../../analysis/SectionCutManager';
import { CityRunoffReport } from '../../simulation/RunoffSimulator';
import { acousticAnalyzer, CityAcousticReport } from '../../analysis/AcousticAnalyzer';
import { structuralChecker } from '../../simulation/StructuralChecker';

type AnalysisTabId = 'solar' | 'ventilation' | 'runoff' | 'structure' | 'acoustic' | 'section' | 'measure';

const SEAL_CARD_STYLE: React.CSSProperties = {
  background: 'rgba(219, 242, 252, 0.95)',
  border: '1px solid rgba(219, 242, 252, 0.42)',
  borderRadius: '16px',
  marginBottom: 0,
  overflow: 'hidden',
  color: '#072D59',
  boxShadow: '0 4px 14px rgba(7, 26, 56, 0.16)',
  ['--label' as string]: '#072D59',
  ['--label-secondary' as string]: '#1E4673',
  ['--label-muted' as string]: '#355A85',
  ['--foreground' as string]: '#072D59',
  ['--fill-control' as string]: 'rgba(7, 45, 89, 0.08)',
  ['--separator-opaque' as string]: 'rgba(7, 45, 89, 0.14)',
  ['--hairline-soft' as string]: 'rgba(7, 45, 89, 0.14)',
  ['--accent' as string]: '#FD6E8E',
};

export const AnalysisOverlay: React.FC = () => {
  const { activeTool, engine, timeOfDay, dayOfYear } = useUIStore();
  const [activeTab, setActiveTab] = useState<AnalysisTabId>('solar');

  const [maquetteLensOn, setMaquetteLensOn] = useState<boolean>(false);
  const [selectedLens, setSelectedLens] = useState<'kdb_gsb' | 'solar_vent' | 'acoustic' | 'runoff' | 'walkability'>('kdb_gsb');

  const [heatmapOn, setHeatmapOn] = useState<boolean>(false);
  const [windOn, setWindOn] = useState<boolean>(false);
  const [runoffOn, setRunoffOn] = useState<boolean>(false);
  const [isExtremeStorm, setIsExtremeStorm] = useState<boolean>(false);
  const [isShakingSim, setIsShakingSim] = useState<boolean>(false);
  const [isSubsurfaceXRay, setIsSubsurfaceXRay] = useState<boolean>(false);
  const [runoffReport, setRunoffReport] = useState<CityRunoffReport | null>(null);
  const [acousticReport, setAcousticReport] = useState<CityAcousticReport | null>(null);
  const [cutMode, setCutMode] = useState<CutMode>('none');
  const [cutHeight, setCutHeight] = useState<number>(2.2);
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
  const [measuredDist, setMeasuredDist] = useState<number>(0);

  useEffect(() => {
    return () => {
      engine?.setMaquetteDataLens('none');
      engine?.setSubsurfaceXRay(false);
    };
  }, [engine]);

  useEffect(() => {
    if (activeTab === 'acoustic' && !acousticReport && engine) {
      handleEvaluateAcoustics();
    }
  }, [activeTab, engine]);

  if (activeTool !== 'analyze') return null;

  const handleToggleMaquetteLens = () => {
    if (!engine) return;
    const next = !maquetteLensOn;
    setMaquetteLensOn(next);
    engine.setMaquetteDataLens(next ? selectedLens : 'none');
  };

  const handleSelectLens = (lens: 'kdb_gsb' | 'solar_vent' | 'acoustic' | 'runoff' | 'walkability') => {
    setSelectedLens(lens);
    if (maquetteLensOn && engine) {
      engine.setMaquetteDataLens(lens);
    }
  };

  const handleEvaluateAcoustics = () => {
    if (!engine) return;
    const rep = acousticAnalyzer.evaluateCity(
      engine.buildingManager,
      engine.roadManager,
      engine.landscapeManager,
      engine.lotManager
    );
    setAcousticReport(rep);
  };

  const handleToggleHeatmap = () => {
    if (!engine) return;
    const next = !heatmapOn;
    setHeatmapOn(next);
    engine.solarAnalyzer.setHeatmapVisible(next, timeOfDay, dayOfYear);
  };

  const handleToggleWind = () => {
    if (!engine) return;
    const next = !windOn;
    setWindOn(next);
    engine.ventilationAnalyzer.setWindVisible(next);
  };

  const handleToggleRunoff = () => {
    if (!engine) return;
    const next = !runoffOn;
    setRunoffOn(next);
    const report = engine.runoffOverlay.setVisible(
      next,
      engine.terrain,
      engine.roadManager,
      engine.buildingManager,
      engine.landscapeManager,
      engine.lotManager
    );
    setRunoffReport(report);
  };

  const handleSetCutMode = (m: CutMode, h?: number) => {
    if (!engine) return;
    setCutMode(m);
    const targetHeight = h !== undefined ? h : cutHeight;
    if (h !== undefined) {
      setCutHeight(h);
      engine.sectionCutManager.setCutHeight(h);
    }
    engine.sectionCutManager.setCutMode(m);
    if (engine.floorPlanAnnotationOverlay) {
      engine.floorPlanAnnotationOverlay.setVisible(m === 'floor_plan', targetHeight);
    }
  };

  const handleToggleRuler = () => {
    if (!engine) return;
    const next = !isRulerActive;
    setIsRulerActive(next);
    if (next) {
      engine.measurementTool.activate();
      engine.measurementTool.onMeasurementUpdate = (d) => setMeasuredDist(d);
    } else {
      engine.measurementTool.deactivate();
    }
  };

  const handleClearRuler = () => {
    engine?.measurementTool.clearAll();
    setMeasuredDist(0);
  };

  return (
    <motion.aside
      className="interactive arscity-navy-panel"
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96 }}
      transition={SPRING_SHEET}
      style={{
        transformOrigin: 'top left',
        position: 'relative',
        top: 0,
        left: 0,
        width: '100%',
        maxWidth: '332px',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto',
        padding: '14px',
        borderRadius: '24px',
        background: 'rgba(7, 45, 89, 0.94)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(219, 242, 252, 0.24)',
        boxShadow: '0 16px 40px rgba(7, 26, 56, 0.34)',
        color: '#DBF2FC'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(253, 110, 142, 0.18)',
              border: '1px solid rgba(253, 110, 142, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FD6E8E'
            }}
          >
            <Activity size={16} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#DBF2FC', letterSpacing: '-0.01em' }}>
              Laboratorium Analisis
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(219, 242, 252, 0.74)' }}>
              Simulasi Iklim &amp; Tata Ruang 3D
            </div>
          </div>
        </div>

        <button
          onClick={() => useUIStore.getState().setActiveTool('select')}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(219, 242, 252, 0.12)',
            border: '1px solid rgba(219, 242, 252, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#DBF2FC',
            cursor: 'pointer'
          }}
          title="Tutup Laboratorium Analisis"
          aria-label="Tutup Laboratorium Analisis"
        >
          <X size={14} strokeWidth={2.2} />
        </button>
      </div>

      {/* Mode Maket Putih & Lensa Data 3D */}
      <div className="inset-group" style={{ ...SEAL_CARD_STYLE, marginBottom: '12px' }}>
        <div className="inset-row" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={15} strokeWidth={2} style={{ color: '#FD6E8E' }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#072D59' }}>
                Mode Maket Putih
              </div>
              <div style={{ fontSize: '10px', color: '#1E4673' }}>
                Visualisasi monokrom &amp; lensa data 3D
              </div>
            </div>
          </div>
          <label className="ios-switch">
            <input
              type="checkbox"
              checked={maquetteLensOn}
              onChange={handleToggleMaquetteLens}
            />
            <span className="ios-switch-slider" />
          </label>
        </div>

        {maquetteLensOn && (
          <div style={{ padding: '8px 10px', background: 'rgba(239, 248, 253, 0.96)', borderTop: '1px solid rgba(7, 45, 89, 0.12)' }}>
            <div style={{ fontSize: '10px', color: '#1E4673', marginBottom: '6px', fontWeight: 700, letterSpacing: '0.03em' }}>
              LAPISAN LENSA DATA 3D:
            </div>
            <div className="segmented-control" style={{ width: '100%', background: 'rgba(7, 45, 89, 0.10)', border: '1px solid rgba(7, 45, 89, 0.16)', padding: '2px', borderRadius: '8px' }}>
              {[
                { id: 'kdb_gsb', label: 'KDB/GSB' },
                { id: 'solar_vent', label: 'Iklim' },
                { id: 'acoustic', label: 'Akustik' },
                { id: 'runoff', label: 'Banjir' },
                { id: 'walkability', label: 'Walk' }
              ].map((lens) => {
                const isSel = selectedLens === lens.id;
                return (
                  <button
                    key={lens.id}
                    onClick={() => handleSelectLens(lens.id as any)}
                    style={{
                      flex: 1,
                      padding: '4px 2px',
                      fontSize: '10px',
                      fontWeight: 700,
                      background: isSel ? '#FD6E8E' : 'transparent',
                      color: isSel ? '#072D59' : '#1E4673',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      boxShadow: isSel ? '0 2px 6px rgba(7, 45, 89, 0.12)' : 'none'
                    }}
                  >
                    <span>{lens.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedLens === 'acoustic' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '10px', color: '#1E4673' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--good)' }} />
                  <span>≤55 Tenang</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warn)' }} />
                  <span>56-65 Sedang</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--bad)' }} />
                  <span>&gt;65 Bising</span>
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '10px', color: '#1E4673' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--good)' }} />
                  <span>Ideal</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--warn)' }} />
                  <span>Waspada</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--bad)' }} />
                  <span>Melanggar</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tab Fungsional 3D: Surya, Angin, Banjir, Struktur, Akustik, Denah, Ukur */}
      <div
        style={{
          width: '100%',
          marginBottom: '12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '4px',
          background: 'rgba(7, 26, 56, 0.45)',
          border: '1px solid rgba(219, 242, 252, 0.16)',
          borderRadius: '14px',
          padding: '4px'
        }}
      >
        {[
          { id: 'solar', label: 'Surya', icon: Sun },
          { id: 'ventilation', label: 'Angin', icon: Wind },
          { id: 'runoff', label: 'Banjir', icon: Droplets },
          { id: 'structure', label: 'Struktur', icon: ShieldCheck },
          { id: 'acoustic', label: 'Akustik', icon: Volume2 },
          { id: 'section', label: 'Denah', icon: Scissors },
          { id: 'measure', label: 'Ukur', icon: Ruler }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSel = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                proceduralAudio.playTaptic('selection');
                setActiveTab(tab.id as AnalysisTabId);
              }}
              style={{
                position: 'relative',
                padding: '6px 4px',
                fontSize: '10.5px',
                gap: '4px',
                background: isSel ? '#FD6E8E' : 'transparent',
                borderRadius: '9px',
                border: isSel ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isSel ? '#072D59' : '#DBF2FC',
                fontWeight: isSel ? 700 : 500,
                boxShadow: isSel ? '0 2px 8px rgba(7, 45, 89, 0.12)' : 'none',
                transition: 'all 0.12s ease'
              }}
              title={tab.label}
            >
              <Icon size={12} strokeWidth={2.2} style={{ color: isSel ? '#072D59' : '#DBF2FC', flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Solar Analysis */}
      {activeTab === 'solar' && (
        <div className="inset-group" style={SEAL_CARD_STYLE}>
          <div className="inset-row" style={{ borderBottom: '1px solid rgba(7, 45, 89, 0.12)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>Peta Panas Radiasi Matahari</div>
              <div style={{ fontSize: '11px', color: '#1E4673' }}>
                Radiasi surya lintang 7,8° Selatan
              </div>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={heatmapOn}
                onChange={handleToggleHeatmap}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>
          <div className="inset-footer" style={{ color: '#1E4673' }}>
            Sisi fasad menghadap barat dan timur menerima radiasi panas tertinggi. Berikan teritisan atap minimal 1,2 m untuk mereduksi panas tropis secara alami.
          </div>
        </div>
      )}

      {/* Tab 2: Ventilation & Thermal Analysis */}
      {activeTab === 'ventilation' && (() => {
        const ventSummary = engine?.ventilationAnalyzer.getCityThermalVentilationSummary();
        return (
          <div className="inset-group" style={SEAL_CARD_STYLE}>
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>Aliran Angin &amp; Termal Bangunan</div>
                <div style={{ fontSize: '11px', color: '#1E4673' }}>
                  Visualisasi aliran udara &amp; kenyamanan termal
                </div>
              </div>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={windOn}
                  onChange={handleToggleWind}
                />
                <span className="ios-switch-slider" />
              </label>
            </div>

            {ventSummary && ventSummary.totalBuildings > 0 && (
              <>
                <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#1E4673' }}>Suhu Udara Luar (Baseline)</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#072D59' }}>
                    {ventSummary.outdoorBaselineTempC.toFixed(1).replace('.', ',')}°C
                  </span>
                </div>
                <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#1E4673' }}>Estimasi Suhu Ruang Rata-Rata</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: ventSummary.averageIndoorTempC <= 28.5 ? '#047857' : '#B45309' }}>
                    {ventSummary.averageIndoorTempC.toFixed(1).replace('.', ',')}°C
                  </span>
                </div>
                <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#1E4673' }}>Rasio Ventilasi Silang</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: ventSummary.crossVentilationRatioPercent >= 60 ? '#047857' : '#B45309' }}>
                    {ventSummary.crossVentilationRatioPercent.toFixed(1).replace('.', ',')}% ({ventSummary.crossVentilatedCount}/{ventSummary.totalBuildings})
                  </span>
                </div>
                <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#1E4673' }}>Penghematan Listrik AC</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>
                    {ventSummary.formattedTotalSavings} / bln
                  </span>
                </div>
              </>
            )}

            <div className="inset-footer" style={{ color: '#1E4673' }}>
              Sesuai SNI 03-6572-2001, ventilasi silang alami dan pembayangan pohon menurunkan suhu ruang hingga 4,5°C tanpa pendingin aktif.
            </div>
          </div>
        );
      })()}

      {/* Tab 3: Rain Runoff & Flood Analysis */}
      {activeTab === 'runoff' && (
        <div className="inset-group" style={SEAL_CARD_STYLE}>
          <div className="inset-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>Simulasi Aliran Air &amp; Banjir</div>
              <div style={{ fontSize: '11px', color: '#1E4673' }}>
                Metode Rasional (SNI 03-2453)
              </div>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={runoffOn}
                onChange={handleToggleRunoff}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          {runoffReport && (
            <>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#1E4673' }}>Koefisien Limpasan (C)</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: runoffReport.weightedRunoffCoeff > 0.5 ? '#B45309' : '#047857' }}>
                  {runoffReport.weightedRunoffCoeff.toFixed(2)}
                </span>
              </div>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#1E4673' }}>Debit Puncak (Q)</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#072D59' }}>
                  {runoffReport.peakDischargeM3PerSec.toFixed(3)} m³/dtk
                </span>
              </div>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#1E4673' }}>Reduksi Resapan</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#047857' }}>
                  -{runoffReport.mitigatedRunoffM3PerHr} m³/jam
                </span>
              </div>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#1E4673' }}>Skor Risiko Genangan</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: runoffReport.inundationRiskScore > 50 ? '#DC2626' : runoffReport.inundationRiskScore > 25 ? '#B45309' : '#047857' }}>
                  {runoffReport.inundationRiskScore}/100 ({runoffReport.inundationRiskScore > 50 ? 'Rawan' : runoffReport.inundationRiskScore > 25 ? 'Waspada' : 'Aman'})
                </span>
              </div>
            </>
          )}

          <div className="inset-row" style={{ justifyContent: 'space-between', borderTop: '1px solid rgba(7, 45, 89, 0.12)', marginTop: '4px', paddingTop: '8px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#072D59' }}>Badai Muson Ekstrem</div>
              <div style={{ fontSize: '10px', color: '#1E4673' }}>Intensitas 120 mm/jam (Genangan 3D)</div>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={isExtremeStorm}
                onChange={() => {
                  if (!engine) return;
                  const next = !isExtremeStorm;
                  setIsExtremeStorm(next);
                  engine.runoffOverlay.setExtremeStorm(next);
                  if (runoffOn) {
                    const report = engine.runoffOverlay.setVisible(
                      true,
                      engine.terrain,
                      engine.roadManager,
                      engine.buildingManager,
                      engine.landscapeManager,
                      engine.lotManager
                    );
                    setRunoffReport(report);
                  }
                }}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          <div className="inset-footer" style={{ color: '#1E4673' }}>
            Titik genangan dan bidang air 3D menandakan area rawan banjir. Tambahkan Sumur Resapan, Biopori, atau RTH peneduh.
          </div>
        </div>
      )}

      {/* Tab 4: Ketahanan Struktur & Seismik Gempa Mw 6.3 */}
      {activeTab === 'structure' && (() => {
        const buildings = engine ? Array.from(engine.buildingManager.buildings.values()) : [];
        let vulnerableCount = 0;
        let softStoryCount = 0;
        let resilientCount = 0;

        for (const bld of buildings) {
          const rep = structuralChecker.evaluateBuilding(bld);
          const isJogloOrModular = bld.presetKey === 'joglo' || bld.presetKey === 'rumah_modular' || (bld as any).type === 'joglo' || (bld as any).type === 'rumah_modular';
          const isVulnerable = !isJogloOrModular && (rep.score < 75 || rep.hasSoftStory || rep.aspectRatio > 2.8);
          if (isVulnerable) vulnerableCount++;
          else resilientCount++;
          if (rep.hasSoftStory) softStoryCount++;
        }

        const isCurrentlyShaking = structuralChecker.isShaking() || isShakingSim;

        const handleToggleEarthquake = () => {
          if (!engine) return;
          if (structuralChecker.isShaking()) {
            structuralChecker.stopEarthquakeShakeTest();
            setIsShakingSim(false);
          } else {
            setIsShakingSim(true);
            structuralChecker.triggerEarthquakeShakeTest(engine, () => {
              setIsShakingSim(false);
            });
          }
        };

        return (
          <div className="inset-group" style={{ ...SEAL_CARD_STYLE, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>Ketahanan Seismik (SNI 1726)</span>
              <span className="tabular-nums" style={{ fontSize: '11px', color: '#1E4673', fontWeight: 600 }}>
                {buildings.length} Bangunan
              </span>
            </div>

            <button
              onClick={() => {
                const next = !isSubsurfaceXRay;
                setIsSubsurfaceXRay(next);
                engine?.setSubsurfaceXRay(next);
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '10px',
                background: isSubsurfaceXRay ? '#FD6E8E' : 'rgba(7, 45, 89, 0.08)',
                border: isSubsurfaceXRay ? '1px solid #F45579' : '1px solid rgba(7, 45, 89, 0.16)',
                color: '#072D59',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                marginBottom: '8px'
              }}
            >
              <Layers size={13} strokeWidth={2} />
              <span>{isSubsurfaceXRay ? 'X-Ray Bawah Tanah Aktif' : 'X-Ray Struktur & Bawah Tanah'}</span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#1E4673', fontWeight: 600 }}>Tangguh Seismik</div>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: '#047857' }}>{resilientCount}</div>
              </div>
              <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.32)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#1E4673', fontWeight: 600 }}>Rentan / Soft-Story</div>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>{vulnerableCount}</div>
              </div>
            </div>

            {softStoryCount > 0 && (
              <div style={{ background: 'rgba(239, 68, 68, 0.10)', padding: '6px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertTriangle size={14} strokeWidth={2} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>
                  {softStoryCount} bangunan bertingkat memiliki tingkat lunak.
                </span>
              </div>
            )}

            <button
              onClick={handleToggleEarthquake}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                background: isCurrentlyShaking ? '#FD6E8E' : '#072D59',
                border: 'none',
                color: isCurrentlyShaking ? '#072D59' : '#DBF2FC',
                cursor: 'pointer',
                boxShadow: isCurrentlyShaking ? '0 2px 8px rgba(7, 45, 89, 0.25)' : '0 2px 8px rgba(7, 45, 89, 0.15)',
                transition: 'all 0.2s ease'
              }}
            >
              <Activity size={15} strokeWidth={2} className={isCurrentlyShaking ? 'animate-pulse' : ''} />
              <span>{isCurrentlyShaking ? 'Hentikan Simulasi Gempa (15s)' : 'Simulasikan Gempa Bumi Mw 6.3'}</span>
            </button>

            <div className="inset-footer" style={{ marginTop: '8px', color: '#1E4673', padding: '4px 0 0 0' }}>
              Joglo dan Rumah Modular memiliki sambungan tumpuan fleksibel tahan gempa, sedangkan struktur bertingkat tanpa dinding pengaku rentan osilasi.
            </div>
          </div>
        );
      })()}

      {/* Tab 5: Akustik Lingkungan SNI 03-6386-2000 */}
      {activeTab === 'acoustic' && (
        <div className="inset-group" style={SEAL_CARD_STYLE}>
          <div className="inset-row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>Akustik Kota (SNI 03-6386)</span>
            <button
              onClick={handleEvaluateAcoustics}
              style={{
                fontSize: '11px',
                padding: '5px 10px',
                borderRadius: '8px',
                background: '#FD6E8E',
                color: '#072D59',
                border: 'none',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={12} strokeWidth={2} />
              Hitung Ulang
            </button>
          </div>

          <div className="inset-row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#1E4673' }}>Lensa Maket 3D</span>
            <button
              onClick={() => {
                setSelectedLens('acoustic');
                setMaquetteLensOn(true);
                engine?.setMaquetteDataLens('acoustic');
              }}
              style={{
                fontSize: '11px',
                padding: '5px 10px',
                borderRadius: '8px',
                background: maquetteLensOn && selectedLens === 'acoustic' ? '#FD6E8E' : 'rgba(7, 45, 89, 0.08)',
                color: '#072D59',
                border: '1px solid rgba(7, 45, 89, 0.16)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <Layers size={12} strokeWidth={2} />
              {maquetteLensOn && selectedLens === 'acoustic' ? 'Lensa Aktif' : 'Aktifkan Lensa'}
            </button>
          </div>

          {acousticReport ? (
            <>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#1E4673' }}>Rata-rata Kebisingan</span>
                <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: acousticReport.avgNoiseDba > 65 ? '#DC2626' : acousticReport.avgNoiseDba > 55 ? '#B45309' : '#047857' }}>
                  {acousticReport.avgNoiseDba.toFixed(1)} dBA
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', padding: '6px 12px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#1E4673' }}>Tenang ≤55</div>
                  <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: '#047857' }}>{acousticReport.calmCount}</div>
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.14)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#1E4673' }}>Sedang</div>
                  <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: '#B45309' }}>{acousticReport.moderateCount}</div>
                </div>
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.32)', borderRadius: '8px', padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#1E4673' }}>Bising &gt;65</div>
                  <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: '#DC2626' }}>{acousticReport.noisyCount}</div>
                </div>
              </div>

              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#1E4673' }}>Titik Tertinggi</span>
                <span className="tabular-nums" style={{ fontSize: '11.5px', fontWeight: 700, color: '#DC2626' }}>
                  {acousticReport.maxNoiseDba.toFixed(1)} dBA ({acousticReport.maxNoiseBuildingName})
                </span>
              </div>

              <div className="inset-footer" style={{ color: '#1E4673' }}>
                {acousticReport.mitigationAdvice}
              </div>
            </>
          ) : (
            <div style={{ padding: '12px', textAlign: 'center', color: '#1E4673', fontSize: '12px' }}>
              Tekan &quot;Hitung Ulang&quot; untuk mengevaluasi kebisingan jalan terhadap blok bangunan.
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Section Cut & 2D Floor Plan */}
      {activeTab === 'section' && (
        <div className="inset-group" style={SEAL_CARD_STYLE}>
          <div className="inset-row" style={{ justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#072D59' }}>Mode Potongan</span>
            <div className="segmented-control" style={{ background: 'rgba(7, 45, 89, 0.10)', padding: '2px', borderRadius: '8px' }}>
              {[
                { id: 'none', label: 'Penuh' },
                { id: 'floor_plan', label: 'Denah (H)' },
                { id: 'section_vertical', label: 'Potongan (V)' }
              ].map((m) => {
                const isSel = cutMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSetCutMode(m.id as CutMode, m.id === 'floor_plan' ? cutHeight : undefined)}
                    style={{
                      fontSize: '10.5px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      background: isSel ? '#FD6E8E' : 'transparent',
                      color: isSel ? '#072D59' : '#1E4673'
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {cutMode === 'floor_plan' && (
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#1E4673', fontWeight: 600 }}>Ketinggian Irisan</span>
                <span className="tabular-nums" style={{ fontWeight: 700, color: '#072D59' }}>{cutHeight.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="25"
                step="0.5"
                value={cutHeight}
                onChange={(e) => handleSetCutMode('floor_plan', parseFloat(e.target.value))}
                className="ios-slider"
                aria-label="Ketinggian Potongan Denah"
              />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                {[1, 2, 3].map((fl) => {
                  const flHeight = ((fl - 1) * 3.6) + 2.2;
                  const active = Math.abs(cutHeight - flHeight) < 0.6;
                  return (
                    <button
                      key={fl}
                      onClick={() => {
                        handleSetCutMode('floor_plan', flHeight);
                        engine?.set2DFloor(fl - 1);
                      }}
                      style={{
                        padding: '4px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        background: active ? '#FD6E8E' : 'rgba(7, 45, 89, 0.08)',
                        color: '#072D59'
                      }}
                    >
                      Lt. {fl} (+{flHeight.toFixed(1)}m)
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proyeksi Kerja Ortografis */}
          <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#1E4673', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
              Proyeksi Kerja Ortografis
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              {[
                { id: '3d', label: '3D' },
                { id: 'plan', label: 'Denah' },
                { id: 'section', label: 'Pot. A-A' },
                { id: 'elevation', label: 'Tampak' }
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => engine?.setArchitecturalWorkMode(view.id as any)}
                  style={{
                    padding: '6px 4px',
                    borderRadius: '8px',
                    background: 'rgba(7, 45, 89, 0.08)',
                    border: '1px solid rgba(7, 45, 89, 0.16)',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textAlign: 'center',
                    color: '#072D59'
                  }}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Measurement Tool */}
      {activeTab === 'measure' && (
        <div className="inset-group" style={SEAL_CARD_STYLE}>
          <div className="inset-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#072D59' }}>Penggaris Dimensi 3D</div>
              <div style={{ fontSize: '11px', color: '#1E4673' }}>
                Ukur jarak GSB &amp; lebar jalan di kanvas
              </div>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={isRulerActive}
                onChange={handleToggleRuler}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          {isRulerActive && (
            <div className="inset-row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#1E4673', fontWeight: 600 }}>Jarak Terukur:</span>
              <span className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: '#072D59' }}>
                {measuredDist.toFixed(2)} m
              </span>
            </div>
          )}

          <div className="inset-row" style={{ justifyContent: 'flex-end' }}>
            <button
              onClick={handleClearRuler}
              style={{
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: '#FD6E8E',
                color: '#072D59',
                border: 'none',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={13} strokeWidth={2} />
              <span>Bersihkan Garis</span>
            </button>
          </div>
        </div>
      )}
    </motion.aside>
  );
};
