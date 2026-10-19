import * as THREE from 'three';
import { calculateSolarPosition, SolarCoordinates } from '../math/SolarPosition';
import { GraphicsQuality } from './GraphicsPresets';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { RoadPropPlacer } from '../../roads/RoadPropPlacer';

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

    // Atmospheric distant aerial perspective fog (THREE.FogExp2 #D8E2DC density 0.0008)
    this.scene.fog = new THREE.FogExp2(0xd8e2dc, 0.0008);

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
        grad.addColorStop(0.0, '#3a7bd5'); // Deep sky blue
        grad.addColorStop(0.45, '#87ceeb'); // Warm blue
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
      }
    } catch (err) {
      console.warn('[LightingSystem] PMREM Environment initialization error:', err);
    }
  }

  public setTime(hour: number, dayOfYear: number = 172, targetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0)): void {
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

    // Continuous atmospheric sky & light color gradient based on solar altitude
    const altDeg = coords.altitudeDegrees;

    if (altDeg <= -6) {
      // Deep night
      this.sunLight.intensity = 0.05;
      this.sunLight.color.setHex(0x334466);
      this.ambientLight.intensity = 0.20;
      this.ambientLight.color.setHex(0x111c33);
      this.hemiLight.intensity = 0.20;
      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x0a0f1d);
      this.scene.background = new THREE.Color(0x070c18);
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.setHex(0x080d1a);
      }
    } else if (altDeg <= 0) {
      // Civil twilight / Dawn / Dusk (-6 to 0 deg)
      const t = (altDeg + 6) / 6;
      this.sunLight.intensity = THREE.MathUtils.lerp(0.05, 0.4, t);
      this.sunLight.color.lerpColors(new THREE.Color(0x334466), new THREE.Color(0xff5522), t);
      this.ambientLight.intensity = THREE.MathUtils.lerp(0.20, 0.35, t);
      this.hemiLight.intensity = THREE.MathUtils.lerp(0.20, 0.45, t);
      const skyColor = new THREE.Color(0x070c18).lerp(new THREE.Color(0x7c3a27), t);
      this.scene.background = skyColor;
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerpColors(new THREE.Color(0x080d1a), new THREE.Color(0x5c2e22), t);
      }
    } else if (altDeg <= 18) {
      // Golden Hour (0 to 18 deg, e.g. 16:15 WIB afternoon sun)
      // Produces warm golden rays (#FFF1D6, intensity 3.2) with low angle
      const t = altDeg / 18;
      this.sunLight.intensity = THREE.MathUtils.lerp(1.2, 3.2, t);
      this.sunLight.color.lerpColors(new THREE.Color(0xff7733), new THREE.Color(0xfff1d6), t);
      this.ambientLight.intensity = THREE.MathUtils.lerp(0.35, 0.50, t);
      this.ambientLight.color.lerpColors(new THREE.Color(0x774433), new THREE.Color(0xfff5ea), t);
      this.hemiLight.intensity = 1.2;
      this.hemiLight.color.setHex(0x87ceeb); // Warm sky blue
      this.hemiLight.groundColor.setHex(0x4a5d23); // Terracotta-green ground bounce
      const skyColor = new THREE.Color(0x7c3a27).lerp(new THREE.Color(0x87ceeb), t);
      this.scene.background = skyColor;
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerpColors(new THREE.Color(0x5c2e22), new THREE.Color(0xd8e2dc), t);
      }
    } else {
      // Full Tropical Daylight
      const t = Math.min(1.0, (altDeg - 18) / 52);
      this.sunLight.intensity = THREE.MathUtils.lerp(2.5, 3.2, t);
      this.sunLight.color.lerpColors(new THREE.Color(0xfff1d6), new THREE.Color(0xffffff), t);
      this.ambientLight.intensity = THREE.MathUtils.lerp(0.45, 0.55, t);
      this.ambientLight.color.setHex(0xffffff);
      this.hemiLight.intensity = 1.2;
      this.hemiLight.color.setHex(0x87ceeb);
      this.hemiLight.groundColor.setHex(0x4a5d23);
      const skyColor = new THREE.Color(0x87ceeb).lerp(new THREE.Color(0x6bb1fa), t);
      this.scene.background = skyColor;
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.lerpColors(new THREE.Color(0xd8e2dc), new THREE.Color(0x7fb8f5), t);
      }
    }

    // Dynamic Evening / Night Glow: During blue hour, dusk, and night (17:45 - 05:30 WIB)
    // smoothly ramps up warm 2700K window illumination and street lights
    let nightGlowFactor = 0;
    if (altDeg <= -6) {
      nightGlowFactor = 1.0;
    } else if (altDeg <= 4) {
      nightGlowFactor = 1.0 - (altDeg + 6) / 10;
    } else {
      nightGlowFactor = 0.0;
    }

    MaterialLibrary.getInstance().setNightGlow(nightGlowFactor);
    RoadPropPlacer.setNightGlow(nightGlowFactor);
  }

  public updateCenter(targetCenter: THREE.Vector3): void {
    const sunDistance = 220;
    const coords = this.currentSolarCoords;
    const sunX = targetCenter.x + coords.direction.x * sunDistance;
    const sunY = Math.max(2, targetCenter.y + coords.direction.y * sunDistance);
    const sunZ = targetCenter.z + coords.direction.z * sunDistance;

    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.copy(targetCenter);
    this.sunLight.target.updateMatrixWorld();

    this.sunHelperMesh.position.set(sunX, sunY, sunZ);
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
      shadowD = 65;
      this.sunLight.shadow.bias = -0.0002;
      this.sunLight.shadow.normalBias = 0.03;
    } else {
      mapSize = 1024;
      shadowD = 85;
      this.sunLight.shadow.bias = -0.0005;
      this.sunLight.shadow.normalBias = 0.05;
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
  }
}
