import * as THREE from 'three';
import { BuildingCatalogRegistry } from '../buildings/BuildingCatalogRegistry';

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
   * 5. Dinding Plester Halus (plaster_wall / concrete)
   * Pure clean smooth mineral micro stucco sand texture without stripes or grooves.
   */
  public static getPlasterPackage(size: number = 512, _baseColor: string = '#ffffff'): Material3DPackage {
    // Generate unified neutral white plaster maps; architectural color tinting is applied via material.color
    const cr = 255;
    const cg = 255;
    const cb = 255;

    return this.generate3DMaterialMaps(
      'plaster_neutral',
      (u, v) => {
        // Pure smooth stucco mineral sand grain
        const grain = (Math.sin(u * 420) * Math.cos(v * 420)) * 0.04;
        return 0.85 + grain;
      },
      (u, v) => {
        const grainNoise = (Math.sin(u * 320) + Math.cos(v * 320)) * 3;
        const r = Math.min(255, Math.max(0, cr + grainNoise));
        const g = Math.min(255, Math.max(0, cg + grainNoise));
        const b = Math.min(255, Math.max(0, cb + grainNoise));
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
        // Bitumen dark neutral charcoal base (#222324, zero cool-blue bias)
        if (h < 0.55) {
          const bitNoise = (Math.sin(u * 250) + Math.cos(v * 250)) * 3;
          return [36 + bitNoise, 36 + bitNoise, 35 + bitNoise];
        }

        // Aggregate stones: neutral volcanic andesite (#464645) & quartz specks
        const isSilica = Math.sin(u * 120 + v * 90) > 0.6;
        if (isSilica) {
          return [88, 88, 86];
        }
        return [64, 64, 62];
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

  /**
   * 17. Roof Gravel / Kerikil Atap Datar Package
   */
  public static getRoofGravelPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'roof_gravel',
      (u, v) => {
        const p1 = Math.sin(u * 96) * Math.cos(v * 96);
        const p2 = Math.sin(u * 144 + 1.2) * Math.cos(v * 144 + 0.8);
        const p3 = Math.sin((u + v) * 80) * 0.5;
        const pebble = Math.max(0, p1 * 0.5 + p2 * 0.35 + p3 * 0.25);
        return 0.35 + pebble * 0.6;
      },
      (u, v, h) => {
        const tint = (Math.sin(u * 48 + v * 32) + 1) * 0.5;
        const baseR = 125 + tint * 20;
        const baseG = 125 + tint * 18;
        const baseB = 120 + tint * 15;
        if (h < 0.4) {
          return [baseR * 0.45, baseG * 0.45, baseB * 0.45];
        }
        return [baseR, baseG, baseB];
      },
      size,
      size,
      3.5
    );
  }

  /**
   * 18. Roof Membrane / Membran Kedap Air Atap Datar Package
   */
  public static getRoofMembranePackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'roof_membrane',
      (u, v) => {
        const seam = ((v * 2) % 1) < 0.04 ? 0.9 : 0.6;
        const micro = (Math.sin(u * 180) * Math.cos(v * 180)) * 0.04;
        return seam + micro;
      },
      (u, v, h) => {
        if (h > 0.85) return [50, 52, 56];
        return [36, 38, 41];
      },
      size,
      size,
      2.2
    );
  }

  /**
   * 19. Corrugated Metal / Spandek Roof Package
   */
  public static getSpandekPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'roof_spandek',
      (u) => {
        const su = (u * 8) % 1;
        if (su < 0.3) {
          return 0.95;
        } else if (su < 0.4) {
          return 0.95 - (su - 0.3) * 6.5;
        } else if (su < 0.9) {
          return 0.30;
        } else {
          return 0.30 + (su - 0.9) * 6.5;
        }
      },
      (u, v, h) => {
        if (h > 0.8) return [145, 155, 165];
        return [95, 105, 115];
      },
      size,
      size,
      4.0
    );
  }

  /**
   * 20. Metal Roof Tile / Genteng Metal Pasir Package
   */
  public static getMetalTilePackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'roof_metal_tile',
      (u, v) => {
        const sv = (v * 16) % 1;
        const stepped = sv < 0.15 ? 0.95 : 0.45 + (1.0 - sv) * 0.4;
        const grain = (Math.sin(u * 200) * Math.cos(v * 200)) * 0.08;
        return stepped + grain;
      },
      (u, v, h) => {
        if (h > 0.85) return [70, 75, 82];
        return [42, 45, 50];
      },
      size,
      size,
      3.4
    );
  }

  /**
   * 21. ACP Cladding / Panel Aluminium Komposit Package
   */
  public static getAcpPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'facade_acp',
      (u, v) => {
        const gu = (u * 4) % 1;
        const gv = (v * 2) % 1;
        const isJoint = gu < 0.04 || gv < 0.04;
        return isJoint ? 0.15 : 0.85;
      },
      (u, v, h) => {
        if (h < 0.3) return [20, 24, 30];
        return [220, 225, 232];
      },
      size,
      size,
      3.0
    );
  }

  /**
   * 22. Stucco / Plester Kasar Kamprot Package
   */
  public static getStuccoPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'stucco_rough',
      (u, v) => {
        const n1 = Math.sin(u * 120 + Math.sin(v * 60) * 2.0);
        const n2 = Math.cos(v * 120 + Math.cos(u * 60) * 2.0);
        const n3 = Math.sin(u * 240) * Math.cos(v * 240) * 0.5;
        return 0.5 + (n1 * 0.25 + n2 * 0.25 + n3 * 0.1);
      },
      (u, v, h) => {
        const tint = 225 + h * 25;
        return [tint, tint * 0.98, tint * 0.95];
      },
      size,
      size,
      2.8
    );
  }

  /**
   * 23. Concrete Curb / Kerb Beton Trotoar Package
   */
  public static getCurbPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'concrete_curb',
      (u, v) => {
        const su = (u * 4) % 1;
        const joint = su < 0.03 ? 0.2 : 0.8;
        const chamfer = v < 0.15 ? 0.5 + v * 2.0 : 0.8;
        return Math.min(joint, chamfer);
      },
      (u, v, h) => {
        if (h < 0.35) return [60, 62, 65];
        return [158, 160, 162];
      },
      size,
      size,
      2.8
    );
  }

  /**
   * 24. Commercial Steel Rolling Door Package (Ruko & Toko)
   */
  public static getRollingDoorPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'rolling_door',
      (u, v) => {
        const slats = 28;
        const sv = (v * slats) % 1;
        const profile = Math.sin(sv * Math.PI) * 0.45;
        const seam = sv < 0.1 ? 0.15 : 0.65 + profile;
        return seam;
      },
      (u, v, h) => {
        if (h < 0.3) return [50, 54, 60]; // Recessed shadow joint
        return [175, 180, 188]; // Galvanized industrial steel
      },
      size,
      size,
      3.8
    );
  }

  /**
   * 25. Commercial Striped Fabric Awning Package
   */
  public static getAwningStripesPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'awning_fabric',
      (u, v) => {
        const folds = 16;
        const fu = (u * folds) % 1;
        const drape = Math.sin(fu * Math.PI) * 0.15;
        return 0.75 + drape;
      },
      (u, v, h) => {
        const stripes = 12;
        const su = (u * stripes) % 1;
        const isStripe = su < 0.5;
        if (isStripe) {
          return [24, 75, 45]; // Classic deep forest green stripe
        }
        return [245, 243, 238]; // Clean warm canvas cream
      },
      size,
      size,
      2.5
    );
  }

  /**
   * 27. High-Efficiency Photovoltaic Solar Panel Package (Solar PV)
   * Monocrystalline silicon cells, silver busbar conductor grids, anti-reflective coating
   */
  public static getSolarPanelPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'solar_panel',
      (u, v) => {
        const cellX = (u * 6) % 1;
        const cellY = (v * 10) % 1;
        const isBorder = cellX < 0.04 || cellX > 0.96 || cellY < 0.03 || cellY > 0.97;
        const isBusbar = Math.abs(cellX - 0.33) < 0.02 || Math.abs(cellX - 0.67) < 0.02;
        if (isBorder) return 0.2;
        if (isBusbar) return 0.95;
        // Fine wafer grid lines
        const fineLine = (cellY * 20) % 1 < 0.08 ? 0.8 : 0.65;
        return fineLine;
      },
      (u, v, h) => {
        const cellX = (u * 6) % 1;
        const cellY = (v * 10) % 1;
        const isBorder = cellX < 0.04 || cellX > 0.96 || cellY < 0.03 || cellY > 0.97;
        const isBusbar = Math.abs(cellX - 0.33) < 0.02 || Math.abs(cellX - 0.67) < 0.02;
        if (isBorder) return [20, 25, 35]; // Dark frame gap
        if (isBusbar) return [210, 220, 230]; // Silver metallic ribbon busbar
        // Monocrystalline deep dark indigo
        return [14, 28, 55];
      },
      size,
      size,
      2.0
    );
  }

  /**
   * 28. Cylindrical Water Tank Ribbed Plastic Package (Toren Air Nusantara)
   * Horizontal annular stiffener ribs characteristic of Indonesian PE water tanks
   */
  public static getTorenRibbedPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'toren_ribbed',
      (u, v) => {
        const ribs = 8;
        const rv = (v * ribs) % 1;
        const ribShape = Math.sin(rv * Math.PI);
        return 0.5 + ribShape * 0.45;
      },
      (u, v, h) => {
        // Neutral greyscale heightfield so material tint or color defines orange/blue/steel
        const val = Math.floor(h * 200 + 40);
        return [val, val, val];
      },
      size,
      size,
      3.0
    );
  }

  /**
   * 29. Sedum Succulent Green Roof Living Mat Package
   * Low-growing drought-tolerant groundcover succulent foliage for tropical eco-roofs
   */
  public static getSedumGreenRoofPackage(size: number = 512): Material3DPackage {
    return this.generate3DMaterialMaps(
      'sedum_green_roof',
      (u, v) => {
        const n1 = Math.sin(u * 32) * Math.cos(v * 32) * 0.25;
        const n2 = Math.sin(u * 64 + 1.2) * Math.sin(v * 64 + 0.8) * 0.15;
        return 0.5 + n1 + n2;
      },
      (u, v, h) => {
        const patch = (Math.sin(u * 12) + Math.cos(v * 12)) * 0.5;
        if (patch > 0.4) {
          // Russet/terracotta sedum flowering tip
          return [140, 60, 25];
        } else if (patch > -0.2) {
          // Lush olive emerald succulent leaf
          return [45, 95, 30];
        } else {
          // Deep moss green / volcanic soil base
          return [28, 55, 20];
        }
      },
      size,
      size,
      2.5
    );
  }

  /**
   * 30. Soft Ambient Contact Shadow Decal Generator
   * Generates a circular Gaussian radial drop-off texture for grounding props and buildings.
   */
  private static contactShadowCache: Map<string, THREE.CanvasTexture> = new Map();

  public static getContactShadowTexture(size: number = 256): THREE.CanvasTexture {
    const cacheKey = `contact_shadow_${size}`;
    if (this.contactShadowCache.has(cacheKey)) {
      return this.contactShadowCache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.createCanvas(size, size);
    const half = size * 0.5;

    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.82)');
    grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.70, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    this.contactShadowCache.set(cacheKey, tex);
    return tex;
  }

  /**
   * 26. Storefront Commercial Signage Banner Generator
   * Generates high-contrast Indonesian generic storefront signs with OFL typography.
   */
  private static signboardCache: Map<string, THREE.CanvasTexture> = new Map();

  public static getStoreSignboardTexture(indexOrSeed: number = 0, width: number = 512, height: number = 128): THREE.CanvasTexture {
    const BUSINESS_NAMES = [
      { title: 'TOKO BERKAH', sub: 'Sembako & Kebutuhan Pokok', bg: '#064e3b', text: '#fde047', border: '#10b981' },
      { title: 'WARUNG SEDAP', sub: 'Masakan Khas & Minuman Segar', bg: '#7c2d12', text: '#ffedd5', border: '#ea580c' },
      { title: 'APOTEK SEHAT', sub: 'Resep Dokter & Obat 24 Jam', bg: '#0369a1', text: '#ffffff', border: '#38bdf8' },
      { title: 'KAFE SUDUT', sub: 'Kopi Nusantara & Roti Bakar', bg: '#1c1917', text: '#fbbf24', border: '#78350f' },
      { title: 'BENGKEL MOTOR', sub: 'Servis Injeksi & Sparepart', bg: '#1e293b', text: '#38bdf8', border: '#64748b' },
      { title: 'TOKO ELEKTRONIK', sub: 'Peralatan Listrik & Rumah', bg: '#312e81', text: '#c7d2fe', border: '#6366f1' },
      { title: 'KANTOR NOTARIS', sub: 'Pejabat Pembuat Akta Tanah', bg: '#1e1b4b', text: '#ffffff', border: '#4338ca' },
      { title: 'LAUNDRY KILAT', sub: 'Cuci Bersih & Setrika Uap', bg: '#0f766e', text: '#ccfbf1', border: '#14b8a6' }
    ];

    const idx = Math.abs(Math.floor(indexOrSeed)) % BUSINESS_NAMES.length;
    const item = BUSINESS_NAMES[idx];
    const cacheKey = `sign_${idx}_${width}x${height}`;

    if (this.signboardCache.has(cacheKey)) {
      return this.signboardCache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.createCanvas(width, height);

    // Background with subtle linear sheen
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, item.bg);
    grad.addColorStop(1, item.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Architectural perimeter border
    ctx.strokeStyle = item.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Text rendering
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Main Title
    ctx.fillStyle = item.text;
    ctx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.title, width * 0.5, height * 0.42);

    // Subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(item.sub, width * 0.5, height * 0.74);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;

    this.signboardCache.set(cacheKey, tex);
    return tex;
  }

  private static impostorFacadeCache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Generates a baked architectural facade texture for LOD2 massing shells (> 250m).
   * Encodes realistic horizontal floor spandrels, window openings, sill accents,
   * and subtle glass reflections into a lightweight 512x512 texture.
   */
  public static getBakedFacadeImpostorTexture(
    wallColor: string = '#f1f5f9',
    windowStyle: string = 'punched',
    size: number = 512
  ): THREE.CanvasTexture {
    const cacheKey = `impostor_${wallColor}_${windowStyle}_${size}`;
    if (this.impostorFacadeCache.has(cacheKey)) {
      return this.impostorFacadeCache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.createCanvas(size, size);

    // 1. Base Wall Background
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, size, size);

    // Subtle noise texture overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    for (let i = 0; i < 2000; i++) {
      const rx = Math.random() * size;
      const ry = Math.random() * size;
      ctx.fillRect(rx, ry, 2, 2);
    }

    // 2. Floor divisions (4 virtual floors)
    const floorCount = 4;
    const floorH = size / floorCount;

    for (let fl = 0; fl < floorCount; fl++) {
      const y0 = fl * floorH;

      // Spandrel floor belt line at floor bottom
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, y0 + floorH - 6, size, 6);

      // Floor plinth/lintel line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
      ctx.fillRect(0, y0, size, 3);

      if (windowStyle === 'curtain') {
        // Continuous curtain wall glass band
        const glassY = y0 + 12;
        const glassH = floorH - 24;
        const grad = ctx.createLinearGradient(0, glassY, 0, glassY + glassH);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#334155');
        ctx.fillStyle = grad;
        ctx.fillRect(8, glassY, size - 16, glassH);

        // Vertical mullions
        const mullionCount = 8;
        const mw = (size - 16) / mullionCount;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
        for (let m = 0; m <= mullionCount; m++) {
          ctx.fillRect(8 + m * mw - 1, glassY, 2, glassH);
        }
      } else {
        // Punched / Ribbon windows: 4 windows per floor
        const winCols = 4;
        const colW = size / winCols;
        const winW = colW * 0.62;
        const winH = floorH * 0.58;
        const winY = y0 + (floorH - winH) * 0.45;

        for (let col = 0; col < winCols; col++) {
          const winX = col * colW + (colW - winW) * 0.5;

          // Window sill shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.fillRect(winX - 2, winY + winH, winW + 4, 3);

          // Window frame
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(winX - 2, winY - 2, winW + 4, winH + 4);

          // Glass pane gradient
          const glassGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
          glassGrad.addColorStop(0, '#1e293b');
          glassGrad.addColorStop(0.6, '#0f172a');
          glassGrad.addColorStop(1, '#1e293b');
          ctx.fillStyle = glassGrad;
          ctx.fillRect(winX, winY, winW, winH);

          // Subtle diagonal sky reflection
          ctx.fillStyle = 'rgba(219, 234, 254, 0.15)';
          ctx.beginPath();
          ctx.moveTo(winX, winY);
          ctx.lineTo(winX + winW * 0.5, winY);
          ctx.lineTo(winX, winY + winH * 0.8);
          ctx.closePath();
          ctx.fill();

          // Mullion divider
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillRect(winX + winW * 0.5 - 1, winY, 2, winH);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;

    this.impostorFacadeCache.set(cacheKey, tex);
    return tex;
  }

  private static impostorFacadeEmissiveCache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Procedural Emissive Map for Baked Facade Impostor.
   * At night, ~40% of windows randomly glow warm incandescent amber/white (#fff1d6),
   * while the rest remain pitch black (#000000).
   */
  public static getBakedFacadeImpostorEmissiveTexture(
    windowStyle: string = 'punched',
    size: number = 512
  ): THREE.CanvasTexture {
    const cacheKey = `impostor_emissive_${windowStyle}_${size}`;
    if (this.impostorFacadeEmissiveCache.has(cacheKey)) {
      return this.impostorFacadeEmissiveCache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.createCanvas(size, size);
    // Base is pitch black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const floorCount = 4;
    const floorH = size / floorCount;

    for (let fl = 0; fl < floorCount; fl++) {
      const y0 = fl * floorH;

      if (windowStyle === 'curtain') {
        const glassY = y0 + 12;
        const glassH = floorH - 24;
        const mullionCount = 8;
        const mw = (size - 16) / mullionCount;
        for (let m = 0; m < mullionCount; m++) {
          // ~40% of panels lit
          const isLit = ((fl * 7 + m * 13) % 10) < 4;
          if (isLit) {
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(8 + m * mw + 1, glassY + 2, mw - 2, glassH - 4);
          }
        }
      } else {
        const winCols = 4;
        const colW = size / winCols;
        const winW = colW * 0.62;
        const winH = floorH * 0.58;
        const winY = y0 + (floorH - winH) * 0.45;

        for (let col = 0; col < winCols; col++) {
          const winX = col * colW + (colW - winW) * 0.5;
          // ~45% of punched windows lit
          const isLit = ((fl * 5 + col * 11) % 9) < 4;
          if (isLit) {
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(winX + 2, winY + 2, winW - 4, winH - 4);
          }
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;

    this.impostorFacadeEmissiveCache.set(cacheKey, tex);
    return tex;
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
    return this.getRoadSurfaceNameTexture('JL. MALIOBORO');
  }

  private static roadNameCache: Map<string, THREE.CanvasTexture> = new Map();

  /**
   * Procedural Road Surface Stencil Text for Indonesian Street Names
   * (e.g. "JL. MALIOBORO", "JL. MANGKUBUMI", "JL. KALIURANG")
   * Complies with the 2-font rule: strictly uses 'Plus Jakarta Sans'.
   */
  public static getRoadSurfaceNameTexture(name: string): THREE.CanvasTexture {
    const formatted = (name || 'JL. KOTA').toUpperCase().trim();
    const cacheKey = `road_text_${formatted}`;
    if (this.roadNameCache.has(cacheKey)) {
      return this.roadNameCache.get(cacheKey)!;
    }

    const width = Math.max(512, Math.min(1024, Math.round(formatted.length * 42 / 64) * 64));
    const height = 128;
    const { canvas, ctx } = this.createCanvas(width, height);
    ctx.clearRect(0, 0, width, height);

    // Subtle edge guide lines / road stencil box
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 14]);
    ctx.strokeRect(12, 10, width - 24, height - 20);
    ctx.setLineDash([]);

    // Stencil text in Plus Jakarta Sans
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 50px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '6px';
    ctx.fillText(formatted, width * 0.5, height * 0.5 + 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    this.roadNameCache.set(cacheKey, texture);
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
   * Procedural 2.5D Architectural Isometric Thumbnail for Building Catalog items
   */
  public static getBuildingThumbnail(id: string, category: string, _name: string): string {
    const cacheKey = `bld_thumb_${id}`;
    if (this.thumbnailDataUrlCache.has(cacheKey)) {
      return this.thumbnailDataUrlCache.get(cacheKey)!;
    }

    const { canvas, ctx } = this.createCanvas(160, 100);
    const w = 160;
    const h = 100;

    const item = BuildingCatalogRegistry.getBuilding(id);
    const floors = item?.defaultFloors || (category === 'industri_logistik' ? 1 : 2);
    const widthM = item?.defaultWidth || 12;
    const depthM = item?.defaultDepth || 14;
    const roofStyle = item?.roofStyle || (category === 'hunian' ? 'joglo' : 'hip');
    const archetype: string = item?.archetype || 'standard';

    // 1. Studio Blueprint Background (Navy Blue to rich Deep Navy gradient)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#072D59');
    bgGrad.addColorStop(1, '#0A3A6E');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Subtle Isometric Blueprint Grid on Floor
    ctx.strokeStyle = 'rgba(219, 242, 252, 0.14)';
    ctx.lineWidth = 0.8;
    for (let gx = 10; gx <= 160; gx += 20) {
      ctx.beginPath();
      ctx.moveTo(gx, 60);
      ctx.lineTo(gx + 35, 95);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(gx, 95);
      ctx.lineTo(gx + 35, 60);
      ctx.stroke();
    }

    // 3. Isometric Projection Geometry
    const cos30 = 0.866;
    const sin30 = 0.5;

    let hw: number;
    let hd: number;
    let hh: number;
    let cx = 80;
    let cy = 78;

    if (floors >= 6) {
      hw = Math.min(38, Math.max(20, widthM * 1.15));
      hd = Math.min(32, Math.max(16, depthM * 1.15));
      hh = Math.min(54, Math.max(38, floors * 3.6 + 20));
      cy = 84;
    } else {
      hw = Math.min(46, Math.max(24, widthM * 1.7));
      hd = Math.min(38, Math.max(20, depthM * 1.7));
      hh = Math.min(42, Math.max(18, floors * 13));
      cy = 78;
    }

    // Base coordinates
    const gF = { x: cx, y: cy };
    const gR = { x: cx + hw * cos30, y: cy - hw * sin30 };
    const gB = { x: cx + (hw - hd) * cos30, y: cy - (hw + hd) * sin30 };
    const gL = { x: cx - hd * cos30, y: cy - hd * sin30 };

    // Concrete Plinth Base
    ctx.fillStyle = '#051833';
    ctx.beginPath();
    ctx.moveTo(gL.x, gL.y + 3);
    ctx.lineTo(gF.x, gF.y + 3);
    ctx.lineTo(gR.x, gR.y + 3);
    ctx.lineTo(gB.x, gB.y + 3);
    ctx.closePath();
    ctx.fill();

    // Wall top vertices
    const tF = { x: gF.x, y: gF.y - hh };
    const tR = { x: gR.x, y: gR.y - hh };
    const tB = { x: gB.x, y: gB.y - hh };
    const tL = { x: gL.x, y: gL.y - hh };

    // Left Wall (Shaded Face)
    ctx.fillStyle = category === 'budaya_hotel' ? '#A16207' : '#94A3B8';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(gL.x, gL.y);
    ctx.lineTo(gF.x, gF.y);
    ctx.lineTo(tF.x, tF.y);
    ctx.lineTo(tL.x, tL.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wall (Lit Face)
    ctx.fillStyle = category === 'budaya_hotel' ? '#CA8A04' : '#E2E8F0';
    ctx.strokeStyle = '#64748B';
    ctx.beginPath();
    ctx.moveTo(gF.x, gF.y);
    ctx.lineTo(gR.x, gR.y);
    ctx.lineTo(tR.x, tR.y);
    ctx.lineTo(tF.x, tF.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Windows / Facade Treatment
    const numF = Math.min(7, floors);
    const winColor = (archetype === 'podium_tower' || category === 'mall_ritel' || category === 'perdagangan_jasa') ? '#38BDF8' : '#FDE047';
    ctx.fillStyle = winColor;

    for (let f = 0; f < numF; f++) {
      const fy = tF.y + (f + 0.22) * (hh / numF);
      const hWin = (hh / numF) * 0.55;

      // Left face windows
      const pLfL = { x: gL.x * 0.75 + gF.x * 0.25, y: fy + (gL.y - gF.y) * 0.75 };
      const pLfR = { x: gL.x * 0.2 + gF.x * 0.8, y: fy + (gL.y - gF.y) * 0.2 };
      ctx.beginPath();
      ctx.moveTo(pLfL.x, pLfL.y);
      ctx.lineTo(pLfR.x, pLfR.y);
      ctx.lineTo(pLfR.x, pLfR.y + hWin);
      ctx.lineTo(pLfL.x, pLfL.y + hWin);
      ctx.closePath();
      ctx.fill();

      // Right face windows
      const pRfL = { x: gF.x * 0.8 + gR.x * 0.2, y: fy + (gR.y - gF.y) * 0.2 };
      const pRfR = { x: gF.x * 0.25 + gR.x * 0.75, y: fy + (gR.y - gF.y) * 0.75 };
      ctx.beginPath();
      ctx.moveTo(pRfL.x, pRfL.y);
      ctx.lineTo(pRfR.x, pRfR.y);
      ctx.lineTo(pRfR.x, pRfR.y + hWin);
      ctx.lineTo(pRfL.x, pRfL.y + hWin);
      ctx.closePath();
      ctx.fill();
    }

    // 5. Roof Architecture
    if (roofStyle === 'joglo') {
      // Joglo tiered overhang eaves
      const eF = { x: tF.x, y: tF.y - 4 };
      const eR = { x: tR.x + 5 * cos30, y: tR.y - 5 * sin30 };
      const eB = { x: tB.x, y: tB.y - 4 };
      const eL = { x: tL.x - 5 * cos30, y: tL.y - 5 * sin30 };

      ctx.fillStyle = '#9A3412';
      ctx.strokeStyle = '#7C2D12';
      ctx.beginPath();
      ctx.moveTo(eL.x, eL.y);
      ctx.lineTo(eF.x, eF.y);
      ctx.lineTo(eR.x, eR.y);
      ctx.lineTo(eB.x, eB.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Steep center pyramidal crown (Soko Guru)
      const mF = { x: eF.x * 0.65 + eB.x * 0.35, y: eF.y * 0.65 + eB.y * 0.35 - 3 };
      const mR = { x: eR.x * 0.65 + eL.x * 0.35, y: eR.y * 0.65 + eL.y * 0.35 - 3 };
      const mL = { x: eL.x * 0.65 + eR.x * 0.35, y: eL.y * 0.65 + eR.y * 0.35 - 3 };
      const apex = { x: tB.x * 0.5 + tF.x * 0.5, y: tF.y - 22 };

      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.moveTo(mL.x, mL.y);
      ctx.lineTo(mF.x, mF.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.moveTo(mF.x, mF.y);
      ctx.lineTo(mR.x, mR.y);
      ctx.lineTo(apex.x, apex.y);
      ctx.closePath();
      ctx.fill();
    } else if (roofStyle === 'hip') {
      const ridgeL = { x: tL.x * 0.55 + tB.x * 0.45, y: tL.y - 14 };
      const ridgeR = { x: tF.x * 0.45 + tR.x * 0.55, y: tR.y - 14 };

      ctx.fillStyle = '#9A3412';
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(tF.x, tF.y);
      ctx.lineTo(ridgeR.x, ridgeR.y);
      ctx.lineTo(ridgeL.x, ridgeL.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.moveTo(tF.x, tF.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.lineTo(ridgeR.x, ridgeR.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#7C2D12';
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(ridgeL.x, ridgeL.y);
      ctx.lineTo(tB.x, tB.y);
      ctx.closePath();
      ctx.fill();
    } else if (roofStyle === 'gable') {
      // Pelana / Gable Roof: Triangular gable face facing front-left, sloped roof plane facing front-right
      const ridgeL = { x: (tL.x + tB.x) * 0.5, y: (tL.y + tB.y) * 0.5 - 15 };
      const ridgeR = { x: (tF.x + tR.x) * 0.5, y: (tF.y + tR.y) * 0.5 - 15 };

      // Front-Right Slope (Lit)
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.moveTo(tF.x, tF.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.lineTo(ridgeR.x, ridgeR.y);
      ctx.lineTo(ridgeL.x, ridgeL.y);
      ctx.closePath();
      ctx.fill();

      // Front Gable Pediment (Shaded Triangular Face)
      ctx.fillStyle = '#9A3412';
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(tF.x, tF.y);
      ctx.lineTo(ridgeL.x, ridgeL.y);
      ctx.closePath();
      ctx.fill();

      // Roof Trim Lines
      ctx.strokeStyle = '#7C2D12';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(ridgeL.x, ridgeL.y);
      ctx.lineTo(tF.x, tF.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.stroke();
    } else if (roofStyle === 'shed_industrial') {
      // Mono-pitch industrial shed roof: high at back-left, sloping down to front-right
      const sL = { x: tL.x, y: tL.y - 12 };
      const sB = { x: tB.x, y: tB.y - 12 };

      // Main Sloped Roof
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.moveTo(tF.x, tF.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.lineTo(sB.x, sB.y);
      ctx.lineTo(sL.x, sL.y);
      ctx.closePath();
      ctx.fill();

      // Corrugated roof lines
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 0.8;
      for (let step = 0.2; step <= 0.8; step += 0.2) {
        ctx.beginPath();
        ctx.moveTo(tF.x * (1 - step) + sL.x * step, tF.y * (1 - step) + sL.y * step);
        ctx.lineTo(tR.x * (1 - step) + sB.x * step, tR.y * (1 - step) + sB.y * step);
        ctx.stroke();
      }
    } else if (roofStyle === 'sawtooth') {
      // Sawtooth industrial double peak
      const p1Apex = { x: tL.x * 0.7 + tF.x * 0.3, y: tF.y - 14 };
      const p2Apex = { x: tL.x * 0.2 + tF.x * 0.8, y: tF.y - 14 };
      const b1Apex = { x: tB.x * 0.7 + tR.x * 0.3, y: tR.y - 14 };
      const b2Apex = { x: tB.x * 0.2 + tR.x * 0.8, y: tR.y - 14 };

      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(p1Apex.x, p1Apex.y);
      ctx.lineTo(b1Apex.x, b1Apex.y);
      ctx.lineTo(tB.x, tB.y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.moveTo(tF.x * 0.5 + tL.x * 0.5, tF.y * 0.5 + tL.y * 0.5);
      ctx.lineTo(p2Apex.x, p2Apex.y);
      ctx.lineTo(b2Apex.x, b2Apex.y);
      ctx.lineTo(tR.x * 0.5 + tB.x * 0.5, tR.y * 0.5 + tB.y * 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (roofStyle === 'arched_vault') {
      // Arched Barrel Vault
      const apexF = { x: (tL.x + tF.x) * 0.5, y: (tL.y + tF.y) * 0.5 - 12 };
      const apexR = { x: (tB.x + tR.x) * 0.5, y: (tB.y + tR.y) * 0.5 - 12 };

      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.quadraticCurveTo(apexF.x, apexF.y, tF.x, tF.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.quadraticCurveTo(apexR.x, apexR.y, tB.x, tB.y);
      ctx.closePath();
      ctx.fill();
    } else if (id.includes('masjid') || id.includes('kubah') || archetype === 'sacred_temple') {
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(tF.x, tF.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.lineTo(tB.x, tB.y);
      ctx.closePath();
      ctx.fill();

      const domeC = { x: tB.x * 0.5 + tF.x * 0.5, y: tF.y - 10 };
      ctx.fillStyle = '#0284C7';
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(domeC.x, domeC.y, 16, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Flat deck parapet
      ctx.fillStyle = '#475569';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(tL.x, tL.y);
      ctx.lineTo(tF.x, tF.y);
      ctx.lineTo(tR.x, tR.y);
      ctx.lineTo(tB.x, tB.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rooftop HVAC unit
      const eqF = { x: tF.x * 0.35 + tB.x * 0.65, y: tF.y - 6 };
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(eqF.x - 5, eqF.y - 5, 10, 5);
    }

    // 6. Floor Badge Pill at Top-Right
    ctx.fillStyle = 'rgba(11, 59, 115, 0.88)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.roundRect(114, 5, 42, 14, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DBF2FC';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.fillText(`${floors} Lt`, 122, 15);

    const dataUrl = canvas.toDataURL('image/png');
    this.thumbnailDataUrlCache.set(cacheKey, dataUrl);
    return dataUrl;
  }
}

