import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { ZoneType, ZONE_RULES } from '../../zones/ZoneTypes';
import { Sparkles, Grid } from 'lucide-react';
import { SubdivideBlockCommand } from '../../core/commands/CityCommands';
import { AutoZoningService } from '../../zones/AutoZoningService';

export const ZoneSubToolbar: React.FC = () => {
  const { activeTool, engine } = useUIStore();
  const [activeZone, setActiveZone] = useState<ZoneType>('residential');
  const [activeSize, setActiveSize] = useState<string>('10x20');

  const handleSubdivideBlock = () => {
    if (!engine) return;
    const center = engine.cameraController.target.clone();
    center.y = 0;
    const parts = activeSize.split('x');
    const pw = parseFloat(parts[0]) || 10;
    const pl = parseFloat(parts[1]) || 20;
    const blockW = Math.max(30, pw * 3);
    const blockL = Math.max(30, pl * 2);

    engine.executeCommand(
      new SubdivideBlockCommand(engine, center, blockW, blockL, pw, pl, activeZone)
    );
  };

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
        className="glass-surface sub-dock-container interactive arscity-glass-bar"
        style={{
          borderRadius: '24px',
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
                  background: isSel ? 'var(--accent)' : 'transparent',
                  border: isSel ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  color: isSel ? 'var(--on-accent)' : 'var(--label)',
                  boxShadow: isSel ? 'var(--shadow-accent)' : 'none',
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
                    border: isSel ? '1px solid var(--on-accent)' : 'none',
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: isSel ? 700 : 500 }}>
                  {rule.name.split(' (')[0]}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

        {/* Lot Size Segmented Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--label-secondary)', fontWeight: 600 }}>Kavling:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--fill-control)', padding: '2px', borderRadius: '9999px', border: '1px solid var(--border)' }}>
            {[
              { w: 8, l: 15, label: '8x15m', title: 'Kavling Kecil 8x15m' },
              { w: 10, l: 20, label: '10x20m', title: 'Kavling Sedang 10x20m' },
              { w: 15, l: 25, label: '15x25m', title: 'Kavling Komersial 15x25m' },
              { w: 25, l: 40, label: '25x40m', title: 'Kavling Menara 25x40m' }
            ].map((sz) => {
              const isSel = activeSize === sz.label;

              return (
                <button
                  key={sz.label}
                  onClick={() => handleSizeChange(sz.w, sz.l, sz.label)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isSel ? 'var(--accent)' : 'transparent',
                    color: isSel ? 'var(--on-accent)' : 'var(--label-secondary)',
                    boxShadow: isSel ? 'var(--shadow-accent)' : 'none',
                    fontSize: '11px',
                    fontWeight: isSel ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  <span className="font-mono tabular-nums">{sz.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

        {/* Smart Block Subdivider Button (Fitur v3.1) */}
        <button
          onClick={handleSubdivideBlock}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'var(--fill-control)',
            border: '1px solid var(--border)',
            color: 'var(--label)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
          title="Bagi area blok menjadi deretan kavling seragam otomatis menghadap jalan"
        >
          <Grid size={12} strokeWidth={2} />
          <span>Bagi Blok Otomatis</span>
        </button>

        {/* Auto-Develop Compliant Lots Button */}
        <button
          onClick={handleAutoDevelopAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'var(--accent)',
            border: '1px solid var(--accent)',
            color: 'var(--on-accent)',
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
