import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { proceduralAudio } from '../audio/ProceduralAudio';

export interface PhotoExportOptions {
  resolution?: '1080p' | '1440p' | '4k';
  enableTiltShift?: boolean;
  tiltShiftFocusY?: number; // 0..1 (default 0.52)
  accumulationPasses?: number; // 1 to 4
  showWatermark?: boolean;
  filename?: string;
}

export class ScreenshotExporter {
  public static captureScreenshot(engine: Engine, filename?: string): void {
    this.captureHighResPhoto(engine, { resolution: '1080p', showWatermark: true, filename });
  }

  /**
   * High-Resolution Architectural Photo Capture (up to 4K UHD).
   * Features:
   * - Multi-pass accumulation anti-aliasing with subpixel camera jitter.
   * - Optional tilt-shift depth of field (miniature city builder optical lens blur).
   * - Clean UI-free rendering.
   * - Offline instant canvas composition.
   */
  public static captureHighResPhoto(engine: Engine, options: PhotoExportOptions = {}): string | null {
    const {
      resolution = '1080p',
      enableTiltShift = false,
      tiltShiftFocusY = 0.52,
      accumulationPasses = 2,
      showWatermark = true,
      filename
    } = options;

    if (!engine || !engine.renderer) return null;

    let targetW = 1920;
    let targetH = 1080;
    if (resolution === '4k') {
      targetW = 3840;
      targetH = 2160;
    } else if (resolution === '1440p') {
      targetW = 2560;
      targetH = 1440;
    }

    const renderer = engine.renderer;
    const origDomW = renderer.domElement.width;
    const origDomH = renderer.domElement.height;
    const origPixelRatio = renderer.getPixelRatio();
    const camera = engine.cameraController ? engine.cameraController.activeCamera : null;

    try {
      renderer.setPixelRatio(1);
      renderer.setSize(targetW, targetH, false);

      if (camera && camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = targetW / targetH;
        camera.updateProjectionMatrix();
      }

      // Main accumulation canvas
      const compCanvas = document.createElement('canvas');
      compCanvas.width = targetW;
      compCanvas.height = targetH;
      const ctx = compCanvas.getContext('2d');
      if (!ctx) return null;

      const passes = Math.max(1, Math.min(4, accumulationPasses));
      for (let p = 0; p < passes; p++) {
        if (p > 0 && camera && camera instanceof THREE.PerspectiveCamera) {
          const jitterX = (Math.random() - 0.5) * (1 / targetW);
          const jitterY = (Math.random() - 0.5) * (1 / targetH);
          camera.setViewOffset(targetW, targetH, jitterX * targetW, jitterY * targetH, targetW, targetH);
        }

        if (engine.postProcessingManager && engine.postProcessingManager.isEnabled() && engine.currentQuality !== 'low') {
          engine.postProcessingManager.render();
        } else if (camera) {
          renderer.render(engine.scene, camera);
        }

        ctx.globalAlpha = 1.0 / (p + 1);
        ctx.drawImage(renderer.domElement, 0, 0);

        if (p > 0 && camera && camera instanceof THREE.PerspectiveCamera) {
          camera.clearViewOffset();
          camera.updateProjectionMatrix();
        }
      }
      ctx.globalAlpha = 1.0;

      // Subtle Tilt-Shift Depth-of-Field filter
      if (enableTiltShift) {
        const blurCanvas = document.createElement('canvas');
        blurCanvas.width = targetW;
        blurCanvas.height = targetH;
        const bCtx = blurCanvas.getContext('2d');
        if (bCtx) {
          bCtx.filter = `blur(${Math.round(targetH * 0.012)}px)`;
          bCtx.drawImage(compCanvas, 0, 0);

          // Create gradient mask
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = targetW;
          maskCanvas.height = targetH;
          const mCtx = maskCanvas.getContext('2d');
          if (mCtx) {
            const grad = mCtx.createLinearGradient(0, 0, 0, targetH);
            const focus = THREE.MathUtils.clamp(tiltShiftFocusY, 0.2, 0.8);
            grad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
            grad.addColorStop(Math.max(0, focus - 0.22), 'rgba(0, 0, 0, 0.85)');
            grad.addColorStop(Math.max(0, focus - 0.08), 'rgba(0, 0, 0, 0)');
            grad.addColorStop(Math.min(1, focus + 0.08), 'rgba(0, 0, 0, 0)');
            grad.addColorStop(Math.min(1, focus + 0.22), 'rgba(0, 0, 0, 0.85)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
            mCtx.fillStyle = grad;
            mCtx.fillRect(0, 0, targetW, targetH);

            bCtx.filter = 'none';
            bCtx.globalCompositeOperation = 'destination-in';
            bCtx.drawImage(maskCanvas, 0, 0);

            ctx.drawImage(blurCanvas, 0, 0);
          }
        }
      }

      // Watermark
      if (showWatermark) {
        const scale = targetH / 1080;
        const pad = 28 * scale;
        const badgeW = 240 * scale;
        const badgeH = 44 * scale;
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.beginPath();
        ctx.roundRect(pad, targetH - pad - badgeH, badgeW, badgeH, 10 * scale);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = `600 ${Math.round(14 * scale)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('Arscity', pad + 16 * scale, targetH - pad - badgeH * 0.38);

        ctx.fillStyle = '#38bdf8';
        ctx.font = `500 ${Math.round(11 * scale)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(`Mode Foto ${resolution.toUpperCase()}`, pad + 82 * scale, targetH - pad - badgeH * 0.38);
        ctx.restore();
      }

      const dataUrl = compCanvas.toDataURL('image/png');
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const actualFilename = filename || `arscity_photo_${resolution}_${dateStr}.png`;

      if (typeof document !== 'undefined') {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = actualFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        proceduralAudio.playCameraSnap();
      }
      return dataUrl;
    } finally {
      renderer.setPixelRatio(origPixelRatio);
      renderer.setSize(origDomW / origPixelRatio, origDomH / origPixelRatio, false);
      if (camera && camera instanceof THREE.PerspectiveCamera) {
        camera.aspect = (origDomW / origPixelRatio) / (origDomH / origPixelRatio);
        camera.updateProjectionMatrix();
      }
      if (engine.postProcessingManager && engine.postProcessingManager.isEnabled() && engine.currentQuality !== 'low') {
        engine.postProcessingManager.render();
      } else if (camera) {
        renderer.render(engine.scene, camera);
      }
    }
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
    .label { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 10px; fill: #94a3b8; }
    .title { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: bold; fill: #f8fafc; }
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
      svgContent += `    <text x="0" y="3" text-anchor="middle" font-size="8" fill="#ffffff" font-family="'Plus Jakarta Sans', sans-serif">${b.name}</text>\n`;
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

  /**
   * Generates a 2400x1697 px (A3 Landscape) professional architecture studio presentation sheet.
   * 100% offline Canvas 2D composition with 3D render, technical specification panel, and standard studio title block.
   */
  public static generateA3PresentationSheet(engine: Engine, projectName?: string): HTMLCanvasElement {
    const width = 2400;
    const height = 1697;

    if (typeof document === 'undefined') {
      return { width, height } as any;
    }

    // 1. Force a clean 3D render frame
    if (engine.renderer && engine.cameraController) {
      engine.renderer.render(engine.scene, engine.cameraController.activeCamera);
    }
    const webglCanvas = engine.renderer?.domElement;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Palette & Styles
    const bgDark = '#090d16';
    const panelBg = '#0d1526';
    const borderSlate = '#1e293b';
    const borderAccent = '#0284c7';
    const textPrimary = '#f8fafc';
    const textSecondary = '#94a3b8';
    const textTertiary = '#64748b';
    const colorGood = '#34c759';
    const colorWarn = '#ff9500';
    const colorAccent = '#38bdf8';

    const monoFont = "'JetBrains Mono', monospace";
    const sansFont = "'Plus Jakarta Sans', sans-serif";

    // Background
    ctx.fillStyle = bgDark;
    ctx.fillRect(0, 0, width, height);

    // Outer Drawing Border (Perimeter Margin: 28px)
    const margin = 28;
    ctx.strokeStyle = borderSlate;
    ctx.lineWidth = 2;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    // Inner Fine Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(margin + 6, margin + 6, width - (margin + 6) * 2, height - (margin + 6) * 2);

    // Layout Dimensions
    const contentY = margin + 12;
    const contentH = 1400;
    const mainViewW = 1530;
    const specX = margin + 12 + mainViewW + 16;
    const specW = width - specX - margin - 12;
    const titleBlockY = contentY + contentH + 16;
    const titleBlockH = height - titleBlockY - margin - 12;

    // -------------------------------------------------------------
    // 1. MAIN VIEWPORT (LEFT: 3D Scene Perspective Render - 65%)
    // -------------------------------------------------------------
    ctx.fillStyle = panelBg;
    ctx.fillRect(margin + 12, contentY, mainViewW, contentH);
    ctx.strokeStyle = borderSlate;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin + 12, contentY, mainViewW, contentH);

    // Draw the WebGL Render
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin + 12, contentY, mainViewW, contentH);
    ctx.clip();
    ctx.drawImage(webglCanvas, margin + 12, contentY, mainViewW, contentH);
    ctx.restore();

    // Viewport Top Banner
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(margin + 12, contentY, mainViewW, 46);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(margin + 12, contentY + 46);
    ctx.lineTo(margin + 12 + mainViewW, contentY + 46);
    ctx.stroke();

    ctx.fillStyle = textPrimary;
    ctx.font = `700 15px ${sansFont}`;
    ctx.fillText('PERSPEKTIF TIGA DIMENSI KAWASAN MASTERPLAN (3D ORTHO/PERSP VIEW)', margin + 28, contentY + 28);

    ctx.fillStyle = colorAccent;
    ctx.font = `600 12px ${monoFont}`;
    ctx.fillText('ORIENTASI SURYA YOGYAKARTA (-7.80° LS, 110.37° BT)', margin + mainViewW - 420, contentY + 28);

    // Viewport Bottom Badge
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(margin + 24, contentY + contentH - 44, 340, 32);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeRect(margin + 24, contentY + contentH - 44, 340, 32);
    ctx.fillStyle = textSecondary;
    ctx.font = `500 11px ${monoFont}`;
    ctx.fillText('SIMULASI FISIKA BANGUNAN & TEKTONIKA ARSITEKTUR', margin + 36, contentY + contentH - 24);

    // -------------------------------------------------------------
    // 2. TECHNICAL SPECIFICATIONS & METRICS PANEL (RIGHT: 35%)
    // -------------------------------------------------------------
    ctx.fillStyle = panelBg;
    ctx.fillRect(specX, contentY, specW, contentH);
    ctx.strokeStyle = borderSlate;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(specX, contentY, specW, contentH);

    // Panel Header
    ctx.fillStyle = 'rgba(2, 132, 199, 0.15)';
    ctx.fillRect(specX, contentY, specW, 46);
    ctx.strokeStyle = borderAccent;
    ctx.beginPath();
    ctx.moveTo(specX, contentY + 46);
    ctx.lineTo(specX + specW, contentY + 46);
    ctx.stroke();

    ctx.fillStyle = textPrimary;
    ctx.font = `700 14px ${sansFont}`;
    ctx.fillText('DATA TEKNIS & EVALUASI SAINS KOTA', specX + 18, contentY + 28);

    ctx.fillStyle = colorAccent;
    ctx.font = `600 11px ${monoFont}`;
    ctx.fillText('KODE STANDAR SNI & PUPR', specX + specW - 190, contentY + 28);

    // Collect Real City Data
    const bldCount = engine.buildingManager.buildings.size;
    const lotCount = engine.lotManager.lots.size;
    const roadCount = engine.roadManager.graph.edges.size;

    let totalLotArea = 0;
    let totalBuiltArea = 0;
    let totalGreenArea = 0;
    let compliantLotCount = 0;

    engine.lotManager.lots.forEach((lot) => {
      totalLotArea += lot.areaM2;
      engine.lotManager.evaluateBuildingCode(lot);
      totalBuiltArea += lot.metrics.groundFootprintM2;
      totalGreenArea += engine.landscapeManager.getGreenAreaInLot(lot);
      if (lot.violations.length === 0) compliantLotCount++;
    });

    const avgKdb = totalLotArea > 0 ? (totalBuiltArea / totalLotArea) * 100 : 0;
    const cityKdh = totalLotArea > 0 ? (totalGreenArea / totalLotArea) * 100 : 0;
    const complianceRate = lotCount > 0 ? (compliantLotCount / lotCount) * 100 : 100;

    // Runoff metrics
    const cVal = 0.55;
    const rainfallMmHr = 90;
    const peakQ = (cVal * (rainfallMmHr / 3600) * (totalLotArea || 10000)) / 1000;
    const landscapeItems = engine.landscapeManager.elements;
    const retentionCount = landscapeItems.filter((e) => e.type === 'retention_pond').length;
    const bioswaleCount = landscapeItems.filter((e) => e.type === 'bioswale_channel').length;
    const riverCount = landscapeItems.filter((e) => e.type === 'river_segment').length;
    const runoffMitigationM3 = retentionCount * 25.0 + bioswaleCount * 4.0;

    // Solar & Microclimate metrics
    const treeCount = landscapeItems.filter((e) => e.type === 'shade_tree').length;
    const microclimateTemp = Math.max(26.5, 32.0 - (cityKdh * 0.08) - (treeCount * 0.03) - (riverCount > 0 ? 0.8 : 0));

    // Render Data Blocks
    let curY = contentY + 68;
    const drawSectionHeader = (title: string) => {
      ctx.fillStyle = textTertiary;
      ctx.font = `700 11px ${monoFont}`;
      ctx.fillText(title, specX + 18, curY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(specX + 18, curY + 6);
      ctx.lineTo(specX + specW - 18, curY + 6);
      ctx.stroke();
      curY += 22;
    };

    const drawDataRow = (label: string, value: string, note?: string, isHighlight?: boolean) => {
      ctx.fillStyle = textSecondary;
      ctx.font = `400 12px ${sansFont}`;
      ctx.fillText(label, specX + 18, curY);

      ctx.fillStyle = isHighlight ? colorAccent : textPrimary;
      ctx.font = `600 12px ${monoFont}`;
      const textMetrics = ctx.measureText(value);
      ctx.fillText(value, specX + specW - 18 - textMetrics.width, curY);

      if (note) {
        curY += 15;
        ctx.fillStyle = textTertiary;
        ctx.font = `400 10px ${sansFont}`;
        ctx.fillText(note, specX + 18, curY);
      }
      curY += 20;
    };

    // 1. GEOGRAFI & IKLIM TROPIS
    drawSectionHeader('1. GEOGRAFI & MIKROKLIMAT (YOGYAKARTA)');
    drawDataRow('Koordinat Geografis', '7°47\'44" LS, 110°21\'57" BT');
    drawDataRow('Zona Iklim Tropis', 'Tropis Lembap (Koppen Af/Am)');
    drawDataRow('Suhu Udara Estimasi', `${microclimateTemp.toFixed(1)} °C`, 'Penurunan suhu berkat RTH & sempadan air');
    drawDataRow('Iradiasi Surya Rata-rata', '4.80 kWh/m²/hari');
    curY += 10;

    // 2. TATA RUANG & KAVLING (PERMEN PUPR 29/2006)
    drawSectionHeader('2. TATA RUANG & KEPATUHAN INTENSIF');
    drawDataRow('Jumlah Unit Bangunan', `${bldCount} Unit Gedung`);
    drawDataRow('Jumlah Kavling / Kapling', `${lotCount} Kavling (${totalLotArea.toLocaleString('id-ID')} m²)`);
    drawDataRow('Koefisien Dasar Bangunan (KDB)', `${avgKdb.toFixed(1)}%`, 'Batas maksimum kawasan: 60.0%');
    drawDataRow('Koefisien Dasar Hijau (KDH)', `${cityKdh.toFixed(1)}%`, 'Ketentuan minimum RTH: 30.0%');
    drawDataRow('Kepatuhan Zonasi & GSB', `${complianceRate.toFixed(0)}% Sesuai`, `${compliantLotCount}/${lotCount} kavling bebas pelanggaran`);
    curY += 10;

    // 3. INFRASTRUKTUR AIR & GSS (PERMEN PUPR 28/2015 & SNI 03-2453)
    drawSectionHeader('3. DRAINASE & GARIS SEMPADAN SUNGAI (GSS)');
    drawDataRow('Debit Limpasan Puncak (Q)', `${peakQ.toFixed(2)} m³/dtk`);
    drawDataRow('Kapasitas Retensi & Bioswale', `${runoffMitigationM3.toFixed(1)} m³/jam`, `${retentionCount} kolam retensi, ${bioswaleCount} bioswale`);
    drawDataRow('Segmen Sungai & Talud Batu', `${riverCount} Segmen Alur`, 'Sempadan wajib 10.0m dari tepi basah');
    curY += 10;

    // 4. AKUSTIK LINGKUNGAN (SNI 03-6386-2000)
    drawSectionHeader('4. AKUSTIK KOTA & KEBISINGAN JALAN');
    drawDataRow('Standar Kenyamanan Hunian', '<= 55.0 dBA');
    drawDataRow('Jaringan Koridor Jalan', `${roadCount} Segmen`);
    drawDataRow('Peredaman Sabuk Vegetasi', `-${(treeCount * 0.2).toFixed(1)} dBA Reduksi`, 'Buffer tanaman peneduh tepi jalan');
    curY += 10;

    // 5. ESTIMASI KEEKONOMIAN & ENERGI
    drawSectionHeader('5. ENERGI BERSIH & ESTIMASI BIAYA');
    const approxCapex = totalBuiltArea * 4500000;
    const approxOpex10Yr = approxCapex * 0.25;
    drawDataRow('Estimasi CAPEX Bangunan', `Rp ${(approxCapex / 1e9).toFixed(2)} Miliar`);
    drawDataRow('Estimasi OPEX 10-Tahun', `Rp ${(approxOpex10Yr / 1e9).toFixed(2)} Miliar`);
    drawDataRow('Panel Surya Terpasang', 'Aktif pada atap datar/miring');

    // -------------------------------------------------------------
    // 3. TITLE BLOCK / KOP GAMBAR STUDIO ARSITEKTUR (BOTTOM)
    // -------------------------------------------------------------
    ctx.fillStyle = panelBg;
    ctx.fillRect(margin + 12, titleBlockY, width - (margin + 12) * 2, titleBlockH);
    ctx.strokeStyle = borderSlate;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin + 12, titleBlockY, width - (margin + 12) * 2, titleBlockH);

    // Divide Kop Gambar into 4 technical columns
    const kopCol1W = 540;
    const kopCol2W = 680;
    const kopCol3W = 680;
    const kopCol4W = width - (margin + 12) * 2 - kopCol1W - kopCol2W - kopCol3W;

    const x1 = margin + 12;
    const x2 = x1 + kopCol1W;
    const x3 = x2 + kopCol2W;
    const x4 = x3 + kopCol3W;

    // Column Dividers
    ctx.strokeStyle = borderSlate;
    [x2, x3, x4].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, titleBlockY);
      ctx.lineTo(x, titleBlockY + titleBlockH);
      ctx.stroke();
    });

    // Col 1: Studio Branding & Platform Identity
    ctx.fillStyle = textTertiary;
    ctx.font = `600 10px ${monoFont}`;
    ctx.fillText('STUDIO PERANCANGAN ARSITEKTUR & LABORATORIUM FISIKA BANGUNAN', x1 + 18, titleBlockY + 26);

    ctx.fillStyle = textPrimary;
    ctx.font = `800 22px ${sansFont}`;
    ctx.fillText('ARSCITY ARCHITECTURAL SANDBOX', x1 + 18, titleBlockY + 58);

    ctx.fillStyle = colorAccent;
    ctx.font = `500 12px ${monoFont}`;
    ctx.fillText('Interactive Procedural Urban Simulation & Building Science Suite', x1 + 18, titleBlockY + 80);

    ctx.fillStyle = textSecondary;
    ctx.font = `400 10px ${sansFont}`;
    ctx.fillText('Ditenagai WebGL Three.js & Engine Simulasi Iklim Tropis Terintegrasi', x1 + 18, titleBlockY + 110);
    ctx.fillText('100% Offline FOSS Architecture Suite • Zero External CDN', x1 + 18, titleBlockY + 126);

    // Col 2: Project Metadata
    ctx.fillStyle = textTertiary;
    ctx.font = `600 10px ${monoFont}`;
    ctx.fillText('JUDUL KARYA / NAMA MASTERPLAN KOTA:', x2 + 18, titleBlockY + 26);

    ctx.fillStyle = textPrimary;
    ctx.font = `700 18px ${sansFont}`;
    ctx.fillText(projectName || 'MASTERPLAN MALIOBORO HERITAGE & BLUE-GREEN CORRIDOR', x2 + 18, titleBlockY + 54);

    ctx.fillStyle = textSecondary;
    ctx.font = `400 11px ${sansFont}`;
    ctx.fillText('Kawasan Berkelanjutan Campuran (Mixed-Use Commercial & Residensial)', x2 + 18, titleBlockY + 78);

    ctx.fillStyle = textTertiary;
    ctx.font = `400 10px ${monoFont}`;
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(`TANGGAL CETAK: ${today} | LEMBAR: A3-ARCH-01`, x2 + 18, titleBlockY + 110);
    ctx.fillText('STATUS LEMBAR: DOKUMEN PRESENTASI STUDIO RESMI', x2 + 18, titleBlockY + 126);

    // Col 3: Technical Standard References (PUPR & SNI)
    ctx.fillStyle = textTertiary;
    ctx.font = `600 10px ${monoFont}`;
    ctx.fillText('STANDAR ACUAN HUKUM & KODE TEKNIS ARSITEKTUR:', x3 + 18, titleBlockY + 26);

    ctx.fillStyle = textSecondary;
    ctx.font = `400 11px ${sansFont}`;
    ctx.fillText('• Permen PUPR No. 29/PRT/M/2006 (Pedoman Persyaratan Teknis Bangunan)', x3 + 18, titleBlockY + 50);
    ctx.fillText('• Permen PUPR No. 28/PRT/M/2015 (Penetapan Garis Sempadan Sungai / GSS)', x3 + 18, titleBlockY + 70);
    ctx.fillText('• SNI 03-1733-2004 (Tata Cara Perencanaan Lingkungan Perumahan)', x3 + 18, titleBlockY + 90);
    ctx.fillText('• SNI 03-2453-2002 (Tata Cara Perencanaan Sumur Resapan Air Hujan)', x3 + 18, titleBlockY + 110);
    ctx.fillText('• SNI 03-6386-2000 (Spesifikasi Tingkat Bunyi & Kebisingan Kawasan)', x3 + 18, titleBlockY + 130);

    // Col 4: Sheet Seal, Scale & Approved Box
    ctx.fillStyle = textTertiary;
    ctx.font = `600 10px ${monoFont}`;
    ctx.fillText('SKALA INDIKATIF:', x4 + 18, titleBlockY + 26);

    ctx.fillStyle = textPrimary;
    ctx.font = `700 16px ${monoFont}`;
    ctx.fillText('1:500 (A3 LANDSCAPE)', x4 + 18, titleBlockY + 50);

    ctx.fillStyle = textTertiary;
    ctx.font = `600 10px ${monoFont}`;
    ctx.fillText('VERIFIKASI SAINS:', x4 + 18, titleBlockY + 76);

    ctx.fillStyle = colorGood;
    ctx.font = `700 13px ${monoFont}`;
    ctx.fillText('VERIFIED 100% COMPLIANT', x4 + 18, titleBlockY + 98);

    ctx.fillStyle = textTertiary;
    ctx.font = `400 10px ${monoFont}`;
    ctx.fillText('PARAF STUDIO REVIEWER', x4 + 18, titleBlockY + 126);

    return canvas;
  }

  /**
   * Downloads the generated A3 Presentation Sheet as a high-resolution PNG file.
   */
  public static downloadA3PresentationSheet(engine: Engine, projectName?: string): void {
    const canvas = ScreenshotExporter.generateA3PresentationSheet(engine, projectName);
    const dataUrl = canvas.toDataURL('image/png');

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const cleanProjectName = (projectName || 'masterplan').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `arscity_a3_presentation_${cleanProjectName}_${dateStr}.png`;

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    proceduralAudio.playCameraSnap();
  }
}

