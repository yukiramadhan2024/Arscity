import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import {
  HardDrive,
  Camera,
  Settings,
  HelpCircle,
  Share2,
  FolderOpen,
  LogOut,
  DraftingCompass,
  Layers,
  ChevronRight,
  ChevronLeft,
  Home
} from 'lucide-react';
import { CitySerializer } from '../../io/CitySerializer';
import { IndexedDBStorage } from '../../io/IndexedDBStorage';
import { ArscityLogo } from './ArscityLogo';
import { proceduralAudio } from '../../audio/ProceduralAudio';

interface SideUtilityDockProps {
  onOpenHelp?: () => void;
}

export const SideUtilityDock: React.FC<SideUtilityDockProps> = React.memo(({ onOpenHelp }) => {
  const engine = useUIStore((s) => s.engine);
  const activeMapName = useUIStore((s) => s.activeMapName);
  const openMapHub = useUIStore((s) => s.openMapHub);
  const logout = useUIStore((s) => s.logout);
  const setShowSaveLoad = useUIStore((s) => s.setShowSaveLoad);
  const setShowSettings = useUIStore((s) => s.setShowSettings);
  const setCustomBuildingModalOpen = useUIStore((s) => s.setCustomBuildingModalOpen);
  const setIsPhotoMode = useUIStore((s) => s.setIsPhotoMode);
  const setShowRealWorldExport = useUIStore((s) => s.setShowRealWorldExport);
  const showLotOverlays = useUIStore((s) => s.showLotOverlays);
  const toggleShowLotOverlays = useUIStore((s) => s.toggleShowLotOverlays);
  const activeTool = useUIStore((s) => s.activeTool);

  const isExpanded = useUIStore((s) => s.isSideDockExpanded);
  const setIsExpanded = useUIStore((s) => s.setIsSideDockExpanded);
  const canUndo = useUIStore((s) => s.canUndo);
  const activeCityId = useUIStore((s) => s.activeCityId);
  const hasUnsavedChanges = useUIStore((s) => s.hasUnsavedChanges);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);

  // Auto-collapse when Analysis is active so there's zero overlap
  React.useEffect(() => {
    if (activeTool === 'analyze') {
      setIsExpanded(false);
    }
  }, [activeTool, setIsExpanded]);

  // B6: Global hotkey [ to toggle collapse/expand
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '[') {
        e.preventDefault();
        proceduralAudio.playTaptic('selection');
        setIsExpanded(!isExpanded);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, setIsExpanded]);

  const handleReturnHome = () => {
    if (hasUnsavedChanges || canUndo) {
      setShowExitConfirm(true);
    } else {
      openMapHub();
    }
  };

  const handleConfirmExitWithSave = async () => {
    if (engine) {
      try {
        const cityId = activeCityId || 'autosave';
        const cityName = activeMapName || 'Kota Saat Ini';
        const data = CitySerializer.serialize(engine, cityName);
        await IndexedDBStorage.saveMapById(cityId, cityName, data);
        engine.markUnsavedChanges(false);
      } catch (err) {
        console.warn('Autosave before exit failed:', err);
      }
    }
    setShowExitConfirm(false);
    openMapHub();
  };

  const handleConfirmExitWithoutSave = () => {
    if (engine) {
      engine.markUnsavedChanges(false);
    }
    setShowExitConfirm(false);
    openMapHub();
  };

  const handleSwitchMap = async () => {
    if (engine && (hasUnsavedChanges || canUndo)) {
      try {
        const cityId = activeCityId || 'autosave';
        const cityName = activeMapName || 'Kota Saat Ini';
        const data = CitySerializer.serialize(engine, cityName);
        await IndexedDBStorage.saveMapById(cityId, cityName, data);
        engine.markUnsavedChanges(false);
      } catch (err) {
        console.warn('Autosave before map switch failed:', err);
      }
    }
    openMapHub();
  };

  const renderButton = (
    icon: React.ReactNode,
    label: string,
    _hotkey: string,
    onClick: () => void,
    isActive: boolean = false
  ) => {
    return (
      <button
        onClick={() => {
          proceduralAudio.playTaptic('light');
          onClick();
        }}
        className={`side-dock-btn ${isActive ? 'active' : ''}`}
        style={
          isExpanded
            ? {
                width: '100%',
                borderRadius: '8px',
                justifyContent: 'flex-start',
                padding: '6px 10px',
                gap: '8px'
              }
            : undefined
        }
        title={label}
        aria-label={label}
      >
        {icon}
        {isExpanded ? (
          <span
            style={{
              fontSize: '12px',
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#FFFFFF' : '#DBF2FC',
              whiteSpace: 'nowrap'
            }}
          >
            {label}
          </span>
        ) : (
          <span className="side-dock-tooltip">
            {label}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      className="side-dock-wrapper"
      aria-label="Utilitas Sistem Kota"
      style={{
        position: 'fixed',
        left: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 950
      }}
    >
      <div
        className="side-dock-container interactive arscity-navy-panel"
        style={{
          width: isExpanded ? '248px' : '56px',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'visible',
          alignItems: 'stretch',
          transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          padding: '10px',
          borderRadius: '24px'
        }}
      >
        {/* Header Identitas & Tombol Perluas - Posisi Piksel Terkunci Identik Saat Collapsed & Expanded */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '10px',
            width: '100%',
            height: '36px',
            marginBottom: '4px',
            flexShrink: 0
          }}
        >
          <button
            onClick={() => {
              proceduralAudio.playTaptic('selection');
              setIsExpanded(!isExpanded);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              flexShrink: 0,
              cursor: 'pointer',
              padding: 0
            }}
            title={isExpanded ? 'Ciutkan Menu Kota ([)' : 'Perluas Menu Kota ([)'}
            aria-label={isExpanded ? 'Ciutkan Menu Kota' : 'Perluas Menu Kota'}
          >
            <ArscityLogo size={30} iconOnly variant="dark" />
          </button>

          {isExpanded && (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#DBF2FC',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap'
              }}
            >
              Menu Kota
            </span>
          )}

          <button
            onClick={() => {
              proceduralAudio.playTaptic('selection');
              setIsExpanded(!isExpanded);
            }}
            className="side-dock-btn"
            style={{
              width: '28px',
              height: '28px',
              marginLeft: 'auto',
              display: isExpanded ? 'flex' : 'none',
              color: '#DBF2FC'
            }}
            title={isExpanded ? 'Ciutkan Menu' : 'Perluas Menu'}
            aria-label={isExpanded ? 'Ciutkan Menu' : 'Perluas Menu'}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Kontainer Daftar Tombol (Scroll hanya di mode expanded agar tooltip mode collapsed tidak terpotong) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: isExpanded ? 'stretch' : 'center',
            gap: '4px',
            maxHeight: 'calc(100vh - 108px)',
            overflowY: isExpanded ? 'auto' : 'visible',
            overflowX: isExpanded ? 'hidden' : 'visible',
            scrollbarWidth: 'none'
          }}
        >

        {/* ================= GRUP 1: BERKAS ================= */}
        {isExpanded && (
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'rgba(219, 242, 252, 0.65)',
              letterSpacing: '0.05em',
              padding: '12px 8px 6px',
              textTransform: 'uppercase'
            }}
          >
            Berkas
          </div>
        )}

        {renderButton(
          <FolderOpen size={18} strokeWidth={1.75} />,
          'Buka Peta',
          'M',
          handleSwitchMap
        )}

        {renderButton(
          <HardDrive size={18} strokeWidth={1.75} />,
          'Simpan & Muat',
          'Ctrl+S',
          () => setShowSaveLoad(true)
        )}

        {renderButton(
          <Share2 size={18} strokeWidth={1.75} />,
          'Ekspor CAD/3D',
          'Ctrl+E',
          () => setShowRealWorldExport(true)
        )}

        {/* ================= GRUP 2: TAMPILAN ================= */}
        {isExpanded ? (
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'rgba(219, 242, 252, 0.65)',
              letterSpacing: '0.05em',
              padding: '8px 8px 6px',
              marginTop: '12px',
              textTransform: 'uppercase'
            }}
          >
            Tampilan
          </div>
        ) : (
          <div style={{ marginTop: '10px' }} />
        )}

        {renderButton(
          <DraftingCompass size={18} strokeWidth={1.75} />,
          'Studio CAD',
          'C',
          () => setCustomBuildingModalOpen(true)
        )}

        {renderButton(
          <Camera size={18} strokeWidth={1.75} />,
          'Mode Foto',
          'P',
          () => setIsPhotoMode(true)
        )}

        {renderButton(
          <Layers size={18} strokeWidth={1.75} style={{ color: showLotOverlays ? 'var(--on-accent)' : undefined }} />,
          'Lapisan Kavling',
          'L',
          toggleShowLotOverlays,
          showLotOverlays
        )}

        {renderButton(
          <Settings size={18} strokeWidth={1.75} />,
          'Pengaturan',
          'Ctrl+,',
          () => setShowSettings(true)
        )}

        {onOpenHelp &&
          renderButton(
            <HelpCircle size={18} strokeWidth={1.75} />,
            'Bantuan',
            '?',
            onOpenHelp
          )}

        {/* ================= GRUP 3: KEMBALI KE LAYAR AWAL ================= */}
        <div style={{ marginTop: '10px' }} />

        {renderButton(
          <Home size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />,
          'Kembali ke Layar Awal',
          'Esc',
          handleReturnHome
        )}

        {/* Tombol Perluas saat Collapsed */}
        {!isExpanded && (
          <button
            onClick={() => {
              proceduralAudio.playTaptic('selection');
              setIsExpanded(true);
            }}
            className="side-dock-btn"
            style={{
              marginTop: '4px',
              width: '32px',
              height: '32px',
              opacity: 0.78,
              color: '#DBF2FC'
            }}
            title="Perluas Menu"
            aria-label="Perluas Menu"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
        </div>
      </div>

      {/* Modal Konfirmasi Kembali ke Layar Awal (T7) */}
      {showExitConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--scrim)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            className="modal-sheet"
            style={{
              width: '380px',
              maxWidth: '92vw',
              background: 'linear-gradient(145deg, #DBF2FC 0%, #EBF7FD 100%)',
              border: '2px solid #072D59',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 12px 36px rgba(7, 45, 89, 0.20)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              color: '#072D59'
            }}
          >
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#072D59', letterSpacing: '-0.02em' }}>
              Kembali ke Layar Awal?
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(7, 45, 89, 0.76)', lineHeight: 1.5, fontWeight: 500 }}>
              Ada perubahan tata kota yang belum disimpan. Apakah Anda ingin menyimpan perubahan ini ke slot penyimpanan aktif?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={handleConfirmExitWithSave}
                className="btn-3d-pastel-pink"
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Simpan &amp; Kembali
              </button>
              <button
                onClick={handleConfirmExitWithoutSave}
                className="btn-3d-pastel-light"
                style={{
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  color: '#BA1A1A',
                  cursor: 'pointer'
                }}
              >
                Kembali Tanpa Menyimpan
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: 'transparent',
                  color: 'rgba(7, 45, 89, 0.65)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
});
