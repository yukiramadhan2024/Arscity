import * as THREE from 'three';
import { BuildingInstance } from '../../buildings/PrefabTypes';
import { BuildingManager } from '../../buildings/BuildingManager';
import { LotParcel } from '../../zones/ZoneTypes';
import { PolygonMath } from '../math/PolygonMath';
import type { Engine } from './Engine';

export class SpatialHighlighter {
  private scene: THREE.Scene;
  private engine: Engine;
  public masterGroup: THREE.Group;

  private currentHighlightMesh: THREE.Object3D | null = null;
  private hoverRingMesh: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, engine: Engine) {
    this.scene = scene;
    this.engine = engine;

    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'SpatialHighlighterMasterGroup';
    this.scene.add(this.masterGroup);

    this.buildHoverRing();
  }

  private buildHoverRing(): void {
    const ringGeom = new THREE.RingGeometry(1.2, 1.45, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthTest: false
    });
    this.hoverRingMesh = new THREE.Mesh(ringGeom, ringMat);
    this.hoverRingMesh.renderOrder = 900;
    this.hoverRingMesh.position.set(0, 0.06, 0);
    this.masterGroup.add(this.hoverRingMesh);
  }

  public showHoverAt(pos: THREE.Vector3, radius: number = 3.5, color: number = 0x007aff): void {
    if (!this.hoverRingMesh) return;
    this.hoverRingMesh.position.set(pos.x, 0.06, pos.z);
    this.hoverRingMesh.scale.setScalar(radius / 3.0);
    const mat = this.hoverRingMesh.material as THREE.MeshBasicMaterial;
    mat.color.setHex(color);
    mat.opacity = 0.75;
    this.hoverRingMesh.visible = true;
  }

  public hideHover(): void {
    if (!this.hoverRingMesh) return;
    const mat = this.hoverRingMesh.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.0;
    this.hoverRingMesh.visible = false;
  }

  public highlightFootprint(bld: BuildingInstance): void {
    this.clearHighlight();

    const group = new THREE.Group();
    group.name = 'Highlight_Footprint';

    const worldPoints = BuildingManager.getBuildingWorldFootprint(bld);
    if (worldPoints.length < 3) return;

    // Fill polygon
    const shape = new THREE.Shape();
    shape.moveTo(worldPoints[0].x, worldPoints[0].y);
    for (let i = 1; i < worldPoints.length; i++) {
      shape.lineTo(worldPoints[i].x, worldPoints[i].y);
    }
    shape.closePath();

    const geom = new THREE.ShapeGeometry(shape);
    geom.rotateX(Math.PI / 2); // Rotate to ground XZ plane

    const mat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthTest: false
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.y = 0.08;
    mesh.renderOrder = 910;
    group.add(mesh);

    // Outline border
    const edgesGeom = new THREE.EdgesGeometry(geom);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 3,
      depthTest: false
    });
    const line = new THREE.LineSegments(edgesGeom, edgeMat);
    line.position.y = 0.09;
    line.renderOrder = 911;
    group.add(line);

    this.currentHighlightMesh = group;
    this.masterGroup.add(group);
  }

  public highlightSetback(lot: LotParcel, _type: 'front' | 'side' | 'rear' = 'front'): void {
    this.clearHighlight();

    const group = new THREE.Group();
    group.name = 'Highlight_Setback';

    const corners = this.engine.lotManager ? this.engine.lotManager.getLotCorners2D(lot) : [];
    if (corners.length >= 3) {
      const pts = corners.map((p) => new THREE.Vector3(p.x, 0.1, p.y));
      pts.push(pts[0].clone());

      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineDashedMaterial({
        color: 0x00ff66, // Glowing emerald green (#00FF66)
        dashSize: 1.2,
        gapSize: 0.6,
        linewidth: 3,
        depthTest: false
      });
      const lotBorder = new THREE.Line(lineGeom, lineMat);
      lotBorder.computeLineDistances();
      lotBorder.renderOrder = 920;
      group.add(lotBorder);

      // Shaded setback zone ribbon
      const shape = new THREE.Shape();
      shape.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        shape.lineTo(corners[i].x, corners[i].y);
      }
      shape.closePath();

      const setbackFillGeom = new THREE.ShapeGeometry(shape);
      setbackFillGeom.rotateX(Math.PI / 2);
      const setbackFillMat = new THREE.MeshBasicMaterial({
        color: 0x34c759,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthTest: false
      });
      const ribbon = new THREE.Mesh(setbackFillGeom, setbackFillMat);
      ribbon.position.y = 0.07;
      ribbon.renderOrder = 908;
      group.add(ribbon);
    }

    this.currentHighlightMesh = group;
    this.masterGroup.add(group);
  }

  public highlightGreenArea(lot: LotParcel): void {
    this.clearHighlight();

    const group = new THREE.Group();
    group.name = 'Highlight_GreenArea';

    // Highlight permeable lot area in vibrant tropical emerald (#34c759)
    const corners = this.engine.lotManager ? this.engine.lotManager.getLotCorners2D(lot) : [];
    if (corners.length >= 3) {
      const shape = new THREE.Shape();
      shape.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        shape.lineTo(corners[i].x, corners[i].y);
      }
      shape.closePath();

      const geom = new THREE.ShapeGeometry(shape);
      geom.rotateX(Math.PI / 2);

      const mat = new THREE.MeshBasicMaterial({
        color: 0x34c759,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthTest: false
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.y = 0.07;
      mesh.renderOrder = 909;
      group.add(mesh);
    }

    this.currentHighlightMesh = group;
    this.masterGroup.add(group);
  }

  public highlightRoom(bld: BuildingInstance, roomName: string): void {
    this.clearHighlight();

    const group = new THREE.Group();
    group.name = `Highlight_Room_${roomName}`;

    // Highlight room area inside building floor
    const halfW = (bld.width || 8) / 2;
    const halfL = (bld.length || 10) / 2;

    const planeGeom = new THREE.PlaneGeometry(halfW * 1.2, halfL * 0.9);
    planeGeom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      transparent: true,
      opacity: 0.6,
      depthTest: false
    });
    const mesh = new THREE.Mesh(planeGeom, mat);
    mesh.position.set(bld.position.x, bld.position.y + 0.4, bld.position.z);
    mesh.rotation.y = bld.rotationY || 0;
    mesh.renderOrder = 960;
    group.add(mesh);

    this.currentHighlightMesh = group;
    this.masterGroup.add(group);
  }

  public clearHighlight(): void {
    if (this.currentHighlightMesh) {
      this.masterGroup.remove(this.currentHighlightMesh);
      this.currentHighlightMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material?.dispose();
        }
      });
      this.currentHighlightMesh = null;
    }
  }

  public dispose(): void {
    this.clearHighlight();
    if (this.hoverRingMesh) {
      this.hoverRingMesh.geometry.dispose();
      (this.hoverRingMesh.material as THREE.Material).dispose();
      this.hoverRingMesh = null;
    }
    this.scene.remove(this.masterGroup);
  }
}
