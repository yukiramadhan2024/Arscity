import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../state/useUIStore';
import { ZONE_RULES } from '../../zones/ZoneTypes';
import { Navigation } from 'lucide-react';

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { engine, resolvedTheme } = useUIStore();

  useEffect(() => {
    let animId: number;
    let sweepAngle = 0;

    const renderMinimap = () => {
      animId = requestAnimationFrame(renderMinimap);
      const canvas = canvasRef.current;
      if (!canvas || !engine) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const displaySize = 160;
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

      // Circular clip path for round radar
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
      ctx.clip();

      // Deep dark radar background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, w, h);

      // Subtle range rings
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 65, 0, Math.PI * 2);
      ctx.stroke();

      // Compass crosshairs
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
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
        ctx.strokeStyle = '#334155';
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

          ctx.fillStyle = '#64748b';
          ctx.fillRect(-bw / 2, -bl / 2, bw, bl);

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(-bw / 2, -bl / 2, bw, bl);

          ctx.restore();
        }
      }

      // 4. Subtle Radar Sweep Glow
      sweepAngle += 0.025;
      const sweepGradient = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, 70);
      sweepGradient.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
      sweepGradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 70, sweepAngle, sweepAngle + Math.PI * 0.45);
      ctx.lineTo(w / 2, h / 2);
      ctx.fill();

      // 5. Camera View Frustum Cone (Cyan Translucent)
      const eyeX = toScreenX(cam.camera.position.x);
      const eyeY = toScreenY(cam.camera.position.z);

      const fovRad = (45 * Math.PI) / 180;
      const angle = Math.atan2(h / 2 - eyeY, w / 2 - eyeX);
      const coneDist = 42;

      ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(eyeX + Math.cos(angle - fovRad / 2) * coneDist, eyeY + Math.sin(angle - fovRad / 2) * coneDist);
      ctx.lineTo(eyeX + Math.cos(angle + fovRad / 2) * coneDist, eyeY + Math.sin(angle + fovRad / 2) * coneDist);
      ctx.closePath();
      ctx.fill();

      // Sightline
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(w / 2, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // White Arrow at Center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    animId = requestAnimationFrame(renderMinimap);
    return () => cancelAnimationFrame(animId);
  }, [engine, resolvedTheme]);

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

  return (
    <div
      className="interactive"
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '24px',
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1.5px solid rgba(255, 255, 255, 0.18)',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
        zIndex: 40,
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* Interactive True North Reset Button */}
      <button
        onClick={handleResetNorth}
        style={{
          position: 'absolute',
          top: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '9999px',
          padding: '1px 7px',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          textShadow: '0 2px 6px rgba(0,0,0,0.9)',
          zIndex: 15,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          lineHeight: '14px'
        }}
        title="Orientasikan Kamera ke Utara Sejati (True North)"
        aria-label="Utara Sejati"
      >
        N
      </button>

      {/* SimCity Camera Orbit Controls (Left & Right 45-degree rotation) */}
      <button
        onClick={(e) => handleRotateOrbit(e, -Math.PI / 4)}
        style={{
          position: 'absolute',
          top: '50%',
          left: '4px',
          transform: 'translateY(-50%)',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 15,
          padding: 0
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
          right: '4px',
          transform: 'translateY(-50%)',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: '#94a3b8',
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 15,
          padding: 0
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
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          cursor: 'crosshair',
          display: 'block'
        }}
      />
    </div>
  );
};

