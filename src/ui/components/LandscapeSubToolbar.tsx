import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { LandscapeType } from '../../world/LandscapeManager';
import { Trees, Flower2, Grid, Droplets, Droplet, CircleDot, Waves, Spline, LucideIcon } from 'lucide-react';

interface LandscapeOption {
  type: LandscapeType;
  label: string;
  icon: LucideIcon;
  desc: string;
}

const LANDSCAPE_OPTIONS: LandscapeOption[] = [
  { type: 'grass_garden', label: 'Taman Rumput', icon: Flower2, desc: 'Taman berumput untuk resapan air (KDH)' },
  { type: 'paving_block', label: 'Paving Block', icon: Grid, desc: 'Perkerasan berpori untuk jalan setapak' },
  { type: 'shade_tree', label: 'Pohon Peneduh', icon: Trees, desc: 'Pohon kanopi peneduh penurun suhu (KDH)' },
  { type: 'river_segment', label: 'Sungai & Talud', icon: Waves, desc: 'Segmen alur sungai perkotaan dengan dinding talud batu kali' },
  { type: 'retention_pond', label: 'Kolam Retensi', icon: Droplet, desc: 'Kolam embung penampung air hujan komunal (25 m³/jam)' },
  { type: 'bioswale_channel', label: 'Bioswale', icon: Spline, desc: 'Parit resapan vegetasi koridor jalan (4 m³/jam)' },
  { type: 'well', label: 'Sumur Resapan', icon: Droplets, desc: 'Sumur peresapan air hujan ke tanah' },
  { type: 'biopore', label: 'Biopori', icon: CircleDot, desc: 'Lubang silindris resapan biopori' },
];

export const LandscapeSubToolbar: React.FC = () => {
  const { activeTool, engine } = useUIStore();
  const [activeType, setActiveType] = useState<LandscapeType>('grass_garden');

  if (activeTool !== 'nature') return null;

  const handleSelect = (t: LandscapeType) => {
    setActiveType(t);
    engine?.landscapeTool.setType(t);
  };

  return (
    <div className="sub-dock-wrapper" style={{ pointerEvents: 'none' }}>
      <div
        className="glass-surface sub-dock-container interactive"
        style={{
          background: 'rgba(15, 23, 42, 0.86)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '24px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
          color: '#F8FAFC'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {LANDSCAPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSel = activeType === opt.type;

            return (
              <button
                key={opt.type}
                onClick={() => handleSelect(opt.type)}
                className={`ios-btn ${isSel ? 'active' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  border: isSel ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                  cursor: 'pointer'
                }}
                title={opt.desc}
                aria-label={opt.label}
              >
                <Icon size={14} strokeWidth={1.75} style={{ color: isSel ? '#38bdf8' : 'rgba(226, 232, 240, 0.85)' }} />
                <span style={{ fontSize: '12px', fontWeight: isSel ? 600 : 500 }}>
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
