import React, { useState, useEffect } from 'react';
import { useUIStore } from '../state/useUIStore';
import { RoadType, ROAD_PROFILES } from '../../roads/RoadTypes';
import { Spline, Minus, Check } from 'lucide-react';

export const RoadSubToolbar: React.FC = () => {
  const { activeTool, engine } = useUIStore();
  const [selectedType, setSelectedType] = useState<RoadType>('collector');
  const [drawMode, setDrawMode] = useState<'straight' | 'bezier'>('straight');
  const [roadLength, setRoadLength] = useState<number>(0);
  const [isValid, setIsValid] = useState<boolean>(false);

  useEffect(() => {
    if (!engine) return;

    engine.roadTool.onLengthUpdate = (len, valid) => {
      setRoadLength(len);
      setIsValid(valid);
    };
  }, [engine]);

  if (activeTool !== 'road') return null;

  const handleTypeChange = (type: RoadType) => {
    setSelectedType(type);
    engine?.roadTool.setRoadType(type);
  };

  const handleModeChange = (mode: 'straight' | 'bezier') => {
    setDrawMode(mode);
    engine?.roadTool.setDrawMode(mode);
  };

  return (
    <div className="sub-dock-wrapper">
      <div className="glass-surface sub-dock-container interactive">
        {/* Draw Mode Segmented Control */}
        <div className="segmented-control">
          <button
            onClick={() => handleModeChange('straight')}
            className={`segmented-item ${drawMode === 'straight' ? 'active' : ''}`}
            title="Mode Garis Lurus"
            aria-label="Mode Garis Lurus"
          >
            <Minus size={14} strokeWidth={1.75} />
            <span>Lurus</span>
          </button>
          <button
            onClick={() => handleModeChange('bezier')}
            className={`segmented-item ${drawMode === 'bezier' ? 'active' : ''}`}
            title="Mode Kurva Lengkung (Bezier)"
            aria-label="Mode Kurva Lengkung"
          >
            <Spline size={14} strokeWidth={1.75} />
            <span>Lengkung</span>
          </button>
        </div>

        <div className="divider-v" />

        {/* Road Type Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(Object.keys(ROAD_PROFILES) as RoadType[]).map((type) => {
            const profile = ROAD_PROFILES[type];
            const isSel = selectedType === type;

            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={`ios-btn ${isSel ? 'ios-btn-primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: '12px' }}
                title={`${profile.name} (${profile.width}m) - ${profile.description}`}
              >
                <span>{profile.name}</span>
                <span className="tabular-nums" style={{ fontSize: '10px', opacity: 0.8 }}>
                  {profile.width}m
                </span>
              </button>
            );
          })}
        </div>

        {/* Real-time length indicator if drawing */}
        {roadLength > 0 && (
          <>
            <div className="divider-v" />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 600,
                color: isValid ? 'var(--good)' : 'var(--bad)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-capsule)',
                background: isValid ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)'
              }}
            >
              <span className="tabular-nums">{roadLength.toFixed(1)} m</span>
              {isValid && <Check size={12} strokeWidth={2} />}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
