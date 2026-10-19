import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { ZoneType, ZONE_RULES } from '../../zones/ZoneTypes';
import { Sparkles } from 'lucide-react';
import { AutoZoningService } from '../../zones/AutoZoningService';

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

  const handleAutoDevelopAll = () => {
    if (!engine) return;
    const cmd = AutoZoningService.createAutoDevelopAllLotsCommand(engine);
    if (cmd) {
      engine.executeCommand(cmd);
    }
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
        {/* Zone Buttons */}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: isSel ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  border: isSel ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                  color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                  cursor: 'pointer'
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
                <span style={{ fontSize: '12px', fontWeight: isSel ? 600 : 500 }}>
                  {rule.name.split(' (')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Lot Size Segmented Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Kavling:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                  style={{
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    border: isSel ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSel ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                    fontSize: '11px',
                    fontWeight: isSel ? 600 : 500,
                    cursor: 'pointer'
                  }}
                >
                  <span className="font-mono tabular-nums">{sz.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Auto-Develop Compliant Lots Button */}
        <button
          onClick={handleAutoDevelopAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'rgba(52, 199, 89, 0.16)',
            border: '1px solid rgba(52, 199, 89, 0.4)',
            color: '#34c759',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title="Bangun Seluruh Kavling Kosong Secara Otomatis"
        >
          <Sparkles size={12} strokeWidth={1.75} />
          <span>Bangun Otomatis</span>
        </button>
      </div>
    </div>
  );
};
