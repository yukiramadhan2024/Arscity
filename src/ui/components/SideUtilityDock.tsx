import React from 'react';
import { useUIStore } from '../state/useUIStore';
import { HardDrive, Camera, Settings, HelpCircle, Share2, Award, FolderOpen, LogOut } from 'lucide-react';
import { CitySerializer } from '../../io/CitySerializer';
import { IndexedDBStorage } from '../../io/IndexedDBStorage';
import { ArscityLogo } from './ArscityLogo';

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
      <div className="side-dock-container interactive">
        {/* Logo Identitas Sudut Aplikasi */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.18) 0%, rgba(56, 189, 248, 0.08) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            boxShadow: '0 2px 10px rgba(10, 132, 255, 0.25)',
            marginBottom: '4px'
          }}
          title="Arscity - Studio Tata Kota Nusantara"
          aria-label="Identitas Arscity"
        >
          <ArscityLogo size={24} />
        </div>

        <div style={{ width: '22px', height: '1px', background: 'var(--separator)', marginBottom: '4px' }} />
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
        <div style={{ width: '22px', height: '1px', background: 'var(--separator)', margin: '2px 0' }} />

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
