import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { LandscapeType } from '../../world/LandscapeManager';
import { Trees, Flower2, Grid, Droplets, CircleDot, LucideIcon } from 'lucide-react';

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
    <div className="sub-dock-wrapper">
      <div className="glass-surface sub-dock-container interactive">
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
                  padding: '5px 12px',
                  background: isSel ? 'var(--fill-control-active)' : 'transparent',
                  border: isSel ? '1px solid var(--separator)' : '1px solid transparent',
                  gap: '6px'
                }}
                title={opt.desc}
                aria-label={opt.label}
              >
                <Icon size={15} strokeWidth={1.75} />
                <span style={{ fontSize: '12px', fontWeight: isSel ? 600 : 400 }}>
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
