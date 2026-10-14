import * as THREE from 'three';
import { calculateSolarPosition, SolarCoordinates } from '../math/SolarPosition';

export class LightingSystem {
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemiLight: THREE.HemisphereLight;
  public sunHelperMesh: THREE.Mesh;

  private scene: THREE.Scene;
  public currentSolarCoords: SolarCoordinates;
  public currentHour: number = 10.0;
  public currentDayOfYear: number = 172;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Ambient light for base illumination
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(this.ambientLight);

    // Hemisphere light (sky vs ground bounce)
    this.hemiLight = new THREE.HemisphereLight(0x90c2ff, 0x3d4b31, 0.5);
    this.hemiLight.position.set(0, 50, 0);
    scene.add(this.hemiLight);

    // Sun directional light
    this.sunLight = new THREE.DirectionalLight(0xfff7e6, 1.4);
    this.sunLight.castShadow = true;

    // High quality shadow configuration
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 400;

    // Shadow coverage frustum around focal point
    const shadowD = 90;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.02;

    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    // Visual sun disc helper in the sky
    const sunGeom = new THREE.SphereGeometry(4, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });
    this.sunHelperMesh = new THREE.Mesh(sunGeom, sunMat);
    scene.add(this.sunHelperMesh);

    // Initial update for 10:00 AM (typical tropical morning sun)
    this.currentSolarCoords = calculateSolarPosition(10.0);
    this.setTime(10.0);
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

    // Atmospheric sky & light color gradient based on solar altitude
    const altDeg = coords.altitudeDegrees;

    if (coords.isDaylight) {
      if (altDeg < 15) {
        // Sunrise / Sunset golden hour
        this.sunLight.color.setHex(0xff7733);
        this.sunLight.intensity = Math.max(0.2, (altDeg / 15) * 1.0);
        this.ambientLight.color.setHex(0x553322);
        this.ambientLight.intensity = 0.35;
        this.hemiLight.color.setHex(0xffaa77);
        this.hemiLight.groundColor.setHex(0x332211);
        this.scene.background = new THREE.Color(0xd47545);
      } else {
        // Bright tropical day
        const dayFactor = Math.min(1.0, (altDeg - 15) / 35);
        this.sunLight.color.setHex(0xfff7e6);
        this.sunLight.intensity = 1.0 + dayFactor * 0.5;
        this.ambientLight.color.setHex(0xffffff);
        this.ambientLight.intensity = 0.45;
        this.hemiLight.color.setHex(0x8bc3ff);
        this.hemiLight.groundColor.setHex(0x334428);
        this.scene.background = new THREE.Color(0x7fb8f5);
      }
    } else {
      // Night / Deep twilight
      this.sunLight.intensity = 0.05; // Moonlight
      this.sunLight.color.setHex(0x334466);
      this.ambientLight.color.setHex(0x111c33);
      this.ambientLight.intensity = 0.25;
      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x0a0f1d);
      this.scene.background = new THREE.Color(0x070c18);
    }
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

  public setGraphicsQuality(preset: 'high' | 'medium' | 'low'): void {
    if (preset === 'low') {
      this.sunLight.castShadow = false;
      return;
    }

    this.sunLight.castShadow = true;
    const isHigh = preset === 'high';
    const mapSize = isHigh ? 2048 : 1024;
    const shadowD = isHigh ? 65 : 85;

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
    this.sunHelperMesh.geometry.dispose();
    (this.sunHelperMesh.material as THREE.Material).dispose();
  }
}
