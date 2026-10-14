import * as THREE from 'three';

export type WeatherType = 'clear' | 'overcast' | 'rain' | 'fog';

export class WeatherSystem {
  public currentWeather: WeatherType = 'clear';
  private scene: THREE.Scene;
  private rainParticles: THREE.Points | null = null;
  private rainCount: number = 2500;
  private rainGeometry: THREE.BufferGeometry | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setWeather('clear');
  }

  public setWeather(weather: WeatherType): void {
    this.currentWeather = weather;

    if (weather === 'clear') {
      this.scene.fog = new THREE.FogExp2(0x7fb8f5, 0.002);
      this.toggleRain(false);
    } else if (weather === 'overcast') {
      this.scene.fog = new THREE.FogExp2(0x8a9ba8, 0.0045);
      this.toggleRain(false);
    } else if (weather === 'fog') {
      this.scene.fog = new THREE.FogExp2(0xa0abb5, 0.014);
      this.toggleRain(false);
    } else if (weather === 'rain') {
      this.scene.fog = new THREE.FogExp2(0x6e7b85, 0.008);
      this.toggleRain(true);
    }
  }

  private toggleRain(enable: boolean): void {
    if (enable) {
      if (!this.rainParticles) {
        this.createRainParticles();
      }
      if (this.rainParticles) {
        this.rainParticles.visible = true;
      }
    } else {
      if (this.rainParticles) {
        this.rainParticles.visible = false;
      }
    }
  }

  private createRainParticles(): void {
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    const radius = 100;

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * radius * 2;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMaterial = new THREE.PointsMaterial({
      color: 0x90c2e7,
      size: 0.6,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });

    this.rainParticles = new THREE.Points(this.rainGeometry, rainMaterial);
    this.scene.add(this.rainParticles);
  }

  public update(deltaTime: number, cameraPosition: THREE.Vector3): void {
    if (this.currentWeather === 'rain' && this.rainParticles && this.rainGeometry) {
      const positions = this.rainGeometry.attributes.position.array as Float32Array;
      const speed = 65 * deltaTime;
      const boxSize = 100;

      for (let i = 0; i < this.rainCount; i++) {
        positions[i * 3 + 1] -= speed; // Fall downwards

        // Reset if hit ground or out of view
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 50 + Math.random() * 15;
          positions[i * 3] = cameraPosition.x + (Math.random() - 0.5) * boxSize * 2;
          positions[i * 3 + 2] = cameraPosition.z + (Math.random() - 0.5) * boxSize * 2;
        }
      }
      this.rainGeometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose(): void {
    if (this.rainParticles) {
      this.scene.remove(this.rainParticles);
      this.rainGeometry?.dispose();
      (this.rainParticles.material as THREE.Material).dispose();
    }
  }
}
