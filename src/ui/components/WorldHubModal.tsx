import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
import {
  Upload,
  User,
  LogOut,
  X,
  Sparkles,
  Trash2,
  Clock,
  Building2,
  Route,
  ArrowRight,
  FolderOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { IndexedDBStorage, SavedMapMeta } from '../../io/IndexedDBStorage';
import { GeoJSONImporter } from '../../io/GeoJSONImporter';
import { JsonExporter } from '../../io/JsonExporter';
import { GlassFolder, FolderFile } from '@/components/ui/glass-folder-cards';

interface WorldHubModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const WorldHubModal: React.FC<WorldHubModalProps> = ({ isOpen = true, onClose }) => {
  const uiStore = useUIStore();
  // Safe SSR/Hydration fallback for test and headless environments
  const state = typeof useUIStore.getState === 'function' ? useUIStore.getState() : uiStore;
  const isMapHubOpen = uiStore.isMapHubOpen ?? state.isMapHubOpen;
  const closeMapHub = uiStore.closeMapHub ?? state.closeMapHub;
  const loadMap = uiStore.loadMap ?? state.loadMap;
  const userEmail = uiStore.userEmail ?? state.userEmail;
  const logout = uiStore.logout ?? state.logout;
  const savedMapsList = uiStore.savedMapsList?.length ? uiStore.savedMapsList : (state.savedMapsList || []);
  const refreshSavedMaps = uiStore.refreshSavedMaps ?? state.refreshSavedMaps;
  const isLoadingMap = uiStore.isLoadingMap ?? state.isLoadingMap;
  const loadingMapMessage = uiStore.loadingMapMessage ?? state.loadingMapMessage;
  const engine = uiStore.engine ?? state.engine;
  const activeMapId = uiStore.activeMapId ?? state.activeMapId;
  const activeMapName = uiStore.activeMapName ?? state.activeMapName;
  const resolvedTheme = (uiStore.resolvedTheme ?? state.resolvedTheme ?? 'dark') as 'light' | 'dark';

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSlotListExpanded, setIsSlotListExpanded] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    const currentEngine = engine || useUIStore.getState().engine;
    if (!currentEngine) {
      setImportStatus('Kanvas 3D belum siap. Memulai kanvas standar...');
      await loadMap('empty', 'empty_map', 'Kanvas Impor');
    }

    try {
      setImportStatus('Menganalisis berkas peta...');
      const targetEngine = engine || useUIStore.getState().engine;
      if (!targetEngine) throw new Error('Engine tidak tersedia.');

      const res = await GeoJSONImporter.importFromFile(file, targetEngine);
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
      setTimeout(() => setImportStatus(null), 3500);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleLoadMalioboro = async () => {
    await loadMap('malioboro', 'malioboro_preset', 'Koridor Malioboro Yogyakarta');
  };

  const handleLoadEmptyDirect = async () => {
    await loadMap('empty', 'empty_map', 'Lahan Kosong Standar');
  };

  const handleCreateNewCitySlot = async () => {
    const count = savedMapsList.length + 1;
    const defaultName = `Kota Tropis Baru ${count}`;
    const res = await IndexedDBStorage.createNewEmptyMap(defaultName);
    await refreshSavedMaps();
    await loadMap('saved', res.id, defaultName);
  };

  const handleLoadSavedMap = async (map: SavedMapMeta) => {
    await loadMap('saved', map.id, map.name);
  };

  const handleDeleteSavedMap = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await IndexedDBStorage.deleteMapById(id);
    setDeleteConfirmId(null);
    await refreshSavedMaps();
  };

  const handleClearAllSavedMaps = async () => {
    if (typeof window !== 'undefined' && window.confirm('Hapus seluruh slot kota tersimpan dari memori lokal IndexedDB?')) {
      for (const m of savedMapsList) {
        await IndexedDBStorage.deleteMapById(m.id);
      }
      await refreshSavedMaps();
    }
  };

  const handleExportActiveCity = async () => {
    const curEngine = engine || useUIStore.getState().engine;
    if (curEngine && curEngine.roadManager) {
      const fileName = `${(activeMapName || 'arscity_proyek').toLowerCase().replace(/\s+/g, '_')}.arscity`;
      JsonExporter.exportCityToJson(curEngine, fileName);
      setImportStatus(`Berkas ${fileName} berhasil diunduh.`);
      setTimeout(() => setImportStatus(null), 2500);
      return;
    }

    if (activeMapId) {
      const data = await IndexedDBStorage.loadMapById(activeMapId);
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const fileName = `${(data.cityTitle || 'arscity_proyek').toLowerCase().replace(/\s+/g, '_')}.arscity`;
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setImportStatus(`Berkas ${fileName} berhasil diunduh.`);
        setTimeout(() => setImportStatus(null), 2500);
        return;
      }
    }

    setImportStatus('Belum ada kota aktif yang siap diekspor. Muat peta terlebih dahulu.');
    setTimeout(() => setImportStatus(null), 2500);
  };

  const formatDateShort = (ts: number): string => {
    if (!ts) return 'BARU DIBUAT';
    const d = new Date(ts);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} · ${timeStr}`;
  };

  /* =========================================================================
     FOLDER 1: Peta Bawaan Nusantara & Malioboro
     ========================================================================= */
  const folder1Files: FolderFile[] = [
    {
      id: 'preset-malioboro',
      name: 'Koridor Malioboro',
      meta: 'YOGYAKARTA · CAGAR BUDAYA',
      art: 'ember',
    },
    {
      id: 'preset-empty',
      name: 'Lahan Kosong Standar',
      meta: '1600×1600M · DATAR',
      art: 'glacier',
    },
  ];

  /* =========================================================================
     FOLDER 2: Penyimpanan Kota Saya (IndexedDB)
     ========================================================================= */
  const folder2Files: FolderFile[] =
    savedMapsList.length === 0
      ? [
          {
            id: 'new-city-placeholder',
            name: 'Kota Tropis Baru',
            meta: 'KLIK UNTUK MULAI',
            art: 'glacier',
          },
        ]
      : savedMapsList.slice(0, 5).map((map, idx) => {
          const arts: ('dusk' | 'aurora' | 'verdant')[] = ['dusk', 'aurora', 'verdant'];
          return {
            id: map.id,
            name: map.name,
            meta: `${map.buildingCount} GEDUNG · ${formatDateShort(map.updatedAt)}`,
            art: arts[idx % 3],
            payload: map,
          };
        });

  /* =========================================================================
     FOLDER 3: Berkas Proyek & CAD
     ========================================================================= */
  const folder3Files: FolderFile[] = [
    {
      id: 'action-import',
      name: 'Impor Berkas .Arscity / .GeoJSON',
      meta: 'BUKA DARI PERANGKAT',
      art: 'dusk',
    },
    {
      id: 'action-export',
      name: 'Ekspor Kota Aktif (.Arscity)',
      meta: 'ARSIP LOKAL GZIP',
      art: 'verdant',
    },
    {
      id: 'action-clear',
      name: 'Kelola & Bersihkan Slot',
      meta: 'MANAJEMEN MEMORI',
      art: 'ember',
    },
  ];

  return (
    <div
      className="wh-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-label="Pusat Penyimpanan & Dunia Arscity"
    >
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .wh-overlay {
          position: fixed;
          inset: 0;
          z-index: var(--z-auth, 70);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background-color: var(--overlay, rgba(9, 13, 22, 0.8));
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          box-sizing: border-box;
          font-family: var(--font-sans, 'Inter', sans-serif);
          user-select: none;
        }
        .wh-card-frame {
          position: relative;
          width: 100%;
          max-width: 1140px;
          max-height: 94vh;
          border-radius: 28px;
          overflow: hidden;
          background: ${resolvedTheme === 'light' ? 'rgba(240, 246, 252, 0.88)' : 'rgba(15, 23, 42, 0.88)'};
          backdrop-filter: blur(32px) saturate(180%);
          -webkit-backdrop-filter: blur(32px) saturate(180%);
          border: 1.5px solid ${resolvedTheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.16)'};
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          color: var(--label, #F8FAFC);
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
          background: radial-gradient(circle, rgba(251, 146, 60, 0.28) 0%, rgba(254, 215, 170, 0.15) 45%, rgba(255, 255, 255, 0) 72%);
          filter: blur(36px);
          opacity: 0.25;
        }
        .wh-mesh-slate {
          position: absolute;
          left: -100px;
          bottom: -100px;
          width: 480px;
          height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(148, 163, 184, 0.25) 0%, rgba(203, 213, 225, 0.15) 45%, rgba(255, 255, 255, 0) 70%);
          filter: blur(36px);
          opacity: 0.2;
        }
        .wh-mesh-amber-top {
          position: absolute;
          right: 80px;
          top: 10px;
          width: 320px;
          height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(254, 215, 170, 0.18) 0%, rgba(255, 255, 255, 0) 70%);
          filter: blur(32px);
          opacity: 0.22;
        }
        .wh-header {
          position: relative;
          z-index: 10;
          padding: 16px 28px;
          border-bottom: 1px solid ${resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'};
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          background-color: ${resolvedTheme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(30, 41, 59, 0.85)'};
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .wh-logo-wrap {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .wh-body {
          position: relative;
          z-index: 10;
          padding: 16px 28px 24px;
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
          background: var(--separator, rgba(255, 255, 255, 0.15));
          border-radius: 9999px;
        }
        .wh-folders-stage {
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 28px;
          flex-wrap: wrap;
          padding-top: 64px; /* Headroom agar kartu terangkat bebas dan tidak terpotong */
          padding-bottom: 24px;
          box-sizing: border-box;
        }
        .wh-hint-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px 18px;
          border-radius: 12px;
          background: ${resolvedTheme === 'light' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(30, 41, 59, 0.6)'};
          border: 1px solid ${resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'};
          font-family: var(--font-mono, monospace);
          font-variant-numeric: tabular-nums;
          font-size: 11px;
          font-weight: 600;
          color: var(--label-secondary, #94a3b8);
          letter-spacing: 0.04em;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .wh-slots-drawer {
          border-radius: 18px;
          background: ${resolvedTheme === 'light' ? 'rgba(255, 255, 255, 0.72)' : 'rgba(30, 41, 59, 0.65)'};
          border: 1px solid ${resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)'};
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }
        .wh-slot-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 12px;
          background: ${resolvedTheme === 'light' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.7)'};
          border: 1px solid ${resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)'};
          cursor: pointer;
          transition: border-color 150ms ease, transform 150ms ease;
        }
        .wh-slot-item:hover {
          border-color: var(--accent, #0a84ff);
          transform: translateY(-1px);
        }
        @media (max-width: 1024px) {
          .wh-folders-stage {
            gap: 20px;
            padding-top: 120px;
          }
        }
        @media (max-width: 640px) {
          .wh-header { padding: 14px 18px; }
          .wh-body { padding: 12px 16px 20px; gap: 16px; }
          .wh-folders-stage { padding-top: 110px; gap: 16px; }
        }
      `}</style>

      {/* Main Hub Frame */}
      <div className="wh-card-frame">
        {/* Multi-Color Gradient Mesh Background */}
        <div className="wh-mesh-bg">
          <div style={{ position: 'absolute', inset: 0 }} />
          <div className="wh-mesh-peach" />
          <div className="wh-mesh-slate" />
          <div className="wh-mesh-amber-top" />
        </div>

        {/* Header Section */}
        <div className="wh-header">
          <div className="wh-logo-wrap">
            <ArscityLogo size={36} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--label, #F8FAFC)' }}>
                  ARSCITY
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(10, 132, 255, 0.15)',
                    color: 'var(--accent, #0a84ff)',
                    border: '1px solid rgba(10, 132, 255, 0.3)',
                  }}
                >
                  World Hub
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--label-secondary, #94A3B8)', margin: '2px 0 0 0' }}>
                Pusat Penyimpanan &amp; Dunia Arscity
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
                backgroundColor: 'var(--fill-control, rgba(255, 255, 255, 0.1))',
                border: '1px solid var(--hairline, rgba(255, 255, 255, 0.16))',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--label, #F8FAFC)',
                cursor: 'pointer',
                transition: 'all 120ms ease',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
              }}
              title="Impor peta dari berkas .geojson atau proyek .arscity"
            >
              <Upload size={13} strokeWidth={2} style={{ color: 'var(--accent, #0a84ff)' }} />
              <span>Impor .GeoJSON / .Arscity</span>
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
                  backgroundColor: 'var(--fill-control, rgba(255, 255, 255, 0.1))',
                  border: '1px solid var(--hairline, rgba(255, 255, 255, 0.16))',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--label, #F8FAFC)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                }}
              >
                <User size={13} style={{ color: 'var(--accent, #0a84ff)' }} />
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
                border: '1px solid var(--hairline, rgba(255, 255, 255, 0.14))',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--label-secondary, #94A3B8)',
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
                backgroundColor: 'var(--fill-control, rgba(255, 255, 255, 0.1))',
                border: '1px solid var(--hairline, rgba(255, 255, 255, 0.16))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--label, #F8FAFC)',
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

        {/* Subtitle / Description Banner */}
        <div
          style={{
            padding: '10px 28px',
            backgroundColor: resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.04)',
            borderBottom: `1px solid ${resolvedTheme === 'light' ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'}`,
            fontSize: '12.5px',
            color: 'var(--label-secondary, #94A3B8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Pilih folder dunia untuk membuka lembar peta, atau tekan tombol (+) pada folder untuk menambah kota baru</span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono, monospace)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
            }}
          >
            {savedMapsList.length} KOTA TERSIMPAN
          </span>
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
              gap: '8px',
            }}
          >
            <Sparkles size={14} style={{ color: '#2563EB' }} />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="wh-body">
          {/* Barisan 3 Folder Kaca Interaktif (3D GlassFolder Grid) */}
          <div className="wh-folders-stage">
            {/* Folder 1 (Kiri): Peta Bawaan Nusantara */}
            <GlassFolder
              label="Peta Bawaan Nusantara"
              art="verdant"
              action="more"
              width={310}
              tone={resolvedTheme}
              files={folder1Files}
              onFileSelect={(file) => {
                if (file.id === 'preset-malioboro') {
                  handleLoadMalioboro();
                } else if (file.id === 'preset-empty') {
                  handleLoadEmptyDirect();
                }
              }}
              menu={[
                {
                  label: 'Muat Ulang Koridor Malioboro',
                  onSelect: handleLoadMalioboro,
                  onClick: handleLoadMalioboro,
                },
                {
                  label: 'Buka Kanvas Kosong',
                  onSelect: handleLoadEmptyDirect,
                  onClick: handleLoadEmptyDirect,
                },
              ]}
            />

            {/* Folder 2 (Tengah): Penyimpanan Kota Saya */}
            <GlassFolder
              label="Penyimpanan Kota Saya"
              art="aurora"
              action="add"
              width={310}
              tone={resolvedTheme}
              files={folder2Files}
              onAdd={handleCreateNewCitySlot}
              onFileSelect={(file) => {
                if (file.id === 'new-city-placeholder') {
                  handleCreateNewCitySlot();
                } else if (file.id) {
                  loadMap('saved', file.id, file.name);
                }
              }}
            />

            {/* Folder 3 (Kanan): Berkas Proyek & CAD */}
            <GlassFolder
              label="Berkas Proyek & CAD"
              art="glacier"
              action="more"
              labelPlacement="top-left"
              width={310}
              tone={resolvedTheme}
              files={folder3Files}
              onFileSelect={(file) => {
                if (file.id === 'action-import') {
                  fileInputRef.current?.click();
                } else if (file.id === 'action-export') {
                  handleExportActiveCity();
                } else if (file.id === 'action-clear') {
                  setIsSlotListExpanded((prev) => !prev);
                }
              }}
              menu={[
                {
                  label: 'Impor Berkas Peta...',
                  onSelect: () => fileInputRef.current?.click(),
                  onClick: () => fileInputRef.current?.click(),
                },
                {
                  label: 'Simpan Cadangan Kota Saat Ini',
                  onSelect: handleExportActiveCity,
                  onClick: handleExportActiveCity,
                },
                {
                  label: 'Hapus Semua Simpanan Lama',
                  danger: true,
                  onSelect: handleClearAllSavedMaps,
                  onClick: handleClearAllSavedMaps,
                },
              ]}
            />
          </div>

          {/* Baris Petunjuk Interaksi Monospasi di Bawah Folder */}
          <div className="wh-hint-bar">
            ARAHKAN KURSOR UNTUK MENGINTIP · KLIK FOLDER UNTUK MEMBUKA · KLIK LEMBAR PETA UNTUK MASUK · TEKAN (+) UNTUK DUNIA BARU
          </div>

          {/* Pengelolaan Slot Simpanan (> 4 slot atau saat diklik) */}
          {savedMapsList.length > 0 && (
            <div className="wh-slots-drawer">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => setIsSlotListExpanded((prev) => !prev)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FolderOpen size={16} style={{ color: 'var(--accent, #0a84ff)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label, #F8FAFC)' }}>
                    Manajemen Seluruh Slot Kota ({savedMapsList.length} Tersimpan)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--label-secondary, #94A3B8)' }}>
                  <span>{isSlotListExpanded ? 'Sembunyikan Daftar' : 'Tampilkan Daftar'}</span>
                  {isSlotListExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </div>
              </div>

              {isSlotListExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {savedMapsList.map((map) => (
                    <div
                      key={map.id}
                      className="wh-slot-item"
                      onClick={() => handleLoadSavedMap(map)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--label, #F8FAFC)' }}>
                          {map.name}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontVariantNumeric: 'tabular-nums',
                            color: 'var(--label-secondary, #94A3B8)',
                          }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} />
                            {formatDateShort(map.updatedAt)}
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={11} />
                            {map.buildingCount} Gedung
                          </span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Route size={11} />
                            {map.roadCount} Ruas
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {deleteConfirmId === map.id ? (
                          <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteSavedMap(map.id)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: 'var(--bad, #EF4444)',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 500,
                                borderRadius: '6px',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                color: 'var(--label-secondary, #94A3B8)',
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
                              padding: '6px',
                              borderRadius: '6px',
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--label-tertiary, #94A3B8)',
                              cursor: 'pointer',
                            }}
                            title="Hapus Slot Peta"
                            aria-label={`Hapus ${map.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--accent, #0a84ff)',
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
          )}
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

export default WorldHubModal;
