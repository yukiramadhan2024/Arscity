import * as THREE from 'three';
import { ProceduralTextureGen } from './ProceduralTextureGen';
import { applyWindShader } from './WindShader';

export interface MaterialOptions {
  color?: string | number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  uvScale?: [number, number];
}

export interface TexturePackage {
  color?: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
  ao?: THREE.Texture;
}

/**
 * MaterialLibrary - Centralized PBR Material & Texture Manager for Arscity.
 *
 * Implements Milestone T1.1:
 * - Loads authentic CC0 1K PBR textures from public/assets/textures
 * - Sets sRGB colorSpace for albedo, Linear for normal/roughness/AO
 * - Configures mipmaps, anisotropic filtering, and seamless RepeatWrapping
 * - Caches material instances to prevent duplicate allocations per building
 * - Seamless fallback to ProceduralTextureGen if asset load fails
 */
export class MaterialLibrary {
  private static instance: MaterialLibrary;
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private textureCache: Map<string, THREE.Texture> = new Map();
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private fallbackMaterials: Set<string> = new Set();
  private realTexturesLoadedCount: number = 0;
  private totalTexturesAttempted: number = 0;
  private maxAnisotropy: number = 8;

  private constructor() {
    // Singleton
  }

  public static getInstance(): MaterialLibrary {
    if (!MaterialLibrary.instance) {
      MaterialLibrary.instance = new MaterialLibrary();
    }
    return MaterialLibrary.instance;
  }

  public setMaxAnisotropy(anisotropy: number): void {
    this.maxAnisotropy = Math.max(1, anisotropy);
    for (const tex of this.textureCache.values()) {
      tex.anisotropy = this.maxAnisotropy;
      if (tex.image) {
        tex.needsUpdate = true;
      }
    }
  }

  public isUsingFallback(): boolean {
    return this.fallbackMaterials.size > 0 && this.realTexturesLoadedCount === 0;
  }

  public getLoadedTextureCount(): number {
    return this.realTexturesLoadedCount;
  }

  public getStatusText(): string {
    if (this.realTexturesLoadedCount > 0) {
      return `Tekstur CC0 PBR (${this.realTexturesLoadedCount} peta termuat)`;
    }
    return 'Tekstur Sementara (Prosedural Fallback)';
  }

