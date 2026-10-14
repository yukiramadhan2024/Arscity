import * as THREE from 'three';
import { LandscapeManager, LandscapeType, LandscapeItem } from '../world/LandscapeManager';
import { RaycastManager } from '../core/engine/RaycastManager';
import { AddLandscapeCommand } from '../core/commands/CityCommands';
import { proceduralAudio } from '../audio/ProceduralAudio';
import type { Engine } from '../core/engine/Engine';

export class LandscapeTool {
  public landscapeManager: LandscapeManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;
  private engine?: Engine;

  public activeType: LandscapeType = 'grass_garden';
  public itemWidth: number = 4;
  public itemLength: number = 4;
  public itemRadius: number = 2.5;

  private ghostGroup: THREE.Group | null = null;
  private isVisible: boolean = false;

  constructor(
    landscapeManager: LandscapeManager,
    raycastManager: RaycastManager,
    scene: THREE.Scene,
    engine?: Engine
  ) {
    this.landscapeManager = landscapeManager;
    this.raycastManager = raycastManager;
    this.scene = scene;
    this.engine = engine;

    this.rebuildGhost();
  }

  public setEngine(engine: Engine): void {
    this.engine = engine;
  }

  public setType(type: LandscapeType): void {
    this.activeType = type;
    if (type === 'shade_tree') this.itemRadius = 2.5;
    else if (type === 'well') this.itemRadius = 0.8;
    else if (type === 'biopore') this.itemRadius = 0.25;
    else {
      this.itemWidth = 4;
      this.itemLength = 4;
    }
    this.rebuildGhost();
  }

  private disposeGhost(): void {
    if (this.ghostGroup) {
      this.ghostGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      this.scene.remove(this.ghostGroup);
      this.ghostGroup = null;
    }
  }

  private rebuildGhost(): void {
    this.disposeGhost();

    const group = new THREE.Group();
    group.name = 'LandscapeGhostPreview';

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x34c759, // iOS 27 system --good
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });

    switch (this.activeType) {
      case 'grass_garden': {
        const geom = new THREE.PlaneGeometry(this.itemWidth, this.itemLength);
        geom.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geom, ghostMat);
        mesh.position.y = 0.05;
        group.add(mesh);
        break;
      }
      case 'paving_block': {
        const geom = new THREE.PlaneGeometry(this.itemWidth, this.itemLength);
        geom.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geom, ghostMat);
        mesh.position.y = 0.05;
        group.add(mesh);
        break;
      }
      case 'shade_tree': {
        const trunkGeom = new THREE.CylinderGeometry(0.2, 0.3, 2.5, 8);
        const trunkMesh = new THREE.Mesh(trunkGeom, ghostMat);
        trunkMesh.position.y = 1.25;
        group.add(trunkMesh);

        const canopyGeom = new THREE.DodecahedronGeometry(this.itemRadius, 1);
        const canopyMesh = new THREE.Mesh(canopyGeom, ghostMat);
        canopyMesh.position.y = 3.6;
        group.add(canopyMesh);
        break;
      }
      case 'well': {
        const wellGeom = new THREE.CylinderGeometry(this.itemRadius, this.itemRadius, 0.4, 16);
        const wellMesh = new THREE.Mesh(wellGeom, ghostMat);
        wellMesh.position.y = 0.2;
        group.add(wellMesh);
        break;
      }
      case 'biopore': {
        const bioGeom = new THREE.CylinderGeometry(this.itemRadius, this.itemRadius, 0.1, 12);
        const bioMesh = new THREE.Mesh(bioGeom, ghostMat);
        bioMesh.position.y = 0.05;
        group.add(bioMesh);
        break;
      }
    }

    group.visible = this.isVisible;
    this.scene.add(group);
    this.ghostGroup = group;
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    const nextId = `land_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const item: LandscapeItem = {
      id: nextId,
      type: this.activeType,
      position: snappedPos.clone(),
      width: this.activeType === 'grass_garden' || this.activeType === 'paving_block' ? this.itemWidth : undefined,
      length: this.activeType === 'grass_garden' || this.activeType === 'paving_block' ? this.itemLength : undefined,
      radius: this.itemRadius
    };

    if (this.engine?.commandManager) {
      const cmd = new AddLandscapeCommand(this.engine, item);
      this.engine.commandManager.execute(cmd);
    } else {
      this.landscapeManager.addItem(item);
    }

    proceduralAudio.playClick();
  }

  public update(): void {
    if (!this.ghostGroup) return;

    if (this.isVisible && this.raycastManager.isHoveringGround) {
      this.ghostGroup.position.set(
        this.raycastManager.snappedPoint.x,
        0,
        this.raycastManager.snappedPoint.z
      );
      this.ghostGroup.visible = true;
    } else {
      this.ghostGroup.visible = false;
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.ghostGroup) {
      this.ghostGroup.visible = visible;
    }
  }

  public dispose(): void {
    this.disposeGhost();
  }
}
