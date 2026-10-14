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
      const displaySize = 140;
      if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
        canvas.width = displaySize * dpr;
        canvas.height = displaySize * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = displaySize;
      const h = displaySize;
      const worldSize = 512;
      const scale = w / worldSize;

      const isDark = resolvedTheme === 'dark';

      // Blueprint surface background
      ctx.fillStyle = isDark ? '#141416' : '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Subtle architectural grid (64m grid lines in world)
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
      ctx.lineWidth = 0.5;
      const step = 64 * scale;
      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Origin axes
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, h);
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      const toScreenX = (worldX: number) => (worldX + worldSize / 2) * scale;
      const toScreenY = (worldZ: number) => (worldZ + worldSize / 2) * scale;

      // 1. Render Zoned Lots
      if (engine.lotManager) {
        for (const lot of engine.lotManager.lots.values()) {
          const rule = ZONE_RULES[lot.zone];
          const color = rule ? rule.color : '#10b981';
          ctx.fillStyle = isDark ? `${color}33` : `${color}40`; // Translucent tint
          ctx.strokeStyle = color;
          ctx.lineWidth = 0.8;

          const lx = toScreenX(lot.position.x);
          const ly = toScreenY(lot.position.z);
          const lw = Math.max(4, lot.width * scale);
          const ll = Math.max(4, lot.length * scale);

          ctx.fillRect(lx - lw / 2, ly - ll / 2, lw, ll);
          ctx.strokeRect(lx - lw / 2, ly - ll / 2, lw, ll);
        }
      }

      // 2. Render Roads
      if (engine.roadManager) {
        ctx.strokeStyle = isDark ? '#383a42' : '#94a3b8';
        ctx.lineWidth = Math.max(2, 8 * scale);
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

      // 3. Render Buildings
      if (engine.buildingManager) {
        for (const bld of engine.buildingManager.buildings.values()) {
          const bx = toScreenX(bld.position.x);
          const by = toScreenY(bld.position.z);
          const bw = bld.width * scale;
          const bl = bld.length * scale;

          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(-bld.rotationY);

          // Building footprint fill & border
          ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.fillRect(-bw / 2, -bl / 2, bw, bl);

          // Roof highlight line
          ctx.fillStyle = '#007aff';
          ctx.fillRect(-bw / 2, -bl / 2, Math.max(1, bw * 0.25), bl);

          ctx.restore();
        }
      }

      // 4. Subtle Animated Radar Sweep
      sweepAngle += 0.02;
      const cam = engine.cameraController;
      const targetX = toScreenX(cam.target.x);
      const targetY = toScreenY(cam.target.z);

      const sweepGradient = ctx.createRadialGradient(targetX, targetY, 2, targetX, targetY, 40);
      sweepGradient.addColorStop(0, isDark ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.15)');
      sweepGradient.addColorStop(1, 'rgba(0, 122, 255, 0)');

      ctx.fillStyle = sweepGradient;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 40, sweepAngle, sweepAngle + Math.PI * 0.5);
      ctx.lineTo(targetX, targetY);
      ctx.fill();

      // 5. Camera View Frustum Cone
      const eyeX = toScreenX(cam.camera.position.x);
      const eyeY = toScreenY(cam.camera.position.z);

      const fovRad = (40 * Math.PI) / 180;
      const angle = Math.atan2(targetY - eyeY, targetX - eyeX);
      const coneDist = 36;

      ctx.fillStyle = isDark ? 'rgba(0, 122, 255, 0.20)' : 'rgba(0, 122, 255, 0.14)';
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(eyeX + Math.cos(angle - fovRad / 2) * coneDist, eyeY + Math.sin(angle - fovRad / 2) * coneDist);
      ctx.lineTo(eyeX + Math.cos(angle + fovRad / 2) * coneDist, eyeY + Math.sin(angle + fovRad / 2) * coneDist);
      ctx.closePath();
      ctx.fill();

      // View sightline
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(eyeX, eyeY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Camera Eye Point
      ctx.fillStyle = isDark ? '#ffffff' : '#000000';
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Camera Target Focal Point (Active Reticle)
      ctx.strokeStyle = '#007aff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#007aff';
      ctx.beginPath();
      ctx.arc(targetX, targetY, 1.8, 0, Math.PI * 2);
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
    const worldSize = 512;
    // Map click from canvas [0, w] to world [-worldSize/2, worldSize/2]
    const worldX = (clickX / w) * worldSize - worldSize / 2;
    const worldZ = (clickY / w) * worldSize - worldSize / 2;

    // Focus camera directly at world coordinate (Fixes the pan bug!)
    engine.cameraController.focusAt(new THREE.Vector3(worldX, 0, worldZ));
  };

  const targetX = engine ? Math.round(engine.cameraController.target.x) : 0;
  const targetZ = engine ? Math.round(engine.cameraController.target.z) : 0;

  return (
    <div className="interactive minimap-wrapper">
      <div className="glass-surface minimap-card" style={{ padding: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px 6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Navigation size={11} strokeWidth={2.5} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--label)', letterSpacing: '0.04em' }}>
              RADAR KOTA
            </span>
          </div>
          <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--label-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            X:{targetX > 0 ? `+${targetX}` : targetX} Z:{targetZ > 0 ? `+${targetZ}` : targetZ}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          onClick={handleMinimapClick}
          style={{
            width: '140px',
            height: '140px',
            borderRadius: '12px',
            cursor: 'crosshair',
            display: 'block',
            border: '0.5px solid var(--separator)'
          }}
        />
      </div>
    </div>
  );
};
