import { Engine } from '../core/engine/Engine';
import { proceduralAudio } from '../audio/ProceduralAudio';

export class ScreenshotExporter {
  public static captureScreenshot(engine: Engine, filename?: string): void {
    // Render an immediate frame
    engine.renderer.render(engine.scene, engine.cameraController.activeCamera);
    const canvas = engine.renderer.domElement;

    // Create a 2D composite canvas with brand watermark
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = canvas.width;
    compositeCanvas.height = canvas.height;
    const ctx = compositeCanvas.getContext('2d');
    if (!ctx) return;

    // Draw 3D scene
    ctx.drawImage(canvas, 0, 0);

    // Draw Watermark Badge
    const pad = 24;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    ctx.roundRect(pad, compositeCanvas.height - 64, 220, 40, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('Arscity', pad + 14, compositeCanvas.height - 39);

    ctx.fillStyle = '#007aff';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillText('Tata Kota & Arsitektur', pad + 70, compositeCanvas.height - 39);
    ctx.restore();

    // Trigger download
    const dataUrl = compositeCanvas.toDataURL('image/png');
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const actualFilename = filename || `arscity_photo_${dateStr}.png`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = actualFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    proceduralAudio.playCameraSnap();
  }

  public static exportFloorPlanToSvg(engine: Engine): void {
    // 2D Blueprint SVG Exporter (512x512m map)
    const mapSize = 512;
    const svgSize = 1024;
    const scale = svgSize / mapSize;
    const offset = mapSize / 2;

    const toSvgCoord = (x: number, z: number): [number, number] => {
      const sx = (x + offset) * scale;
      const sy = (z + offset) * scale;
      return [sx, sy];
    };

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${svgSize}" height="${svgSize}">
  <style>
    .bg { fill: #0f172a; }
    .grid { stroke: rgba(255,255,255,0.06); stroke-width: 1; }
    .lot { stroke-width: 2; fill-opacity: 0.15; stroke-dasharray: 4 4; }
    .road { stroke: #334155; fill: none; stroke-linecap: round; }
    .road-center { stroke: #f8fafc; stroke-width: 1.5; stroke-dasharray: 6 6; fill: none; }
    .building { fill: #0284c7; stroke: #38bdf8; stroke-width: 1.5; }
    .label { font-family: sans-serif; font-size: 10px; fill: #94a3b8; }
    .title { font-family: sans-serif; font-size: 18px; font-weight: bold; fill: #f8fafc; }
  </style>
  <rect width="${svgSize}" height="${svgSize}" class="bg" />
`;

    // 1. Lots
    engine.lotManager.lots.forEach((lot) => {
      const hw = lot.width / 2;
      const hl = lot.length / 2;
      const [x1, y1] = toSvgCoord(lot.position.x - hw, lot.position.z - hl);
      const [w, h] = [lot.width * scale, lot.length * scale];
      const strokeCol = lot.zone === 'residential' ? '#10b981' : lot.zone === 'commercial' ? '#3b82f6' : '#a855f7';
      svgContent += `  <rect x="${x1}" y="${y1}" width="${w}" height="${h}" class="lot" stroke="${strokeCol}" fill="${strokeCol}" />\n`;
      svgContent += `  <text x="${x1 + 6}" y="${y1 + 14}" class="label">${lot.name} (${lot.areaM2}m²)</text>\n`;
    });

    // 2. Roads
    engine.roadManager.graph.edges.forEach((edge) => {
      const [x1, y1] = toSvgCoord(edge.controlPoints[0].x, edge.controlPoints[0].z);
      const [x2, y2] = toSvgCoord(edge.controlPoints[3].x, edge.controlPoints[3].z);
      svgContent += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="road" stroke-width="20" />\n`;
      svgContent += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="road-center" />\n`;
    });

    // 3. Buildings
    engine.buildingManager.buildings.forEach((b) => {
      const hw = b.width / 2;
      const hl = b.length / 2;
      const [cx, cy] = toSvgCoord(b.position.x, b.position.z);
      const bw = b.width * scale;
      const bl = b.length * scale;
      const rotDeg = (-b.rotationY * 180) / Math.PI;

      svgContent += `  <g transform="translate(${cx}, ${cy}) rotate(${rotDeg})">\n`;
      svgContent += `    <rect x="${-bw / 2}" y="${-bl / 2}" width="${bw}" height="${bl}" class="building" />\n`;
      svgContent += `    <text x="0" y="3" text-anchor="middle" font-size="8" fill="#ffffff" font-family="sans-serif">${b.name}</text>\n`;
      svgContent += `  </g>\n`;
    });

    // Title banner
    svgContent += `  <text x="24" y="36" class="title">ARSCITY • DENAH TATA KOTA & KAVLING 2D</text>\n`;
    svgContent += `  <text x="24" y="52" class="label">Skala 1:${(mapSize / 10).toFixed(0)} • Koordinat Yogyakarta (-7.8° LS)</text>\n`;
    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arscity_denah_2d_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
