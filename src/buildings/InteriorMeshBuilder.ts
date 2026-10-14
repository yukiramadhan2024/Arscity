import * as THREE from 'three';
import { InteriorLayout, InteriorWall, InteriorStair, RoomDefinition } from './InteriorTypes';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export class InteriorMeshBuilder {
  private static getMaterial(type: string, color?: string): THREE.Material {
    return MaterialLibrary.getInstance().getMaterial(type, { color });
  }

  /**
   * Builds the complete 3D interior architecture for a given floor layout:
   * - Partition walls with 15 cm thickness and door apertures
   * - Timber door frames and panels
   * - Floor finishes (parquet & tiles)
   * - Volumetric interior fixtures (beds, sofa, kitchen counter, sanitary ware)
   * - Concrete/timber staircases leading to upper floor
   */
  public static buildFloorInterior(
    layout: InteriorLayout,
    baseY: number,
    floorHeight: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `FloorInterior_L${layout.floorIndex}`;

    const wallMat = this.getMaterial('plaster', '#f1f5f9');
    const woodMat = this.getMaterial('wood_slat');
    const tileMat = this.getMaterial('concrete', '#e2e8f0');
    const bathTileMat = this.getMaterial('concrete', '#94a3b8');
    const darkWoodMat = this.getMaterial('wood_slat', '#451a03');
    const fabricMat = this.getMaterial('plaster', '#cbd5e1');

    // 1. Build Interior Partition Walls
    for (const wall of layout.walls) {
      const p1 = wall.start;
      const p2 = wall.end;
      const dir = new THREE.Vector2().subVectors(p2, p1);
      const len = dir.length();
      if (len < 0.1) continue;

      const angle = Math.atan2(dir.y, dir.x);
      const th = wall.thickness || 0.15;
      const h = wall.height || floorHeight;

      if (!wall.doorOpening) {
        // Solid partition wall
        const geo = new THREE.BoxGeometry(len, h, th);
        const mesh = new THREE.Mesh(geo, wallMat);
        const mid = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
        mesh.position.set(mid.x, baseY + h * 0.5, mid.y);
        mesh.rotation.y = -angle;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      } else {
        // Wall with door opening
        const op = wall.doorOpening;
        const doorW = op.width || 0.9;
        const doorH = op.height || 2.1;
        const doorCenter = op.positionRatio * len;

        const leftLen = Math.max(0, doorCenter - doorW * 0.5);
        const rightLen = Math.max(0, len - (doorCenter + doorW * 0.5));
        const lintelH = Math.max(0, h - doorH);

        const subGroup = new THREE.Group();
        subGroup.position.set(p1.x, baseY, p1.y);
        subGroup.rotation.y = -angle;

        // Left wall slice
        if (leftLen > 0.05) {
          const lGeo = new THREE.BoxGeometry(leftLen, h, th);
          const lMesh = new THREE.Mesh(lGeo, wallMat);
          lMesh.position.set(leftLen * 0.5, h * 0.5, 0);
          lMesh.castShadow = true;
          lMesh.receiveShadow = true;
          subGroup.add(lMesh);
        }

        // Right wall slice
        if (rightLen > 0.05) {
          const rGeo = new THREE.BoxGeometry(rightLen, h, th);
          const rMesh = new THREE.Mesh(rGeo, wallMat);
          rMesh.position.set(len - rightLen * 0.5, h * 0.5, 0);
          rMesh.castShadow = true;
          rMesh.receiveShadow = true;
          subGroup.add(rMesh);
        }

        // Top Lintel above door
        if (lintelH > 0.05) {
          const lintelGeo = new THREE.BoxGeometry(doorW, lintelH, th);
          const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
          lintelMesh.position.set(doorCenter, doorH + lintelH * 0.5, 0);
          lintelMesh.castShadow = true;
          lintelMesh.receiveShadow = true;
          subGroup.add(lintelMesh);
        }

        // Interior Door Panel (Timber)
        const doorGeo = new THREE.BoxGeometry(doorW - 0.04, doorH - 0.02, 0.04);
        const doorMesh = new THREE.Mesh(doorGeo, darkWoodMat);
        // Slightly open door (rotated 25 degrees)
        doorMesh.position.set(doorCenter - doorW * 0.5 + 0.02, doorH * 0.5, 0.1);
        doorMesh.rotation.y = 0.4;
        doorMesh.castShadow = true;
        subGroup.add(doorMesh);

        group.add(subGroup);
      }
    }

    // 2. Build Room Floor Tiles & Volumetric Fixtures
    for (const room of layout.rooms) {
      const b = room.boundary;
      if (b.length < 3) continue;

      // Interior Floor Surface
      const shape = new THREE.Shape();
      shape.moveTo(b[0].x, b[0].y);
      for (let i = 1; i < b.length; i++) {
        shape.lineTo(b[i].x, b[i].y);
      }
      shape.closePath();

      const floorGeo = new THREE.ShapeGeometry(shape);
      const floorMat = room.type === 'bathroom' ? bathTileMat : tileMat;
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI * 0.5;
      floorMesh.position.y = baseY + 0.02; // Just above structural slab
      floorMesh.receiveShadow = true;
      group.add(floorMesh);

      // Add Minimalist Volumetric Furniture based on Room Type
      const lp = room.labelPosition;
      if (room.type === 'bedroom') {
        // Platform Bed & Pillows
        const bedGeo = new THREE.BoxGeometry(1.6, 0.45, 2.0);
        const bedMesh = new THREE.Mesh(bedGeo, woodMat);
        bedMesh.position.set(lp.x, baseY + 0.225, lp.y);
        bedMesh.castShadow = true;
        group.add(bedMesh);

        const mattressGeo = new THREE.BoxGeometry(1.5, 0.15, 1.9);
        const mattressMesh = new THREE.Mesh(mattressGeo, fabricMat);
        mattressMesh.position.set(lp.x, baseY + 0.45 + 0.075, lp.y);
        group.add(mattressMesh);
      } else if (room.type === 'living_room') {
        // Sofa & Coffee Table
        const sofaGeo = new THREE.BoxGeometry(2.0, 0.65, 0.85);
        const sofaMesh = new THREE.Mesh(sofaGeo, fabricMat);
        sofaMesh.position.set(lp.x, baseY + 0.325, lp.y);
        sofaMesh.castShadow = true;
        group.add(sofaMesh);

        const tableGeo = new THREE.BoxGeometry(1.0, 0.35, 0.55);
        const tableMesh = new THREE.Mesh(tableGeo, darkWoodMat);
        tableMesh.position.set(lp.x, baseY + 0.175, lp.y + 0.85);
        tableMesh.castShadow = true;
        group.add(tableMesh);
      } else if (room.type === 'kitchen') {
        // L-shaped or linear kitchen counter + sink
        const counterGeo = new THREE.BoxGeometry(1.8, 0.85, 0.6);
        const counterMesh = new THREE.Mesh(counterGeo, tileMat);
        counterMesh.position.set(lp.x, baseY + 0.425, lp.y);
        counterMesh.castShadow = true;
        group.add(counterMesh);
      } else if (room.type === 'bathroom') {
        // WC fixture & shower partition
        const wcGeo = new THREE.BoxGeometry(0.45, 0.42, 0.65);
        const wcMesh = new THREE.Mesh(wcGeo, wallMat);
        wcMesh.position.set(lp.x, baseY + 0.21, lp.y);
        wcMesh.castShadow = true;
        group.add(wcMesh);
      }
    }

    // 3. Build Interior Staircases
    if (layout.stairs) {
      for (const stair of layout.stairs) {
        const stairGroup = new THREE.Group();
        stairGroup.position.set(stair.position.x, baseY, stair.position.y);
        stairGroup.rotation.y = stair.rotation;

        const steps = stair.riserCount || 16;
        const stepH = stair.totalHeight / steps;
        const stepL = 0.28; // Standard 28 cm tread
        const stepW = stair.width || 0.95;

        for (let i = 0; i < steps; i++) {
          const riserGeo = new THREE.BoxGeometry(stepW, (i + 1) * stepH, stepL);
          const riserMesh = new THREE.Mesh(riserGeo, darkWoodMat);
          riserMesh.position.set(0, ((i + 1) * stepH) * 0.5, i * stepL);
          riserMesh.castShadow = true;
          riserMesh.receiveShadow = true;
          stairGroup.add(riserMesh);
        }

        group.add(stairGroup);
      }
    }

    return group;
  }
}
