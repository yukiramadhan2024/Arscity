import React from 'react';
import { useUIStore } from '../state/useUIStore';
import { HardDrive, Camera, Settings, HelpCircle, Share2, Award } from 'lucide-react';

interface SideUtilityDockProps {
  onOpenHelp?: () => void;
}

export const SideUtilityDock: React.FC<SideUtilityDockProps> = ({ onOpenHelp }) => {
  const { setShowSaveLoad, setShowSettings, setIsPhotoMode, setShowRealWorldExport, setShowQuiz } = useUIStore();

  return (
    <aside className="side-dock-wrapper" aria-label="Utilitas Sistem Kota">
      <div className="glass-surface side-dock-container interactive">
        {/* Simpan & Muat Kota */}
        <button
          onClick={() => setShowSaveLoad(true)}
          className="side-dock-btn"
          title="Simpan & Muat Kota"
          aria-label="Simpan dan Muat Kota"
        >
          <HardDrive size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Simpan & Muat Kota</span>
        </button>

        {/* Mode Foto Arsitektur */}
        <button
          onClick={() => setIsPhotoMode(true)}
          className="side-dock-btn"
          title="Mode Foto Arsitektur"
          aria-label="Mode Foto Arsitektur"
        >
          <Camera size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Mode Foto Arsitektur</span>
        </button>

        {/* Pengaturan Sistem & Tampilan (Ikon Gerigi Standar) */}
        <button
          onClick={() => setShowSettings(true)}
          className="side-dock-btn"
          title="Pengaturan Sistem & Grafis"
          aria-label="Pengaturan"
        >
          <Settings size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Pengaturan</span>
        </button>

        {/* Ekspor CAD 2D, 3D glTF & Impor Denah */}
        <button
          onClick={() => setShowRealWorldExport(true)}
          className="side-dock-btn"
          title="Ekspor CAD 2D (.DXF), 3D (.glTF), & Impor Denah"
          aria-label="Ekspor dan Impor Denah"
        >
          <Share2 size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Ekspor CAD & 3D</span>
        </button>

        {/* Kuis Edukasi Arsitektur (Pre/Post Test) */}
        <button
          onClick={() => setShowQuiz(true)}
          className="side-dock-btn"
          title="Kuis Evaluasi Arsitektur (Pre & Post Test)"
          aria-label="Kuis Evaluasi Arsitektur"
        >
          <Award size={18} strokeWidth={1.75} />
          <span className="side-dock-tooltip">Kuis Arsitektur</span>
        </button>

        {/* Pemisah Sub-Grup */}
        <div className="divider-h" style={{ width: '22px', margin: '2px 0' }} />

        {/* Bantuan Pintasan Keyboard */}
        {onOpenHelp && (
          <button
            onClick={onOpenHelp}
            className="side-dock-btn"
            title="Pintasan Keyboard (?)"
            aria-label="Pintasan Keyboard"
          >
            <HelpCircle size={18} strokeWidth={1.75} />
            <span className="side-dock-tooltip">Pintasan Keyboard (?)</span>
          </button>
        )}
      </div>
    </aside>
  );
};
