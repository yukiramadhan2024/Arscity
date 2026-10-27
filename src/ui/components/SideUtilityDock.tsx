import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import {
  HardDrive,
  Camera,
  Settings,
  HelpCircle,
  Share2,
  Award,
  FolderOpen,
  LogOut,
  DraftingCompass,
  BookOpen,
  GraduationCap,
  Layers,
  ChevronRight,
  ChevronLeft
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
  const setShowMissions = useUIStore((s) => s.setShowMissions);
  const setShowGlossary = useUIStore((s) => s.setShowGlossary);
  const setShowQuiz = useUIStore((s) => s.setShowQuiz);
  const showLotOverlays = useUIStore((s) => s.showLotOverlays);
  const toggleShowLotOverlays = useUIStore((s) => s.toggleShowLotOverlays);
  const activeTool = useUIStore((s) => s.activeTool);

  const isExpanded = useUIStore((s) => s.isSideDockExpanded);
  const setIsExpanded = useUIStore((s) => s.setIsSideDockExpanded);

  // D1: Auto-collapse when Analysis is active so there's zero overlap
  React.useEffect(() => {
    if (activeTool === 'analyze') {
      setIsExpanded(false);
    }
  }, [activeTool, setIsExpanded]);

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
              color: isActive ? '#007AFF' : '#1E293B',
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
            <div
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
                flexShrink: 0
              }}
              title="Arscity - Studio Tata Kota Nusantara"
            >
              <ArscityLogo size={20} />
            </div>

            {isExpanded && (
              <span
                style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#0F172A',
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
              color: '#64748B',
              letterSpacing: '0.05em',
              padding: '16px 8px 6px',
              textTransform: 'uppercase'
            }}
          >
            Berkas
          </div>
        )}
        <div style={{ width: '100%', height: '1px', background: 'var(--separator)', margin: '4px 0' }} />

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
        {isExpanded && (
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.05em',
              padding: '24px 8px 6px',
              textTransform: 'uppercase'
            }}
          >
            Tampilan
          </div>
        )}
        <div style={{ width: '100%', height: '1px', background: 'var(--separator)', margin: '4px 0' }} />

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
          <Layers size={18} strokeWidth={1.75} style={{ color: showLotOverlays ? '#007AFF' : undefined }} />,
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

        {/* ================= GRUP 3: BELAJAR ================= */}
        {isExpanded && (
          <div
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748B',
              letterSpacing: '0.05em',
              padding: '24px 8px 6px',
              textTransform: 'uppercase'
            }}
          >
            Belajar
          </div>
        )}
        <div style={{ width: '100%', height: '1px', background: 'var(--separator)', margin: '4px 0' }} />

        {renderButton(
          <Award size={18} strokeWidth={1.75} />,
          'Misi Kota',
          'U',
          () => setShowMissions(true)
        )}

        {renderButton(
          <BookOpen size={18} strokeWidth={1.75} />,
          'Glosarium SNI',
          'G',
          () => setShowGlossary(true)
        )}

        {renderButton(
          <GraduationCap size={18} strokeWidth={1.75} />,
          'Kuis Arsitektur',
          'K',
          () => setShowQuiz(true)
        )}

        {onOpenHelp &&
          renderButton(
            <HelpCircle size={18} strokeWidth={1.75} />,
            'Bantuan',
            '?',
            onOpenHelp
          )}

        {/* ================= GRUP 4: KELUAR ================= */}
        <div style={{ width: '100%', height: '1px', background: 'var(--separator)', margin: '4px 0' }} />

        {renderButton(
          <LogOut size={18} strokeWidth={1.75} style={{ color: '#E11D48' }} />,
          'Keluar',
          'Esc',
          logout
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
    </aside>
  );
});
