import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../state/useUIStore';
import { ZONE_RULES } from '../../zones/ZoneTypes';
import { Compass, Minimize2 } from 'lucide-react';

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { engine, resolvedTheme, activeTool } = useUIStore();
  const [isManuallyCollapsed, setIsManuallyCollapsed] = useState<boolean>(false);

  // Auto-collapse when Analysis Lab is active to prevent left-side overlap
  const isAutoCollapsed = activeTool === 'analyze';
  const isCollapsed = isManuallyCollapsed || isAutoCollapsed;

  useEffect(() => {
    if (isCollapsed) return;

    let animId: number;
    let sweepAngle = 0;

    const renderMinimap = () => {
      animId = requestAnimationFrame(renderMinimap);
      const canvas = canvasRef.current;
      if (!canvas || !engine) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displaySize = 156;
      if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
        canvas.width = displaySize * dpr;
        canvas.height = displaySize * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = displaySize;
      const h = displaySize;
      const worldSize = engine?.terrain?.size || 1600;
      const scale = w / (worldSize * 0.45); // Centered close-up zoom around city core

      const isDark = resolvedTheme === 'dark';

      // Rounded clip path for Laboratorium Analisis card
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(0, 0, w, h, 20);
      } else {
        ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      }
      ctx.clip();

      // Deep dark / clean light minimap background
      ctx.fillStyle = isDark ? '#0F172A' : '#F1F5F9';
      ctx.fillRect(0, 0, w, h);

      // Subtle range rings
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 65, 0, Math.PI * 2);
      ctx.stroke();

      // Compass crosshairs
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(15, 23, 42, 0.12)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(w / 2, 4);
      ctx.lineTo(w / 2, h - 4);
      ctx.moveTo(4, h / 2);
      ctx.lineTo(w - 4, h / 2);
      ctx.stroke();

      const cam = engine.cameraController;
      const camTargetX = cam.target.x;
      const camTargetZ = cam.target.z;

      // Coordinate converter centered on active camera target
      const toScreenX = (worldX: number) => w / 2 + (worldX - camTargetX) * scale;
      const toScreenY = (worldZ: number) => h / 2 + (worldZ - camTargetZ) * scale;

      // 1. Render Zoned Lots (Muted Slate / Blue Tint)
      if (engine.lotManager) {
        for (const lot of engine.lotManager.lots.values()) {
          const rule = ZONE_RULES[lot.zone];
          const color = rule ? rule.color : '#38bdf8';
          ctx.fillStyle = `${color}25`;
          ctx.strokeStyle = `${color}55`;
          ctx.lineWidth = 0.8;

          const lx = toScreenX(lot.position.x);
          const ly = toScreenY(lot.position.z);
          const lw = Math.max(3, lot.width * scale);
          const ll = Math.max(3, lot.length * scale);

          ctx.fillRect(lx - lw / 2, ly - ll / 2, lw, ll);
          ctx.strokeRect(lx - lw / 2, ly - ll / 2, lw, ll);
        }
      }

      // 2. Render Roads (Muted Blue-Gray)
      if (engine.roadManager) {
        ctx.strokeStyle = isDark ? '#334155' : '#94a3b8';
        ctx.lineWidth = Math.max(2.5, 7 * scale);
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

      // 3. Render Buildings (Muted Blue-White Outlines)
      if (engine.buildingManager) {
        for (const bld of engine.buildingManager.buildings.values()) {
          const bx = toScreenX(bld.position.x);
          const by = toScreenY(bld.position.z);
          const bw = bld.width * scale;
          const bl = bld.length * scale;

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(-bld.rotationY);

          ctx.fillStyle = isDark ? '#64748b' : '#cbd5e1';
          ctx.fillRect(-bw / 2, -bl / 2, bw, bl);

          ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-bw / 2, -bl / 2, bw, bl);

          ctx.restore();
        }
      }

      // 4. Titik Posisi Pusat Pemain (Clean 2D Static Indicator)
      ctx.fillStyle = 'rgba(0, 122, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#007AFF';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine, resolvedTheme, isCollapsed]);

  const handleMinimapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engine || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const w = rect.width;
    const h = rect.height;
    const worldSize = engine?.terrain?.size || 1600;
    const scale = w / (worldSize * 0.45);

    const cam = engine.cameraController;
    const deltaX = (clickX - w / 2) / scale;
    const deltaZ = (clickY - h / 2) / scale;

    engine.cameraController.focusAt(new THREE.Vector3(cam.target.x + deltaX, 0, cam.target.z + deltaZ));
  };

  const handleResetNorth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!engine) return;
    engine.cameraController.resetNorth();
  };

  const handleRotateOrbit = (e: React.MouseEvent, deltaAngle: number) => {
    e.stopPropagation();
    if (!engine) return;
    engine.cameraController.rotateOrbit(deltaAngle);
  };

  // Compact Collapsed Capsule Button
  if (isCollapsed) {
    return (
      <button
        className="interactive"
        onClick={() => setIsManuallyCollapsed(false)}
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          width: '46px',
          height: '46px',
          borderRadius: '20px',
          background: 'rgba(235, 242, 250, 0.75)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: '1.5px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
          zIndex: 'var(--z-hud)' as any,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: '#007AFF',
          transition: 'transform 0.15s ease'
        }}
        title="Buka Minimap"
        aria-label="Buka Minimap"
      >
        <Compass size={22} strokeWidth={2} />
      </button>
    );
  }

  return (
    <div
      className="interactive"
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        width: '168px',
        height: '168px',
        borderRadius: '28px',
        background: 'rgba(235, 242, 250, 0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '1.5px solid rgba(255, 255, 255, 0.85)',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.15)',
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
          background: 'rgba(10, 132, 255, 0.14)',
          border: '1px solid rgba(10, 132, 255, 0.3)',
          borderRadius: '9999px',
          padding: '2px 8px',
          color: '#007AFF',
          fontSize: '11px',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          zIndex: 15,
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(10, 132, 255, 0.12)',
          transition: 'all 0.2s ease',
          lineHeight: '14px'
        }}
        title="Orientasikan Kamera ke Utara Sejati (True North)"
        aria-label="Utara Sejati"
      >
        N
      </button>

      {/* Minimize Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsManuallyCollapsed(true);
        }}
        style={{
          position: 'absolute',
          top: '10px',
          right: '12px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 16
        }}
        title="Ciutkan Minimap"
        aria-label="Ciutkan Minimap"
      >
        <Minimize2 size={11} />
      </button>

      {/* SimCity Camera Orbit Controls (Left & Right 45-degree rotation) */}
      <button
        onClick={(e) => handleRotateOrbit(e, -Math.PI / 4)}
        style={{
          position: 'absolute',
          top: '50%',
          left: '8px',
          transform: 'translateY(-50%)',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          color: '#0F172A',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 15,
          padding: 0,
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)'
        }}
        title="Putar Kamera 45° Berlawanan Jarum Jam (Q)"
        aria-label="Putar Kiri"
      >
        &lt;
      </button>

      <button
        onClick={(e) => handleRotateOrbit(e, Math.PI / 4)}
        style={{
          position: 'absolute',
          top: '50%',
          right: '8px',
          transform: 'translateY(-50%)',
          width: '22px',
          height: '22px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.82)',
          border: '1px solid rgba(255, 255, 255, 0.9)',
          color: '#0F172A',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 15,
          padding: 0,
          boxShadow: '0 1px 4px rgba(15, 23, 42, 0.08)'
        }}
        title="Putar Kamera 45° Searah Jarum Jam (E)"
        aria-label="Putar Kanan"
      >
        &gt;
      </button>

      <canvas
        ref={canvasRef}
        onClick={handleMinimapClick}
        style={{
          width: '156px',
          height: '156px',
          borderRadius: '22px',
          cursor: 'crosshair',
          display: 'block'
        }}
      />
    </div>
  );
};
