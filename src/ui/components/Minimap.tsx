import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../state/useUIStore';
import { ZONE_RULES } from '../../zones/ZoneTypes';
import { Compass, Minimize2, RotateCcw, RotateCw, Map } from 'lucide-react';
import { proceduralAudio } from '../../audio/ProceduralAudio';

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { engine, activeTool } = useUIStore();
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState<boolean>(false);

  const isCollapsed = isManuallyCollapsed;

  useEffect(() => {
    if (isCollapsed) return;

    let animId: number;

    const renderMinimap = () => {
      animId = requestAnimationFrame(renderMinimap);
      const canvas = canvasRef.current;
      if (!canvas || !engine) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displaySize = 168;
      if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
        canvas.width = displaySize * dpr;
        canvas.height = displaySize * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = displaySize;
      const h = displaySize;
      const worldSize = engine?.terrain?.size || 1600;
      const scale = w / (worldSize * 0.40); // Clean close-up city core scale

      // Rounded clip path for cartographic card
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(0, 0, w, h, 20);
      } else {
        ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      }
      ctx.clip();

      // Architectural crisp map background (#EEF4FA)
      ctx.fillStyle = '#EEF4FA';
      ctx.fillRect(0, 0, w, h);

      // Subtle topographic map grid lines (#DCE5EF)
      ctx.strokeStyle = '#DCE5EF';
      ctx.lineWidth = 0.5;
      const gridSize = 24;
      for (let x = gridSize; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = gridSize; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cam = engine.cameraController;
      const camTargetX = cam.target.x;
      const camTargetZ = cam.target.z;

      // Coordinate converter centered on active camera target
      const toScreenX = (worldX: number) => w / 2 + (worldX - camTargetX) * scale;
      const toScreenY = (worldZ: number) => h / 2 + (worldZ - camTargetZ) * scale;

      // 1. Render Rivers & Water Ribbon (Tropical Sky Blue: #0EA5E9)
      if (engine.riverManager) {
        ctx.strokeStyle = '#0EA5E9';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const segment of engine.riverManager.segments.values()) {
          const pts = segment.controlPoints;
          if (!pts || pts.length < 2) continue;
          ctx.lineWidth = Math.max(4, 12 * scale);
          ctx.beginPath();
          ctx.moveTo(toScreenX(pts[0].x), toScreenY(pts[0].z));
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(toScreenX(pts[i].x), toScreenY(pts[i].z));
          }
          ctx.stroke();
        }
      }

      // 2. Render Zoned Lots with Official Zone Colors
      if (engine.lotManager) {
        for (const lot of engine.lotManager.lots.values()) {
          const rule = ZONE_RULES[lot.zone];
          const color = rule ? rule.color : '#007AFF';
          ctx.fillStyle = `${color}28`;
          ctx.strokeStyle = `${color}77`;
          ctx.lineWidth = 0.8;

          const lx = toScreenX(lot.position.x);
          const ly = toScreenY(lot.position.z);
          const lw = Math.max(3, lot.width * scale);
          const ll = Math.max(3, lot.length * scale);

          ctx.fillRect(lx - lw / 2, ly - ll / 2, lw, ll);
          ctx.strokeRect(lx - lw / 2, ly - ll / 2, lw, ll);
        }
      }

      // 3. Render Roads (Crisp Slate Asphalt: #475569)
      if (engine.roadManager) {
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = Math.max(2.5, 6.5 * scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const edge of engine.roadManager.graph.edges.values()) {
          const startNode = engine.roadManager.graph.nodes.get(edge.startNodeId);
          const endNode = engine.roadManager.graph.nodes.get(edge.endNodeId);
          if (!startNode || !endNode) continue;

          const p1 = startNode.position;
          const p2 = endNode.position;

          ctx.beginPath();
          ctx.moveTo(toScreenX(p1.x), toScreenY(p1.z));
          if (edge.controlPoints && edge.controlPoints.length === 4) {
            const cp1 = edge.controlPoints[1];
            const cp2 = edge.controlPoints[2];
            ctx.bezierCurveTo(
              toScreenX(cp1.x), toScreenY(cp1.z),
              toScreenX(cp2.x), toScreenY(cp2.z),
              toScreenX(p2.x), toScreenY(p2.z)
            );
          } else {
            ctx.lineTo(toScreenX(p2.x), toScreenY(p2.z));
          }
          ctx.stroke();
        }
      }

      // 4. Render Buildings (System Blue / Terracotta Footprints)
      if (engine.buildingManager) {
        for (const bld of engine.buildingManager.buildings.values()) {
          const bx = toScreenX(bld.position.x);
          const by = toScreenY(bld.position.z);
          const bw = Math.max(2.5, bld.width * scale);
          const bl = Math.max(2.5, bld.length * scale);

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(-bld.rotationY);

          // Fill building with crisp dark slate fill and blue outline
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-bw / 2, -bl / 2, bw, bl);

          ctx.strokeStyle = '#007AFF';
          ctx.lineWidth = 0.75;
          ctx.strokeRect(-bw / 2, -bl / 2, bw, bl);

          ctx.restore();
        }
      }

      // 5. Camera Target Focus Marker (Apple System Blue Dot with Outer White Ring)
      ctx.save();
      ctx.translate(w / 2, h / 2);

      // Camera Target Indicator (Apple System Blue Dot with Outer White Ring)
      ctx.fillStyle = 'rgba(0, 122, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#007AFF';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      ctx.restore();
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine, isCollapsed]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engine || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const w = rect.width;
    const h = rect.height;
    const worldSize = engine?.terrain?.size || 1600;
    const scale = w / (worldSize * 0.40);

    const cam = engine.cameraController;
    const deltaX = (clickX - w / 2) / scale;
    const deltaZ = (clickY - h / 2) / scale;

    proceduralAudio.playTaptic('light');
    engine.cameraController.focusAt(new THREE.Vector3(cam.target.x + deltaX, 0, cam.target.z + deltaZ));
  };

  const handleResetNorth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!engine) return;
    proceduralAudio.playTaptic('light');
    engine.cameraController.resetNorth();
  };

  const handleRotateOrbit = (e: React.MouseEvent, deltaAngle: number) => {
    e.stopPropagation();
    if (!engine) return;
    proceduralAudio.playTaptic('selection');
    engine.cameraController.rotateOrbit(deltaAngle);
  };

  // Compact Collapsed Capsule Button
  if (isCollapsed) {
    return (
      <button
        className="interactive arscity-glass-bar"
        onClick={() => {
          proceduralAudio.playTaptic('light');
          setIsManuallyCollapsed(false);
        }}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12), 0 1px 2px rgba(15, 23, 42, 0.08)',
          zIndex: 'var(--z-hud)' as any,
          cursor: 'pointer',
          color: '#007AFF',
          transition: 'transform 0.15s ease',
          fontSize: '12px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          minWidth: 'max-content'
        }}
        title="Buka Peta Kota"
        aria-label="Buka Peta Kota"
      >
        <Map size={16} strokeWidth={2} />
        <span style={{ color: '#0F172A', whiteSpace: 'nowrap' }}>Peta Kota</span>
      </button>
    );
  }

  return (
    <div
      className="interactive arscity-glass-bar"
      style={{
        position: 'relative',
        width: '180px',
        height: '180px',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.95)',
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
        zIndex: 'var(--z-hud)' as any,
        padding: '6px',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Interactive True North Reset Button */}
      <button
        onClick={handleResetNorth}
        style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 122, 255, 0.12)',
          border: '1px solid rgba(0, 122, 255, 0.35)',
          borderRadius: '9999px',
          padding: '2px 10px',
          color: '#007AFF',
          fontSize: '10px',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          zIndex: 15,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(0, 122, 255, 0.12)',
          transition: 'all 0.2s ease',
          lineHeight: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
        title="Arahkan Kamera ke Utara Sejati (N)"
        aria-label="Utara Sejati"
      >
        <Compass size={11} strokeWidth={2.2} />
        <span style={{ letterSpacing: '0.02em' }}>Utara</span>
      </button>

      {/* Minimize Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          proceduralAudio.playTaptic('light');
          setIsManuallyCollapsed(true);
        }}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 16,
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)'
        }}
        title="Ciutkan Peta Kota"
        aria-label="Ciutkan Peta Kota"
      >
        <Minimize2 size={11} strokeWidth={2} />
      </button>

      {/* Camera Orbit Controls (Left & Right 45-degree rotation with Lucide Icons) */}
      <button
        onClick={(e) => handleRotateOrbit(e, -Math.PI / 4)}
        style={{
          position: 'absolute',
          top: '50%',
          left: '8px',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          color: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 15,
          padding: 0,
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)'
        }}
        title="Putar Kamera Orbit Kiri 45° (Q)"
        aria-label="Putar Kamera Kiri 45°"
      >
        <RotateCcw size={12} strokeWidth={2} />
      </button>

      <button
        onClick={(e) => handleRotateOrbit(e, Math.PI / 4)}
        style={{
          position: 'absolute',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#FFFFFF',
          border: '1px solid #CBD5E1',
          color: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 15,
          padding: 0,
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)'
        }}
        title="Putar Kamera Orbit Kanan 45° (E)"
        aria-label="Putar Kamera Kanan 45°"
      >
        <RotateCw size={12} strokeWidth={2} />
      </button>

      {/* 2D Interactive Canvas Viewport */}
      <canvas
        ref={canvasRef}
        onClick={handleMinimapClick}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '20px',
          cursor: 'pointer',
          display: 'block'
        }}
        title="Klik di mana saja pada peta untuk memindahkan kamera"
        aria-label="Tampilan Peta Kota 2D"
      />
    </div>
  );
};
