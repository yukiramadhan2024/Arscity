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
        {/* Draw Mode Segmented Control */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', padding: '2px' }}>
          <button
            onClick={() => handleModeChange('straight')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              border: 'none',
              background: drawMode === 'straight' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
              color: drawMode === 'straight' ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Mode Garis Lurus"
            aria-label="Mode Garis Lurus"
          >
            <Minus size={13} strokeWidth={1.75} />
            <span>Lurus</span>
          </button>
          <button
            onClick={() => handleModeChange('bezier')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              border: 'none',
              background: drawMode === 'bezier' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
              color: drawMode === 'bezier' ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Mode Kurva Lengkung (Bezier)"
            aria-label="Mode Kurva Lengkung"
          >
            <Spline size={13} strokeWidth={1.75} />
            <span>Lengkung</span>
          </button>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: isSel ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                  color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                  fontSize: '11px',
                  fontWeight: isSel ? 600 : 500,
                  cursor: 'pointer'
                }}
                title={`${profile.name} (${profile.width}m) - ${profile.description}`}
              >
                <span>{profile.name}</span>
                <span className="font-mono tabular-nums" style={{ fontSize: '10px', opacity: 0.8 }}>
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
