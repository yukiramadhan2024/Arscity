import React, { useState, useEffect } from 'react';
import { useUIStore, GraphicsQuality } from '../state/useUIStore';
import { LoadTestRunner, BenchmarkMetrics } from '../../dev/LoadTestRunner';
import { Activity, Play, Trash2, X, Check, Gauge, Cpu, Layers } from 'lucide-react';
import { proceduralAudio } from '../../audio/ProceduralAudio';

interface LoadTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoadTestModal: React.FC<LoadTestModalProps> = ({ isOpen, onClose }) => {
  const { engine, graphicsQuality, setGraphicsQuality } = useUIStore();
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);

  // Poll live telemetry every 500ms while modal is open
  useEffect(() => {
    if (!isOpen || !engine) return;

    const updateTelemetry = () => {
      setMetrics(LoadTestRunner.getMetrics(engine));
    };

    updateTelemetry();
    const interval = setInterval(updateTelemetry, 500);
    return () => clearInterval(interval);
  }, [isOpen, engine]);

  if (!isOpen) return null;

  const handleRunLoadTest = () => {
    if (!engine) return;
    setIsRunningBenchmark(true);
    proceduralAudio.playClick();

    // Small delay to allow UI to show loading state
    setTimeout(() => {
      const result = LoadTestRunner.generateBenchmarkCity(engine);
      setMetrics(result);
      setIsRunningBenchmark(false);
      proceduralAudio.playPlaceBuilding();
    }, 50);
  };

  const handleClear = () => {
    if (!engine) return;
    LoadTestRunner.clearBenchmarkCity(engine);
    setMetrics(LoadTestRunner.getMetrics(engine));
    proceduralAudio.playClick();
  };

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'var(--good, #34C759)';
    if (fps >= 30) return '#FF9500';
    return 'var(--bad, #FF3B30)';
  };

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
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label)' }}>
                Uji Beban & Performa Grafis 3D
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Milestone T3: Target 300 Bangunan & 3 km Jalan @ 60 FPS
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup Panel Uji Beban">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-sheet-body">
          {/* Action Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-medium)',
              backgroundColor: 'var(--fill-control)',
              border: '1px solid var(--separator)',
              marginBottom: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--label-secondary)', lineHeight: 1.4 }}>
              Mengisi kota secara instan dengan <strong>300 bangunan</strong> (arsitektur modern, joglo, ruko, sekolah, dsb) dan <strong>3.0 km jalan beraspal</strong> berderet pohon peneduh & lampu jalan instanced.
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={handleRunLoadTest}
                disabled={isRunningBenchmark}
                className="btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px'
                }}
              >
                <Play size={14} />
                <span>{isRunningBenchmark ? 'Membuat 300 Gedung...' : 'Jalankan Uji Beban 300 Gedung'}</span>
              </button>

              <button
                onClick={handleClear}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  fontSize: '12px'
                }}
                title="Bersihkan Semua Gedung Uji"
              >
                <Trash2 size={14} />
                <span>Bersihkan</span>
              </button>
            </div>
          </div>

          {/* Section: Live Telemetry */}
          <div className="inset-header">TELEMETRI PERFORMA RENDERER WEBGL (LIVE)</div>
          <div className="inset-group">
            {/* FPS Hero Row */}
            <div className="inset-row" style={{ padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Gauge size={22} style={{ color: getFpsColor(metrics?.fps ?? 60) }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Frame Rate (Kelancaran)</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Target spek: &ge;60 FPS di laptop mid-range preset High
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: getFpsColor(metrics?.fps ?? 60),
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-small)',
                  backgroundColor: 'var(--fill-control)'
                }}
              >
                {metrics?.fps ?? 60} <span style={{ fontSize: '12px', fontWeight: 500 }}>FPS</span>
              </div>
            </div>

            {/* Draw Calls */}
            <div className="inset-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={16} style={{ color: 'var(--label-secondary)' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Draw Calls per Frame</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Hasil penggabungan geometri (mergeGeometries) per material
                  </div>
                </div>
              </div>
              <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
                {metrics?.drawCalls ?? 0} <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>calls</span>
              </div>
            </div>

            {/* Triangles */}
            <div className="inset-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} style={{ color: 'var(--label-secondary)' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Total Poligon (Segitiga)</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Mesh arsitektur detail PBR yang dirender
                  </div>
                </div>
              </div>
              <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
                {(metrics?.triangles ?? 0).toLocaleString('id-ID')}
              </div>
            </div>

            {/* Memory Geometries & Textures */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>BufferGeometries di VRAM</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Memanfaatkan Geometry Cache (dibagikan antar instance)
                </div>
              </div>
              <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
                {metrics?.geometries ?? 0} <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>buffers</span>
              </div>
            </div>

            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Tekstur Foto CC0 1K di GPU</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Dikelola terpusat oleh MaterialLibrary singleton
                </div>
              </div>
              <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600 }}>
                {metrics?.textures ?? 0} <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>textures</span>
              </div>
            </div>

            {/* City Objects */}
            <div className="inset-row">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>Jumlah Objek Terdaftar</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Statistik riil kota aktif
                </div>
              </div>
              <div className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                {metrics?.buildingCount ?? 0} gedung • {metrics?.roadKm ?? 0} km jalan
              </div>
            </div>
          </div>

          {/* Section: Quality Preset Switcher */}
          <div className="inset-header">UJI DENGAN PRESET KUALITAS GRAFIS</div>
          <div className="inset-group">
            {[
              { id: 'high' as GraphicsQuality, name: 'High (Optimal)', desc: 'Shadow Map 2048x2048, Frustum 65m fokus tajam, PCF Soft' },
              { id: 'medium' as GraphicsQuality, name: 'Medium (Standar)', desc: 'Shadow Map 1024x1024, Frustum 85m seimbang' },
              { id: 'low' as GraphicsQuality, name: 'Low (Hemat Daya)', desc: 'Bayangan 3D non-aktif, render shading ringan' }
            ].map((p) => {
              const active = graphicsQuality === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setGraphicsQuality(p.id);
                    proceduralAudio.playClick();
                  }}
                  className="inset-row inset-row-clickable"
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: active ? 'var(--accent)' : 'var(--label)' }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                      {p.desc}
                    </div>
                  </div>
                  {active && <Check size={16} strokeWidth={2} style={{ color: 'var(--accent)' }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
