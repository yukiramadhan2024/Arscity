import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { ZoneType, ZONE_RULES } from '../../zones/ZoneTypes';

export const ZoneSubToolbar: React.FC = () => {
  const { activeTool, engine } = useUIStore();
  const [activeZone, setActiveZone] = useState<ZoneType>('residential');
  const [activeSize, setActiveSize] = useState<string>('15x20');

  if (activeTool !== 'zone') return null;

  const handleZoneChange = (zone: ZoneType) => {
    setActiveZone(zone);
    engine?.zoneTool.setZoneType(zone);
  };

  const handleSizeChange = (w: number, l: number, label: string) => {
    setActiveSize(label);
    engine?.zoneTool.setLotSize(w, l);
  };

  return (
    <div className="sub-dock-wrapper">
      <div className="glass-surface sub-dock-container interactive">
        {/* Zone Buttons with Apple Desaturated System Colors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(Object.keys(ZONE_RULES) as ZoneType[]).map((zt) => {
            const rule = ZONE_RULES[zt];
            const isSel = activeZone === zt;

            return (
              <button
                key={zt}
                onClick={() => handleZoneChange(zt)}
                className={`ios-btn ${isSel ? 'active' : ''}`}
                style={{
                  padding: '4px 10px',
                  background: isSel ? 'var(--fill-control-active)' : 'transparent',
                  border: isSel ? '1px solid var(--separator)' : '1px solid transparent'
                }}
                title={`${rule.name} (KDB maks ${rule.maxKDB}%, KLB ${rule.maxKLB})`}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: rule.color,
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: isSel ? 600 : 400 }}>
                  {rule.name.split(' (')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="divider-v" />

        {/* Lot Size Segmented Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Kavling:</span>
          <div className="segmented-control">
            {[
              { w: 12, l: 15, label: '12×15m' },
              { w: 15, l: 20, label: '15×20m' },
              { w: 20, l: 30, label: '20×30m' }
            ].map((sz) => {
              const isSel = activeSize === sz.label;

              return (
                <button
                  key={sz.label}
                  onClick={() => handleSizeChange(sz.w, sz.l, sz.label)}
                  className={`segmented-item ${isSel ? 'active' : ''}`}
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  <span className="tabular-nums">{sz.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
