import React, { useState, useEffect } from 'react';
import { useUIStore } from '../state/useUIStore';
import {
  Sun,
  Wind,
  Droplets,
  Scissors,
  Ruler,
  CheckCircle2,
  RotateCcw,
  Activity,
  AlertTriangle,
  Building,
  RefreshCw,
  MapPin,
  Layers,
  Sparkles,
  Volume2,
  GitCompare,
  Bookmark,
  Check,
  ShieldCheck
} from 'lucide-react';
import { CutMode } from '../../analysis/SectionCutManager';
import { RunoffSimulator, CityRunoffReport } from '../../simulation/RunoffSimulator';
import { cityScoreAnalyzer, CityUrbanScore } from '../../analysis/CityScoreAnalyzer';
import { MaquetteDataLensType } from '../../core/engine/Engine';
import { acousticAnalyzer, CityAcousticReport } from '../../analysis/AcousticAnalyzer';
import { scenarioComparator, ScenarioSnapshot, ScenarioComparisonResult } from '../../analysis/ScenarioComparator';
import { structuralChecker } from '../../simulation/StructuralChecker';

export const AnalysisOverlay: React.FC = () => {
  const { activeTool, engine, timeOfDay, dayOfYear } = useUIStore();
  const [activeTab, setActiveTab] = useState<'solar' | 'ventilation' | 'runoff' | 'structure' | 'acoustic' | 'compare' | 'city' | 'section' | 'measure'>('solar');

  const [maquetteLensOn, setMaquetteLensOn] = useState<boolean>(false);
  const [selectedLens, setSelectedLens] = useState<'kdb_gsb' | 'solar_vent' | 'acoustic' | 'runoff' | 'walkability'>('kdb_gsb');

  const [heatmapOn, setHeatmapOn] = useState<boolean>(false);
  const [windOn, setWindOn] = useState<boolean>(false);
  const [runoffOn, setRunoffOn] = useState<boolean>(false);
  const [isExtremeStorm, setIsExtremeStorm] = useState<boolean>(false);
  const [isShakingSim, setIsShakingSim] = useState<boolean>(false);
  const [runoffReport, setRunoffReport] = useState<CityRunoffReport | null>(null);
  const [acousticReport, setAcousticReport] = useState<CityAcousticReport | null>(null);
  const [hasBaseline, setHasBaseline] = useState<boolean>(scenarioComparator.hasBaseline());
  const [comparisonResult, setComparisonResult] = useState<ScenarioComparisonResult | null>(null);
  const [cityScoreOn, setCityScoreOn] = useState<boolean>(false);
  const [cityScore, setCityScore] = useState<CityUrbanScore | null>(null);
  const [cutMode, setCutMode] = useState<CutMode>('none');
  const [cutHeight, setCutHeight] = useState<number>(2.2);
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
  const [measuredDist, setMeasuredDist] = useState<number>(0);

  useEffect(() => {
    return () => {
      engine?.setMaquetteDataLens('none');
    };
  }, [engine]);

  useEffect(() => {
    if (activeTab === 'acoustic' && !acousticReport && engine) {
      handleEvaluateAcoustics();
    } else if (activeTab === 'compare' && hasBaseline && engine) {
      handleRefreshComparison();
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

  const handleCaptureBaseline = () => {
    if (!engine) return;
    const snap = scenarioComparator.captureSnapshot(engine, 'Skenario A (Baseline)');
    scenarioComparator.setBaseline(snap);
    setHasBaseline(true);
    const comp = scenarioComparator.compareWithCurrent(engine);
    setComparisonResult(comp);
  };

  const handleClearBaseline = () => {
    scenarioComparator.clearBaseline();
    setHasBaseline(false);
    setComparisonResult(null);
  };

  const handleRefreshComparison = () => {
    if (!engine) return;
    const comp = scenarioComparator.compareWithCurrent(engine);
    setComparisonResult(comp);
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

  const handleToggleCityScore = () => {
    if (!engine) return;
    const next = !cityScoreOn;
    setCityScoreOn(next);
    const score = engine.cityScoreOverlay.setVisible(
      next,
      engine.buildingManager,
      engine.roadManager,
      engine.landscapeManager,
      engine.lotManager
    );
    setCityScore(score);
  };

  const handleRefreshCityScore = () => {
    if (!engine) return;
    const score = cityScoreAnalyzer.evaluateCity(
      engine.buildingManager,
      engine.roadManager,
      engine.landscapeManager,
      engine.lotManager
    );
    setCityScore(score);
    if (cityScoreOn) {
      engine.cityScoreOverlay.setVisible(
        true,
        engine.buildingManager,
        engine.roadManager,
        engine.landscapeManager,
        engine.lotManager
      );
    }
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
    <aside
      className="interactive glass-surface"
      style={{
        position: 'absolute',
        top: '76px',
        left: '72px',
        width: '320px',
        padding: '14px',
        zIndex: 45,
        borderRadius: 'var(--radius-panel)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--fill-control-hover)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)'
          }}
        >
          <Activity size={16} strokeWidth={1.75} />
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
            Laboratorium Analisis
          </div>
          <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
            Simulasi Iklim & Tata Ruang Tropis
          </div>
        </div>
      </div>

      {/* SimCity Architectural Maquette Mode & Data Lens Selector */}
      <div className="inset-group" style={{ marginBottom: '12px' }}>
        <div className="inset-row" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)' }}>
                Mode Maket Putih (Data Lens)
              </div>
              <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                Visualisasi Studio Arsitektur 3D
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
          <div style={{ padding: '8px 10px', background: 'var(--surface)', borderTop: '1px solid var(--separator)' }}>
            <div style={{ fontSize: '10px', color: 'var(--label-secondary)', marginBottom: '6px' }}>
              PILIH LAPISAN LENSA DATA:
            </div>
            <div className="segmented-control" style={{ width: '100%' }}>
              {[
                { id: 'kdb_gsb', label: 'KDB/GSB' },
                { id: 'solar_vent', label: 'Iklim' },
                { id: 'acoustic', label: 'Akustik' },
                { id: 'runoff', label: 'Banjir' },
                { id: 'walkability', label: 'Walk' }
              ].map((lens) => (
                <button
                  key={lens.id}
                  onClick={() => handleSelectLens(lens.id as any)}
                  className={`segmented-item ${selectedLens === lens.id ? 'active' : ''}`}
                  style={{ flex: 1, padding: '3px 2px', fontSize: '10px' }}
                >
                  <span>{lens.label}</span>
                </button>
              ))}
            </div>
            {selectedLens === 'acoustic' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '10px', color: 'var(--label-secondary)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '10px', color: 'var(--label-secondary)' }}>
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

      {/* Tabs as Segmented Control */}
      <div
        className="segmented-control"
        style={{
          width: '100%',
          marginBottom: '12px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          display: 'flex',
          flexWrap: 'nowrap'
        }}
      >
        {[
          { id: 'solar', label: 'Surya', icon: Sun },
          { id: 'ventilation', label: 'Angin', icon: Wind },
          { id: 'runoff', label: 'Banjir', icon: Droplets },
          { id: 'structure', label: 'Struktur', icon: ShieldCheck },
          { id: 'acoustic', label: 'Akustik', icon: Volume2 },
          { id: 'compare', label: 'A/B', icon: GitCompare },
          { id: 'city', label: 'Kota', icon: Building },
          { id: 'section', label: 'Denah', icon: Scissors }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSel = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`segmented-item ${isSel ? 'active' : ''}`}
              style={{
                flex: '1 0 auto',
                padding: '5px 4px',
                fontSize: '10px',
                gap: '2px',
                minWidth: 'max-content'
              }}
              title={tab.label}
            >
              <Icon size={12} strokeWidth={1.75} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Solar Analysis */}
      {activeTab === 'solar' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Peta Panas (Heatmap)</div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Radiasi surya Yogyakarta (-7.8° LS)
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
          <div className="inset-footer">
            Sisi fasad menghadap Barat dan Timur menerima radiasi panas tertinggi. Berikan teritisan minimal 1.2m untuk mereduksi beban termal pendinginan.
          </div>
        </div>
      )}

      {/* Tab 2: Ventilation & Thermal Analysis */}
      {activeTab === 'ventilation' && (() => {
        const ventSummary = engine?.ventilationAnalyzer.getCityThermalVentilationSummary();
        return (
          <div className="inset-group" style={{ marginBottom: 0 }}>
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Aliran Angin & Termal Bangunan</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Visualisasi aliran udara & kenyamanan termal tropis
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
                  <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Suhu Udara Luar (Baseline)</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                    {ventSummary.outdoorBaselineTempC.toFixed(1)}°C
                  </span>
                </div>
                <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Estimasi Suhu Ruang Rata-Rata</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: ventSummary.averageIndoorTempC <= 28.5 ? 'var(--good)' : 'var(--warn)' }}>
                    {ventSummary.averageIndoorTempC.toFixed(1)}°C
                  </span>
                </div>
                <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Rasio Bangunan Ventilasi Silang</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: ventSummary.crossVentilationRatioPercent >= 60 ? 'var(--good)' : 'var(--warn)' }}>
                    {ventSummary.crossVentilationRatioPercent.toFixed(1)}% ({ventSummary.crossVentilatedCount}/{ventSummary.totalBuildings})
                  </span>
                </div>
                <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Potensi Penghematan Listrik AC</span>
                  <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--good)' }}>
                    {ventSummary.formattedTotalSavings} / bulan
                  </span>
                </div>
              </>
            )}

            <div className="inset-footer">
              Sesuai SNI 03-6572-2001, ventilasi silang alami dan pembayangan pohon mampu menurunkan suhu ruang hingga 4.5°C tanpa konsumsi daya AC aktif.
            </div>
          </div>
        );
      })()}

      {/* Tab 3: Rain Runoff & Flood Analysis */}
      {activeTab === 'runoff' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Simulasi Aliran Air & Banjir</div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
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
                <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Koefisien Limpasan (C)</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: runoffReport.weightedRunoffCoeff > 0.5 ? 'var(--warn)' : 'var(--good)' }}>
                  {runoffReport.weightedRunoffCoeff.toFixed(2)}
                </span>
              </div>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Debit Puncak (Q)</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {runoffReport.peakDischargeM3PerSec.toFixed(3)} m³/dtk
                </span>
              </div>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Reduksi Resapan</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--good)' }}>
                  -{runoffReport.mitigatedRunoffM3PerHr} m³/jam
                </span>
              </div>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Skor Risiko Genangan</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: runoffReport.inundationRiskScore > 50 ? 'var(--bad)' : runoffReport.inundationRiskScore > 25 ? 'var(--warn)' : 'var(--good)' }}>
                  {runoffReport.inundationRiskScore}/100 ({runoffReport.inundationRiskScore > 50 ? 'Rawan Genangan' : runoffReport.inundationRiskScore > 25 ? 'Waspada' : 'Aman'})
                </span>
              </div>
            </>
          )}

          {/* Badai Muson Ekstrem Toggle */}
          <div className="inset-row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--separator-opaque)', marginTop: '8px', paddingTop: '8px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600 }}>Badai Muson Ekstrem</div>
              <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Intensitas 120 mm/jam (Genangan 3D)</div>
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

          <div className="inset-footer">
            Titik genangan biru dan bidang air 3D menunjukkan area rawan banjir. Tambahkan Sumur Resapan, Biopori, atau Kolam Retensi untuk mempercepat surutnya air.
          </div>
        </div>
      )}

      {/* Tab: Ketahanan Struktur & Seismik Gempa Mw 6.3 (SNI 1726:2019) */}
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
          <div className="inset-group" style={{ marginBottom: 0 }}>
            <div className="inset-row" style={{ justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Ketahanan Seismik (SNI 1726)</span>
              <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                {buildings.length} Bangunan
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', margin: '6px 0' }}>
              <div style={{ background: 'rgba(52, 199, 89, 0.12)', border: '1px solid rgba(52, 199, 89, 0.3)', borderRadius: '6px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Tangguh Seismik</div>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--good)' }}>{resilientCount}</div>
              </div>
              <div style={{ background: 'rgba(255, 59, 48, 0.12)', border: '1px solid rgba(255, 59, 48, 0.3)', borderRadius: '6px', padding: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Rentan / Soft-Story</div>
                <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--bad)' }}>{vulnerableCount}</div>
              </div>
            </div>

            {softStoryCount > 0 && (
              <div className="inset-row" style={{ background: 'rgba(255, 59, 48, 0.08)', padding: '6px 8px', borderRadius: '4px' }}>
                <AlertTriangle size={14} strokeWidth={2} style={{ color: 'var(--bad)', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'var(--bad)' }}>
                  {softStoryCount} bangunan terdeteksi memiliki tingkat lunak (lantai dasar plong rawan puntir geser).
                </span>
              </div>
            )}

            <div style={{ marginTop: '8px' }}>
              <button
                onClick={handleToggleEarthquake}
                className="action-button-secondary"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isCurrentlyShaking ? 'rgba(255, 59, 48, 0.2)' : 'var(--fill-control)',
                  borderColor: isCurrentlyShaking ? 'var(--bad)' : 'var(--separator-opaque)',
                  color: isCurrentlyShaking ? 'var(--bad)' : 'var(--label)',
                  transition: 'all 0.2s ease'
                }}
              >
                <Activity size={15} strokeWidth={2} className={isCurrentlyShaking ? 'animate-pulse' : ''} />
                <span>{isCurrentlyShaking ? 'Hentikan Simulasi Gempa (15s)' : 'Simulasikan Gempa bumi Mw 6.3'}</span>
              </button>
            </div>

            <div className="inset-footer" style={{ marginTop: '8px' }}>
              Pelajaran Gempa Yogyakarta 2006 (Mw 6.3): Bangunan Joglo dan Rumah Modular memiliki sambungan tumpuan fleksibel yang tahan goncangan, sedangkan ruko/kantor bertingkat dengan lantai dasar terbuka (soft story) mengalami osilasi geser ekstrem.
            </div>
          </div>
        );
      })()}

      {/* Tab: Akustik Lingkungan SNI 03-6386-2000 */}
      {activeTab === 'acoustic' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Akustik Kota (SNI 03-6386)</span>
            <button
              onClick={handleEvaluateAcoustics}
              className="action-button-secondary"
              style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <RefreshCw size={12} strokeWidth={1.75} />
              Hitung Ulang
            </button>
          </div>

          <div className="inset-row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Lensa Maket 3D</span>
            <button
              onClick={() => {
                setSelectedLens('acoustic');
                setMaquetteLensOn(true);
                engine?.setMaquetteDataLens('acoustic');
              }}
              className="action-button-secondary"
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                color: maquetteLensOn && selectedLens === 'acoustic' ? 'var(--accent)' : 'inherit',
                borderColor: maquetteLensOn && selectedLens === 'acoustic' ? 'var(--accent)' : 'var(--separator-opaque)'
              }}
            >
              <Layers size={12} strokeWidth={1.75} style={{ marginRight: '4px' }} />
              {maquetteLensOn && selectedLens === 'acoustic' ? 'Lensa Aktif' : 'Aktifkan Lensa'}
            </button>
          </div>

          {acousticReport ? (
            <>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Rata-rata Kebisingan</span>
                <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: acousticReport.avgNoiseDba > 65 ? 'var(--bad)' : acousticReport.avgNoiseDba > 55 ? 'var(--warn)' : 'var(--good)' }}>
                  {acousticReport.avgNoiseDba.toFixed(1)} dBA
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', margin: '6px 0' }}>
                <div style={{ background: 'rgba(52, 199, 89, 0.12)', border: '1px solid rgba(52, 199, 89, 0.3)', borderRadius: '6px', padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Tenang (&lt;=55)</div>
                  <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--good)' }}>{acousticReport.calmCount}</div>
                </div>
                <div style={{ background: 'rgba(255, 149, 0, 0.12)', border: '1px solid rgba(255, 149, 0, 0.3)', borderRadius: '6px', padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Sedang (56-65)</div>
                  <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--warn)' }}>{acousticReport.moderateCount}</div>
                </div>
                <div style={{ background: 'rgba(255, 59, 48, 0.12)', border: '1px solid rgba(255, 59, 48, 0.3)', borderRadius: '6px', padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Bising (&gt;65)</div>
                  <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--bad)' }}>{acousticReport.noisyCount}</div>
                </div>
              </div>

              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Titik Bising Tertinggi</span>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bad)' }}>
                  {acousticReport.maxNoiseDba.toFixed(1)} dBA ({acousticReport.maxNoiseBuildingName})
                </span>
              </div>

              <div className="inset-footer" style={{ marginTop: '8px' }}>
                {acousticReport.mitigationAdvice}
              </div>
            </>
          ) : (
            <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--label-secondary)', fontSize: '12px' }}>
              Tekan tombol "Hitung Ulang" untuk menganalisis kebisingan perambatan jalan dan aktivitas komersial.
            </div>
          )}

          <div className="inset-footer" style={{ borderTop: '1px solid var(--separator-opaque)', marginTop: '8px', paddingTop: '8px' }}>
            Standar Kenyamanan Akustik SNI 03-6386-2000: Hunian &lt;= 55 dBA, Pendidikan/Ibadah &lt;= 50 dBA. Redam bising dengan memundurkan bangunan (GSB) dan menanam sabuk pohon peneduh (-2 s/d -6 dBA).
          </div>
        </div>
      )}

      {/* Tab: Komparasi Skenario A/B Masterplan */}
      {activeTab === 'compare' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Komparator Desain A/B</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleCaptureBaseline}
                className="action-button-secondary"
                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                title="Kunci status masterplan saat ini sebagai Skenario A"
              >
                <Bookmark size={12} strokeWidth={1.75} />
                Kunci A
              </button>
              {hasBaseline && (
                <button
                  onClick={handleRefreshComparison}
                  className="action-button-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} strokeWidth={1.75} />
                  Bandingkan
                </button>
              )}
            </div>
          </div>

          {!hasBaseline ? (
            <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--label-secondary)', fontSize: '12px', lineHeight: 1.5 }}>
              Belum ada snapshot Skenario A yang dikunci. Klik tombol <strong>"Kunci A"</strong> untuk merekam kondisi masterplan saat ini sebagai acuan baseline ilmiah.
            </div>
          ) : comparisonResult ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--separator-opaque)' }}>
                <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Baseline: <strong>{comparisonResult.baseline.name}</strong>
                </span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: comparisonResult.overallImprovementScore >= 0 ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.15)',
                    color: comparisonResult.overallImprovementScore >= 0 ? 'var(--good)' : 'var(--bad)'
                  }}
                >
                  Skor Performa: {comparisonResult.overallImprovementScore >= 0 ? '+' : ''}{comparisonResult.overallImprovementScore.toFixed(1)} poin
                </span>
              </div>

              {/* Matriks Perbandingan Parameter Kunci */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
                {Object.values(comparisonResult.deltas).map((d) => (
                  <div
                    key={d.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '11px',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.03)'
                    }}
                  >
                    <span style={{ color: 'var(--label-secondary)' }}>{d.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="tabular-nums" style={{ color: 'var(--label-tertiary)', fontSize: '10px' }}>
                        {d.formattedBaseline} → {d.formattedCurrent}
                      </span>
                      <span
                        className="tabular-nums"
                        style={{
                          fontWeight: 700,
                          minWidth: '60px',
                          textAlign: 'right',
                          color: d.isImproved ? 'var(--good)' : d.deltaAbsolute === 0 ? 'var(--label-secondary)' : 'var(--bad)'
                        }}
                      >
                        {d.formattedDelta}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="inset-footer">
                {comparisonResult.summaryText}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  onClick={handleClearBaseline}
                  style={{ background: 'transparent', border: 'none', color: 'var(--label-secondary)', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Reset Baseline Skenario A
                </button>
              </div>
            </>
          ) : null}

          <div className="inset-footer" style={{ borderTop: '1px solid var(--separator-opaque)', marginTop: '8px', paddingTop: '8px' }}>
            Alat komparasi masterplan A/B mengevaluasi pergeseran performa mikroklimat, debit banjir, kebisingan, ruang hijau (KDH), dan biaya 10 tahun secara obyektif terhadap kondisi awal.
          </div>
        </div>
      )}

      {/* Tab 3: Section Cut */}
      {activeTab === 'section' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row">
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Mode Potongan</span>
            <div className="segmented-control">
              <button
                onClick={() => handleSetCutMode('none')}
                className={`segmented-item ${cutMode === 'none' ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Penuh
              </button>
              <button
                onClick={() => handleSetCutMode('floor_plan', cutHeight)}
                className={`segmented-item ${cutMode === 'floor_plan' ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Denah (H)
              </button>
              <button
                onClick={() => handleSetCutMode('section_vertical')}
                className={`segmented-item ${cutMode === 'section_vertical' ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Potongan (V)
              </button>
            </div>
          </div>

          {cutMode === 'floor_plan' && (
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Ketinggian Irisan</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{cutHeight.toFixed(1)} m</span>
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
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Measurement Tool */}
      {activeTab === 'measure' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Penggaris Dimensi</div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Ukur jarak GSB & lebar jalan
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
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Jarak Terukur:</span>
              <span className="tabular-nums" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent)' }}>
                {measuredDist.toFixed(2)} m
              </span>
            </div>
          )}

          <div className="inset-row" style={{ justifyContent: 'flex-end' }}>
            <button
              onClick={handleClearRuler}
              className="ios-btn"
              style={{ fontSize: '12px', padding: '4px 10px' }}
            >
              <RotateCcw size={13} strokeWidth={1.75} />
              <span>Bersihkan Garis</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 6: City Score & Scale Analysis */}
      {activeTab === 'city' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Radius Pejalan Kaki (400m)</div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Tampilkan cincin jangkauan fasilitas publik
              </div>
            </div>
            <label className="ios-switch">
              <input
                type="checkbox"
                checked={cityScoreOn}
                onChange={handleToggleCityScore}
              />
              <span className="ios-switch-slider" />
            </label>
          </div>

          {/* Quick Evaluate Button if not yet evaluated */}
          {!cityScore && (
            <div className="inset-row" style={{ justifyContent: 'center' }}>
              <button
                onClick={handleRefreshCityScore}
                className="ios-btn ios-btn-primary"
                style={{ fontSize: '12px', padding: '6px 14px', width: '100%' }}
              >
                <RefreshCw size={13} strokeWidth={1.75} />
                <span>Analisis Skala & Skor Kota</span>
              </button>
            </div>
          )}

          {cityScore && (
            <>
              {/* Overall Score */}
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Skor Keberlanjutan Kota</span>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: cityScore.overallSustainabilityScore >= 70 ? 'var(--good)' : 'var(--warn)'
                  }}
                >
                  {cityScore.overallSustainabilityScore} / 100
                </span>
              </div>

              {/* Walkability % */}
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px' }}>Akses Jalan Kaki 400m</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Permen PU 03/2014: 5 menit jalan kaki
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {cityScore.walkabilityPercent}% Terlayani
                </span>
              </div>

              {/* RTH Kota % */}
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px' }}>Rasio RTH Publik Kota</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    UU 26/2007: Target minimal 30%
                  </div>
                </div>
                <span
                  className="tabular-nums"
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: cityScore.isGreenSpaceTargetMet ? 'var(--good)' : 'var(--warn)'
                  }}
                >
                  {cityScore.greenSpaceRatioPercent}% (Target 30%)
                </span>
              </div>

              {/* Urban Heat Island Index */}
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px' }}>Indeks Efek Pulau Panas (UHI)</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Estimasi suhu permukaan rata-rata
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  +{cityScore.surfaceHeatIslandIndex.toFixed(1)}°C
                </span>
              </div>

              {/* Road Connectivity */}
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '12px' }}>Konektivitas Jaringan Jalan</div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    Rasio persimpangan vs buntu
                  </div>
                </div>
                <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {(cityScore.roadConnectivityRatio * 100).toFixed(0)}%
                </span>
              </div>

              {/* Detected Facilities */}
              <div className="inset-row" style={{ fontSize: '11px', color: 'var(--label-secondary)', justifyContent: 'space-between' }}>
                <span>Fasilitas Terdeteksi:</span>
                <span style={{ fontWeight: 600, color: 'var(--label)' }}>
                  {cityScore.facilities.length} Unit
                </span>
              </div>

              <div className="inset-row" style={{ justifyContent: 'flex-end' }}>
                <button
                  onClick={handleRefreshCityScore}
                  className="ios-btn"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  <RefreshCw size={12} strokeWidth={1.75} />
                  <span>Hitung Ulang</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
};
