import React from 'react';
import { TopHeader } from './TopHeader';
import { SideUtilityDock } from './SideUtilityDock';
import { Minimap } from './Minimap';
import { AnalysisOverlay } from './AnalysisOverlay';
import { InspectorPanel } from './InspectorPanel';
import { BottomToolbar } from './BottomToolbar';
import { SpatialCursorTooltip } from './SpatialCursorTooltip';
import { useUIStore } from '../state/useUIStore';

export interface HudLayoutProps {
  onOpenHelp: () => void;
}

/**
 * HudLayout
 * Anti-overlap HUD Zone Container for Arscity.
 * Organizes God-View UI into protected zones with responsive boundaries:
 * - Top: Navigation and stats header
 * - Left Rail: Side utility dock (Save, Load, Photo, Settings, Help)
 * - Left Panel: Analysis Lab (clamped width, vertical scroll bound)
 * - Bottom Left: Minimap radar (auto-collapses to compass when Left Panel is active)
 * - Right: Property Inspector (bounded height, scrollable)
 * - Bottom Center: Bottom Toolbar and contextual sub-toolbars
 */
export const HudLayout: React.FC<HudLayoutProps> = ({ onOpenHelp }) => {
  const { activeTool } = useUIStore();
  const isAnalyzeActive = activeTool === 'analyze';

  return (
    <div
      id="arscity-hud-root"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 'var(--z-hud, 10)' as any,
        pointerEvents: 'none',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 3D World Spatial Cursor Tooltip */}
      <SpatialCursorTooltip />

      {/* ZONE 1: Top Navigation & Metrics Header */}
      <div
        id="hud-zone-top"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <TopHeader />
        </div>
      </div>

      {/* ZONE 2: Left Utility Rail (Icon Dock) */}
      <div
        id="hud-zone-rail"
        style={{
          position: 'absolute',
          left: 'var(--hud-edge, 16px)',
          top: 'var(--hud-top-offset, 76px)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <SideUtilityDock onOpenHelp={onOpenHelp} />
        </div>
      </div>

      {/* ZONE 3: Left Laboratory Panel (Analysis Overlay) */}
      {isAnalyzeActive && (
        <div
          id="hud-zone-left-panel"
          style={{
            position: 'absolute',
            left: 'calc(var(--hud-rail-width, 48px) + var(--hud-gap, 16px) + 12px)',
            top: 'var(--hud-top-offset, 76px)',
            bottom: 'var(--hud-bottom-reserve, 80px)',
            width: 'var(--hud-left-panel-width, clamp(280px, 24vw, 340px))',
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto', height: '100%' }}>
            <AnalysisOverlay />
          </div>
        </div>
      )}

      {/* ZONE 4: Bottom-Left Radar / Minimap */}
      <div
        id="hud-zone-bottom-left"
        style={{
          position: 'absolute',
          left: 'var(--hud-edge, 16px)',
          bottom: 'var(--hud-edge, 16px)',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <Minimap />
        </div>
      </div>

      {/* ZONE 5: Right Property Inspector */}
      <div
        id="hud-zone-right"
        style={{
          position: 'absolute',
          right: 'var(--hud-edge, 16px)',
          top: 'var(--hud-top-offset, 76px)',
          bottom: 'var(--hud-bottom-reserve, 88px)',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <InspectorPanel />
        </div>
      </div>

      {/* ZONE 6: Bottom Center Construction Dock */}
      <div
        id="hud-zone-bottom-center"
        style={{
          position: 'absolute',
          bottom: 'var(--hud-edge, 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'calc(100vw - 380px)',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <BottomToolbar />
        </div>
      </div>
    </div>
  );
};