  private createDummyTexture(): THREE.Texture {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, 2, 2);
      }
      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = false;
      return tex;
    }
    return new THREE.Texture();
  }

  /**
   * Safe asynchronous texture loader with sRGB / linear handling
   */
  public loadTexture(url: string, isColor: boolean = true, fallbackGen?: () => THREE.Texture): THREE.Texture {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }

    this.totalTexturesAttempted++;

    // Immediately generate fallback texture with valid image data so WebGLRenderer never complains
    let initialTex: THREE.Texture;
    if (fallbackGen) {
      try {
        initialTex = fallbackGen();
      } catch {
        initialTex = this.createDummyTexture();
      }
    } else {
      initialTex = this.createDummyTexture();
    }

    initialTex.wrapS = THREE.RepeatWrapping;
    initialTex.wrapT = THREE.RepeatWrapping;
    if (isColor) {
      initialTex.colorSpace = THREE.SRGBColorSpace;
    }
    this.textureCache.set(url, initialTex);

    // Stream real CC0 image
    if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
      this.textureLoader.load(
        url,
        (loadedTex) => {
          loadedTex.wrapS = THREE.RepeatWrapping;
          loadedTex.wrapT = THREE.RepeatWrapping;
          loadedTex.generateMipmaps = true;
          loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
          loadedTex.magFilter = THREE.LinearFilter;
          loadedTex.anisotropy = this.maxAnisotropy;

          if (isColor) {
            loadedTex.colorSpace = THREE.SRGBColorSpace;
          } else {
            loadedTex.colorSpace = THREE.NoColorSpace;
          }

          // Replace placeholder image in existing texture object to preserve material bindings
          initialTex.image = loadedTex.image;
          initialTex.colorSpace = loadedTex.colorSpace;
          initialTex.generateMipmaps = true;
          initialTex.minFilter = loadedTex.minFilter;
          initialTex.magFilter = loadedTex.magFilter;
          initialTex.anisotropy = loadedTex.anisotropy;
          initialTex.needsUpdate = true;

          this.realTexturesLoadedCount++;
        },
        undefined,
        (err) => {
          console.warn(`[MaterialLibrary] Failed to load real texture at "${url}", using procedural fallback.`, err);
          this.fallbackMaterials.add(url);
        }
      );
    }

    return initialTex;
  }

  /**
   * Get or create a cached PBR material for the given type and styling
   */
  public getMaterial(type: string, options: MaterialOptions = {}): THREE.MeshStandardMaterial {
    const colorKey = options.color !== undefined ? String(options.color) : 'def';
    const roughKey = options.roughness !== undefined ? options.roughness.toFixed(2) : 'def';
    const metalKey = options.metalness !== undefined ? options.metalness.toFixed(2) : 'def';
    const opacKey = options.opacity !== undefined ? options.opacity.toFixed(2) : '1';
    const cacheKey = `${type}_${colorKey}_${roughKey}_${metalKey}_${opacKey}`;

    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }

    const mat = this.buildMaterial(type, options);
    this.materialCache.set(cacheKey, mat);
    return mat;
  }

  private buildMaterial(type: string, options: MaterialOptions): THREE.MeshStandardMaterial {
    switch (type) {
      // 1. Aspal Jalan
      case 'asphalt':
      case 'road_asphalt': {
        const colorTex = this.loadTexture('/assets/textures/aspal/color.jpg', true, () => ProceduralTextureGen.getAsphaltTexture(512));
        const normalTex = this.loadTexture('/assets/textures/aspal/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/aspal/roughness.jpg', false, () => ProceduralTextureGen.getAsphaltRoughnessTexture(512));
        colorTex.repeat.set(4, 4);
        normalTex.repeat.set(4, 4);
        roughTex.repeat.set(4, 4);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          roughness: options.roughness ?? 0.82,
          metalness: options.metalness ?? 0.05,
        });
      }

      // 2. Beton Struktural
      case 'concrete':
      case 'concrete_board': {
        const colorTex = this.loadTexture('/assets/textures/beton/color.jpg', true, () => ProceduralTextureGen.getBoardFormedConcreteTexture(512));
        const normalTex = this.loadTexture('/assets/textures/beton/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/beton/roughness.jpg', false);
        colorTex.repeat.set(2, 2);
        normalTex.repeat.set(2, 2);
        roughTex.repeat.set(2, 2);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.10,
        });
      }

      // 3. Bata Merah
      case 'brick':
      case 'bata_merah': {
        const colorTex = this.loadTexture('/assets/textures/bata_merah/color.jpg', true, () => ProceduralTextureGen.getBrickTexture(512));
        const normalTex = this.loadTexture('/assets/textures/bata_merah/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/bata_merah/roughness.jpg', false);
        const aoTex = this.loadTexture('/assets/textures/bata_merah/ao.jpg', false);
        colorTex.repeat.set(2, 2);
        normalTex.repeat.set(2, 2);
        roughTex.repeat.set(2, 2);
        aoTex.repeat.set(2, 2);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          aoMap: aoTex,
          aoMapIntensity: 0.8,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.88,
          metalness: options.metalness ?? 0.05,
        });
      }

      // 4. Plester Dinding Halus
      case 'plaster':
      case 'wall': {
        const colorTex = this.loadTexture('/assets/textures/plester/color.jpg', true, () => ProceduralTextureGen.getPlasterTexture(512, String(options.color || '#f8fafc')));
        const normalTex = this.loadTexture('/assets/textures/plester/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/plester/roughness.jpg', false);
        colorTex.repeat.set(2, 2);
        normalTex.repeat.set(2, 2);
        roughTex.repeat.set(2, 2);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xf8fafc,
          roughness: options.roughness ?? 0.82,
          metalness: options.metalness ?? 0.04,
        });
      }

      // 5. Genteng Tanah Liat
      case 'roof_tile':
      case 'genteng': {
        const colorTex = this.loadTexture('/assets/textures/genteng/color.jpg', true, () => ProceduralTextureGen.getRoofTileTexture(512));
        const normalTex = this.loadTexture('/assets/textures/genteng/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/genteng/roughness.jpg', false);
        colorTex.repeat.set(3, 3);
        normalTex.repeat.set(3, 3);
        roughTex.repeat.set(3, 3);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          roughness: options.roughness ?? 0.80,
          metalness: options.metalness ?? 0.05,
        });
      }

      // 6. Kayu Alami / Parket
      case 'wood':
      case 'wood_slat':
      case 'door_wood': {
        const colorTex = this.loadTexture('/assets/textures/kayu/color.jpg', true, () => ProceduralTextureGen.getModernWoodSlatTexture(512));
        const normalTex = this.loadTexture('/assets/textures/kayu/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/kayu/roughness.jpg', false);
        colorTex.repeat.set(1.5, 2);
        normalTex.repeat.set(1.5, 2);
        roughTex.repeat.set(1.5, 2);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.65,
          metalness: options.metalness ?? 0.08,
        });
      }

      // 7. Rumput Taman Tropis
      case 'grass':
      case 'lawn': {
        const colorTex = this.loadTexture('/assets/textures/rumput/color.jpg', true, () => ProceduralTextureGen.getGrassTexture(512));
        const normalTex = this.loadTexture('/assets/textures/rumput/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/rumput/roughness.jpg', false);
        const aoTex = this.loadTexture('/assets/textures/rumput/ao.jpg', false);
        colorTex.repeat.set(16, 16);
        normalTex.repeat.set(16, 16);
        roughTex.repeat.set(16, 16);
        aoTex.repeat.set(16, 16);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          aoMap: aoTex,
          aoMapIntensity: 0.7,
          roughness: options.roughness ?? 0.88,
          metalness: options.metalness ?? 0.02,
        });
      }

      // 8. Paving Block Trotoar
      case 'paving':
      case 'paving_block': {
        const colorTex = this.loadTexture('/assets/textures/paving/color.jpg', true, () => ProceduralTextureGen.getPavingTexture(512));
        const normalTex = this.loadTexture('/assets/textures/paving/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/paving/roughness.jpg', false);
        const aoTex = this.loadTexture('/assets/textures/paving/ao.jpg', false);
        colorTex.repeat.set(2, 2);
        normalTex.repeat.set(2, 2);
        roughTex.repeat.set(2, 2);
        aoTex.repeat.set(2, 2);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          aoMap: aoTex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.06,
        });
      }

      // 9. Plat Trotoar Beton
      case 'trotoar':
      case 'sidewalk':
      case 'sidewalk_curb': {
        const colorTex = this.loadTexture('/assets/textures/trotoar/color.jpg', true, () => ProceduralTextureGen.getPavingTexture(512));
        const normalTex = this.loadTexture('/assets/textures/trotoar/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/trotoar/roughness.jpg', false);
        colorTex.repeat.set(2, 2);
        normalTex.repeat.set(2, 2);
        roughTex.repeat.set(2, 2);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xd1d5db,
          roughness: options.roughness ?? 0.84,
          metalness: options.metalness ?? 0.06,
        });
      }

      // Tactile Paving Block (Jalur Pemandu Disabilitas Kuning)
      case 'tactile_paving':
      case 'tactile': {
        const tex = ProceduralTextureGen.getTactilePavingTexture(256);
        tex.repeat.set(1, 8);
        return new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.72,
          metalness: 0.08
        });
      }

      // 10. Tanah Subur / Resapan
      case 'soil':
      case 'tanah':
      case 'ground': {
        const colorTex = this.loadTexture('/assets/textures/tanah/color.jpg', true);
        const normalTex = this.loadTexture('/assets/textures/tanah/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/tanah/roughness.jpg', false);
        colorTex.repeat.set(4, 4);
        normalTex.repeat.set(4, 4);
        roughTex.repeat.set(4, 4);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          roughness: options.roughness ?? 0.95,
          metalness: options.metalness ?? 0.02,
        });
      }

      // 11. Batu Alam Plinth
      case 'stone_plinth':
      case 'stone':
      case 'batu_alam': {
        const colorTex = this.loadTexture('/assets/textures/batu_alam/color.jpg', true, () => ProceduralTextureGen.getStonePlinthTexture(512));
        const normalTex = this.loadTexture('/assets/textures/batu_alam/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/batu_alam/roughness.jpg', false);
        colorTex.repeat.set(3, 1);
        normalTex.repeat.set(3, 1);
        roughTex.repeat.set(3, 1);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          roughness: options.roughness ?? 0.90,
          metalness: options.metalness ?? 0.15,
        });
      }

      // 12. Metal Lembaran / Seng Gelap
      case 'metal':
      case 'zinc_roof':
      case 'dark_metal': {
        const colorTex = this.loadTexture('/assets/textures/metal/color.jpg', true, () => ProceduralTextureGen.getDarkZincRoofTexture(512));
        const normalTex = this.loadTexture('/assets/textures/metal/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/metal/roughness.jpg', false);
        colorTex.repeat.set(3, 3);
        normalTex.repeat.set(3, 3);
        roughTex.repeat.set(3, 3);

        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x334155,
          roughness: options.roughness ?? 0.45,
          metalness: options.metalness ?? 0.65,
        });
      }

      // 13. Air Genangan / Sungai / Kolam Resapan
      case 'water':
      case 'air': {
        const normalTex = this.loadTexture('/assets/textures/air/normal.jpg', false);
        normalTex.repeat.set(4, 4);

        return new THREE.MeshStandardMaterial({
          normalMap: normalTex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x0284c7,
          roughness: options.roughness ?? 0.1,
          metalness: options.metalness ?? 0.2,
          transparent: true,
          opacity: options.opacity ?? 0.75,
        });
      }

      // Architectural Glass (Crystal Clear Ultra-Transparent Glass)
      case 'glass': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xb0e0e6,
          roughness: options.roughness ?? 0.1,
          metalness: options.metalness ?? 0.15,
          transparent: true,
          opacity: options.opacity ?? 0.28,
        });
      }

      // Window / Door Frame (Dark Architectural Aluminum)
      case 'frame': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x1e293b,
          roughness: 0.4,
          metalness: 0.8,
        });
      }

      // Foliage (Leaves & Plants)
      case 'foliage': {
        const tex = ProceduralTextureGen.getFoliageTexture(256);
        const mat = new THREE.MeshStandardMaterial({
          map: tex,
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x22c55e,
          roughness: 0.9,
          metalness: 0.05,
        });
        applyWindShader(mat);
        return mat;
      }

      default: {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x94a3b8,
          roughness: options.roughness ?? 0.7,
          metalness: options.metalness ?? 0.1,
        });
      }
    }
  }

  /**
   * Preload all key textures on startup
   */
  public preloadTextures(): void {
    const keyMaterials = [
      'asphalt',
      'concrete',
      'brick',
      'plaster',
      'roof_tile',
      'wood',
      'grass',
      'paving',
      'trotoar',
      'soil',
      'stone_plinth',
      'metal',
      'water',
    ];
    for (const key of keyMaterials) {
      this.getMaterial(key);
    }
  }

  /**
   * Dynamically applies rain wetness to outdoor PBR materials (Asphalt, Concrete, Roof Tile, Paving, Trotoar).
   * Interpolates roughness down (glossy reflection) and darkens base color.
   */
  private wetnessFactor: number = 0;

  public getWetness(): number {
    return this.wetnessFactor;
  }

  public setWetness(factor: number): void {
    const clamped = THREE.MathUtils.clamp(factor, 0, 1);
    if (Math.abs(this.wetnessFactor - clamped) < 0.001) return;
    this.wetnessFactor = clamped;

    const outdoorKeys = ['asphalt', 'concrete', 'roof_tile', 'paving', 'trotoar', 'stone_plinth'];
    for (const [key, mat] of this.materialCache.entries()) {
      const isOutdoor = outdoorKeys.some((k) => key.startsWith(k));
      if (!isOutdoor) continue;

      if (mat.userData.baseRoughness === undefined) {
        mat.userData.baseRoughness = mat.roughness;
      }
      if (!mat.userData.baseColor) {
        mat.userData.baseColor = mat.color.clone();
      }

      // Smoothly reduce roughness (more specular / glossy)
      const targetRoughness = Math.max(0.08, mat.userData.baseRoughness * 0.35);
      mat.roughness = THREE.MathUtils.lerp(mat.userData.baseRoughness, targetRoughness, clamped);

      // Darken color slightly when saturated with water
      const darken = 1.0 - clamped * 0.22;
      mat.color.copy(mat.userData.baseColor).multiplyScalar(darken);
      mat.needsUpdate = true;
    }
  }

  /**
   * Dedicated Architectural Maquette Matte Materials for SimCity Data Lens Overrides.
   */
  public maquetteMaterials = {
    neutral: new THREE.MeshStandardMaterial({
      color: 0xf3f2ee,
      roughness: 0.92,
      metalness: 0.05
    }),
    good: new THREE.MeshStandardMaterial({
      color: 0x34c759,
      roughness: 0.75,
      metalness: 0.05
    }),
    warn: new THREE.MeshStandardMaterial({
      color: 0xff9500,
      roughness: 0.75,
      metalness: 0.05
    }),
    bad: new THREE.MeshStandardMaterial({
      color: 0xff3b30,
      roughness: 0.75,
      metalness: 0.05
    }),
    terrain: new THREE.MeshStandardMaterial({
      color: 0xfaf9f6,
      roughness: 0.95,
      metalness: 0.02
    }),
    road: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.88,
      metalness: 0.05
    })
  };

  /**
   * Sets night window illumination glow for building glass.
   * During twilight/night (17:45 - 05:30 WIB), warms window panes to 2700K incandescent amber.
   */
  private nightGlowFactor: number = 0;

  public setNightGlow(factor: number): void {
    const clamped = THREE.MathUtils.clamp(factor, 0, 1);
    if (Math.abs(this.nightGlowFactor - clamped) < 0.001) return;
    this.nightGlowFactor = clamped;

    for (const [key, mat] of this.materialCache.entries()) {
      if (key.startsWith('glass')) {
        if (clamped > 0) {
          mat.emissive.setHex(0xffe4b5); // Warm 2700K incandescent interior light
          mat.emissiveIntensity = clamped * 1.8;
          mat.opacity = THREE.MathUtils.lerp(0.45, 0.85, clamped);
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
          mat.opacity = 0.45;
        }
        mat.needsUpdate = true;
      }
    }
  }

  public reset(): void {
    this.dispose();
    this.preloadTextures();
  }

  /**
   * Clean up all cached materials and textures
   */
  public dispose(): void {
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    this.materialCache.clear();

    for (const tex of this.textureCache.values()) {
      tex.dispose();
    }
    this.textureCache.clear();
  }
}
