import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  FolderOpen,
  Upload,
  Volume2,
  VolumeX,
  ArrowRight,
  Crosshair,
  Train,
  CheckCircle2,
} from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
import { IndexedDBStorage, SavedMapMeta } from '../../io/IndexedDBStorage';
import { GeoJSONImporter } from '../../io/GeoJSONImporter';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { showSnackbar } from '../state/useSnackbarStore';

export interface LoginPageProps {
  onSuccess?: () => void;
}

export const ArchitecturalCityBackground: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => (
  <div {...props} style={{ pointerEvents: 'none', ...(props.style || {}) }} />
);

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const {
    loginAsGuest,
    openMapHub,
    loadMap,
    engine,
    openNewMapCustomizer,
  } = useUIStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [savedMaps, setSavedMaps] = useState<SavedMapMeta[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    IndexedDBStorage.listSavedMaps()
      .then((list) => {
        if (isMounted) setSavedMaps(list || []);
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
    if (savedMaps.length > 0) {
      await loadMap('saved', savedMaps[0].id, savedMaps[0].name);
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
          title: 'Berkas CAD Berhasil Diimpor',
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

  const latestCityName = savedMaps.length > 0 ? savedMaps[0].name : null;

  return (
    <main
      className="auth-root-container"
      aria-label="Gerbang Masuk Arscity - Rancang Kota Impian"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #DBF2FC 0%, #F4FAFF 50%, #DBF2FC 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        userSelect: 'none',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. Latar Belakang Luar Layar Penuh: Pola Garis Arsitektur Isometrik CAD Blueprint */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ opacity: 0.16 }}
      >
        <defs>
          <pattern id="isoBlueprintGrid" width="120" height="70" patternUnits="userSpaceOnUse">
            {/* Isometric 30-degree grid axes */}
            <path
              d="M 0 35 L 60 0 L 120 35 L 60 70 Z"
              fill="none"
              stroke="#072D59"
              strokeWidth="0.8"
              strokeDasharray="4 3"
            />
            <path
              d="M 60 0 L 60 70"
              fill="none"
              stroke="#072D59"
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />
            {/* Cadastral Lot Subdivisions */}
            <rect x="25" y="18" width="22" height="14" fill="none" stroke="#072D59" strokeWidth="0.6" />
            <rect x="73" y="38" width="22" height="14" fill="none" stroke="#072D59" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#isoBlueprintGrid)" />
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
          background: 'rgba(7, 45, 89, 0.90)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(219, 242, 252, 0.3)',
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

      {/* 2. Kartu Kaca Utama di Tengah Layar (Main Frosted Glass Container) */}
      <div
        className="relative z-10 w-full max-w-[1180px] min-h-[580px] max-h-[92vh] rounded-[36px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 shadow-2xl transition-all"
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'url(/assets/images/clean_hero_card.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '2px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 28px 70px rgba(7, 45, 89, 0.14), 0 4px 16px rgba(7, 45, 89, 0.06)',
        }}
      >
        {/* =========================================================================
            3. KOLOM KIRI (48% / 6 Kolom Grid): Logo, Judul 2 Warna, dan Tombol Aksi
            ========================================================================= */}
        <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-between z-20">
          <div>
            {/* Pojok Kiri Atas: Logo Pita Huruf "A" Vektor + Wordmark "ARSCITY" */}
            <div className="mb-8">
              <ArscityLogo size={34} showText={true} textColor="#072D59" />
            </div>

            {/* Judul Utama (Hero Heading) 2 Baris:
                Baris 1: "Rancang Kota Impian" (#072D59)
                Baris 2: "di " (#072D59) + "ARSCITY" (#FD6E8E) */}
            <h1
              className="font-extrabold tracking-tight leading-[1.12] mb-4"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 'clamp(34px, 3.8vw, 50px)',
                color: '#072D59',
              }}
            >
              Rancang Kota Impian <br />
              di <span style={{ color: '#FD6E8E' }}>ARSCITY</span>
            </h1>

            {/* Subjudul Singkat */}
            <p
              className="text-sm sm:text-base font-medium leading-relaxed max-w-md mb-8"
              style={{ color: 'rgba(7, 45, 89, 0.72)' }}
            >
              Simulasi arsitektur tropis, tata ruang kota, dan eksplorasi skala manusia.
            </p>

            {/* Tombol Utama (1 Simbol Saja): Crimson Pink (#FD6E8E) + Tepat SATU ArrowRight */}
            <div className="mb-9">
              <button
                type="button"
                onClick={handleStartPlay}
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-base tracking-wide text-white transition-all shadow-xl active:scale-95 hover:brightness-105"
                style={{
                  background: 'linear-gradient(135deg, #FD6E8E 0%, #E84D72 100%)',
                  boxShadow: '0 10px 25px rgba(253, 110, 142, 0.45)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <span>Mulai Rancang Kota</span>
                <ArrowRight className="w-5 h-5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Deretan Tombol Sekunder di Bawahnya: 3 Tombol Kapsul Seal Blue */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-6 border-t border-[rgba(7,45,89,0.12)]">
              {/* a. Lanjutkan Kota */}
              <button
                type="button"
                onClick={handleContinueLast}
                disabled={!latestCityName}
                className="p-3 rounded-2xl text-left transition-all flex flex-col justify-between hover:bg-white"
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(7, 45, 89, 0.14)',
                  boxShadow: '0 2px 6px rgba(7, 45, 89, 0.04)',
                  cursor: latestCityName ? 'pointer' : 'not-allowed',
                  opacity: latestCityName ? 1 : 0.65,
                }}
              >
                <div className="flex items-center gap-1.5 mb-1" style={{ color: '#072D59' }}>
                  <RotateCcw className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="font-bold text-xs">Lanjutkan Kota</span>
                </div>
                <div className="text-[11px] text-slate-600 truncate w-full font-medium">
                  {latestCityName || 'Belum ada'}
                </div>
              </button>

              {/* b. Perpustakaan Peta */}
              <button
                type="button"
                onClick={handleOpenLibrary}
                className="p-3 rounded-2xl text-left transition-all flex flex-col justify-between hover:bg-white"
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(7, 45, 89, 0.14)',
                  boxShadow: '0 2px 6px rgba(7, 45, 89, 0.04)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1" style={{ color: '#072D59' }}>
                  <FolderOpen className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="font-bold text-xs">Perpustakaan Peta</span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  Peta bawaan &amp; slot
                </div>
              </button>

              {/* c. Impor Berkas CAD */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="p-3 rounded-2xl text-left transition-all flex flex-col justify-between hover:bg-white"
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: '1px solid rgba(7, 45, 89, 0.14)',
                  boxShadow: '0 2px 6px rgba(7, 45, 89, 0.04)',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1" style={{ color: '#072D59' }}>
                  <Upload className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="font-bold text-xs">Impor Berkas CAD</span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  {isImporting ? 'Mengimpor...' : '.geojson / .arscity'}
                </div>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.arscity"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />

            {/* Offline Local Guarantee */}
            <div className="flex items-center gap-2 mt-4 text-[11px] text-slate-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Penyimpanan lokal di peramban Anda • Bebas akun &amp; data tersimpan aman</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. KOLOM KANAN (52% / 6 Kolom Grid): Diorama Kota Isometrik + Tugu Yogyakarta + LRT + Drone
            ========================================================================= */}
        <div className="lg:col-span-6 relative hidden lg:flex items-center justify-center overflow-hidden pointer-events-none">
          {/* Floating Animated Drone Indicator (Kanan Atas) */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '17%',
              right: '21%',
              animation: 'floatDrone 3.5s ease-in-out infinite',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                border: '1.5px dashed rgba(253, 110, 142, 0.75)',
                animation: 'spin 10s linear infinite',
              }}
            >
              <Crosshair className="w-4 h-4 text-[#FD6E8E]" />
            </div>
          </div>

          {/* Floating Live Telemetry Badge: Tugu Yogyakarta */}
          <div
            className="absolute px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-20 pointer-events-none"
            style={{
              bottom: '18%',
              left: '10%',
              background: 'rgba(7, 45, 89, 0.90)',
              border: '1px solid rgba(219, 242, 252, 0.3)',
              color: '#DBF2FC',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 22px rgba(7, 45, 89, 0.25)',
            }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FD6E8E' }} />
            <span className="text-[11px] font-bold tracking-tight">Tugu Pal Putih Yogyakarta</span>
          </div>

          {/* Floating Live Telemetry Badge: LRT Koridor Tropis */}
          <div
            className="absolute px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-20 pointer-events-none"
            style={{
              bottom: '8%',
              right: '12%',
              background: 'rgba(239, 248, 253, 0.94)',
              border: '1.5px solid #FD6E8E',
              color: '#072D59',
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 22px rgba(253, 110, 142, 0.25)',
            }}
          >
            <Train className="w-3.5 h-3.5 text-[#FD6E8E]" />
            <span className="text-[11px] font-bold tracking-tight">LRT Koridor Tropis</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatDrone {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(1.5deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
};

export default LoginPage;
