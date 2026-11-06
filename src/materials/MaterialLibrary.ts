import * as THREE from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
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
 * Implements Milestone V2:
 * - Loads authentic CC0 1K/2K PBR textures from public/assets/textures
 * - Sets sRGB colorSpace for albedo, Linear for normal/roughness/AO
 * - Configures mipmaps, anisotropic filtering, and seamless RepeatWrapping
 * - KTX2 / Basis Universal transcoding integration with WebAssembly worker
 * - Real-world metric UV scaling (PHYSICAL_UV_SCALES)
 * - Triplanar / world-scale UV projection & baked vertex AO helpers
 * - Real-time Weathering Shader Overlay (ground splash grime, rain streaking)
 * - Caches material instances to prevent duplicate allocations per building
 * - Seamless fallback to ProceduralTextureGen if asset load fails
 */
export class MaterialLibrary {
  private static instance: MaterialLibrary;
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();
  private ktx2Loader: KTX2Loader | null = null;
  private textureCache: Map<string, THREE.Texture> = new Map();
  private materialCache: Map<string, THREE.MeshStandardMaterial> = new Map();
  private fallbackMaterials: Set<string> = new Set();
  private realTexturesLoadedCount: number = 0;
  private totalTexturesAttempted: number = 0;
  private maxAnisotropy: number = 16;
  private weatheringIntensity: number = 0.85;
  private sunDirection: THREE.Vector3 = new THREE.Vector3(-0.85, 0.46, 0.22).normalize();

  public static readonly PHYSICAL_UV_SCALES: Record<string, number> = {
    asphalt: 4.0,
    road_asphalt: 4.0,
    alley: 3.0,
    cycle: 3.0,
    concrete: 3.0,
    concrete_board: 3.0,
    brick: 2.0,
    bata_merah: 2.0,
    plaster: 3.0,
    plester: 3.0,
    stucco: 3.0,
    plester_kasar: 3.0,
    roof_tile: 2.0,
    genteng: 2.0,
    genteng_metal: 2.0,
    spandek: 2.5,
    roof_gravel: 2.0,
    kerikil_atap: 2.0,
    roof_membrane: 3.0,
    membran_atap: 3.0,
    acp: 2.4,
    panel_metal: 2.4,
    keramik_granit: 2.0,
    wood: 2.5,
    paving: 2.0,
    trotoar: 2.0,
    solar_panel: 1.5,
    green_roof: 2.0,
    sedum_roof: 2.0,
    toren_ribbed: 1.0,
    curb: 1.0,
    impostor_facade: 4.0,
    tactile_paving: 1.0,
    stone_candi: 3.0,
    stone_plinth: 3.0,
    metal: 2.0,
    soil: 4.0,
    grass: 4.0,
  };

  public getPhysicalScale(type: string): number {
    return MaterialLibrary.PHYSICAL_UV_SCALES[type] ?? 2.0;
  }

  /**
   * Initializes KTX2Loader with WebAssembly transcoder path
   */
  public initKTX2(renderer: THREE.WebGLRenderer): void {
    if (typeof window === 'undefined') return;
    if (!this.ktx2Loader) {
      try {
        this.ktx2Loader = new KTX2Loader();
        this.ktx2Loader.setTranscoderPath('/basis/');
        if (renderer && renderer.capabilities) {
          this.ktx2Loader.detectSupport(renderer);
        }
      } catch (e) {
        console.warn('[MaterialLibrary] KTX2Loader initialization warning:', e);
      }
    }
  }

  /**
   * Sets weathering shader intensity across all materials (0.0 = clean, 1.0 = weathered)
   */
  public setWeatheringIntensity(intensity: number): void {
    this.weatheringIntensity = THREE.MathUtils.clamp(intensity, 0, 1);
    for (const mat of this.materialCache.values()) {
      if (mat.userData.parallaxUniforms?.uWeatheringIntensity) {
        mat.userData.parallaxUniforms.uWeatheringIntensity.value = this.weatheringIntensity;
      }
    }
  }

  public getWeatheringIntensity(): number {
    return this.weatheringIntensity;
  }

