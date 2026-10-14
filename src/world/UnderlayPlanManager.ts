import * as THREE from 'three';

export interface UnderlaySettings {
  visible: boolean;
  opacity: number;
  widthM: number;
  lengthM: number;
  offsetX: number;
  offsetZ: number;
  rotationDeg: number;
}

export class UnderlayPlanManager {
  private scene: THREE.Scene;
  private underlayMesh: THREE.Mesh | null = null;
  private currentTexture: THREE.Texture | null = null;

  public settings: UnderlaySettings = {
    visible: true,
    opacity: 0.65,
    widthM: 60.0,
    lengthM: 60.0,
    offsetX: 0,
    offsetZ: 0,
    rotationDeg: 0
  };

  public onSettingsChanged?: (settings: UnderlaySettings) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Loads an image file from browser input (PNG/JPG) and maps it onto the ground plane for tracing.
   */
  public loadPlanFromFile(file: File): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          resolve(false);
          return;
        }

        const loader = new THREE.TextureLoader();
        loader.load(
          dataUrl,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            this.applyTexture(texture);
            resolve(true);
          },
          undefined,
          (err) => {
            console.error('Failed to load underlay plan texture:', err);
            reject(err);
          }
        );
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private applyTexture(texture: THREE.Texture): void {
    this.disposeMesh();
    this.currentTexture = texture;

    const geo = new THREE.PlaneGeometry(this.settings.widthM, this.settings.lengthM);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.settings.opacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.underlayMesh = new THREE.Mesh(geo, mat);
    this.underlayMesh.name = 'ArchitecturalUnderlayPlan';
    this.underlayMesh.position.set(this.settings.offsetX, 0.03, this.settings.offsetZ);
    this.underlayMesh.rotation.y = (this.settings.rotationDeg * Math.PI) / 180;
    this.underlayMesh.visible = this.settings.visible;

    this.scene.add(this.underlayMesh);
  }

  public updateTransform(updates: Partial<UnderlaySettings>): void {
    this.settings = { ...this.settings, ...updates };

    if (this.underlayMesh && this.currentTexture) {
      if (updates.widthM !== undefined || updates.lengthM !== undefined) {
        this.underlayMesh.geometry.dispose();
        const newGeo = new THREE.PlaneGeometry(this.settings.widthM, this.settings.lengthM);
        newGeo.rotateX(-Math.PI / 2);
        this.underlayMesh.geometry = newGeo;
      }

      this.underlayMesh.position.set(this.settings.offsetX, 0.03, this.settings.offsetZ);
      this.underlayMesh.rotation.y = (this.settings.rotationDeg * Math.PI) / 180;
      this.underlayMesh.visible = this.settings.visible;

      const mat = this.underlayMesh.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = this.settings.opacity;
      }
    }

    if (this.onSettingsChanged) this.onSettingsChanged(this.settings);
  }

  public setVisible(v: boolean): void {
    this.updateTransform({ visible: v });
  }

  public hasUnderlay(): boolean {
    return this.underlayMesh !== null;
  }

  public disposeMesh(): void {
    if (this.underlayMesh) {
      this.scene.remove(this.underlayMesh);
      this.underlayMesh.geometry.dispose();
      (this.underlayMesh.material as THREE.Material).dispose();
      this.underlayMesh = null;
    }
    if (this.currentTexture) {
      this.currentTexture.dispose();
      this.currentTexture = null;
    }
  }

  public dispose(): void {
    this.disposeMesh();
  }
}
