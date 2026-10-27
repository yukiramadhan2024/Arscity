import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { RiverType, RIVER_PROFILES } from '../world/RiverTypes';
import { CarveRiverCommand } from '../core/commands/TerraformCommands';
import { RaycastManager } from '../core/engine/RaycastManager';
import { proceduralAudio } from '../audio/ProceduralAudio';

export class RiverTool {
  private engine: Engine;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  public activeType: RiverType = 'urban_river';
  private startPoint: THREE.Vector3 | null = null;
  private ghostGroup: THREE.Group;
  private isDrawing: boolean = false;

  constructor(engine: Engine, raycastManager: RaycastManager, scene: THREE.Scene) {
    this.engine = engine;
    this.raycastManager = raycastManager;
    this.scene = scene;

    this.ghostGroup = new THREE.Group();
    this.ghostGroup.name = 'RiverTool_Ghost';
    this.ghostGroup.visible = false;
    this.scene.add(this.ghostGroup);
  }

  public setType(type: RiverType): void {
    this.activeType = type;
    this.updateGhostMesh();
  }

  private getSnappedRiverPos(pos: THREE.Vector3, threshold: number = 6.0): THREE.Vector3 {
    if (!this.engine.riverManager) return pos.clone();
    let best = pos.clone();
    let minD = threshold;
    for (const node of this.engine.riverManager.nodes.values()) {
      const d = pos.distanceTo(node.position);
      if (d < minD) {
        minD = d;
        best.copy(node.position);
      }
    }
    return best;
  }

  public handleClick(pos: THREE.Vector3): void {
    const snapped = this.getSnappedRiverPos(pos);
    if (!this.isDrawing || !this.startPoint) {
      // First click: anchor start point
      this.startPoint = snapped.clone();
      this.isDrawing = true;
      this.ghostGroup.visible = true;
      proceduralAudio.playTaptic('selection');
    } else {
      // Second click: finalize river segment
      const endPoint = snapped.clone();
      if (this.startPoint.distanceTo(endPoint) >= 6.0) {
        const midPoint = new THREE.Vector3().lerpVectors(this.startPoint, endPoint, 0.5);

        const cmd = new CarveRiverCommand(
          this.engine,
          this.startPoint,
          endPoint,
          this.activeType,
          [this.startPoint, midPoint, endPoint]
        );
        this.engine.commandManager.execute(cmd);
        proceduralAudio.playTaptic('medium');
      }

      this.cancel();
    }
  }

  public handleMouseMove(currentPos: THREE.Vector3): void {
    if (!this.isDrawing || !this.startPoint) return;
    const snapped = this.getSnappedRiverPos(currentPos);
    this.updateGhostGeometry(this.startPoint, snapped);
  }

  private clearGhost(): void {
    while (this.ghostGroup.children.length > 0) {
      const c = this.ghostGroup.children.pop() as THREE.Mesh | THREE.Line;
      c.geometry?.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) {
          c.material.forEach((m) => m.dispose());
        } else {
          c.material.dispose();
        }
      }
    }
  }

  private updateGhostGeometry(start: THREE.Vector3, end: THREE.Vector3): void {
    this.clearGhost();

    const dist = start.distanceTo(end);
    if (dist < 2.0) return;

    const profile = RIVER_PROFILES[this.activeType];
    const halfWidth = profile.width * 0.5;
    const slices = Math.max(12, Math.min(60, Math.ceil(dist * 1.5)));

    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);

    const posCount = (slices + 1) * 2;
    const positions = new Float32Array(posCount * 3);
    const indices: number[] = [];

    const leftBankPositions: number[] = [];
    const rightBankPositions: number[] = [];

    const startH = this.engine.terrain ? this.engine.terrain.getHeightAt(start.x, start.z) : 0;
    const endH = this.engine.terrain ? this.engine.terrain.getHeightAt(end.x, end.z) : 0;

    for (let i = 0; i <= slices; i++) {
      const t = i / slices;
      const u = 1 - t;
      const ptX = u * u * start.x + 2 * u * t * mid.x + t * t * end.x;
      const ptZ = u * u * start.z + 2 * u * t * mid.z + t * t * end.z;

      const deltaT = 0.01;
      const tNext = Math.min(1, t + deltaT);
      const uN = 1 - tNext;
      const nextX = uN * uN * start.x + 2 * uN * tNext * mid.x + tNext * tNext * end.x;
      const nextZ = uN * uN * start.z + 2 * uN * tNext * mid.z + tNext * tNext * end.z;

      const tanX = nextX - ptX;
      const tanZ = nextZ - ptZ;
      const tanLen = Math.hypot(tanX, tanZ) || 1;
      const normX = -tanZ / tanLen;
      const normZ = tanX / tanLen;

      const pLx = ptX - normX * halfWidth;
      const pLz = ptZ - normZ * halfWidth;
      const pRx = ptX + normX * halfWidth;
      const pRz = ptZ + normZ * halfWidth;

      const waterY = THREE.MathUtils.lerp(startH, endH, t) + 0.12;
      const yL = waterY;
      const yR = waterY;

      const baseIdx = i * 2;
      positions[baseIdx * 3] = pLx;
      positions[baseIdx * 3 + 1] = yL;
      positions[baseIdx * 3 + 2] = pLz;

      positions[(baseIdx + 1) * 3] = pRx;
      positions[(baseIdx + 1) * 3 + 1] = yR;
      positions[(baseIdx + 1) * 3 + 2] = pRz;

      leftBankPositions.push(pLx, yL + 0.04, pLz);
      rightBankPositions.push(pRx, yR + 0.04, pRz);

      if (i < slices) {
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
      }
    }

    const ribbonGeom = new THREE.BufferGeometry();
    ribbonGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    ribbonGeom.setIndex(indices);
    ribbonGeom.computeVertexNormals();

    const ribbonMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan holographic water preview
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ribbonMesh = new THREE.Mesh(ribbonGeom, ribbonMat);
    ribbonMesh.name = 'GhostRiverRibbon';
    this.ghostGroup.add(ribbonMesh);

    // Glowing boundary lines for riverbanks
    const bankMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.9,
    });

    const leftGeom = new THREE.BufferGeometry();
    leftGeom.setAttribute('position', new THREE.Float32BufferAttribute(leftBankPositions, 3));
    const leftLine = new THREE.Line(leftGeom, bankMat);
    this.ghostGroup.add(leftLine);

    const rightGeom = new THREE.BufferGeometry();
    rightGeom.setAttribute('position', new THREE.Float32BufferAttribute(rightBankPositions, 3));
    const rightLine = new THREE.Line(rightGeom, bankMat.clone());
    this.ghostGroup.add(rightLine);

    this.ghostGroup.visible = true;
  }

  private updateGhostMesh(): void {
    if (this.isDrawing && this.startPoint) {
      this.updateGhostGeometry(this.startPoint, this.raycastManager.snappedPoint);
    }
  }

  public cancel(): void {
    this.isDrawing = false;
    this.startPoint = null;
    this.ghostGroup.visible = false;
    this.clearGhost();
  }

  public update(): void {
    if (this.isDrawing && this.startPoint) {
      this.handleMouseMove(this.raycastManager.snappedPoint);
    }
  }

  public dispose(): void {
    this.cancel();
    this.scene.remove(this.ghostGroup);
  }
}
