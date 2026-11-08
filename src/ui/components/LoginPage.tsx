import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Upload,
  Volume2,
  VolumeX,
  ArrowRight,
  Compass,
  Play,
  RotateCcw,
  CheckCircle2,
  Sun,
  ShieldCheck,
  Waves,
  Building,
  Route,
  Calendar,
} from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
import { IndexedDBStorage, SavedMapMeta } from '../../io/IndexedDBStorage';
import { GeoJSONImporter } from '../../io/GeoJSONImporter';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { showSnackbar } from '../state/useSnackbarStore';
import { CitySaveData } from '../../io/CitySerializer';

export interface LoginPageProps {
  onSuccess?: () => void;
}

export const ArchitecturalCityBackground: React.FC<React.HTMLAttributes<HTMLDivElement>> = (props) => (
  <div {...props} style={{ pointerEvents: 'none', ...(props.style || {}) }} />
);

interface RealSavedCitySummary {
  id: string;
  name: string;
  buildingCount: number;
  roadLengthKm: number;
  updatedAtText: string;
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

function formatIndonesianNumber(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function formatIndonesianDateTime(dateInput: Date | number | string): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Baru saja';
    const day = d.getDate();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  } catch {
    return 'Baru saja';
  }
}

/**
 * LoginPage - Halaman Awal Arscity (Jujur, Jelas, & Berbasis Token Aplikasi)
 *
 * Sesuai spesifikasi desain:
 * - Menjelaskan fungsi nyata game untuk pemula tanpa jargon teknis
 * - Menampilkan visual nyata dari game sungguhan
 * - Satu identitas visual dengan token aplikasi (kaca terang, aksen biru sistem #007AFF)
 * - Kartu simpanan hanya muncul jika ada data simpanan nyata
 * - Tipografi natural Bahasa Indonesia
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
  const [realSavedCity, setRealSavedCity] = useState<RealSavedCitySummary | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    IndexedDBStorage.listSavedMaps()
      .then(async (list) => {
        if (!isMounted || !list || list.length === 0) {
          if (isMounted) setSavedMaps([]);
          return;
        }
        setSavedMaps(list);
        const latestMeta = list[0];
        const saveData = await IndexedDBStorage.loadMapById(latestMeta.id);
        if (!isMounted) return;

        if (saveData) {
          setRealSavedCity({
            id: latestMeta.id,
            name: saveData.cityTitle || latestMeta.name,
            buildingCount: (saveData.buildings?.length || 0) + (saveData.customBuildings?.length || 0),
            roadLengthKm: computeRoadLengthKmFromSave(saveData),
            updatedAtText: formatIndonesianDateTime(latestMeta.updatedAt || Date.now()),
          });
        } else {
          setRealSavedCity({
            id: latestMeta.id,
            name: latestMeta.name,
            buildingCount: latestMeta.buildingCount || 0,
            roadLengthKm: (latestMeta.roadCount || 0) * 0.06,
            updatedAtText: formatIndonesianDateTime(latestMeta.updatedAt || Date.now()),
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setSavedMaps([]);
          setRealSavedCity(null);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleStartNewCity = () => {
    proceduralAudio.playTaptic('medium');
    loginAsGuest();
    useUIStore.setState({ isMapHubOpen: false });
    openNewMapCustomizer();
    if (onSuccess) onSuccess();
  };

  const handleContinueSavedCity = async () => {
    if (!realSavedCity) return;
    proceduralAudio.playTaptic('medium');
    loginAsGuest();
    await loadMap('saved', realSavedCity.id, realSavedCity.name);
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
          title: 'Berkas Berhasil Dimuat',
          detail: `+${res.roadsCount} jalan • +${res.buildingsCount} bangunan`,
        });
      }
      useUIStore.setState({ currentScreen: 'game', isMapHubOpen: false });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showSnackbar({
        variant: 'warning',
        title: 'Gagal Memuat Berkas',
        detail: err?.message || 'Format berkas tidak sesuai',
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

  const hasRealSave = realSavedCity !== null;

  return (
    <main
      className="auth-root-container"
      aria-label="Halaman Awal Arscity"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        width: '100vw',
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'linear-gradient(180deg, #F5FAFD 0%, #E8F4F9 100%)',
        color: '#0A2E5B',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Tombol Kontrol Suara - Bergaya Tombol Kaca Bulat di Sudut Kanan Atas */}
      <div style={{ position: 'absolute', top: 20, right: 24, zIndex: 50 }}>
        <button
          type="button"
          onClick={toggleAudio}
          aria-label={isAudioMuted ? 'Suara mati' : 'Suara menyala'}
          title={isAudioMuted ? 'Suara mati (klik untuk menyalakan)' : 'Suara menyala (klik untuk mematikan)'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(10, 46, 91, 0.14)',
            boxShadow: '0 2px 8px rgba(10, 46, 91, 0.08)',
            color: '#0A2E5B',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, background 0.15s ease',
          }}
          className="hover:bg-white active:scale-95"
        >
          {isAudioMuted ? (
            <VolumeX size={18} strokeWidth={2} />
          ) : (
            <Volume2 size={18} strokeWidth={2} />
          )}
        </button>
      </div>

      {/* Konten Utama Terpusat & Responsif */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px 48px',
          boxSizing: 'border-box',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Header Logo */}
        <header style={{ marginBottom: 32 }}>
          <ArscityLogo size={36} variant="dark" />
        </header>

        {/* Bagian Hero: Kolom Teks di Kiri & Render Game Nyata di Kanan */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 40,
            alignItems: 'center',
            marginBottom: 48,
          }}
        >
          {/* Kolom Teks & Aksi */}
          <div style={{ maxWidth: 540 }}>
            <h1
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 600,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                color: '#0A2E5B',
                margin: '0 0 16px 0',
              }}
            >
              Belajar arsitektur dengan membangun kotamu sendiri.
            </h1>

            <p
              style={{
                fontSize: '17px',
                lineHeight: 1.6,
                color: '#3A4750',
                margin: '0 0 28px 0',
                maxWidth: '56ch',
              }}
            >
              Gambar jalan, rancang rumah, lalu lihat bagaimana matahari, hujan, dan aturan bangunan memengaruhinya. Tanpa akun, langsung di browser.
            </p>

            {/* Panel Aksi Utama & Aksi Kedua */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Jika Ada Simpanan Nyata: Kartu Lanjutkan Kota Terakhir menjadi Aksi Utama */}
              {hasRealSave && realSavedCity && (
                <button
                  type="button"
                  onClick={handleContinueSavedCity}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: 14,
                    background: '#007AFF',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 122, 255, 0.32)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                    textAlign: 'left',
                  }}
                  className="active:scale-[0.98] hover:bg-[#0069D9]"
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <RotateCcw size={14} strokeWidth={2.2} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>Lanjutkan Kota Terakhir</span>
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {realSavedCity.name}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 14,
                        fontSize: 12,
                        opacity: 0.9,
                        marginTop: 6,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Building size={13} />
                        {realSavedCity.buildingCount} bangunan
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Route size={13} />
                        {formatIndonesianNumber(realSavedCity.roadLengthKm)} km jalan
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={13} />
                        {realSavedCity.updatedAtText}
                      </span>
                    </div>
                  </div>
                  <div style={{ marginLeft: 16 }}>
                    <ArrowRight size={20} strokeWidth={2.4} />
                  </div>
                </button>
              )}

              {/* Tombol Mulai Bermain (Aksi Utama jika belum ada simpanan, atau aksi kedua jika sudah ada) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleStartNewCity}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: hasRealSave ? '11px 20px' : '14px 28px',
                    borderRadius: 12,
                    background: hasRealSave ? 'rgba(255, 255, 255, 0.85)' : '#007AFF',
                    color: hasRealSave ? '#0A2E5B' : '#FFFFFF',
                    border: hasRealSave ? '1px solid rgba(10, 46, 91, 0.16)' : 'none',
                    fontSize: hasRealSave ? 14 : 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: hasRealSave ? '0 2px 6px rgba(10, 46, 91, 0.06)' : '0 4px 14px rgba(0, 122, 255, 0.3)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  className="active:scale-[0.97] hover:brightness-105"
                >
                  <Play size={hasRealSave ? 15 : 18} fill={hasRealSave ? '#0A2E5B' : '#FFFFFF'} />
                  <span>Mulai Bermain</span>
                </button>

                {/* Aksi Kedua 1: Buka Kota Tersimpan */}
                <button
                  type="button"
                  onClick={handleOpenLibrary}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 18px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#0A2E5B',
                    border: '1px solid rgba(10, 46, 91, 0.16)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(10, 46, 91, 0.06)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  className="active:scale-[0.97] hover:bg-white"
                >
                  <FolderOpen size={16} strokeWidth={2} />
                  <span>Buka Kota Tersimpan</span>
                </button>

                {/* Aksi Kedua 2: Rancang Bangunan (Studio CAD) */}
                <button
                  type="button"
                  onClick={handleOpenStandaloneCad}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 18px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#0A2E5B',
                    border: '1px solid rgba(10, 46, 91, 0.16)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(10, 46, 91, 0.06)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  className="active:scale-[0.97] hover:bg-white"
                >
                  <Compass size={16} strokeWidth={2} />
                  <span>Rancang Bangunan</span>
                </button>

                {/* Aksi Kedua 3: Impor Berkas */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '11px 18px',
                    borderRadius: 12,
                    background: 'rgba(255, 255, 255, 0.85)',
                    color: '#0A2E5B',
                    border: '1px solid rgba(10, 46, 91, 0.16)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(10, 46, 91, 0.06)',
                    transition: 'transform 0.15s ease, background 0.15s ease',
                  }}
                  className="active:scale-[0.97] hover:bg-white"
                >
                  <Upload size={16} strokeWidth={2} />
                  <span>{isImporting ? 'Memuat...' : 'Impor Berkas'}</span>
                </button>
              </div>

              {/* Keterangan Penyimpanan Lokal yang Jujur & Manusiawi */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 13,
                  color: '#4A5568',
                  marginTop: 6,
                }}
              >
                <CheckCircle2 size={15} color="#007AFF" />
                <span>Kota tersimpan di perangkat ini. Tidak ada akun, tidak ada unggahan.</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.arscity"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />
          </div>

          {/* Kolom Visual: Tangkapan Layar Render Game Sungguhan */}
          <div>
            <div
              style={{
                borderRadius: 18,
                overflow: 'hidden',
                background: '#FFFFFF',
                border: '1px solid rgba(10, 46, 91, 0.12)',
                boxShadow: '0 16px 40px rgba(10, 46, 91, 0.1)',
              }}
            >
              <img
                src="/assets/images/game_hero_city.png"
                alt="Tangkapan layar game Arscity menampilkan kota bertekstur, jaringan jalan, dan bayangan sore"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  aspectRatio: '16 / 10',
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
                loading="eager"
              />
            </div>
            <p
              style={{
                fontSize: 13,
                color: '#556575',
                margin: '10px 0 0 4px',
                lineHeight: 1.4,
              }}
            >
              Simulasi tata kota nyata di Arscity: jaringan jalan, sempadan sungai, dan bayangan matahari sore.
            </p>
          </div>
        </section>

        {/* Bagian "Yang kamu pelajari" - Tiga Item Pendek Berilustrasi Nyata */}
        <section
          style={{
            borderTop: '1px solid rgba(10, 46, 91, 0.12)',
            paddingTop: 32,
            marginBottom: 36,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: '#556575',
              marginBottom: 16,
            }}
          >
            Yang dapat kamu pelajari
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {/* Item 1: Aturan Bangunan */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(12px)',
                borderRadius: 14,
                padding: 16,
                border: '1px solid rgba(10, 46, 91, 0.1)',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid rgba(10, 46, 91, 0.1)',
                  background: '#E2EEF4',
                }}
              >
                <img
                  src="/assets/images/feature_rules.png"
                  alt="Denah dan aturan bangunan"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ShieldCheck size={16} color="#007AFF" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0A2E5B' }}>Aturan Tata Ruang</span>
                </div>
                <p style={{ fontSize: 13, color: '#4A5568', margin: 0, lineHeight: 1.4 }}>
                  Aturan bangunan (KDB, GSB) dicek otomatis saat kamu mendirikan gedung.
                </p>
              </div>
            </div>

            {/* Item 2: Matahari & Iklim */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(12px)',
                borderRadius: 14,
                padding: 16,
                border: '1px solid rgba(10, 46, 91, 0.1)',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid rgba(10, 46, 91, 0.1)',
                  background: '#E2EEF4',
                }}
              >
                <img
                  src="/assets/images/feature_solar.png"
                  alt="Pencahayaan matahari dan interior"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Sun size={16} color="#007AFF" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0A2E5B' }}>Pencahayaan Alami</span>
                </div>
                <p style={{ fontSize: 13, color: '#4A5568', margin: 0, lineHeight: 1.4 }}>
                  Lihat bayangan matahari dan arah angin pada bangunanmu sepanjang hari.
                </p>
              </div>
            </div>

            {/* Item 3: Simulasi Lingkungan */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.75)',
                backdropFilter: 'blur(12px)',
                borderRadius: 14,
                padding: 16,
                border: '1px solid rgba(10, 46, 91, 0.1)',
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid rgba(10, 46, 91, 0.1)',
                  background: '#E2EEF4',
                }}
              >
                <img
                  src="/assets/images/feature_simulation.png"
                  alt="Persimpangan jalan dan uji infrastruktur"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Waves size={16} color="#007AFF" />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0A2E5B' }}>Uji Ketahanan</span>
                </div>
                <p style={{ fontSize: 13, color: '#4A5568', margin: 0, lineHeight: 1.4 }}>
                  Uji risiko banjir dari sempadan sungai serta kekuatan struktur bertingkat.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Kecil & Jujur */}
        <footer
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            paddingTop: 16,
            borderTop: '1px solid rgba(10, 46, 91, 0.08)',
            fontSize: 12,
            color: '#556575',
          }}
        >
          <div>
            <span>Arscity · Versi 4.0</span>
          </div>

          <div style={{ display: 'flex', gap: 18 }}>
            <button
              type="button"
              onClick={() => setShowLicenseModal(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#0A2E5B',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: 12,
              }}
            >
              Kredit &amp; Lisensi
            </button>
            <a
              href="https://github.com/yukiramadhan2024/Arscity"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#0A2E5B', textDecoration: 'underline' }}
            >
              Repositori GitHub
            </a>
          </div>
        </footer>
      </div>

      {/* Modal Sederhana Kredit & Lisensi */}
      {showLicenseModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Kredit dan Lisensi"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(7, 26, 56, 0.45)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowLicenseModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              maxWidth: 520,
              width: '100%',
              padding: 28,
              boxShadow: '0 20px 48px rgba(7, 26, 56, 0.25)',
              border: '1px solid rgba(10, 46, 91, 0.16)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px 0', color: '#0A2E5B' }}>
              Kredit &amp; Lisensi Terbuka
            </h2>
            <p style={{ fontSize: 14, color: '#3A4750', lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Arscity dibangun menggunakan teknologi web modern bebas ketergantungan jaringan luar. Seluruh tekstur arsitektur, tipografi, dan suara menggunakan lisensi terbuka publik (CC0, MIT, Apache 2.0, dan SIL Open Font License).
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowLicenseModal(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 10,
                  background: '#007AFF',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: 14,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default LoginPage;
