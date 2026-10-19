import * as THREE from 'three';
import { RaycastManager } from '../core/engine/RaycastManager';

export interface DimensionLine {
  id: string;
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  distanceM: number;
}

export class MeasurementTool {
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  public isActive: boolean = false;
  public startPoint: THREE.Vector3 | null = null;
  public lines: DimensionLine[] = [];

  private visualGroup: THREE.Group;
  private previewLine: THREE.Line | null = null;
  public onMeasurementUpdate?: (currentDist: number) => void;

  constructor(raycastManager: RaycastManager, scene: THREE.Scene) {
    this.raycastManager = raycastManager;
    this.scene = scene;
    this.visualGroup = new THREE.Group();
    this.visualGroup.name = 'MeasurementVisualGroup';
    scene.add(this.visualGroup);
  }

  public activate(): void {
    this.isActive = true;
    this.startPoint = null;
  }

  public deactivate(): void {
    this.isActive = false;
    this.startPoint = null;
    if (this.previewLine) {
      this.visualGroup.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      this.previewLine = null;
    }
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    if (!this.isActive) return;

    if (!this.startPoint) {
      this.startPoint = snappedPos.clone();
      this.startPoint.y = 0.15;
    } else {
      const endPt = snappedPos.clone();
      endPt.y = 0.15;

      const dist = this.startPoint.distanceTo(endPt);
      const lineData: DimensionLine = {
        id: `dim_${Date.now()}`,
        pointA: this.startPoint.clone(),
        pointB: endPt,
        distanceM: parseFloat(dist.toFixed(2))
      };

      this.lines.push(lineData);
      this.createDimensionVisual(lineData);

      this.startPoint = null;
      if (this.previewLine) {
        this.visualGroup.remove(this.previewLine);
        this.previewLine = null;
      }
    }
  }

  private createDimensionVisual(dim: DimensionLine): void {
    // 3D dimension line with end ticks (iOS System Accent)
    const geom = new THREE.BufferGeometry().setFromPoints([dim.pointA, dim.pointB]);
    const mat = new THREE.LineBasicMaterial({ color: 0x007aff, linewidth: 2 });
    const line = new THREE.Line(geom, mat);
    this.visualGroup.add(line);

    // End points
    const dotGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const dotA = new THREE.Mesh(dotGeom, dotMat);
    dotA.position.copy(dim.pointA);
    this.visualGroup.add(dotA);

    const dotB = new THREE.Mesh(dotGeom, dotMat);
    dotB.position.copy(dim.pointB);
    this.visualGroup.add(dotB);

    // Viewport 3D Capsule Dimension Label (Section I)
    const mid = dim.pointA.clone().add(dim.pointB).multiplyScalar(0.5);
    mid.y = 0.5;

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(28, 28, 30, 0.92)';
      ctx.beginPath();
      ctx.roundRect(8, 8, 112, 32, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = "600 15px 'JetBrains Mono', 'SF Mono', Consolas, monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${dim.distanceM.toFixed(1)} m`, 64, 24);

      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(mid);
      sprite.scale.set(4, 1.5, 1);
      this.visualGroup.add(sprite);
    }
  }

  public clearAll(): void {
    this.lines = [];
    this.startPoint = null;
    this.visualGroup.clear();
  }

  public update(): void {
    if (!this.isActive || !this.startPoint) return;

    if (this.raycastManager.isHoveringGround) {
      const cur = this.raycastManager.snappedPoint.clone();
      cur.y = 0.15;

      const dist = this.startPoint.distanceTo(cur);
      if (this.onMeasurementUpdate) {
        this.onMeasurementUpdate(parseFloat(dist.toFixed(2)));
      }

      if (this.previewLine) {
        this.visualGroup.remove(this.previewLine);
        this.previewLine.geometry.dispose();
      }

      const geom = new THREE.BufferGeometry().setFromPoints([this.startPoint, cur]);
      const mat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
      this.previewLine = new THREE.Line(geom, mat);
      this.visualGroup.add(this.previewLine);
    }
  }

  public dispose(): void {
    this.clearAll();
    this.scene.remove(this.visualGroup);
  }
}
