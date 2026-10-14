import * as THREE from 'three';
import earcut from 'earcut';
import { CustomBuilding, FloorDefinition } from './CustomBuildingModel';
import { SubQuadWallBuilder } from './SubQuadWallBuilder';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { PrefabMeshBuilder } from './PrefabMeshBuilder';

export class CustomBuildingMeshBuilder {
  private static getMaterial(type: string, color?: string): THREE.Material {
    return MaterialLibrary.getInstance().getMaterial(type, { color });
  }

  public static buildCustomBuilding(building: CustomBuilding): THREE.Group {
    const group = new THREE.Group();
    group.name = `CustomBuilding_${building.id}`;
    group.position.copy(building.position);
    group.rotation.y = building.rotationY;
    group.userData = { buildingId: building.id, type: 'custom_building' };

    const wallMat = this.getMaterial(building.wallMaterial, building.wallColor);
    const plinthMat = this.getMaterial('concrete', '#475569');
    const slabMat = this.getMaterial('concrete', '#94a3b8');
    const roofMat = this.getMaterial('roof_tile');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    let currentY = 0;

    // 1. Plinth Slab
    const groundFootprint = building.floors[0]?.footprint || [];
    if (groundFootprint.length >= 3) {
      const plinthSlab = this.createExtrudedFloorPolygon(
        groundFootprint,
        0,
        building.plinthHeight,
        plinthMat,
        0.3
      );
      group.add(plinthSlab);
      currentY = building.plinthHeight;
    }

    // 2. Floors & Modular Walls
    for (const floor of building.floors) {
      const flBaseY = currentY;
      const flH = floor.height;
      const poly = floor.footprint;

      // Floor intermediate slab
      if (floor.floorIndex > 0) {
        const slab = this.createExtrudedFloorPolygon(poly, flBaseY, 0.25, slabMat, 0.1);
        group.add(slab);
      }

      // Walls along each polygon edge
      const edgeCount = poly.length;
      for (let i = 0; i < edgeCount; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % edgeCount];

        const wallDef = floor.walls.find((w) => w.wallIndex === i);
        const openings = wallDef?.openings || [];

        const wallSegmentGroup = SubQuadWallBuilder.buildWallSegment(
          p1,
          p2,
          flBaseY,
          flH,
          0.2,
          openings,
          wallMat,
          frameMat,
          glassMat
        );
        group.add(wallSegmentGroup);
      }

      currentY += flH;
    }

    // 3. Roof on top of highest floor
    const topFloor = building.floors[building.floors.length - 1];
    if (topFloor && topFloor.footprint.length >= 3) {
      const roof = building.roof;
      const roofMesh = this.buildPolygonRoof(
        topFloor.footprint,
        currentY,
        roof.type,
        roof.overhang,
        roofMat
      );
      if (roofMesh) group.add(roofMesh);
    }

    const templates = PrefabMeshBuilder.optimizeBuildingGroup(group);
    for (const t of templates) {
      const mesh = new THREE.Mesh(t.geometry, t.material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { isSharedGeometry: false };
      group.add(mesh);
    }

    return group;
  }

  private static createExtrudedFloorPolygon(
    footprint: THREE.Vector2[],
    baseY: number,
    height: number,
    mat: THREE.Material,
    expandOffset: number = 0
  ): THREE.Group {
    const group = new THREE.Group();
    if (footprint.length < 3) return group;

    // Expand vertices slightly if expandOffset > 0
    const flatCoords: number[] = [];
    for (const p of footprint) {
      flatCoords.push(p.x, p.y);
    }

    const indices = earcut(flatCoords);
    if (!indices || indices.length === 0) return group;

    const numVerts = footprint.length;
    const positions = new Float32Array(numVerts * 2 * 3);
    const uvs = new Float32Array(numVerts * 2 * 2);

    for (let i = 0; i < numVerts; i++) {
      const p = footprint[i];
      // Bottom vertex
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = baseY;
      positions[i * 3 + 2] = p.y;
      uvs[i * 2] = p.x * 0.2;
      uvs[i * 2 + 1] = p.y * 0.2;

      // Top vertex
      positions[(numVerts + i) * 3] = p.x;
      positions[(numVerts + i) * 3 + 1] = baseY + height;
      positions[(numVerts + i) * 3 + 2] = p.y;
      uvs[(numVerts + i) * 2] = p.x * 0.2;
      uvs[(numVerts + i) * 2 + 1] = p.y * 0.2;
    }

    const finalIndices: number[] = [];
    // Top face
    for (let i = 0; i < indices.length; i += 3) {
      finalIndices.push(numVerts + indices[i], numVerts + indices[i + 1], numVerts + indices[i + 2]);
    }
    // Bottom face
    for (let i = 0; i < indices.length; i += 3) {
      finalIndices.push(indices[i], indices[i + 2], indices[i + 1]);
    }
    // Side quads
    for (let i = 0; i < numVerts; i++) {
      const next = (i + 1) % numVerts;
      const b0 = i;
      const b1 = next;
      const t0 = numVerts + i;
      const t1 = numVerts + next;

      finalIndices.push(b0, t0, b1);
      finalIndices.push(b1, t0, t1);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geom.setIndex(finalIndices);
    geom.computeVertexNormals();

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    return group;
  }

  private static buildPolygonRoof(
    footprint: THREE.Vector2[],
    baseY: number,
    roofType: string,
    overhang: number,
    roofMat: THREE.Material
  ): THREE.Object3D | null {
    // Calculate bounding box of polygon
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of footprint) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    }

    const w = (maxX - minX) + overhang * 2;
    const l = (maxZ - minZ) + overhang * 2;
    const centerX = (minX + maxX) * 0.5;
    const centerZ = (minZ + maxZ) * 0.5;

    if (roofType === 'flat') {
      const slabGeom = new THREE.BoxGeometry(w, 0.35, l);
      slabGeom.translate(centerX, baseY + 0.175, centerZ);
      const slab = new THREE.Mesh(slabGeom, roofMat);
      slab.castShadow = true;
      slab.receiveShadow = true;
      return slab;
    } else {
      // Pitched Hip Roof over bounding box
      const roofH = Math.min(w, l) * 0.4;
      const ridgeW = Math.max(0.5, w - l * 0.6);
      const halfW = w * 0.5;
      const halfL = l * 0.5;

      const geom = new THREE.BufferGeometry();
      const verts = new Float32Array([
        // Left
        centerX - halfW, baseY, centerZ - halfL,
        centerX - halfW, baseY, centerZ + halfL,
        centerX, baseY + roofH, centerZ,

        // Right
        centerX + halfW, baseY, centerZ - halfL,
        centerX, baseY + roofH, centerZ,
        centerX + halfW, baseY, centerZ + halfL,

        // Front
        centerX - halfW, baseY, centerZ + halfL,
        centerX + halfW, baseY, centerZ + halfL,
        centerX, baseY + roofH, centerZ,

        // Back
        centerX - halfW, baseY, centerZ - halfL,
        centerX, baseY + roofH, centerZ,
        centerX + halfW, baseY, centerZ - halfL
      ]);

      geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, roofMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }
  }
}
