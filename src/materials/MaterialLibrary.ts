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
  private maxAnisotropy: number = 16;
  private sunDirection: THREE.Vector3 = new THREE.Vector3(-0.85, 0.46, 0.22).normalize();

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

  public setSunDirection(dir: THREE.Vector3): void {
    this.sunDirection.copy(dir).normalize();
    for (const mat of this.materialCache.values()) {
      if (mat.userData.parallaxUniforms?.uSunDirection) {
        mat.userData.parallaxUniforms.uSunDirection.value.copy(this.sunDirection);
      }
    }
  }

  public getSunDirection(): THREE.Vector3 {
    return this.sunDirection.clone();
  }

  /**
   * Tahap 2: Custom GLSL Parallax Relief Mapping & Solar Micro-Self-Shadowing
   * Injects 4-step steep ray-marching against bumpMap heightfield and real-time self-shadowing
   * following Yogyakarta sun trajectory (06:00 - 18:00 WIB).
   */
  /**
   * Tahap 2 & Lapis 2: Distance-Clamped Parallax Relief Mapping & Solar Micro-Self-Shadowing
   * Injects 4-step steep ray-marching against bumpMap heightfield and real-time self-shadowing
   * with distance clamping:
   * - camDist > 45.0m: early exit bypasses raymarching completely (uses standard UVs).
   * - 15.0m < camDist <= 45.0m: smoothly interpolates depth scale to 0.
   * - camDist <= 15.0m: full steep parallax depth relief.
   */
  public injectParallaxReliefShader(material: THREE.MeshStandardMaterial, depthScale: number = 0.05): void {
    material.userData.parallaxScale = depthScale;
    material.userData.sunDirection = this.sunDirection;

    if (material.bumpMap) {
      material.bumpScale = depthScale;
    }

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uParallaxScale = { value: depthScale };
      shader.uniforms.uSunDirection = { value: this.sunDirection };
      material.userData.parallaxUniforms = shader.uniforms;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <uv_pars_fragment>',
        `#include <uv_pars_fragment>
        uniform float uParallaxScale;
        uniform vec3 uSunDirection;
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <bumpmap_pars_fragment>',
        `#include <bumpmap_pars_fragment>
        vec2 getDistanceClampedParallaxUv(vec2 uv, vec3 viewPos, float scale, sampler2D heightMap) {
          float camDist = length(viewPos);
          if (camDist > 45.0) return uv;
          float distFactor = 1.0 - smoothstep(15.0, 45.0, camDist);
          float effectiveScale = scale * distFactor;
          if (effectiveScale <= 0.0005) return uv;

          vec3 viewDir = normalize(-viewPos);
          float numLayers = 4.0;
          float layerDepth = 1.0 / numLayers;
          float currentLayerDepth = 0.0;
          vec2 deltaUv = viewDir.xy * effectiveScale / numLayers;
          vec2 currentUv = uv;
          float currentHeight = 1.0 - texture2D(heightMap, currentUv).r;

          for (int i = 0; i < 4; i++) {
            if (currentLayerDepth >= currentHeight) break;
            currentUv -= deltaUv;
            currentHeight = 1.0 - texture2D(heightMap, currentUv).r;
            currentLayerDepth += layerDepth;
          }
          return currentUv;
        }
        `
      );
    };
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

  private static cachedDummyTexture: THREE.Texture | null = null;

  private createDummyTexture(): THREE.Texture {
    if (MaterialLibrary.cachedDummyTexture) {
      return MaterialLibrary.cachedDummyTexture;
    }
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
      MaterialLibrary.cachedDummyTexture = tex;
      return tex;
    }
    const tex = new THREE.Texture();
    MaterialLibrary.cachedDummyTexture = tex;
    return tex;
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
   * Static convenience helper to get or create a cached material
   */
  public static get(type: string, options: MaterialOptions = {}): THREE.MeshStandardMaterial {
    return MaterialLibrary.getInstance().getMaterial(type, options);
  }

  /**
   * Instance alias for getMaterial
   */
  public get(type: string, options: MaterialOptions = {}): THREE.MeshStandardMaterial {
    return this.getMaterial(type, options);
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
    if (this.wetnessFactor > 0) {
      this.setWetness(this.wetnessFactor);
    }
    return mat;
  }

  private buildMaterial(type: string, options: MaterialOptions): THREE.MeshStandardMaterial {
    switch (type) {
      // 1. Aspal Hotmix Jalan Realistis
      case 'asphalt':
      case 'road_asphalt': {
        const pkg = ProceduralTextureGen.getAsphaltPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.05,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(2.4, 2.4),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.88,
          metalness: options.metalness ?? 0.05,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        this.injectParallaxReliefShader(mat, 0.035);
        return mat;
      }

      // 1b. Jalur Sepeda Khusus (Green Hotmix Asphalt)
      case 'cycle':
      case 'cycle_track': {
        const pkg = ProceduralTextureGen.getAsphaltPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.04,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(1.8, 1.8),
          color: options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x166534), // Forest green asphalt
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.05,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        this.injectParallaxReliefShader(mat, 0.03);
        return mat;
      }

      // 1c. Aspal Gang Lingkungan (Darker compact asphalt/communal paving)
      case 'alley':
      case 'road_alley':
      case 'asphalt_alley': {
        const pkg = ProceduralTextureGen.getAsphaltPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.04,
          aoMap: pkg.ao,
          aoMapIntensity: 0.88,
          normalScale: new THREE.Vector2(2.0, 2.0),
          color: options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x334155),
          roughness: options.roughness ?? 0.90,
          metalness: options.metalness ?? 0.04,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        this.injectParallaxReliefShader(mat, 0.03);
        return mat;
      }

      // 2. Beton Struktural & Papan Bekisting
      case 'concrete':
      case 'concrete_board':
      case 'concrete_slab': {
        const pkg = ProceduralTextureGen.getBoardFormedConcretePackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.04,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(2.4, 2.4),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.10,
        });
        this.injectParallaxReliefShader(mat, 0.03);
        return mat;
      }

      // 3. Bata Merah Ekspos
      case 'brick':
      case 'bata_merah': {
        const pkg = ProceduralTextureGen.getBrickPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.08,
          aoMap: pkg.ao,
          aoMapIntensity: 0.90,
          normalScale: new THREE.Vector2(3.2, 3.2),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.88,
          metalness: options.metalness ?? 0.05,
        });
        this.injectParallaxReliefShader(mat, 0.06);
        return mat;
      }

      // 4. Plester Dinding Halus & Tali Air
      case 'plaster':
      case 'wall': {
        const pkg = ProceduralTextureGen.getPlasterPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.03,
          aoMap: pkg.ao,
          aoMapIntensity: 0.80,
          normalScale: new THREE.Vector2(2.4, 2.4),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xf8fafc,
          roughness: options.roughness ?? 0.82,
          metalness: options.metalness ?? 0.04,
        });
        this.injectParallaxReliefShader(mat, 0.025);
        return mat;
      }

      // 5. Genteng Tanah Liat Nusantara
      case 'roof_tile':
      case 'clay_tile':
      case 'genteng': {
        const pkg = ProceduralTextureGen.getTerracottaPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.10,
          aoMap: pkg.ao,
          aoMapIntensity: 0.95,
          normalScale: new THREE.Vector2(3.2, 3.2),
          roughness: options.roughness ?? 0.80,
          metalness: options.metalness ?? 0.05,
        });
        this.injectParallaxReliefShader(mat, 0.075);
        return mat;
      }

      // 6. Kayu Jati Arsitektural
      case 'wood':
      case 'wood_slat':
      case 'door_wood': {
        const pkg = ProceduralTextureGen.getTeakWoodPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.05,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(2.4, 2.4),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.65,
          metalness: options.metalness ?? 0.08,
        });
        this.injectParallaxReliefShader(mat, 0.04);
        return mat;
      }

      // 7. Rumput Taman Tropis
      case 'grass':
      case 'lawn': {
        const pkg = ProceduralTextureGen.getGrassPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.05,
          aoMap: pkg.ao,
          aoMapIntensity: 0.80,
          normalScale: new THREE.Vector2(0.8, 0.8),
          roughness: options.roughness ?? 0.88,
          metalness: options.metalness ?? 0.02,
        });
        this.injectParallaxReliefShader(mat, 0.035);
        return mat;
      }

      // 8. Paving Block Trotoar & Pedestrian
      case 'paving':
      case 'paving_block':
      case 'sidewalk_paving': {
        const pkg = ProceduralTextureGen.getPavingPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.05,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(2.4, 2.4),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.06,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        this.injectParallaxReliefShader(mat, 0.04);
        return mat;
      }

      // 9. Plat Trotoar Beton
      case 'trotoar':
      case 'sidewalk':
      case 'sidewalk_curb': {
        const pkg = ProceduralTextureGen.getPavingPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.05,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(2.4, 2.4),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xd1d5db,
          roughness: options.roughness ?? 0.84,
          metalness: options.metalness ?? 0.06,
        });
        this.injectParallaxReliefShader(mat, 0.04);
        return mat;
      }

      // Tactile Paving Block (Jalur Pemandu Disabilitas Kuning)
      case 'tactile_paving':
      case 'tactile': {
        const pkg = ProceduralTextureGen.getTactilePavingPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.08,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(3.2, 3.2),
          roughness: 0.72,
          metalness: 0.08
        });
        this.injectParallaxReliefShader(mat, 0.055);
        return mat;
      }

      // 10. Tanah Subur / Resapan
      case 'soil':
      case 'tanah':
      case 'ground': {
        const colorTex = this.loadTexture('/assets/textures/tanah/color.jpg', true, () => ProceduralTextureGen.getGrassTexture(512));
        const normalTex = this.loadTexture('/assets/textures/tanah/normal.jpg', false);
        const roughTex = this.loadTexture('/assets/textures/tanah/roughness.jpg', false);
        return new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          normalScale: new THREE.Vector2(2.0, 2.0),
          roughness: options.roughness ?? 0.95,
          metalness: options.metalness ?? 0.02,
        });
      }

      // 11. Batu Alam & Batu Candi Andesit Yogyakarta
      case 'stone_candi':
      case 'stone_plinth':
      case 'stone':
      case 'batu_alam': {
        const pkg = ProceduralTextureGen.getStoneCandiPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.09,
          aoMap: pkg.ao,
          aoMapIntensity: 0.90,
          normalScale: new THREE.Vector2(3.2, 3.2),
          roughness: options.roughness ?? 0.90,
          metalness: options.metalness ?? 0.15,
        });
        this.injectParallaxReliefShader(mat, 0.07);
        return mat;
      }

      // Rooster Angin / Breeze Block
      case 'roster':
      case 'breeze_block':
      case 'roster_breeze_block': {
        const pkg = ProceduralTextureGen.getRosterPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.12,
          aoMap: pkg.ao,
          aoMapIntensity: 0.90,
          normalScale: new THREE.Vector2(3.2, 3.2),
          roughness: 0.85,
          metalness: 0.08,
        });
        this.injectParallaxReliefShader(mat, 0.08);
        return mat;
      }

      // 12. Metal Lembaran / Seng Gelap
      case 'metal':
      case 'zinc_roof':
      case 'dark_zinc':
      case 'dark_metal': {
        const pkg = ProceduralTextureGen.getDarkZincRoofPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.04,
          aoMap: pkg.ao,
          aoMapIntensity: 0.80,
          normalScale: new THREE.Vector2(1.8, 1.8),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x383d45,
          roughness: options.roughness ?? 0.45,
          metalness: options.metalness ?? 0.65,
        });
        this.injectParallaxReliefShader(mat, 0.035);
        return mat;
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

      // Weathered Corten Steel (Wayang Gunungan & Modern Public Art)
      case 'corten_steel':
      case 'corten': {
        const pkg = ProceduralTextureGen.getCortenSteelPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.06,
          aoMap: pkg.ao,
          aoMapIntensity: 0.85,
          normalScale: new THREE.Vector2(2.8, 2.8),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.75,
          metalness: options.metalness ?? 0.65,
        });
        this.injectParallaxReliefShader(mat, 0.04);
        return mat;
      }

      // Terrazzo Matrix (Malioboro Bollards, Planters, Urban Furniture)
      case 'terrazzo':
      case 'teraso':
      case 'stone_terrazzo': {
        const pkg = ProceduralTextureGen.getTerrazzoPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.03,
          aoMap: pkg.ao,
          aoMapIntensity: 0.75,
          normalScale: new THREE.Vector2(1.8, 1.8),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.42,
          metalness: options.metalness ?? 0.05,
        });
        this.injectParallaxReliefShader(mat, 0.025);
        return mat;
      }

      // Polished Black Granite & Nero Assoluto (Sculpture Plinths & Fountains)
      case 'granite':
      case 'black_granite':
      case 'black_marble': {
        const pkg = ProceduralTextureGen.getGranitePackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.02,
          aoMap: pkg.ao,
          aoMapIntensity: 0.80,
          normalScale: new THREE.Vector2(1.5, 1.5),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.22,
          metalness: options.metalness ?? 0.25,
        });
        this.injectParallaxReliefShader(mat, 0.02);
        return mat;
      }

      // Organic Tree Bark
      case 'bark':
      case 'tree_bark': {
        const pkg = ProceduralTextureGen.getBarkPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.09,
          aoMap: pkg.ao,
          aoMapIntensity: 0.90,
          normalScale: new THREE.Vector2(3.2, 3.2),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.90,
          metalness: options.metalness ?? 0.02,
        });
        this.injectParallaxReliefShader(mat, 0.06);
        return mat;
      }

      // Gold Leaf & Brass (Tugu Jogja Pinnacle & Clock Tower Accents)
      case 'gold_leaf':
      case 'gold':
      case 'brass': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xf59e0b,
          roughness: options.roughness ?? 0.22,
          metalness: options.metalness ?? 0.88,
        });
      }

      // Polished Chrome & Kinetic Steel
      case 'kinetic_metal':
      case 'chrome':
      case 'polished_steel': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xe2e8f0,
          roughness: options.roughness ?? 0.15,
          metalness: options.metalness ?? 0.92,
        });
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
    this.wetnessFactor = clamped;

    const outdoorKeys = ['asphalt', 'road_asphalt', 'concrete', 'roof_tile', 'paving', 'sidewalk_paving', 'trotoar', 'sidewalk', 'stone_plinth'];
    for (const [key, mat] of this.materialCache.entries()) {
      const isOutdoor = outdoorKeys.some((k) => key.startsWith(k));
      if (!isOutdoor) continue;

      if (mat.userData.baseRoughness === undefined) {
        mat.userData.baseRoughness = mat.roughness;
      }
      if (mat.userData.baseMetalness === undefined) {
        mat.userData.baseMetalness = mat.metalness;
      }
      if (mat.userData.baseEnvMapIntensity === undefined) {
        mat.userData.baseEnvMapIntensity = mat.envMapIntensity ?? 1.0;
      }
      if (!mat.userData.baseColor) {
        mat.userData.baseColor = mat.color.clone();
      }

      if (key.startsWith('road_asphalt') || key.startsWith('asphalt')) {
        // Target roughness drops to 0.22 in wet mode, restores to 0.88 when dry
        mat.roughness = THREE.MathUtils.lerp(mat.userData.baseRoughness ?? 0.88, 0.22, clamped);
        mat.metalness = THREE.MathUtils.lerp(mat.userData.baseMetalness, 0.20, clamped);
        mat.envMapIntensity = THREE.MathUtils.lerp(mat.userData.baseEnvMapIntensity, 2.2, clamped);
      } else if (key.startsWith('sidewalk_paving') || key.startsWith('paving') || key.startsWith('trotoar') || key.startsWith('sidewalk')) {
        // Target roughness drops to 0.30 in wet mode, restores to base when dry
        mat.roughness = THREE.MathUtils.lerp(mat.userData.baseRoughness, 0.30, clamped);
        mat.metalness = THREE.MathUtils.lerp(mat.userData.baseMetalness, 0.18, clamped);
        mat.envMapIntensity = THREE.MathUtils.lerp(mat.userData.baseEnvMapIntensity, 1.8, clamped);
      } else {
        const targetRoughness = Math.max(0.12, mat.userData.baseRoughness * 0.4);
        mat.roughness = THREE.MathUtils.lerp(mat.userData.baseRoughness, targetRoughness, clamped);
      }

      // Darken color slightly when saturated with water
      const darken = 1.0 - clamped * 0.18;
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