  /**
   * Automatically calculates and applies world-scale UV coordinates in meters across a geometry.
   * Prevents texture stretching and texture repetition distortions.
   */
  public static applyWorldScaleUVs(geom: THREE.BufferGeometry, uvScaleM: number = 2.0): void {
    if (!geom.attributes.position) return;
    const pos = geom.attributes.position;
    const norm = geom.attributes.normal;
    const uv = geom.attributes.uv;
    if (!uv) return;

    const scale = Math.max(0.1, uvScaleM);
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      let nx = 0, ny = 1, nz = 0;
      if (norm) {
        nx = Math.abs(norm.getX(i));
        ny = Math.abs(norm.getY(i));
        nz = Math.abs(norm.getZ(i));
      }

      if (ny >= nx && ny >= nz) {
        uv.setXY(i, x / scale, z / scale);
      } else if (nx >= ny && nx >= nz) {
        uv.setXY(i, z / scale, y / scale);
      } else {
        uv.setXY(i, x / scale, y / scale);
      }
    }
    uv.needsUpdate = true;
  }

  /**
   * Bakes soft contact ambient occlusion into vertex colors (`geom.attributes.color`).
   * Gives natural contact shadows at foundation line, inner crevices, and under canopies.
   */
  public static applyBakedVertexAO(
    geom: THREE.BufferGeometry,
    options: {
      minY?: number;
      fadeHeight?: number;
      baseOcclusion?: number;
    } = {}
  ): void {
    const pos = geom.attributes.position;
    if (!pos) return;
    const count = pos.count;

    geom.computeBoundingBox();
    const bbox = geom.boundingBox;
    const minY = options.minY ?? (bbox ? bbox.min.y : 0);
    const fadeH = options.fadeHeight ?? 1.2;
    const baseAO = options.baseOcclusion ?? 0.65;

    let colorAttr = geom.attributes.color as THREE.BufferAttribute;
    if (!colorAttr || colorAttr.count !== count) {
      const colors = new Float32Array(count * 3);
      colors.fill(1.0);
      colorAttr = new THREE.BufferAttribute(colors, 3);
      geom.setAttribute('color', colorAttr);
    }

    for (let i = 0; i < count; i++) {
      const y = pos.getY(i);
      const heightAboveBase = Math.max(0, y - minY);
      const groundFactor = THREE.MathUtils.clamp(heightAboveBase / fadeH, 0, 1);
      const ao = THREE.MathUtils.lerp(baseAO, 1.0, groundFactor * groundFactor);

      const r = colorAttr.getX(i) * ao;
      const g = colorAttr.getY(i) * ao;
      const b = colorAttr.getZ(i) * ao;
      colorAttr.setXYZ(i, r, g, b);
    }
    colorAttr.needsUpdate = true;
  }

  // Shared Singleton Glass Materials for 3-Zone Spatial LOD (Tahap 2)
  public readonly kacaDekat: THREE.MeshPhysicalMaterial;
  public readonly kacaJauh: THREE.MeshPhysicalMaterial;

  private constructor() {
    this.kacaDekat = new THREE.MeshPhysicalMaterial({
      name: 'kacaDekat',
      color: new THREE.Color(0xdbeafe),
      transparent: true,
      opacity: 0.32,
      roughness: 0.04,
      metalness: 0.1,
      transmission: 0.65,
      ior: 1.52,
      reflectivity: 0.90,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 2.2,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.kacaDekat.userData.isSharedMaterial = true;

    this.kacaJauh = new THREE.MeshPhysicalMaterial({
      name: 'kacaJauh',
      color: new THREE.Color(0x94a3b8),
      transparent: true,
      opacity: 0.88,
      roughness: 0.10,
      metalness: 0.15,
      transmission: 0.10,
      ior: 1.52,
      reflectivity: 0.95,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.0,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.kacaJauh.userData.isSharedMaterial = true;
  }

  public static getKacaDekat(): THREE.MeshPhysicalMaterial {
    return MaterialLibrary.getInstance().kacaDekat;
  }

  public static getKacaJauh(): THREE.MeshPhysicalMaterial {
    return MaterialLibrary.getInstance().kacaJauh;
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
      shader.uniforms.uWeatheringIntensity = { value: this.weatheringIntensity };
      shader.uniforms.uWetness = { value: this.wetnessFactor };
      material.userData.parallaxUniforms = shader.uniforms;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCustomWorldPos;
        varying vec3 vCustomWorldNormal;
        `
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vCustomWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vCustomWorldNormal = normalize(mat3(modelMatrix) * normal);
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <uv_pars_fragment>',
        `#include <uv_pars_fragment>
        varying vec3 vCustomWorldPos;
        varying vec3 vCustomWorldNormal;
        uniform float uParallaxScale;
        uniform vec3 uSunDirection;
        uniform float uWeatheringIntensity;
        uniform float uWetness;
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

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        if (uWeatheringIntensity > 0.001) {
          // 1. Foundation Ground Splash & Grime Gradient (bottom of walls)
          float groundY = vCustomWorldPos.y;
          float grimeSplash = (1.0 - smoothstep(0.05, 1.25, groundY)) * 0.42 * uWeatheringIntensity;
          vec3 grimeSoilColor = vec3(0.55, 0.50, 0.45);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * grimeSoilColor, grimeSplash);

          // 2. Weathering Rain Streaking Runoff on vertical facades
          if (abs(vCustomWorldNormal.y) < 0.6) {
            float streakFreq = sin(vCustomWorldPos.x * 7.5 + sin(vCustomWorldPos.z * 5.0) * 2.0);
            float streakNoise = fract(sin(dot(floor(vCustomWorldPos.xz * 6.0), vec2(12.9898, 78.233))) * 43758.5453);
            float rainStreak = smoothstep(0.68, 0.98, streakFreq * 0.5 + 0.5) * streakNoise * 0.22 * uWeatheringIntensity;
            diffuseColor.rgb *= (1.0 - rainStreak);
          }
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
      const applyLoaded = (loadedTex: THREE.Texture) => {
        loadedTex.wrapS = THREE.RepeatWrapping;
        loadedTex.wrapT = THREE.RepeatWrapping;
        loadedTex.generateMipmaps = true;
        loadedTex.minFilter = THREE.LinearMipmapLinearFilter;
        loadedTex.magFilter = THREE.LinearFilter;
        loadedTex.anisotropy = this.maxAnisotropy;
        loadedTex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;

        initialTex.image = loadedTex.image;
        initialTex.colorSpace = loadedTex.colorSpace;
        initialTex.generateMipmaps = true;
        initialTex.minFilter = loadedTex.minFilter;
        initialTex.magFilter = loadedTex.magFilter;
        initialTex.anisotropy = loadedTex.anisotropy;
        initialTex.needsUpdate = true;

        this.realTexturesLoadedCount++;
      };

      const tryStandard = () => {
        this.textureLoader.load(
          url,
          applyLoaded,
          undefined,
          (err) => {
            console.warn(`[MaterialLibrary] Failed to load real texture at "${url}", using procedural fallback.`, err);
            this.fallbackMaterials.add(url);
          }
        );
      };

      if (this.ktx2Loader && url.endsWith('.ktx2')) {
        this.ktx2Loader.load(url, applyLoaded, undefined, tryStandard);
      } else {
        tryStandard();
      }
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
    mat.userData.isSharedMaterial = true;
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
          color: options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x252628),
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
      case 'impostor_facade': {
        const wallHex =
          typeof options.color === 'string'
            ? options.color
            : typeof options.color === 'number'
            ? `#${options.color.toString(16).padStart(6, '0')}`
            : '#f8fafc';
        const tex = ProceduralTextureGen.getBakedFacadeImpostorTexture(wallHex, 'punched', 512);
        const emissiveTex = ProceduralTextureGen.getBakedFacadeImpostorEmissiveTexture('punched', 512);
        return new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.85,
          metalness: 0.05,
          emissive: new THREE.Color(0x000000),
          emissiveMap: emissiveTex,
          emissiveIntensity: 0,
        });
      }

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

      case 'kacaDekat':
        return this.kacaDekat as any;

      case 'kacaJauh':
        return this.kacaJauh as any;

      // Architectural PBR Glass (Ultra-Clear Reflective Sky Glass with Fresnel)
      case 'glass':
      case 'glass_lit':
      case 'architectural_glass': {
        const mat = new THREE.MeshPhysicalMaterial({
          name: 'glass',
          color: options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0xdbeafe),
          roughness: options.roughness ?? 0.04,
          metalness: options.metalness ?? 0.1,
          transparent: true,
          opacity: options.opacity ?? 0.35,
          transmission: 0.65,
          ior: 1.52,
          reflectivity: 0.90,
          clearcoat: 1.0,
          clearcoatRoughness: 0.03,
          envMapIntensity: 2.2,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        return mat;
      }

      // Unlit Night Window Pane (Dark Interior)
      case 'glass_dark': {
        const mat = new THREE.MeshPhysicalMaterial({
          name: 'glass_dark',
          color: options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x0f172a),
          roughness: options.roughness ?? 0.08,
          metalness: options.metalness ?? 0.2,
          transparent: true,
          opacity: options.opacity ?? 0.50,
          transmission: 0.45,
          ior: 1.52,
          reflectivity: 0.90,
          clearcoat: 1.0,
          clearcoatRoughness: 0.03,
          envMapIntensity: 1.8,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        return mat;
      }

      // Warm Architectural Lighting Apertures, Street Lamps & Sconces
      case 'lamp_glow':
      case 'warm_light': {
        const glow = this.nightGlowFactor;
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : new THREE.Color(0x334155),
          roughness: 0.2,
          metalness: 0.1,
          emissive: new THREE.Color(0xfef08a),
          emissiveIntensity: glow > 0 ? glow * 2.5 : 0.05,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
      }

      // Window / Door Frame (Dark Architectural Aluminum)
      case 'frame': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x1e293b,
          roughness: 0.4,
          metalness: 0.8,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
      }

      // Floor Belt / Fascia Band
      case 'floor_belt': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xe2e8f0,
          roughness: 0.72,
          metalness: 0.08,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
      }

      // Road Lane & Crosswalk Markings (polygonOffset enabled to eliminate road surface z-fighting)
      case 'road_marking':
      case 'marking': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xf8fafc,
          roughness: 0.75,
          metalness: 0.04,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
      }

      // 22. Rolling Door Ruko (Commercial Steel Rolling Door)
      case 'rolling_door':
      case 'shutter_door': {
        const pkg = ProceduralTextureGen.getRollingDoorPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.05,
          normalScale: new THREE.Vector2(2.5, 2.5),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.45,
          metalness: options.metalness ?? 0.70,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
        this.injectParallaxReliefShader(mat, 0.035);
        return mat;
      }

      // 23. Awning Fabric (Commercial Canopy Canvas)
      case 'awning':
      case 'awning_fabric': {
        const pkg = ProceduralTextureGen.getAwningStripesPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.04,
          normalScale: new THREE.Vector2(2.0, 2.0),
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.02,
          side: THREE.DoubleSide,
        });
        this.injectParallaxReliefShader(mat, 0.03);
        return mat;
      }

      // 24. Papan Nama Toko (Storefront Commercial Signage)
      case 'storefront_sign':
      case 'store_sign': {
        const seed = typeof options.color === 'number' ? options.color : 0;
        const tex = ProceduralTextureGen.getStoreSignboardTexture(seed);
        return new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.25,
          metalness: 0.20,
          emissive: new THREE.Color(0xffffff),
          emissiveMap: tex,
          emissiveIntensity: 0.15,
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

      // 14. Kerikil Atap Datar (Flat Roof Gravel)
      case 'roof_gravel':
      case 'kerikil_atap':
      case 'gravel': {
        const colorTex = this.loadTexture('/assets/textures/kerikil_atap/color.jpg', true, () => ProceduralTextureGen.getRoofGravelPackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/kerikil_atap/normal.jpg', false, () => ProceduralTextureGen.getRoofGravelPackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/kerikil_atap/roughness.jpg', false, () => ProceduralTextureGen.getRoofGravelPackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getRoofGravelPackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.05,
          normalScale: new THREE.Vector2(2.5, 2.5),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.92,
          metalness: options.metalness ?? 0.04,
        });
        this.injectParallaxReliefShader(mat, 0.04);
        return mat;
      }

      // 15. Membran Kedap Air Atap Datar (Waterproof Roof Membrane)
      case 'roof_membrane':
      case 'membran_atap':
      case 'membrane': {
        const colorTex = this.loadTexture('/assets/textures/membran_atap/color.jpg', true, () => ProceduralTextureGen.getRoofMembranePackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/membran_atap/normal.jpg', false, () => ProceduralTextureGen.getRoofMembranePackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/membran_atap/roughness.jpg', false, () => ProceduralTextureGen.getRoofMembranePackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getRoofMembranePackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.03,
          normalScale: new THREE.Vector2(1.8, 1.8),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.08,
        });
        this.injectParallaxReliefShader(mat, 0.025);
        return mat;
      }

      // 16. Atap Spandek Baja Bergelombang (Corrugated Metal Roof)
      case 'spandek':
      case 'corrugated_metal':
      case 'spandek_roof': {
        const colorTex = this.loadTexture('/assets/textures/spandek/color.jpg', true, () => ProceduralTextureGen.getSpandekPackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/spandek/normal.jpg', false, () => ProceduralTextureGen.getSpandekPackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/spandek/roughness.jpg', false, () => ProceduralTextureGen.getSpandekPackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getSpandekPackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.08,
          normalScale: new THREE.Vector2(3.0, 3.0),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.42,
          metalness: options.metalness ?? 0.68,
        });
        this.injectParallaxReliefShader(mat, 0.05);
        return mat;
      }

      // 17. Genteng Metal Pasir Modern (Metal Roofing Tiles)
      case 'genteng_metal':
      case 'metal_tile':
      case 'metal_roof_tile': {
        const colorTex = this.loadTexture('/assets/textures/genteng_metal/color.jpg', true, () => ProceduralTextureGen.getMetalTilePackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/genteng_metal/normal.jpg', false, () => ProceduralTextureGen.getMetalTilePackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/genteng_metal/roughness.jpg', false, () => ProceduralTextureGen.getMetalTilePackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getMetalTilePackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.06,
          normalScale: new THREE.Vector2(2.8, 2.8),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.75,
          metalness: options.metalness ?? 0.35,
        });
        this.injectParallaxReliefShader(mat, 0.045);
        return mat;
      }

      // 18. Panel Aluminium Komposit (ACP Cladding)
      case 'acp':
      case 'panel_metal':
      case 'acp_cladding': {
        const colorTex = this.loadTexture('/assets/textures/acp/color.jpg', true, () => ProceduralTextureGen.getAcpPackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/acp/normal.jpg', false, () => ProceduralTextureGen.getAcpPackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/acp/roughness.jpg', false, () => ProceduralTextureGen.getAcpPackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getAcpPackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.03,
          normalScale: new THREE.Vector2(2.0, 2.0),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.35,
          metalness: options.metalness ?? 0.55,
        });
        this.injectParallaxReliefShader(mat, 0.025);
        return mat;
      }

      // 19. Keramik & Granit Dinding (Wall Ceramic/Granite Tiles)
      case 'keramik_granit':
      case 'wall_tiles':
      case 'granite_wall': {
        const colorTex = this.loadTexture('/assets/textures/keramik_granit/color.jpg', true, () => ProceduralTextureGen.getGranitePackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/keramik_granit/normal.jpg', false, () => ProceduralTextureGen.getGranitePackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/keramik_granit/roughness.jpg', false, () => ProceduralTextureGen.getGranitePackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getGranitePackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.02,
          normalScale: new THREE.Vector2(1.8, 1.8),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.30,
          metalness: options.metalness ?? 0.15,
        });
        this.injectParallaxReliefShader(mat, 0.02);
        return mat;
      }

      // 20. Plester Dinding Kasar & Stucco (Textured Exterior Plaster)
      case 'plester_kasar':
      case 'stucco':
      case 'stucco_rough': {
        const colorTex = this.loadTexture('/assets/textures/plester_kasar/color.jpg', true, () => ProceduralTextureGen.getStuccoPackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/plester_kasar/normal.jpg', false, () => ProceduralTextureGen.getStuccoPackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/plester_kasar/roughness.jpg', false, () => ProceduralTextureGen.getStuccoPackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getStuccoPackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.04,
          normalScale: new THREE.Vector2(2.5, 2.5),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xf1f5f9,
          roughness: options.roughness ?? 0.88,
          metalness: options.metalness ?? 0.03,
        });
        this.injectParallaxReliefShader(mat, 0.035);
        return mat;
      }

      // 21. Kerb Beton Trotoar (Concrete Curb)
      case 'curb':
      case 'kerb':
      case 'concrete_curb': {
        const colorTex = this.loadTexture('/assets/textures/trotoar/color.jpg', true, () => ProceduralTextureGen.getCurbPackage(512).albedo);
        const normalTex = this.loadTexture('/assets/textures/trotoar/normal.jpg', false, () => ProceduralTextureGen.getCurbPackage(512).normal);
        const roughTex = this.loadTexture('/assets/textures/trotoar/roughness.jpg', false, () => ProceduralTextureGen.getCurbPackage(512).roughness);
        const bumpTex = ProceduralTextureGen.getCurbPackage(512).height;

        const mat = new THREE.MeshStandardMaterial({
          map: colorTex,
          normalMap: normalTex,
          roughnessMap: roughTex,
          bumpMap: bumpTex,
          bumpScale: 0.03,
          normalScale: new THREE.Vector2(2.0, 2.0),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x9e9e9e,
          roughness: options.roughness ?? 0.85,
          metalness: options.metalness ?? 0.06,
        });
        this.injectParallaxReliefShader(mat, 0.03);
        return mat;
      }

      // 22. Photovoltaic Solar Panel (Monocrystalline Silicon)
      case 'solar_panel':
      case 'solar_cell':
      case 'solar_pv': {
        const pkg = ProceduralTextureGen.getSolarPanelPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.02,
          normalScale: new THREE.Vector2(1.5, 1.5),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.15,
          metalness: options.metalness ?? 0.75,
        });
        this.injectParallaxReliefShader(mat, 0.02);
        return mat;
      }

      // 23. Tangki Air Toren Nusantara (Orange PE Tank)
      case 'toren_orange':
      case 'toren_air': {
        const pkg = ProceduralTextureGen.getTorenRibbedPackage(512);
        return new THREE.MeshStandardMaterial({
          bumpMap: pkg.height,
          normalMap: pkg.normal,
          bumpScale: 0.04,
          normalScale: new THREE.Vector2(2.5, 2.5),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xea580c,
          roughness: options.roughness ?? 0.28,
          metalness: options.metalness ?? 0.04,
        });
      }

      // 24. Tangki Air Toren Biru (Blue PE Tank)
      case 'toren_blue': {
        const pkg = ProceduralTextureGen.getTorenRibbedPackage(512);
        return new THREE.MeshStandardMaterial({
          bumpMap: pkg.height,
          normalMap: pkg.normal,
          bumpScale: 0.04,
          normalScale: new THREE.Vector2(2.5, 2.5),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x0284c7,
          roughness: options.roughness ?? 0.28,
          metalness: options.metalness ?? 0.04,
        });
      }

      // 25. Tangki Air Toren Stainless Steel
      case 'toren_stainless': {
        const pkg = ProceduralTextureGen.getTorenRibbedPackage(512);
        return new THREE.MeshStandardMaterial({
          bumpMap: pkg.height,
          normalMap: pkg.normal,
          bumpScale: 0.03,
          normalScale: new THREE.Vector2(2.0, 2.0),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xe2e8f0,
          roughness: options.roughness ?? 0.12,
          metalness: options.metalness ?? 0.92,
        });
      }

      // 26. Atap Hijau Sedum (Living Green Roof)
      case 'green_roof':
      case 'sedum_roof': {
        const pkg = ProceduralTextureGen.getSedumGreenRoofPackage(512);
        const mat = new THREE.MeshStandardMaterial({
          map: pkg.albedo,
          normalMap: pkg.normal,
          roughnessMap: pkg.roughness,
          bumpMap: pkg.height,
          bumpScale: 0.05,
          normalScale: new THREE.Vector2(2.2, 2.2),
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xffffff,
          roughness: options.roughness ?? 0.88,
          metalness: options.metalness ?? 0.02,
        });
        this.injectParallaxReliefShader(mat, 0.04);
        return mat;
      }

      // 27. Baja Galvanis Struktur Peralatan Atap (Galvanized Steel Frame)
      case 'galvanized_steel':
      case 'steel_frame': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x94a3b8,
          roughness: options.roughness ?? 0.35,
          metalness: options.metalness ?? 0.82,
        });
      }

      // 28. Unit HVAC / Chiller Komersial
      case 'hvac_unit':
      case 'hvac_chiller':
      case 'chiller': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0x64748b,
          roughness: options.roughness ?? 0.38,
          metalness: options.metalness ?? 0.55,
        });
      }

      // 29. Contact Shadow Blob Decal
      case 'contact_shadow': {
        const tex = ProceduralTextureGen.getContactShadowTexture(256);
        return new THREE.MeshStandardMaterial({
          map: tex,
          transparent: true,
          opacity: options.opacity ?? 0.65,
          roughness: 1.0,
          metalness: 0.0,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
      }

      // 30. Marka Parkir & Jalan (Road/Parking Striping)
      case 'marking_white': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xf8fafc,
          roughness: 0.55,
          metalness: 0.05,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        });
      }

      case 'marking_yellow': {
        return new THREE.MeshStandardMaterial({
          color: options.color !== undefined ? new THREE.Color(options.color) : 0xfacc15,
          roughness: 0.55,
          metalness: 0.05,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
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
      'plester_kasar',
      'roof_tile',
      'genteng_metal',
      'spandek',
      'roof_gravel',
      'roof_membrane',
      'acp',
      'keramik_granit',
      'curb',
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

    const outdoorKeys = ['asphalt', 'road_asphalt', 'concrete', 'roof_tile', 'paving', 'sidewalk_paving', 'trotoar', 'sidewalk', 'stone_plinth', 'roof_gravel', 'curb'];
    for (const [key, mat] of this.materialCache.entries()) {
      if (mat.userData.parallaxUniforms?.uWetness) {
        mat.userData.parallaxUniforms.uWetness.value = clamped;
      }

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
      // 1. Windows & Glass
      if (key.startsWith('glass_dark')) {
        // Dark unlit night window panes: remain pitch black
        if ('emissive' in mat) {
          (mat as any).emissive.setHex(0x000000);
          (mat as any).emissiveIntensity = 0;
        }
        mat.opacity = 0.50;
      } else if (key.startsWith('glass') || key.startsWith('architectural_glass')) {
        // Illuminated night window panes: warm incandescent glow (2700K #fef08a / #ffe4b5)
        if ('emissive' in mat) {
          if (clamped > 0) {
            (mat as any).emissive.setHex(0xfef08a);
            (mat as any).emissiveIntensity = clamped * 2.2;
            mat.opacity = THREE.MathUtils.lerp(0.45, 0.85, clamped);
          } else {
            (mat as any).emissive.setHex(0x000000);
            (mat as any).emissiveIntensity = 0;
            mat.opacity = 0.45;
          }
        }
      }

      // 2. Commercial Storefront Signboards
      if (key.startsWith('storefront_sign') || key.startsWith('store_sign')) {
        if ('emissive' in mat) {
          (mat as any).emissive.setHex(0xffffff);
          (mat as any).emissiveIntensity = clamped > 0 ? 0.2 + clamped * 1.6 : 0.15;
        }
      }

      // 3. Architectural Exterior Lights & Wall Sconces
      if (key.startsWith('warm_light') || key.startsWith('lamp_glow')) {
        if ('emissive' in mat) {
          if (clamped > 0) {
            (mat as any).emissive.setHex(0xfef08a);
            (mat as any).emissiveIntensity = clamped * 2.5;
          } else {
            (mat as any).emissive.setHex(0x334155);
            (mat as any).emissiveIntensity = 0.05;
          }
        }
      }

      // 4. Asphalt Carriageway - Subtle wet street reflective sheen at night
      if (key.startsWith('asphalt') || key.startsWith('road')) {
        if ('roughness' in mat && 'metalness' in mat) {
          if (clamped > 0) {
            (mat as any).roughness = THREE.MathUtils.lerp(0.85, 0.38, clamped * 0.7);
            (mat as any).metalness = THREE.MathUtils.lerp(0.10, 0.42, clamped * 0.6);
          } else {
            (mat as any).roughness = 0.85;
            (mat as any).metalness = 0.10;
          }
        }
      }

      // 5. Impostor Facade (LOD2 Buildings at Night)
      if (key.startsWith('impostor_facade')) {
        if ('emissive' in mat) {
          if (clamped > 0) {
            (mat as any).emissive.setHex(0xffffff);
            (mat as any).emissiveIntensity = clamped * 1.5;
          } else {
            (mat as any).emissive.setHex(0x000000);
            (mat as any).emissiveIntensity = 0;
          }
        }
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
