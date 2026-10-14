import React, { useState } from 'react';
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
  MapPin
} from 'lucide-react';
import { CutMode } from '../../analysis/SectionCutManager';
import { RunoffSimulator, CityRunoffReport } from '../../simulation/RunoffSimulator';
import { cityScoreAnalyzer, CityUrbanScore } from '../../analysis/CityScoreAnalyzer';

export const AnalysisOverlay: React.FC = () => {
  const { activeTool, engine, timeOfDay, dayOfYear } = useUIStore();
  const [activeTab, setActiveTab] = useState<'solar' | 'ventilation' | 'runoff' | 'section' | 'measure' | 'city'>('solar');

  const [heatmapOn, setHeatmapOn] = useState<boolean>(false);
  const [windOn, setWindOn] = useState<boolean>(false);
  const [runoffOn, setRunoffOn] = useState<boolean>(false);
  const [runoffReport, setRunoffReport] = useState<CityRunoffReport | null>(null);
  const [cityScoreOn, setCityScoreOn] = useState<boolean>(false);
  const [cityScore, setCityScore] = useState<CityUrbanScore | null>(null);
  const [cutMode, setCutMode] = useState<CutMode>('none');
  const [cutHeight, setCutHeight] = useState<number>(2.2);
  const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
  const [measuredDist, setMeasuredDist] = useState<number>(0);

  if (activeTool !== 'analyze') return null;

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

      {/* Tabs as Segmented Control */}
      <div className="segmented-control" style={{ width: '100%', marginBottom: '12px' }}>
        {[
          { id: 'solar', label: 'Surya', icon: Sun },
          { id: 'ventilation', label: 'Angin', icon: Wind },
          { id: 'runoff', label: 'Banjir', icon: Droplets },
          { id: 'city', label: 'Kota', icon: Building },
          { id: 'section', label: 'Denah', icon: Scissors },
          { id: 'measure', label: 'Ukur', icon: Ruler }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSel = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`segmented-item ${isSel ? 'active' : ''}`}
              style={{ flex: 1, padding: '5px 4px', fontSize: '11px' }}
            >
              <Icon size={13} strokeWidth={1.75} />
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

      {/* Tab 2: Ventilation Analysis */}
      {activeTab === 'ventilation' && (
        <div className="inset-group" style={{ marginBottom: 0 }}>
          <div className="inset-row">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500 }}>Partikel Aliran Angin</div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Visualisasi angin muson tenggara
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
          <div className="inset-footer">
            Pola jalan dan orientasi massa bangunan yang sejajar arah angin dominan membantu menurunkan suhu perkotaan (efek urban heat island).
          </div>
        </div>
      )}

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

          <div className="inset-footer">
            Titik genangan biru menunjukkan cekungan topografi. Tambahkan sumur resapan, biopori, dan taman berumput (KDH) di sekitar area genangan untuk menyerap air hujan ke tanah.
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
