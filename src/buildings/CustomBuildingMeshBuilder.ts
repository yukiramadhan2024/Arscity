import * as THREE from 'three';
import earcut from 'earcut';
import { CustomBuilding, FloorDefinition } from './CustomBuildingModel';
import { SubQuadWallBuilder } from './SubQuadWallBuilder';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { PrefabMeshBuilder } from './PrefabMeshBuilder';
import { InteriorMeshBuilder } from './InteriorMeshBuilder';

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

    const rawExterior = new THREE.Group();
    const rawInterior = new THREE.Group();
    const rawSubsurface = new THREE.Group();

    let currentY = 0;
    const groundFootprint = building.floors[0]?.footprint || [];

    // 1. Subsurface Foundation (-1.2m to -8.0m based on floor count)
    if (groundFootprint.length >= 3) {
      const foundationGroup = this.buildCustomSubsurfaceFoundation(
        groundFootprint,
        building.floors.length,
        building.plinthHeight
      );
      rawSubsurface.add(foundationGroup);
    }

    // 2. Plinth Slab
    if (groundFootprint.length >= 3) {
      const plinthSlab = this.createExtrudedFloorPolygon(
        groundFootprint,
        0,
        building.plinthHeight,
        plinthMat,
        0.3
      );
      rawExterior.add(plinthSlab);
      currentY = building.plinthHeight;
    }

    // 3. Floors & Modular Walls
    for (const floor of building.floors) {
      const flBaseY = currentY;
      const flH = floor.height;
      const poly = floor.footprint;

      // Floor intermediate slab
      if (floor.floorIndex > 0) {
        const slab = this.createExtrudedFloorPolygon(poly, flBaseY, 0.25, slabMat, 0.1);
        rawExterior.add(slab);
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
          0.25,
          openings,
          wallMat,
          frameMat,
          glassMat
        );
        rawExterior.add(wallSegmentGroup);
      }

      currentY += flH;
    }

    // 4. Roof on top of highest floor
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
      if (roofMesh) rawExterior.add(roofMesh);
    }

    // 5. Continuous Stairwell connecting floors for custom buildings
    let stairZones: any[] = [];
    if (building.floors.length > 1) {
      const dummyInstance: any = {
        id: building.id,
        presetKey: 'custom',
        width: 14,
        length: 14,
        floorCount: building.floors.length,
        floorHeight: building.floors[0]?.height || 3.4,
        position: building.position,
        rotationY: building.rotationY,
        userData: {}
      };
      const res = InteriorMeshBuilder.buildBuildingStairwell(
        dummyInstance,
        building.plinthHeight
      );
      rawInterior.add(res.stairGroup);
      stairZones = res.stairZones;
      (building as any).userData = (building as any).userData || {};
      (building as any).userData.stairZones = stairZones;
      (building as any).stairZones = stairZones;
    }

    // 6. Optimize and instantiate into 3-group hierarchy (ExteriorShell, InteriorDetails, SubsurfaceFoundation)
    const extTemplates = PrefabMeshBuilder.optimizeBuildingGroup(rawExterior, 'exterior');
    const intTemplates = PrefabMeshBuilder.optimizeBuildingGroup(rawInterior, 'interior');
    const subTemplates = PrefabMeshBuilder.optimizeBuildingGroup(rawSubsurface, 'subsurface');

    PrefabMeshBuilder.instantiateFromTemplates(group, [
      ...extTemplates,
      ...intTemplates,
      ...subTemplates
    ]);

    group.userData.stairZones = stairZones;
    return group;
  }

  /**
   * Subsurface foundation for custom buildings based on floor count (SNI 8460:2017)
   */
  private static buildCustomSubsurfaceFoundation(
    footprint: THREE.Vector2[],
    floorCount: number,
    _plinthHeight: number
  ): THREE.Group {
    const subGroup = new THREE.Group();
    if (footprint.length < 3) return subGroup;

    const concreteMat = MaterialLibrary.getInstance().getMaterial('concrete', { roughness: 0.9, color: 0x64748b });
    const stoneMat = MaterialLibrary.getInstance().getMaterial('stone_plinth', { roughness: 0.95, color: 0x475569 });

    if (floorCount <= 2) {
      // 1-2 floors: Continuous Stone Footing & Sloof (-1.2m)
      const depth = 1.2;
      const foundationMesh = this.createExtrudedFloorPolygon(footprint, -depth, depth, stoneMat, 0.4);
      subGroup.add(foundationMesh);
    } else if (floorCount <= 5) {
      // 3-5 floors: Reinforced Concrete Footplat (-2.5m)
      const depth = 2.5;
      const footplatSlab = this.createExtrudedFloorPolygon(footprint, -depth, 0.6, concreteMat, 0.5);
      subGroup.add(footplatSlab);

      for (const pt of footprint) {
        const pedGeom = new THREE.BoxGeometry(0.8, depth, 0.8);
        const pedMesh = new THREE.Mesh(pedGeom, concreteMat);
        pedMesh.position.set(pt.x, -depth / 2, pt.y);
        subGroup.add(pedMesh);
      }
    } else {
      // 6-18 floors: Deep Bored Piles & Pile Cap (-8.0m to -12.0m)
      const pileDepth = Math.min(12.0, 6.0 + (floorCount - 6) * 0.5);
      const pileCap = this.createExtrudedFloorPolygon(footprint, -1.8, 1.8, concreteMat, 0.3);
      subGroup.add(pileCap);

      const pileRadius = 0.45;
      const pileGeom = new THREE.CylinderGeometry(pileRadius, pileRadius, pileDepth, 12);
      for (let i = 0; i < footprint.length; i++) {
        const pt = footprint[i];
        const pile = new THREE.Mesh(pileGeom, concreteMat);
        pile.position.set(pt.x, -1.8 - pileDepth / 2, pt.y);
        subGroup.add(pile);
      }
      const centerPile = new THREE.Mesh(pileGeom, concreteMat);
      centerPile.position.set(0, -1.8 - pileDepth / 2, 0);
      subGroup.add(centerPile);
    }

    return subGroup;
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
      uvs[i * 2] = p.x / 1.5;
      uvs[i * 2 + 1] = p.y / 1.5;

      // Top vertex
      positions[(numVerts + i) * 3] = p.x;
      positions[(numVerts + i) * 3 + 1] = baseY + height;
      positions[(numVerts + i) * 3 + 2] = p.y;
      uvs[(numVerts + i) * 2] = p.x / 1.5;
      uvs[(numVerts + i) * 2 + 1] = p.y / 1.5;
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
      const uv = slabGeom.attributes.uv;
      if (uv) {
        const uvScale = 1.5;
        const dims = [[l, 0.35], [l, 0.35], [w, l], [w, l], [w, 0.35], [w, 0.35]];
        for (let f = 0; f < 6; f++) {
          const [fw, fh] = dims[f];
          const su = Math.max(0.02, fw / uvScale);
          const sv = Math.max(0.02, fh / uvScale);
          for (let v = 0; v < 4; v++) {
            const idx = f * 4 + v;
            uv.setXY(idx, uv.getX(idx) * su, uv.getY(idx) * sv);
          }
        }
        uv.needsUpdate = true;
      }
      slabGeom.translate(centerX, baseY + 0.175, centerZ);
      const slab = new THREE.Mesh(slabGeom, roofMat);
      slab.castShadow = true;
      slab.receiveShadow = true;
      return slab;
    } else {
      // Pitched Hip Roof over bounding box with 3D Ridge Cap
      const roofH = Math.min(w, l) * 0.4;
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

      const uScaleW = w / 1.5;
      const uScaleL = l / 1.5;
      const vScaleH = roofH / 1.5;
      const roofUvs = new Float32Array([
        // Left
        0, 0,  uScaleL, 0,  uScaleL * 0.5, vScaleH,
        // Right
        0, 0,  uScaleL * 0.5, vScaleH,  uScaleL, 0,
        // Front
        0, 0,  uScaleW, 0,  uScaleW * 0.5, vScaleH,
        // Back
        0, 0,  uScaleW * 0.5, vScaleH,  uScaleW, 0
      ]);

      geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(roofUvs, 2));
      geom.computeVertexNormals();

      const roofGroup = new THREE.Group();
      const mesh = new THREE.Mesh(geom, roofMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      roofGroup.add(mesh);

      // 3D Ridge Cap block
      const ridgeGeom = new THREE.BoxGeometry(0.24, 0.16, 0.24);
      ridgeGeom.translate(centerX, baseY + roofH + 0.08, centerZ);
      const ridge = new THREE.Mesh(ridgeGeom, roofMat);
      roofGroup.add(ridge);

      return roofGroup;
    }
  }
}
