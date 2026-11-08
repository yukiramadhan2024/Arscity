import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  FolderOpen,
  Upload,
  Volume2,
  VolumeX,
  ArrowRight,
  Compass,
  Building2,
  Route,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
import { InteractiveDioramaCanvas } from './InteractiveDioramaCanvas';
import { IndexedDBStorage, SavedMapMeta } from '../../io/IndexedDBStorage';
import { GeoJSONImporter } from '../../io/GeoJSONImporter';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { showSnackbar } from '../state/useSnackbarStore';
import { CitySaveData } from '../../io/CitySerializer';
import { createMalioboroMapData } from '../../world/MalioboroPreset';

export interface LoginPageProps {
  onSuccess?: () => void;
}

export const ArchitecturalCityBackground: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => (
  <div {...props} style={{ pointerEvents: 'none', ...(props.style || {}) }} />
);

interface CityLaunchSummary {
  id: string | null;
  name: string;
  buildingCount: number;
  roadLengthKm: number;
  timeOfDay: number;
  isFallbackPreset: boolean;
}

function formatWibClock(hourFloat: number): string {
  const normalized = ((hourFloat % 24) + 24) % 24;
  const hh = Math.floor(normalized);
  const mm = Math.round((normalized - hh) * 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} WIB`;
}

function computeRoadLengthKmFromSave(data: CitySaveData): number {
  const edges = data?.roads?.edges || [];
  let totalMeters = 0;
  for (const edge of edges) {
    if (typeof edge.length === 'number' && Number.isFinite(edge.length)) {
      totalMeters += edge.length;
    } else if (Array.isArray(edge.controlPoints) && edge.controlPoints.length >= 2) {
      const p0 = edge.controlPoints[0];
      const pN = edge.controlPoints[edge.controlPoints.length - 1];
      totalMeters += Math.hypot((pN[0] || 0) - (p0[0] || 0), (pN[2] || 0) - (p0[2] || 0));
    }
  }
  return totalMeters / 1000;
}

/**
 * LoginPage - Swiss Architectural Studio & Interactive 3D Launchpad
 *
 * Professional architectural city-builder launch interface:
 * - Color System: Seal Blue (#DBF2FC), Navy Blue (#072D59), Crimson Pink (#FD6E8E)
 * - Typography: Plus Jakarta Sans (Editorial) + JetBrains Mono (Technical telemetry)
 * - Left Panel: Swiss International typographic layout, modular launchpad actions, live project resume
 * - Right Panel: Live Three.js Interactive 3D Architectural Diorama with real-time axonometric viewport
 * - 100% human-crafted architectural layout, zero generic AI clipart
 */
export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const {
    loginAsGuest,
    openMapHub,
    loadMap,
    engine,
    openNewMapCustomizer,
    setShowCustomBuildingStudio,
  } = useUIStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [savedMaps, setSavedMaps] = useState<SavedMapMeta[]>([]);
  const [latestSummary, setLatestSummary] = useState<CityLaunchSummary>(() => {
    const preset = createMalioboroMapData();
    return {
      id: null,
      name: preset.cityTitle || 'Koridor Malioboro Yogyakarta',
      buildingCount: (preset.buildings?.length || 0) + (preset.customBuildings?.length || 0),
      roadLengthKm: computeRoadLengthKmFromSave(preset),
      timeOfDay: preset.environment?.timeOfDay ?? 16.25,
      isFallbackPreset: true,
    };
  });
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    IndexedDBStorage.listSavedMaps()
      .then(async (list) => {
        if (!isMounted || !list || list.length === 0) return;
        setSavedMaps(list);
        const latestMeta = list[0];
        const saveData = await IndexedDBStorage.loadMapById(latestMeta.id);
        if (!isMounted) return;
        if (saveData) {
          setLatestSummary({
            id: latestMeta.id,
            name: saveData.cityTitle || latestMeta.name,
            buildingCount:
              (saveData.buildings?.length || 0) + (saveData.customBuildings?.length || 0),
            roadLengthKm: computeRoadLengthKmFromSave(saveData),
            timeOfDay: saveData.environment?.timeOfDay ?? 16.25,
            isFallbackPreset: false,
          });
        } else {
          setLatestSummary({
            id: latestMeta.id,
            name: latestMeta.name,
            buildingCount: latestMeta.buildingCount || 0,
            roadLengthKm: (latestMeta.roadCount || 0) * 0.06,
            timeOfDay: 16.25,
            isFallbackPreset: false,
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartPlay = () => {
    proceduralAudio.playTaptic('medium');
    loginAsGuest();
    useUIStore.setState({ isMapHubOpen: false });
    openNewMapCustomizer();
    if (onSuccess) onSuccess();
  };

  const handleContinueLast = async () => {
    proceduralAudio.playTaptic('medium');
    loginAsGuest();
    if (latestSummary.id && savedMaps.length > 0) {
      await loadMap('saved', latestSummary.id, latestSummary.name);
    } else {
      await loadMap('malioboro', 'malioboro_preset', 'Koridor Malioboro Yogyakarta');
    }
    useUIStore.setState({ currentScreen: 'game', isMapHubOpen: false });
    if (onSuccess) onSuccess();
  };

  const handleOpenLibrary = () => {
    proceduralAudio.playTaptic('light');
    loginAsGuest();
    openMapHub();
    if (onSuccess) onSuccess();
  };

  const handleOpenStandaloneCad = () => {
    proceduralAudio.playTaptic('medium');
    setShowCustomBuildingStudio(true);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    proceduralAudio.playTaptic('light');
    loginAsGuest();

    try {
      const curEngine = engine || useUIStore.getState().engine;
      if (!curEngine) {
        await loadMap('empty', 'empty_map', 'Kanvas Impor');
      }
      const targetEngine = engine || useUIStore.getState().engine;
      if (targetEngine) {
        const res = await GeoJSONImporter.importFromFile(file, targetEngine);
        showSnackbar({
          variant: 'success',
          title: 'Peta Berhasil Diimpor',
          detail: `+${res.roadsCount} Jalan • +${res.buildingsCount} Gedung`,
        });
      }
      useUIStore.setState({ currentScreen: 'game', isMapHubOpen: false });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showSnackbar({
        variant: 'warning',
        title: 'Gagal Mengimpor',
        detail: err?.message || 'Format tidak valid',
      });
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const toggleAudio = () => {
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    proceduralAudio.setMuted(nextMuted);
  };

  return (
    <main
      className="auth-root-container"
      aria-label="Gerbang Masuk Arscity - Swiss Architectural Studio & Interactive 3D Launchpad"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#DBF2FC',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. Latar Belakang Garis Gambar Kerja Arsitektur Presisi (Swiss Blueprint Grid) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id="swissGrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="#072D59"
              strokeWidth="0.8"
              strokeOpacity="0.08"
            />
            <circle cx="0" cy="0" r="1.2" fill="#072D59" fillOpacity="0.18" />
          </pattern>
          <pattern id="swissMajorGrid" width="240" height="240" patternUnits="userSpaceOnUse">
            <path
              d="M 240 0 L 0 0 0 240"
              fill="none"
              stroke="#072D59"
              strokeWidth="1.2"
              strokeOpacity="0.15"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#swissGrid)" />
        <rect width="100%" height="100%" fill="url(#swissMajorGrid)" />

        {/* Garis Ukur Teknis & Topografi Arsitektur */}
        <g fill="none" stroke="#072D59">
          <path
            d="M -40 220 C 320 180, 720 320, 1100 240 T 1700 200"
            strokeOpacity="0.08"
            strokeWidth="1.2"
          />
          <path
            d="M -40 280 C 340 240, 750 380, 1120 300 T 1700 260"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
          <path
            d="M 420 -20 L 420 1200"
            strokeOpacity="0.07"
            strokeWidth="1"
            strokeDasharray="6 6"
          />
          <path
            d="M 1040 -20 L 1040 1200"
            strokeOpacity="0.07"
            strokeWidth="1"
            strokeDasharray="6 6"
          />
        </g>
      </svg>

      {/* Audio Mute/Unmute Pill - Crisp Swiss Button */}
      <button
        onClick={toggleAudio}
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '9999px',
          background: 'rgba(7, 45, 89, 0.94)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(219, 242, 252, 0.28)',
          boxShadow: '0 4px 14px rgba(7, 45, 89, 0.18)',
          color: '#DBF2FC',
          fontSize: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 600,
          cursor: 'pointer',
        }}
        title={isAudioMuted ? 'Suara disenyapkan (Klik untuk mengaktifkan)' : 'Suara aktif (Klik untuk menyenyapkan)'}
        aria-label="Pengaturan Suara"
      >
        {isAudioMuted ? <VolumeX size={14} strokeWidth={2} /> : <Volume2 size={14} strokeWidth={2} />}
        <span>{isAudioMuted ? 'SENYAP' : 'AUDIO AKTIF'}</span>
      </button>

      {/* 2. Main Studio Launchpad Container (Swiss Architectural Pro Frame) */}
      <div
        className="relative z-10 w-full max-w-[1240px] min-h-[600px] max-h-[92vh] rounded-[28px] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        style={{
          background: '#FFFFFF',
          border: '2px solid #072D59',
          boxShadow: '0 24px 60px rgba(7, 45, 89, 0.18), 0 2px 6px rgba(7, 45, 89, 0.08)',
        }}
      >
        {/* 3. KOLOM KIRI: Swiss Editorial Hierarchy & Modular Launchpad Controls */}
        <div
          className="lg:col-span-6 p-7 sm:p-9 lg:p-11 flex flex-col justify-between z-20"
          style={{
            borderRight: '1.5px solid rgba(7, 45, 89, 0.14)',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F5FBFE 100%)',
          }}
        >
          <div>
            {/* Header: Monogram Logo & Technical System Badge */}
            <div className="flex items-center justify-between mb-8">
              <ArscityLogo size={36} variant="dark" />
              <div
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider"
                style={{
                  background: 'rgba(7, 45, 89, 0.06)',
                  color: '#072D59',
                  border: '1px solid rgba(7, 45, 89, 0.14)',
                }}
              >
                <span>STUDIO RELEASE</span>
                <span style={{ color: '#FD6E8E' }}>• 2026</span>
              </div>
            </div>

            {/* Tipografi Utama (Editorial Architectural Typography) */}
            <h1
              className="font-extrabold tracking-tight leading-[1.08] mb-4"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 'clamp(32px, 3.4vw, 48px)',
                color: '#072D59',
                letterSpacing: '-0.035em',
              }}
            >
              Rancang Kota Impian <br />
              di <span style={{ color: '#FD6E8E' }}>ARSCITY</span>
            </h1>

            <p
              className="text-sm font-medium leading-relaxed max-w-md mb-8"
              style={{ color: '#1E4673' }}
            >
              Studio perancangan kota &amp; simulasi arsitektur parametrik. Integrasi masterplan jalan, tipologi tropis nusantara, hidrologi sungai, dan rekayasa tata ruang waktu nyata.
            </p>

            {/* Tombol Utama: Buat Kota Baru (High-Craft Crimson Pink Button) */}
            <div className="mb-7">
              <button
                type="button"
                onClick={handleStartPlay}
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-3.5 px-8 py-4 rounded-2xl font-extrabold text-base tracking-wide transition-all active:scale-[0.98] hover:brightness-105"
                style={{
                  background: '#FD6E8E',
                  color: '#072D59',
                  border: '2px solid #072D59',
                  boxShadow: '4px 4px 0px #072D59',
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                }}
              >
                <Sparkles className="w-5 h-5 text-[#072D59] stroke-[2.2]" />
                <span>Buat Kota Baru</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Panel Kontrol Proyek: Kartu Lanjutkan & Alat Studio Sekunder */}
          <div className="flex flex-col gap-3">
            {/* Kartu Lanjutkan Pembangunan dengan Ringkasan Nyata */}
            <button
              type="button"
              onClick={handleContinueLast}
              className="w-full p-4 rounded-xl text-left transition-all flex items-center justify-between gap-4 hover:brightness-95 group"
              style={{
                background: '#072D59',
                border: '1.5px solid #072D59',
                color: '#DBF2FC',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(7, 45, 89, 0.15)',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-[#FD6E8E]" />
                  <span
                    className="text-[10px] font-mono font-bold uppercase tracking-wider"
                    style={{ color: '#FD6E8E' }}
                  >
                    Lanjutkan Pembangunan
                  </span>
                </div>
                <div className="text-sm font-bold truncate text-[#FFFFFF] tracking-tight">
                  {latestSummary.name}
                </div>
                <div className="flex flex-wrap items-center gap-3.5 mt-2 text-[11px] font-mono" style={{ color: '#DBF2FC' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#FD6E8E]" />
                    {latestSummary.buildingCount} Massa Gedung
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5 text-[#FD6E8E]" />
                    {latestSummary.roadLengthKm.toFixed(2)} km Jalan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#FD6E8E]" />
                    {formatWibClock(latestSummary.timeOfDay)}
                  </span>
                </div>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{
                  background: 'rgba(219, 242, 252, 0.15)',
                  color: '#DBF2FC',
                  border: '1px solid rgba(219, 242, 252, 0.3)',
                }}
              >
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            </button>

            {/* Tiga Tombol Aksi Studio Modular Berdampingan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleOpenLibrary}
                className="p-3 rounded-xl text-left transition-all flex items-center gap-2.5 hover:bg-[#DBF2FC]"
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(7, 45, 89, 0.2)',
                  color: '#072D59',
                  cursor: 'pointer',
                }}
              >
                <FolderOpen className="w-4 h-4 shrink-0 text-[#072D59]" strokeWidth={2.2} />
                <span className="font-bold text-xs leading-tight">Buka Peta Tersimpan</span>
              </button>

              <button
                type="button"
                onClick={handleOpenStandaloneCad}
                className="p-3 rounded-xl text-left transition-all flex items-center gap-2.5 hover:bg-[#DBF2FC]"
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(7, 45, 89, 0.2)',
                  color: '#072D59',
                  cursor: 'pointer',
                }}
              >
                <Compass className="w-4 h-4 shrink-0 text-[#072D59]" strokeWidth={2.2} />
                <span className="font-bold text-xs leading-tight">Studio CAD Mandiri</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="p-3 rounded-xl text-left transition-all flex items-center gap-2.5 hover:bg-[#DBF2FC]"
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(7, 45, 89, 0.2)',
                  color: '#072D59',
                  cursor: 'pointer',
                }}
              >
                <Upload className="w-4 h-4 shrink-0 text-[#072D59]" strokeWidth={2.2} />
                <span className="font-bold text-xs leading-tight">
                  {isImporting ? 'Mengimpor...' : 'Impor Peta'}
                </span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.arscity"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />

            {/* Swiss Studio Minimalist Technical Footer */}
            <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-[#072D59] opacity-70">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-[#FD6E8E]" />
                PENYIMPANAN LOKAL CLIENT-SIDE
              </span>
              <span>LAT -7.7956° LON 110.3695°</span>
            </div>
          </div>
        </div>

        {/* 4. KOLOM KANAN: Live Interactive 3D Architectural Diorama Launchpad */}
        <div className="lg:col-span-6 hidden lg:block relative min-h-[560px]">
          <InteractiveDioramaCanvas className="w-full h-full" />
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
