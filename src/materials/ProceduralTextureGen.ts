import * as THREE from 'three';

export interface Material3DPackage {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
  ao: THREE.CanvasTexture;
  height: THREE.CanvasTexture;
}

/**
 * In-engine procedural 3D PBR texture generator for Arscity v3.0.0
 * Features Sobel gradient height-to-normal, Cavity AO darkening, micro-roughness,
 * and heightfield displacement maps at 1024x1024 resolution.
 * 100% offline-ready, zero external dependencies, CC0-compliant.
 */
export class ProceduralTextureGen {
  private static cache: Map<string, THREE.Texture> = new Map();
  private static packageCache: Map<string, Material3DPackage> = new Map();

  /**
   * Safe mock canvas creator for headless / Node / Vitest environments
   */
  private static createMockCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const mockCanvas: any = {
      width,
      height,
      toDataURL: () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };
    const mockCtx: any = new Proxy({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      letterSpacing: '',
      getImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
      createImageData: () => ({ data: new Uint8ClampedArray(width * height * 4) }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      putImageData: () => {},
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      ellipse: () => {},
      fillText: () => {},
      bezierCurveTo: () => {}
    }, {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        return () => {};
      }
    });
    return { canvas: mockCanvas, ctx: mockCtx };
  }

  /**
   * Helper to create canvas of given size with safe headless fallback
   */
  private static createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    if (typeof document === 'undefined') {
      return this.createMockCanvas(width, height);
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return this.createMockCanvas(width, height);
      return { canvas, ctx };
    } catch {
      return this.createMockCanvas(width, height);
    }
  }

  /**
   * Tahap 1: Core Mathematical Heightfield & Sobel Normal Map Pipeline
   * Generates synchronized 1024x1024 Albedo, Tangent Normal, Roughness, Cavity AO, and Bump Height maps.
   */
  public static generate3DMaterialMaps(
    name: string,
    heightFn: (u: number, v: number, x: number, y: number) => number,
    colorFn: (u: number, v: number, height: number, x: number, y: number) => [number, number, number],
    width: number = 1024,
    height: number = 1024,
    normalStrength: number = 3.2
  ): Material3DPackage {
    const cacheKey = `${name}_${width}x${height}_${normalStrength.toFixed(1)}`;
    if (this.packageCache.has(cacheKey)) {
      return this.packageCache.get(cacheKey)!;
    }

    // Step 1: Calculate HeightField Array (0.0 to 1.0)
    const totalPixels = width * height;
    const heightField = new Float32Array(totalPixels);
    for (let y = 0; y < height; y++) {
      const v = y / height;
      const rowOffset = y * width;
      for (let x = 0; x < width; x++) {
        const u = x / width;
        const hVal = THREE.MathUtils.clamp(heightFn(u, v, x, y), 0.0, 1.0);
        heightField[rowOffset + x] = hVal;
      }
    }

    // Prepare HTML5 Canvases for 5 PBR texture channels
    const { canvas: albedoCanvas, ctx: albedoCtx } = this.createCanvas(width, height);
    const { canvas: normalCanvas, ctx: normalCtx } = this.createCanvas(width, height);
    const { canvas: roughCanvas, ctx: roughCtx } = this.createCanvas(width, height);
    const { canvas: aoCanvas, ctx: aoCtx } = this.createCanvas(width, height);
    const { canvas: heightCanvas, ctx: heightCtx } = this.createCanvas(width, height);

    const albedoImg = albedoCtx.createImageData(width, height);
    const normalImg = normalCtx.createImageData(width, height);
    const roughImg = roughCtx.createImageData(width, height);
    const aoImg = aoCtx.createImageData(width, height);
    const heightImg = heightCtx.createImageData(width, height);

    const aData = albedoImg.data;
    const nData = normalImg.data;
    const rData = roughImg.data;
    const aoData = aoImg.data;
    const hData = heightImg.data;

    // Step 2: Sobel 3x3 Gradient Filter for Tangent-Space Normal Vector
    // Step 3: Cavity Darkening & Micro-Roughness Mapping
    const inv8 = 1.0 / 8.0;

    for (let y = 0; y < height; y++) {
      const v = y / height;
      const yPrev = ((y - 1 + height) % height) * width;
      const yCurr = y * width;
      const yNext = ((y + 1) % height) * width;

      for (let x = 0; x < width; x++) {
        const u = x / width;
        const xPrev = (x - 1 + width) % width;
        const xNext = (x + 1) % width;

        // 3x3 Neighborhood (periodic wrap-around coordinates for seamless tiling)
        const tl = heightField[yPrev + xPrev];
        const tc = heightField[yPrev + x];
        const tr = heightField[yPrev + xNext];

        const ml = heightField[yCurr + xPrev];
        const mc = heightField[yCurr + x];
        const mr = heightField[yCurr + xNext];

        const bl = heightField[yNext + xPrev];
        const bc = heightField[yNext + x];
        const br = heightField[yNext + xNext];

        // Sobel horizontal gradient (dz/dx)
        const dx = (tr + 2.0 * mr + br - (tl + 2.0 * ml + bl)) * inv8;
        // Sobel vertical gradient (dz/dy)
        const dy = (bl + 2.0 * bc + br - (tl + 2.0 * tc + tr)) * inv8;

        // Tangent Normal: (-dx * strength, -dy * strength, 1.0)
        let nx = -dx * normalStrength;
        let ny = -dy * normalStrength;
        let nz = 1.0;
        const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx *= invLen;
        ny *= invLen;
        nz *= invLen;

        const pIdx = (yCurr + x) * 4;

        // Normal map in Tangent Space RGB [0..255]
        nData[pIdx] = Math.round((nx * 0.5 + 0.5) * 255);
        nData[pIdx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        nData[pIdx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        nData[pIdx + 3] = 255;

        // Height Map (Grayscale)
        const hByte = Math.round(mc * 255);
        hData[pIdx] = hByte;
        hData[pIdx + 1] = hByte;
        hData[pIdx + 2] = hByte;
        hData[pIdx + 3] = 255;

        // Cavity & Ambient Occlusion (AO):
        // Recessed grooves and steep slopes receive natural ambient occlusion shadows
        const slopeMag = dx * dx + dy * dy;
        const depthOcclusion = THREE.MathUtils.clamp(mc / 0.40, 0.20, 1.0);
        const creviceOcclusion = THREE.MathUtils.clamp(1.0 - slopeMag * 2.0, 0.35, 1.0);
        const aoFactor = depthOcclusion * creviceOcclusion;

        const aoByte = Math.round(aoFactor * 255);
        aoData[pIdx] = aoByte;
        aoData[pIdx + 1] = aoByte;
        aoData[pIdx + 2] = aoByte;
        aoData[pIdx + 3] = 255;

        // Micro-Roughness:
        // Deep recesses/grout (mc < 0.3) -> rough (0.95), raised ridges (mc > 0.7) -> smooth / highlight (0.45 - 0.65)
        const smoothH = THREE.MathUtils.smoothstep(mc, 0.2, 0.82);
        const roughFactor = THREE.MathUtils.lerp(0.95, 0.50, smoothH);
        const rByte = Math.round(roughFactor * 255);
        rData[pIdx] = rByte;
        rData[pIdx + 1] = rByte;
        rData[pIdx + 2] = rByte;
        rData[pIdx + 3] = 255;

        // Albedo: Base color modulated with Cavity Darkening
        const [baseR, baseG, baseB] = colorFn(u, v, mc, x, y);
        const cavityMod = 0.30 + 0.70 * aoFactor;
        aData[pIdx] = Math.round(THREE.MathUtils.clamp(baseR * cavityMod, 0, 255));
        aData[pIdx + 1] = Math.round(THREE.MathUtils.clamp(baseG * cavityMod, 0, 255));
        aData[pIdx + 2] = Math.round(THREE.MathUtils.clamp(baseB * cavityMod, 0, 255));
        aData[pIdx + 3] = 255;
      }
    }

    albedoCtx.putImageData(albedoImg, 0, 0);
    normalCtx.putImageData(normalImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    aoCtx.putImageData(aoImg, 0, 0);
    heightCtx.putImageData(heightImg, 0, 0);

    const albedoTex = new THREE.CanvasTexture(albedoCanvas);
    albedoTex.wrapS = THREE.RepeatWrapping;
    albedoTex.wrapT = THREE.RepeatWrapping;
    albedoTex.colorSpace = THREE.SRGBColorSpace;

    const normalTex = new THREE.CanvasTexture(normalCanvas);
    normalTex.wrapS = THREE.RepeatWrapping;
    normalTex.wrapT = THREE.RepeatWrapping;

    const roughnessTex = new THREE.CanvasTexture(roughCanvas);
    roughnessTex.wrapS = THREE.RepeatWrapping;
    roughnessTex.wrapT = THREE.RepeatWrapping;

    const aoTex = new THREE.CanvasTexture(aoCanvas);
    aoTex.wrapS = THREE.RepeatWrapping;
    aoTex.wrapT = THREE.RepeatWrapping;

    const heightTex = new THREE.CanvasTexture(heightCanvas);
    heightTex.wrapS = THREE.RepeatWrapping;
    heightTex.wrapT = THREE.RepeatWrapping;

    const pkg: Material3DPackage = {
      albedo: albedoTex,
      normal: normalTex,
      roughness: roughnessTex,
      ao: aoTex,
      height: heightTex
    };

    this.packageCache.set(cacheKey, pkg);
    return pkg;
  }

  // =========================================================================
  // SPECIFIC 3D MATERIAL PACKAGES
  // =========================================================================

  /**
   * 1. Genteng Terakota Nusantara (terracotta_tiles)
   * Curved S-profile (genteng kodok / mantili) on X axis with stepped overlapping rows on Y axis.
   */
  public static getTerracottaPackage(size: number = 1024): Material3DPackage {
    return this.generate3DMaterialMaps(
      'terracotta_tiles',
      (u, v) => {
        const tilesX = 8;
        const tilesY = 12;
        const row = Math.floor(v * tilesY);
        const uOffset = (row % 2) * 0.5;

        const tu = ((u * tilesX + uOffset) % 1 + 1) % 1;
        const tv = (v * tilesY) % 1;

        // Curved S-profile cross-section (curved trough and raised interlocking lip)
        const sProfile = Math.sin(tu * Math.PI * 2.0 - 0.4) * 0.42 + 0.58;

        // Stepped tile rows with sharp overlap drop at bottom lip
        const stepOverlap = tv < 0.90
          ? 0.35 + 0.65 * (tv / 0.90)
          : Math.max(0.08, 1.0 - (tv - 0.90) / 0.10 * 0.92);

        // Micro clay porous grain
        const grain = (Math.sin(u * 200) * Math.cos(v * 200)) * 0.03;
        return sProfile * stepOverlap + grain;
      },
      (u, v, h) => {
        const tilesY = 12;
        const tv = (v * tilesY) % 1;

        // Warm traditional terracotta tones (#be5735, #963f23, #692b17)
        const kilnTone = Math.sin(u * 24 + v * 18) * 12;
        let r = 188 + kilnTone;
        let g = 82 + kilnTone * 0.5;
        let b = 48 + kilnTone * 0.3;

        // Shadow under the overlapping tile lip
        if (tv > 0.88) {
          r *= 0.55;
          g *= 0.50;
          b *= 0.45;
        }

        // Highlight along the crest of the S-curve
        if (h > 0.82) {
          r = Math.min(255, r * 1.15);
          g = Math.min(255, g * 1.12);
        }

        return [r, g, b];
      },
      size,
      size,
      3.6
    );
  }

  /**
   * 2. Bata Merah Ekspos (exposed_brick)
   * Precise stretcher bond with deep recessed mortar joints (height = 0.08), smooth beveled edges,
   * and porous volcanic clay grains.
   */
  public static getBrickPackage(size: number = 1024): Material3DPackage {
    return this.generate3DMaterialMaps(
      'exposed_brick',
      (u, v) => {
        const rows = 16;
        const cols = 8;
        const row = Math.floor(v * rows);
        const uOffset = (row % 2) * 0.5;

        const bu = ((u * cols + uOffset) % 1 + 1) % 1;
        const bv = (v * rows) % 1;

        const mortarX = 0.07;
        const mortarY = 0.12;

        // Recessed mortar joints
        if (bu < mortarX || bu > 1 - mortarX || bv < mortarY || bv > 1 - mortarY) {
          const sand = (Math.sin(u * 320) + Math.cos(v * 320)) * 0.02;
          return 0.08 + sand;
        }

        // Beveled brick edge
        const distToEdge = Math.min(bu - mortarX, 1 - mortarX - bu, bv - mortarY, 1 - mortarY - bv) / 0.07;
        const bevel = THREE.MathUtils.smoothstep(distToEdge, 0, 1);

        // Porous clay relief
        const poreNoise = (Math.sin(u * 150) * Math.sin(v * 150)) * 0.05;
        return 0.72 + bevel * 0.22 + poreNoise;
      },
      (u, v, h) => {
        const rows = 16;
        const cols = 8;
        const row = Math.floor(v * rows);
        const uOffset = (row % 2) * 0.5;

        const bu = ((u * cols + uOffset) % 1 + 1) % 1;
        const bv = (v * rows) % 1;

        const mortarX = 0.07;
        const mortarY = 0.12;

        // Mortar color (grey Portland cement with sand specks)
        if (bu < mortarX || bu > 1 - mortarX || bv < mortarY || bv > 1 - mortarY) {
          return [195, 202, 212];
        }

        // Fired clay terracotta palette (#a33d26, #b94a2f, #872e1c)
        const brickSeed = Math.sin(Math.floor(v * rows) * 31.7 + Math.floor((u * cols + uOffset)) * 13.3);
        const variation = brickSeed * 18;
        const r = 182 + variation;
        const g = 68 + variation * 0.45;
        const b = 46 + variation * 0.3;

        return [r, g, b];
      },
      size,
      size,
      3.4
    );
  }

  /**
   * 3. Batu Candi Andesit Yogyakarta (stone_candi / stone_plinth)
   * Ashlar volcanic stone blocks with chiseled rock faces, basalt pores, and deep mortar joints.
   */
  public static getStoneCandiPackage(size: number = 1024): Material3DPackage {
    return this.generate3DMaterialMaps(
      'stone_candi',
      (u, v) => {
        const rows = 8;
        const r = Math.floor(v * rows);
        const uOffset = (r % 2) * 0.35 + Math.sin(r * 4.7) * 0.15;

        const cols = 4;
        const su = ((u * cols + uOffset) % 1 + 1) % 1;
        const sv = (v * rows) % 1;

        const joint = 0.05;
        if (su < joint || su > 1 - joint || sv < joint || sv > 1 - joint) {
          return 0.09;
        }

        // Chiseled rock face with natural volcanic andesite facets
        const chisel1 = Math.sin(u * 38 + Math.cos(v * 25) * 2.0) * 0.14;
        const chisel2 = Math.cos(v * 45 + Math.sin(u * 28) * 1.5) * 0.12;
        const pores = (Math.sin(u * 180) * Math.cos(v * 180)) * 0.06;

        return 0.65 + chisel1 + chisel2 + pores;
      },
      (u, v, h) => {
        // Dark volcanic charcoal andesite (#383d45, #2b2f36, #4a505b)
        const mineral = Math.sin(u * 60 + v * 80) * 14;
        let r = 58 + mineral;
        let g = 62 + mineral;
        let b = 68 + mineral;

        if (h < 0.2) {
          r *= 0.55;
          g *= 0.55;
          b *= 0.55;
        }
        return [r, g, b];
      },
      size,
      size,
      3.8
    );
  }

  /**
   * 4. Kayu Jati Arsitektural (teak_wood)
   * Planks with bevel seams, longitudinal organic grain curves, and tactile teak pores.
   */
  public static getTeakWoodPackage(size: number = 1024): Material3DPackage {
    return this.generate3DMaterialMaps(
      'teak_wood',
      (u, v) => {
        const planks = 8;
        const pu = (u * planks) % 1;
        const seamW = 0.04;

        if (pu < seamW || pu > 1 - seamW) {
          return 0.12; // Recessed plank shadow gap
        }

        // Bevel from gap
        const dist = Math.min(pu - seamW, 1 - seamW - pu) / 0.08;
        const bevel = THREE.MathUtils.smoothstep(dist, 0, 1);

        // Flowing longitudinal grain waves
        const grainWave = Math.sin(v * 48 + Math.sin(u * 12) * 3.5) * 0.10;
        // Fine teak micro-furrow pores along plank length
        const teakPores = Math.sin(u * 280) > 0.75 ? -0.06 : 0.02;

        return 0.68 + bevel * 0.20 + grainWave + teakPores;
      },
      (u, v, h) => {
        const planks = 8;
        const pIdx = Math.floor(u * planks);
        const plankVariation = Math.sin(pIdx * 5.3) * 16;

        // Indonesian golden-brown teak palette (#9a5925, #7d4319, #b86d33)
        const grain = Math.sin(v * 48 + Math.sin(u * 12) * 3.5) * 18;
        let r = 158 + plankVariation + grain;
        let g = 96 + plankVariation * 0.65 + grain * 0.6;
        let b = 48 + plankVariation * 0.35 + grain * 0.3;

        if (h < 0.25) {
          r *= 0.45;
          g *= 0.40;
          b *= 0.35;
        }
        return [r, g, b];
      },
      size,
      size,
      2.8
    );
  }

  /**
   * 5. Dinding Plester & Tali Air (plaster_wall / concrete)
   * Micro stucco sand grains cut by horizontal architectural shadow grooves (tali air) every 1 meter.
   */
  public static getPlasterPackage(size: number = 512, _baseColor: string = '#ffffff'): Material3DPackage {
    // Generate unified neutral white plaster maps; architectural color tinting is applied via material.color
    const cr = 255;
    const cg = 255;
    const cb = 255;

    return this.generate3DMaterialMaps(
      'plaster_neutral',
      (u, v) => {
        // Horizontal architectural shadow groove (tali air) every 25% of height
        const taliAirInterval = 0.25;
        const tv = (v % taliAirInterval) / taliAirInterval;
        const grooveHalfWidth = 0.025;

        if (tv < grooveHalfWidth || tv > 1 - grooveHalfWidth) {
          return 0.10; // 3D Inset shadow groove
        }

        // Stucco mineral sand grain
        const grain = (Math.sin(u * 380) * Math.cos(v * 380)) * 0.06;
        return 0.78 + grain;
      },
      (u, v, h) => {
        const grainNoise = (Math.sin(u * 220) + Math.cos(v * 220)) * 6;
        let r = cr + grainNoise;
        let g = cg + grainNoise;
        let b = cb + grainNoise;

        // Shadow inside tali air groove
        if (h < 0.25) {
          r *= 0.52;
          g *= 0.54;
          b *= 0.58;
        }
        return [r, g, b];
      },
      size,
      size,
      2.6
    );
  }

  /**
   * 6. Aspal Hotmix (road_asphalt)
   * Sharp mineral stone aggregates protruding from dark bitumen matrix.
   */
  public static getAsphaltPackage(size: number = 1024): Material3DPackage {
    return this.generate3DMaterialMaps(
      'road_asphalt',
      (u, v, x, y) => {
        // Bitumen matrix base
        const bitumen = 0.40;

        // Sharp aggregate stone pebbles (pseudo-random grid clusters)
        const grid = 64;
        const gx = Math.floor(u * grid);
        const gy = Math.floor(v * grid);
        const cellHash = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
        const hasPebble = (cellHash - Math.floor(cellHash)) > 0.38;

        if (hasPebble) {
          const fx = (u * grid) % 1 - 0.5;
          const fy = (v * grid) % 1 - 0.5;
          const distSq = fx * fx + fy * fy;
          if (distSq < 0.18) {
            const h = 0.88 - distSq * 2.0;
            return THREE.MathUtils.clamp(h, 0.40, 0.98);
          }
        }

        // Fine mineral noise
        const micro = (Math.sin(x * 1.5) * Math.cos(y * 1.5)) * 0.06;
        return bitumen + micro;
      },
      (u, v, h) => {
        // Bitumen dark charcoal base (#1E2024 to #26292E)
        if (h < 0.55) {
          const bitNoise = (Math.sin(u * 250) + Math.cos(v * 250)) * 4;
          return [34 + bitNoise, 37 + bitNoise, 42 + bitNoise];
        }

        // Aggregate stones (#3A3F47 slate or #525864 silica glint)
        const isSilica = Math.sin(u * 120 + v * 90) > 0.6;
        if (isSilica) {
          return [82, 88, 100];
        }
        return [58, 63, 71];
      },
      size,
      size,
      3.2
    );
  }

  /**
   * 7. Paving Trotoar (sidewalk_paving)
   * Modular paving blocks with beveled perimeter seams and textured stone crowns.
   */
  public static getPavingPackage(size: number = 1024): Material3DPackage {
    return this.generate3DMaterialMaps(
      'sidewalk_paving',
      (u, v) => {
        const grid = 8;
        const pu = (u * grid) % 1;
        const pv = (v * grid) % 1;

        const joint = 0.06;
        if (pu < joint || pu > 1 - joint || pv < joint || pv > 1 - joint) {
          return 0.15; // Sunken sand joint
        }

        // Rounded chamfer along perimeter of each paver block
        const dist = Math.min(pu - joint, 1 - joint - pu, pv - joint, 1 - joint - pv) / 0.10;
        const chamfer = THREE.MathUtils.smoothstep(dist, 0, 1);

        const stoneGrain = (Math.sin(u * 160) + Math.cos(v * 160)) * 0.04;
        return 0.72 + chamfer * 0.22 + stoneGrain;
      },
      (u, v, h) => {
        // Warm neutral concrete tone without lavender/purple color cast
        const grain = (Math.sin(u * 200) * Math.sin(v * 200)) * 6;
        let r = 172 + grain;
        let g = 172 + grain;
        let b = 170 + grain;

        if (h < 0.25) {
          r = 88;
          g = 88;
          b = 86;
        }
        return [r, g, b];
      },
      size,
      size,
      2.2
    );
  }

  /**
   * 8. Tactile Paving (tactile_paving)
   * Embossed directional guiding bars (jalur pemandu disabilitas kuning) with 3D raised capsule ridges.
   */
  public static getTactilePavingPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'tactile_paving',
      (u) => {
        const bars = 4;
        const bu = (u * bars) % 1;
        // Center capsule ridge
        const dist = Math.abs(bu - 0.5) / 0.22;
        if (dist < 1.0) {
          // Curved cylindrical ridge
          return 0.25 + 0.72 * Math.sqrt(1.0 - dist * dist);
        }
        return 0.22; // Recessed flat surface
      },
      (u, v, h) => {
        // Vibrant warning yellow (#facc15 / #eab308)
        let r = 234;
        let g = 179;
        let b = 8;

        if (h > 0.8) {
          r = 254;
          g = 240;
          b = 138; // Highlight peak
        } else if (h < 0.3) {
          r = 180;
          g = 130;
          b = 4; // Groove shadow
        }
        return [r, g, b];
      },
      size,
      size,
      3.8
    );
  }

  /**
   * 9. Rumput & Tanah Kontur (terrain_grass)
   * Lush tropical grass without repeating dark reddish blotches.
   */
  public static getGrassPackage(size: number = 1024): Material3DPackage {
    return this.generate3DMaterialMaps(
      'terrain_grass',
      (u, v) => {
        // High-frequency subtle grass tufts preventing repetitive macro blotches
        const clump1 = Math.sin(u * 90 + Math.sin(v * 70) * 1.2) * 0.12;
        const clump2 = Math.cos(v * 110 + Math.cos(u * 60) * 1.2) * 0.10;
        const blade = (Math.sin(u * 400) * Math.sin(v * 400)) * 0.08;
        return 0.65 + clump1 + clump2 + blade;
      },
      (u, v, h) => {
        // Natural equatorial tropical grass palette (#3d7c2e to #549a3c)
        const tone = Math.sin(u * 64 + v * 90) * 12;
        let r = 58 + tone * 0.4;
        let g = 126 + tone * 1.0;
        let b = 44 + tone * 0.3;

        // Soft shadowing in hollows without reddish-brown mud cuts
        if (h < 0.50) {
          r = Math.max(38, r * 0.85);
          g = Math.max(88, g * 0.85);
          b = Math.max(30, b * 0.85);
        } else if (h > 0.78) {
          // Sunlit blades
          r = Math.min(255, r * 1.15);
          g = Math.min(255, g * 1.18);
          b = Math.min(255, b * 1.10);
        }
        return [r, g, b];
      },
      size,
      size,
      0.40
    );
  }

  /**
   * 10. Rooster Angin (roster_breeze_block)
   * Geometric lattice apertures with real recessed voids and raised concrete struts.
   */
  public static getRosterPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'roster_breeze_block',
      (u, v) => {
        const grid = 4;
        const bu = (u * grid) % 1;
        const bv = (v * grid) % 1;

        // Perimeter strut & diamond central core
        const strut = 0.14;
        if (bu < strut || bu > 1 - strut || bv < strut || bv > 1 - strut) {
          return 0.90; // Raised concrete frame
        }

        const dx = Math.abs(bu - 0.5);
        const dy = Math.abs(bv - 0.5);
        if (dx + dy < 0.28) {
          return 0.86; // Diamond cross center
        }

        // Hollow pierced ventilation aperture
        return 0.05;
      },
      (u, v, h) => {
        if (h < 0.15) {
          return [15, 18, 24]; // Dark interior breeze cavity
        }
        return [226, 232, 240]; // Architectural off-white concrete
      },
      size,
      size,
      3.8
    );
  }

  /**
   * 11. Dark Zinc Standing Seam Roof Package
   */
  public static getDarkZincRoofPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'zinc_roof',
      (u) => {
        const seams = 12;
        const su = (u * seams) % 1;
        if (su < 0.06) {
          return 0.95; // Standing rib
        }
        return 0.50; // Flat tray
      },
      (u, v, h) => {
        if (h > 0.8) return [55, 62, 72];
        return [34, 39, 46];
      },
      size,
      size,
      3.0
    );
  }

  /**
   * 12. Board-Formed Concrete Package
   */
  public static getBoardFormedConcretePackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'concrete_board',
      (u, v) => {
        const planks = 8;
        const pv = (v * planks) % 1;
        if (pv > 0.95) return 0.2; // Formwork plank seam
        const grain = (Math.sin(u * 120) * Math.cos(v * 40)) * 0.05;
        return 0.75 + grain;
      },
      (u, v, h) => {
        if (h < 0.3) return [60, 65, 75];
        return [142, 151, 164];
      },
      size,
      size,
      2.8
    );
  }

  /**
   * 13. Weathered Corten Steel Package
   * Rich oxidized rust patina with microscopic pitting and warm amber-orange mineral tones.
   */
  public static getCortenSteelPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'corten_steel',
      (u, v) => {
        const rust1 = Math.sin(u * 28 + Math.cos(v * 24) * 2.0) * 0.12;
        const rust2 = Math.cos(v * 36 + Math.sin(u * 32) * 1.5) * 0.10;
        const pitting = (Math.sin(u * 140) * Math.cos(v * 140)) * 0.08;
        return 0.65 + rust1 + rust2 + pitting;
      },
      (u, v, h) => {
        const variation = Math.sin(u * 40 + v * 50) * 18;
        // Weathered reddish-orange corten rust (#a34c1b, #8a3a12, #c25e24)
        let r = 168 + variation;
        let g = 78 + variation * 0.45;
        let b = 32 + variation * 0.2;
        if (h < 0.3) {
          r *= 0.6;
          g *= 0.55;
          b *= 0.5;
        }
        return [r, g, b];
      },
      size,
      size,
      3.2
    );
  }

  /**
   * 14. Terrazzo Stone Package (Malioboro Bollards & Pavement)
   * Polished smooth matrix with embedded contrasting marble chips and mineral flecks.
   */
  public static getTerrazzoPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'terrazzo_stone',
      (u, v) => {
        const fleck = Math.sin(u * 90) * Math.cos(v * 90);
        return 0.85 + (fleck > 0.6 ? 0.08 : fleck < -0.6 ? -0.05 : 0.0);
      },
      (u, v) => {
        const chip1 = Math.sin(u * 75 + Math.cos(v * 65) * 1.8);
        const chip2 = Math.cos(u * 110 - v * 95);
        if (chip1 > 0.82) {
          // Terracotta quartz chip
          return [180, 95, 60];
        }
        if (chip2 > 0.85) {
          // Dark charcoal andesite chip
          return [45, 50, 58];
        }
        if (chip1 < -0.82) {
          // Pure white marble fleck
          return [245, 245, 250];
        }
        // Warm light grey cementitious matrix (#d8dde6)
        const n = Math.sin(u * 180 + v * 180) * 6;
        return [216 + n, 221 + n, 230 + n];
      },
      size,
      size,
      1.6
    );
  }

  /**
   * 15. Polished Granite & Dark Marble Package
   * Deep black/charcoal stone with crystalline inclusions.
   */
  public static getGranitePackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'granite_stone',
      (u, v) => {
        const grain = (Math.sin(u * 60) * Math.cos(v * 60)) * 0.06;
        return 0.90 + grain;
      },
      (u, v) => {
        const sparkle = Math.sin(u * 120 + v * 140);
        const fleck = Math.cos(u * 80 - v * 70);
        if (sparkle > 0.88) {
          return [160, 168, 180]; // Silver quartz sparkle
        }
        if (fleck > 0.75) {
          return [55, 62, 72];
        }
        return [24, 28, 36]; // Deep charcoal nero assoluto
      },
      size,
      size,
      2.0
    );
  }

  /**
   * 16. Organic Tree Bark Package
   * Deep vertical longitudinal furrows and rough fibrous tree trunk ridges.
   */
  public static getBarkPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'tree_bark',
      (u, v) => {
        const furrow = Math.sin(u * 32 + Math.sin(v * 16) * 1.5) * 0.22;
        const micro = (Math.sin(u * 120) * Math.cos(v * 80)) * 0.08;
        return 0.65 + furrow + micro;
      },
      (u, v, h) => {
        const variation = Math.sin(u * 16 + v * 8) * 12;
        // Warm weathered dark timber bark (#3d2618)
        let r = 68 + variation;
        let g = 45 + variation * 0.7;
        let b = 28 + variation * 0.4;
        if (h < 0.35) {
          r *= 0.5;
          g *= 0.5;
          b *= 0.5;
        }
        return [r, g, b];
      },
      size,
      size,
      3.8
    );
  }

  // =========================================================================
  // BACKWARD-COMPATIBLE TEXTURE GETTERS (Cached CanvasTextures)
  // =========================================================================

  public static getGrassTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getGrassPackage(size).albedo;
  }

  public static getAsphaltTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getAsphaltPackage(size).albedo;
  }

  public static getAsphaltNormalTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getAsphaltPackage(size).normal;
  }

  public static getAsphaltRoughnessTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getAsphaltPackage(size).roughness;
  }

  public static getPavingTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getPavingPackage(size).albedo;
  }

  public static getRoofTileTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getTerracottaPackage(size).albedo;
  }

  public static getBrickTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getBrickPackage(size).albedo;
  }

  public static getWoodTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getTeakWoodPackage(size).albedo;
  }

  public static getPlasterTexture(size: number = 1024, baseColor: string = '#f8fafc'): THREE.CanvasTexture {
    return this.getPlasterPackage(size, baseColor).albedo;
  }

  public static getModernWoodSlatTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getTeakWoodPackage(size).albedo;
  }

  public static getBoardFormedConcreteTexture(size: number = 512): THREE.CanvasTexture {
    return this.getBoardFormedConcretePackage(size).albedo;
  }

  public static getDarkZincRoofTexture(size: number = 512): THREE.CanvasTexture {
    return this.getDarkZincRoofPackage(size).albedo;
  }

  public static getStonePlinthTexture(size: number = 1024): THREE.CanvasTexture {
    return this.getStoneCandiPackage(size).albedo;
  }

  public static getTactilePavingTexture(size: number = 512): THREE.CanvasTexture {
    return this.getTactilePavingPackage(size).albedo;
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
   * Procedural Clean White Stencil Road Text "MALIOBORO"
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

