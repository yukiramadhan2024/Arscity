import React, { useEffect, useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import {
  Route,
  Building,
  Trees,
  Scissors,
  LayoutGrid
} from 'lucide-react';
import { ROAD_PROFILES, RoadType } from '../../roads/RoadTypes';
import { PREFAB_CATALOG } from '../../buildings/PrefabTypes';
import { BuildingCatalogRegistry } from '../../buildings/BuildingCatalogRegistry';

export const SpatialCursorTooltip: React.FC = () => {
  const engine = useUIStore((s) => s.engine);
  const activeTool = useUIStore((s) => s.activeTool);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    // Throttled 100ms interval for telemetry updates (eliminates 60fps React re-renders)
    const intervalId = window.setInterval(() => {
      setTick((t) => (t + 1) % 1000);
    }, 100);

    const handlePointerMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const target = e.target as HTMLElement;
      if (
        !target ||
        target.closest('.interactive') ||
        target.closest('.modal-overlay') ||
        target.closest('.modal-sheet') ||
        target.closest('header') ||
        target.closest('aside') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('.wh-overlay') ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT'
      ) {
        containerRef.current.style.display = 'none';
        return;
      }

      const posX = Math.min(window.innerWidth - 300, Math.max(16, e.clientX + 20));
      const posY = Math.min(window.innerHeight - 130, Math.max(16, e.clientY + 20));

      containerRef.current.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
      containerRef.current.style.display = 'flex';
    };

    const handlePointerLeave = () => {
      if (containerRef.current) {
        containerRef.current.style.display = 'none';
      }
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  if (!engine) {
    return null;
  }

  const tooltipBaseStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: 'translate3d(-999px, -999px, 0)',
    pointerEvents: 'none',
    zIndex: 150,
    padding: '10px 16px',
    borderRadius: '16px',
    background: 'var(--surface-raised)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1px solid var(--hairline)',
    boxShadow: 'var(--shadow-raised)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '290px',
    userSelect: 'none',
    color: 'var(--label)'
  };

  // 1. Telemetri Gizmo Aktif
  const gizmoTelem = engine.buildingGizmoManager?.liveGizmoTelemetry;
  if (gizmoTelem && gizmoTelem.active) {
    const isWarn = !!gizmoTelem.warning;
    return (
      <div ref={containerRef} style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isWarn ? '#FF3B30' : '#007AFF',
              boxShadow: isWarn ? '0 0 8px rgba(255, 59, 48, 0.6)' : '0 0 8px rgba(0, 122, 255, 0.6)',
              flexShrink: 0
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {gizmoTelem.label}
          </span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--label)' }} className="tabular-nums font-mono">
          {gizmoTelem.value}
        </div>
        {gizmoTelem.secondary && (
          <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }} className="tabular-nums">
            {gizmoTelem.secondary}
          </div>
        )}
        {gizmoTelem.warning && (
          <div style={{ fontSize: '11px', color: '#FF3B30', fontWeight: 600 }}>
            {gizmoTelem.warning}
          </div>
        )}
      </div>
    );
  }

  // 2. Telemetri Irisan Bangunan (Section Cut)
  if (engine.sectionCutManager?.currentMode === 'floor_plan') {
    const cutH = engine.sectionCutManager.cutHeight;
    const layerName = engine.sectionCutManager.getInspectedLayerName(cutH);
    return (
      <div ref={containerRef} style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#007AFF',
              boxShadow: '0 0 8px rgba(0, 122, 255, 0.6)',
              flexShrink: 0
            }}
          />
          <Scissors size={13} strokeWidth={2} style={{ color: '#007AFF' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
            Irisan Denah Lantai
          </span>
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)' }} className="tabular-nums font-mono">
          Ketinggian: {cutH.toFixed(2)} m
        </div>
        <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
          {layerName}
        </div>
      </div>
    );
  }

  // 3. Telemetri Pembangunan Jalan (Road Tool)
  if (activeTool === 'road' && engine.roadTool) {
    const rt = engine.roadTool;
    const profile = ROAD_PROFILES[rt.activeRoadType as RoadType] || ROAD_PROFILES.local;

    if (rt.isDrawing && rt.startPoint) {
      const currentPt = engine.raycastManager.snappedPoint;
      const lengthM = rt.startPoint.distanceTo(currentPt);
      const dx = currentPt.x - rt.startPoint.x;
      const dz = currentPt.z - rt.startPoint.z;
      const angleRad = Math.atan2(dx, dz);
      let angleDeg = Math.round((angleRad * 180) / Math.PI);
      if (angleDeg < 0) angleDeg += 360;

      const isValid = lengthM >= 2.0 && lengthM <= 400.0;

      return (
        <div ref={containerRef} style={tooltipBaseStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isValid ? '#007AFF' : '#FF3B30',
                boxShadow: isValid ? '0 0 8px rgba(0, 122, 255, 0.6)' : '0 0 8px rgba(255, 59, 48, 0.6)',
                flexShrink: 0
              }}
            />
            <Route size={13} strokeWidth={2} style={{ color: isValid ? '#007AFF' : '#FF3B30' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
              {profile.name} (Lebar {profile.width}m)
            </span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)' }} className="tabular-nums font-mono">
            Panjang: {lengthM.toFixed(1)} m | Sudut: {angleDeg}°
          </div>
          {!isValid && (
            <div style={{ fontSize: '11px', color: '#FF3B30', fontWeight: 600 }}>
              {lengthM < 2.0 ? 'Segmen terlalu pendek (< 2.0 m)' : 'Melebihi panjang maksimal (400 m)'}
            </div>
          )}
        </div>
      );
    }
  }

  // 4. Telemetri Penempatan Bangunan (Building Tool)
  if (activeTool === 'build' && engine.buildingTool) {
    const bt = engine.buildingTool;
    const catalogItem = BuildingCatalogRegistry.getBuilding(bt.activePresetKey);
    const legacyItem = PREFAB_CATALOG[bt.activePresetKey];
    const name = catalogItem?.name || legacyItem?.name;
    const width = catalogItem?.defaultWidth || legacyItem?.defaultWidth;
    const length = catalogItem?.defaultLength || legacyItem?.defaultLength;

    if (name && width && length) {
      const rotDeg = Math.round(((bt.currentRotation * 180) / Math.PI) % 360);
      const groundPos = engine.raycastManager.snappedPoint;
      const lot = engine.lotManager?.findLotAtPosition(groundPos.x, groundPos.z);
      const isValid = bt.isPlacementValid;

      return (
        <div ref={containerRef} style={tooltipBaseStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isValid ? '#007AFF' : '#FF3B30',
                boxShadow: isValid ? '0 0 8px rgba(0, 122, 255, 0.6)' : '0 0 8px rgba(255, 59, 48, 0.6)',
                flexShrink: 0
              }}
            />
            <Building size={13} strokeWidth={2} style={{ color: isValid ? '#007AFF' : '#FF3B30' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
              {name}
            </span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)' }} className="tabular-nums font-mono">
            Dimensi: {width}m × {length}m | Rotasi: {rotDeg}°
          </div>
          {lot ? (
            <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: 600 }}>
              Kavling {lot.name} ({lot.zone})
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
              Lahan Bebas (Tekan [R] untuk memutar 90°)
            </div>
          )}
        </div>
      );
    }
  }

  // 5. Telemetri Lansekap & Vegetasi (Landscape / Nature Tool)
  if (activeTool === 'nature' && engine.landscapeTool) {
    return (
      <div ref={containerRef} style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#16A34A',
              boxShadow: '0 0 8px rgba(22, 163, 74, 0.6)',
              flexShrink: 0
            }}
          />
          <Trees size={14} strokeWidth={2} style={{ color: '#16A34A' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
            Vegetasi & Resapan Tropis
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--label-secondary)', lineHeight: '1.4' }}>
          Klik untuk menanam pohon peneduh, taman rumput, atau biopori resapan
        </div>
      </div>
    );
  }

  // 6. Telemetri Zonasi (Zone Tool)
  if (activeTool === 'zone' && engine.zoneTool) {
    return (
      <div ref={containerRef} style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#007AFF',
              boxShadow: '0 0 8px rgba(0, 122, 255, 0.6)',
              flexShrink: 0
            }}
          />
          <LayoutGrid size={14} strokeWidth={2} style={{ color: '#007AFF' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
            Penataan Zonasi Kavling
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--label-secondary)', lineHeight: '1.4' }}>
          Klik pada lahan untuk membuat kavling zonasi dan batas sempadan bangunan
        </div>
      </div>
    );
  }

  return null;
};
