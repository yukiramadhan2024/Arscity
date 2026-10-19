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
  const { engine, activeTool } = useUIStore();
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    let animId: number;
    const updateTick = () => {
      setTick((t) => (t + 1) % 1000);
      animId = requestAnimationFrame(updateTick);
    };
    animId = requestAnimationFrame(updateTick);

    const handlePointerMove = (e: MouseEvent) => {
      // Abaikan jika kursor berada di atas panel UI interaktif
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
        setVisible(false);
        return;
      }

      setMousePos({
        x: Math.min(window.innerWidth - 300, Math.max(16, e.clientX + 20)),
        y: Math.min(window.innerHeight - 130, Math.max(16, e.clientY + 20))
      });
      setVisible(true);
    };

    const handlePointerLeave = () => {
      setVisible(false);
    };

    window.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointerMove);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  if (!engine || !visible || !mousePos) {
    return null;
  }

  const tooltipBaseStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${mousePos.x}px`,
    top: `${mousePos.y}px`,
    pointerEvents: 'none',
    zIndex: 150,
    padding: '8px 14px',
    borderRadius: '16px',
    background: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    maxWidth: '280px',
    userSelect: 'none'
  };

  // 1. Telemetri Gizmo Aktif
  const gizmoTelem = engine.buildingGizmoManager?.liveGizmoTelemetry;
  if (gizmoTelem && gizmoTelem.active) {
    const isWarn = !!gizmoTelem.warning;
    return (
      <div style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isWarn ? '#FF3B30' : '#0A84FF',
              boxShadow: isWarn ? '0 0 8px rgba(255, 59, 48, 0.8)' : '0 0 8px rgba(10, 132, 255, 0.8)',
              flexShrink: 0
            }}
          />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {gizmoTelem.label}
          </span>
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }} className="tabular-nums font-mono">
          {gizmoTelem.value}
        </div>
        {gizmoTelem.secondary && (
          <div style={{ fontSize: '11px', color: '#CBD5E1' }} className="tabular-nums">
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
      <div style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#0A84FF',
              boxShadow: '0 0 8px rgba(10, 132, 255, 0.8)',
              flexShrink: 0
            }}
          />
          <Scissors size={13} strokeWidth={2} style={{ color: '#0A84FF' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
            Irisan Denah Lantai
          </span>
        </div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }} className="tabular-nums font-mono">
          Ketinggian: {cutH.toFixed(2)} m
        </div>
        <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
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
        <div style={tooltipBaseStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isValid ? '#0A84FF' : '#FF3B30',
                boxShadow: isValid ? '0 0 8px rgba(10, 132, 255, 0.8)' : '0 0 8px rgba(255, 59, 48, 0.8)',
                flexShrink: 0
              }}
            />
            <Route size={13} strokeWidth={2} style={{ color: isValid ? '#0A84FF' : '#FF3B30' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
              {profile.name} (Lebar {profile.width}m)
            </span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }} className="tabular-nums font-mono">
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
        <div style={tooltipBaseStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isValid ? '#0A84FF' : '#FF3B30',
                boxShadow: isValid ? '0 0 8px rgba(10, 132, 255, 0.8)' : '0 0 8px rgba(255, 59, 48, 0.8)',
                flexShrink: 0
              }}
            />
            <Building size={13} strokeWidth={2} style={{ color: isValid ? '#0A84FF' : '#FF3B30' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
              {name}
            </span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }} className="tabular-nums font-mono">
            Dimensi: {width}m × {length}m | Rotasi: {rotDeg}°
          </div>
          {lot ? (
            <div style={{ fontSize: '11px', color: '#34C759', fontWeight: 500 }}>
              Kavling {lot.name} ({lot.zone})
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: '#CBD5E1' }}>
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
      <div style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#34C759',
              boxShadow: '0 0 8px rgba(52, 199, 89, 0.8)',
              flexShrink: 0
            }}
          />
          <Trees size={14} strokeWidth={2} style={{ color: '#34C759' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
            Vegetasi & Resapan Tropis
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: '1.4' }}>
          Klik untuk menanam pohon peneduh, taman rumput, atau biopori resapan
        </div>
      </div>
    );
  }

  // 6. Telemetri Zonasi (Zone Tool)
  if (activeTool === 'zone' && engine.zoneTool) {
    return (
      <div style={tooltipBaseStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#0A84FF',
              boxShadow: '0 0 8px rgba(10, 132, 255, 0.8)',
              flexShrink: 0
            }}
          />
          <LayoutGrid size={14} strokeWidth={2} style={{ color: '#0A84FF' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>
            Penataan Zonasi Kavling
          </span>
        </div>
        <div style={{ fontSize: '11px', color: '#CBD5E1', lineHeight: '1.4' }}>
          Klik pada lahan untuk membuat kavling zonasi dan batas sempadan bangunan
        </div>
      </div>
    );
  }

  return null;
};
