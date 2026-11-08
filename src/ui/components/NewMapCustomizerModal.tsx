import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Layers,
  Sun,
  Sunrise,
  Sunset,
  X,
  ArrowRight,
  Mountain,
  Waves,
  Grid,
  Building2,
  FileText,
  CircleDot,
  Anchor,
  Trees,
} from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import type { CustomMapConfig } from '../../core/engine/Engine';
import {
  RoadLayoutPattern,
  RiverPatternMode,
  TerrainContourMode,
  DominantArchitectureStyle,
  computeRiverCurves,
  sampleCubicBezierXZ,
  createCustomMapCityData,
  generateDeterministicTreeCandidates,
} from '../../world/MapCustomGenerator';

type PreviewProjectionMode = 'isometric' | 'plan2d';

function getHillElevationAt(x: number, z: number, hillHeight: number): number {
  const dist = Math.hypot(x, z);
  if (dist <= 76) return 0;
  const ratio = Math.min(1.0, (dist - 76) / 95);
  const wave =
    Math.sin(x * 0.035) * Math.cos(z * 0.035) * 4.5 +
    Math.sin(x * 0.075 + z * 0.055) * 2.0;
  return Math.max(0, (ratio * 9.5 + Math.max(0, wave * ratio)) * (hillHeight / 12));
}

function pointToRiverDist(
  x: number,
  z: number,
  riverCurves: Array<{ points: Array<[number, number]>; isTributary?: boolean }>
): number {
  let minD = Infinity;
  for (const rc of riverCurves) {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const pt = sampleCubicBezierXZ(rc.points, i / steps);
      const d = Math.hypot(x - pt[0], z - pt[1]);
      if (d < minD) minD = d;
    }
  }
  return minD;
}

