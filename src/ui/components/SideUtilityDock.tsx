import React from 'react';
import { useUIStore } from '../state/useUIStore';
import { HardDrive, Camera, Settings, HelpCircle, Share2, Award, FolderOpen, LogOut } from 'lucide-react';
import { CitySerializer } from '../../io/CitySerializer';
import { IndexedDBStorage } from '../../io/IndexedDBStorage';

interface SideUtilityDockProps {
  onOpenHelp?: () => void;
}

export const SideUtilityDock: React.FC<SideUtilityDockProps> = ({ onOpenHelp }) => {
  const {
    engine,
    activeMapName,
    openMapHub,
    logout,
    setShowSaveLoad,
    setShowSettings,
    setIsPhotoMode,
    setShowRealWorldExport,
    setShowQuiz
  } = useUIStore();

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

  return (
    <aside className="side-dock-wrapper" aria-label="Utilitas Sistem Kota">
      <div
        className="side-dock-container interactive"
        style={{
          background: 'rgba(15, 23, 42, 0.86)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '9999px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {/* Peta Kota */}
        <button
          onClick={handleSwitchMap}
          className="side-dock-btn"
          title="Peta Kota"
          aria-label="Peta Kota"
        >
          <FolderOpen size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Peta Kota</span>
        </button>

        {/* Simpan & Muat */}
        <button
          onClick={() => setShowSaveLoad(true)}
          className="side-dock-btn"
          title="Simpan & Muat"
          aria-label="Simpan & Muat"
        >
          <HardDrive size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Simpan & Muat</span>
        </button>

        {/* Mode Kamera & Foto */}
        <button
          onClick={() => setIsPhotoMode(true)}
          className="side-dock-btn"
          title="Mode Kamera & Foto"
          aria-label="Mode Kamera & Foto"
        >
          <Camera size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Mode Kamera & Foto</span>
        </button>

        {/* Pengaturan */}
        <button
          onClick={() => setShowSettings(true)}
          className="side-dock-btn"
          title="Pengaturan"
          aria-label="Pengaturan"
        >
          <Settings size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Pengaturan</span>
        </button>

        {/* Ekspor CAD/3D */}
        <button
          onClick={() => setShowRealWorldExport(true)}
          className="side-dock-btn"
          title="Ekspor CAD/3D"
          aria-label="Ekspor CAD/3D"
        >
          <Share2 size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Ekspor CAD/3D</span>
        </button>

        {/* Misi & Edukasi */}
        <button
          onClick={() => setShowQuiz(true)}
          className="side-dock-btn"
          title="Misi & Edukasi"
          aria-label="Misi & Edukasi"
        >
          <Award size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Misi & Edukasi</span>
        </button>

        {/* Pemisah Sub-Grup */}
        <div style={{ width: '22px', height: '1px', background: 'rgba(255, 255, 255, 0.14)', margin: '2px 0' }} />

        {/* Bantuan */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="side-dock-btn"
            title="Bantuan"
            aria-label="Bantuan"
          >
            <HelpCircle size={18} strokeWidth={1.75} />
            <span className="side-dock-tooltip">Bantuan</span>
          </button>
        )}

        {/* Keluar */}
        <button
          onClick={logout}
          className="side-dock-btn"
          title="Keluar"
          aria-label="Keluar"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Keluar</span>
        </button>
      </div>
    </aside>
  );
};
