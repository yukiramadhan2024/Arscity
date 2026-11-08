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
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
import { ArchitecturalVectorDiorama } from './ArchitecturalVectorDiorama';
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
 * LoginPage - Halaman Masuk Utama Arscity
 *
 * Desain arsitektural 2 kolom yang presisi, mewah, dan bertema pastel:
 * - Menggunakan palet pastel wajib: Seal Blue (#DBF2FC), Navy Blue (#072D59), Crimson Pink (#FD6E8E)
 * - Tombol-tombol bergaya 3D pastel fisik dengan efek tekan mekanikal yang sangat memuaskan
 * - Bebas dari segala bentuk indikasi AI
 * - Kolom kanan diperbagus dengan karya seni vektor isometrik arsitektur 100% SVG yang lembut dan tajam
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
      aria-label="Gerbang Masuk Arscity"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(155deg, #DBF2FC 0%, #F0F9FE 52%, #D8F0FA 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. Latar Belakang Gambar Kerja Isometrik & Topografi Pastel Halus */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g fill="none" stroke="#072D59">
          <path
            d="M-80 180 C 180 110, 420 260, 720 190 C 980 130, 1210 60, 1520 160"
            strokeOpacity="0.08"
            strokeWidth="1.2"
          />
          <path
            d="M-80 230 C 190 160, 450 315, 740 245 C 1010 180, 1230 115, 1520 215"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
          <path
            d="M-80 285 C 210 215, 480 370, 760 300 C 1030 235, 1250 170, 1520 270"
            strokeOpacity="0.05"
            strokeWidth="0.9"
          />
          <path
            d="M-60 690 C 240 610, 520 790, 860 700 C 1120 630, 1300 720, 1510 660"
            strokeOpacity="0.08"
            strokeWidth="1.2"
          />
          <path
            d="M -40 540 Q 410 470, 760 515 T 1500 410"
            strokeOpacity="0.10"
            strokeWidth="2.2"
          />
          <path
            d="M 210 -30 C 280 240, 295 520, 390 930"
            strokeOpacity="0.08"
            strokeWidth="1.6"
          />
          <path
            d="M 1110 -30 C 1050 280, 1140 590, 1210 930"
            strokeOpacity="0.08"
            strokeWidth="1.6"
          />
        </g>
      </svg>

      {/* Tombol Suara Kapsul Kaca 3D Pastel */}
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
          padding: '8px 18px',
          borderRadius: '9999px',
          background: 'linear-gradient(180deg, #123E6E 0%, #072D59 100%)',
          border: '1.5px solid rgba(219, 242, 252, 0.35)',
          boxShadow: '0 4px 0 #041C38, 0 8px 18px rgba(7, 45, 89, 0.22), inset 0 1px 0 rgba(219, 242, 252, 0.4)',
          color: '#DBF2FC',
          fontSize: '12px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        }}
        className="active:translate-y-[2px] active:shadow-[0_1px_0_#041C38,0_4px_8px_rgba(7,45,89,0.15)] hover:brightness-105"
        title={isAudioMuted ? 'Suara disenyapkan (Klik untuk mengaktifkan)' : 'Suara aktif (Klik untuk menyenyapkan)'}
        aria-label="Pengaturan Suara"
      >
        {isAudioMuted ? <VolumeX size={15} strokeWidth={2} /> : <Volume2 size={15} strokeWidth={2} />}
        <span>{isAudioMuted ? 'Senyap' : 'Suara Aktif'}</span>
      </button>

      {/* 2. Kartu Kaca Utama Pastel (Main Frosted Glass Container) */}
      <div
        className="relative z-10 w-full max-w-[1180px] min-h-[590px] max-h-[92vh] rounded-[36px] overflow-hidden grid grid-cols-1 lg:grid-cols-12"
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(226, 245, 254, 0.88) 100%)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '2px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 32px 75px rgba(7, 45, 89, 0.14), 0 4px 16px rgba(7, 45, 89, 0.05), inset 0 1px 0 #FFFFFF',
        }}
      >
        {/* 3. KOLOM KIRI: Brand Header, Tipografi, CTA 3D Pastel & Panel Proyek Kota */}
        <div className="lg:col-span-6 p-8 sm:p-10 lg:p-12 flex flex-col justify-between z-20">
          <div>
            {/* Logo Vektor Arscity */}
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
              Sandbox arsitektur dan tata kota tropis: rancang jaringan jalan, tata bangunan publik dan hunian, lalu jelajahi kotamu dalam skala manusia nyata.
            </p>

            {/* Tombol Utama Bergaya 3D Pastel Crimson Pink */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleStartPlay}
                className="group inline-flex items-center justify-center gap-3.5 px-8 py-3.5 rounded-2xl font-extrabold text-base tracking-wide cursor-pointer transition-all active:translate-y-[3px] active:shadow-[0_1px_0_#D64C6D,0_4px_10px_rgba(253,110,142,0.25)] hover:brightness-105"
                style={{
                  background: 'linear-gradient(180deg, #FE8CA5 0%, #FD6E8E 100%)',
                  color: '#072D59',
                  border: '1.5px solid #D64C6D',
                  boxShadow: '0 4px 0 #D64C6D, 0 10px 24px rgba(253, 110, 142, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
                }}
              >
                <Sparkles className="w-5 h-5 text-[#072D59] stroke-[2.3]" />
                <span>Buat Kota Baru</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Panel Kontrol Proyek: Kartu Lanjutkan & Alat Studio Sekunder 3D Pastel */}
          <div className="flex flex-col gap-3">
            {/* Kartu Lanjutkan Pembangunan 3D Pastel */}
            <button
              type="button"
              onClick={handleContinueLast}
              className="w-full p-4 rounded-2xl text-left cursor-pointer transition-all flex items-center justify-between gap-4 hover:brightness-105 active:translate-y-[2px] active:shadow-[0_1px_0_#041B38,0_6px_14px_rgba(7,45,89,0.18)] group"
              style={{
                background: 'linear-gradient(180deg, #0A3566 0%, #072D59 100%)',
                border: '1.5px solid rgba(219, 242, 252, 0.32)',
                boxShadow: '0 4px 0 #041B38, 0 12px 28px rgba(7, 45, 89, 0.22), inset 0 1px 0 rgba(219, 242, 252, 0.28)',
                color: '#DBF2FC',
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
                <div className="text-sm font-bold truncate text-[#FFFFFF]" style={{ color: '#DBF2FC' }}>
                  {latestSummary.name}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] font-medium" style={{ color: 'rgba(219, 242, 252, 0.85)' }}>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Building2 className="w-3.5 h-3.5 text-[#FD6E8E]" />
                    {latestSummary.buildingCount} Bangunan
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Route className="w-3.5 h-3.5 text-[#FD6E8E]" />
                    {latestSummary.roadLengthKm.toFixed(2)} km Jalan
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-[#FD6E8E]" />
                    {formatWibClock(latestSummary.timeOfDay)}
                  </span>
                </div>
              </div>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{
                  background: 'linear-gradient(180deg, rgba(219, 242, 252, 0.25) 0%, rgba(219, 242, 252, 0.12) 100%)',
                  color: '#DBF2FC',
                  border: '1px solid rgba(219, 242, 252, 0.35)',
                  boxShadow: '0 2px 0 rgba(7, 45, 89, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                }}
              >
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            {/* Tiga Tombol Aksi Studio Bergaya Ubin 3D Pastel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={handleOpenLibrary}
                className="p-3 rounded-2xl text-left cursor-pointer transition-all flex items-center gap-2.5 active:translate-y-[2px] active:shadow-[0_1px_0_#A9D1E5,0_3px_6px_rgba(7,45,89,0.06)] hover:brightness-102"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #EAF5FB 100%)',
                  border: '1.5px solid #BDDEEE',
                  boxShadow: '0 3px 0 #A9D1E5, 0 6px 14px rgba(7, 45, 89, 0.08), inset 0 1px 0 #FFFFFF',
                  color: '#072D59',
                }}
              >
                <FolderOpen className="w-4 h-4 shrink-0 text-[#FD6E8E]" strokeWidth={2.2} />
                <span className="font-bold text-xs leading-tight">Buka Peta Tersimpan</span>
              </button>

              <button
                type="button"
                onClick={handleOpenStandaloneCad}
                className="p-3 rounded-2xl text-left cursor-pointer transition-all flex items-center gap-2.5 active:translate-y-[2px] active:shadow-[0_1px_0_#A9D1E5,0_3px_6px_rgba(7,45,89,0.06)] hover:brightness-102"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #EAF5FB 100%)',
                  border: '1.5px solid #BDDEEE',
                  boxShadow: '0 3px 0 #A9D1E5, 0 6px 14px rgba(7, 45, 89, 0.08), inset 0 1px 0 #FFFFFF',
                  color: '#072D59',
                }}
              >
                <Compass className="w-4 h-4 shrink-0 text-[#FD6E8E]" strokeWidth={2.2} />
                <span className="font-bold text-xs leading-tight">Studio CAD Mandiri</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="p-3 rounded-2xl text-left cursor-pointer transition-all flex items-center gap-2.5 active:translate-y-[2px] active:shadow-[0_1px_0_#A9D1E5,0_3px_6px_rgba(7,45,89,0.06)] hover:brightness-102"
                style={{
                  background: 'linear-gradient(180deg, #FFFFFF 0%, #EAF5FB 100%)',
                  border: '1.5px solid #BDDEEE',
                  boxShadow: '0 3px 0 #A9D1E5, 0 6px 14px rgba(7, 45, 89, 0.08), inset 0 1px 0 #FFFFFF',
                  color: '#072D59',
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

            {/* Keterangan Kejujuran Penyimpanan Lokal */}
            <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-[#1E4673]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#072D59]" />
              <span>Penyimpanan lokal di perangkat Anda • Data tersimpan aman tanpa akun</span>
            </div>
          </div>
        </div>

        {/* 4. KOLOM KANAN: Karya Seni Vektor Isometrik Arsitektur 100% SVG Pastel */}
        <div className="lg:col-span-6 p-5 pl-0 hidden lg:flex items-stretch justify-center">
          <div
            className="w-full h-full rounded-[28px] overflow-hidden relative"
            style={{
              background: 'linear-gradient(145deg, #DBF2FC 0%, #EBF6FD 60%, #D2EDFA 100%)',
              border: '2px solid rgba(255, 255, 255, 0.85)',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.65), 0 16px 36px rgba(7, 45, 89, 0.12)',
            }}
          >
            <ArchitecturalVectorDiorama />
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
