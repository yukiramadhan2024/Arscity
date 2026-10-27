import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, FolderOpen, BookOpen, Upload, Volume2, VolumeX, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
import { IndexedDBStorage, SavedMapMeta } from '../../io/IndexedDBStorage';
import { GeoJSONImporter } from '../../io/GeoJSONImporter';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { showSnackbar } from '../state/useSnackbarStore';

/**
 * ArchitecturalCityBackground
 * Clean architectural isometric contour and road lines without fake decorative numbers.
 */
export const ArchitecturalCityBackground: React.FC = () => {
  return (
    <svg
      className="auth-architectural-bg"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
      aria-hidden="true"
    >
      <defs>
        <pattern id="archIsoGrid" width="60" height="104" patternUnits="userSpaceOnUse">
          <path d="M 0 52 L 60 104 M 0 52 L 60 0 M 60 52 L 0 104 M 60 52 L 0 0" stroke="rgba(10, 132, 255, 0.04)" strokeWidth="0.8" />
          <line x1="0" y1="52" x2="60" y2="52" stroke="rgba(15, 23, 42, 0.03)" strokeWidth="0.6" />
        </pattern>
        <linearGradient id="bgSolarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.12" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* 1. Blueprint Isometric Grid */}
      <rect width="100%" height="100%" fill="url(#archIsoGrid)" />

      {/* 2. Topographic Elevation Contour Lines (No decorative numbers) */}
      <g stroke="rgba(15, 23, 42, 0.06)" strokeWidth="1" strokeLinecap="round">
        <path d="M -50 220 C 200 210, 420 280, 700 240 C 950 200, 1200 270, 1650 220" />
        <path d="M -50 340 C 220 310, 480 390, 780 330 C 1040 280, 1300 370, 1650 320" stroke="rgba(10, 132, 255, 0.08)" />
        <path d="M -50 460 C 240 430, 520 510, 840 440 C 1120 380, 1380 480, 1650 430" />
        <path d="M -50 580 C 260 540, 560 620, 900 550 C 1180 490, 1420 600, 1650 540" stroke="rgba(10, 132, 255, 0.08)" />
        <path d="M -50 720 C 300 680, 620 760, 960 670 C 1240 610, 1480 730, 1650 660" />
        <path d="M -50 850 C 340 810, 680 890, 1040 800 C 1300 730, 1520 860, 1650 790" stroke="rgba(10, 132, 255, 0.07)" />
      </g>

      {/* 3. Solar Path & Orientation Guide */}
      <g>
        <path
          d="M 120 880 C 350 420, 1150 280, 1520 780"
          stroke="url(#bgSolarGrad)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
        />
        <circle cx="1280" cy="220" r="140" stroke="rgba(10, 132, 255, 0.08)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="1280" cy="220" r="80" stroke="rgba(245, 158, 11, 0.12)" strokeWidth="1" />
        <line x1="1280" y1="60" x2="1280" y2="380" stroke="rgba(15, 23, 42, 0.06)" strokeWidth="0.8" />
        <line x1="1120" y1="220" x2="1440" y2="220" stroke="rgba(15, 23, 42, 0.06)" strokeWidth="0.8" />
      </g>

      {/* 4. Isometric Road Corridors */}
      <g stroke="rgba(15, 23, 42, 0.07)" strokeWidth="1.2">
        <line x1="-100" y1="750" x2="680" y2="300" strokeWidth="20" stroke="rgba(15, 23, 42, 0.02)" />
        <line x1="-100" y1="740" x2="680" y2="290" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="-100" y1="760" x2="680" y2="310" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="-100" y1="750" x2="680" y2="300" stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="8 8" strokeWidth="1" />

        <line x1="420" y1="120" x2="1350" y2="660" strokeWidth="20" stroke="rgba(15, 23, 42, 0.02)" />
        <line x1="420" y1="110" x2="1350" y2="650" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="420" y1="130" x2="1350" y2="670" stroke="rgba(10, 132, 255, 0.1)" strokeWidth="1.5" />
        <line x1="420" y1="120" x2="1350" y2="660" stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="8 8" strokeWidth="1" />
      </g>

      {/* 5. Isometric Tropical Joglo & Building Massing */}
      <g stroke="rgba(15, 23, 42, 0.07)" fill="rgba(255, 255, 255, 0.35)">
        <polygon points="180,620 230,590 280,620 230,650" stroke="rgba(10, 132, 255, 0.12)" strokeWidth="1.2" />
        <polygon points="205,605 230,575 255,605 230,620" fill="rgba(10, 132, 255, 0.04)" stroke="rgba(10, 132, 255, 0.15)" strokeWidth="1.4" />
        <polygon points="120,380 160,355 200,380 160,405" />
        <line x1="120" y1="380" x2="120" y2="480" />
        <line x1="160" y1="405" x2="160" y2="505" />
        <line x1="200" y1="380" x2="200" y2="480" />
        <polygon points="1320,440 1370,410 1420,440 1370,470" />
        <line x1="1320" y1="440" x2="1320" y2="600" />
        <line x1="1370" y1="470" x2="1370" y2="630" />
        <line x1="1420" y1="440" x2="1420" y2="600" />
      </g>
    </svg>
  );
};

export interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginAsGuest, openMapHub, loadMap, setShowTutorial, engine } = useUIStore();
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

  const handleStartPlay = async () => {
    proceduralAudio.playTaptic('medium');
    loginAsGuest();
    await loadMap('malioboro', 'malioboro_preset', 'Koridor Malioboro Yogyakarta');
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
    if (onSuccess) onSuccess();
  };

  const handleOpenLibrary = () => {
    proceduralAudio.playTaptic('light');
    loginAsGuest();
    openMapHub();
    if (onSuccess) onSuccess();
  };

  const handleOpenTutorial = async () => {
    proceduralAudio.playTaptic('light');
    loginAsGuest();
    await loadMap('malioboro', 'malioboro_preset', 'Koridor Malioboro Yogyakarta');
    setShowTutorial(true);
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
          title: 'Peta Berhasil Diimpor',
          detail: `+${res.roadsCount} Jalan • +${res.buildingsCount} Gedung`
        });
      }
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showSnackbar({
        variant: 'warning',
        title: 'Gagal Mengimpor',
        detail: err?.message || 'Format tidak valid'
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
      aria-label="Gerbang Masuk Arscity"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-auth, 70)' as any,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 45%, #F8FAFC 0%, #F1F5F9 52%, #E2E8F0 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        userSelect: 'none'
      }}
    >
      <ArchitecturalCityBackground />

      {/* Audio Mute/Unmute Indicator Button */}
      <button
        onClick={toggleAudio}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.90)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
          color: '#334155',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
        title={isAudioMuted ? 'Suara disenyapkan (Klik untuk mengaktifkan)' : 'Suara aktif (Klik untuk menyenyapkan)'}
        aria-label="Pengaturan Suara"
      >
        {isAudioMuted ? <VolumeX size={15} strokeWidth={1.75} /> : <Volume2 size={15} strokeWidth={1.75} />}
        <span>{isAudioMuted ? 'Senyap' : 'Suara Aktif'}</span>
      </button>

      {/* Main Liquid Glass Gateway Card */}
      <div
        className="auth-card-frame"
        style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          maxWidth: '560px',
          borderRadius: '28px',
          padding: '40px 36px',
          background: 'rgba(244, 247, 251, 0.95)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.14), 0 1px 3px rgba(15, 23, 42, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box'
        }}
      >
        {/* Logo Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            padding: '6px 18px 6px 10px',
            background: 'rgba(255, 255, 255, 0.85)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            borderRadius: '9999px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
          }}
        >
          <ArscityLogo size={32} showText={true} badge="STUDIO" textColor="#0F172A" />
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.03em',
            margin: '0 0 10px',
            lineHeight: 1.2
          }}
        >
          Selamat Datang di Arscity
        </h1>

        {/* Value Proposition Subhead (E4) */}
        <p
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#475569',
            lineHeight: 1.5,
            maxWidth: '440px',
            margin: '0 0 28px'
          }}
        >
          Belajar arsitektur dan tata kota tropis dengan membangun kota sendiri.
        </p>

        {/* Primary Action Button: Mulai Bermain (E2) */}
        <button
          onClick={handleStartPlay}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '16px 24px',
            borderRadius: '16px',
            background: '#007AFF',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            boxShadow: '0 8px 24px rgba(0, 122, 255, 0.32)',
            transition: 'all 160ms cubic-bezier(0.16, 1, 0.3, 1)',
            marginBottom: '14px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#0066D6';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#007AFF';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Play size={18} strokeWidth={2} fill="currentColor" />
          <span>Mulai Bermain</span>
          <ArrowRight size={16} strokeWidth={2} style={{ opacity: 0.85 }} />
        </button>

        {/* Secondary Actions Grid (2 columns) */}
        <div
          style={{
            width: '100%',
            maxWidth: '400px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '16px'
          }}
        >
          {/* Lanjutkan Kota Terakhir */}
          <button
            onClick={handleContinueLast}
            disabled={!latestCityName}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: latestCityName ? '#0F172A' : '#94A3B8',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: latestCityName ? 'pointer' : 'not-allowed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              textAlign: 'left',
              transition: 'all 140ms ease',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
            title={latestCityName ? `Lanjutkan: ${latestCityName}` : 'Belum ada kota tersimpan'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: latestCityName ? '#007AFF' : '#94A3B8' }}>
              <RotateCcw size={14} strokeWidth={1.75} />
              <span>Lanjutkan Kota</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
              {latestCityName || 'Belum ada simpanan'}
            </span>
          </button>

          {/* Perpustakaan Kota */}
          <button
            onClick={handleOpenLibrary}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              textAlign: 'left',
              transition: 'all 140ms ease',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#007AFF' }}>
              <FolderOpen size={14} strokeWidth={1.75} />
              <span>Perpustakaan</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748B' }}>
              Peta bawaan & simpanan
            </span>
          </button>

          {/* Buka Tutorial */}
          <button
            onClick={handleOpenTutorial}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              textAlign: 'left',
              transition: 'all 140ms ease',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#007AFF' }}>
              <BookOpen size={14} strokeWidth={1.75} />
              <span>Panduan Tutorial</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748B' }}>
              Pelajari dasar tata kota
            </span>
          </button>

          {/* Impor Berkas */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '4px',
              textAlign: 'left',
              transition: 'all 140ms ease',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#007AFF' }}>
              <Upload size={14} strokeWidth={1.75} />
              <span>Impor Berkas</span>
            </div>
            <span style={{ fontSize: '10.5px', color: '#64748B' }}>
              .arscity / .geojson
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

        {/* Footer info: Local storage only */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#64748B',
            marginTop: '8px'
          }}
        >
          <CheckCircle2 size={13} strokeWidth={1.75} style={{ color: '#16A34A' }} />
          <span>Tersimpan di perangkat ini • Tanpa akun atau pelacak daring</span>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
