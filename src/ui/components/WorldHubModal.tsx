import React, { useState, useEffect } from 'react';
import { useUIStore } from '../state/useUIStore';
import {
  Plus,
  Play,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  LogOut,
  User,
  Compass,
  FolderOpen,
  Route,
  Trees,
  Building2,
  MapPin,
  Upload
} from 'lucide-react';
import { IndexedDBStorage, SavedMapMeta } from '../../io/IndexedDBStorage';
import { GeoJSONImporter } from '../../io/GeoJSONImporter';

interface WorldHubModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const WorldHubModal: React.FC<WorldHubModalProps> = ({ isOpen = true, onClose }) => {
  const {
    isMapHubOpen,
    closeMapHub,
    loadMap,
    userEmail,
    logout,
    savedMapsList,
    refreshSavedMaps,
    isLoadingMap,
    loadingMapMessage,
  } = useUIStore();

  const [newCityName, setNewCityName] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    refreshSavedMaps();
  }, [refreshSavedMaps]);

  if (!isOpen && !isMapHubOpen) return null;

  const handleClose = () => {
    if (onClose) onClose();
    else closeMapHub();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { engine } = useUIStore.getState();
    if (!engine) return;

    try {
      setImportStatus('Menganalisis berkas peta...');
      const res = await GeoJSONImporter.importFromFile(file, engine);
      if (res.type === 'arscity') {
        setImportStatus(`Peta Proyek .arscity berhasil dimuat (${res.roadsCount} jalan, ${res.buildingsCount} gedung).`);
      } else {
        setImportStatus(`Fitur GeoJSON berhasil diimpor: +${res.roadsCount} ruas jalan, +${res.buildingsCount} gedung.`);
      }
      setTimeout(() => {
        setImportStatus(null);
        handleClose();
      }, 1600);
    } catch (err: any) {
      setImportStatus(`Gagal mengimpor: ${err?.message || 'Format berkas tidak valid'}`);
      setTimeout(() => setImportStatus(null), 3000);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleCreateEmptyMap = async () => {
    const name = newCityName.trim() || 'Lahan Baru';
    const res = await IndexedDBStorage.createNewEmptyMap(name);
    setIsCreatingNew(false);
    setNewCityName('');
    await loadMap('saved', res.id, name);
  };

  const handleLoadMalioboro = async () => {
    await loadMap('malioboro', 'malioboro_preset', 'Koridor Malioboro Yogyakarta');
  };

  const handleLoadSavedMap = async (map: SavedMapMeta) => {
    await loadMap('saved', map.id, map.name);
  };

  const handleDeleteSavedMap = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await IndexedDBStorage.deleteMapById(id);
    setDeleteConfirmId(null);
    await refreshSavedMaps();
  };

  const formatDate = (ts: number): string => {
    if (!ts) return 'Baru dibuat';
    const d = new Date(ts);
    return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div
      className="wh-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Peta atau Mulai Kota Baru"
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .wh-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background-color: rgba(9, 13, 22, 0.82);
          backdrop-filter: blur(28px) saturate(180%);
          -webkit-backdrop-filter: blur(28px) saturate(180%);
          box-sizing: border-box;
          font-family: var(--font-sans);
          user-select: none;
        }
        .wh-card-frame {
          position: relative;
          width: 100%;
          max-width: 1040px;
          max-height: 92vh;
          border-radius: 28px;
          overflow: hidden;
          background-color: #FFFFFF;
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: 0 25px 70px -15px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
        }
        .wh-mesh-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          border-radius: 28px;
        }
        .wh-mesh-peach {
          position: absolute;
          right: -100px;
          bottom: -100px;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(251, 146, 60, 0.38) 0%, rgba(254, 215, 170, 0.25) 45%, rgba(255, 255, 255, 0) 72%);
          filter: blur(32px);
        }
        .wh-mesh-slate {
          position: absolute;
          left: -100px;
          bottom: -100px;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(148, 163, 184, 0.35) 0%, rgba(203, 213, 225, 0.22) 45%, rgba(255, 255, 255, 0) 70%);
          filter: blur(32px);
        }
        .wh-mesh-amber-top {
          position: absolute;
          right: 80px;
          top: 10px;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 215, 170, 0.22) 0%, rgba(255, 255, 255, 0) 70%);
          filter: blur(28px);
        }
        .wh-header {
          position: relative;
          z-index: 10;
          padding: 16px 28px;
          border-bottom: 1px solid #F1F5F9;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          background-color: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .wh-logo-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .wh-logo-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background-color: #2563EB;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }
        .wh-body {
          position: relative;
          z-index: 10;
          padding: 20px 28px 24px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .wh-body::-webkit-scrollbar {
          width: 6px;
        }
        .wh-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .wh-body::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.35);
          border-radius: 9999px;
        }
        .wh-body::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.55);
        }
        .wh-section-title {
          font-size: 11px;
          font-weight: 700;
          color: #94A3B8;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 10px;
        }
        .wh-grid-duo {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 18px;
        }
        .wh-feature-card {
          position: relative;
          background-color: rgba(255, 255, 255, 0.94);
          border: 1px solid #E2E8F0;
          border-radius: 20px;
          padding: 20px 22px;
          box-shadow: 0 3px 12px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 215px;
          transition: all 180ms ease-out;
        }
        .wh-feature-card:hover {
          border-color: #CBD5E1;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
          transform: translateY(-2px);
        }
        .wh-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 500;
          color: #475569;
          background-color: #F8FAFC;
          border: 1px solid #E2E8F0;
          padding: 3px 9px;
          border-radius: 7px;
          font-variant-numeric: tabular-nums;
        }
        .wh-saved-card {
          background-color: rgba(255, 255, 255, 0.95);
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 14px 18px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          transition: all 150ms ease-out;
        }
        .wh-saved-card:hover {
          border-color: #94A3B8;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
          transform: translateY(-1px);
        }
        @media (max-width: 640px) {
          .wh-header { padding: 14px 18px; }
          .wh-body { padding: 16px; gap: 16px; }
          .wh-grid-duo { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Main Hub Card */}
      <div className="wh-card-frame">
        {/* Multi-Color Gradient Mesh Background Inside Card */}
        <div className="wh-mesh-bg">
          <div style={{ position: 'absolute', inset: 0, backgroundColor: '#FFFFFF' }} />
          <div className="wh-mesh-peach" />
          <div className="wh-mesh-slate" />
          <div className="wh-mesh-amber-top" />
        </div>

        {/* Header Section */}
        <div className="wh-header">
          <div className="wh-logo-wrap">
            <div className="wh-logo-icon">
              <Compass style={{ width: '20px', height: '20px' }} strokeWidth={2} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: '#111827' }}>
                  ARSCITY
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE' }}>
                  World Hub
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>
                Sandbox 3D Arsitektur Tropis &amp; Tata Kota Nusantara
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1D4ED8',
                cursor: 'pointer',
                transition: 'all 120ms ease',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.08)'
              }}
              title="Impor peta dari berkas .geojson atau proyek .arscity"
            >
              <Upload size={13} strokeWidth={2} />
              <span>Impor Peta .GeoJSON / .Arscity</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.arscity"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />

            {userEmail && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: '#1E293B',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                }}
              >
                <User size={13} style={{ color: '#2563EB' }} />
                <span>{userEmail}</span>
              </div>
            )}

            <button
              onClick={logout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                border: '1px solid #E2E8F0',
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748B',
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
              title="Keluar / Ganti Akun"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>

            <button
              onClick={handleClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#F1F5F9',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                cursor: 'pointer',
                transition: 'background-color 120ms ease',
              }}
              title="Tutup / Lanjutkan Sesi Permainan"
              aria-label="Tutup World Hub"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Import Status Alert Banner */}
        {importStatus && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: '#EFF6FF',
              borderBottom: '1px solid #DBEAFE',
              color: '#1E40AF',
              fontSize: '12.5px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Sparkles size={14} style={{ color: '#2563EB' }} />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="wh-body">
          {/* Section 1: PILIH KAWASAN PETA (Dua Kartu Harmonis) */}
          <div>
            <div className="wh-section-title">
              Pilih Kawasan Peta
            </div>

            <div className="wh-grid-duo">
              {/* Card A: Lahan Kosong Baru */}
              <div
                className="wh-feature-card"
                style={{
                  backgroundColor: '#FFFFFF',
                  backgroundImage: 'linear-gradient(to right, rgba(37, 99, 235, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.05) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: '1px solid #DBEAFE',
                      marginBottom: '14px',
                    }}
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    <span>KANVAS BARU • PROYEK BEBAS</span>
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '22px',
                      fontWeight: 600,
                      color: '#0F172A',
                      letterSpacing: '-0.02em',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Lahan Kosong Baru
                  </h3>

                  <p
                    style={{
                      fontSize: '12.5px',
                      color: '#64748B',
                      lineHeight: 1.45,
                      margin: '0 0 12px 0',
                    }}
                  >
                    Kanvas CAD steril berkoordinat kartesian 1600m × 1600m untuk eksplorasi perancangan tata ruang dan bangunan mandiri.
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    <span className="wh-chip">1600m × 1600m CAD</span>
                    <span className="wh-chip">Datum 0.0m DPL</span>
                    <span className="wh-chip">Bebas Zonasi</span>
                  </div>
                </div>

                {isCreatingNew ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input
                      type="text"
                      value={newCityName}
                      onChange={(e) => setNewCityName(e.target.value)}
                      placeholder="Nama Proyek (misal: Kawasan Hunian Asri)"
                      style={{
                        padding: '9px 14px',
                        borderRadius: '9999px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        fontSize: '12.5px',
                        color: '#0F172A',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={handleCreateEmptyMap}
                        style={{
                          flex: 1,
                          padding: '9px 16px',
                          borderRadius: '9999px',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Inisialisasi Lahan
                      </button>
                      <button
                        onClick={() => setIsCreatingNew(false)}
                        style={{
                          padding: '9px 16px',
                          borderRadius: '9999px',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          fontSize: '12px',
                          fontWeight: 500,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingNew(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '11px 22px',
                      borderRadius: '9999px',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Inisialisasi Peta Baru</span>
                  </button>
                )}
              </div>

              {/* Card B: Koridor Malioboro Yogyakarta (Featured Preset) */}
              <div
                className="wh-feature-card"
                style={{
                  backgroundColor: '#FFFFFF',
                  backgroundImage: 'linear-gradient(135deg, rgba(236, 253, 245, 0.55) 0%, rgba(255, 255, 255, 0.95) 100%)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      fontSize: '11px',
                      fontWeight: 600,
                      border: '1px solid #A7F3D0',
                      marginBottom: '14px',
                    }}
                  >
                    <Sparkles size={12} strokeWidth={2} />
                    <span>PRESET PROYEK • YOGYAKARTA</span>
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '22px',
                      fontWeight: 600,
                      color: '#0F172A',
                      letterSpacing: '-0.02em',
                      margin: '0 0 4px 0',
                    }}
                  >
                    Koridor Malioboro Yogyakarta
                  </h3>

                  <p
                    style={{
                      fontSize: '12.5px',
                      color: '#64748B',
                      lineHeight: 1.45,
                      margin: '0 0 12px 0',
                    }}
                  >
                    Rekonstruksi koridor cagar budaya Malioboro dengan deretan ruko arkade, Joglo Kepatihan, dan vegetasi peneduh tropis.
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                    <span className="wh-chip">
                      <MapPin size={12} strokeWidth={1.75} style={{ color: '#059669' }} />
                      <span>7°47&apos;44&quot; LS, 110°21&apos;57&quot; BT</span>
                    </span>
                    <span className="wh-chip">
                      <Building2 size={12} strokeWidth={1.75} style={{ color: '#059669' }} />
                      <span>20+ Ruko &amp; Cagar Budaya</span>
                    </span>
                    <span className="wh-chip">
                      <Trees size={12} strokeWidth={1.75} style={{ color: '#059669' }} />
                      <span>Joglo KDH &gt; 35%</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLoadMalioboro}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '11px 22px',
                    borderRadius: '9999px',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
                    transition: 'all 150ms ease',
                  }}
                >
                  <Play size={14} fill="currentColor" />
                  <span>Muat Malioboro</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: PETA TERSIMPAN SAYA (Koleksi Kota Pengguna) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div className="wh-section-title" style={{ marginBottom: 0 }}>
                Peta Tersimpan Saya
              </div>
              <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                {savedMapsList.length} Kota Terdata
              </span>
            </div>

            {savedMapsList.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(248, 250, 252, 0.65)',
                  border: '1px dashed #CBD5E1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#64748B',
                  fontSize: '13px',
                }}
              >
                <FolderOpen size={30} strokeWidth={1.5} style={{ color: '#94A3B8' }} />
                <span>Belum ada peta tersimpan. Mulai dari Lahan Kosong Baru atau coba Malioboro!</span>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: '16px',
                }}
              >
                {savedMapsList.map((map) => (
                  <div
                    key={map.id}
                    onClick={() => handleLoadSavedMap(map)}
                    className="wh-saved-card"
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <h4
                          style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#0F172A',
                          }}
                        >
                          {map.name}
                        </h4>
                        {deleteConfirmId === map.id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={(e) => handleDeleteSavedMap(map.id, e)}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: '#EF4444',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              title="Konfirmasi Hapus"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(null);
                              }}
                              style={{
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                borderRadius: '6px',
                                backgroundColor: '#F1F5F9',
                                color: '#475569',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(map.id);
                            }}
                            style={{
                              padding: '4px',
                              borderRadius: '6px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: '#94A3B8',
                              cursor: 'pointer',
                            }}
                            title="Hapus Peta"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: '#64748B',
                        }}
                      >
                        <Clock size={12} />
                        <span>{formatDate(map.updatedAt)}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#64748B' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Building2 size={12} strokeWidth={1.75} />
                          <span className="tabular-nums font-mono">{map.buildingCount}</span> gedung
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Route size={12} strokeWidth={1.75} />
                          <span className="tabular-nums font-mono">{map.roadCount}</span> ruas
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#2563EB',
                        }}
                      >
                        <span>Buka</span>
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoadingMap && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            backgroundColor: 'rgba(9, 13, 22, 0.78)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#2563EB',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: '-0.01em',
            }}
          >
            {loadingMapMessage}
          </div>
        </div>
      )}
    </div>
  );
};
