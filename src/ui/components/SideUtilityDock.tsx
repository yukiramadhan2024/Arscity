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
    if (canUndo) {
      setShowExitConfirm(true);
    } else {
      openMapHub();
    }
  };

  const handleConfirmExitWithSave = () => {
    if (engine) {
      try {
        const data = CitySerializer.serialize(engine, activeMapName || 'Kota Saat Ini');
        IndexedDBStorage.saveSlot('autosave', data);
      } catch (err) {
        console.warn('Autosave before exit failed:', err);
      }
    }
    setShowExitConfirm(false);
    openMapHub();
  };

  const handleConfirmExitWithoutSave = () => {
    setShowExitConfirm(false);
    openMapHub();
  };

  const handleSwitchMap = () => {
    if (engine) {
      try {
        const data = CitySerializer.serialize(engine, activeMapName || 'Kota Saat Ini');
        IndexedDBStorage.saveSlot('autosave', data);
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
              color: isActive ? 'var(--accent)' : 'var(--label)',
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
        position: 'relative',
        zIndex: 20
      }}
    >
      <div
        className="side-dock-container interactive arscity-glass-bar"
        style={{
          width: isExpanded ? '192px' : '48px',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          alignItems: isExpanded ? 'stretch' : 'center',
          transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          padding: isExpanded ? '10px 8px' : '8px 6px'
        }}
      >
        {/* Header Identitas & Tombol Perluas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'space-between' : 'center',
            width: '100%',
            marginBottom: '4px',
            padding: isExpanded ? '0 4px' : undefined
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => {
                proceduralAudio.playTaptic('selection');
                setIsExpanded(!isExpanded);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.16) 0%, rgba(56, 189, 248, 0.08) 100%)',
                border: '1px solid rgba(0, 122, 255, 0.25)',
                boxShadow: '0 2px 8px rgba(0, 122, 255, 0.15)',
                flexShrink: 0,
                cursor: 'pointer',
                padding: 0
              }}
              title={isExpanded ? 'Ciutkan Menu Kota ([)' : 'Perluas Menu Kota ([)'}
              aria-label={isExpanded ? 'Ciutkan Menu Kota' : 'Perluas Menu Kota'}
            >
              <ArscityLogo size={20} />
            </button>

            {isExpanded && (
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--label)',
                  letterSpacing: '-0.01em'
                }}
              >
                Menu Kota
              </span>
            )}
          </div>

          <button
            onClick={() => {
              proceduralAudio.playTaptic('selection');
              setIsExpanded(!isExpanded);
            }}
            className="side-dock-btn"
            style={{
              width: '26px',
              height: '26px',
              marginLeft: isExpanded ? 'auto' : 0,
              display: isExpanded ? 'flex' : 'none'
            }}
            title={isExpanded ? 'Ciutkan Menu' : 'Perluas Menu'}
            aria-label={isExpanded ? 'Ciutkan Menu' : 'Perluas Menu'}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ================= GRUP 1: BERKAS ================= */}
        {isExpanded && (
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--label-tertiary)',
              letterSpacing: '0.05em',
              padding: '16px 8px 6px',
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
              color: 'var(--label-tertiary)',
              letterSpacing: '0.05em',
              padding: '8px 8px 6px',
              marginTop: '16px',
              textTransform: 'uppercase'
            }}
          >
            Tampilan
          </div>
        ) : (
          <div style={{ marginTop: '16px' }} />
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
          <Layers size={18} strokeWidth={1.75} style={{ color: showLotOverlays ? 'var(--accent)' : undefined }} />,
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
        <div style={{ marginTop: '16px' }} />

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
              width: '28px',
              height: '28px',
              opacity: 0.65
            }}
            title="Perluas Menu"
            aria-label="Perluas Menu"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </button>
        )}
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
            className="arscity-glass-bar"
            style={{
              width: '360px',
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-glass)',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: 'var(--shadow-popover)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: 'var(--label)'
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--label)' }}>
              Kembali ke Layar Awal?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--label-secondary)', lineHeight: 1.5 }}>
              Ada perubahan tata kota yang belum disimpan. Apakah Anda ingin menyimpan perubahan ini ke slot penyimpanan otomatis?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              <button
                onClick={handleConfirmExitWithSave}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Simpan & Kembali
              </button>
              <button
                onClick={handleConfirmExitWithoutSave}
                style={{
                  padding: '9px 14px',
                  borderRadius: '10px',
                  background: 'var(--fill-control)',
                  color: 'var(--bad)',
                  border: '1px solid var(--border)',
                  fontWeight: 600,
                  fontSize: '13px',
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
                  color: 'var(--label-secondary)',
                  border: 'none',
                  fontWeight: 500,
                  fontSize: '13px',
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
