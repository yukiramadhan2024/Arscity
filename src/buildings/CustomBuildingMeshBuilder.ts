import * as THREE from 'three';
import earcut from 'earcut';
import { CustomBuilding, FloorDefinition, WallOpening } from './CustomBuildingModel';
import { SubQuadWallBuilder } from './SubQuadWallBuilder';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { PrefabMeshBuilder } from './PrefabMeshBuilder';
import { InteriorMeshBuilder } from './InteriorMeshBuilder';
import { FirstPersonFurnitureBuilder } from './FirstPersonFurnitureCatalog';

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
    const slabMat = this.getMaterial(building.wallMaterial, building.wallColor || '#F8FAFC');
    const roofMat = this.getMaterial(building.roof?.material || 'roof_tile');
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

      // Floor intermediate slab (flush with wall in matching bright tone to prevent dark belt stripes)
      if (floor.floorIndex > 0) {
        const slab = this.createExtrudedFloorPolygon(poly, flBaseY, 0.25, slabMat, 0.0);
        rawExterior.add(slab);
      }

      // Base plinth material on ground floor if enabled
      const effectiveWallMat =
        building.useBasePlinthMaterial && building.baseMaterial && floor.floorIndex === 0
          ? this.getMaterial(building.baseMaterial, building.wallColor)
          : wallMat;

      // Walls along each polygon edge
      const edgeCount = poly.length;
      for (let i = 0; i < edgeCount; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % edgeCount];

        const wallDef = (floor.walls || []).find((w) => w.wallIndex === i);
        let openings = wallDef?.openings || [];

        // If no openings specified and building has windowStyle, generate architectural openings
        if (openings.length === 0 && building.windowStyle) {
          openings = this.generateOpeningsForWindowStyle(
            building.windowStyle,
            p1,
            p2,
            flH,
            floor.floorIndex === 0 && i === 0
          );
        }

        const wallSegmentGroup = SubQuadWallBuilder.buildWallSegment(
          p1,
          p2,
          flBaseY,
          flH,
          0.25,
          openings,
          effectiveWallMat,
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

    // 5. Facade Accessories (Arcade, Balconies, Sun Louvers, Planter Boxes, Solar PV)
    this.buildFacadeAccessories(building, rawExterior);

    // 6. Continuous Stairwell connecting floors for custom buildings
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

    // 6. Optimize and instantiate into group hierarchy (ExteriorShell, DetailProps, InteriorDetails, SubsurfaceFoundation, LOD2Massing)
    const rawLOD2 = PrefabMeshBuilder.buildLOD2MassingGroup({
      ...building,
      width: groundFootprint.length >= 2 ? Math.max(...groundFootprint.map((p) => Math.abs(p.x))) * 2 : 10,
      length: groundFootprint.length >= 2 ? Math.max(...groundFootprint.map((p) => Math.abs(p.y))) * 2 : 10,
      floorCount: building.floors.length,
      floorHeight: building.floors[0]?.height || 3.2,
      roofType: building.roof?.type || 'flat',
      wallMaterial: building.wallMaterial,
      wallColor: building.wallColor,
      roofMaterial: building.roof?.material || 'clay_tile',
    } as any);

    const extTemplates = PrefabMeshBuilder.optimizeBuildingGroup(rawExterior, 'exterior');
    const intTemplates = PrefabMeshBuilder.optimizeBuildingGroup(rawInterior, 'interior');
    const subTemplates = PrefabMeshBuilder.optimizeBuildingGroup(rawSubsurface, 'subsurface');
    const lod2Templates = PrefabMeshBuilder.optimizeBuildingGroup(rawLOD2, 'lod2_massing');

    PrefabMeshBuilder.instantiateFromTemplates(group, [
      ...extTemplates,
      ...intTemplates,
      ...subTemplates,
      ...lod2Templates,
    ]);

    PrefabMeshBuilder.attachPlacedFurniture(group, building as any);
    PrefabMeshBuilder.freezeStaticBuildingMeshes(group);

    group.userData.stairZones = stairZones;
    return group;
  }

  /**
   * Subsurface foundation for custom buildings.
   * Stripped of heavy underground piles / culverts (Y < 0) for zero polygon waste and 60 FPS performance.
   */
  private static buildCustomSubsurfaceFoundation(
    _footprint: THREE.Vector2[],
    _floorCount: number,
    _plinthHeight: number
  ): THREE.Group {
    return new THREE.Group();
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

    if (roofType === 'flat' || roofType === 'flat_parapet') {
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
    } else if (roofType === 'sawtooth') {
      const roofGroup = new THREE.Group();
      const teeth = Math.max(2, Math.floor(l / 3));
      const toothL = l / teeth;
      const toothH = Math.min(w, l) * 0.32;
      for (let t = 0; t < teeth; t++) {
        const zOffset = centerZ - l * 0.5 + toothL * (t + 0.5);
        const toothGeo = new THREE.CylinderGeometry(0, toothL * 0.5, toothH, 3, 1, false);
        toothGeo.rotateZ(Math.PI / 2);
        toothGeo.rotateY(Math.PI / 2);
        toothGeo.scale(w / toothL, 1, 1);
        toothGeo.translate(centerX, baseY + toothH * 0.5, zOffset);
        const mesh = new THREE.Mesh(toothGeo, roofMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        roofGroup.add(mesh);
      }
      return roofGroup;
    } else if (roofType === 'butterfly') {
      const roofGroup = new THREE.Group();
      const roofH = Math.min(w, l) * 0.30;
      const wingW = w * 0.52;
      [-1, 1].forEach((side) => {
        const wingGeo = new THREE.BoxGeometry(wingW, 0.16, l);
        wingGeo.rotateZ(-side * Math.atan2(roofH, wingW));
        wingGeo.translate(centerX + side * wingW * 0.5, baseY + roofH * 0.5, centerZ);
        const mesh = new THREE.Mesh(wingGeo, roofMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        roofGroup.add(mesh);
      });
      return roofGroup;
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

  private static generateOpeningsForWindowStyle(
    style: string,
    p1: THREE.Vector2,
    p2: THREE.Vector2,
    floorHeight: number,
    isEntrance: boolean
  ): WallOpening[] {
    const wallLen = p1.distanceTo(p2);
    if (wallLen < 2.5) return [];

    if (isEntrance) {
      return [
        {
          id: `door_${Date.now()}`,
          type: 'door_double',
          positionRatio: 0.5,
          width: Math.min(2.0, wallLen * 0.4),
          height: 2.3,
          sillHeight: 0
        }
      ];
    }

    switch (style) {
      case 'curtain_wall':
        return [
          {
            id: `win_cw_${Date.now()}`,
            type: 'window_double',
            positionRatio: 0.5,
            width: Math.min(wallLen * 0.85, 4.5),
            height: Math.max(1.8, floorHeight - 0.5),
            sillHeight: 0.15
          }
        ];
      case 'javanese_krepyak':
        return [
          {
            id: `win_jk_${Date.now()}`,
            type: 'window_jalusi',
            positionRatio: 0.5,
            width: Math.min(wallLen * 0.5, 2.2),
            height: 1.5,
            sillHeight: 0.9
          }
        ];
      case 'colonial_arch':
        return [
          {
            id: `win_ca_${Date.now()}`,
            type: 'window_double',
            positionRatio: 0.5,
            width: Math.min(wallLen * 0.45, 1.8),
            height: 2.1,
            sillHeight: 0.6
          }
        ];
      case 'minimalist_slot':
        return [
          {
            id: `win_ms1_${Date.now()}`,
            type: 'window_single',
            positionRatio: 0.35,
            width: 0.65,
            height: 1.8,
            sillHeight: 0.6
          },
          {
            id: `win_ms2_${Date.now()}`,
            type: 'window_single',
            positionRatio: 0.65,
            width: 0.65,
            height: 1.8,
            sillHeight: 0.6
          }
        ];
      case 'modern_ribbon':
      default:
        return [
          {
            id: `win_mr_${Date.now()}`,
            type: 'window_double',
            positionRatio: 0.5,
            width: Math.min(wallLen * 0.72, 3.8),
            height: 1.4,
            sillHeight: 0.95
          }
        ];
    }
  }

  private static buildFacadeAccessories(
    building: CustomBuilding,
    group: THREE.Group
  ): void {
    if (!building.floors || building.floors.length === 0) return;
    const matLib = MaterialLibrary.getInstance();
    const glassMat = matLib.getMaterial('glass');
    const concreteMat = matLib.getMaterial('concrete', { color: '#94a3b8' });
    const woodMat = matLib.getMaterial('wood', { color: '#78350f' });
    const plantMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.2 });

    const groundFootprint = building.floors[0]?.footprint || [];
    if (groundFootprint.length < 3) return;

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of groundFootprint) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    }
    const width = maxX - minX;
    const length = maxZ - minZ;
    const floorCount = building.floors.length;
    const flH = building.floors[0]?.height || 3.2;

    // 0. L-Shape Open Corner Terrace Deck & Structural Corner Pillar (Fix floating roof)
    if (building.massingShape === 'l_shape') {
      const hw = width * 0.5;
      const hl = length * 0.5;
      const totalWallH = floorCount * flH;

      // Outdoor wooden terrace deck on the cutout corner
      const patioGeo = new THREE.BoxGeometry(hw, 0.12, hl);
      const patioMesh = new THREE.Mesh(patioGeo, woodMat);
      patioMesh.position.set(hw * 0.5, building.plinthHeight * 0.5, hl * 0.5);
      patioMesh.receiveShadow = true;
      group.add(patioMesh);

      // Structural corner column supporting roof eave over terrace deck
      const colGeo = new THREE.BoxGeometry(0.35, totalWallH, 0.35);
      const colMesh = new THREE.Mesh(colGeo, concreteMat);
      colMesh.position.set(hw - 0.25, building.plinthHeight + totalWallH * 0.5, hl - 0.25);
      colMesh.castShadow = true;
      group.add(colMesh);

      // Structural tie beams connecting column to building wings
      const beamGeoX = new THREE.BoxGeometry(hw, 0.3, 0.35);
      const beamMeshX = new THREE.Mesh(beamGeoX, concreteMat);
      beamMeshX.position.set(hw * 0.5, building.plinthHeight + totalWallH - 0.15, hl - 0.25);
      group.add(beamMeshX);

      const beamGeoZ = new THREE.BoxGeometry(0.35, 0.3, hl);
      const beamMeshZ = new THREE.Mesh(beamGeoZ, concreteMat);
      beamMeshZ.position.set(hw - 0.25, building.plinthHeight + totalWallH - 0.15, hl * 0.5);
      group.add(beamMeshZ);
    }

    // 0b. U-Shape Central Courtyard Garden & Structural Columns (Fix floating roof)
    if (building.massingShape === 'courtyard_u') {
      const hw = width * 0.5;
      const hl = length * 0.5;
      const totalWallH = floorCount * flH;
      const wingW = hw * 0.38;
      const courtW = (hw - wingW) * 2;
      const courtL = hl * 1.2;
      const courtCenterZ = 0.4 * hl;

      // Central outdoor courtyard deck/garden base
      const courtGeo = new THREE.BoxGeometry(courtW, 0.12, courtL);
      const courtMesh = new THREE.Mesh(courtGeo, woodMat);
      courtMesh.position.set(0, building.plinthHeight * 0.5, courtCenterZ);
      courtMesh.receiveShadow = true;
      group.add(courtMesh);

      // Structural columns at courtyard front openings supporting roof eave
      const colGeo = new THREE.BoxGeometry(0.35, totalWallH, 0.35);
      [-1, 1].forEach((side) => {
        const colMesh = new THREE.Mesh(colGeo, concreteMat);
        colMesh.position.set(side * (hw - wingW - 0.2), building.plinthHeight + totalWallH * 0.5, hl - 0.25);
        colMesh.castShadow = true;
        group.add(colMesh);
      });

      // Structural header beam spanning across courtyard opening supporting roof
      const beamGeo = new THREE.BoxGeometry(courtW, 0.35, 0.35);
      const beamMesh = new THREE.Mesh(beamGeo, concreteMat);
      beamMesh.position.set(0, building.plinthHeight + totalWallH - 0.175, hl - 0.25);
      group.add(beamMesh);
    }

    // 1. Arcade Pillars on Ground Floor (hasFrontArcade)
    if (building.hasFrontArcade) {
      const colMat = building.useBasePlinthMaterial && building.baseMaterial
        ? this.getMaterial(building.baseMaterial)
        : concreteMat;
      const colGeo = new THREE.BoxGeometry(0.35, flH - 0.1, 0.35);
      const colCount = Math.max(2, Math.floor(width / 3.0));
      for (let i = 0; i <= colCount; i++) {
        const x = minX + (width / colCount) * i;
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(x, building.plinthHeight + (flH - 0.1) * 0.5, maxZ + 0.3);
        col.castShadow = true;
        group.add(col);
      }
    }

    // 2. Balconies & Planters on Upper Floors (hasBalcony, hasVerticalGarden)
    if (floorCount > 1 && (building.hasBalcony || building.hasVerticalGarden)) {
      for (let f = 1; f < floorCount; f++) {
        const bY = building.plinthHeight + f * flH;
        const balW = width * 0.75;
        const balD = 0.9;

        if (building.hasBalcony) {
          const balFloorGeo = new THREE.BoxGeometry(balW, 0.15, balD);
          const balFloor = new THREE.Mesh(balFloorGeo, concreteMat);
          balFloor.position.set((minX + maxX) * 0.5, bY + 0.075, maxZ + balD * 0.5);
          balFloor.castShadow = true;
          group.add(balFloor);

          const railGeo = new THREE.BoxGeometry(balW, 0.9, 0.04);
          const rail = new THREE.Mesh(railGeo, glassMat);
          rail.position.set((minX + maxX) * 0.5, bY + 0.525, maxZ + balD);
          group.add(rail);
        }

        if (building.hasVerticalGarden) {
          const planterW = balW * 0.9;
          const planterGeo = new THREE.BoxGeometry(planterW, 0.25, 0.25);
          const planter = new THREE.Mesh(planterGeo, concreteMat);
          planter.position.set((minX + maxX) * 0.5, bY + 0.25, maxZ + (building.hasBalcony ? balD + 0.1 : 0.2));
          group.add(planter);

          const foliageGeo = new THREE.BoxGeometry(planterW - 0.05, 0.22, 0.28);
          const foliage = new THREE.Mesh(foliageGeo, plantMat);
          foliage.position.set((minX + maxX) * 0.5, bY + 0.42, maxZ + (building.hasBalcony ? balD + 0.1 : 0.2));
          group.add(foliage);
        }
      }
    }

    // 3. Sun Louvers / Secondary Skin (hasSunLouvers)
    if (building.hasSunLouvers && floorCount > 1) {
      const louverMat = woodMat;
      const louverCount = Math.max(4, Math.floor(width / 0.45));
      const totalUpperH = (floorCount - 1) * flH;
      const louverH = totalUpperH - 0.3;
      const louverGeo = new THREE.BoxGeometry(0.06, louverH, 0.15);

      for (let i = 0; i <= louverCount; i++) {
        const x = minX + (width / louverCount) * i;
        const louver = new THREE.Mesh(louverGeo, louverMat);
        louver.position.set(x, building.plinthHeight + flH + louverH * 0.5, maxZ + 0.35);
        louver.castShadow = true;
        group.add(louver);
      }
    }

    // 4. Solar PV Panels (hasSolarPV)
    if (building.hasSolarPV) {
      const topFloorBaseY = building.plinthHeight + floorCount * flH;
      const panelCountX = Math.max(1, Math.floor(width / 2.2));
      const panelCountZ = Math.max(1, Math.floor(length / 2.2));
      const panelGeo = new THREE.BoxGeometry(1.8, 0.06, 1.2);

      for (let ix = 0; ix < panelCountX; ix++) {
        for (let iz = 0; iz < panelCountZ; iz++) {
          const px = minX + (width / (panelCountX + 1)) * (ix + 1);
          const pz = minZ + (length / (panelCountZ + 1)) * (iz + 1);
          const panel = new THREE.Mesh(panelGeo, solarMat);
          panel.position.set(px, topFloorBaseY + 0.45, pz);
          panel.rotation.x = -Math.PI / 12;
          panel.castShadow = true;
          group.add(panel);
        }
      }
    }
  }
}