export const NewMapCustomizerModal: React.FC = () => {
  const isNewMapCustomizerOpen = useUIStore((s) => s.isNewMapCustomizerOpen);
  const closeNewMapCustomizer = useUIStore((s) => s.closeNewMapCustomizer);
  const engine = useUIStore((s) => s.engine);
  const setLoadingMap = useUIStore((s) => s.setLoadingMap);
  const setActiveMap = useUIStore((s) => s.setActiveMap);

  const [cityName, setCityName] = useState('Kota Tropis Nusantara');
  const [layoutTemplate, setLayoutTemplate] = useState<RoadLayoutPattern>('malioboro_corridor');
  const [riverMode, setRiverMode] = useState<RiverPatternMode>('meander');
  const [riverWidth, setRiverWidth] = useState<number>(18);
  const [riverAngleDeg, setRiverAngleDeg] = useState<number>(22);
  const [topography, setTopography] = useState<TerrainContourMode>('river_valley');
  const [hillHeight, setHillHeight] = useState<number>(12);
  const [treeDensityPercent, setTreeDensityPercent] = useState<number>(45);
  const [architecturalStyle, setArchitecturalStyle] =
    useState<DominantArchitectureStyle>('nusantara_tropis');
  const [startTime, setStartTime] = useState<number>(8.5);
  const [previewProjection, setPreviewProjection] =
    useState<PreviewProjectionMode>('isometric');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isNewMapCustomizerOpen) return;
      if (e.key === 'Escape') closeNewMapCustomizer();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewMapCustomizerOpen, closeNewMapCustomizer]);

  // Real-time interactive 2D / Isometric Live Map Preview Canvas
  useEffect(() => {
    if (!isNewMapCustomizerOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const logicalW = 460;
    const logicalH = 440;
    if (canvas.width !== logicalW * dpr || canvas.height !== logicalH * dpr) {
      canvas.width = logicalW * dpr;
      canvas.height = logicalH * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalW, logicalH);

    // Sky / backdrop by startTime
    const isAfternoon = startTime >= 15.5;
    const bgGrad = ctx.createLinearGradient(0, 0, 0, logicalH);
    if (isAfternoon) {
      bgGrad.addColorStop(0, '#072D59');
      bgGrad.addColorStop(0.55, '#194D88');
      bgGrad.addColorStop(1, '#0F3D75');
    } else {
      bgGrad.addColorStop(0, '#072D59');
      bgGrad.addColorStop(1, '#0D3C73');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, logicalW, logicalH);

    const worldRadius = 155;
    const projectPoint = (wx: number, wy: number, wz: number): [number, number] => {
      if (previewProjection === 'plan2d') {
        const scale = 1.25;
        return [logicalW * 0.5 + wx * scale, logicalH * 0.5 + wz * scale];
      }
      // Clean true 30-deg isometric architectural slab projection
      const isoX = (wx - wz) * 0.866;
      const isoY = (wx + wz) * 0.45 - wy * 2.2;
      const scale = 1.12;
      return [logicalW * 0.5 + isoX * scale, logicalH * 0.53 + isoY * scale];
    };

    const previewConfig: CustomMapConfig = {
      cityName,
      layoutTemplate,
      topography,
      riverMode,
      riverWidth,
      riverAngleDeg,
      hillHeight,
      treeDensityPercent,
      architecturalStyle,
      startTime,
    };

    const riverCurves =
      riverMode !== 'none' ? computeRiverCurves(riverMode, riverAngleDeg, 150) : [];

    // 1. Draw Terrain Slab & Topographic Elevation / Contour Grid
    const gridN = 28;
    const cellStep = (worldRadius * 2) / gridN;
    for (let gz = 0; gz < gridN; gz++) {
      for (let gx = 0; gx < gridN; gx++) {
        const x0 = -worldRadius + gx * cellStep;
        const z0 = -worldRadius + gz * cellStep;
        const x1 = x0 + cellStep;
        const z1 = z0 + cellStep;
        const cx = (x0 + x1) * 0.5;
        const cz = (z0 + z1) * 0.5;

        const getElev = (px: number, pz: number) => {
          let e = 0;
          if (topography === 'hills') {
            e = getHillElevationAt(px, pz, hillHeight);
          } else if (topography === 'river_valley' && riverCurves.length > 0) {
            const rDist = pointToRiverDist(px, pz, riverCurves);
            if (rDist > 26) {
              const t = Math.min(1, (rDist - 26) / 110);
              e = t * t * 6.5;
            }
          }
          if (riverCurves.length > 0) {
            const rDist = pointToRiverDist(px, pz, riverCurves);
            if (rDist < riverWidth * 0.55) {
              e = -1.6;
            }
          }
          return e;
        };

        const e00 = getElev(x0, z0);
        const e10 = getElev(x1, z0);
        const e11 = getElev(x1, z1);
        const e01 = getElev(x0, z1);
        const eAvg = getElev(cx, cz);

        const p00 = projectPoint(x0, e00, z0);
        const p10 = projectPoint(x1, e10, z0);
        const p11 = projectPoint(x1, e11, z1);
        const p01 = projectPoint(x0, e01, z1);

        // Hypsometric grass / hill / water coloring
        if (eAvg < -0.5) {
          ctx.fillStyle = '#0284C7';
        } else {
          const hillRatio = Math.min(1, Math.max(0, eAvg / 18));
          const r = Math.round(134 + hillRatio * 56);
          const g = Math.round(197 - hillRatio * 20);
          const b = Math.round(126 - hillRatio * 34);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
        }

        ctx.beginPath();
        ctx.moveTo(p00[0], p00[1]);
        ctx.lineTo(p10[0], p10[1]);
        ctx.lineTo(p11[0], p11[1]);
        ctx.lineTo(p01[0], p01[1]);
        ctx.closePath();
        ctx.fill();

        // Topographic contour lines every 2.5m elevation
        if (eAvg > 0.8 && Math.floor(e00 / 2.5) !== Math.floor(e11 / 2.5)) {
          ctx.strokeStyle = 'rgba(7, 45, 89, 0.25)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (gx % 2 === 0 && gz % 2 === 0) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // 2. Smooth River Channel Ribbon Overlay (exact scaled width & flow angle)
    if (riverCurves.length > 0) {
      riverCurves.forEach((rc) => {
        const w = rc.isTributary ? Math.max(8, riverWidth * 0.72) : riverWidth;
        const leftPts: Array<[number, number]> = [];
        const rightPts: Array<[number, number]> = [];
        const segs = 28;
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const pt = sampleCubicBezierXZ(rc.points, t);
          const ptNext = sampleCubicBezierXZ(rc.points, Math.min(1, t + 0.02));
          const ptPrev = sampleCubicBezierXZ(rc.points, Math.max(0, t - 0.02));
          const dx = ptNext[0] - ptPrev[0];
          const dz = ptNext[1] - ptPrev[1];
          const len = Math.hypot(dx, dz) || 1;
          const nx = -dz / len;
          const nz = dx / len;
          leftPts.push(projectPoint(pt[0] + nx * w * 0.5, -0.5, pt[1] + nz * w * 0.5));
          rightPts.push(projectPoint(pt[0] - nx * w * 0.5, -0.5, pt[1] - nz * w * 0.5));
        }

        // Retaining stone bank glow
        ctx.fillStyle = '#38BDF8';
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        leftPts.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
        for (let i = rightPts.length - 1; i >= 0; i--) {
          ctx.lineTo(rightPts[i][0], rightPts[i][1]);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });
    }

    // 3. Starter Road Network & Bridge Crossings
    const cityData = createCustomMapCityData(previewConfig);
    const roadSegments2D: Array<{ a: [number, number]; b: [number, number] }> = [];
    if (cityData && cityData.roads?.edges) {
      for (const edge of cityData.roads.edges) {
        const pts = edge.controlPoints;
        if (!pts || pts.length < 2) continue;
        const p0: [number, number] = [pts[0][0], pts[0][2]];
        const p1: [number, number] = [pts[pts.length - 1][0], pts[pts.length - 1][2]];
        roadSegments2D.push({ a: p0, b: p1 });

        const segs = 12;
        for (let i = 0; i < segs; i++) {
          const t0 = i / segs;
          const t1 = (i + 1) / segs;
          const ax = p0[0] + (p1[0] - p0[0]) * t0;
          const az = p0[1] + (p1[1] - p0[1]) * t0;
          const bx = p0[0] + (p1[0] - p0[0]) * t1;
          const bz = p0[1] + (p1[1] - p0[1]) * t1;
          const mx = (ax + bx) * 0.5;
          const mz = (az + bz) * 0.5;

          const crossesRiver =
            riverCurves.length > 0 && pointToRiverDist(mx, mz, riverCurves) < riverWidth * 0.58;
          const elevA = crossesRiver ? 1.4 : topography === 'hills' ? getHillElevationAt(ax, az, hillHeight) + 0.15 : 0.15;
          const elevB = crossesRiver ? 1.4 : topography === 'hills' ? getHillElevationAt(bx, bz, hillHeight) + 0.15 : 0.15;

          const sA = projectPoint(ax, elevA, az);
          const sB = projectPoint(bx, elevB, bz);

          ctx.strokeStyle = crossesRiver ? '#FD6E8E' : '#1E293B';
          ctx.lineWidth = edge.type === 'arterial' ? (crossesRiver ? 8.5 : 7) : 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sA[0], sA[1]);
          ctx.lineTo(sB[0], sB[1]);
          ctx.stroke();

          ctx.strokeStyle = crossesRiver ? '#FFE4E6' : 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(sA[0], sA[1]);
          ctx.lineTo(sB[0], sB[1]);
          ctx.stroke();
        }
      }
    }

    // 4. Buildings Colored by Dominant Architectural Style
    const styleFill =
      architecturalStyle === 'modern_kaca'
        ? '#7DD3FC'
        : architecturalStyle === 'kampung_komunal'
          ? '#FDE68A'
          : architecturalStyle === 'mix_eklektik'
            ? '#FBCFE8'
            : '#FFF1F2';
    const roofFill =
      architecturalStyle === 'modern_kaca'
        ? '#072D59'
        : architecturalStyle === 'kampung_komunal'
          ? '#B45309'
          : '#C2410C';

    if (cityData && cityData.buildings) {
      for (const bld of cityData.buildings.slice(0, 18)) {
        const bx = bld.position[0];
        const bz = bld.position[2];
        if (Math.abs(bx) > 140 || Math.abs(bz) > 140) continue;
        if (riverCurves.length > 0 && pointToRiverDist(bx, bz, riverCurves) < riverWidth * 0.65) {
          continue;
        }
        const hw = Math.min(9, (bld.width || 10) * 0.45);
        const hl = Math.min(9, (bld.length || 10) * 0.45);
        const baseY = topography === 'hills' ? getHillElevationAt(bx, bz, hillHeight) : 0;
        const h = Math.min(18, (bld.floorCount || 2) * 2.2);

        const b0 = projectPoint(bx - hw, baseY, bz - hl);
        const b1 = projectPoint(bx + hw, baseY, bz - hl);
        const b2 = projectPoint(bx + hw, baseY, bz + hl);
        const b3 = projectPoint(bx - hw, baseY, bz + hl);

        const t0 = projectPoint(bx - hw, baseY + h, bz - hl);
        const t1 = projectPoint(bx + hw, baseY + h, bz - hl);
        const t2 = projectPoint(bx + hw, baseY + h, bz + hl);
        const t3 = projectPoint(bx - hw, baseY + h, bz + hl);

        if (previewProjection === 'isometric') {
          ctx.fillStyle = styleFill;
          ctx.beginPath();
          ctx.moveTo(b1[0], b1[1]);
          ctx.lineTo(b2[0], b2[1]);
          ctx.lineTo(t2[0], t2[1]);
          ctx.lineTo(t1[0], t1[1]);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = 'rgba(7, 45, 89, 0.25)';
          ctx.beginPath();
          ctx.moveTo(b2[0], b2[1]);
          ctx.lineTo(b3[0], b3[1]);
          ctx.lineTo(t3[0], t3[1]);
          ctx.lineTo(t2[0], t2[1]);
          ctx.closePath();
          ctx.fill();
        }

        ctx.fillStyle = roofFill;
        ctx.strokeStyle = '#072D59';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(t0[0], t0[1]);
        ctx.lineTo(t1[0], t1[1]);
        ctx.lineTo(t2[0], t2[1]);
        ctx.lineTo(t3[0], t3[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // 5. Scattered Tree Canopies by treeDensityPercent (0% - 100%)
    const treeCount = Math.round((treeDensityPercent / 100) * 85);
    if (treeCount > 0) {
      const candidates = generateDeterministicTreeCandidates(treeCount, 125);
      let drawn = 0;
      for (const c of candidates) {
        if (drawn >= treeCount) break;
        if (riverCurves.length > 0 && pointToRiverDist(c.x, c.z, riverCurves) < riverWidth * 0.62) {
          continue;
        }
        // Skip roads
        let onRoad = false;
        for (const seg of roadSegments2D) {
          const vx = seg.b[0] - seg.a[0];
          const vz = seg.b[1] - seg.a[1];
          const l2 = vx * vx + vz * vz;
          const t = l2 > 0 ? Math.max(0, Math.min(1, ((c.x - seg.a[0]) * vx + (c.z - seg.a[1]) * vz) / l2)) : 0;
          const px = seg.a[0] + t * vx;
          const pz = seg.a[1] + t * vz;
          if (Math.hypot(c.x - px, c.z - pz) < 9.5) {
            onRoad = true;
            break;
          }
        }
        if (onRoad) continue;

        const baseY = topography === 'hills' ? getHillElevationAt(c.x, c.z, hillHeight) : 0;
        const p = projectPoint(c.x, baseY + 2.0, c.z);
        const radPx = (3.4 + (drawn % 3) * 0.8) * c.scale;

        ctx.fillStyle = drawn % 5 === 0 ? '#FD6E8E' : drawn % 4 === 0 ? '#FBBF24' : '#15803D';
        ctx.beginPath();
        ctx.arc(p[0], p[1], radPx, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(7, 45, 89, 0.35)';
        ctx.lineWidth = 0.6;
        ctx.stroke();
        drawn++;
      }
    }

    ctx.restore();
  }, [
    isNewMapCustomizerOpen,
    cityName,
    layoutTemplate,
    riverMode,
    riverWidth,
    riverAngleDeg,
    topography,
    hillHeight,
    treeDensityPercent,
    architecturalStyle,
    startTime,
    previewProjection,
  ]);

  if (!isNewMapCustomizerOpen) return null;

  const handleBuildCity = async () => {
    if (!engine || isSubmitting) return;
    setIsSubmitting(true);
    setLoadingMap(true, 'Menyiapkan kontur, sungai, jaringan jalan, dan tata ruang kota...');

    const config: CustomMapConfig = {
      cityName: cityName.trim() || 'Kota Tropis Nusantara',
      layoutTemplate,
      topography,
      riverMode,
      riverWidth,
      riverAngleDeg,
      hillHeight,
      treeDensityPercent,
      treeDensity:
        treeDensityPercent === 0 ? 'none' : treeDensityPercent >= 65 ? 'lush' : 'medium',
      architecturalStyle,
      startTime,
    };

    try {
      await engine.initializeCustomMap(config);
      setActiveMap('custom_map_active', config.cityName);
      useUIStore.setState({
        isLoggedIn: true,
        currentScreen: 'game',
        isMapHubOpen: false,
        isNewMapCustomizerOpen: false,
        timeOfDay: startTime,
      });
    } catch (err) {
      console.error('[NewMapCustomizerModal] Gagal menginisialisasi peta baru:', err);
    } finally {
      setIsSubmitting(false);
      setLoadingMap(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-map-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      style={{
        zIndex: 120,
        background: 'rgba(7, 26, 56, 0.56)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(239, 248, 253, 0.98)',
          border: '1.5px solid rgba(7, 45, 89, 0.22)',
          boxShadow: '0 24px 64px rgba(7, 45, 89, 0.30)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-7 py-4 border-b"
          style={{
            background: 'rgba(7, 45, 89, 0.96)',
            borderColor: 'rgba(219, 242, 252, 0.18)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                background: '#FD6E8E',
                color: '#072D59',
                boxShadow: '0 4px 12px rgba(253, 110, 142, 0.35)',
              }}
            >
              <Compass className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div>
              <span
                className="text-[10.5px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(219, 242, 252, 0.16)',
                  color: '#DBF2FC',
                }}
              >
                PERANCANGAN KOTA BARU • LIVE PREVIEW
              </span>
              <h2
                id="new-map-modal-title"
                className="text-lg font-bold tracking-tight"
                style={{ color: '#DBF2FC', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Kustomisasi Peta Baru
              </h2>
            </div>
          </div>
          <button
            onClick={closeNewMapCustomizer}
            aria-label="Tutup kustomisasi peta"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer"
            style={{
              background: 'rgba(219, 242, 252, 0.14)',
              border: '1px solid rgba(219, 242, 252, 0.24)',
              color: '#DBF2FC',
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Studio Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* KOLOM KIRI: Parameter Peta */}
          <div className="lg:col-span-7 p-6 space-y-5 overflow-y-auto custom-scrollbar" style={{ color: '#072D59' }}>
            {/* a. Nama Kota */}
            <div>
              <label
                htmlFor="city-name-input"
                className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: '#072D59' }}
              >
                Nama Kota Baru
              </label>
              <input
                id="city-name-input"
                type="text"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Masukkan nama kota..."
                className="w-full px-4 py-2.5 rounded-xl font-bold text-sm focus:outline-none"
                style={{
                  background: '#FFFFFF',
                  color: '#072D59',
                  border: '1.5px solid rgba(7, 45, 89, 0.22)',
                }}
              />
            </div>

            {/* b. Pola Jaringan Jalan Awal (5 Pola) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: '#072D59' }}>
                Pola Jaringan Jalan Awal
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'blank_canvas', label: 'Kanvas Kosong', icon: Layers },
                  { id: 'malioboro_corridor', label: 'Koridor Utama (Malioboro)', icon: Building2 },
                  { id: 'modern_grid', label: 'Grid Blok Kota', icon: Grid },
                  { id: 'radial_boulevard', label: 'Lingkar Radial (Boulevard)', icon: CircleDot },
                  { id: 'waterfront_coastal', label: 'Pesisir Tepian Air', icon: Anchor },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = layoutTemplate === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setLayoutTemplate(opt.id as RoadLayoutPattern);
                        if (opt.id === 'waterfront_coastal' && riverMode === 'none') {
                          setRiverMode('meander');
                        }
                      }}
                      className="p-2.5 rounded-xl text-left transition-all flex items-center gap-2 cursor-pointer"
                      style={{
                        background: active ? '#072D59' : 'rgba(219, 242, 252, 0.65)',
                        color: active ? '#DBF2FC' : '#072D59',
                        border: active ? '1.5px solid #FD6E8E' : '1px solid rgba(7, 45, 89, 0.16)',
                        boxShadow: active ? '0 4px 12px rgba(7, 45, 89, 0.18)' : 'none',
                      }}
                    >
                      <Icon className="w-4 h-4 shrink-0" style={{ color: active ? '#FD6E8E' : '#072D59' }} />
                      <span className="text-xs font-bold leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* c. Kustomisasi Sungai & Air */}
            <div
              className="p-4 rounded-2xl space-y-3"
              style={{
                background: 'rgba(219, 242, 252, 0.55)',
                border: '1px solid rgba(7, 45, 89, 0.14)',
              }}
            >
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-[#FD6E8E]" />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#072D59' }}>
                  Kustomisasi Sungai &amp; Air
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'Tanpa Sungai' },
                  { id: 'straight_center', label: 'Sungai Lurus Tengah' },
                  { id: 'meander', label: 'Sungai Berkelok Alami' },
                  { id: 'confluence', label: 'Pertemuan Dua Sungai' },
                ].map((opt) => {
                  const active = riverMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRiverMode(opt.id as RiverPatternMode)}
                      className="py-2 px-2.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                      style={{
                        background: active ? '#FD6E8E' : '#FFFFFF',
                        color: '#072D59',
                        border: active ? '1px solid #F45579' : '1px solid rgba(7, 45, 89, 0.16)',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {riverMode !== 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Lebar Sungai</span>
                      <span className="font-mono text-[#072D59]">{riverWidth} m</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={36}
                      step={2}
                      value={riverWidth}
                      onChange={(e) => setRiverWidth(Number(e.target.value))}
                      aria-label="Lebar Sungai"
                      className="w-full accent-[#FD6E8E] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Sudut Aliran Sungai</span>
                      <span className="font-mono text-[#072D59]">{riverAngleDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={-90}
                      max={90}
                      step={5}
                      value={riverAngleDeg}
                      onChange={(e) => setRiverAngleDeg(Number(e.target.value))}
                      aria-label="Sudut Aliran Sungai"
                      className="w-full accent-[#FD6E8E] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* d. Kontur Tanah & Elevasi */}
            <div
              className="p-4 rounded-2xl space-y-3"
              style={{
                background: 'rgba(219, 242, 252, 0.55)',
                border: '1px solid rgba(7, 45, 89, 0.14)',
              }}
            >
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-[#FD6E8E]" />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#072D59' }}>
                  Kontur Tanah &amp; Elevasi
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'flat_plain', label: 'Dataran Rata', icon: FileText },
                  { id: 'river_valley', label: 'Lembah Sungai', icon: Waves },
                  { id: 'hills', label: 'Perbukitan', icon: Mountain },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = topography === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTopography(opt.id as TerrainContourMode)}
                      className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        background: active ? '#072D59' : '#FFFFFF',
                        color: active ? '#DBF2FC' : '#072D59',
                        border: active ? '1px solid #FD6E8E' : '1px solid rgba(7, 45, 89, 0.16)',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: active ? '#FD6E8E' : '#072D59' }} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {topography === 'hills' && (
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Tinggi Bukit</span>
                    <span className="font-mono text-[#072D59]">{hillHeight} m</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={24}
                    step={1}
                    value={hillHeight}
                    onChange={(e) => setHillHeight(Number(e.target.value))}
                    aria-label="Tinggi Bukit"
                    className="w-full accent-[#FD6E8E] cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* e. Kerapatan Pohon (0% - 100%) & Gaya Arsitektur Dominan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(219, 242, 252, 0.55)',
                  border: '1px solid rgba(7, 45, 89, 0.14)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
                    <Trees className="w-3.5 h-3.5 text-[#FD6E8E]" />
                    Kerapatan Pohon Awal
                  </span>
                  <span className="font-mono text-xs font-bold">{treeDensityPercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={treeDensityPercent}
                  onChange={(e) => setTreeDensityPercent(Number(e.target.value))}
                  aria-label="Kerapatan Pohon Awal"
                  className="w-full accent-[#FD6E8E] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-medium opacity-75 mt-1">
                  <span>0% Terbuka</span>
                  <span>~{Math.round((treeDensityPercent / 100) * 85)} Pohon</span>
                  <span>100% Rimbun</span>
                </div>
              </div>

              <div
                className="p-4 rounded-2xl"
                style={{
                  background: 'rgba(219, 242, 252, 0.55)',
                  border: '1px solid rgba(7, 45, 89, 0.14)',
                }}
              >
                <label className="block text-[11px] font-bold uppercase tracking-wider mb-2">
                  Gaya Arsitektur Dominan
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'nusantara_tropis', label: 'Nusantara Tropis' },
                    { id: 'modern_kaca', label: 'Modern Kaca' },
                    { id: 'kampung_komunal', label: 'Kampung Komunal' },
                    { id: 'mix_eklektik', label: 'Eklektik Campuran' },
                  ].map((st) => {
                    const active = architecturalStyle === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setArchitecturalStyle(st.id as DominantArchitectureStyle)}
                        className="py-1.5 px-2 rounded-lg text-[11px] font-bold truncate cursor-pointer"
                        style={{
                          background: active ? '#072D59' : '#FFFFFF',
                          color: active ? '#DBF2FC' : '#072D59',
                          border: active ? '1px solid #FD6E8E' : '1px solid rgba(7, 45, 89, 0.16)',
                        }}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Waktu Mulai */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Waktu Simulasi Awal</span>
              <div className="flex items-center gap-2">
                {[
                  { time: 8.5, label: '08:30 WIB', icon: Sunrise },
                  { time: 12.0, label: '12:00 WIB', icon: Sun },
                  { time: 16.25, label: '16:15 WIB', icon: Sunset },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = startTime === opt.time;
                  return (
                    <button
                      key={opt.time}
                      type="button"
                      onClick={() => setStartTime(opt.time)}
                      className="px-3 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      style={{
                        background: active ? '#FD6E8E' : '#FFFFFF',
                        color: '#072D59',
                        border: '1px solid rgba(7, 45, 89, 0.18)',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: Live Map Preview Canvas (2D / Isometrik Real-Time) */}
          <div
            className="lg:col-span-5 p-6 flex flex-col justify-between border-t lg:border-t-0 lg:border-l"
            style={{
              background: '#072D59',
              borderColor: 'rgba(219, 242, 252, 0.18)',
              color: '#DBF2FC',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#FD6E8E' }}>
                  Live Map Preview
                </div>
                <div className="text-sm font-bold truncate max-w-[210px]">{cityName || 'Kota Baru'}</div>
              </div>
              <div
                className="flex p-1 rounded-full gap-1"
                style={{ background: 'rgba(219, 242, 252, 0.12)' }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewProjection('isometric')}
                  className="px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer"
                  style={{
                    background: previewProjection === 'isometric' ? '#FD6E8E' : 'transparent',
                    color: previewProjection === 'isometric' ? '#072D59' : '#DBF2FC',
                  }}
                >
                  Isometrik
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewProjection('plan2d')}
                  className="px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer"
                  style={{
                    background: previewProjection === 'plan2d' ? '#FD6E8E' : 'transparent',
                    color: previewProjection === 'plan2d' ? '#072D59' : '#DBF2FC',
                  }}
                >
                  Denah 2D
                </button>
              </div>
            </div>

            <div
              className="rounded-2xl overflow-hidden flex-1 flex items-center justify-center relative"
              style={{
                border: '1px solid rgba(219, 242, 252, 0.24)',
                background: '#083263',
                minHeight: '320px',
              }}
            >
              <canvas
                ref={canvasRef}
                aria-label="Pratinjau Peta Kota Real-Time"
                className="w-full h-full object-contain block"
                style={{ maxHeight: '410px' }}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(219, 242, 252, 0.10)' }}>
                <div className="text-[10px] opacity-75">Sungai</div>
                <div className="text-xs font-bold font-mono">
                  {riverMode === 'none' ? 'Tidak Ada' : `${riverWidth}m • ${riverAngleDeg}°`}
                </div>
              </div>
              <div className="p-2 rounded-xl" style={{ background: 'rgba(219, 242, 252, 0.10)' }}>
                <div className="text-[10px] opacity-75">Elevasi</div>
                <div className="text-xs font-bold font-mono">
                  {topography === 'hills' ? `Bukit ${hillHeight}m` : topography === 'river_valley' ? 'Lembah' : 'Rata 0m'}
                </div>
              </div>
              <div className="p-2 rounded-xl" style={{ background: 'rgba(219, 242, 252, 0.10)' }}>
                <div className="text-[10px] opacity-75">Vegetasi</div>
                <div className="text-xs font-bold font-mono">{treeDensityPercent}% Pohon</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between px-7 py-4 border-t"
          style={{
            background: 'rgba(219, 242, 252, 0.85)',
            borderColor: 'rgba(7, 45, 89, 0.14)',
          }}
        >
          <button
            type="button"
            onClick={closeNewMapCustomizer}
            className="px-5 py-2.5 rounded-full font-bold text-sm cursor-pointer"
            style={{
              color: '#072D59',
              background: 'rgba(7, 45, 89, 0.10)',
            }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleBuildCity}
            disabled={isSubmitting}
            className="flex items-center gap-2.5 px-7 py-3 rounded-full font-bold text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            style={{
              background: '#FD6E8E',
              color: '#072D59',
              boxShadow: '0 8px 22px rgba(253, 110, 142, 0.42)',
            }}
          >
            <span>{isSubmitting ? 'Membangun Distrik...' : 'Bangun & Masuk ke Kota'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
