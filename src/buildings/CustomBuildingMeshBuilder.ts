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
    const slabMat = this.getMaterial('floor_belt', building.wallColor || '#F8FAFC');
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
      plinthSlab.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) c.userData.partType = 'podium_base';
      });
      rawExterior.add(plinthSlab);
      currentY = building.plinthHeight;
    }

    // 3. Floors & Modular Walls (Skipped in exposed contractor steel-frame cutaway mode)
    if (!building.exposeSteelFrame) {
      for (const floor of building.floors) {
        const flBaseY = currentY;
        const flH = floor.height;
        const poly = floor.footprint;

        // Floor intermediate slab (offset +0.06m outward as crisp floor belt with polygonOffset so it never z-fights with walls)
        if (floor.floorIndex > 0) {
          const slab = this.createExtrudedFloorPolygon(poly, flBaseY, 0.22, slabMat, 0.06);
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
        if (roofMesh) {
          roofMesh.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) c.userData.partType = 'roof_crown';
          });
          rawExterior.add(roofMesh);
        }
      }
    } else {
      for (const floor of building.floors) {
        currentY += floor.height;
      }
    }

    // 5. Facade Accessories (Arcade, Balconies, Sun Louvers, Planter Boxes, Solar PV)
    this.buildFacadeAccessories(building, rawExterior);

    const approxW = groundFootprint.length >= 2 ? Math.max(...groundFootprint.map((p) => Math.abs(p.x))) * 2 : 10;
    const approxL = groundFootprint.length >= 2 ? Math.max(...groundFootprint.map((p) => Math.abs(p.y))) * 2 : 10;
    const proxyInst: any = {
      ...building,
      width: approxW,
      length: approxL,
      floorCount: building.floors.length,
      floorHeight: building.floors[0]?.height || 3.2,
      roofType: building.roof?.type || 'flat',
      roofOverhang: building.roof?.overhang ?? 1.2,
      wallMaterial: building.wallMaterial,
      wallColor: building.wallColor,
      roofMaterial: building.roof?.material || 'clay_tile',
      subParts: (building as any).subParts
    };
    PrefabMeshBuilder.partitionAndCustomizeSubParts(rawExterior, proxyInst);

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

    PrefabMeshBuilder.instantiateFromTemplates(
      group,
      [...extTemplates, ...intTemplates, ...subTemplates, ...lod2Templates],
      proxyInst
    );

    // 7. Attach TAHAP 6 Contractor CAD Structural & Facade Assemblies into ExteriorShell
    let extShell = group.getObjectByName('ExteriorShell') as THREE.Group | undefined;
    if (!extShell) {
      extShell = new THREE.Group();
      extShell.name = 'ExteriorShell';
      group.add(extShell);
      group.userData.exteriorShell = extShell;
    }
    const flCount = Math.max(1, building.floors.length);
    const flHeight = building.floors[0]?.height || 3.2;

    if (building.exposeSteelFrame) {
      const steelGroup = this.buildContractorSteelFrameGroup(
        approxW,
        approxL,
        flCount,
        flHeight,
        building.plinthHeight
      );
      extShell.add(steelGroup);
    }
    if (building.hasCarportAndTopBalcony) {
      const carportBalconyGroup = this.buildCarportAndTopBalconyGroup(
        approxW,
        approxL,
        flCount,
        flHeight,
        building.plinthHeight
      );
      extShell.add(carportBalconyGroup);
    }
    if (building.hasVerticalSecondarySkin) {
      const secondarySkinGroup = this.buildVerticalSecondarySkinGroup(
        approxW,
        approxL,
        flCount,
        flHeight,
        building.plinthHeight
      );
      extShell.add(secondarySkinGroup);
    }

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

    // Expand or inset vertices relative to polygon centroid when expandOffset !== 0 (eliminates coplanar z-fighting)
    let cx = 0;
    let cz = 0;
    for (const p of footprint) {
      cx += p.x;
      cz += p.y;
    }
    cx /= footprint.length;
    cz /= footprint.length;

    const effectivePts = footprint.map((p) => {
      if (Math.abs(expandOffset) < 1e-4) return p;
      const dx = p.x - cx;
      const dz = p.y - cz;
      const len = Math.hypot(dx, dz) || 1;
      return new THREE.Vector2(p.x + (dx / len) * expandOffset, p.y + (dz / len) * expandOffset);
    });

    const flatCoords: number[] = [];
    for (const p of effectivePts) {
      flatCoords.push(p.x, p.y);
    }

    const indices = earcut(flatCoords);
    if (!indices || indices.length === 0) return group;

    const numVerts = effectivePts.length;
    const positions = new Float32Array(numVerts * 2 * 3);
    const uvs = new Float32Array(numVerts * 2 * 2);

    for (let i = 0; i < numVerts; i++) {
      const p = effectivePts[i];
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

  /**
   * T5.3: Proportional Facade Module Calculator
   * n = max(1, floor(length / 3.0))
   * moduleWidth = length / n
   */
  public static calculateFacadeModules(wallLen: number): {
    n: number;
    moduleWidth: number;
    moduleCenters: number[];
  } {
    const n = Math.max(1, Math.floor(wallLen / 3.0));
    const moduleWidth = wallLen / n;
    const moduleCenters: number[] = [];
    for (let i = 0; i < n; i++) {
      moduleCenters.push((i + 0.5) * moduleWidth);
    }
    return { n, moduleWidth, moduleCenters };
  }

  /**
   * T5.3: Validates that window openings on a wall segment do not overlap
   * and do not encroach too close to corners (structural mullion zone).
   */
  public static validateOpeningLayout(openings: WallOpening[], wallLen: number): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const minCorner = wallLen < 2.5 ? 0.15 : 0.35;

    for (let i = 0; i < openings.length; i++) {
      const op = openings[i];
      const centerX = op.positionRatio * wallLen;
      const left = centerX - op.width * 0.5;
      const right = centerX + op.width * 0.5;

      if (left < minCorner - 1e-4) {
        errors.push(`Bukaan '${op.id}' terlalu dekat dengan sudut kiri (${left.toFixed(2)}m < ${minCorner}m).`);
      }
      if (right > wallLen - minCorner + 1e-4) {
        errors.push(`Bukaan '${op.id}' terlalu dekat dengan sudut kanan (${(wallLen - right).toFixed(2)}m < ${minCorner}m).`);
      }

      for (let j = i + 1; j < openings.length; j++) {
        const other = openings[j];
        const otherCenterX = other.positionRatio * wallLen;
        const dist = Math.abs(centerX - otherCenterX);
        const minDist = (op.width + other.width) * 0.5;
        if (dist < minDist - 1e-4) {
          errors.push(`Bukaan '${op.id}' tumpang tindih dengan '${other.id}' (jarak ${dist.toFixed(2)}m < ${minDist.toFixed(2)}m).`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  public static generateOpeningsForWindowStyle(
    style: string,
    p1: THREE.Vector2,
    p2: THREE.Vector2,
    floorHeight: number,
    isEntrance: boolean
  ): WallOpening[] {
    const wallLen = p1.distanceTo(p2);
    if (wallLen < 1.0) return [];

    const { n, moduleWidth, moduleCenters } = this.calculateFacadeModules(wallLen);
    const openings: WallOpening[] = [];
    const minCorner = wallLen < 2.5 ? 0.15 : 0.35;

    for (let i = 0; i < n; i++) {
      const centerU = moduleCenters[i];

      // If entrance wall, place entrance door in the first or middle module
      if (isEntrance && (i === 0 || (n > 1 && i === Math.floor(n / 2)))) {
        const doorW = Math.min(2.0, Math.max(0.9, moduleWidth - 0.6));
        openings.push({
          id: `door_${i}_${Date.now()}`,
          type: 'door_double',
          positionRatio: centerU / wallLen,
          width: doorW,
          height: Math.min(2.4, floorHeight - 0.4),
          sillHeight: 0
        });
        continue;
      }

      // Proportional window sizing based on style and module width (no window stretching)
      let winType: WallOpening['type'] = 'window_double';
      let naturalW = 1.6;
      let winH = 1.4;
      let sillH = 0.95;

      switch (style) {
        case 'curtain_wall':
          winType = 'window_double';
          naturalW = 2.2;
          winH = Math.max(1.8, floorHeight - 0.5);
          sillH = 0.15;
          break;
        case 'javanese_krepyak':
          winType = 'window_jalusi';
          naturalW = 1.8;
          winH = 1.5;
          sillH = 0.9;
          break;
        case 'colonial_arch':
          winType = 'window_double';
          naturalW = 1.6;
          winH = 2.0;
          sillH = 0.6;
          break;
        case 'minimalist_slot':
          winType = 'window_single';
          naturalW = 0.75;
          winH = 1.8;
          sillH = 0.6;
          break;
        case 'modern_ribbon':
        default:
          winType = 'window_double';
          naturalW = 1.8;
          winH = 1.4;
          sillH = 0.95;
          break;
      }

      // Clamp window width to module boundaries leaving structural column clearance
      let winW = Math.min(naturalW, Math.max(0.5, moduleWidth - 0.6));

      // Validate corner distance
      const leftU = centerU - winW * 0.5;
      const rightU = centerU + winW * 0.5;

      if (leftU < minCorner) {
        winW = Math.max(0.5, (centerU - minCorner) * 2);
      }
      if (rightU > wallLen - minCorner) {
        winW = Math.max(0.5, (wallLen - minCorner - centerU) * 2);
      }

      if (winW >= 0.5) {
        openings.push({
          id: `win_m${i}_${style}_${Date.now()}`,
          type: winType,
          positionRatio: centerU / wallLen,
          width: winW,
          height: winH,
          sillHeight: sillH
        });
      }
    }

    return openings;
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

  // ============================================================================
  // TAHAP 6: CONTRACTOR ARCHITECTURAL STEEL FRAME CAD STUDIO (SKETCHUP PRO STYLE)
  // ============================================================================

  private static createCeramicGridMaterial(repeatX: number, repeatZ: number): THREE.MeshStandardMaterial {
    let gridMap: THREE.CanvasTexture | undefined;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#f4f7fa';
        ctx.fillRect(0, 0, 128, 128);
        // Subtle ceramic bevel highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(4, 4, 120, 120);
        ctx.fillStyle = '#eef2f7';
        ctx.fillRect(6, 6, 116, 116);
        // Crisp 60cm x 60cm grout lines
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 4;
        ctx.strokeRect(1, 1, 126, 126);

        gridMap = new THREE.CanvasTexture(canvas);
        gridMap.wrapS = THREE.RepeatWrapping;
        gridMap.wrapT = THREE.RepeatWrapping;
        gridMap.repeat.set(Math.max(1, repeatX / 0.6), Math.max(1, repeatZ / 0.6));
      }
    }

    return new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      ...(gridMap ? { map: gridMap } : {}),
      roughness: 0.35,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
  }

  private static createVerticalHBeamColumn(
    colHeight: number,
    steelMat: THREE.Material,
    flangeW: number = 0.24,
    depth: number = 0.24,
    flangeT: number = 0.036,
    webT: number = 0.03
  ): THREE.Group {
    const colGroup = new THREE.Group();
    colGroup.name = 'SteelHBeamColumn';

    const f1 = new THREE.Mesh(new THREE.BoxGeometry(flangeW, colHeight, flangeT), steelMat);
    f1.position.set(0, colHeight * 0.5, (depth - flangeT) * 0.5);
    f1.castShadow = true;
    colGroup.add(f1);

    const f2 = new THREE.Mesh(new THREE.BoxGeometry(flangeW, colHeight, flangeT), steelMat);
    f2.position.set(0, colHeight * 0.5, -(depth - flangeT) * 0.5);
    f2.castShadow = true;
    colGroup.add(f2);

    const web = new THREE.Mesh(
      new THREE.BoxGeometry(webT, colHeight, Math.max(0.04, depth - flangeT * 2)),
      steelMat
    );
    web.position.set(0, colHeight * 0.5, 0);
    web.castShadow = true;
    colGroup.add(web);

    const basePlate = new THREE.Mesh(new THREE.BoxGeometry(flangeW + 0.1, 0.03, depth + 0.1), steelMat);
    basePlate.position.set(0, 0.015, 0);
    colGroup.add(basePlate);

    return colGroup;
  }

  private static createHorizontalHBeamGirder(
    spanLen: number,
    axis: 'x' | 'z',
    steelMat: THREE.Material,
    beamH: number = 0.26,
    flangeW: number = 0.18,
    flangeT: number = 0.032,
    webT: number = 0.028
  ): THREE.Group {
    const girderGroup = new THREE.Group();
    girderGroup.name = 'SteelHBeamGirder';
    const webH = Math.max(0.05, beamH - flangeT * 2);

    if (axis === 'x') {
      const topFlange = new THREE.Mesh(new THREE.BoxGeometry(spanLen, flangeT, flangeW), steelMat);
      topFlange.position.set(0, (beamH - flangeT) * 0.5, 0);
      topFlange.castShadow = true;
      girderGroup.add(topFlange);

      const botFlange = new THREE.Mesh(new THREE.BoxGeometry(spanLen, flangeT, flangeW), steelMat);
      botFlange.position.set(0, -(beamH - flangeT) * 0.5, 0);
      botFlange.castShadow = true;
      girderGroup.add(botFlange);

      const web = new THREE.Mesh(new THREE.BoxGeometry(spanLen, webH, webT), steelMat);
      web.castShadow = true;
      girderGroup.add(web);
    } else {
      const topFlange = new THREE.Mesh(new THREE.BoxGeometry(flangeW, flangeT, spanLen), steelMat);
      topFlange.position.set(0, (beamH - flangeT) * 0.5, 0);
      topFlange.castShadow = true;
      girderGroup.add(topFlange);

      const botFlange = new THREE.Mesh(new THREE.BoxGeometry(flangeW, flangeT, spanLen), steelMat);
      botFlange.position.set(0, -(beamH - flangeT) * 0.5, 0);
      botFlange.castShadow = true;
      girderGroup.add(botFlange);

      const web = new THREE.Mesh(new THREE.BoxGeometry(webT, webH, spanLen), steelMat);
      web.castShadow = true;
      girderGroup.add(web);
    }

    return girderGroup;
  }

  /**
   * Builds the exposed black H-Beam / I-Beam contractor structural steel skeleton,
   * gridded ceramic tile floor slabs with stairwell void, wooden-tread stairs with
   * black iron railings, and cut-away partition walls (SketchUp Pro Contractor Mode).
   */
  public static buildContractorSteelFrameGroup(
    width: number,
    length: number,
    floorCount: number,
    floorHeight: number,
    plinthHeight: number = 0.35
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ContractorSteelFrameGroup';

    const safeW = Math.max(6, width);
    const safeL = Math.max(6, length);
    const safeFloors = Math.max(1, floorCount);
    const halfW = safeW * 0.5;
    const halfL = safeL * 0.5;
    const totalWallH = safeFloors * floorHeight;

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e242b,
      metalness: 0.72,
      roughness: 0.34
    });
    const woodTreadMat = new THREE.MeshStandardMaterial({
      color: 0xa16207,
      roughness: 0.52,
      metalness: 0.06
    });
    const wallCutawayMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.78,
      metalness: 0.02
    });
    const glassWindowMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.15,
      metalness: 0.45,
      transparent: true,
      opacity: 0.52,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    // 1. Structural Column Grid (H-Beams)
    const baysX = Math.max(2, Math.min(4, Math.round(safeW / 4.2)));
    const baysZ = Math.max(2, Math.min(4, Math.round(safeL / 4.2)));
    const xCoords: number[] = [];
    const zCoords: number[] = [];
    for (let ix = 0; ix <= baysX; ix++) {
      xCoords.push(-halfW + 0.15 + ((safeW - 0.3) / baysX) * ix);
    }
    for (let iz = 0; iz <= baysZ; iz++) {
      zCoords.push(-halfL + 0.15 + ((safeL - 0.3) / baysZ) * iz);
    }

    for (const cx of xCoords) {
      for (const cz of zCoords) {
        const col = this.createVerticalHBeamColumn(totalWallH, steelMat);
        col.position.set(cx, plinthHeight, cz);
        group.add(col);
      }
    }

    // Stairwell void bounds along the right bay
    const stairVoidW = Math.min(2.3, Math.max(1.6, safeW * 0.24));
    const stairVoidL = Math.min(4.8, Math.max(3.2, safeL * 0.44));
    const voidMinX = halfW - stairVoidW - 0.28;
    const voidMaxX = halfW - 0.28;
    const voidMinZ = -stairVoidL * 0.42;
    const voidMaxZ = stairVoidL * 0.58;

    // 2. Horizontal H-Beam Girders, Secondary Joists & Diagonal Braces per level
    for (let lvl = 1; lvl <= safeFloors; lvl++) {
      const beamY = plinthHeight + lvl * floorHeight - 0.14;

      // Primary X-axis H-Beam Girders along every Z grid line
      for (const cz of zCoords) {
        const gX = this.createHorizontalHBeamGirder(safeW - 0.12, 'x', steelMat);
        gX.position.set(0, beamY, cz);
        group.add(gX);
      }

      // Primary Z-axis H-Beam Girders along every X grid line
      for (const cx of xCoords) {
        const gZ = this.createHorizontalHBeamGirder(safeL - 0.12, 'z', steelMat);
        gZ.position.set(cx, beamY, 0);
        group.add(gZ);
      }

      // Secondary intermediate steel joists subdividing each Z bay
      for (let iz = 0; iz < baysZ; iz++) {
        const midZ = (zCoords[iz] + zCoords[iz + 1]) * 0.5;
        const joistSpanW = lvl < safeFloors ? Math.max(2.0, voidMinX - (-halfW + 0.2)) : safeW - 0.3;
        const joistCenterX = lvl < safeFloors ? (-halfW + 0.2 + voidMinX) * 0.5 : 0;
        const joist = new THREE.Mesh(new THREE.BoxGeometry(joistSpanW, 0.16, 0.09), steelMat);
        joist.name = 'SteelSecondaryJoist';
        joist.position.set(joistCenterX, beamY + 0.02, midZ);
        joist.castShadow = true;
        group.add(joist);
      }

      // Roof truss rafters on highest level
      if (lvl === safeFloors) {
        const trussGroup = new THREE.Group();
        trussGroup.name = 'SteelRoofTruss';
        for (let ix = 0; ix < baysX; ix++) {
          const midX = (xCoords[ix] + xCoords[ix + 1]) * 0.5;
          const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, safeL - 0.24), steelMat);
          rafter.position.set(midX, beamY + 0.04, 0);
          rafter.castShadow = true;
          trussGroup.add(rafter);
        }
        group.add(trussGroup);
      }
    }

    // Diagonal Structural Knee-Braces on front/right portal bays (like SketchUp contractor framing)
    const bracePositions: Array<{ x: number; z1: number; z2: number; yBase: number }> = [
      { x: xCoords[xCoords.length - 1], z1: zCoords[zCoords.length - 1], z2: zCoords[zCoords.length - 1] - 1.4, yBase: plinthHeight },
      { x: xCoords[0], z1: zCoords[zCoords.length - 1], z2: zCoords[zCoords.length - 1] - 1.4, yBase: plinthHeight }
    ];
    for (const bp of bracePositions) {
      const dy = Math.min(2.2, floorHeight * 0.72);
      const dz = bp.z2 - bp.z1;
      const braceLen = Math.hypot(dy, dz);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, braceLen, 0.12), steelMat);
      brace.name = 'SteelDiagonalBrace';
      brace.position.set(bp.x, bp.yBase + dy * 0.5, (bp.z1 + bp.z2) * 0.5);
      brace.rotation.x = Math.atan2(dz, dy);
      brace.castShadow = true;
      group.add(brace);
    }

    // 3. Crisp White Gridded Ceramic Tile Floor Slabs (with Stairwell Void on Upper Floors)
    // Ground floor full ceramic grid slab
    const groundCeramicMat = this.createCeramicGridMaterial(safeW - 0.4, safeL - 0.4);
    const groundSlab = new THREE.Mesh(
      new THREE.BoxGeometry(safeW - 0.36, 0.05, safeL - 0.36),
      groundCeramicMat
    );
    groundSlab.name = 'CeramicGridFloorSlab';
    groundSlab.position.set(0, plinthHeight + 0.025, 0);
    groundSlab.receiveShadow = true;
    group.add(groundSlab);

    // Upper floor ceramic grid slabs leaving open stairwell cutout on the right bay
    for (let f = 1; f < safeFloors; f++) {
      const slabY = plinthHeight + f * floorHeight;
      const mainPlateW = Math.max(1.8, voidMinX - (-halfW + 0.2));
      const mainCeramicMat = this.createCeramicGridMaterial(mainPlateW, safeL - 0.4);
      const mainPlate = new THREE.Mesh(
        new THREE.BoxGeometry(mainPlateW, 0.10, safeL - 0.36),
        mainCeramicMat
      );
      mainPlate.name = 'CeramicGridFloorSlab';
      mainPlate.position.set(-halfW + 0.2 + mainPlateW * 0.5, slabY, 0);
      mainPlate.castShadow = true;
      mainPlate.receiveShadow = true;
      group.add(mainPlate);

      // Front & rear landing strips around stairwell void
      const rearStripL = Math.max(0.6, voidMinZ - (-halfL + 0.2));
      if (rearStripL > 0.4) {
        const rearLanding = new THREE.Mesh(
          new THREE.BoxGeometry(voidMaxX - voidMinX, 0.10, rearStripL),
          this.createCeramicGridMaterial(voidMaxX - voidMinX, rearStripL)
        );
        rearLanding.name = 'CeramicGridFloorSlab';
        rearLanding.position.set((voidMinX + voidMaxX) * 0.5, slabY, -halfL + 0.2 + rearStripL * 0.5);
        rearLanding.receiveShadow = true;
        group.add(rearLanding);
      }

      const frontStripL = Math.max(0.6, halfL - 0.2 - voidMaxZ);
      if (frontStripL > 0.4) {
        const frontLanding = new THREE.Mesh(
          new THREE.BoxGeometry(voidMaxX - voidMinX, 0.10, frontStripL),
          this.createCeramicGridMaterial(voidMaxX - voidMinX, frontStripL)
        );
        frontLanding.name = 'CeramicGridFloorSlab';
        frontLanding.position.set((voidMinX + voidMaxX) * 0.5, slabY, voidMaxZ + frontStripL * 0.5);
        frontLanding.receiveShadow = true;
        group.add(frontLanding);
      }

      // Black steel stairwell trimmer beam framing the void edge
      const voidTrimmer = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.20, voidMaxZ - voidMinZ + 0.16),
        steelMat
      );
      voidTrimmer.position.set(voidMinX, slabY - 0.06, (voidMinZ + voidMaxZ) * 0.5);
      group.add(voidTrimmer);

      // Upper floor stairwell safety guardrail
      const guardRailH = 0.92;
      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.05, voidMaxZ - voidMinZ),
        steelMat
      );
      topRail.position.set(voidMinX + 0.04, slabY + guardRailH, (voidMinZ + voidMaxZ) * 0.5);
      group.add(topRail);
    }

    // 4. Detailed Wooden-Tread & Black-Iron Contractor Staircase
    const stairFlights = Math.max(1, safeFloors - 1);
    for (let sf = 0; sf < stairFlights; sf++) {
      const flightGroup = new THREE.Group();
      flightGroup.name = 'ExposedWoodenStaircase';

      const baseElev = plinthHeight + sf * floorHeight;
      const riseTotal = floorHeight;
      const runTotal = Math.max(2.6, voidMaxZ - voidMinZ - 0.35);
      const stepCount = 14;
      const treadW = Math.max(1.0, (voidMaxX - voidMinX) - 0.22);
      const treadD = Math.max(0.24, runTotal / stepCount + 0.03);
      const treadThick = 0.055;
      const centerX = (voidMinX + voidMaxX) * 0.5;
      const startZ = voidMaxZ - 0.2;
      const endZ = startZ - runTotal;

      // Twin angled black steel channel stringers
      const stringerLen = Math.hypot(runTotal, riseTotal);
      const pitchAngle = Math.atan2(riseTotal, runTotal);
      for (const side of [-1, 1]) {
        const stringer = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.20, stringerLen),
          steelMat
        );
        stringer.name = 'SteelStairStringer';
        stringer.position.set(
          centerX + side * (treadW * 0.5 + 0.035),
          baseElev + riseTotal * 0.5 - 0.06,
          (startZ + endZ) * 0.5
        );
        stringer.rotation.x = pitchAngle;
        stringer.castShadow = true;
        flightGroup.add(stringer);

        // Inclined black iron handrail above stringer
        const handrail = new THREE.Mesh(
          new THREE.BoxGeometry(0.045, 0.045, stringerLen + 0.2),
          steelMat
        );
        handrail.name = 'StairIronRailing';
        handrail.position.set(
          centerX + side * (treadW * 0.5 + 0.035),
          baseElev + riseTotal * 0.5 + 0.88,
          (startZ + endZ) * 0.5
        );
        handrail.rotation.x = pitchAngle;
        flightGroup.add(handrail);

        // Parallel mid-rail
        const midRail = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, 0.028, stringerLen + 0.15),
          steelMat
        );
        midRail.position.set(
          centerX + side * (treadW * 0.5 + 0.035),
          baseElev + riseTotal * 0.5 + 0.46,
          (startZ + endZ) * 0.5
        );
        midRail.rotation.x = pitchAngle;
        flightGroup.add(midRail);
      }

      // Warm Teak Wooden Treads & Vertical Iron Balusters
      for (let s = 0; s < stepCount; s++) {
        const tRatio = (s + 0.5) / stepCount;
        const stepY = baseElev + ((s + 1) / stepCount) * riseTotal;
        const stepZ = startZ - tRatio * runTotal;

        const tread = new THREE.Mesh(
          new THREE.BoxGeometry(treadW, treadThick, treadD),
          woodTreadMat
        );
        tread.name = 'WoodenStairTread';
        tread.position.set(centerX, stepY - treadThick * 0.5, stepZ);
        tread.castShadow = true;
        tread.receiveShadow = true;
        flightGroup.add(tread);

        // Baluster posts every 2 steps
        if (s % 2 === 0 || s === stepCount - 1) {
          for (const side of [-1, 1]) {
            const baluster = new THREE.Mesh(
              new THREE.BoxGeometry(0.03, 0.90, 0.03),
              steelMat
            );
            baluster.position.set(
              centerX + side * (treadW * 0.5 + 0.035),
              stepY + 0.43,
              stepZ
            );
            flightGroup.add(baluster);
          }
        }
      }

      group.add(flightGroup);
    }

    // 5. Cut-away Rear & Partial Interior White Walls with Dark-Framed Multi-Pane Windows
    const cutawayGroup = new THREE.Group();
    cutawayGroup.name = 'CutawayPartitionWall';

    const rearWallH = Math.max(2.6, totalWallH - 0.28);
    const rearWallZ = -halfL + 0.28;
    const rearWall = new THREE.Mesh(
      new THREE.BoxGeometry(safeW - 0.56, rearWallH, 0.16),
      wallCutawayMat
    );
    rearWall.position.set(0, plinthHeight + rearWallH * 0.5, rearWallZ);
    rearWall.castShadow = true;
    rearWall.receiveShadow = true;
    cutawayGroup.add(rearWall);

    // Multi-pane dark-framed architectural windows on the rear cutaway wall (offset +0.08m proud)
    for (let f = 0; f < safeFloors; f++) {
      const fBaseY = plinthHeight + f * floorHeight;
      const winW = Math.min(3.4, safeW * 0.36);
      const winH = Math.min(2.1, floorHeight * 0.66);
      const winX = -safeW * 0.18;
      const winY = fBaseY + winH * 0.5 + 0.45;
      const winZ = rearWallZ + 0.14;

      const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.06), steelMat);
      outerFrame.position.set(winX, winY, winZ);
      cutawayGroup.add(outerFrame);

      const pane = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.14, winH - 0.14, 0.04), glassWindowMat);
      pane.position.set(winX, winY, winZ + 0.02);
      cutawayGroup.add(pane);

      // Mullion grid bars
      for (const mRatio of [-0.25, 0, 0.25]) {
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, winH - 0.1, 0.07), steelMat);
        vBar.position.set(winX + winW * mRatio, winY, winZ + 0.02);
        cutawayGroup.add(vBar);
      }
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(winW - 0.1, 0.04, 0.07), steelMat);
      hBar.position.set(winX, winY - winH * 0.18, winZ + 0.02);
      cutawayGroup.add(hBar);
    }

    // Partial left-side cutaway wall (rear half only so front half stays open in cutaway!)
    const leftCutLen = safeL * 0.48;
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, rearWallH, leftCutLen),
      wallCutawayMat
    );
    leftWall.position.set(-halfW + 0.28, plinthHeight + rearWallH * 0.5, -halfL + 0.28 + leftCutLen * 0.5);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    cutawayGroup.add(leftWall);

    group.add(cutawayGroup);
    return group;
  }

  /**
   * Builds the Ground-Floor Carport Canopy (with iron gate & pearl-white 3D car silhouette)
   * and the Upper-Floor Cantilevered Balcony with dark-grey segmented architectural fascia panels.
   */
  public static buildCarportAndTopBalconyGroup(
    width: number,
    length: number,
    floorCount: number,
    floorHeight: number,
    plinthHeight: number = 0.35
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CarportAndTopBalconyGroup';

    const safeW = Math.max(6, width);
    const safeL = Math.max(6, length);
    const halfW = safeW * 0.5;
    const halfL = safeL * 0.5;

    const bayW = Math.min(4.8, Math.max(3.2, safeW * 0.46));
    const carportD = 3.2;
    const bayCenterX = halfW - bayW * 0.5 - 0.25;
    const frontWallZ = halfL;
    const carportCenterZ = frontWallZ + carportD * 0.5;

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e242b,
      metalness: 0.68,
      roughness: 0.36
    });
    const fasciaGreyMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.22,
      roughness: 0.52,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const concreteDeckMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.75,
      metalness: 0.05
    });
    const pavingPadMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.88,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    // 1. Ground-Floor Carport Canopy Bay
    const carportGroup = new THREE.Group();
    carportGroup.name = 'CarportCanopyBay';

    const padMesh = new THREE.Mesh(
      new THREE.BoxGeometry(bayW + 0.2, 0.08, carportD + 0.5),
      pavingPadMat
    );
    padMesh.position.set(bayCenterX, 0.04, carportCenterZ + 0.15);
    padMesh.receiveShadow = true;
    carportGroup.add(padMesh);

    const canopyY = plinthHeight + floorHeight;
    // Carport front steel columns
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, canopyY, 0.16),
        steelMat
      );
      post.position.set(bayCenterX + side * (bayW * 0.5 - 0.08), canopyY * 0.5, frontWallZ + carportD - 0.12);
      post.castShadow = true;
      carportGroup.add(post);

      const sideBeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.18, carportD),
        steelMat
      );
      sideBeam.position.set(bayCenterX + side * (bayW * 0.5 - 0.08), canopyY - 0.09, carportCenterZ);
      carportGroup.add(sideBeam);
    }

    const frontHeaderBeam = new THREE.Mesh(
      new THREE.BoxGeometry(bayW, 0.18, 0.16),
      steelMat
    );
    frontHeaderBeam.position.set(bayCenterX, canopyY - 0.09, frontWallZ + carportD - 0.12);
    carportGroup.add(frontHeaderBeam);

    // Translucent smoked polycarbonate / tempered canopy sub-ribs
    const canopySlats = 5;
    for (let s = 1; s < canopySlats; s++) {
      const sz = frontWallZ + (carportD / canopySlats) * s;
      const rib = new THREE.Mesh(new THREE.BoxGeometry(bayW - 0.2, 0.08, 0.08), steelMat);
      rib.position.set(bayCenterX, canopyY - 0.08, sz);
      carportGroup.add(rib);
    }

    // Front Dark-Slate Sliding Iron Gate (CarportIronGate)
    const gateGroup = new THREE.Group();
    gateGroup.name = 'CarportIronGate';
    const gateH = 1.45;
    const gateZ = frontWallZ + carportD + 0.18;
    const topGateRail = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.05, 0.05), steelMat);
    topGateRail.position.set(bayCenterX, gateH, gateZ);
    gateGroup.add(topGateRail);

    const botGateRail = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.06, 0.05), steelMat);
    botGateRail.position.set(bayCenterX, 0.14, gateZ);
    gateGroup.add(botGateRail);

    const barCount = Math.max(10, Math.floor(bayW / 0.18));
    for (let b = 0; b <= barCount; b++) {
      const bx = bayCenterX - bayW * 0.5 + (bayW / barCount) * b;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, gateH - 0.12, 0.035), steelMat);
      bar.position.set(bx, gateH * 0.5 + 0.04, gateZ);
      gateGroup.add(bar);
    }
    carportGroup.add(gateGroup);

    // Pearl-White 3D Low-Poly Car Silhouette parked neatly inside the carport
    const carGroup = new THREE.Group();
    carGroup.name = 'CarportParkedCar';
    const carWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.24,
      metalness: 0.18
    });
    const carGlassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.12,
      metalness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.85 });
    const tailLightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.35
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.58, 3.85), carWhiteMat);
    chassis.position.set(0, 0.44, 0);
    chassis.castShadow = true;
    carGroup.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.52, 2.15), carWhiteMat);
    cabin.position.set(0, 0.96, -0.18);
    cabin.castShadow = true;
    carGroup.add(cabin);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.38, 2.22), carGlassMat);
    windshield.position.set(0, 0.95, -0.18);
    carGroup.add(windshield);

    // 4 Wheels
    for (const wx of [-0.84, 0.84]) {
      for (const wz of [-1.22, 1.22]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.20, 12), tireMat);
        wheel.rotation.z = Math.PI * 0.5;
        wheel.position.set(wx, 0.28, wz);
        carGroup.add(wheel);
      }
    }

    // Rear Taillights facing outward (+Z)
    for (const lx of [-0.62, 0.62]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.05), tailLightMat);
      tl.position.set(lx, 0.56, 1.94);
      carGroup.add(tl);
    }

    carGroup.position.set(bayCenterX, 0.08, carportCenterZ - 0.15);
    carportGroup.add(carGroup);
    group.add(carportGroup);

    // 2. Upper-Floor Cantilevered Balcony with Segmented Charcoal-Grey Fascia Panels
    const topBalconyGroup = new THREE.Group();
    topBalconyGroup.name = 'TopBalconyGroup';

    const balconyD = carportD * 0.88;
    const balconyCenterZ = frontWallZ + balconyD * 0.5;
    const deckSlab = new THREE.Mesh(
      new THREE.BoxGeometry(bayW + 0.12, 0.22, balconyD),
      concreteDeckMat
    );
    deckSlab.position.set(bayCenterX, canopyY + 0.11, balconyCenterZ);
    deckSlab.castShadow = true;
    deckSlab.receiveShadow = true;
    topBalconyGroup.add(deckSlab);

    // Segmented Dark-Grey Architectural Fascia Panels along front & outer side (Reference Image 1 bottom)
    const fasciaH = 0.68;
    const fasciaY = canopyY + 0.24;
    const fasciaFrontZ = frontWallZ + balconyD + 0.04;
    const panelSegments = 5;
    const segW = bayW / panelSegments;

    for (let i = 0; i < panelSegments; i++) {
      const px = bayCenterX - bayW * 0.5 + segW * (i + 0.5);
      const fasciaPanel = new THREE.Mesh(
        new THREE.BoxGeometry(segW - 0.04, fasciaH, 0.08),
        fasciaGreyMat
      );
      fasciaPanel.name = 'TopBalconyFasciaPanel';
      fasciaPanel.position.set(px, fasciaY, fasciaFrontZ);
      fasciaPanel.castShadow = true;
      topBalconyGroup.add(fasciaPanel);

      if (i > 0) {
        const seam = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, fasciaH + 0.02, 0.09),
          steelMat
        );
        seam.position.set(bayCenterX - bayW * 0.5 + segW * i, fasciaY, fasciaFrontZ);
        topBalconyGroup.add(seam);
      }
    }

    // Side return fascia panels
    for (const side of [-1, 1]) {
      const sideFascia = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, fasciaH, balconyD),
        fasciaGreyMat
      );
      sideFascia.name = 'TopBalconyFasciaPanel';
      sideFascia.position.set(bayCenterX + side * (bayW * 0.5 + 0.02), fasciaY, balconyCenterZ);
      topBalconyGroup.add(sideFascia);
    }

    // Upper Black Iron Railing rising above the fascia panels
    const railGroup = new THREE.Group();
    railGroup.name = 'TopBalconyRailing';
    const railTopY = fasciaY + fasciaH * 0.5 + 0.42;
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(bayW + 0.08, 0.05, 0.05), steelMat);
    topBar.position.set(bayCenterX, railTopY, fasciaFrontZ);
    railGroup.add(topBar);

    const railPosts = Math.max(8, Math.floor(bayW / 0.28));
    for (let r = 0; r <= railPosts; r++) {
      const rx = bayCenterX - bayW * 0.5 + (bayW / railPosts) * r;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), steelMat);
      post.position.set(rx, railTopY - 0.21, fasciaFrontZ);
      railGroup.add(post);
    }
    topBalconyGroup.add(railGroup);

    group.add(topBalconyGroup);
    return group;
  }

  /**
   * Builds Vertical Facade Louver Lattice Screens ("Kisi-Kisi Fasad Vertikal (Secondary Skin)")
   * offset >= 0.14m proud of the primary front facade wall to eliminate z-fighting.
   */
  public static buildVerticalSecondarySkinGroup(
    width: number,
    length: number,
    floorCount: number,
    floorHeight: number,
    plinthHeight: number = 0.35
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'VerticalSecondarySkinGroup';

    const safeW = Math.max(6, width);
    const safeL = Math.max(6, length);
    const safeFloors = Math.max(1, floorCount);
    const halfW = safeW * 0.5;
    const halfL = safeL * 0.5;

    const startFloor = safeFloors > 1 ? 1 : 0;
    const screenBottomY = plinthHeight + startFloor * floorHeight + 0.12;
    const screenTopY = plinthHeight + safeFloors * floorHeight - 0.12;
    const screenH = Math.max(1.8, screenTopY - screenBottomY);
    const screenCenterY = (screenBottomY + screenTopY) * 0.5;
    const screenZ = halfL + 0.14; // +0.14m proud of primary wall (well above 0.06m min offset)

    const frameSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e242b,
      metalness: 0.65,
      roughness: 0.38,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const slatBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.42,
      roughness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const panelW = Math.min(1.65, Math.max(0.95, safeW * 0.16));
    const panelXCenters = [-halfW + panelW * 0.5 + 0.32, halfW - panelW * 0.5 - 0.32];

    for (const cx of panelXCenters) {
      const screenPanel = new THREE.Group();
      screenPanel.name = 'VerticalSecondarySkinScreen';

      // Outer steel frame
      const topFrame = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.06, 0.10), frameSteelMat);
      topFrame.position.set(cx, screenTopY - 0.03, screenZ);
      screenPanel.add(topFrame);

      const botFrame = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.06, 0.10), frameSteelMat);
      botFrame.position.set(cx, screenBottomY + 0.03, screenZ);
      screenPanel.add(botFrame);

      // Vertical louver fins
      const slatCount = Math.max(5, Math.floor(panelW / 0.16));
      for (let i = 0; i <= slatCount; i++) {
        const sx = cx - panelW * 0.5 + (panelW / slatCount) * i;
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(0.038, screenH, 0.09),
          i === 0 || i === slatCount ? frameSteelMat : slatBronzeMat
        );
        slat.position.set(sx, screenCenterY, screenZ);
        slat.castShadow = true;
        screenPanel.add(slat);
      }

      // Horizontal cross-tie ladder bars (creating crisp vertical contractor lattice)
      const tieRows = Math.max(4, Math.floor(screenH / 0.46));
      for (let r = 1; r < tieRows; r++) {
        const ty = screenBottomY + (screenH / tieRows) * r;
        const tieBar = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.04, 0.026, 0.05), frameSteelMat);
        tieBar.position.set(cx, ty, screenZ - 0.01);
        screenPanel.add(tieBar);
      }

      group.add(screenPanel);
    }

    return group;
  }
}
