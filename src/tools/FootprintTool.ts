import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { RaycastManager } from '../core/engine/RaycastManager';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { FloorDefinition } from '../buildings/CustomBuildingModel';
import { AddBuildingCommand } from '../core/commands/CityCommands';
import { HumanScaleFigure } from '../buildings/HumanScaleFigure';
import type { Engine } from '../core/engine/Engine';

export class FootprintTool {
  public buildingManager: BuildingManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;
  private engine?: Engine;

  public isDrawing: boolean = false;
  public vertices: THREE.Vector2[] = [];
  private previewLine: THREE.Line | null = null;
  private humanFigure: HumanScaleFigure | null = null;
  private nextCustomId: number = 1;

  constructor(
    buildingManager: BuildingManager,
    raycastManager: RaycastManager,
    scene: THREE.Scene,
    engine?: Engine
  ) {
    this.buildingManager = buildingManager;
    this.raycastManager = raycastManager;
    this.scene = scene;
    this.engine = engine;
  }

  public setEngine(engine: Engine): void {
    this.engine = engine;
  }

  public startDrawing(): void {
    this.cancelDrawing();
    this.isDrawing = true;
    this.vertices = [];

    if (!this.humanFigure) {
      this.humanFigure = new HumanScaleFigure(1.65);
      this.scene.add(this.humanFigure.getObject());
    }
    this.humanFigure.setVisible(true);
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    const pt = new THREE.Vector2(snappedPos.x, snappedPos.z);

    // If we have at least 3 vertices and click close to first vertex, close the polygon!
    if (this.vertices.length >= 3) {
      const first = this.vertices[0];
      if (first.distanceTo(pt) < 2.0) {
        this.finishPolygon();
        return;
      }
    }

    this.vertices.push(pt);
    this.updatePreviewLine();
  }

  public createTemplateBuilding(type: 'rect' | 'L' | 'U', center: THREE.Vector3): void {
    let poly: THREE.Vector2[] = [];

    if (type === 'rect') {
      const hw = 5, hl = 6;
      poly = [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(-hw, hl),
      ];
    } else if (type === 'L') {
      poly = [
        new THREE.Vector2(-6, -6),
        new THREE.Vector2(6, -6),
        new THREE.Vector2(6, -1),
        new THREE.Vector2(-1, -1),
        new THREE.Vector2(-1, 6),
        new THREE.Vector2(-6, 6),
      ];
    } else if (type === 'U') {
      poly = [
        new THREE.Vector2(-6, -6),
        new THREE.Vector2(6, -6),
        new THREE.Vector2(6, 6),
        new THREE.Vector2(2, 6),
        new THREE.Vector2(2, -1),
        new THREE.Vector2(-2, -1),
        new THREE.Vector2(-2, 6),
        new THREE.Vector2(-6, 6),
      ];
    }

    this.instantiateCustomBuilding(poly, center);
  }

  public finishPolygon(): void {
    if (this.vertices.length < 3) {
      this.cancelDrawing();
      return;
    }

    // Compute centroid of polygon to set local origin
    let cx = 0, cz = 0;
    for (const v of this.vertices) {
      cx += v.x;
      cz += v.y;
    }
    cx /= this.vertices.length;
    cz /= this.vertices.length;

    const center = new THREE.Vector3(cx, 0, cz);
    const localPoly = this.vertices.map((v) => new THREE.Vector2(v.x - cx, v.y - cz));

    this.instantiateCustomBuilding(localPoly, center);
    this.cancelDrawing();
  }

  private instantiateCustomBuilding(localPoly: THREE.Vector2[], center: THREE.Vector3): void {
    const id = `custom_bld_${this.nextCustomId++}`;

    // Compute oriented bounding box dimensions for metadata
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of localPoly) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    const width = Math.max(1, Math.round((maxX - minX) * 10) / 10);
    const length = Math.max(1, Math.round((maxY - minY) * 10) / 10);

    // Generate default floor with entrance door on edge 0 and windows on other edges
    const wallsDef = localPoly.map((_, idx) => ({
      wallIndex: idx,
      openings:
        idx === 0
          ? [
              {
                id: 'door_1',
                type: 'door_double' as const,
                positionRatio: 0.5,
                width: 1.6,
                height: 2.2,
                sillHeight: 0,
              },
            ]
          : [
              {
                id: `win_${idx}`,
                type: 'window_double' as const,
                positionRatio: 0.5,
                width: 1.5,
                height: 1.4,
                sillHeight: 1.0,
              },
            ],
    }));

    const floor: FloorDefinition = {
      floorIndex: 0,
      footprint: localPoly,
      height: 3.2,
      walls: wallsDef,
    };

    const instance: BuildingInstance = {
      id,
      presetKey: 'custom',
      name: `Desain Kustom #${this.nextCustomId - 1}`,
      category: 'residential',
      position: center.clone(),
      rotationY: 0,
      width,
      length,
      floorCount: 1,
      floorHeight: 3.2,
      roofType: 'hip',
      roofOverhang: 1.2,
      wallMaterial: 'plaster',
      wallColor: '#f8fafc',
      roofMaterial: 'clay_tile',
      isCustom: true,
      footprintPolygon: localPoly,
      floors: [floor],
      plinthHeight: 0.35,
      customRoof: {
        type: 'hip',
        pitchAngle: 30,
        overhang: 1.2,
        material: 'clay_tile',
      },
    };

    // Integrate with BuildingManager & CommandManager
    if (this.engine?.commandManager) {
      const cmd = new AddBuildingCommand(this.engine, instance);
      this.engine.commandManager.execute(cmd);
    } else {
      this.buildingManager.addBuilding(instance);
    }
  }

  public update(): void {
    if (!this.isDrawing) return;
    this.updatePreviewLine();

    if (this.humanFigure) {
      if (this.vertices.length > 0) {
        const v0 = this.vertices[0];
        this.humanFigure.setPosition(v0.x - 1.2, 0, v0.y - 1.2);
      } else if (this.raycastManager.isHoveringGround) {
        const pt = this.raycastManager.snappedPoint;
        this.humanFigure.setPosition(pt.x + 1.2, 0, pt.z);
      }
    }
  }

  private updatePreviewLine(): void {
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }

    if (this.vertices.length === 0) return;

    const points: THREE.Vector3[] = this.vertices.map((v) => new THREE.Vector3(v.x, 0.1, v.y));
    // Add current hover point
    if (this.raycastManager.isHoveringGround) {
      points.push(new THREE.Vector3(this.raycastManager.snappedPoint.x, 0.1, this.raycastManager.snappedPoint.z));
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x007aff, linewidth: 2 });
    this.previewLine = new THREE.Line(geom, mat);
    this.scene.add(this.previewLine);
  }

  public cancelDrawing(): void {
    this.isDrawing = false;
    this.vertices = [];
    if (this.previewLine) {
      this.scene.remove(this.previewLine);
      this.previewLine.geometry.dispose();
      (this.previewLine.material as THREE.Material).dispose();
      this.previewLine = null;
    }
    if (this.humanFigure) {
      this.scene.remove(this.humanFigure.getObject());
      this.humanFigure.dispose();
      this.humanFigure = null;
    }
  }

  public dispose(): void {
    this.cancelDrawing();
  }
}
