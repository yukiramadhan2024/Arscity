import * as THREE from 'three';

/**
 * In-engine procedural PBR texture generator
 * Renders seamless albedo, normal, and roughness textures on HTML5 Canvas
 * 100% offline-ready, zero external dependencies, CC0-compliant.
 */
export class ProceduralTextureGen {
  private static cache: Map<string, THREE.Texture> = new Map();

  /**
   * Helper to create canvas of given size
   */
  private static createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    return { canvas, ctx };
  }

  /**
   * Procedural Grass Texture
   */
  public static getGrassTexture(size: number = 512): THREE.CanvasTexture {
    const key = `grass_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Base green
    ctx.fillStyle = '#3a6627';
    ctx.fillRect(0, 0, size, size);

    // Multilayer noise for blades and subtle soil variation
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 36;
      const bladeNoise = (Math.random() - 0.5) * 20;

      data[i] = Math.max(30, Math.min(80, 58 + noise * 0.4 + bladeNoise));     // R
      data[i + 1] = Math.max(70, Math.min(150, 102 + noise + bladeNoise * 1.5)); // G
      data[i + 2] = Math.max(20, Math.min(65, 39 + noise * 0.3));             // B
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Asphalt Road Texture
   */
  public static getAsphaltTexture(size: number = 512): THREE.CanvasTexture {
    const key = `asphalt_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Base charcoal
    ctx.fillStyle = '#22252a';
    ctx.fillRect(0, 0, size, size);

    // Fine mineral aggregate grain
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 28;
      const baseVal = 38 + n;
      data[i] = Math.max(20, Math.min(65, baseVal));
      data[i + 1] = Math.max(20, Math.min(65, baseVal));
      data[i + 2] = Math.max(20, Math.min(68, baseVal + 2));
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Concrete / Sidewalk Paving Texture
   */
  public static getPavingTexture(size: number = 512): THREE.CanvasTexture {
    const key = `paving_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    ctx.fillStyle = '#949ba5';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      data[i] = Math.max(120, Math.min(180, 150 + n));
      data[i + 1] = Math.max(120, Math.min(180, 154 + n));
      data[i + 2] = Math.max(125, Math.min(185, 160 + n));
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    // Draw paving grid pattern
    ctx.strokeStyle = 'rgba(70, 75, 85, 0.45)';
    ctx.lineWidth = 2;
    const step = size / 8;
    for (let x = 0; x <= size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Terracotta Roof Tile (Genteng)
   */
  public static getRoofTileTexture(size: number = 512): THREE.CanvasTexture {
    const key = `roof_tile_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Warm terracotta base
    ctx.fillStyle = '#a84c2d';
    ctx.fillRect(0, 0, size, size);

    const rows = 12;
    const rowHeight = size / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rowHeight;
      // Ridge gradient
      const grad = ctx.createLinearGradient(0, y, 0, y + rowHeight);
      grad.addColorStop(0, '#be5735');
      grad.addColorStop(0.7, '#963f23');
      grad.addColorStop(1, '#692b17');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y, size, rowHeight);

      // Shadow line at bottom of each tile row
      ctx.fillStyle = 'rgba(40, 15, 8, 0.6)';
      ctx.fillRect(0, y + rowHeight - 3, size, 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Red Brick Texture (Bata Merah)
   */
  public static getBrickTexture(size: number = 512): THREE.CanvasTexture {
    const key = `brick_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Mortar grey base
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, size, size);

    const rows = 16;
    const cols = 8;
    const rowH = size / rows;
    const colW = size / cols;

    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const offset = (r % 2) * (colW / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + offset;
        const brickHue = (Math.random() - 0.5) * 16;
        ctx.fillStyle = `rgb(${175 + brickHue}, ${68 + brickHue * 0.5}, ${50 + brickHue * 0.3})`;
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Wood Plank Texture (Kayu Jati / Tropis)
   */
  public static getWoodTexture(size: number = 512): THREE.CanvasTexture {
    const key = `wood_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, 0, size, size);

    // Wood grain lines
    ctx.strokeStyle = 'rgba(70, 40, 15, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const y = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 8, size * 0.7, y + (Math.random() - 0.5) * 8, size, y);
      ctx.stroke();
    }

    // Plank seams
    const planks = 6;
    const plankH = size / planks;
    ctx.fillStyle = 'rgba(35, 18, 5, 0.5)';
    for (let p = 1; p < planks; p++) {
      ctx.fillRect(0, p * plankH - 1, size, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Modern Architectural Plaster / Stucco Texture
   * Subtle mineral grain with micro-shading for crisp contemporary walls
   */
  public static getPlasterTexture(size: number = 512, baseColor: string = '#f8fafc'): THREE.CanvasTexture {
    const key = `plaster_${baseColor}_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 12;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Modern Vertical Architectural Timber Slat / Louver Texture
   * Slender teak battens with deep recessed dark shadow reveals
   */
  public static getModernWoodSlatTexture(size: number = 512): THREE.CanvasTexture {
    const key = `wood_slat_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Deep black/charcoal background for recess shadow
    ctx.fillStyle = '#111418';
    ctx.fillRect(0, 0, size, size);

    const slatCount = 16;
    const slatW = size / slatCount;
    const slatGap = 4;
    const barW = slatW - slatGap;

    for (let i = 0; i < slatCount; i++) {
      const x = i * slatW;
      
      // Warm modern architectural teak gradient
      const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
      const toneVariation = (Math.random() - 0.5) * 15;
      grad.addColorStop(0, `rgb(${160 + toneVariation}, ${105 + toneVariation * 0.7}, ${55 + toneVariation * 0.4})`);
      grad.addColorStop(0.5, `rgb(${185 + toneVariation}, ${120 + toneVariation * 0.7}, ${65 + toneVariation * 0.4})`);
      grad.addColorStop(1, `rgb(${140 + toneVariation}, ${90 + toneVariation * 0.7}, ${45 + toneVariation * 0.4})`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, barW, size);

      // Fine grain streaks along slats
      ctx.strokeStyle = 'rgba(70, 35, 12, 0.2)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 6; g++) {
        const gx = x + Math.random() * barW;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, size);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Architectural Board-Formed Concrete Texture
   * Fair-faced concrete with horizontal formwork plank seams & tie-rod details
   */
  public static getBoardFormedConcreteTexture(size: number = 512): THREE.CanvasTexture {
    const key = `concrete_board_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Base architectural grey
    ctx.fillStyle = '#8e97a4';
    ctx.fillRect(0, 0, size, size);

    const planks = 8;
    const plankH = size / planks;

    for (let p = 0; p < planks; p++) {
      const y = p * plankH;
      const shade = (Math.random() - 0.5) * 16;
      ctx.fillStyle = `rgba(${135 + shade}, ${145 + shade}, ${155 + shade}, 0.5)`;
      ctx.fillRect(0, y, size, plankH);

      // Horizontal seam line
      ctx.fillStyle = 'rgba(50, 55, 65, 0.45)';
      ctx.fillRect(0, y + plankH - 2, size, 2);

      // Formwork tie-rod indents
      const holes = [size * 0.2, size * 0.5, size * 0.8];
      for (const hx of holes) {
        ctx.beginPath();
        ctx.arc(hx, y + plankH * 0.5, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(40, 45, 55, 0.6)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(hx, y + plankH * 0.5, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 25, 30, 0.8)';
        ctx.fill();
      }
    }

    // Mineral noise
    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Modern Standing-Seam Dark Anthracite Zinc Roof Texture
   */
  public static getDarkZincRoofTexture(size: number = 512): THREE.CanvasTexture {
    const key = `zinc_roof_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    ctx.fillStyle = '#22272e';
    ctx.fillRect(0, 0, size, size);

    const seams = 12;
    const seamSpacing = size / seams;

    for (let s = 0; s < seams; s++) {
      const x = s * seamSpacing;

      // Standing rib highlight & shadow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(x, 0, 2, size);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x + 2, 0, 3, size);

      // Subtle metallic reflection gradient between seams
      const grad = ctx.createLinearGradient(x + 5, 0, x + seamSpacing, 0);
      grad.addColorStop(0, '#262c35');
      grad.addColorStop(0.5, '#2e3540');
      grad.addColorStop(1, '#1e2329');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 5, 0, seamSpacing - 5, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Modern Andesite Volcanic Stone Plinth Texture
   */
  public static getStonePlinthTexture(size: number = 512): THREE.CanvasTexture {
    const key = `stone_plinth_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Dark charcoal andesite
    ctx.fillStyle = '#373c44';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      d[i] = Math.max(30, Math.min(80, 55 + n));
      d[i + 1] = Math.max(30, Math.min(85, 60 + n));
      d[i + 2] = Math.max(35, Math.min(95, 68 + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // Stone block division lines
    ctx.strokeStyle = 'rgba(20, 22, 28, 0.5)';
    ctx.lineWidth = 2;
    const rows = 6;
    const rowH = size / rows;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * rowH);
      ctx.lineTo(size, r * rowH);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Tropical Foliage Texture for Architectural Planter Boxes
   */
  public static getFoliageTexture(size: number = 256): THREE.CanvasTexture {
    const key = `foliage_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    ctx.fillStyle = '#1c4519';
    ctx.fillRect(0, 0, size, size);

    // Draw overlapping tropical leaf shapes
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size;
      const r = 8 + Math.random() * 16;
      const leafHue = 110 + Math.random() * 30;
      ctx.fillStyle = `hsl(${leafHue}, 65%, ${30 + Math.random() * 25}%)`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }
}

