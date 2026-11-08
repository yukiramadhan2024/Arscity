import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../state/useUIStore';
import { ArscityLogo } from './ArscityLogo';
import {
  Upload,
  HardDrive,
  X,
  Sparkles,
  Plus,
  Play,
  MoreVertical,
  Edit2,
  Copy,
  Download,
  Trash2,
  FolderOpen
} from 'lucide-react';
import { IndexedDBStorage, SavedMapMeta } from '../../io/IndexedDBStorage';
import { GeoJSONImporter } from '../../io/GeoJSONImporter';
import { JsonExporter } from '../../io/JsonExporter';
import { GlassFolder, FolderFile } from '@/components/ui/glass-folder-cards';
import { useModalA11y } from '../hooks/useModalA11y';
import { showSnackbar } from '../state/useSnackbarStore';

interface WorldHubModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const WorldHubModal: React.FC<WorldHubModalProps> = ({ isOpen = true, onClose }) => {
  const uiStore = useUIStore();
  const state = typeof useUIStore.getState === 'function' ? useUIStore.getState() : uiStore;
  const isMapHubOpen = uiStore.isMapHubOpen ?? state.isMapHubOpen;
  const closeMapHub = uiStore.closeMapHub ?? state.closeMapHub;

  const handleDismiss = () => {
    if (onClose) onClose();
    else if (closeMapHub) closeMapHub();
  };

