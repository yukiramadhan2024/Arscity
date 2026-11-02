import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { calculateSolarPosition, SolarCoordinates } from '../math/SolarPosition';
import { GraphicsQuality } from './GraphicsPresets';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { RoadPropPlacer } from '../../roads/RoadPropPlacer';
import { LandscapeManager } from '../../world/LandscapeManager';

export class LightingSystem {
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public sunHelperMesh: THREE.Mesh;

  private scene: THREE.Scene;
  public currentSolarCoords: SolarCoordinates;
  public currentHour: number = 16.25; // 16:15 WIB Golden Hour default
  public currentDayOfYear: number = 172;
  private pmremGenerator: THREE.PMREMGenerator | null = null;
  private envMapRenderTarget: THREE.WebGLRenderTarget | null = null;
  public renderer: THREE.WebGLRenderer | null = null;
  public lastShadowCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public isShadowDirty: boolean = true;
  public starPoints: THREE.Points | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Ambient light for base illumination
    this.ambientLight = new THREE.AmbientLight(0xfff5ea, 0.45);
    scene.add(this.ambientLight);

    // Lumen Global Illumination Bounce: Sky warm blue (#87CEEB) to ground bounce green-terracotta (#4A5D23)
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a5d23, 1.2);
    this.hemiLight.position.set(0, 50, 0);
    scene.add(this.hemiLight);

    // Sun directional light: 16:15 WIB warm golden sun (#FFF1D6, intensity 3.2)
    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 3.2);
    this.sunLight.castShadow = true;

    // Ultra high-fidelity shadow configuration (PCFSoftShadowMap 4096x4096)
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 400;

    // Shadow coverage frustum around focal point
    const shadowD = 120;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.015;

    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Visual glowing sun disc helper in the sky
    const sunGeom = new THREE.SphereGeometry(4.5, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    this.sunHelperMesh = new THREE.Mesh(sunGeom, sunMat);
    scene.add(this.sunHelperMesh);

    // Atmospheric distant aerial perspective fog - blends seamlessly into sky horizon
    this.scene.fog = new THREE.FogExp2(0x7fb8f5, 0.0011);

    // Star dome for Obsidian Night sky (T1.2)
    // Radius = 0.9 * camera.far (3600m) or 4000m if camera.far > 4500
    const starCount = 800;
    const starGeom = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const cameraFar = 4000;
    const r = cameraFar > 4500 ? 4000 : 0.9 * cameraFar;
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.85 + 0.1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.0,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      depthTest: false,
      fog: false
    });
    this.starPoints = new THREE.Points(starGeom, starMat);
    this.starPoints.frustumCulled = false;
    this.starPoints.renderOrder = -1000;
    scene.add(this.starPoints);

    // Initial update for 16:15 WIB (16.25)
    this.currentSolarCoords = calculateSolarPosition(16.25);
    this.setTime(16.25);
  }

  /**
   * Initializes Dynamic PMREM Environment Map from a procedural physical sky gradient.
   * Ensures all PBR metals and architectural glass reflect twilight sky with Lumen GI realism.
   */
  public initEnvironment(renderer: THREE.WebGLRenderer): void {
    if (typeof document === 'undefined') return;

    try {
      this.pmremGenerator = new THREE.PMREMGenerator(renderer);
      this.pmremGenerator.compileEquirectangularShader();

      // Create physical twilight sky gradient canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 0, 256);
        // Zenit sky to twilight horizon to ground bounce
        grad.addColorStop(0.0, '#7292b8'); // Soft neutral architectural sky blue (prevents lavender tint)
        grad.addColorStop(0.45, '#a4c2db'); // Warm neutral sky
        grad.addColorStop(0.70, '#ffd194'); // Golden sunset horizon
        grad.addColorStop(0.85, '#ff9a76'); // Warm terracotta dusk
        grad.addColorStop(1.0, '#4a5d23'); // Ground bounce reflection
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 256);

        // Add soft glowing sun disc in environment texture
        const sunX = 512 * 0.75;
        const sunY = 256 * 0.65;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 60);
        sunGrad.addColorStop(0.0, 'rgba(255, 255, 230, 0.95)');
        sunGrad.addColorStop(0.3, 'rgba(255, 220, 160, 0.6)');
        sunGrad.addColorStop(1.0, 'rgba(255, 180, 120, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
        ctx.fill();

        const canvasTexture = new THREE.CanvasTexture(canvas);
        canvasTexture.mapping = THREE.EquirectangularReflectionMapping;
        canvasTexture.colorSpace = THREE.SRGBColorSpace;

        if (this.envMapRenderTarget) {
          this.envMapRenderTarget.dispose();
        }
        this.envMapRenderTarget = this.pmremGenerator.fromEquirectangular(canvasTexture);
        this.scene.environment = this.envMapRenderTarget.texture;
        canvasTexture.dispose();

        // 2. Stream authentic Poly Haven 1K CC0 pure sky HDRI for photorealistic reflections & PBR bounce
        try {
          const rgbeLoader = new RGBELoader();
          rgbeLoader.load(
            '/assets/textures/sky/autumn_field_puresky_1k.hdr',
            (hdrTexture) => {
              if (!this.pmremGenerator) return;
              hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
              const hdrTarget = this.pmremGenerator.fromEquirectangular(hdrTexture);
              if (this.envMapRenderTarget) {
                this.envMapRenderTarget.dispose();
              }
              this.envMapRenderTarget = hdrTarget;
              this.scene.environment = this.envMapRenderTarget.texture;
              hdrTexture.dispose();
            },
            undefined,
            (err) => {
              console.warn('[LightingSystem] Poly Haven CC0 HDRI load fallback:', err);
            }
          );
        } catch {
          // Procedural fallback environment remains safely active
        }
      }
    } catch (err) {
      console.warn('[LightingSystem] PMREM Environment initialization error:', err);
    }
  }

  public setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  public markShadowsDirty(): void {
    this.isShadowDirty = true;
    this.sunLight.shadow.needsUpdate = true;
    if (this.renderer) {
      this.renderer.shadowMap.needsUpdate = true;
    }
  }

  public setTime(
    hour: number,
    dayOfYear: number = 172,
    targetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    skipShadowDirty: boolean = false
  ): void {
    this.currentHour = hour;
    this.currentDayOfYear = dayOfYear;
    const coords = calculateSolarPosition(hour, dayOfYear);
    this.currentSolarCoords = coords;

    const sunDistance = 220;
    const sunX = targetCenter.x + coords.direction.x * sunDistance;
    const sunY = Math.max(2, targetCenter.y + coords.direction.y * sunDistance);
    const sunZ = targetCenter.z + coords.direction.z * sunDistance;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.copy(targetCenter);
    this.sunLight.target.updateMatrixWorld();

    this.sunHelperMesh.position.set(sunX, sunY, sunZ);
    this.sunHelperMesh.visible = coords.isDaylight;

    // 4 Yogyakarta Atmospheric Sky & Lighting Phases
    const h = ((hour % 24) + 24) % 24;

    const C_NIGHT = {
      sky: new THREE.Color(0x0b101e), // Obsidian night blue
      sun: new THREE.Color(0x2d3a55),
      sunIntensity: 0.10,
      ambient: new THREE.Color(0x111c33),
      ambientIntensity: 0.15,
      hemiSky: new THREE.Color(0x162035),
      hemiGround: new THREE.Color(0x0a0f1d),
      hemiIntensity: 0.20,
      fog: new THREE.Color(0x0b101e),
      fogDensity: 0.0010
    };

    const C_DAWN = {
      sky: new THREE.Color(0x82a8cc), // Soft morning tropical sky blue
      sun: new THREE.Color(0xffd5b3), // Gentle warm sunrise gold
      sunIntensity: 2.2,
      ambient: new THREE.Color(0x524e47), // Balanced warm neutral ambient
      ambientIntensity: 0.35,
      hemiSky: new THREE.Color(0x9cb4cb), // Neutral soft sky hemisphere
      hemiGround: new THREE.Color(0x38342e), // Neutral warm earth bounce
      hemiIntensity: 0.85,
      fog: new THREE.Color(0x8aa8c8),
      fogDensity: 0.0009
    };

    const C_MIDDAY = {
      sky: new THREE.Color(0x5294e2), // Crisp clean tropical sky blue
      sun: new THREE.Color(0xfffaec), // Balanced natural sunlight
      sunIntensity: 3.2,              // Calibrated natural tropical sun
      ambient: new THREE.Color(0x55524d), // Neutral warm ambient fill
      ambientIntensity: 0.38,
      hemiSky: new THREE.Color(0x9ac4e6), // Natural daylight sky bounce
      hemiGround: new THREE.Color(0x383e30), // Neutral foliage/earth bounce (no saturated tint)
      hemiIntensity: 1.1,
      fog: new THREE.Color(0x7fb8f5),
      fogDensity: 0.0008
    };

    const C_SENJA = {
      sky: new THREE.Color(0xdc8a4d), // Senja Emas Yogyakarta / Golden Hour
      sun: new THREE.Color(0xf5a265), // Warm natural golden sun
      sunIntensity: 3.2,              // Balanced golden hour contrast
      ambient: new THREE.Color(0x5a4d42), // Neutral warm dusk (zero purple cast)
      ambientIntensity: 0.35,
      hemiSky: new THREE.Color(0xff8c42), // Golden Hour sky bounce (Yogyakarta)
      hemiGround: new THREE.Color(0x38342e), // Neutral warm soil/earth bounce
      hemiIntensity: 1.1,
      fog: new THREE.Color(0xd98b5a),
      fogDensity: 0.0008
    };

    let curSky = new THREE.Color();
    let curSun = new THREE.Color();
    let curSunIntensity = 3.0;
    let curAmbient = new THREE.Color();
    let curAmbientIntensity = 0.45;
    let curHemiSky = new THREE.Color();
    let curHemiGround = new THREE.Color();
    let curHemiIntensity = 1.0;
    let curFog = new THREE.Color();
    let curFogDensity = 0.0008;

    if (h >= 5.0 && h < 5.5) {
      const t = (h - 5.0) / 0.5;
      curSky.lerpColors(C_NIGHT.sky, C_DAWN.sky, t);
      curSun.lerpColors(C_NIGHT.sun, C_DAWN.sun, t);
      curSunIntensity = THREE.MathUtils.lerp(C_NIGHT.sunIntensity, C_DAWN.sunIntensity, t);
      curAmbient.lerpColors(C_NIGHT.ambient, C_DAWN.ambient, t);
      curAmbientIntensity = THREE.MathUtils.lerp(C_NIGHT.ambientIntensity, C_DAWN.ambientIntensity, t);
      curHemiSky.lerpColors(C_NIGHT.hemiSky, C_DAWN.hemiSky, t);
      curHemiGround.lerpColors(C_NIGHT.hemiGround, C_DAWN.hemiGround, t);
      curHemiIntensity = THREE.MathUtils.lerp(C_NIGHT.hemiIntensity, C_DAWN.hemiIntensity, t);
      curFog.lerpColors(C_NIGHT.fog, C_DAWN.fog, t);
      curFogDensity = THREE.MathUtils.lerp(C_NIGHT.fogDensity, C_DAWN.fogDensity, t);
    } else if (h >= 5.5 && h <= 7.0) {
      curSky.copy(C_DAWN.sky);
      curSun.copy(C_DAWN.sun);
      curSunIntensity = C_DAWN.sunIntensity;
      curAmbient.copy(C_DAWN.ambient);
      curAmbientIntensity = C_DAWN.ambientIntensity;
      curHemiSky.copy(C_DAWN.hemiSky);
      curHemiGround.copy(C_DAWN.hemiGround);
      curHemiIntensity = C_DAWN.hemiIntensity;
      curFog.copy(C_DAWN.fog);
      curFogDensity = C_DAWN.fogDensity;
    } else if (h > 7.0 && h < 8.0) {
      const t = (h - 7.0) / 1.0;
      curSky.lerpColors(C_DAWN.sky, C_MIDDAY.sky, t);
      curSun.lerpColors(C_DAWN.sun, C_MIDDAY.sun, t);
      curSunIntensity = THREE.MathUtils.lerp(C_DAWN.sunIntensity, C_MIDDAY.sunIntensity, t);
      curAmbient.lerpColors(C_DAWN.ambient, C_MIDDAY.ambient, t);
      curAmbientIntensity = THREE.MathUtils.lerp(C_DAWN.ambientIntensity, C_MIDDAY.ambientIntensity, t);
      curHemiSky.lerpColors(C_DAWN.hemiSky, C_MIDDAY.hemiSky, t);
      curHemiGround.lerpColors(C_DAWN.hemiGround, C_MIDDAY.hemiGround, t);
      curHemiIntensity = THREE.MathUtils.lerp(C_DAWN.hemiIntensity, C_MIDDAY.hemiIntensity, t);
      curFog.lerpColors(C_DAWN.fog, C_MIDDAY.fog, t);
      curFogDensity = THREE.MathUtils.lerp(C_DAWN.fogDensity, C_MIDDAY.fogDensity, t);
    } else if (h >= 8.0 && h <= 15.0) {
      curSky.copy(C_MIDDAY.sky);
      curSun.copy(C_MIDDAY.sun);
      curSunIntensity = C_MIDDAY.sunIntensity;
      curAmbient.copy(C_MIDDAY.ambient);
      curAmbientIntensity = C_MIDDAY.ambientIntensity;
      curHemiSky.copy(C_MIDDAY.hemiSky);
      curHemiGround.copy(C_MIDDAY.hemiGround);
      curHemiIntensity = C_MIDDAY.hemiIntensity;
      curFog.copy(C_MIDDAY.fog);
      curFogDensity = C_MIDDAY.fogDensity;
    } else if (h > 15.0 && h < 15.5) {
      const t = (h - 15.0) / 0.5;
      curSky.lerpColors(C_MIDDAY.sky, C_SENJA.sky, t);
      curSun.lerpColors(C_MIDDAY.sun, C_SENJA.sun, t);
      curSunIntensity = THREE.MathUtils.lerp(C_MIDDAY.sunIntensity, C_SENJA.sunIntensity, t);
      curAmbient.lerpColors(C_MIDDAY.ambient, C_SENJA.ambient, t);
      curAmbientIntensity = THREE.MathUtils.lerp(C_MIDDAY.ambientIntensity, C_SENJA.ambientIntensity, t);
      curHemiSky.lerpColors(C_MIDDAY.hemiSky, C_SENJA.hemiSky, t);
      curHemiGround.lerpColors(C_MIDDAY.hemiGround, C_SENJA.hemiGround, t);
      curHemiIntensity = THREE.MathUtils.lerp(C_MIDDAY.hemiIntensity, C_SENJA.hemiIntensity, t);
      curFog.lerpColors(C_MIDDAY.fog, C_SENJA.fog, t);
      curFogDensity = THREE.MathUtils.lerp(C_MIDDAY.fogDensity, C_SENJA.fogDensity, t);
    } else if (h >= 15.5 && h <= 17.75) {
      curSky.copy(C_SENJA.sky);
      curSun.copy(C_SENJA.sun);
      curSunIntensity = C_SENJA.sunIntensity;
      curAmbient.copy(C_SENJA.ambient);
      curAmbientIntensity = C_SENJA.ambientIntensity;
      curHemiSky.copy(C_SENJA.hemiSky);
      curHemiGround.copy(C_SENJA.hemiGround);
      curHemiIntensity = C_SENJA.hemiIntensity;
      curFog.copy(C_SENJA.fog);
      curFogDensity = C_SENJA.fogDensity;
    } else if (h > 17.75 && h < 18.25) {
      const t = (h - 17.75) / 0.5;
      curSky.lerpColors(C_SENJA.sky, C_NIGHT.sky, t);
      curSun.lerpColors(C_SENJA.sun, C_NIGHT.sun, t);
      curSunIntensity = THREE.MathUtils.lerp(C_SENJA.sunIntensity, C_NIGHT.sunIntensity, t);
      curAmbient.lerpColors(C_SENJA.ambient, C_NIGHT.ambient, t);
      curAmbientIntensity = THREE.MathUtils.lerp(C_SENJA.ambientIntensity, C_NIGHT.ambientIntensity, t);
      curHemiSky.lerpColors(C_SENJA.hemiSky, C_NIGHT.hemiSky, t);
      curHemiGround.lerpColors(C_SENJA.hemiGround, C_NIGHT.hemiGround, t);
      curHemiIntensity = THREE.MathUtils.lerp(C_SENJA.hemiIntensity, C_NIGHT.hemiIntensity, t);
      curFog.lerpColors(C_SENJA.fog, C_NIGHT.fog, t);
      curFogDensity = THREE.MathUtils.lerp(C_SENJA.fogDensity, C_NIGHT.fogDensity, t);
    } else {
      // Night (18:15 - 05:00)
      curSky.copy(C_NIGHT.sky);
      curSun.copy(C_NIGHT.sun);
      curSunIntensity = C_NIGHT.sunIntensity;
      curAmbient.copy(C_NIGHT.ambient);
      curAmbientIntensity = C_NIGHT.ambientIntensity;
      curHemiSky.copy(C_NIGHT.hemiSky);
      curHemiGround.copy(C_NIGHT.hemiGround);
      curHemiIntensity = C_NIGHT.hemiIntensity;
      curFog.copy(C_NIGHT.fog);
      curFogDensity = C_NIGHT.fogDensity;
    }

    this.scene.background = curSky;
    this.sunLight.color.copy(curSun);
    this.sunLight.intensity = curSunIntensity;
    this.ambientLight.color.copy(curAmbient);
    this.ambientLight.intensity = curAmbientIntensity;
    this.hemiLight.color.copy(curHemiSky);
    this.hemiLight.groundColor.copy(curHemiGround);
    this.hemiLight.intensity = curHemiIntensity;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(curFog);
      this.scene.fog.density = curFogDensity;
    }

    // Night Glow Factor for interior lights, streetlights, and stars
    // Rises smoothly 17:30 to 18:30 (17.5 to 18.5), falls smoothly 05:00 to 06:00 (5.0 to 6.0)
    let nightGlowFactor = 0;
    if (h >= 18.5 || h <= 5.0) {
      nightGlowFactor = 1.0;
    } else if (h > 5.0 && h < 6.0) {
      nightGlowFactor = THREE.MathUtils.clamp(1.0 - (h - 5.0) / 1.0, 0, 1);
    } else if (h >= 6.0 && h <= 17.5) {
      nightGlowFactor = 0.0;
    } else if (h > 17.5 && h < 18.5) {
      nightGlowFactor = THREE.MathUtils.clamp((h - 17.5) / 1.0, 0, 1);
    }

    if (this.starPoints) {
      const starOpacity = THREE.MathUtils.clamp((nightGlowFactor - 0.35) / 0.65, 0, 0.95);
      (this.starPoints.material as THREE.PointsMaterial).opacity = starOpacity;
      this.starPoints.visible = starOpacity > 0.01;
    }

    MaterialLibrary.getInstance().setNightGlow(nightGlowFactor);
    MaterialLibrary.getInstance().setSunDirection(coords.direction);
    RoadPropPlacer.setNightGlow(nightGlowFactor);
    LandscapeManager.setNightGlow(nightGlowFactor);

    if (!skipShadowDirty) {
      this.markShadowsDirty();
    }
  }

  /**
   * Updates star dome position to follow camera every frame (T1.2).
   * Guarantees stars remain at infinite celestial distance and never intersect terrain.
   */
  public updateStarDome(camera: THREE.Camera): void {
    if (!this.starPoints) return;
    this.starPoints.position.copy(camera.position);
  }

  public updateCenter(targetCenter: THREE.Vector3, skipShadowDirty: boolean = false): void {
    const distSq = this.lastShadowCenter.distanceToSquared(targetCenter);
    if (distSq > 1.0) { // Snappier threshold for texel pinning
      this.lastShadowCenter.copy(targetCenter);
      const sunDistance = 220;
      const coords = this.currentSolarCoords;

      // Shadow camera texel snapping:
      // Snapping the light position & target to texel increments prevents crawling shadow shimmering
      const mapSize = this.sunLight.shadow.mapSize.width || 2048;
      const frustumSpan = (this.sunLight.shadow.camera.right - this.sunLight.shadow.camera.left) || 150;
      const texelSize = Math.max(0.01, frustumSpan / mapSize);
      const snappedX = Math.round(targetCenter.x / texelSize) * texelSize;
      const snappedZ = Math.round(targetCenter.z / texelSize) * texelSize;
      const snappedTarget = new THREE.Vector3(snappedX, targetCenter.y, snappedZ);

      const sunX = snappedTarget.x + coords.direction.x * sunDistance;
      const sunY = Math.max(2, snappedTarget.y + coords.direction.y * sunDistance);
      const sunZ = snappedTarget.z + coords.direction.z * sunDistance;

      this.sunLight.position.set(sunX, sunY, sunZ);
      this.sunLight.target.position.copy(snappedTarget);
      this.sunLight.target.updateMatrixWorld();

      this.sunHelperMesh.position.set(sunX, sunY, sunZ);
      if (!skipShadowDirty) {
        this.markShadowsDirty();
      }
    }
  }

  public setGraphicsQuality(preset: GraphicsQuality): void {
    if (preset === 'low') {
      this.sunLight.castShadow = false;
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null as any;
      }
      return;
    }

    this.sunLight.castShadow = true;
    let mapSize = 1024;
    let shadowD = 85;

    if (preset === 'ultra') {
      mapSize = 4096;
      shadowD = 150;
      this.sunLight.shadow.bias = -0.0001;
      this.sunLight.shadow.normalBias = 0.02;
    } else if (preset === 'high') {
      mapSize = 2048;
      shadowD = 75;
      this.sunLight.shadow.bias = -0.0002;
      this.sunLight.shadow.normalBias = 0.025;
    } else {
      mapSize = 1024;
      shadowD = 85;
      this.sunLight.shadow.bias = -0.0004;
      this.sunLight.shadow.normalBias = 0.035;
    }

    this.sunLight.shadow.mapSize.width = mapSize;
    this.sunLight.shadow.mapSize.height = mapSize;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.camera.updateProjectionMatrix();

    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
      this.sunLight.shadow.map = null as any;
    }
    this.sunLight.shadow.needsUpdate = true;
  }

  public setShadowsEnabled(enabled: boolean): void {
    this.sunLight.castShadow = enabled;
  }

  public dispose(): void {
    this.scene.remove(this.sunLight);
    this.scene.remove(this.sunLight.target);
    this.scene.remove(this.sunHelperMesh);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.hemiLight);

    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
    }
    if (this.envMapRenderTarget) {
      this.envMapRenderTarget.dispose();
      this.envMapRenderTarget = null;
    }
    if (this.pmremGenerator) {
      this.pmremGenerator.dispose();
      this.pmremGenerator = null;
    }
    this.sunHelperMesh.geometry.dispose();
    (this.sunHelperMesh.material as THREE.Material).dispose();

    if (this.starPoints) {
      this.scene.remove(this.starPoints);
      this.starPoints.geometry.dispose();
      (this.starPoints.material as THREE.Material).dispose();
      this.starPoints = null;
    }
  }
}
