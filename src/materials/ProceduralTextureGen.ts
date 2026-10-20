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
    if (typeof document === 'undefined') {
      const mockCanvas: any = { width, height };
      const mockCtx: any = new Proxy({
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
        createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
      }, {
        get(target, prop) {
          if (prop in target) return (target as any)[prop];
          return () => {};
        }
      });
      return { canvas: mockCanvas, ctx: mockCtx };
    }
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
   * Procedural Hotmix Asphalt Road Texture (1024x1024)
   * Authentic dark charcoal base (#26292E to #1E2024) with thousands of
   * micro stone aggregates (#3A3F47, #16181B, and bright silica #525864).
   */
  public static getAsphaltTexture(size: number = 1024): THREE.CanvasTexture {
    const key = `asphalt_hotmix_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // 1. Dark charcoal gradient base (#26292E to #1E2024)
    const baseGrad = ctx.createLinearGradient(0, 0, size, size);
    baseGrad.addColorStop(0, '#26292E');
    baseGrad.addColorStop(0.5, '#212328');
    baseGrad.addColorStop(1, '#1E2024');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // 2. Base bitumen binder grain variation
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // Pseudo-random deterministic noise
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      data[i] = Math.max(26, Math.min(48, data[i] + n));
      data[i + 1] = Math.max(28, Math.min(50, data[i + 1] + n));
      data[i + 2] = Math.max(32, Math.min(56, data[i + 2] + n));
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Thousands of micro stone aggregates (Hotmix aggregate distribution)
    // Palet warna agregat:
    // - Medium slate pebble: #3A3F47
    // - Dark bitumen-coated aggregate: #16181B
    // - Bright silica glint: #525864
    // - Warm river gravel: #2F333B
    const aggregateColors = [
      '#3A3F47',
      '#16181B',
      '#3A3F47',
      '#16181B',
      '#2F333B',
      '#525864', // Aksentuasi silika terang
      '#444953'
    ];

    const pebbleCount = Math.floor(size * 18);
    for (let p = 0; p < pebbleCount; p++) {
      const px = Math.random() * size;
      const py = Math.random() * size;
      const radius = Math.random() < 0.8 ? (0.6 + Math.random() * 1.2) : (1.8 + Math.random() * 1.8);
      const color = aggregateColors[Math.floor(Math.random() * aggregateColors.length)];

      ctx.fillStyle = color;
      ctx.beginPath();
      // Irregular aggregate shape
      const sides = 4 + Math.floor(Math.random() * 3);
      for (let s = 0; s < sides; s++) {
        const angle = (s / sides) * Math.PI * 2;
        const r = radius * (0.75 + Math.random() * 0.5);
        const x = px + Math.cos(angle) * r;
        const y = py + Math.sin(angle) * r;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // 4. Subtle micro-pores & bitumen sheen
    ctx.fillStyle = 'rgba(22, 24, 27, 0.35)';
    for (let m = 0; m < size * 4; m++) {
      const mx = Math.random() * size;
      const my = Math.random() * size;
      ctx.fillRect(mx, my, 1.2, 1.2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Asphalt Normal/Bump Map (1024x1024)
   * Captures micro-relief of aggregate stone grains for afternoon sunlight relief.
   */
  public static getAsphaltNormalTexture(size: number = 1024): THREE.CanvasTexture {
    const key = `asphalt_normal_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Base normal map flat tangent: (128, 128, 255)
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // Normal disturbance from micro-aggregates
    for (let i = 0; i < data.length; i += 4) {
      const noiseX = (Math.random() - 0.5) * 32;
      const noiseY = (Math.random() - 0.5) * 32;
      data[i] = Math.max(80, Math.min(176, 128 + noiseX));     // Tangent X
      data[i + 1] = Math.max(80, Math.min(176, 128 + noiseY)); // Tangent Y
      data[i + 2] = 245 + Math.floor(Math.random() * 10);     // Tangent Z (pointing outward)
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
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

  /**
   * Procedural Asphalt Roughness Map (1024x1024)
   * Roughness target: ~0.88 with variation between bitumen and mineral grains.
   */
  public static getAsphaltRoughnessTexture(size: number = 1024): THREE.CanvasTexture {
    const key = `asphalt_roughness_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);
    ctx.fillStyle = '#dfdfdf';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 28;
      const val = Math.max(200, Math.min(245, 224 + n));
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Bright Yellow Tactile Paving Block (Pemandu Disabilitas)
   */
  public static getTactilePavingTexture(size: number = 256): THREE.CanvasTexture {
    const key = `tactile_paving_${size}`;
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(size, size);

    // Warm vibrant yellow base (#FACC15)
    ctx.fillStyle = '#eab308';
    ctx.fillRect(0, 0, size, size);

    // Embossed directional guiding bars
    const bars = 4;
    const barWidth = size / (bars * 2);
    for (let b = 0; b < bars; b++) {
      const x = b * barWidth * 2 + barWidth * 0.5;
      const grad = ctx.createLinearGradient(x, 0, x + barWidth, 0);
      grad.addColorStop(0, '#fef08a'); // Highlight
      grad.addColorStop(0.5, '#facc15'); // Peak
      grad.addColorStop(1, '#ca8a04'); // Shadow
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, barWidth, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Procedural Clean White Stencil Road Text "Malioboro"
   */
  public static getMalioboroRoadMarkingTexture(): THREE.CanvasTexture {
    const key = 'road_text_malioboro';
    if (this.cache.has(key)) return this.cache.get(key) as THREE.CanvasTexture;

    const { canvas, ctx } = this.createCanvas(512, 128);
    ctx.clearRect(0, 0, 512, 128);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '8px';
    ctx.fillText('MALIOBORO', 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cache.set(key, texture);
    return texture;
  }

  private static thumbnailDataUrlCache: Map<string, string> = new Map();

  /**
   * Procedural 2D Architectural Atmosphere Thumbnail Generator for Dock Visual Cards
   */
  public static getPresetCardThumbnail(preset: 'joglo' | 'cafe' | 'noodle' | 'garden'): string {
    if (this.thumbnailDataUrlCache.has(preset)) {
      return this.thumbnailDataUrlCache.get(preset)!;
    }

    const { canvas, ctx } = this.createCanvas(280, 160);
    const w = 280;
    const h = 160;

    if (preset === 'joglo') {
      // Golden Hour Twilight Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#1e1b4b');
      skyGrad.addColorStop(0.4, '#c2410c');
      skyGrad.addColorStop(0.7, '#f59e0b');
      skyGrad.addColorStop(1, '#fde68a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun glow
      const sunGrad = ctx.createRadialGradient(210, 85, 2, 210, 85, 45);
      sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      sunGrad.addColorStop(0.3, 'rgba(253, 224, 71, 0.6)');
      sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(210, 85, 45, 0, Math.PI * 2);
      ctx.fill();

      // Stone Courtyard Ground
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 125, w, 35);
      ctx.fillStyle = '#334155';
      ctx.fillRect(40, 120, 200, 6);

      // Joglo Roof Silhouette
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      // Lower roof tumpang
      ctx.moveTo(35, 95);
      ctx.lineTo(85, 75);
      ctx.lineTo(195, 75);
      ctx.lineTo(245, 95);
      ctx.lineTo(240, 100);
      ctx.lineTo(40, 100);
      ctx.closePath();
      ctx.fill();

      // Upper Brunjung roof
      ctx.fillStyle = '#9a3412';
      ctx.beginPath();
      ctx.moveTo(80, 75);
      ctx.lineTo(125, 38);
      ctx.lineTo(155, 38);
      ctx.lineTo(200, 75);
      ctx.closePath();
      ctx.fill();

      // Ridge cap
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(123, 36, 34, 3);

      // Pillars & Warm Uplight
      ctx.fillStyle = '#451a03';
      const pillars = [65, 105, 175, 215];
      pillars.forEach((px) => {
        ctx.fillRect(px - 3, 100, 6, 22);

        // Warm uplight flare
        const upGrad = ctx.createRadialGradient(px, 122, 1, px, 122, 12);
        upGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
        upGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = upGrad;
        ctx.beginPath();
        ctx.arc(px, 122, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#451a03';
      });
    } else if (preset === 'cafe') {
      // Modern Dusk Twilight
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(0.7, '#1e293b');
      skyGrad.addColorStop(1, '#334155');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ground
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 128, w, 32);

      // Warm Interior Glow behind glass
      const glowGrad = ctx.createRadialGradient(140, 95, 5, 140, 95, 70);
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
      glowGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.45)');
      glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(45, 60, 190, 68);

      // Modern Cantilever Black Canopy
      ctx.fillStyle = '#020617';
      ctx.fillRect(35, 52, 210, 10);

      // Vertical Timber Louvers
      ctx.fillStyle = 'rgba(180, 83, 9, 0.85)';
      for (let lx = 50; lx < 95; lx += 6) {
        ctx.fillRect(lx, 62, 3, 66);
      }

      // Barista Counter & Pendant Lamps
      ctx.fillStyle = '#78350f';
      ctx.fillRect(110, 105, 80, 23);

      // Pendant lights
      [125, 150, 175].forEach((lx) => {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lx, 62);
        ctx.lineTo(lx, 78);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx, 80, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Neon Sign "KOPI & RASA"
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText('KOPI & RASA', 115, 48);
    } else if (preset === 'noodle') {
      // Industrial Twilight
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#09090b');
      skyGrad.addColorStop(0.6, '#18181b');
      skyGrad.addColorStop(1, '#27272a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ground
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 132, w, 28);

      // 2-Story Steel Frame Structure
      ctx.fillStyle = '#09090b';
      ctx.fillRect(50, 35, 180, 97);

      // 2-Story Warm Dining Light
      ctx.fillStyle = 'rgba(254, 215, 170, 0.4)';
      ctx.fillRect(60, 42, 100, 38); // Floor 2
      ctx.fillRect(60, 88, 160, 42); // Floor 1

      // Black I-beam Columns & Balcony
      ctx.fillStyle = '#18181b';
      ctx.fillRect(56, 35, 6, 97);
      ctx.fillRect(162, 35, 6, 97);
      ctx.fillRect(224, 35, 6, 97);
      ctx.fillRect(50, 82, 180, 6); // Mid floor slab

      // External Staircase
      ctx.strokeStyle = '#71717a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(226, 82);
      ctx.lineTo(255, 132);
      ctx.stroke();

      // Balcony Planter Greenery
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(168, 80, 56, 4);
      for (let bx = 170; bx < 220; bx += 8) {
        ctx.beginPath();
        ctx.arc(bx, 78, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Signage "MIE NUSANTARA"
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('MIE NUSANTARA', 70, 30);
    } else {
      // Garden Landscape
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#0284c7');
      skyGrad.addColorStop(0.5, '#38bdf8');
      skyGrad.addColorStop(1, '#bae6fd');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Green Hills & Lawn
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(80, 155, 160, 45, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(200, 160, 140, 50, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lush Trembesi Tree Trunk & Branches
      ctx.fillStyle = '#452e1e';
      ctx.fillRect(135, 80, 10, 55);
      ctx.beginPath();
      ctx.moveTo(140, 95);
      ctx.lineTo(110, 75);
      ctx.moveTo(140, 90);
      ctx.lineTo(170, 70);
      ctx.strokeStyle = '#452e1e';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Multi-cluster Canopy
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(140, 55, 34, 0, Math.PI * 2);
      ctx.arc(110, 62, 26, 0, Math.PI * 2);
      ctx.arc(170, 60, 28, 0, Math.PI * 2);
      ctx.fill();

      // SSS Sunlight Highlight
      ctx.fillStyle = '#84cc16';
      ctx.beginPath();
      ctx.arc(145, 48, 22, 0, Math.PI * 2);
      ctx.fill();

      // Stepping Stones
      ctx.fillStyle = '#94a3b8';
      [70, 105, 145, 185].forEach((sx, i) => {
        ctx.beginPath();
        ctx.ellipse(sx, 142 + (i % 2) * 5, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const dataUrl = canvas.toDataURL('image/png');
    this.thumbnailDataUrlCache.set(preset, dataUrl);
    return dataUrl;
  }

  /**
   * Procedural Thumbnail for Building Catalog items
   */
  public static getBuildingThumbnail(id: string, category: string, _name: string): string {
    const cacheKey = `bld_thumb_${id}`;
    if (this.thumbnailDataUrlCache.has(cacheKey)) {
      return this.thumbnailDataUrlCache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.createCanvas(160, 100);
    const w = 160;
    const h = 100;

    // Sky background gradient according to category
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    if (category === 'hunian') {
      skyGrad.addColorStop(0, '#1e293b');
      skyGrad.addColorStop(0.6, '#334155');
      skyGrad.addColorStop(1, '#475569');
    } else if (category === 'kuliner_kafe') {
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.6, '#1e1b4b');
      skyGrad.addColorStop(1, '#312e81');
    } else if (category === 'mall_ritel') {
      skyGrad.addColorStop(0, '#0c4a6e');
      skyGrad.addColorStop(0.7, '#0284c7');
      skyGrad.addColorStop(1, '#38bdf8');
    } else if (category === 'budaya_hotel') {
      skyGrad.addColorStop(0, '#431407');
      skyGrad.addColorStop(0.6, '#7c2d12');
      skyGrad.addColorStop(1, '#b45309');
    } else {
      skyGrad.addColorStop(0, '#064e3b');
      skyGrad.addColorStop(0.7, '#047857');
      skyGrad.addColorStop(1, '#10b981');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 78, w, 22);

    // Building massing silhouette
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(35, 42, 90, 36);

    // Warm lit windows / facade
    ctx.fillStyle = '#fde047';
    for (let x = 45; x <= 105; x += 22) {
      ctx.fillRect(x, 48, 12, 10);
      ctx.fillRect(x, 62, 12, 10);
    }

    // Roof shape
    ctx.fillStyle = category === 'budaya_hotel' ? '#ea580c' : '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(30, 42);
    ctx.lineTo(80, 24);
    ctx.lineTo(130, 42);
    ctx.closePath();
    ctx.fill();

    const dataUrl = canvas.toDataURL('image/png');
    this.thumbnailDataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  }
}

