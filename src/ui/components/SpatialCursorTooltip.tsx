import React, { useEffect, useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { Route, Building } from 'lucide-react';
import { ROAD_PROFILES, RoadType } from '../../roads/RoadTypes';
import { PREFAB_CATALOG } from '../../buildings/PrefabTypes';
import { BuildingCatalogRegistry } from '../../buildings/BuildingCatalogRegistry';

export const SpatialCursorTooltip: React.FC = () => {
  const engine = useUIStore((s) => s.engine);
  const activeTool = useUIStore((s) => s.activeTool);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [, setTick] = useState<number>(0);

  useEffect(() => {
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

      const posX = Math.min(window.innerWidth - 220, Math.max(16, e.clientX + 16));
      const posY = Math.min(window.innerHeight - 60, Math.max(16, e.clientY + 16));

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

  // Hide tooltips for nature, zoning, and terraform to prevent obstructing view
  if (activeTool === 'nature' || activeTool === 'zone' || activeTool === 'terraform' || activeTool === 'select') {
    return null;
  }

  const capsuleStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    transform: 'translate3d(-999px, -999px, 0)',
    pointerEvents: 'none',
    zIndex: 150,
    padding: '5px 12px',
    borderRadius: '9999px',
    background: 'rgba(244, 247, 251, 0.92)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.9)',
    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    color: '#0F172A',
    fontSize: '11px',
    fontWeight: 600
  };

  // 1. Road Tool Drawing: single-line capsule showing length
  if (activeTool === 'road' && engine.roadTool) {
    const rt = engine.roadTool;
    if (rt.isDrawing && rt.startPoint) {
      const currentPt = engine.raycastManager.snappedPoint;
      const lengthM = rt.startPoint.distanceTo(currentPt);
      const isValid = lengthM >= 2.0 && lengthM <= 400.0;

      return (
        <div ref={containerRef} style={capsuleStyle}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isValid ? '#007AFF' : '#FF3B30',
              boxShadow: isValid ? '0 0 6px rgba(0, 122, 255, 0.6)' : '0 0 6px rgba(255, 59, 48, 0.6)',
              flexShrink: 0
            }}
          />
          <Route size={12} strokeWidth={2} style={{ color: isValid ? '#007AFF' : '#FF3B30' }} />
          <span>Panjang: {lengthM.toFixed(1)}m</span>
        </div>
      );
    }
  }

  // 2. Building Placement: single-line capsule showing name and dimensions
  if (activeTool === 'build' && engine.buildingTool) {
    const bt = engine.buildingTool;
    const catalogItem = BuildingCatalogRegistry.getBuilding(bt.activePresetKey);
    const legacyItem = PREFAB_CATALOG[bt.activePresetKey];
    const name = catalogItem?.name || legacyItem?.name;
    const width = catalogItem?.defaultWidth || legacyItem?.defaultWidth;
    const length = catalogItem?.defaultLength || legacyItem?.defaultLength;

    if (name && width && length) {
      const isValid = bt.isPlacementValid;
      return (
        <div ref={containerRef} style={capsuleStyle}>
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: isValid ? '#007AFF' : '#FF3B30',
              boxShadow: isValid ? '0 0 6px rgba(0, 122, 255, 0.6)' : '0 0 6px rgba(255, 59, 48, 0.6)',
              flexShrink: 0
            }}
          />
          <Building size={12} strokeWidth={2} style={{ color: isValid ? '#007AFF' : '#FF3B30' }} />
          <span>{name} ({width}×{length}m)</span>
        </div>
      );
    }
  }

  return null;
};
