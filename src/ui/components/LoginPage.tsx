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
} from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
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
      aria-label="Gerbang Masuk Arscity - Architectural City Builder Launchpad"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(155deg, #DBF2FC 0%, #EFF8FD 52%, #D3EFFA 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. Latar Belakang Topografi & Jaringan Jalan Masterplan Halus (Non-Grid) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g fill="none" stroke="#072D59">
          {/* Garis Kontur Topografi Organik */}
          <path
            d="M-80 180 C 180 110, 420 260, 720 190 C 980 130, 1210 60, 1520 160"
            strokeOpacity="0.09"
            strokeWidth="1.2"
          />
          <path
            d="M-80 230 C 190 160, 450 315, 740 245 C 1010 180, 1230 115, 1520 215"
            strokeOpacity="0.07"
            strokeWidth="1"
          />
          <path
            d="M-80 285 C 210 215, 480 370, 760 300 C 1030 235, 1250 170, 1520 270"
            strokeOpacity="0.06"
            strokeWidth="0.9"
          />
          <path
            d="M-60 690 C 240 610, 520 790, 860 700 C 1120 630, 1300 720, 1510 660"
            strokeOpacity="0.09"
            strokeWidth="1.2"
          />
          <path
            d="M-60 745 C 260 665, 540 845, 880 755 C 1140 685, 1320 775, 1510 715"
            strokeOpacity="0.06"
            strokeWidth="0.9"
          />
          {/* Jaringan Koridor Arterial Masterplan Kota */}
          <path
            d="M -40 540 Q 410 470, 760 515 T 1500 410"
            strokeOpacity="0.11"
            strokeWidth="2.4"
          />
          <path
            d="M 210 -30 C 280 240, 295 520, 390 930"
            strokeOpacity="0.09"
            strokeWidth="1.8"
          />
          <path
            d="M 1110 -30 C 1050 280, 1140 590, 1210 930"
            strokeOpacity="0.09"
            strokeWidth="1.8"
          />
          <circle cx="292" cy="494" r="24" strokeOpacity="0.11" strokeWidth="1.5" />
          <circle cx="1102" cy="472" r="32" strokeOpacity="0.10" strokeWidth="1.4" />
        </g>
      </svg>

      {/* Audio Mute/Unmute Capsule */}
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
          background: 'rgba(7, 45, 89, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(219, 242, 252, 0.28)',
          boxShadow: '0 6px 18px rgba(7, 45, 89, 0.16)',
          color: '#DBF2FC',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
        title={isAudioMuted ? 'Suara disenyapkan (Klik untuk mengaktifkan)' : 'Suara aktif (Klik untuk menyenyapkan)'}
        aria-label="Pengaturan Suara"
      >
        {isAudioMuted ? <VolumeX size={15} strokeWidth={1.75} /> : <Volume2 size={15} strokeWidth={1.75} />}
        <span>{isAudioMuted ? 'Senyap' : 'Suara Aktif'}</span>
      </button>

      {/* 2. Architectural City-Builder Launchpad Container */}
      <div
        className="relative z-10 w-full max-w-[1180px] min-h-[590px] max-h-[92vh] rounded-[32px] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        style={{
          background: 'rgba(239, 248, 253, 0.94)',
          backdropFilter: 'blur(26px) saturate(180%)',
          WebkitBackdropFilter: 'blur(26px) saturate(180%)',
          border: '1.5px solid rgba(7, 45, 89, 0.18)',
          boxShadow: '0 28px 70px rgba(7, 45, 89, 0.16), 0 2px 10px rgba(7, 45, 89, 0.06)',
        }}
      >
        {/* 3. KOLOM KIRI: Brand Header, Tipografi, CTA & Panel Proyek Kota */}
        <div className="lg:col-span-6 p-8 sm:p-10 lg:p-12 flex flex-col justify-between z-20">
          <div>
            {/* Logo Minimalis Arscity */}
            <div className="mb-7">
              <ArscityLogo size={34} showText={true} variant="light" textColor="#072D59" />
            </div>

            {/* Tipografi Utama */}
            <h1
              className="font-extrabold tracking-tight leading-[1.12] mb-3"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 'clamp(32px, 3.5vw, 46px)',
                color: '#072D59',
              }}
            >
              Rancang Kota Impian <br />
              di <span style={{ color: '#FD6E8E' }}>ARSCITY</span>
            </h1>

            <p
              className="text-sm font-medium leading-relaxed max-w-md mb-7"
              style={{ color: '#1E4673' }}
            >
              Sandbox city-builder &amp; studio CAD arsitektur dengan simulasi iklim tropis, jalan raya, sungai, dan interior bangunan.
            </p>

            {/* Tombol Utama Kapsul Crimson Pink */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleStartPlay}
                className="group inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-full font-bold text-base tracking-wide transition-all active:scale-95 hover:brightness-105"
                style={{
                  background: '#FD6E8E',
                  color: '#072D59',
                  boxShadow: '0 10px 24px rgba(253, 110, 142, 0.42)',
                  border: '1px solid rgba(7, 45, 89, 0.12)',
                  cursor: 'pointer',
                }}
              >
                <span>Buat Kota Baru</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Panel Kontrol Peluncuran Proyek City Builder */}
          <div className="flex flex-col gap-3">
            {/* Kartu Lanjutkan Pembangunan dengan Ringkasan Nyata Kota Terakhir */}
            <button
              type="button"
              onClick={handleContinueLast}
              className="w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between gap-4 hover:brightness-95"
              style={{
                background: 'rgba(7, 45, 89, 0.94)',
                border: '1px solid rgba(219, 242, 252, 0.24)',
                boxShadow: '0 10px 26px rgba(7, 45, 89, 0.18)',
                color: '#DBF2FC',
                cursor: 'pointer',
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="w-3.5 h-3.5 text-[#FD6E8E]" />
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: '#FD6E8E' }}
                  >
                    Lanjutkan Pembangunan
                  </span>
                </div>
                <div className="text-sm font-bold truncate" style={{ color: '#DBF2FC' }}>
                  {latestSummary.name}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] font-medium" style={{ color: 'rgba(219, 242, 252, 0.82)' }}>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Building2 className="w-3 h-3 text-[#FD6E8E]" />
                    {latestSummary.buildingCount} Bangunan
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Route className="w-3 h-3 text-[#FD6E8E]" />
                    {latestSummary.roadLengthKm.toFixed(2)} km Jalan
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3 h-3 text-[#FD6E8E]" />
                    {formatWibClock(latestSummary.timeOfDay)}
                  </span>
                </div>
              </div>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(219, 242, 252, 0.14)',
                  color: '#DBF2FC',
                }}
              >
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Tiga Tombol Aksi Berdampingan yang Bersih */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleOpenLibrary}
                className="p-3 rounded-2xl text-left transition-all flex items-center gap-2.5 hover:bg-white"
                style={{
                  background: 'rgba(219, 242, 252, 0.72)',
                  border: '1px solid rgba(7, 45, 89, 0.18)',
                  color: '#072D59',
                  cursor: 'pointer',
                }}
              >
                <FolderOpen className="w-4 h-4 shrink-0 text-[#FD6E8E]" strokeWidth={2.2} />
                <span className="font-bold text-xs leading-tight">Buka Peta Tersimpan</span>
              </button>

              <button
                type="button"
                onClick={handleOpenStandaloneCad}
                className="p-3 rounded-2xl text-left transition-all flex items-center gap-2.5 hover:bg-white"
                style={{
                  background: 'rgba(219, 242, 252, 0.72)',
                  border: '1px solid rgba(7, 45, 89, 0.18)',
                  color: '#072D59',
                  cursor: 'pointer',
                }}
              >
                <Compass className="w-4 h-4 shrink-0 text-[#FD6E8E]" strokeWidth={2.2} />
                <span className="font-bold text-xs leading-tight">Studio CAD Mandiri</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="p-3 rounded-2xl text-left transition-all flex items-center gap-2.5 hover:bg-white"
                style={{
                  background: 'rgba(219, 242, 252, 0.72)',
                  border: '1px solid rgba(7, 45, 89, 0.18)',
                  color: '#072D59',
                  cursor: 'pointer',
                }}
              >
                <Upload className="w-4 h-4 shrink-0 text-[#FD6E8E]" strokeWidth={2.2} />
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
          </div>
        </div>

        {/* 4. KOLOM KANAN: Bingkai Viewport Diorama Kota Isometrik 3D Bersih */}
        <div className="lg:col-span-6 p-5 pl-0 hidden lg:flex items-stretch justify-center">
          <div
            className="w-full h-full rounded-[24px] overflow-hidden relative"
            style={{
              background: '#DBF2FC',
              border: '1.5px solid rgba(7, 45, 89, 0.18)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.55), 0 12px 30px rgba(7, 45, 89, 0.12)',
            }}
          >
            <img
              src="/assets/images/city_diorama_clean.png"
              alt="Viewport Diorama Kota Isometrik 3D Arscity"
              className="w-full h-full object-cover object-center select-none pointer-events-none"
              draggable={false}
            />
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