  const modalRef = useModalA11y(isOpen && isMapHubOpen !== false, handleDismiss);
  const loadMap = uiStore.loadMap ?? state.loadMap;
  const savedMapsList = uiStore.savedMapsList?.length ? uiStore.savedMapsList : (state.savedMapsList || []);
  const refreshSavedMaps = uiStore.refreshSavedMaps ?? state.refreshSavedMaps;
  const isLoadingMap = uiStore.isLoadingMap ?? state.isLoadingMap;
  const loadingMapMessage = uiStore.loadingMapMessage ?? state.loadingMapMessage;
  const engine = uiStore.engine ?? state.engine;
  const activeMapId = uiStore.activeMapId ?? state.activeMapId;
  const activeMapName = uiStore.activeMapName ?? state.activeMapName;
  const openNewMapCustomizer = uiStore.openNewMapCustomizer ?? state.openNewMapCustomizer;

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [activeMenuMapId, setActiveMenuMapId] = useState<string | null>(null);
  const [menuFlipUp, setMenuFlipUp] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!activeMenuMapId) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.wh-menu-popover') && !target.closest('.wh-menu-trigger')) {
        setActiveMenuMapId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuMapId]);

  const handleToggleMenu = (e: React.MouseEvent<HTMLButtonElement>, mapId: string) => {
    e.stopPropagation();
    if (activeMenuMapId === mapId) {
      setActiveMenuMapId(null);
      return;
    }

    const buttonRect = e.currentTarget.getBoundingClientRect();
    const modalBody = e.currentTarget.closest('.wh-body') || e.currentTarget.closest('.wh-modal-content');
    const containerBottom = modalBody ? modalBody.getBoundingClientRect().bottom : window.innerHeight;
    const spaceBelow = containerBottom - buttonRect.bottom;

    // Auto-flip upwards if remaining bottom space in modal is less than menu height (~160px)
    setMenuFlipUp(spaceBelow < 160);
    setActiveMenuMapId(mapId);
  };

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
        showSnackbar({
          variant: 'success',
          title: 'Peta Berhasil Dimuat',
          detail: `${res.roadsCount} Jalan • ${res.buildingsCount} Gedung`
        });
      } else {
        setImportStatus(`Fitur GeoJSON berhasil diimpor: +${res.roadsCount} ruas jalan, +${res.buildingsCount} gedung.`);
        showSnackbar({
          variant: 'success',
          title: 'Fitur GeoJSON Diimpor',
          detail: `+${res.roadsCount} Jalan • +${res.buildingsCount} Gedung`
        });
      }
      setTimeout(() => {
        setImportStatus(null);
        handleClose();
      }, 1600);
    } catch (err: any) {
      setImportStatus(`Gagal mengimpor: ${err?.message || 'Format berkas tidak valid'}`);
      showSnackbar({
        variant: 'warning',
        title: 'Gagal Mengimpor Peta',
        detail: err?.message || 'Format tidak valid'
      });
      setTimeout(() => setImportStatus(null), 3500);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleLoadMalioboro = async () => {
    await loadMap('malioboro', 'malioboro_preset', 'Koridor Malioboro Yogyakarta');
    showSnackbar({
      variant: 'success',
      title: 'Peta Malioboro Dimuat',
      detail: 'Koridor Cagar Budaya Yogyakarta'
    });
  };

  const handleLoadEmptyDirect = async () => {
    await loadMap('empty', 'empty_map', 'Lahan Kosong Standar');
    showSnackbar({
      variant: 'info',
      title: 'Lahan Kosong Siap',
      detail: 'Kanvas Baru Dimulai'
    });
  };

  const handleCreateNewCitySlot = async () => {
    const count = savedMapsList.length + 1;
    const defaultName = `Kota Tropis Baru ${count}`;
    const res = await IndexedDBStorage.createNewEmptyMap(defaultName);
    await refreshSavedMaps();
    await loadMap('saved', res.id, defaultName);
    showSnackbar({
      variant: 'success',
      title: 'Slot Kota Baru Dibuat',
      detail: defaultName
    });
  };

  const handleResumeLastCity = async () => {
    if (savedMapsList.length > 0) {
      const last = savedMapsList[0];
      await loadMap('saved', last.id, last.name);
      showSnackbar({
        variant: 'success',
        title: 'Melanjutkan Kota',
        detail: last.name
      });
    } else {
      await handleLoadMalioboro();
    }
  };

  const handleRenameCity = async (map: SavedMapMeta) => {
    const newName = window.prompt('Masukkan nama baru untuk kota:', map.name);
    if (!newName || newName.trim() === '' || newName === map.name) return;
    const data = await IndexedDBStorage.loadMapById(map.id);
    if (data) {
      data.cityTitle = newName.trim();
      await IndexedDBStorage.saveMapById(map.id, newName.trim(), data);
      await refreshSavedMaps();
      showSnackbar({
        variant: 'success',
        title: 'Nama Kota Diperbarui',
        detail: newName.trim()
      });
    }
    setActiveMenuMapId(null);
  };

  const handleDuplicateCity = async (map: SavedMapMeta) => {
    const data = await IndexedDBStorage.loadMapById(map.id);
    if (data) {
      const newId = `map_${Date.now()}`;
      const copyName = `${map.name} (Salinan)`;
      data.cityTitle = copyName;
      data.timestamp = Date.now();
      await IndexedDBStorage.saveMapById(newId, copyName, data);
      await refreshSavedMaps();
      showSnackbar({
        variant: 'success',
        title: 'Kota Berhasil Diduplikasi',
        detail: copyName
      });
    }
    setActiveMenuMapId(null);
  };

  const handleExportCity = async (map: SavedMapMeta) => {
    const data = await IndexedDBStorage.loadMapById(map.id);
    if (data) {
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = `${(data.cityTitle || map.name || 'arscity_proyek').toLowerCase().replace(/\s+/g, '_')}.arscity`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSnackbar({
        variant: 'info',
        title: 'Kota Berhasil Diekspor',
        detail: fileName
      });
    }
    setActiveMenuMapId(null);
  };

  const handleDeleteCity = async (map: SavedMapMeta) => {
    if (window.confirm(`Hapus kota "${map.name}" dari penyimpanan lokal?`)) {
      await IndexedDBStorage.deleteMapById(map.id);
      await refreshSavedMaps();
      showSnackbar({
        variant: 'warning',
        title: 'Kota Dihapus',
        detail: map.name
      });
    }
    setActiveMenuMapId(null);
  };

  const handleClearAllSavedMaps = async () => {
    if (typeof window !== 'undefined' && window.confirm('Hapus seluruh slot kota tersimpan dari memori lokal browser?')) {
      for (const m of savedMapsList) {
        await IndexedDBStorage.deleteMapById(m.id);
      }
      await refreshSavedMaps();
      showSnackbar({
        variant: 'warning',
        title: 'Memori Dibersihkan',
        detail: 'Seluruh slot kota lokal telah dihapus'
      });
    }
  };

  const handleExportActiveCity = async () => {
    const curEngine = engine || useUIStore.getState().engine;
    if (curEngine && curEngine.roadManager) {
      const fileName = `${(activeMapName || 'arscity_proyek').toLowerCase().replace(/\s+/g, '_')}.arscity`;
      JsonExporter.exportCityToJson(curEngine, fileName);
      setImportStatus(`Berkas ${fileName} berhasil diunduh.`);
      showSnackbar({
        variant: 'info',
        title: 'Kota Berhasil Diekspor',
        detail: fileName
      });
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
        showSnackbar({
          variant: 'info',
          title: 'Kota Berhasil Diekspor',
          detail: fileName
        });
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

  /* FOLDER 1: Peta Bawaan Nusantara */
  const folder1Files: FolderFile[] = [
    {
      id: 'preset-malioboro',
      name: 'Koridor Malioboro',
      meta: 'YOGYAKARTA · CAGAR BUDAYA',
      art: 'pastelNavy',
    },
    {
      id: 'preset-empty',
      name: 'Lahan Kosong Standar',
      meta: '1600×1600M · DATAR',
      art: 'pastelSeal',
    },
  ];

  /* FOLDER 2: Penyimpanan Kota Saya */
  const folder2Files: FolderFile[] =
    savedMapsList.length === 0
      ? [
          {
            id: 'new-city-placeholder',
            name: 'Kota Tropis Baru',
            meta: 'KLIK UNTUK MULAI',
            art: 'pastelSeal',
          },
        ]
      : savedMapsList.slice(0, 6).map((map, idx) => {
          const arts: ('pastelSeal' | 'pastelNavy' | 'pastelPink')[] = ['pastelSeal', 'pastelNavy', 'pastelPink'];
          return {
            id: map.id,
            name: map.name,
            meta: `${map.buildingCount} GEDUNG · ${formatDateShort(map.updatedAt)}`,
            art: arts[idx % 3],
            payload: map,
          };
        });

  /* FOLDER 3: Berkas Proyek & CAD */
  const folder3Files: FolderFile[] = [
    {
      id: 'action-import',
      name: 'Impor Berkas .Arscity / .GeoJSON',
      meta: 'BUKA DARI PERANGKAT',
      art: 'pastelNavy',
    },
    {
      id: 'action-export',
      name: 'Ekspor Kota Aktif (.Arscity)',
      meta: 'ARSIP LOKAL GZIP',
      art: 'pastelPink',
    },
    {
      id: 'action-clear',
      name: 'Kelola & Bersihkan Slot',
      meta: 'MANAJEMEN MEMORI',
      art: 'pastelSeal',
    },
  ];

  return (
    <div
      className="wh-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-label="Perpustakaan Kota Arscity"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
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
          padding: 20px;
          background-color: var(--scrim);
          backdrop-filter: blur(28px) saturate(160%);
          -webkit-backdrop-filter: blur(28px) saturate(160%);
          box-sizing: border-box;
          font-family: var(--font-sans, 'Space Grotesk', sans-serif);
          user-select: none;
        }
        .wh-card-frame {
          position: relative;
          width: 100%;
          max-width: 1120px;
          max-height: 90vh;
          border-radius: 28px;
          overflow: hidden;
          background: linear-gradient(145deg, #DBF2FC 0%, #EBF7FD 100%);
          border: 2px solid #072D59;
          box-shadow: 0 16px 40px rgba(7, 45, 89, 0.18);
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          color: #072D59;
        }
        .wh-header {
          position: relative;
          z-index: 10;
          padding: 18px 28px;
          border-bottom: 2px solid rgba(7, 45, 89, 0.20);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          background-color: #072D59;
          color: #DBF2FC;
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
          gap: 18px;
        }
        .wh-body::-webkit-scrollbar {
          width: 6px;
        }
        .wh-body::-webkit-scrollbar-thumb {
          background: rgba(7, 45, 89, 0.2);
          border-radius: 9999px;
        }
        .wh-quick-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 16px;
          background: #FFFFFF;
          border: 1.5px solid rgba(7, 45, 89, 0.14);
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(7, 45, 89, 0.06);
          color: #072D59;
        }
        .wh-folders-stage {
          position: relative;
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
          padding-top: 24px;
          padding-bottom: 16px;
          box-sizing: border-box;
        }
        @media (max-width: 1024px) {
          .wh-folders-stage {
            gap: 18px;
            padding-top: 20px;
          }
        }
        @media (max-width: 640px) {
          .wh-header { padding: 14px 18px; }
          .wh-body { padding: 12px 16px 20px; gap: 14px; }
          .wh-folders-stage { padding-top: 16px; gap: 14px; }
        }
      `}</style>

      {/* Main Library Frame */}
      <div ref={modalRef} className="wh-card-frame">
        {/* Header Section */}
        <div className="wh-header">
          <div className="wh-logo-wrap">
            <ArscityLogo size={38} iconOnly variant="dark" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.02em', color: '#DBF2FC' }}>
                  ARSCITY
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: '9999px',
                    backgroundColor: '#FD6E8E',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.02em',
                    boxShadow: 'none',
                  }}
                >
                  Penyimpanan Lokal
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(219, 242, 252, 0.78)', margin: '2px 0 0 0' }}>
                Perpustakaan Kota · Kota tersimpan di perangkat ini
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(219, 242, 252, 0.12)',
                border: '1px solid rgba(219, 242, 252, 0.25)',
                fontSize: '11.5px',
                fontWeight: 600,
                color: '#DBF2FC',
              }}
            >
              <HardDrive size={13} style={{ color: '#FD6E8E' }} />
              <span>{savedMapsList.length} Kota Tersimpan</span>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-3d-pastel-light"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
              title="Impor peta dari berkas .geojson atau proyek .arscity"
            >
              <Upload size={13} strokeWidth={2.2} style={{ color: '#FD6E8E' }} />
              <span>Impor Berkas</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.arscity"
              style={{ display: 'none' }}
              onChange={handleFileImport}
            />

            <button
              onClick={handleClose}
              className="btn-3d-pastel-pink"
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                cursor: 'pointer',
              }}
              title="Tutup Perpustakaan Kota"
              aria-label="Tutup Perpustakaan Kota"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Import Status Alert Banner */}
        {importStatus && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--surface-raised)',
              borderBottom: '1px solid var(--border)',
              color: 'var(--label)',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Sparkles size={14} style={{ color: 'var(--accent)' }} />
            <span>{importStatus}</span>
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="wh-body">
          {/* Quick Action Bar: Resume last / New City */}
          <div className="wh-quick-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {savedMapsList.length > 0
                  ? `Terakhir disunting: ${savedMapsList[0].name}`
                  : 'Belum ada kota kustom yang tersimpan'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {savedMapsList.length > 0 && (
                <button
                  onClick={handleResumeLastCity}
                  className="transition-all active:translate-x-[2px] active:translate-y-[3px] active:shadow-[1px_1px_0px_#072D59]"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    backgroundColor: '#FD6E8E',
                    border: '2px solid #072D59',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#072D59',
                    cursor: 'pointer',
                    boxShadow: '3px 4px 0px #072D59',
                  }}
                >
                  <Play size={12} fill="#072D59" stroke="#072D59" />
                  <span>Lanjutkan Kota Terakhir</span>
                </button>
              )}

              <button
                onClick={() => {
                  if (openNewMapCustomizer) openNewMapCustomizer();
                  else handleCreateNewCitySlot();
                }}
                className="transition-all active:translate-x-[2px] active:translate-y-[3px] active:shadow-[1px_1px_0px_#041B38]"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  backgroundColor: '#072D59',
                  border: '2px solid #041B38',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#DBF2FC',
                  cursor: 'pointer',
                  boxShadow: '3px 4px 0px #041B38',
                }}
              >
                <Plus size={13} strokeWidth={2.5} style={{ color: '#FD6E8E' }} />
                <span>+ Kota Baru</span>
              </button>
            </div>
          </div>

          {/* Barisan 3 Folder Kaca Interaktif */}
          <div className="wh-folders-stage">
            {/* Folder 1 (Kiri): Peta Bawaan Nusantara */}
            <GlassFolder
              label="Peta Bawaan Nusantara"
              art="pastelSeal"
              action="more"
              width={310}
              tone="light"
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
              art="pastelNavy"
              action="add"
              width={310}
              tone="light"
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
              art="pastelPink"
              action="more"
              labelPlacement="top-left"
              width={310}
              tone="light"
              files={folder3Files}
              onFileSelect={(file) => {
                if (file.id === 'action-import') {
                  fileInputRef.current?.click();
                } else if (file.id === 'action-export') {
                  handleExportActiveCity();
                } else if (file.id === 'action-clear') {
                  handleClearAllSavedMaps();
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

          {/* Detailed List of Saved Cities with Action Menu */}
          {savedMapsList.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--label-secondary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  paddingLeft: '4px'
                }}
              >
                Daftar Kota Tersimpan
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '10px'
                }}
              >
                {savedMapsList.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      boxShadow: 'var(--shadow-card)',
                      transition: 'border-color 150ms ease',
                    }}
                  >
                    <div
                      style={{ cursor: 'pointer', flex: 1, minWidth: 0, marginRight: '10px' }}
                      onClick={() => loadMap('saved', m.id, m.name)}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--label)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {m.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--label-secondary)', marginTop: '2px' }}>
                        {m.buildingCount} Gedung • {m.roadCount} Jalan • {formatDateShort(m.updatedAt)}
                      </div>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => loadMap('saved', m.id, m.name)}
                        className="transition-all active:translate-x-[1px] active:translate-y-[2px] active:shadow-[1px_1px_0px_#072D59]"
                        style={{
                          padding: '4px 12px',
                          borderRadius: '9999px',
                          background: '#FD6E8E',
                          border: '1.5px solid #072D59',
                          color: '#072D59',
                          boxShadow: '2px 2px 0px #072D59',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Buka
                      </button>

                      <button
                        className="wh-menu-trigger"
                        onClick={(e) => handleToggleMenu(e, m.id)}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: 'var(--fill-control)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'var(--label)'
                        }}
                        title="Opsi Kota"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {activeMenuMapId === m.id && (
                        <div
                          className="wh-menu-popover"
                          data-flipped={menuFlipUp ? 'up' : 'down'}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: menuFlipUp ? 'auto' : '34px',
                            bottom: menuFlipUp ? '34px' : 'auto',
                            background: 'var(--surface-raised)',
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-popover)',
                            padding: '4px',
                            zIndex: 30,
                            minWidth: '130px',
                            maxHeight: 'min(180px, calc(100vh - 100px))',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          <button
                            onClick={() => handleRenameCity(m)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'transparent',
                              border: 'none',
                              fontSize: '12px',
                              color: 'var(--label)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Edit2 size={12} />
                            <span>Ganti Nama</span>
                          </button>

                          <button
                            onClick={() => handleDuplicateCity(m)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'transparent',
                              border: 'none',
                              fontSize: '12px',
                              color: 'var(--label)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Copy size={12} />
                            <span>Duplikat</span>
                          </button>

                          <button
                            onClick={() => handleExportCity(m)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'transparent',
                              border: 'none',
                              fontSize: '12px',
                              color: 'var(--label)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Download size={12} />
                            <span>Ekspor (.arscity)</span>
                          </button>

                          <div style={{ height: '1px', background: 'var(--separator)', margin: '2px 0' }} />

                          <button
                            onClick={() => handleDeleteCity(m)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'transparent',
                              border: 'none',
                              fontSize: '12px',
                              color: 'var(--bad)',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
            backgroundColor: 'var(--scrim)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              borderRadius: '24px',
              padding: '28px 36px',
              boxShadow: 'var(--shadow-modal)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                border: '3px solid var(--accent-subtle)',
                borderTopColor: 'var(--accent)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--label)',
                letterSpacing: '-0.01em',
              }}
            >
              {loadingMapMessage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorldHubModal;
