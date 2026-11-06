import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BuildingInstance, BuildingSubPartDimensions, BuildingSubPartType, RoofType } from './PrefabTypes';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { InteriorLayoutFactory } from './InteriorLayoutFactory';
import { InteriorMeshBuilder } from './InteriorMeshBuilder';
import { BuildingCatalogRegistry, BuildingCatalogItem } from './BuildingCatalogRegistry';
import { TectonicComponents } from './TectonicComponents';
import { RoofMeshBuilder } from './builders/RoofMeshBuilder';
import { FacadeMeshBuilder } from './builders/FacadeMeshBuilder';
import { RoofEquipmentBuilder } from './builders/RoofEquipmentBuilder';
import { LotContextBuilder } from './builders/LotContextBuilder';
import { BuildingVariantGenerator } from './BuildingVariantGenerator';
import { FirstPersonFurnitureBuilder, FIRST_PERSON_FURNITURE_CATALOG } from './FirstPersonFurnitureCatalog';
import { InteriorInteractiveSystem } from './InteriorInteractiveSystem';

export interface CachedMeshTemplate {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  layer?: 'exterior' | 'detail_props' | 'interior' | 'subsurface' | 'lod2_massing';
  partType?: BuildingSubPartType;
}

/**
 * High-End Modern Architectural Mesh Builder for Arscity
 * Crafts articulated volumetric massing, PBR textured surfaces,
 * cantilevered volumes, glass railings, sun louvers, and tropical planters.
 *
 * Milestone T3:
 * - Geometry consolidation per material via mergeGeometries
 * - Geometry caching per preset and architectural parameters
 * - Drastically reduces draw calls and GPU memory overhead
 */
export class PrefabMeshBuilder {
  private static materialsCache: Map<string, THREE.Material> = new Map();
  private static geometryCache: Map<string, CachedMeshTemplate[]> = new Map();

  public static clearCache(): void {
    for (const templates of this.geometryCache.values()) {
      for (const t of templates) {
        t.geometry.dispose();
      }
    }
    this.geometryCache.clear();
  }

  public static getEffectiveSubParts(
    bld: Partial<BuildingInstance> & { width?: number; length?: number; floorCount?: number }
  ): Record<BuildingSubPartType, BuildingSubPartDimensions> {
    const w = Math.max(4, bld.width || 10);
    const l = Math.max(4, bld.length || 10);
    const fl = Math.max(1, bld.floorCount || 1);
    const overhang = bld.roofOverhang ?? 1.2;
    const custom = bld.subParts || {};

    return {
      main_tower: custom.main_tower
        ? { ...custom.main_tower }
        : { partWidth: w, partDepth: l, partFloors: fl },
      podium_base: custom.podium_base
        ? { ...custom.podium_base }
        : {
            partWidth: Number((w * 1.08).toFixed(2)),
            partDepth: Number((l * 1.08).toFixed(2)),
            partFloors: fl >= 4 ? 2 : 1
          },
      side_wing: custom.side_wing
        ? { ...custom.side_wing }
        : {
            partWidth: Number(Math.max(3.6, w * 0.42).toFixed(2)),
            partDepth: Number(Math.max(4.4, l * 0.72).toFixed(2)),
            partFloors: Math.max(1, fl > 1 ? fl - 1 : 1)
          },
      roof_crown: custom.roof_crown
        ? { ...custom.roof_crown }
        : {
            partWidth: Number((w + overhang * 2).toFixed(2)),
            partDepth: Number((l + overhang * 2).toFixed(2)),
            partFloors: 1
          }
    };
  }

  public static getCacheKey(bld: BuildingInstance): string {
    const sp = bld.subParts
      ? (['main_tower', 'podium_base', 'side_wing', 'roof_crown'] as BuildingSubPartType[])
          .map((k) => {
            const d = bld.subParts?.[k];
            return d ? `${k}:${d.partWidth.toFixed(2)}x${d.partDepth.toFixed(2)}x${d.partFloors}` : '';
          })
          .filter(Boolean)
          .join('|')
      : '';
    return [
      bld.presetKey || 'custom',
      (bld.width || 0).toFixed(2),
      (bld.length || 0).toFixed(2),
      (bld.floorHeight || 3.2).toFixed(2),
      bld.floorCount || 1,
      bld.roofType || 'hip',
      bld.roofMaterial || '',
      bld.wallMaterial || 'plaster',
      bld.wallColor || '',
      sp,
      (bld.apronDepth || 0).toFixed(2)
    ].join('_');
  }

  /**
   * Centralized PBR Material Generator with Rich Architectural Textures
   */
  public static getMaterial(type: string, color?: string): THREE.Material {
    if (type === 'warm_light') {
      const key = 'warm_light';
      if (!this.materialsCache.has(key)) {
        this.materialsCache.set(key, new THREE.MeshBasicMaterial({ color: 0xffedd5 }));
      }
      return this.materialsCache.get(key)!;
    }
    return MaterialLibrary.getInstance().getMaterial(type, { color });
  }

  /**
   * Consolidates all static child meshes sharing the same material (and sub-part type) into unified geometries.
   * Never merges meshes across different BuildingSubPartType buckets so modular sub-parts remain independently selectable.
   */
  public static optimizeBuildingGroup(
    group: THREE.Group,
    layer: 'exterior' | 'detail_props' | 'interior' | 'subsurface' | 'lod2_massing' = 'exterior'
  ): CachedMeshTemplate[] {
    group.updateMatrixWorld(true);
    const rootInv = group.matrixWorld.clone().invert();

    const meshesByBucket = new Map<
      string,
      { mat: THREE.Material; partType?: BuildingSubPartType; items: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] }
    >();
    const allMeshes: THREE.Mesh[] = [];

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        allMeshes.push(child as THREE.Mesh);
      }
    });

    for (const mesh of allMeshes) {
      mesh.updateMatrixWorld(true);
      const relMatrix = rootInv.clone().multiply(mesh.matrixWorld);
      const mat = mesh.material as THREE.Material;
      let resolvedPart: BuildingSubPartType | undefined = undefined;
      if (layer === 'exterior') {
        let p: THREE.Object3D | null = mesh;
        while (p && p !== group) {
          if (p.userData?.partType) {
            resolvedPart = p.userData.partType as BuildingSubPartType;
            break;
          }
          p = p.parent;
        }
        resolvedPart = resolvedPart || 'main_tower';
      }
      const bucketKey = `${resolvedPart || 'none'}::${mat.uuid}`;
      if (!meshesByBucket.has(bucketKey)) {
        meshesByBucket.set(bucketKey, { mat, partType: resolvedPart, items: [] });
      }
      meshesByBucket.get(bucketKey)!.items.push({
        geo: mesh.geometry,
        matrix: relMatrix,
      });
    }

    // Clear raw children from group
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    const templates: CachedMeshTemplate[] = [];

    for (const { mat, partType, items } of meshesByBucket.values()) {
      if (items.length === 1) {
        const transformedGeo = items[0].geo.clone();
        transformedGeo.applyMatrix4(items[0].matrix);
        items[0].geo.dispose();
        templates.push({ geometry: transformedGeo, material: mat, layer, partType });
      } else {
        const transformedGeos: THREE.BufferGeometry[] = [];
        for (const item of items) {
          const tGeo = item.geo.clone();
          tGeo.applyMatrix4(item.matrix);
          item.geo.dispose();
          transformedGeos.push(tGeo);
        }

        // Ensure consistent indexing across all geometries
        const hasIndexed = transformedGeos.some((g) => g.index !== null);
        const hasNonIndexed = transformedGeos.some((g) => g.index === null);
        if (hasIndexed && hasNonIndexed) {
          for (let i = 0; i < transformedGeos.length; i++) {
            if (transformedGeos[i].index !== null) {
              const nonIndexed = transformedGeos[i].toNonIndexed();
              transformedGeos[i].dispose();
              transformedGeos[i] = nonIndexed;
            }
          }
        }

        // Harmonize attributes (position, normal, uv, color) to guarantee mergeGeometries succeeds
        const anyHasNormal = transformedGeos.some((g) => g.hasAttribute('normal'));
        const anyHasUv = transformedGeos.some((g) => g.hasAttribute('uv'));
        const allHaveUv = transformedGeos.every((g) => g.hasAttribute('uv'));
        const anyHasColor = transformedGeos.some((g) => g.hasAttribute('color'));
        const allHaveColor = transformedGeos.every((g) => g.hasAttribute('color'));

        for (const g of transformedGeos) {
          if (anyHasNormal && !g.hasAttribute('normal')) {
            g.computeVertexNormals();
          }
          if (anyHasUv && !allHaveUv && !g.hasAttribute('uv')) {
            const count = g.attributes.position.count;
            g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
          }
          if (anyHasColor && !allHaveColor && !g.hasAttribute('color')) {
            const count = g.attributes.position.count;
            const colors = new Float32Array(count * 3);
            colors.fill(1.0);
            g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          }
        }

        const merged = mergeGeometries(transformedGeos, false);
        for (const tg of transformedGeos) {
          tg.dispose();
        }

        if (merged) {
          templates.push({ geometry: merged, material: mat, layer, partType });
        } else {
          for (const item of items) {
            const fallbackGeo = item.geo.clone().applyMatrix4(item.matrix);
            templates.push({ geometry: fallbackGeo, material: mat, layer, partType });
          }
        }
      }
    }

    return templates;
  }

  /**
   * Partitions raw exterior meshes into modular sub-parts ('podium_base', 'main_tower', 'side_wing', 'roof_crown')
   * and builds/scales customized sub-part volumes (Miniopolis & CityRT.com style).
   */
  public static partitionAndCustomizeSubParts(rawExterior: THREE.Group, building: BuildingInstance): void {
    rawExterior.updateMatrixWorld(true);
    const rootInv = rawExterior.matrixWorld.clone().invert();
    const eff = this.getEffectiveSubParts(building);
    const plinthH = building.plinthHeight ?? 0.35;
    const flH = building.floorHeight || 3.8;
    const towerFloors = Math.max(1, eff.main_tower.partFloors);
    const roofBaseY = plinthH + towerFloors * flH;

    let podiumCount = 0;
    let sideWingCount = 0;
    let crownCount = 0;

    const bbox = new THREE.Box3();
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    rawExterior.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      if (mesh.userData?.partType) {
        if (mesh.userData.partType === 'podium_base') podiumCount++;
        if (mesh.userData.partType === 'side_wing') sideWingCount++;
        if (mesh.userData.partType === 'roof_crown') crownCount++;
        return;
      }

      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      bbox.copy(mesh.geometry.boundingBox!);
      const rel = rootInv.clone().multiply(mesh.matrixWorld);
      bbox.applyMatrix4(rel);
      bbox.getCenter(center);
      bbox.getSize(size);

      if (bbox.min.y >= roofBaseY - 0.25 || center.y >= roofBaseY + 0.05) {
        mesh.userData.partType = 'roof_crown';
        crownCount++;
      } else if (bbox.max.y <= plinthH + 0.55 || (towerFloors >= 3 && bbox.max.y <= plinthH + flH * 1.15 && size.x > eff.main_tower.partWidth * 1.02)) {
        mesh.userData.partType = 'podium_base';
        podiumCount++;
      } else if (Math.abs(center.x) > eff.main_tower.partWidth * 0.32 && size.x < eff.main_tower.partWidth * 0.65) {
        mesh.userData.partType = 'side_wing';
        sideWingCount++;
      } else {
        mesh.userData.partType = 'main_tower';
      }
    });

    const wallMat = this.getMaterial(building.wallMaterial || 'plaster', building.wallColor || '#f8fafc');
    const beltMat = this.getMaterial('floor_belt', building.wallColor || '#f8fafc');
    const plinthMat = this.getMaterial('stone_plinth', '#475569');
    const glassMat = this.getMaterial('glass');
    const frameMat = this.getMaterial('dark_metal', '#1e293b');
    const roofMat = this.getMaterial(building.roofMaterial || 'clay_tile');

    // 1. Podium Base customization / guarantee
    if (building.subParts?.podium_base || podiumCount === 0) {
      const pw = eff.podium_base.partWidth;
      const pd = eff.podium_base.partDepth;
      const pf = Math.max(1, eff.podium_base.partFloors);
      const podiumGroup = new THREE.Group();
      podiumGroup.userData.partType = 'podium_base';

      // Structural plinth base
      const plinthGeo = new THREE.BoxGeometry(pw + 0.16, plinthH, pd + 0.16);
      MaterialLibrary.applyWorldScaleUVs(plinthGeo, 2.0);
      plinthGeo.translate(0, plinthH * 0.5, 0);
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.userData.partType = 'podium_base';
      podiumGroup.add(plinthMesh);

      // Extra podium floors when podium_base is stretched wider/deeper than main_tower or pf > 1
      if (building.subParts?.podium_base && (pw > eff.main_tower.partWidth + 0.3 || pd > eff.main_tower.partDepth + 0.3 || pf > 1)) {
        const podH = pf * flH;
        const bodyGeo = new THREE.BoxGeometry(pw, podH, pd);
        MaterialLibrary.applyWorldScaleUVs(bodyGeo, 2.5);
        bodyGeo.translate(0, plinthH + podH * 0.5, 0);
        const bodyMesh = new THREE.Mesh(bodyGeo, wallMat);
        bodyMesh.userData.partType = 'podium_base';
        podiumGroup.add(bodyMesh);

        for (let f = 1; f <= pf; f++) {
          const beltGeo = new THREE.BoxGeometry(pw + 0.14, 0.20, pd + 0.14);
          beltGeo.translate(0, plinthH + f * flH - 0.10, 0);
          const beltMesh = new THREE.Mesh(beltGeo, beltMat);
          beltMesh.userData.partType = 'podium_base';
          podiumGroup.add(beltMesh);
        }
      }
      rawExterior.add(podiumGroup);
    }

    // 2. Side Wing annex customization / modular guarantee
    if (building.subParts?.side_wing || sideWingCount === 0) {
      const sw = eff.side_wing.partWidth;
      const sd = eff.side_wing.partDepth;
      const sf = Math.max(1, eff.side_wing.partFloors);
      const isCustomSideWing = Boolean(building.subParts?.side_wing);

      const wingW = isCustomSideWing ? sw : Math.min(sw, Math.max(1.8, eff.main_tower.partWidth * 0.24));
      const wingD = isCustomSideWing ? sd : Math.min(sd, eff.main_tower.partDepth * 0.68);
      const wingH = sf * flH * (isCustomSideWing ? 1.0 : 0.88);
      const wingX = eff.main_tower.partWidth * 0.5 + wingW * 0.5 - (isCustomSideWing ? 0.08 : wingW * 0.65);

      const wingGroup = new THREE.Group();
      wingGroup.userData.partType = 'side_wing';

      const wingBodyGeo = new THREE.BoxGeometry(wingW, wingH, wingD);
      MaterialLibrary.applyWorldScaleUVs(wingBodyGeo, 2.5);
      wingBodyGeo.translate(wingX, plinthH + wingH * 0.5, 0);
      const wingBody = new THREE.Mesh(wingBodyGeo, wallMat);
      wingBody.userData.partType = 'side_wing';
      wingGroup.add(wingBody);

      // Side-wing front ribbon glazing (offset +0.07m outward for zero z-fighting)
      for (let f = 0; f < sf; f++) {
        const winH = Math.min(1.5, flH * 0.45);
        const winW = Math.max(0.8, wingW * 0.68);
        const winY = plinthH + f * (wingH / sf) + (wingH / sf) * 0.52;
        const winZ = wingD * 0.5 + 0.07;

        const glassGeo = new THREE.BoxGeometry(winW, winH, 0.04);
        glassGeo.translate(wingX, winY, winZ);
        const glassMesh = new THREE.Mesh(glassGeo, glassMat);
        glassMesh.userData.partType = 'side_wing';
        wingGroup.add(glassMesh);

        const sillGeo = new THREE.BoxGeometry(winW + 0.10, 0.06, 0.08);
        sillGeo.translate(wingX, winY - winH * 0.5 - 0.03, winZ + 0.01);
        const sillMesh = new THREE.Mesh(sillGeo, frameMat);
        sillMesh.userData.partType = 'side_wing';
        wingGroup.add(sillMesh);
      }

      // Side-wing roof cap / parapet
      const capGeo = new THREE.BoxGeometry(wingW + 0.24, 0.22, wingD + 0.24);
      capGeo.translate(wingX, plinthH + wingH + 0.11, 0);
      const capMesh = new THREE.Mesh(capGeo, beltMat);
      capMesh.userData.partType = 'side_wing';
      wingGroup.add(capMesh);

      rawExterior.add(wingGroup);
    }

    // 3. Roof Crown customization / modular guarantee
    if (building.subParts?.roof_crown || crownCount === 0) {
      if (crownCount === 0) {
        const cw = eff.roof_crown.partWidth;
        const cd = eff.roof_crown.partDepth;
        const crownGeo = new THREE.BoxGeometry(cw, 0.28 * Math.max(1, eff.roof_crown.partFloors), cd);
        crownGeo.translate(0, roofBaseY + 0.14 * Math.max(1, eff.roof_crown.partFloors), 0);
        const crownMesh = new THREE.Mesh(crownGeo, roofMat);
        crownMesh.userData.partType = 'roof_crown';
        rawExterior.add(crownMesh);
      } else if (building.subParts?.roof_crown) {
        const baseCrownW = Math.max(4, eff.main_tower.partWidth + (building.roofOverhang ?? 1.2) * 2);
        const baseCrownD = Math.max(4, eff.main_tower.partDepth + (building.roofOverhang ?? 1.2) * 2);
        const sx = eff.roof_crown.partWidth / baseCrownW;
        const sz = eff.roof_crown.partDepth / baseCrownD;
        const sy = Math.max(0.6, eff.roof_crown.partFloors);

        rawExterior.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.userData?.partType === 'roof_crown') {
            child.scale.set(child.scale.x * sx, child.scale.y * sy, child.scale.z * sz);
          }
        });
      }
    }
  }

  /**
   * Master Entrypoint: Dispatches to specialized architectural builders
   */
  public static buildBuildingGroup(building: BuildingInstance): THREE.Group {
    const cacheKey = this.getCacheKey(building);
    const group = new THREE.Group();
    group.name = `Building_${building.id}`;
    group.position.copy(building.position);
    group.rotation.y = building.rotationY;
    group.userData = { buildingId: building.id, type: 'building' };

    // Generate interior architectural room layouts if not present or if floorCount has changed
    const currentFloors = Math.max(1, building.floorCount || 1);
    if (!building.interiorLayouts || building.interiorLayouts.length !== currentFloors) {
      building.interiorLayouts = InteriorLayoutFactory.getLayoutForBuilding(
        building.presetKey,
        building.width,
        building.length,
        building.floorHeight || 3.2,
        currentFloors
      );
    }

    if (this.geometryCache.has(cacheKey)) {
      const templates = this.geometryCache.get(cacheKey)!;
      this.instantiateFromTemplates(group, templates, building);
      this.attachPlacedFurniture(group, building);
      this.attachEntrancePavingPath(group, building);
      this.freezeStaticBuildingMeshes(group);
      return group;
    }

    // 1. Build raw exterior shell & detail props (respecting main_tower sub-part overrides if set)
    const rawExterior = new THREE.Group();
    const rawDetailProps = new THREE.Group();
    const effSubParts = this.getEffectiveSubParts(building);
    const effectiveBuilding: BuildingInstance = building.subParts?.main_tower
      ? {
          ...building,
          width: effSubParts.main_tower.partWidth,
          length: effSubParts.main_tower.partDepth,
          floorCount: effSubParts.main_tower.partFloors
        }
      : building;

    const item = BuildingCatalogRegistry.getBuilding(effectiveBuilding.presetKey);

    switch (effectiveBuilding.presetKey) {
      case 'skyscraper_office_tower':
        this.buildSkyscraperOfficeTower(rawExterior, effectiveBuilding);
        break;
      case 'skyscraper_green_apartment':
        this.buildSkyscraperGreenApartment(rawExterior, effectiveBuilding);
        break;
      case 'skyscraper_grand_hotel':
        this.buildSkyscraperGrandHotel(rawExterior, effectiveBuilding);
        break;
      case 'skyscraper_mixed_use':
        this.buildSkyscraperMixedUse(rawExterior, effectiveBuilding);
        break;
      case 'house_36':
        this.buildModernHouse36(rawExterior, effectiveBuilding);
        break;
      case 'house_54':
        this.buildModernHouse54(rawExterior, effectiveBuilding);
        break;
      case 'house_2fl':
        this.buildModernVilla2Story(rawExterior, effectiveBuilding);
        break;
      case 'joglo':
        this.buildNeoVernacularJoglo(rawExterior, effectiveBuilding);
        break;
      case 'cafe_minimalis_kaca':
      case 'cafe_kopi_rasa':
      case 'tropical_cafe':
        this.buildTropicalCafeKopiRasa(rawExterior, effectiveBuilding);
        break;
      case 'resto_mie_gacoan':
      case 'resto_mie_nusantara':
      case 'mie_nusantara':
        this.buildMieNusantaraRestaurant(rawExterior, effectiveBuilding);
        break;
      case 'ruko_3fl':
        this.buildModernShophouse(rawExterior, effectiveBuilding);
        break;
      case 'minimarket':
        this.buildModernRetail(rawExterior, effectiveBuilding);
        break;
      case 'office_tower':
        this.buildModernOfficeTower(rawExterior, effectiveBuilding);
        break;
      case 'apartment':
        this.buildModernApartment(rawExterior, effectiveBuilding);
        break;
      case 'mosque':
        this.buildModernMosque(rawExterior, effectiveBuilding);
        break;
      case 'school':
        this.buildModernSchool(rawExterior, effectiveBuilding);
        break;
      case 'puskesmas':
        this.buildModernPuskesmas(rawExterior, effectiveBuilding);
        break;
      case 'community_hall':
        this.buildModernCommunityHall(rawExterior, effectiveBuilding);
        break;
      default:
        this.buildByArchetype(rawExterior, effectiveBuilding, item);
        break;
    }

    // 1b. Scatter realistic architectural rooftop equipment into rawDetailProps
    const totalFloors = Math.max(1, effectiveBuilding.floorCount || 1);
    const flHeight = effectiveBuilding.floorHeight || 3.8;
    const roofBaseElev = 0.35 + totalFloors * flHeight;
    RoofEquipmentBuilder.scatterRooftopEquipment(
      rawDetailProps,
      effectiveBuilding,
      effectiveBuilding.width,
      effectiveBuilding.length,
      roofBaseElev,
      effectiveBuilding.roofType || 'flat'
    );

    // Foundation skirt belongs to exterior shell (Adaptive Terrain Plinth: 1.5m depth)
    const foundationSkirt = this.buildFoundationSkirt(
      Math.max(effectiveBuilding.width, effSubParts.podium_base.partWidth),
      Math.max(effectiveBuilding.length, effSubParts.podium_base.partDepth),
      1.5,
      effectiveBuilding.wallMaterial === 'brick' ? 'brick' : 'concrete'
    );
    foundationSkirt.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) c.userData.partType = 'podium_base';
    });
    rawExterior.add(foundationSkirt);

    // Extract any facade micro-devices from rawExterior into rawDetailProps
    const detailMeshes: THREE.Object3D[] = [];
    rawExterior.traverse((child) => {
      if (child.userData?.isDetailProp) {
        detailMeshes.push(child);
      }
    });
    for (const d of detailMeshes) {
      if (d.parent) d.parent.remove(d);
      rawDetailProps.add(d);
    }

    // Partition rawExterior into modular sub-parts (podium_base, main_tower, side_wing, roof_crown)
    this.partitionAndCustomizeSubParts(rawExterior, building);

    // 2. Build raw interior details (Only for Floor 1 / Ground Floor to prevent duplicating furniture across upper floors)
    const rawInterior = new THREE.Group();
    const plinthH = 0.35;
    if (building.interiorLayouts && building.interiorLayouts.length > 0) {
      const layout = building.interiorLayouts[0];
      const floorBaseY = plinthH;
      const interiorGroup = InteriorMeshBuilder.buildFloorInterior(
        layout,
        floorBaseY,
        building.floorHeight || 4.2,
        building.id,
        building.archetype || building.presetKey || building.category || 'residential',
        building.position,
        building.userData?.floorMaterial,
        building.userData?.floorColor
      );
      rawInterior.add(interiorGroup);
    }

    // Build real 3D continuous flight of stairs with landings, handrails & elevator shaft
    const { stairGroup, stairZones } = InteriorMeshBuilder.buildBuildingStairwell(building, plinthH);
    rawInterior.add(stairGroup);
    group.userData.stairZones = stairZones;
    building.userData = building.userData || {};
    building.userData.stairZones = stairZones;
    building.stairZones = stairZones;

    if (building.userData?.autoFurnish) {
      const archetype = item?.archetype || 'standard';
      const furnitureSet = TectonicComponents.buildInteriorFurnitureSet(
        archetype,
        building.width,
        building.length,
        building.floorHeight || 4.2,
        building.interiorVariant || 'variant_a'
      );
      rawInterior.add(furnitureSet);
    }

    // 3. Subsurface foundation group: 0 polygons underground, 0 GPU draw calls
    const rawSubsurface = new THREE.Group();

    // 4. Build raw LOD2 massing shell (12-20 triangles)
    const rawLOD2 = this.buildLOD2MassingGroup(building);

    // Consolidate geometries per layer
    const extTemplates = this.optimizeBuildingGroup(rawExterior, 'exterior');
    const detailTemplates = this.optimizeBuildingGroup(rawDetailProps, 'detail_props');
    const intTemplates = this.optimizeBuildingGroup(rawInterior, 'interior');
    const subTemplates = this.optimizeBuildingGroup(rawSubsurface, 'subsurface');
    const lod2Templates = this.optimizeBuildingGroup(rawLOD2, 'lod2_massing');
    const allTemplates = [
      ...extTemplates,
      ...detailTemplates,
      ...intTemplates,
      ...subTemplates,
      ...lod2Templates
    ];
    this.geometryCache.set(cacheKey, allTemplates);

    this.instantiateFromTemplates(group, allTemplates, building);
    this.attachPlacedFurniture(group, building);
    this.attachEntrancePavingPath(group, building);
    this.freezeStaticBuildingMeshes(group);
    return group;
  }

  /**
   * Ultra-low-poly bounding massing shell for LOD2 (> 250m distance).
   * Generates a 12-20 triangle bounding shell with baked facade impostor texture,
   * completely replacing exterior shell, equipment, lot context, and interior.
   */
  public static buildLOD2MassingGroup(building: BuildingInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LOD2MassingGroup';
    const w = building.width || 10;
    const l = building.length || 10;
    const floors = Math.max(1, building.floorCount || 1);
    const flH = building.floorHeight || 3.8;
    const plinthH = 0.35;
    const totalH = plinthH + floors * flH;
    const roofType = building.roofType || 'flat';

    const wallColor = building.wallColor || '#f8fafc';
    const impostorMat = MaterialLibrary.getInstance().getMaterial('impostor_facade', { color: wallColor });
    const roofMat = this.getMaterial(building.roofMaterial || 'clay_tile');

    // 1. Main Massing Box (12 triangles)
    const boxGeo = new THREE.BoxGeometry(w, totalH, l);
    MaterialLibrary.applyWorldScaleUVs(boxGeo, 4.0);
    boxGeo.translate(0, totalH * 0.5, 0);

    const boxMesh = new THREE.Mesh(boxGeo, [
      impostorMat, // +X
      impostorMat, // -X
      roofMat,     // +Y (Roof deck)
      impostorMat, // -Y (Bottom)
      impostorMat, // +Z
      impostorMat, // -Z
    ]);
    boxMesh.castShadow = true;
    boxMesh.receiveShadow = true;
    group.add(boxMesh);

    // 2. Simplified Roof Cap if pitched (4-8 triangles)
    if (roofType !== 'flat') {
      const roofH = Math.min(6, w * 0.35);
      const capGeo = RoofMeshBuilder.buildSimplifiedRoofCap(w, l, roofH, roofType);
      if (capGeo) {
        MaterialLibrary.applyWorldScaleUVs(capGeo, 2.0);
        capGeo.translate(0, totalH, 0);
        const capMesh = new THREE.Mesh(capGeo, roofMat);
        capMesh.castShadow = true;
        capMesh.receiveShadow = true;
        group.add(capMesh);
      }
    }

    return group;
  }

  /**
   * Tahap 2 (T2.5): Freezes static meshes in building hierarchy to prevent per-frame CPU matrix recomputation.
   * Keeps animated objects (doors, fans) dynamic.
   */
  public static freezeStaticBuildingMeshes(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        if (!child.userData?.isAnimated && !child.userData?.isDynamic) {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }
      }
    });
    group.updateMatrix();
    group.updateMatrixWorld(true);
  }

  public static instantiateFromTemplates(
    group: THREE.Group,
    templates: CachedMeshTemplate[],
    building?: Partial<BuildingInstance>
  ): void {
    const exteriorShell = new THREE.Group();
    exteriorShell.name = 'ExteriorShell';

    const effSubParts = this.getEffectiveSubParts((building as any) || {});
    const subPartGroups: Record<BuildingSubPartType, THREE.Group> = {
      podium_base: new THREE.Group(),
      main_tower: new THREE.Group(),
      side_wing: new THREE.Group(),
      roof_crown: new THREE.Group()
    };
    for (const pt of ['podium_base', 'main_tower', 'side_wing', 'roof_crown'] as BuildingSubPartType[]) {
      const sg = subPartGroups[pt];
      sg.name = `SubPart_${pt}`;
      sg.userData = {
        partType: pt,
        buildingId: building?.id ?? group.userData?.buildingId,
        partWidth: effSubParts[pt].partWidth,
        partDepth: effSubParts[pt].partDepth,
        partFloors: effSubParts[pt].partFloors
      };
      exteriorShell.add(sg);
    }

    const detailPropsGroup = new THREE.Group();
    detailPropsGroup.name = 'DetailPropsGroup';

    const interiorDetails = new THREE.Group();
    interiorDetails.name = 'InteriorDetails';

    const subsurfaceFoundation = new THREE.Group();
    subsurfaceFoundation.name = 'SubsurfaceFoundation';
    subsurfaceFoundation.visible = false; // Hidden underground by default until lens/section cut active

    const dynamicFurnitureGroup = new THREE.Group();
    dynamicFurnitureGroup.name = 'DynamicFurnitureGroup';
    dynamicFurnitureGroup.visible = true;
    dynamicFurnitureGroup.frustumCulled = false;
    dynamicFurnitureGroup.userData.isDynamic = true;

    const lod2MassingGroup = new THREE.Group();
    lod2MassingGroup.name = 'LOD2MassingGroup';
    lod2MassingGroup.visible = false; // Hidden by default, only shown at distance >= 250m

    for (const it of templates) {
      const mesh = new THREE.Mesh(it.geometry, it.material);
      const pt: BuildingSubPartType = it.partType || 'main_tower';
      mesh.userData = {
        isSharedGeometry: true,
        layerType: it.layer || 'exterior',
        buildingId: building?.id ?? group.userData?.buildingId,
        ...(it.layer === 'exterior' || !it.layer
          ? {
              partType: pt,
              partWidth: effSubParts[pt].partWidth,
              partDepth: effSubParts[pt].partDepth,
              partFloors: effSubParts[pt].partFloors
            }
          : {})
      };

      // Tahap 2 (T2.5): Freeze static matrix for consolidated non-animated meshes
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();

      if (it.layer === 'interior') {
        mesh.castShadow = false; // Zero shadow map overdraw for indoor furniture
        mesh.receiveShadow = true;
        interiorDetails.add(mesh);
      } else if (it.layer === 'subsurface') {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        subsurfaceFoundation.add(mesh);
      } else if (it.layer === 'detail_props') {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        detailPropsGroup.add(mesh);
      } else if (it.layer === 'lod2_massing') {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        lod2MassingGroup.add(mesh);
      } else {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        subPartGroups[pt].add(mesh);
      }
    }

    group.add(exteriorShell);
    group.add(detailPropsGroup);
    group.add(interiorDetails);
    group.add(dynamicFurnitureGroup);
    group.add(subsurfaceFoundation);
    group.add(lod2MassingGroup);

    group.userData.exteriorShell = exteriorShell;
    group.userData.subPartGroups = subPartGroups;
    group.userData.detailPropsGroup = detailPropsGroup;
    group.userData.interiorDetails = interiorDetails;
    group.userData.subsurfaceFoundation = subsurfaceFoundation;
    group.userData.dynamicFurnitureGroup = dynamicFurnitureGroup;
    group.userData.lod2MassingGroup = lod2MassingGroup;
  }

  /**
   * Dynamically attaches user-placed furniture into the building instance group.
   * This is separated from geometry caching and geometry merging so that placed
   * furniture is always rendered immediately, retains its individual userData/materials,
   * supports raycast hovering and deletion, and registers interactive seats.
   */
  /**
   * Adds ground paving access path from main entrance portal to nearest road / sidewalk.
   */
  public static attachEntrancePavingPath(group: THREE.Group, building: BuildingInstance | any): void {
    if (group.getObjectByName('EntrancePavingPath')) return;

    // Attach authentic lot ground context (commercial parking lot with striping & wheel stops, residential driveway & fence, public plaza)
    LotContextBuilder.attachLotGroundContext(group, building, {
      showParkedVehicles: false, // Strictly OFF by default
      seed: building.userData?.variantSeed,
    });

    // Provide legacy EntrancePavingPath marker for compatibility
    const halfL = (building.length || 10) * 0.5;
    const pathW = Math.min(3.2, Math.max(1.8, (building.width || 10) * 0.35));
    const pathL = 3.6;
    const pathGeo = new THREE.BoxGeometry(pathW, 0.04, pathL);
    const pathMat = MaterialLibrary.getInstance().getMaterial('paving', { color: '#94a3b8' });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.name = 'EntrancePavingPath';
    pathMesh.position.set(0, 0.02, halfL + pathL * 0.5);
    pathMesh.receiveShadow = true;
    pathMesh.visible = false;
    group.add(pathMesh);
  }

  public static attachPlacedFurniture(group: THREE.Group, building: BuildingInstance | any): void {
    const placed = building.userData?.placedFurniture;
    if (!placed || !Array.isArray(placed) || placed.length === 0) return;

    let dynamicGroup = (group.getObjectByName('DynamicFurnitureGroup') || group.userData.dynamicFurnitureGroup) as THREE.Group;
    if (!dynamicGroup) {
      dynamicGroup = new THREE.Group();
      dynamicGroup.name = 'DynamicFurnitureGroup';
      group.add(dynamicGroup);
      group.userData.dynamicFurnitureGroup = dynamicGroup;
    } else if (dynamicGroup.parent !== group) {
      group.add(dynamicGroup);
    }
    dynamicGroup.visible = true;
    dynamicGroup.frustumCulled = false;
    dynamicGroup.matrixAutoUpdate = true;
    dynamicGroup.userData.isDynamic = true;

    const plinthHeight = building.plinthHeight ?? 0.35;

    for (const fur of placed) {
      const existing = dynamicGroup.children.find((c) => c.userData?.furnitureId === fur.id);
      if (existing) {
        dynamicGroup.remove(existing);
      }

      const furMesh = FirstPersonFurnitureBuilder.buildFurniture(fur.type);
      const baseFloorElevation = fur.position[1];
      const accurateY = baseFloorElevation + plinthHeight + 0.01;
      furMesh.position.set(fur.position[0], accurateY, fur.position[2]);
      furMesh.rotation.y = fur.rotationY || 0;
      furMesh.visible = true;
      furMesh.frustumCulled = false;
      furMesh.matrixAutoUpdate = true;
      furMesh.userData = {
        furnitureId: fur.id,
        type: fur.type,
        buildingId: building.id,
        isDynamic: true
      };
      furMesh.traverse((child) => {
        child.visible = true;
        child.frustumCulled = false;
        child.matrixAutoUpdate = true;
        child.userData = {
          ...child.userData,
          furnitureId: fur.id,
          isFurniture: true,
          isDynamic: true,
          type: fur.type,
          buildingId: building.id,
          isSharedGeometry: true,
          isSharedMaterial: true
        };
      });
      dynamicGroup.add(furMesh);

      // Register interactive seats if applicable
      const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === fur.type);
      if (furItem?.isSeat) {
        const rot = building.rotationY || 0;
        const bldPos = building.position || new THREE.Vector3();
        const worldX = bldPos.x + (fur.position[0] * Math.cos(rot) - fur.position[2] * Math.sin(rot));
        const worldZ = bldPos.z + (fur.position[0] * Math.sin(rot) + fur.position[2] * Math.cos(rot));
        const worldY = bldPos.y + accurateY;

        InteriorInteractiveSystem.getInstance().registerSeat({
          id: `seat_${fur.id}`,
          type: (fur.type.includes('sofa') ? 'sofa' : 'chair') as any,
          buildingId: building.id,
          label: furItem.name,
          worldPosition: new THREE.Vector3(worldX, worldY, worldZ),
          facingAngle: (fur.rotationY || 0) + rot,
          floorIndex: fur.floorIndex || 1
        });
      }
    }
  }


  /**
   * Builds an automatic foundation skirt (talud batu candi / beton) beneath the building.
   * Extends downwards from the building plinth into the terrain so that even on sloped ground,
   * the building remains firmly grounded without any floating gap.
   */
  public static buildFoundationSkirt(
    width: number,
    length: number,
    depth: number = 1.5,
    materialName: string = 'concrete'
  ): THREE.Mesh {
    return FacadeMeshBuilder.buildFoundationSkirt(width, length, depth, materialName);
  }

  /**
   * Constructs a real hollow architectural perimeter shell (0.25m thickness)
   * with open walk-through portal so cameras (Drone View & Walk Mode) can enter
   * and intermediate floor slabs with stair/atrium void cutouts.
   */
  public static buildHollowPerimeterShell(
    group: THREE.Group,
    w: number,
    totalH: number,
    l: number,
    baseY: number,
    wallMat: THREE.Material,
    openPortalFront: boolean = true,
    portalW: number = 3.6,
    portalH: number = 3.6,
    floors: number = 1,
    flH: number = 4.2
  ): void {
    FacadeMeshBuilder.buildHollowPerimeterShell(group, w, totalH, l, baseY, wallMat, openPortalFront, portalW, portalH, floors, flH);
  }

  // ==========================================================================
  // 1. RUMAH TIPE 36 (Modern Minimalist Tropical House)
  // Intersecting dual-mass volume, timber slat accent, cantilevered entry canopy
  // ==========================================================================
  private static buildModernHouse36(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const plinthMat = this.getMaterial('stone_plinth');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.4;

    // 1. Andesite Stone Base (0.4m plinth)
    this.addBox(group, w + 0.4, plinthH, l + 0.4, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Hollow Walkable Shell with 2.8m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 2.8, 3.4, 1, h);

    // 3. Cantilevered Entrance Porch Canopy with Warm Teak Soffit & LED Strip
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.4, 2.2, 0.18);
    canopy.position.set(0.2, plinthH + 3.0, l * 0.5 + 1.1);
    group.add(canopy);

    // 4. Tropical Timber Louver Screen on Bedroom Facade
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.35, h * 0.75, 8, 20);
    louver.position.set(w * 0.28, plinthH + h * 0.12, l * 0.5 + 0.05);
    group.add(louver);

    // 5. Floor-to-Ceiling Panoramic Living Window
    this.createWindowAssembly(group, 2.6, 2.4, -w * 0.25, plinthH + 1.25, l * 0.5 + 0.02, frameMat, glassMat, true);

    // 6. Integrated Planter Box with Tropical Greenery
    this.createPlanterBox(group, 2.2, 0.55, 0.65, -w * 0.25, plinthH + 0.28, l * 0.5 + 0.5);

    // 7. Modern Sleek Standing Seam Roof with deep overhang
    const rw = w + 1.4;
    const rl = l + 1.4;
    const roofY = plinthH + h;
    this.buildModernGableRoof(group, rw, rl, roofY, 1.5, zincRoofMat);

    // 8. Facade Equipment & Indonesian Elements
    FacadeMeshBuilder.buildSplitACOutdoor(group, w * 0.5, plinthH + 1.2, -l * 0.2, 1);
    FacadeMeshBuilder.buildDownspoutPipe(group, -w * 0.5 - 0.05, plinthH, plinthH + h, l * 0.5, 1);
    FacadeMeshBuilder.buildElectricMeterPLN(group, w * 0.38, plinthH + 1.6, l * 0.5, 1);
    FacadeMeshBuilder.buildExteriorWallSconce(group, -0.6, plinthH + 2.5, l * 0.5, 1);
  }

  // ==========================================================================
  // 2. RUMAH TIPE 54 (Modern Tropical Villa 1-Floor)
  // Staggered L-shaped volume, covered terrace, sliding glass doors, roof louvers
  // ==========================================================================
  private static buildModernHouse54(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const plinthMat = this.getMaterial('stone_plinth');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.4;
    this.addBox(group, w + 0.5, plinthH, l + 0.5, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Walkable Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 3.2, 3.6, 1, h);

    // 2. Cantilevered Lanai Canopy with Warm Wood Soffit
    const lanaiCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.45, 2.4, 0.2);
    lanaiCanopy.position.set(w * 0.22, plinthH + h * 0.85, l * 0.5 + 1.2);
    group.add(lanaiCanopy);

    // 3. Timber Louver Screen for Privacy
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.35, h * 0.75, 10, 25);
    louver.position.set(-w * 0.25, plinthH + h * 0.12, l * 0.5 + 0.05);
    group.add(louver);

    // 4. Massive Sliding Glass Patio Doors
    this.createWindowAssembly(group, 3.8, 2.6, 0, plinthH + 1.35, l * 0.5 + 0.02, frameMat, glassMat, true);

    // 5. Tropical Planter Garden Along Front Facade
    this.createPlanterBox(group, 3.2, 0.55, 0.7, 0, plinthH + 0.28, l * 0.5 + 0.65);

    // 6. Modern Tropical Hip Roof with wide overhanging eaves
    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernHipRoof(group, rw, rl, plinthH + h, 1.8, zincRoofMat);
  }

  // ==========================================================================
  // 3. RUMAH TROPIS 2 LANTAI (Luxury Modern Tropical Villa)
  // Cantilevered 2nd floor box, glass railing balcony, vertical wood screen, planters
  // ==========================================================================
  private static buildModernVilla2Story(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight;
    const totalH = flH * 2;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const plinthMat = this.getMaterial('stone_plinth');
    const concreteMat = this.getMaterial('concrete_board');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    const plinthH = 0.4;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Multi-Level Shell with 3.4m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.4, 3.6, 2, flH);

    // 2. Floor 1 Modern Cantilever Canopy with Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.45, 2.2, 0.18);
    canopy.position.set(-w * 0.22, plinthH + 3.2, l * 0.5 + 1.1);
    group.add(canopy);

    // 3. Floor 2 Modern Cantilevered Glass Balcony with Hanging Planter
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.48, 1.8);
    balcony.position.set(w * 0.22, plinthH + flH, l * 0.5 + 0.9);
    group.add(balcony);

    // 4. Floor 2 Sun-Shading Timber Louvers
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.42, flH * 0.85, 10, 25);
    louver.position.set(-w * 0.24, plinthH + flH + 0.1, l * 0.5 + 0.05);
    group.add(louver);

    // 5. Floor 1 & 2 Large Window Assemblies
    this.createWindowAssembly(group, 3.6, 2.5, w * 0.18, plinthH + 1.3, l * 0.5 + 0.02, frameMat, glassMat, true);
    this.createWindowAssembly(group, 3.2, 2.4, w * 0.22, plinthH + flH + 1.25, l * 0.5 + 0.02, frameMat, glassMat, true);

    // 6. Roof: Floating Flat Roof Slab with Overhang
    const roofY = plinthH + totalH;
    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernFlatRoofWithOverhang(group, rw, rl, roofY, zincRoofMat, concreteMat);
  }


  // ==========================================================================
  // 4. JOGLO (Masterpiece Contemporary Neo-Vernacular Joglo Yogyakarta)
  // Stepped Andesite plinth, Soko Guru columns with authentic Umpak stone pedestals,
  // column base uplight glow, 4-step front stone stairs, 3D terracotta ridge caps,
  // carved lisplang fascia boards, and front yard monument "JOGLO YOGYAKARTA".
  // ==========================================================================
  private static buildNeoVernacularJoglo(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofTileMat = this.getMaterial('roof_tile');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');

    // Polished Natural Stone Plinth (Multi-tier Stepped Elevation)
    this.addBox(group, w + 1.2, 0.2, l + 1.2, 0, 0.1, 0, plinthMat);
    this.addBox(group, w + 0.6, 0.2, l + 0.6, 0, 0.3, 0, plinthMat);
    const plinthH = 0.4;

    // Wide 4-Step Polished Stone Stairs leading from ground to front veranda
    const stairsW = Math.min(w * 0.45, 6.0);
    const stairs = TectonicComponents.buildStoneStairs(stairsW, 4, 0.10, 0.35);
    stairs.position.set(0, 0, l * 0.5 + 0.6 + 0.7);
    group.add(stairs);

    // Front Yard Monument in Black Candi Stone: "JOGLO YOGYAKARTA"
    const monument = TectonicComponents.buildJogloMonument();
    monument.position.set(-w * 0.38, 0, l * 0.5 + 4.5);
    monument.rotation.y = Math.PI * 0.08;
    group.add(monument);

    // Enclosed Inner Sanctum (Omah Jero / Dalem) in carved teak & glass
    const innerW = w * 0.65;
    const innerL = l * 0.65;
    this.addBox(group, innerW, h * 0.85, innerL, 0, plinthH + (h * 0.85) * 0.5, -l * 0.05, teakMat);

    // Front Sliding Pocket Glass Doors (Seamless modern tropical indoor-outdoor)
    this.createWindowAssembly(group, innerW * 0.7, 2.6, 0, plinthH + 1.35, -l * 0.05 + innerL * 0.5 + 0.02, frameMat, glassMat, true);

    // Soko Guru Central Master Columns with Authentic Stepped Umpak (Batu Candi Hitam) + Uplight Glow
    const sgOffsetW = w * 0.22;
    const sgOffsetL = l * 0.22;
    const sgCoords = [
      [-sgOffsetW, -sgOffsetL],
      [sgOffsetW, -sgOffsetL],
      [-sgOffsetW, sgOffsetL],
      [sgOffsetW, sgOffsetL]
    ];
    for (const [cx, cz] of sgCoords) {
      // Stepped Umpak Base Tier 1 (Lebar bawah)
      this.addBox(group, 0.68, 0.16, 0.68, cx, plinthH + 0.08, cz, plinthMat);
      // Stepped Umpak Base Tier 2 (Atas)
      this.addBox(group, 0.50, 0.14, 0.50, cx, plinthH + 0.23, cz, plinthMat);
      // Soko Guru Teak Pillar resting on Umpak
      this.addCylinder(group, 0.18, 0.18, h * 1.05, cx, plinthH + 0.30 + (h * 1.05) * 0.5, cz, teakMat);
      // Warm Uplight Glow at column base (2700K spot illumination)
      const uplight = TectonicComponents.buildColumnUplightGlow(0.26);
      uplight.position.set(cx, plinthH + 0.31, cz);
      group.add(uplight);
    }

    // Perimeter Colonnade (Soko Rowo) around the open Pendopo veranda + Uplight Glow
    const periCoords = [
      [-w * 0.45, -l * 0.45], [0, -l * 0.45], [w * 0.45, -l * 0.45],
      [-w * 0.45, l * 0.45], [0, l * 0.45], [w * 0.45, l * 0.45],
      [-w * 0.45, 0], [w * 0.45, 0]
    ];
    for (const [cx, cz] of periCoords) {
      this.addBox(group, 0.36, 0.12, 0.36, cx, plinthH + 0.06, cz, plinthMat);
      this.addCylinder(group, 0.12, 0.12, h * 0.8, cx, plinthH + 0.12 + (h * 0.8) * 0.5, cz, teakMat);
      const periUplight = TectonicComponents.buildColumnUplightGlow(0.18);
      periUplight.position.set(cx, plinthH + 0.13, cz);
      group.add(periUplight);
    }

    // True Tiered Joglo Roof: Broad lower Emper + Soaring center Brunjung (Modularized RoofMeshBuilder)
    const roofBaseY = plinthH + h * 0.8;
    const rw = w + 2.4;
    const rl = l + 2.4;
    RoofMeshBuilder.buildJogloRoof(group, rw, rl, roofBaseY, roofTileMat);

    // Nusantara Podium-Tower: When floors > 3, the Joglo remains the grand front entrance podium
    // while behind it rises a modern multi-story tower with reinforced structure and crown
    const floors = Math.max(1, bld.floorCount || 1);
    if (floors > 3) {
      const towerFloors = floors - 2;
      const towerW = w * 0.75;
      const towerL = l * 0.75;
      const towerH = h * towerFloors;
      const towerBaseY = plinthH + h * 1.5;
      const concreteMat = this.getMaterial('concrete');

      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, concreteMat, false, 3.0, 3.0, towerFloors, h);

      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * h;
        const curtain = TectonicComponents.buildMullionCurtainWall(towerW * 0.8, h * 0.7, 4, 2);
        curtain.position.set(0, tfY, towerL * 0.5 + 0.04);
        group.add(curtain);
      }

      const crownY = towerBaseY + towerH;
      const coneCrown = new THREE.ConeGeometry(towerW * 0.35, 2.8, 4);
      coneCrown.rotateY(Math.PI * 0.25);
      coneCrown.translate(0, crownY + 1.4, 0);
      group.add(new THREE.Mesh(coneCrown, roofTileMat));
    }
  }

  // ==========================================================================
  // TROPICAL CAFE "KOPI & RASA" (Modern 1-Storey Cantilever Cafe)
  // Thin black steel fascia, dense vertical teak louvers, crystal clear glass
  // facade, illuminated 3D canopy sign "KOPI & RASA", barista coffee bar,
  // and warm 2700K pendant ceiling illumination.
  // ==========================================================================
  private static buildTropicalCafeKopiRasa(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.8;

    const blackSteelMat = this.getMaterial('dark_aluminum');
    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const floorWoodMat = this.getMaterial('wood', '#b45309');

    // Crystal Clear High-Transmission Glass (opacity 0.22, roughness 0.05, metalness 0.9)
    const ultraGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
      roughness: 0.05,
      metalness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);
    // Polished Teak Interior Flooring
    this.addBox(group, w - 0.2, 0.04, l - 0.2, 0, plinthH + 0.02, 0, floorWoodMat);

    // Rear Solid Wall with wood cladding
    this.addBox(group, w, h, 0.25, 0, plinthH + h * 0.5, -l * 0.5 + 0.125, teakMat);

    // Left & Right Side Walls wrapped in dense vertical teak timber louvers
    const sideLouverL = TectonicComponents.buildTimberLouverScreen(l - 0.6, h, 24, 0, true);
    sideLouverL.rotation.y = Math.PI * 0.5;
    sideLouverL.position.set(-w * 0.5 + 0.1, plinthH, 0);
    group.add(sideLouverL);

    const sideLouverR = TectonicComponents.buildTimberLouverScreen(l - 0.6, h, 24, 0, true);
    sideLouverR.rotation.y = -Math.PI * 0.5;
    sideLouverR.position.set(w * 0.5 - 0.1, plinthH, 0);
    group.add(sideLouverR);

    // Front Facade: High Crystal Clear Panoramic Glass with Minimal Black Steel Mullions (>= 0.06m proud)
    const frontMullions = TectonicComponents.buildMullionCurtainWall(w - 0.2, h, 4, 2, 0.12, blackSteelMat, ultraGlassMat);
    frontMullions.position.set(0, plinthH, l * 0.5);
    group.add(frontMullions);

    // Modern Cantilever Flat Roof with thin black steel fascia
    const roofOverhang = 2.0;
    const rw = w + 1.2;
    const rl = l + roofOverhang;
    const roofY = plinthH + h;
    const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(rw, 0.18, rl), blackSteelMat);
    canopyMesh.position.set(0, roofY + 0.09, roofOverhang * 0.4);
    canopyMesh.castShadow = true;
    group.add(canopyMesh);

    // Cantilever Canopy Underside Teak Soffit
    const soffit = new THREE.Mesh(new THREE.BoxGeometry(rw - 0.1, 0.03, rl - 0.1), teakMat);
    soffit.position.set(0, roofY - 0.015, roofOverhang * 0.4);
    group.add(soffit);

    // Illuminated 3D Signage on Front Canopy: "KOPI & RASA"
    const cafeSign = TectonicComponents.buildIlluminatedSign('KOPI & RASA', 'ARTISANAL TROPICAL ROASTERY', Math.min(rw * 0.5, 4.2), 0.75, 0.12);
    cafeSign.position.set(0, roofY + 0.42, l * 0.5 + roofOverhang * 0.85);
    group.add(cafeSign);

    // --- FULL INTERIOR VISIBLE FROM OUTSIDE ---
    // Central Barista Coffee Bar Counter
    const barW = Math.min(w * 0.45, 4.6);
    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(barW, 1.05, 1.4), this.getMaterial('wood_slat', '#451a03'));
    barCounter.position.set(0, plinthH + 0.525, 0);
    barCounter.castShadow = true;
    group.add(barCounter);

    // Espresso Machine & Coffee Grinder
    const espressoMat = this.getMaterial('metal', '#cbd5e1');
    const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.5), espressoMat);
    espresso.position.set(-barW * 0.25, plinthH + 1.3, 0);
    group.add(espresso);

    // Glass Pastry Case
    const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.55), ultraGlassMat);
    pastryCase.position.set(barW * 0.22, plinthH + 1.28, 0);
    group.add(pastryCase);

    // Bar Stools
    for (let s = -barW * 0.35; s <= barW * 0.35; s += 0.7) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.72, 12), blackSteelMat);
      stool.position.set(s, plinthH + 0.36, 1.1);
      group.add(stool);
    }

    // Cafe Tables and Chairs (Grid layout)
    const tablePositions = [
      [-w * 0.28, -l * 0.22],
      [-w * 0.28, l * 0.22],
      [w * 0.28, -l * 0.22],
      [w * 0.28, l * 0.22]
    ];
    for (const [tx, tz] of tablePositions) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.75, 16), teakMat);
      table.position.set(tx, plinthH + 0.375, tz);
      table.castShadow = true;
      group.add(table);

      // 4 Chairs per table
      for (let a = 0; a < 4; a++) {
        const ang = (a / 4) * Math.PI * 2;
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.78, 0.42), blackSteelMat);
        chair.position.set(tx + Math.cos(ang) * 0.78, plinthH + 0.39, tz + Math.sin(ang) * 0.78);
        group.add(chair);
      }
    }

    // Warm 2700K Pendant Ceiling Lamps Grid
    const warmBulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    for (let px = -w * 0.3; px <= w * 0.3; px += w * 0.3) {
      for (let pz = -l * 0.3; pz <= l * 0.3; pz += l * 0.3) {
        // Pendant shade
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.22, 12), blackSteelMat);
        shade.position.set(px, roofY - 0.4, pz);
        group.add(shade);

        // Glowing bulb
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), warmBulbMat);
        bulb.position.set(px, roofY - 0.45, pz);
        group.add(bulb);
      }
    }
  }

  // ==========================================================================
  // INDUSTRIAL NOODLE RESTAURANT "MIE NUSANTARA" (Modern 2-Storey Industrial)
  // Exposed black steel I-beam frame, vertical louvers + 2-floor full glass,
  // external steel staircase to 2nd floor balcony with glass railing,
  // rooftop & edge planter boxes with cascading greenery, signage "MIE NUSANTARA"
  // + subtext "BOWLS • NOODLES • CULTURE", and fully illuminated dining halls.
  // ==========================================================================
  private static buildMieNusantaraRestaurant(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;
    const totalH = flH * 2;

    const darkIBeamMat = this.getMaterial('dark_aluminum');
    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const concreteMat = this.getMaterial('concrete', '#94a3b8');
    const floorWoodMat = this.getMaterial('wood', '#78350f');

    const ultraGlassMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.24,
      roughness: 0.08,
      metalness: 0.85,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);
    // Floor 1 structural subfloor slab (sits flush beneath interior finished floor, eliminating z-fighting)
    this.addBox(group, w - 0.1, 0.05, l - 0.1, 0, plinthH - 0.025, 0, concreteMat);
    // Floor 2 structural slab
    this.addBox(group, w, 0.22, l, 0, plinthH + flH, 0, concreteMat);

    // 1. Structural Black Steel I-Beam Colonnade Frame (Floor 1 to Roof)
    const colSize = 0.28;
    const colsX = [-w * 0.5 + colSize * 0.5, 0, w * 0.5 - colSize * 0.5];
    const colsZ = [-l * 0.5 + colSize * 0.5, 0, l * 0.5 - colSize * 0.5];
    for (const cx of colsX) {
      for (const cz of colsZ) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(colSize, totalH, colSize), darkIBeamMat);
        col.position.set(cx, plinthH + totalH * 0.5, cz);
        col.castShadow = true;
        group.add(col);
      }
    }

    // 2. Horizontal Perimeter I-Beams (Floor 1 eave, Floor 2 balcony, Roof)
    const beamY1 = plinthH + flH;
    const beamY2 = plinthH + totalH;
    this.addBox(group, w + 0.2, 0.25, 0.25, 0, beamY1, l * 0.5, darkIBeamMat);
    this.addBox(group, w + 0.2, 0.25, 0.25, 0, beamY2, l * 0.5, darkIBeamMat);
    this.addBox(group, 0.25, 0.25, l + 0.2, -w * 0.5, beamY1, 0, darkIBeamMat);
    this.addBox(group, 0.25, 0.25, l + 0.2, w * 0.5, beamY1, 0, darkIBeamMat);

    // 3. Two-Storey Full-Height Panoramic Glass on Front
    const glassFl1 = TectonicComponents.buildMullionCurtainWall(w * 0.75, flH * 0.9, 5, 2, 0.12, darkIBeamMat, ultraGlassMat);
    glassFl1.position.set(-w * 0.1, plinthH, l * 0.5 + 0.02);
    group.add(glassFl1);

    const glassFl2 = TectonicComponents.buildMullionCurtainWall(w * 0.75, flH * 0.9, 5, 2, 0.12, darkIBeamMat, ultraGlassMat);
    glassFl2.position.set(-w * 0.1, plinthH + flH, l * 0.5 + 0.02);
    group.add(glassFl2);

    // 4. Vertical Teak Louver Sun-Shading Screen on Side Facades
    const louverSide = TectonicComponents.buildTimberLouverScreen(l * 0.8, totalH * 0.9, 20, 0, true);
    louverSide.rotation.y = Math.PI * 0.5;
    louverSide.position.set(-w * 0.5 + 0.05, plinthH, 0);
    group.add(louverSide);

    // 5. Floor 2 Balcony with Glass Railing & Black Handrail
    const balcW = w * 0.85;
    const balcD = 1.8;
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(balcW, balcD);
    balcony.position.set(-w * 0.06, plinthH + flH, l * 0.5 + balcD * 0.5);
    group.add(balcony);

    // 6. External Semi-Open Black Steel Staircase (Rising from Ground to Floor 2 Balcony)
    const stairH = flH;
    const stairRun = 4.8;
    const stairs = TectonicComponents.buildExternalSteelStaircase(stairH, 1.3, stairRun);
    stairs.position.set(w * 0.5 + 0.7, plinthH, l * 0.5 - stairRun * 0.5);
    group.add(stairs);

    // 7. Rooftop & Balcony Edge Planter Boxes with Lush Cascading Greenery
    const roofPlanterFront = TectonicComponents.buildRooftopPlanterBox(w * 0.85, 0.6, 0.55);
    roofPlanterFront.position.set(0, plinthH + totalH, l * 0.5);
    group.add(roofPlanterFront);

    const roofPlanterSide = TectonicComponents.buildRooftopPlanterBox(l * 0.7, 0.6, 0.55);
    roofPlanterSide.rotation.y = Math.PI * 0.5;
    roofPlanterSide.position.set(w * 0.5, plinthH + totalH, 0);
    group.add(roofPlanterSide);

    // 8. Architectural Signage on Upper Right Facade: "MIE NUSANTARA" + "BOWLS • NOODLES • CULTURE"
    const noodleSign = TectonicComponents.buildIlluminatedSign(
      'MIE NUSANTARA',
      'BOWLS • NOODLES • CULTURE',
      Math.min(w * 0.55, 4.4),
      1.1,
      0.14
    );
    noodleSign.position.set(w * 0.22, plinthH + totalH - 0.75, l * 0.5 + 0.12);
    group.add(noodleSign);

    // 9. Dining Halls Floor 1 and 2 filled with communal teak tables and warm lighting
    const diningMat = this.getMaterial('wood');
    const benchMat = this.getMaterial('dark_aluminum');

    // Communal Dining Tables on Floor 1
    for (let r = 0; r < 2; r++) {
      const tz = -l * 0.2 + r * 2.8;
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.75, 1.0), diningMat);
      tbl.position.set(-w * 0.1, plinthH + 0.375, tz);
      tbl.castShadow = true;
      group.add(tbl);

      const b1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b1.position.set(-w * 0.1, plinthH + 0.225, tz - 0.75);
      group.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b2.position.set(-w * 0.1, plinthH + 0.225, tz + 0.75);
      group.add(b2);
    }

    // Communal Dining Tables on Floor 2
    for (let r = 0; r < 2; r++) {
      const tz = -l * 0.2 + r * 2.8;
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.75, 1.0), diningMat);
      tbl.position.set(-w * 0.1, plinthH + flH + 0.375, tz);
      tbl.castShadow = true;
      group.add(tbl);

      const b1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b1.position.set(-w * 0.1, plinthH + flH + 0.225, tz - 0.75);
      group.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.45, 0.32), benchMat);
      b2.position.set(-w * 0.1, plinthH + flH + 0.225, tz + 0.75);
      group.add(b2);
    }

    // Warm 2700K Ceiling Illumination Grids on both floors
    const warmBulbMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    for (let f = 0; f < 2; f++) {
      const ceilY = plinthH + (f + 1) * flH - 0.15;
      for (let px = -w * 0.3; px <= w * 0.2; px += w * 0.25) {
        for (let pz = -l * 0.3; pz <= l * 0.3; pz += l * 0.3) {
          const lightBar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.12), warmBulbMat);
          lightBar.position.set(px, ceilY, pz);
          group.add(lightBar);
        }
      }
    }

    // Modern Flat Roof with Parapet
    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + totalH, darkIBeamMat, concreteMat);
  }

  // ==========================================================================
  // 5. RUKO MODERN 3 LANTAI (Contemporary Urban Shophouse Malioboro Arcade)
  // Ground-floor pedestrian arcade setback (kaki lima), front support colonnade,
  // upper cantilevered volume with sun-shading louvers, and residential balcony
  // ==========================================================================
  private static buildModernShophouse(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const flCount = bld.floorCount || 3;
    const totalH = flH * flCount;
    const arcadeSetback = 2.4; // 2.4m covered walkway arcade (kaki lima)

    const plasterMat = this.getMaterial('plaster', '#f1f5f9');
    const concreteMat = this.getMaterial('concrete_board');
    const woodMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');

    // 1. Plinth & Ground Floor Arcade Slab
    const plinthH = 0.35;
    this.addBox(group, w + 0.4, plinthH, l + 0.4, 0, plinthH * 0.5, 0, plinthMat);
    // Arcade walkway floor slab (Walkway paving under arcade)
    this.addBox(group, w, 0.05, arcadeSetback, 0, plinthH + 0.025, l * 0.5 - arcadeSetback * 0.5, concreteMat);

    // Pedestrian Sidewalk Apron (Connecting arcade seamlessly to street with tactile paving)
    const apronL = 4.0;
    const apronZ = l * 0.5 + apronL * 0.5;
    this.addBox(group, w + 0.4, 0.15, apronL, 0, 0.075, apronZ, concreteMat);
    // Tactile yellow guiding tile strip
    this.addBox(group, 0.45, 0.02, apronL, 0, 0.16, apronZ, this.getMaterial('plaster', '#f59e0b'));

    // 2. Hollow Walkable Shell for the 3-story Shophouse with 3.6m wide Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.6, 3.8, flCount, flH);

    // 3. Ground-Floor Arcade Colonnade (Kolom Penyangga Kaki Lima di Tepi Depan)
    const colZ = l * 0.5 - 0.25;
    const colW = 0.4;
    this.addBox(group, colW, flH, colW, -w * 0.42, plinthH + flH * 0.5, colZ, concreteMat);
    this.addBox(group, colW, flH, colW, w * 0.42, plinthH + flH * 0.5, colZ, concreteMat);
    if (w >= 8) {
      this.addBox(group, colW, flH, colW, 0, plinthH + flH * 0.5, colZ, concreteMat);
    }

    // 4. Commercial Mullion Glass Storefront at Ground Floor behind arcade
    const storefront = TectonicComponents.buildMullionCurtainWall(w * 0.85, flH * 0.8, 3, 2, 0.1);
    storefront.position.set(0, plinthH + flH * 0.1, l * 0.5 - arcadeSetback);
    group.add(storefront);

    // Commercial Signage Fascia Band above arcade entrance
    this.addBox(group, w + 0.2, 0.75, 0.3, 0, plinthH + flH - 0.2, l * 0.5 + 0.1, frameMat);
    const signMat = this.getMaterial('storefront_sign', String(bld.id || 0));
    this.addBox(group, w * 0.85, 0.60, 0.04, 0, plinthH + flH - 0.2, l * 0.5 + 0.26, signMat);
    FacadeMeshBuilder.buildDownspoutPipe(group, -w * 0.5 - 0.05, plinthH, plinthH + totalH, l * 0.5, 1);
    FacadeMeshBuilder.buildSplitACOutdoor(group, w * 0.38, plinthH + flH + 1.2, l * 0.5 + 0.05, 1);
    FacadeMeshBuilder.buildElectricMeterPLN(group, -w * 0.42, plinthH + 1.5, l * 0.5 - arcadeSetback + 0.05, 1);
    FacadeMeshBuilder.buildExteriorWallSconce(group, -w * 0.42, plinthH + flH * 0.5, colZ + 0.22, 1);
    FacadeMeshBuilder.buildExteriorWallSconce(group, w * 0.42, plinthH + flH * 0.5, colZ + 0.22, 1);

    // 5. Floor 2: Tropical Timber Louvers
    const louver2 = TectonicComponents.buildTimberLouverScreen(w * 0.8, flH * 0.7, 10, 25);
    louver2.position.set(0, plinthH + flH + flH * 0.15, l * 0.5 + 0.1);
    group.add(louver2);

    // 6. Floor 3: Glass Balcony with Planter Box
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.85, 1.4);
    balcony.position.set(0, plinthH + flH * 2, l * 0.5 + 0.7);
    group.add(balcony);

    // Floor 3 Overhead Sun-Shading Louver Pergola
    const pergolaY = plinthH + totalH - 0.15;
    for (let pz = -0.5; pz <= 0.2; pz += 0.3) {
      this.addBox(group, w * 0.8, 0.08, 0.12, 0, pergolaY, l * 0.5 + pz, woodMat);
    }

    // Modern Parapet Roof with Crisp Coping
    this.buildModernFlatRoofWithOverhang(group, w + 0.4, l + 0.4, plinthH + totalH, frameMat, concreteMat);

    // Rooftop AC Condenser unit and Solar PV frame
    const roofY = plinthH + totalH;
    this.addBox(group, 1.2, 0.8, 0.6, -w * 0.25, roofY + 0.4, -l * 0.2, frameMat);
    this.addBox(group, 2.4, 0.08, 1.6, w * 0.15, roofY + 0.45, -l * 0.15, this.getMaterial('plaster', '#0284c7'));
  }

  // ==========================================================================
  // 6. MINIMARKET LINGKUNGAN (Modern Architectural Retail Store)
  // Full-width glass curtain wall, dark composite fascia, illuminated canopy
  // ==========================================================================
  private static buildModernRetail(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.8;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial('plaster', '#e2e8f0');
    const frameMat = this.getMaterial('frame');
    const woodMat = this.getMaterial('wood_slat');
    const concreteMat = this.getMaterial('concrete_board');

    // Base Plinth
    this.addBox(group, w + 0.5, plinthH, l + 0.5, 0, plinthH * 0.5, 0, concreteMat);

    // Hollow Walkable Shell with 4.0m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 4.0, 4.0, 1, h);

    // Full Curtain Wall Glass Frontage
    const curtainWall = TectonicComponents.buildMullionCurtainWall(w * 0.88, h * 0.75, 4, 2, 0.1);
    curtainWall.position.set(0, plinthH + h * 0.12, l * 0.5 + 0.02);
    group.add(curtainWall);

    // Modern Architectural Fascia Band (Anthracite with warm teak accent stripe)
    this.addBox(group, w + 0.8, 1.1, 0.4, 0, plinthH + h + 0.2, l * 0.5 + 0.2, frameMat);
    this.addBox(group, w + 0.85, 0.22, 0.42, 0, plinthH + h - 0.25, l * 0.5 + 0.21, woodMat);

    // Cantilevered Glass Entry Canopy with Warm Wood Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(4.8, 2.5, 0.2);
    canopy.position.set(0, plinthH + 3.4, l * 0.5 + 1.25);
    group.add(canopy);

    // Modern Signage Totem in front
    const totem = TectonicComponents.buildModernSignageTotem('MINIMARKET', Math.min(2.0, w * 0.4), 4.5);
    totem.position.set(w * 0.42, 0, l * 0.5 + 3.2);
    group.add(totem);

    // Parapet flat roof
    this.buildModernFlatRoofWithOverhang(group, w + 0.4, l + 0.4, plinthH + h + 0.6, frameMat, concreteMat);
  }

  // ==========================================================================
  // 7. GEDUNG KANTOR MODERN (High-End Architectural Glass & Steel Tower)
  // Horizontal ribbon curtain walls, composite spandrels, rooftop terrace pergola
  // ==========================================================================
  private static buildModernOfficeTower(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.8;
    const flCount = bld.floorCount || 5;
    const totalH = flH * flCount;
    const plinthH = 0.4;

    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassRailMat = this.getMaterial('glass_balustrade');

    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, concreteMat);

    // Hollow Walkable Shell with 4.5m wide Double-Height Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, concreteMat, true, 4.5, 4.5, flCount, flH);

    // Core Solid Shaft (Elevator & service spine at rear)
    this.addBox(group, w * 0.35, totalH, l * 0.25, 0, plinthH + totalH * 0.5, -l * 0.32, concreteMat);

    // Full Mullion Curtain Wall ribbons per floor on front and back
    for (let f = 0; f < flCount; f++) {
      const flY = plinthH + f * flH;
      const winH = flH * 0.72;

      const frontWall = TectonicComponents.buildMullionCurtainWall(w * 0.88, winH, 4, 2, 0.08);
      frontWall.position.set(0, flY + flH * 0.15, l * 0.5 + 0.02);
      group.add(frontWall);

      const backWall = TectonicComponents.buildMullionCurtainWall(w * 0.88, winH, 4, 2, 0.08);
      backWall.position.set(0, flY + flH * 0.15, -l * 0.5 - 0.02);
      backWall.rotation.y = Math.PI;
      group.add(backWall);

      // Facade Fin accent
      const fin = TectonicComponents.buildFacadeFin(0.12, flH * 0.9, 0.6);
      fin.position.set(-w * 0.45, flY + flH * 0.5, l * 0.5 + 0.3);
      group.add(fin);
    }

    // Double-Height Grand Entrance Canopy with Warm Wood Soffit
    const canopyW = w * 0.6;
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(canopyW, 3.4, 0.25);
    canopy.position.set(0, plinthH + 4.2, l * 0.5 + 1.7);
    group.add(canopy);

    // Rooftop Executive Terrace with Metal Pergola & Planters
    const roofBaseY = plinthH + totalH;
    this.addBox(group, w, 0.35, l, 0, roofBaseY + 0.175, 0, concreteMat);
    // Perimeter glass parapet
    this.addBox(group, w, 1.1, 0.04, 0, roofBaseY + 0.9, l * 0.5 - 0.05, glassRailMat);
    this.addBox(group, w, 1.1, 0.04, 0, roofBaseY + 0.9, -l * 0.5 + 0.05, glassRailMat);

    // Architectural Pergola on roof
    for (let p = -w * 0.3; p <= w * 0.3; p += 1.4) {
      this.addBox(group, 0.12, 0.18, l * 0.55, p, roofBaseY + 2.6, 0, frameMat);
    }
  }

  // ==========================================================================
  // SKYSCRAPERS (Up to 18 Floors High-Rise Architecture)
  // ==========================================================================

  /**
   * 1. Menara Perkantoran Kaca Nusantara (18 Lantai)
   * Podium lobi 3 lantai + menara curtain wall kaca ber-sirip peneduh matahari + mahkota atap & helipad
   */
  private static buildSkyscraperOfficeTower(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 3.8;
    const floors = Math.max(3, bld.floorCount || 18);

    const darkMat = this.getMaterial('concrete', '#0f172a');
    const concreteMat = this.getMaterial('concrete', '#334155');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');
    const goldMat = this.getMaterial('brand_gold');
    const whiteMat = this.getMaterial('plaster', '#f8fafc');

    const plinthH = 0.4;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Grand 3-Floor Podium Lobby with 5.0m Open Portal
    const podiumFloors = Math.min(3, Math.max(1, Math.floor(floors * 0.2)));
    const podiumH = flH * podiumFloors;
    this.buildHollowPerimeterShell(group, w, podiumH, l, plinthH, darkMat, true, 5.0, 4.5, podiumFloors, flH);

    // Grand Entrance Cantilever Canopy with Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.6, 3.8, 0.3);
    canopy.position.set(0, plinthH + 4.2, l * 0.5 + 1.9);
    group.add(canopy);

    // 2. Tower Body with 0.8m Setback and Curtain Wall
    const towerFloors = floors - podiumFloors;
    if (towerFloors > 0) {
      const setback = 0.8;
      const towerW = Math.max(8, w - setback * 2);
      const towerL = Math.max(8, l - setback * 2);
      const towerH = flH * towerFloors;
      const towerBaseY = plinthH + podiumH;

      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, concreteMat, false, 3.0, 3.0, towerFloors, flH);

      // Ribbon Curtain Walls & Sun Louvers on facades
      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * flH;
        const curtainFront = TectonicComponents.buildMullionCurtainWall(towerW * 0.85, flH * 0.75, 6, 2);
        curtainFront.position.set(0, tfY, towerL * 0.5 + 0.04);
        group.add(curtainFront);

        const curtainRear = TectonicComponents.buildMullionCurtainWall(towerW * 0.85, flH * 0.75, 6, 2);
        curtainRear.position.set(0, tfY, -towerL * 0.5 - 0.04);
        curtainRear.rotation.y = Math.PI;
        group.add(curtainRear);

        // Vertical Sun Shading Fins (every 2 floors)
        if (tf % 2 === 0) {
          const finCount = 5;
          const finSpacing = towerW / (finCount + 1);
          for (let f = 1; f <= finCount; f++) {
            const fx = -towerW * 0.5 + f * finSpacing;
            this.addBox(group, 0.08, flH * 0.85, 0.45, fx, tfY + flH * 0.425, towerL * 0.5 + 0.25, goldMat);
            this.addBox(group, 0.08, flH * 0.85, 0.45, fx, tfY + flH * 0.425, -towerL * 0.5 - 0.25, goldMat);
          }
        }
      }

      // 3. Roof Crown Penthouse & Helipad
      const roofY = towerBaseY + towerH;
      this.buildModernFlatRoofWithOverhang(group, towerW + 0.6, towerL + 0.6, roofY, frameMat, darkMat);

      // Elevator Penthouse Core
      const pentW = towerW * 0.35;
      const pentL = towerL * 0.35;
      const pentH = 3.6;
      this.addBox(group, pentW, pentH, pentL, 0, roofY + pentH * 0.5, 0, darkMat);

      // Helipad Landing Platform
      const heliSize = Math.min(towerW * 0.6, 14.0);
      const heliBase = new THREE.Mesh(new THREE.CylinderGeometry(heliSize * 0.5, heliSize * 0.5, 0.25, 32), concreteMat);
      heliBase.position.set(0, roofY + 0.15, 0);
      group.add(heliBase);

      // Helipad Ring & "H" Marking
      const heliRing = new THREE.Mesh(new THREE.RingGeometry(heliSize * 0.42, heliSize * 0.46, 32), whiteMat);
      heliRing.rotation.x = -Math.PI * 0.5;
      heliRing.position.set(0, roofY + 0.29, 0);
      group.add(heliRing);

      this.addBox(group, 0.4, 0.02, 3.2, -1.2, roofY + 0.29, 0, whiteMat);
      this.addBox(group, 0.4, 0.02, 3.2, 1.2, roofY + 0.29, 0, whiteMat);
      this.addBox(group, 2.0, 0.02, 0.4, 0, roofY + 0.29, 0, whiteMat);

      // Perimeter safety beacons
      const beaconMat = this.getMaterial('warm_light');
      for (let b = 0; b < 8; b++) {
        const ang = (b / 8) * Math.PI * 2;
        const bx = Math.cos(ang) * (heliSize * 0.46);
        const bz = Math.sin(ang) * (heliSize * 0.46);
        this.addBox(group, 0.15, 0.25, 0.15, bx, roofY + 0.35, bz, beaconMat);
      }
    }
  }

  /**
   * 2. Apartemen Menara Hijau Tropis (18 Lantai)
   * Menara hunian vertikal dengan balkon tanaman gantung dan sky terrace hijau di setiap kelipatan 3 lantai
   */
  private static buildSkyscraperGreenApartment(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 3.4;
    const floors = Math.max(3, bld.floorCount || 16);

    const whiteMat = this.getMaterial('plaster', '#f8fafc');
    const woodMat = this.getMaterial('wood_slat', '#78350f');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');
    const foliageMat = this.getMaterial('foliage');

    const plinthH = 0.4;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // 2-Floor Podium with Open Portal
    const podiumFloors = 2;
    const podiumH = flH * podiumFloors;
    this.buildHollowPerimeterShell(group, w, podiumH, l, plinthH, whiteMat, true, 4.2, 4.0, podiumFloors, flH);

    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.5, 3.0, 0.25);
    canopy.position.set(0, plinthH + 3.8, l * 0.5 + 1.5);
    group.add(canopy);

    // Residential Tower
    const towerFloors = floors - podiumFloors;
    if (towerFloors > 0) {
      const setback = 0.8;
      const towerW = Math.max(8, w - setback * 2);
      const towerL = Math.max(8, l - setback * 2);
      const towerH = flH * towerFloors;
      const towerBaseY = plinthH + podiumH;

      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, whiteMat, false, 3.0, 3.0, towerFloors, flH);

      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * flH;
        const isSkyTerrace = (tf + 1) % 3 === 0;
        const balcDepth = isSkyTerrace ? 2.4 : 1.4;
        const balcW = towerW * 0.75;

        const balc = TectonicComponents.buildGlassBalconyWithPlanter(balcW, balcDepth);
        balc.position.set(0, tfY, towerL * 0.5 + balcDepth * 0.5);
        group.add(balc);

        if (isSkyTerrace) {
          const planterBox = new THREE.Mesh(new THREE.BoxGeometry(balcW * 0.9, 0.6, 0.6), woodMat);
          planterBox.position.set(0, tfY + 0.3, towerL * 0.5 + balcDepth * 0.8);
          group.add(planterBox);

          const shrub = new THREE.Mesh(new THREE.BoxGeometry(balcW * 0.85, 0.7, 0.5), foliageMat);
          shrub.position.set(0, tfY + 0.8, towerL * 0.5 + balcDepth * 0.8);
          group.add(shrub);
        }
      }

      // Rooftop Penthouse & Garden Terrace
      const roofY = towerBaseY + towerH;
      this.buildModernFlatRoofWithOverhang(group, towerW + 0.6, towerL + 0.6, roofY, frameMat, whiteMat);

      const coreW = towerW * 0.35;
      const coreL = towerL * 0.35;
      this.addBox(group, coreW, 3.2, coreL, 0, roofY + 1.6, 0, whiteMat);

      const pergola = TectonicComponents.buildTimberLouverScreen(towerW * 0.4, 2.8, 6, 0.15);
      pergola.position.set(towerW * 0.25, roofY, 0);
      group.add(pergola);
    }
  }

  /**
   * 3. Menara Hotel & Konvensi Bintang 5 (18 Lantai)
   * Podium drop-off pendopo modern dengan menara kamar panorama dan fasilitas konvensi internasional
   */
  private static buildSkyscraperGrandHotel(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 3.6;
    const floors = Math.max(3, bld.floorCount || 15);

    const ivoryMat = this.getMaterial('plaster', '#ffffff');
    const darkWoodMat = this.getMaterial('wood_slat', '#451a03');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');
    const waterMat = this.getMaterial('water');
    const goldMat = this.getMaterial('brand_gold');

    const plinthH = 0.4;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // Grand Modern Pendopo Drop-off Podium
    const podiumFloors = 2;
    const podiumH = flH * podiumFloors;
    this.buildHollowPerimeterShell(group, w, podiumH, l, plinthH, ivoryMat, true, 5.5, 4.5, podiumFloors, flH);

    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.65, 4.5, 0.35);
    canopy.position.set(0, plinthH + 4.5, l * 0.5 + 2.2);
    group.add(canopy);

    for (let c = -1; c <= 1; c += 2) {
      this.addBox(group, 0.5, 0.2, 0.5, c * (w * 0.25), plinthH + 0.1, l * 0.5 + 4.0, plinthMat);
      this.addCylinder(group, 0.2, 0.2, 4.2, c * (w * 0.25), plinthH + 2.3, l * 0.5 + 4.0, darkWoodMat);
    }

    // Panoramic Tower
    const towerFloors = floors - podiumFloors;
    if (towerFloors > 0) {
      const setback = 0.8;
      const towerW = Math.max(8, w - setback * 2);
      const towerL = Math.max(8, l - setback * 2);
      const towerH = flH * towerFloors;
      const towerBaseY = plinthH + podiumH;

      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, ivoryMat, false, 3.0, 3.0, towerFloors, flH);

      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * flH;
        const balcFront = TectonicComponents.buildGlassBalconyWithPlanter(towerW * 0.8, 1.2);
        balcFront.position.set(0, tfY, towerL * 0.5 + 0.6);
        group.add(balcFront);

        const balcRear = TectonicComponents.buildGlassBalconyWithPlanter(towerW * 0.8, 1.2);
        balcRear.position.set(0, tfY, -towerL * 0.5 - 0.6);
        balcRear.rotation.y = Math.PI;
        group.add(balcRear);
      }

      // Rooftop Crown with Infinity Pool Lounge
      const roofY = towerBaseY + towerH;
      this.buildModernFlatRoofWithOverhang(group, towerW + 0.8, towerL + 0.8, roofY, frameMat, ivoryMat);

      const poolW = towerW * 0.45;
      const poolL = towerL * 0.35;
      this.addBox(group, poolW, 0.5, poolL, -towerW * 0.2, roofY + 0.25, 0, plinthMat);
      const poolWater = new THREE.Mesh(new THREE.BoxGeometry(poolW - 0.2, 0.05, poolL - 0.2), waterMat);
      poolWater.position.set(-towerW * 0.2, roofY + 0.48, 0);
      group.add(poolWater);

      const pentW = towerW * 0.3;
      const pentL = towerL * 0.3;
      this.addBox(group, pentW, 3.4, pentL, towerW * 0.25, roofY + 1.7, 0, ivoryMat);
      this.addBox(group, towerW * 0.85, 0.15, towerL * 0.85, 0, roofY + 3.4, 0, goldMat);
    }
  }

  /**
   * 4. Menara Terpadu Ritel & Kantor (18 Lantai)
   * Lantai 1-4 atrium mall perbelanjaan terpadu dan lantai 5-18 menara perkantoran modern
   */
  private static buildSkyscraperMixedUse(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.0;
    const floors = Math.max(4, bld.floorCount || 18);

    const darkMat = this.getMaterial('concrete', '#0f172a');
    const lightMat = this.getMaterial('concrete', '#e2e8f0');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.4;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // Floors 1-4: Grand Mall Atrium Podium with Retail Vitrines
    const podiumFloors = Math.min(4, Math.max(2, Math.floor(floors * 0.25)));
    const podiumH = flH * podiumFloors;
    this.buildHollowPerimeterShell(group, w, podiumH, l, plinthH, darkMat, true, 6.0, 4.8, podiumFloors, flH);

    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.65, 4.0, 0.35);
    canopy.position.set(0, plinthH + 4.8, l * 0.5 + 2.0);
    group.add(canopy);

    for (let pf = 1; pf < podiumFloors; pf++) {
      const pfY = plinthH + pf * flH;
      const vitrine = TectonicComponents.buildMullionCurtainWall(w * 0.8, flH * 0.8, 8, 2);
      vitrine.position.set(0, pfY, l * 0.5 + 0.05);
      group.add(vitrine);
    }

    // Floors 5-18: Sleek Commercial Office Tower
    const towerFloors = floors - podiumFloors;
    if (towerFloors > 0) {
      const setback = 1.0;
      const towerW = Math.max(8, w - setback * 2);
      const towerL = Math.max(8, l - setback * 2);
      const towerH = flH * towerFloors;
      const towerBaseY = plinthH + podiumH;

      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, lightMat, false, 3.0, 3.0, towerFloors, flH);

      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * flH;
        const curtain = TectonicComponents.buildMullionCurtainWall(towerW * 0.85, flH * 0.72, 6, 2);
        curtain.position.set(0, tfY, towerL * 0.5 + 0.05);
        group.add(curtain);

        const curtainRear = TectonicComponents.buildMullionCurtainWall(towerW * 0.85, flH * 0.72, 6, 2);
        curtainRear.position.set(0, tfY, -towerL * 0.5 - 0.05);
        curtainRear.rotation.y = Math.PI;
        group.add(curtainRear);
      }

      const roofY = towerBaseY + towerH;
      this.buildModernFlatRoofWithOverhang(group, towerW + 0.8, towerL + 0.8, roofY, frameMat, darkMat);

      const coreW = towerW * 0.35;
      const coreL = towerL * 0.35;
      this.addBox(group, coreW, 3.8, coreL, 0, roofY + 1.9, 0, darkMat);
      this.addBox(group, towerW * 0.9, 0.2, towerL * 0.9, 0, roofY + 3.8, 0, frameMat);
    }
  }

  // ==========================================================================
  // 8. APARTEMEN MENENGAH (Modern Urban Vertical Residence)
  // Articulated modular facade, individual recessed balconies, timber accents
  // ==========================================================================
  private static buildModernApartment(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const flCount = bld.floorCount || 4;
    const totalH = flH * flCount;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, concreteMat);

    // Hollow Walkable Shell with 4.0m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 4.0, 3.8, flCount, flH);

    // Balconies with Planters on every upper floor for multiple residential units
    const bays = 3;
    const baySpacing = w / bays;

    for (let f = 1; f < flCount; f++) {
      const flY = plinthH + f * flH;

      for (let b = 0; b < bays; b++) {
        const bayX = -w * 0.5 + baySpacing * (b + 0.5);
        const balcony = TectonicComponents.buildGlassBalconyWithPlanter(baySpacing * 0.8, 1.5);
        balcony.position.set(bayX, flY, l * 0.5 + 0.75);
        group.add(balcony);
      }
    }

    // Ground Floor Entrance Portico Canopy
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(4.5, 2.5, 0.2);
    canopy.position.set(0, plinthH + 3.4, l * 0.5 + 1.25);
    group.add(canopy);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // 9. MASJID TROPIS (Contemporary Tropical Mosque)
  // Perforated breeze-block screens, colonnade, ribbed emerald & brass dome
  // ==========================================================================
  private static buildModernMosque(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.5;
    const plinthH = 0.4;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const plinthMat = this.getMaterial('stone_plinth');

    this.addBox(group, w + 1.4, plinthH, l + 1.4, 0, plinthH * 0.5, 0, plinthMat);

    // Main Prayer Hall: Hollow Walkable Shell with 4.5m Grand Open Entrance Portal
    const hallW = w * 0.82;
    const hallL = l * 0.82;
    this.buildHollowPerimeterShell(group, hallW, h, hallL, plinthH, plasterMat, true, 4.5, 4.2, 1, h);

    // Perimeter Shade Colonnade (slender square columns with architrave)
    const colSpacing = 3.5;
    const halfW = w * 0.48;
    const halfL = l * 0.48;
    for (let x = -halfW; x <= halfW; x += colSpacing) {
      this.addCylinder(group, 0.16, 0.16, h, x, plinthH + h * 0.5, halfL, plasterMat);
      this.addCylinder(group, 0.16, 0.16, h, x, plinthH + h * 0.5, -halfL, plasterMat);
    }

    // Deep shade roof overhang above colonnade with warm wood soffit
    this.addBox(group, w + 0.8, 0.3, l + 0.8, 0, plinthH + h + 0.15, 0, plasterMat);

    // Perforated breeze-block / roster walls on sides for sacred daylight filtration
    const rosterLeft = TectonicComponents.buildPerforatedRosterWall(hallL * 0.6, h * 0.65);
    rosterLeft.rotation.y = Math.PI * 0.5;
    rosterLeft.position.set(-hallW * 0.5 - 0.05, plinthH + h * 0.18, 0);
    group.add(rosterLeft);

    const rosterRight = TectonicComponents.buildPerforatedRosterWall(hallL * 0.6, h * 0.65);
    rosterRight.rotation.y = -Math.PI * 0.5;
    rosterRight.position.set(hallW * 0.5 + 0.05, plinthH + h * 0.18, 0);
    group.add(rosterRight);

    // Grand Entrance Canopy
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(5.2, 2.8, 0.25);
    canopy.position.set(0, plinthH + 4.2, hallL * 0.5 + 1.4);
    group.add(canopy);

    // Soaring Modern Emerald & Brass Ribbed Dome
    const domeR = Math.min(w, l) * 0.35;
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x059669, // Emerald green
      roughness: 0.25,
      metalness: 0.55
    });
    const domeGeom = new THREE.SphereGeometry(domeR, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5);
    domeGeom.translate(0, plinthH + h + 0.3, 0);
    const domeMesh = new THREE.Mesh(domeGeom, domeMat);
    domeMesh.castShadow = true;
    group.add(domeMesh);

    // Crescent Brass Finial
    this.addCylinder(group, 0.06, 0.06, 1.8, 0, plinthH + h + 0.3 + domeR + 0.9, 0, this.getMaterial('plaster', '#fbbf24'));
  }

  // ==========================================================================
  // 10. SEKOLAH DASAR (Modern Tropical Campus)
  // Single-loaded open breezeway corridors, sun louvers, cheerful architectural accents
  // ==========================================================================
  private static buildModernSchool(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const totalH = flH * 2;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial('plaster', '#ffffff');
    const concreteMat = this.getMaterial('concrete_board');
    const zincRoofMat = this.getMaterial('zinc_roof');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, concreteMat);

    // Classroom Wings: Hollow Walkable Shell with Open Portal
    this.buildHollowPerimeterShell(group, w * 0.75, totalH, l, plinthH, plasterMat, true, 3.6, 3.6, 2, flH);

    // Open Breezeway Corridors with Slender Pillars
    const colSpacing = 4.0;
    for (let z = -l * 0.45; z <= l * 0.45; z += colSpacing) {
      this.addCylinder(group, 0.14, 0.14, totalH, w * 0.42, plinthH + totalH * 0.5, z, frameMat);
    }
    // Floor 2 open corridor slab
    this.addBox(group, w * 0.35, 0.25, l, w * 0.32, plinthH + flH + 0.125, 0, concreteMat);
    this.addBox(group, 0.05, 1.1, l, w * 0.45, plinthH + flH + 0.75, 0, frameMat);

    // Sun Louvers on Classrooms
    const louverScreen = TectonicComponents.buildTimberLouverScreen(l * 0.7, flH * 0.6, 12, 30);
    louverScreen.rotation.y = Math.PI * 0.5;
    louverScreen.position.set(-w * 0.38, plinthH + flH + flH * 0.2, 0);
    group.add(louverScreen);

    // Wide Overhanging Eaves Roof
    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernGableRoof(group, rw, rl, plinthH + totalH, 1.8, zincRoofMat);
  }

  // ==========================================================================
  // 11. PUSKESMAS (Modern Healthcare Center)
  // Emergency drop-off portico, clean hygienic white & sage massing, ribbon windows
  // ==========================================================================
  private static buildModernPuskesmas(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;
    const totalH = flH * 2;
    const plinthH = 0.35;

    const whiteMat = this.getMaterial('plaster', '#ffffff');
    const sageMat = this.getMaterial('plaster', '#d1fae5'); // Calm hygienic sage green
    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, concreteMat);

    // Main Medical Clinic: Hollow Walkable Shell with 4.0m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, whiteMat, true, 4.0, 4.0, 2, flH);

    // Sage Green Accent Block
    this.addBox(group, w * 0.45, totalH * 0.95, 0.25, -w * 0.25, plinthH + totalH * 0.475, l * 0.5 + 0.1, sageMat);

    // Covered Ambulance / Drop-Off Portico with Warm Wood Soffit & LED Lighting
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(5.5, 3.8, 0.25);
    canopy.position.set(w * 0.15, plinthH + 3.8, l * 0.5 + 1.9);
    group.add(canopy);

    // Column support for portico
    this.addCylinder(group, 0.14, 0.14, 3.8, w * 0.15 + 2.4, plinthH + 1.9, l * 0.5 + 3.6, frameMat);
    this.addCylinder(group, 0.14, 0.14, 3.8, w * 0.15 - 2.4, plinthH + 1.9, l * 0.5 + 3.6, frameMat);

    // Ribbon Curtain Wall
    const ribbonWall = TectonicComponents.buildMullionCurtainWall(w * 0.75, flH * 0.6, 4, 1, 0.08);
    ribbonWall.position.set(0, plinthH + flH + flH * 0.2, l * 0.5 + 0.02);
    group.add(ribbonWall);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // 12. BALAI WARGA (Modern Open Pavilion / Pendopo)
  // Lofty open-air design, timber structural trusses, stone plinth
  // ==========================================================================
  private static buildModernCommunityHall(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight;

    const teakMat = this.getMaterial('wood_slat');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('zinc_roof');

    // Raised Stone Plinth with perimeter steps
    this.addBox(group, w + 1.4, 0.4, l + 1.4, 0, 0.2, 0, plinthMat);

    // Open Perimeter Columns
    const spacingW = w * 0.45;
    const spacingL = l * 0.45;
    const colCoords = [
      [-spacingW, -spacingL], [0, -spacingL], [spacingW, -spacingL],
      [-spacingW, spacingL], [0, spacingL], [spacingW, spacingL],
      [-spacingW, 0], [spacingW, 0]
    ];
    for (const [cx, cz] of colCoords) {
      this.addCylinder(group, 0.16, 0.16, h, cx, 0.4 + h * 0.5, cz, teakMat);
    }

    // Exposed Wooden Structural Trusses under roof
    for (let z = -l * 0.35; z <= l * 0.35; z += 3.0) {
      this.addBox(group, w * 0.85, 0.18, 0.12, 0, 0.4 + h - 0.1, z, teakMat);
    }

    // Lofty Modern Tropical Hip Roof
    const rw = w + 2.2;
    const rl = l + 2.2;
    this.buildModernHipRoof(group, rw, rl, 0.4 + h, 2.2, roofMat);
  }

  // ==========================================================================
  // 13. GENERIC FALLBACK (High-End Modern Articulated Building)
  // ==========================================================================
  private static buildGenericModernBuilding(group: THREE.Group, bld: BuildingInstance): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const flCount = bld.floorCount || 1;
    const totalH = flH * flCount;
    const plinthH = 0.35;

    const plasterMat = this.getMaterial(bld.wallMaterial, bld.wallColor);
    const concreteMat = this.getMaterial('concrete_board');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');

    this.addBox(group, w + 0.4, plinthH, l + 0.4, 0, plinthH * 0.5, 0, plinthMat);

    // Hollow Walkable Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.2, 3.8, flCount, flH);

    // Modern Entrance Canopy
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.8, 2.2, 0.18);
    canopy.position.set(0, plinthH + 3.2, l * 0.5 + 1.1);
    group.add(canopy);

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, concreteMat);
  }

  // ==========================================================================
  // REUSABLE ARCHITECTURAL DETAILING HELPERS
  // ==========================================================================

  /**
   * Complete Window Assembly with crisp slim frame, glass, and optional louvers
   */
  private static createWindowAssembly(
    group: THREE.Group,
    w: number,
    h: number,
    posX: number,
    posY: number,
    posZ: number,
    frameMat: THREE.Material,
    glassMat: THREE.Material,
    isFloorToCeiling: boolean = false,
    hasLouvers: boolean = false
  ): void {
    FacadeMeshBuilder.createWindowAssembly(group, w, h, posX, posY, posZ, frameMat, glassMat, isFloorToCeiling, hasLouvers);
  }

  /**
   * Integrated Concrete Planter Box with Lush Tropical Greenery
   */
  private static createPlanterBox(
    group: THREE.Group,
    w: number,
    h: number,
    depth: number,
    posX: number,
    posY: number,
    posZ: number
  ): void {
    const concreteMat = this.getMaterial('concrete_board', '#64748b');
    const foliageMat = this.getMaterial('foliage');

    // Concrete trough container
    this.addBox(group, w, h, depth, posX, posY, posZ, concreteMat);

    // Lush organic tropical foliage bush spilling over top
    const plantGeom = new THREE.DodecahedronGeometry(w * 0.22, 1);
    plantGeom.scale(w / (w * 0.44), 0.6, depth / (depth * 0.44));
    const plantMesh = new THREE.Mesh(plantGeom, foliageMat);
    plantMesh.position.set(posX, posY + h * 0.5 + 0.15, posZ);
    plantMesh.castShadow = true;
    group.add(plantMesh);
  }

  /**
   * Modern Clean Flat Roof with Deep Cantilevered Overhang & Fascia Band
   */
  private static buildModernFlatRoofWithOverhang(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    fasciaMat: THREE.Material,
    slabMat: THREE.Material
  ): void {
    RoofMeshBuilder.buildFlatRoofWithOverhang(group, rw, rl, baseY, fasciaMat, slabMat);
  }

  /**
   * Modern Crisp Gable Roof (Pelana) with 3D Ridge Caps, Fascia Boards & World-Scale UVs
   */
  private static buildModernGableRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    RoofMeshBuilder.buildGableRoof(group, rw, rl, baseY, roofH, roofMat);
  }

  /**
   * Modern Tropical Hip Roof (Limasan) with 3D Ridge Caps, Hip Caps, Fascia Boards & World-Scale UVs
   */
  private static buildModernHipRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    RoofMeshBuilder.buildLimasanRoof(group, rw, rl, baseY, roofH, roofMat);
  }

  // ==========================================================================
  // PARAMETRIC ARCHETYPE DISPATCHER & COMPOSERS
  // ==========================================================================
  private static buildByArchetype(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const archetype = item?.archetype || 'standard';

    switch (archetype) {
      case 'gacoan_industrial_hall':
        this.buildGacoanIndustrialHall(group, bld, item);
        break;
      case 'burger_drivethru':
        this.buildBurgerDriveThru(group, bld, item);
        break;
      case 'cafe_glasshouse':
        this.buildCafeGlasshouse(group, bld, item);
        break;
      case 'cafe_rooftop':
        this.buildCafeRooftop(group, bld, item);
        break;
      case 'cafe_container':
        this.buildCafeContainer(group, bld, item);
        break;
      case 'cafe_courtyard':
        this.buildCafeCourtyard(group, bld, item);
        break;
      case 'mall_atrium':
        this.buildMallAtrium(group, bld, item);
        break;
      case 'mall_open_plaza':
        this.buildMallOpenPlaza(group, bld, item);
        break;
      case 'courtyard_block':
        this.buildCourtyardBlock(group, bld, item);
        break;
      case 'podium_tower':
        this.buildPodiumTower(group, bld, item);
        break;
      case 'arcade_shophouse':
        this.buildArcadeShophouse(group, bld, item);
        break;
      case 'pendopo_open':
        this.buildPendopoOpen(group, bld, item);
        break;
      case 'stilted_house':
        this.buildStiltedHouse(group, bld, item);
        break;
      case 'transit_canopy':
        this.buildTransitCanopy(group, bld, item);
        break;
      case 'telecom_tower':
        this.buildTelecomTower(group, bld, item);
        break;
      case 'monument_obelisk':
        this.buildMonumentObelisk(group, bld, item);
        break;
      case 'stadium_arena':
        this.buildStadiumArena(group, bld, item);
        break;
      case 'bridge_girder':
        this.buildBridgeGirder(group, bld, item);
        break;
      case 'flyover_viaduct':
        this.buildFlyoverViaduct(group, bld, item);
        break;
      case 'substation_power':
        this.buildSubstationPower(group, bld, item);
        break;
      case 'water_clarifier':
        this.buildWaterClarifier(group, bld, item);
        break;
      case 'sacred_temple':
        this.buildSacredTemple(group, bld, item);
        break;
      case 'cathedral_church':
        this.buildCathedralChurch(group, bld, item);
        break;
      case 'vihara_pagoda':
        this.buildViharaPagoda(group, bld, item);
        break;
      case 'klenteng_traditional':
        this.buildKlentengTraditional(group, bld, item);
        break;
      case 'standard':
      default:
        this.buildParametricStandardBuilding(group, bld, item);
        break;
    }
  }

  // 1. GACOAN INDUSTRIAL HALL (Double-Volume Exposed Steel Hall, Asymmetric Roof, Facade Fins)
  private static buildGacoanIndustrialHall(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.5;

    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('zinc_roof');
    const yellowMat = this.getMaterial('plaster', '#eab308');
    const redMat = this.getMaterial('plaster', '#ef4444');
    const darkWallMat = this.getMaterial('plaster', '#1e293b');
    const woodMat = this.getMaterial('wood');

    // 1. Raised Stone Plinth Base
    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Perimeter Structural Steel Columns (Double-height industrial frame)
    const colSize = 0.28;
    const colCountX = Math.max(4, Math.round(w / 4));
    const colCountZ = Math.max(4, Math.round(l / 4));
    const stepX = (w - colSize) / (colCountX - 1);
    const stepZ = (l - colSize) / (colCountZ - 1);

    for (let ix = 0; ix < colCountX; ix++) {
      const cx = -w * 0.5 + colSize * 0.5 + ix * stepX;
      this.addBox(group, colSize, h, colSize, cx, plinthH + h * 0.5, -l * 0.5 + colSize * 0.5, frameMat);
      this.addBox(group, colSize, h, colSize, cx, plinthH + h * 0.5, l * 0.5 - colSize * 0.5, frameMat);
    }
    for (let iz = 1; iz < colCountZ - 1; iz++) {
      const cz = -l * 0.5 + colSize * 0.5 + iz * stepZ;
      this.addBox(group, colSize, h, colSize, -w * 0.5 + colSize * 0.5, plinthH + h * 0.5, cz, frameMat);
      this.addBox(group, colSize, h, colSize, w * 0.5 - colSize * 0.5, plinthH + h * 0.5, cz, frameMat);
    }

    // 3. Lower 1.2m Masonry Half-Wall with wide open 4.5m portal in front
    const wallH = 1.2;
    const portalW = 4.5;
    const sideWallW = (w - portalW) * 0.5;
    this.addBox(group, sideWallW, wallH, 0.2, -w * 0.5 + sideWallW * 0.5, plinthH + wallH * 0.5, l * 0.5, darkWallMat);
    this.addBox(group, sideWallW, wallH, 0.2, w * 0.5 - sideWallW * 0.5, plinthH + wallH * 0.5, l * 0.5, darkWallMat);
    this.addBox(group, w, wallH, 0.2, 0, plinthH + wallH * 0.5, -l * 0.5, darkWallMat);
    this.addBox(group, 0.2, wallH, l, -w * 0.5, plinthH + wallH * 0.5, 0, darkWallMat);
    this.addBox(group, 0.2, wallH, l, w * 0.5, plinthH + wallH * 0.5, 0, darkWallMat);

    // 4. Bold Yellow & Red Accent Fascia Ribbon
    const fasciaY = plinthH + h - 0.4;
    this.addBox(group, w + 0.6, 0.45, 0.2, 0, fasciaY, l * 0.5 + 0.05, yellowMat);
    this.addBox(group, w + 0.6, 0.45, 0.2, 0, fasciaY, -l * 0.5 - 0.05, yellowMat);
    this.addBox(group, 0.2, 0.45, l + 0.6, -w * 0.5 - 0.05, fasciaY, 0, yellowMat);
    this.addBox(group, 0.2, 0.45, l + 0.6, w * 0.5 + 0.05, fasciaY, 0, yellowMat);
    this.addBox(group, w + 0.62, 0.16, 0.22, 0, fasciaY - 0.26, l * 0.5 + 0.06, redMat);

    // 5. Dynamic Architectural Facade Fins (Gold & Red angled fins)
    const fin1 = TectonicComponents.buildFacadeFin(h * 0.85, 1.0, 0.08, 15, '#eab308');
    fin1.position.set(-w * 0.46, plinthH + 0.2, l * 0.5 + 0.1);
    group.add(fin1);
    const fin2 = TectonicComponents.buildFacadeFin(h * 0.85, 1.0, 0.08, -15, '#ef4444');
    fin2.position.set(w * 0.46, plinthH + 0.2, l * 0.5 + 0.1);
    group.add(fin2);

    // 6. Monolithic Architectural Signage Totem
    const totem = TectonicComponents.buildModernSignageTotem('MIE GACOAN', 5.5, 2.0, '#eab308');
    totem.position.set(-w * 0.5 - 2.8, 0, l * 0.5 + 2.0);
    group.add(totem);

    // 7. Courier / Driver Pickup Canopy with Wood Soffit on Side
    const pickupCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.4, 4.5, 0.2);
    pickupCanopy.position.set(-w * 0.5 - 1.7, plinthH + 3.4, 0);
    group.add(pickupCanopy);

    // 8. Outdoor Umbrella Dining Area on Front Terrace
    const tableCount = Math.min(5, Math.max(3, Math.floor(w / 4)));
    const tableSpacing = (w - 2.0) / tableCount;
    for (let t = 0; t < tableCount; t++) {
      const tx = -w * 0.5 + 1.5 + t * tableSpacing;
      const tz = l * 0.5 + 2.2;
      this.addCylinder(group, 0.04, 0.04, 0.8, tx, plinthH + 0.4, tz, frameMat);
      this.addCylinder(group, 0.65, 0.65, 0.05, tx, plinthH + 0.8, tz, woodMat);
      this.addCylinder(group, 0.03, 0.03, 2.4, tx, plinthH + 1.2, tz, frameMat);
      const umbrellaColor = t % 2 === 0 ? yellowMat : redMat;
      this.addCylinder(group, 0.05, 1.35, 0.35, tx, plinthH + 2.3, tz, umbrellaColor);
    }

    // 9. Broad Asymmetric Shed Roof (Overhang 2.0m)
    const rw = w + 2.8;
    const rl = l + 2.8;
    this.buildShedRoof(group, rw, rl, plinthH + h, 2.0, roofMat);
  }

  // 2. BURGER DRIVE-THRU (Mid-Century Modern Diner, Sweeping Canopy, Glass Curtain Wall)
  private static buildBurgerDriveThru(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.0;

    const plasterMat = this.getMaterial('plaster', '#f8fafc');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const asphaltMat = this.getMaterial('asphalt');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.25;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Drive-Thru Asphalt Lane looping along right side (+X) and rear (-Z)
    const laneW = 3.8;
    this.addBox(group, laneW, 0.03, l + 5.0, w * 0.5 + laneW * 0.55, 0.015, 0, asphaltMat);
    this.addBox(group, w + laneW * 1.5, 0.03, laneW, 0, 0.015, -l * 0.5 - laneW * 0.5, asphaltMat);

    // 2. Hollow Walkable Shell with 3.6m Open Walk-Through Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, plasterMat, true, 3.6, 3.6, 1, h);

    // 3. Sweeping Cantilever Canopy with Warm Wood Soffit & LED Glow Strip
    const dinerCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.75, 3.2, 0.22);
    dinerCanopy.position.set(0, plinthH + h * 0.88, l * 0.5 + 1.6);
    group.add(dinerCanopy);

    // 4. Floor-to-Ceiling Panoramic Mullion Glass Curtain Wall
    const curtainWall = TectonicComponents.buildMullionCurtainWall(w * 0.55, h * 0.65, 4, 2);
    curtainWall.position.set(-w * 0.2, plinthH, l * 0.5 + 0.02);
    group.add(curtainWall);

    // 5. Drive-Thru Service Window (+X wall)
    const winY = plinthH + 1.3;
    this.createWindowAssembly(group, 2.0, 1.5, w * 0.5 + 0.02, winY, 0, frameMat, glassMat, false, false);

    // 6. Cantilevered Service Canopy over Drive-Thru Window
    const serviceCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.6, 2.2, 0.18);
    serviceCanopy.position.set(w * 0.5 + 1.1, plinthH + 3.0, 0);
    group.add(serviceCanopy);

    // 7. Architectural Drive-Thru Signage Totem
    const driveThruTotem = TectonicComponents.buildModernSignageTotem('BURGER DRIVE THRU', 4.5, 1.8, '#f97316');
    driveThruTotem.position.set(w * 0.5 + laneW + 0.6, 0, -l * 0.2);
    group.add(driveThruTotem);

    // 8. Tropical Planter Box
    this.createPlanterBox(group, w * 0.45, 0.55, 0.65, -w * 0.2, plinthH + 0.28, l * 0.5 + 0.6);

    // 9. Modern Parapet Roof
    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + h, frameMat, this.getMaterial('concrete_board'));
  }

  // 3. CAFE GLASSHOUSE (Black Mullion Curtain Walls, Timber Screens, Hollow Shell)
  private static buildCafeGlasshouse(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.2;

    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('metal');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Perimeter Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l, plinthH, frameMat, true, 3.2, 3.8, 1, h);

    // 2. 3D Mullion Curtain Walls on Front & Side Facades
    const frontCurtain = TectonicComponents.buildMullionCurtainWall(w * 0.55, h * 0.85, 4, 3);
    frontCurtain.position.set(-w * 0.2, plinthH, l * 0.5 + 0.05);
    group.add(frontCurtain);

    const sideCurtain = TectonicComponents.buildMullionCurtainWall(l * 0.7, h * 0.85, 5, 3);
    sideCurtain.rotation.y = Math.PI * 0.5;
    sideCurtain.position.set(w * 0.5 + 0.05, plinthH, 0);
    group.add(sideCurtain);

    // 3. Timber Louver Screens for Sun Shading
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.35, h * 0.75, 8, 20);
    louver.position.set(w * 0.28, plinthH + h * 0.1, l * 0.5 + 0.1);
    group.add(louver);

    // 4. Cantilevered Entry Canopy with Warm Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(3.4, 2.0, 0.18);
    canopy.position.set(0, plinthH + 3.6, l * 0.5 + 1.0);
    group.add(canopy);

    // 5. Tropical Planters
    this.createPlanterBox(group, w * 0.35, 0.55, 0.65, -w * 0.28, plinthH + 0.28, l * 0.5 + 0.5);
    this.createPlanterBox(group, w * 0.35, 0.55, 0.65, w * 0.28, plinthH + 0.28, l * 0.5 + 0.5);

    // 6. High-Pitched Modern Gable Roof
    const rw = w + 1.4;
    const rl = l + 1.4;
    this.buildModernGableRoof(group, rw, rl, plinthH + h, 2.0, roofMat);
  }

  // 4. CAFE ROOFTOP (Multi-Level Mezzanine, Pergola Terrace, Glass Balcony with Planters)
  private static buildCafeRooftop(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.0;
    const totalH = h * 2;

    const plasterMat = this.getMaterial('plaster', '#f1f5f9');
    const woodMat = this.getMaterial('wood_slat');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow Multi-Level Shell with 3.4m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.4, 3.8, 2, h);

    // 2. Large Front Curtain Wall
    const curtain = TectonicComponents.buildMullionCurtainWall(w * 0.7, h * 0.75, 5, 2);
    curtain.position.set(0, plinthH, l * 0.5 + 0.02);
    group.add(curtain);

    // 3. Rooftop Glass Balcony with Hanging Planter
    const balcony = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.85, 2.0);
    balcony.position.set(0, plinthH + h, l * 0.5 + 1.0);
    group.add(balcony);

    // 4. Teak Timber Rooftop Pergola
    const pergW = w * 0.75;
    const pergL = l * 0.45;
    const pergH = 3.0;
    const pergY = plinthH + h;
    const pergZ = l * 0.2;
    this.addBox(group, 0.15, pergH, 0.15, -pergW * 0.5, pergY + pergH * 0.5, pergZ - pergL * 0.5, woodMat);
    this.addBox(group, 0.15, pergH, 0.15, pergW * 0.5, pergY + pergH * 0.5, pergZ - pergL * 0.5, woodMat);
    this.addBox(group, 0.15, pergH, 0.15, -pergW * 0.5, pergY + pergH * 0.5, pergZ + pergL * 0.5, woodMat);
    this.addBox(group, 0.15, pergH, 0.15, pergW * 0.5, pergY + pergH * 0.5, pergZ + pergL * 0.5, woodMat);
    for (let r = 0; r < 6; r++) {
      const rz = pergZ - pergL * 0.5 + (r / 5) * pergL;
      this.addBox(group, pergW + 0.5, 0.18, 0.08, 0, pergY + pergH + 0.09, rz, woodMat);
    }

    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l * 0.55 + 0.8, plinthH + totalH, frameMat, this.getMaterial('concrete_board'));
  }

  // 5. CAFE CONTAINER (Articulated Industrial Steel Modules, Open Portals, Louvers)
  private static buildCafeContainer(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;

    const cyanMat = this.getMaterial('plaster', '#0284c7');
    const darkMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const padSize = 0.8;
    this.addBox(group, padSize, 0.35, padSize, -w * 0.35, 0.175, -l * 0.35, plinthMat);
    this.addBox(group, padSize, 0.35, padSize, w * 0.35, 0.175, -l * 0.35, plinthMat);
    this.addBox(group, padSize, 0.35, padSize, -w * 0.35, 0.175, l * 0.35, plinthMat);
    this.addBox(group, padSize, 0.35, padSize, w * 0.35, 0.175, l * 0.35, plinthMat);

    // Ground Container (Hollow shell with open portal)
    const cW = Math.max(3.2, w * 0.55);
    const cL = l * 0.85;
    this.buildHollowPerimeterShell(group, cW, flH, cL, 0.35, cyanMat, true, 2.8, 3.2, 1, flH);

    // Upper Container (Shifted left -X, cantilevered forward)
    const c2X = -w * 0.15;
    const c2Y = 0.35 + flH;
    const c2Z = l * 0.08;
    this.buildHollowPerimeterShell(group, cW, flH, cL, c2Y, darkMat, true, 2.8, 3.2, 1, flH);

    // Timber Louver Screen on Upper Container
    const louver = TectonicComponents.buildTimberLouverScreen(cW * 0.7, flH * 0.7, 8, 20);
    louver.position.set(c2X, c2Y + flH * 0.15, c2Z + cL * 0.5 + 0.05);
    group.add(louver);

    // Exterior Industrial Steel Stairway
    const stairX = -w * 0.45;
    const stairSteps = 12;
    for (let s = 0; s < stairSteps; s++) {
      const sy = 0.35 + (s / stairSteps) * flH;
      const sz = -cL * 0.4 + (s / stairSteps) * cL * 0.8;
      this.addBox(group, 0.9, 0.06, 0.32, stairX, sy, sz, darkMat);
    }
  }

  // 6. CAFE COURTYARD (Reflecting Pool, Breeze Blocks, Open Colonnade Verandah)
  private static buildCafeCourtyard(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.0;

    const woodMat = this.getMaterial('wood');
    const plinthMat = this.getMaterial('stone_plinth');
    const waterMat = this.getMaterial('water');
    const roofMat = this.getMaterial('clay_tile');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Hollow L-Shaped Pavilion Shell with 3.2m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, h, l * 0.5, plinthH, woodMat, true, 3.2, 3.6, 1, h);

    // 2. Perforated Roster Breeze-Block Screen along courtyard edge
    const roster = TectonicComponents.buildPerforatedRosterWall(w * 0.5, h * 0.8);
    roster.position.set(-w * 0.22, plinthH + 0.2, l * 0.1);
    group.add(roster);

    // 3. Central Reflecting Water Pond in Courtyard
    const pondW = w * 0.4;
    const pondL = l * 0.35;
    const pondZ = l * 0.25;
    this.addBox(group, pondW, 0.08, pondL, w * 0.2, plinthH + 0.04, pondZ, waterMat);
    this.addBox(group, pondW + 0.3, 0.12, pondL + 0.3, w * 0.2, plinthH + 0.06, pondZ, plinthMat);

    // 4. Modern Hip Roof with Overhang
    this.buildModernHipRoof(group, w + 1.8, l * 0.5 + 1.8, plinthH + h, 2.0, roofMat);
  }

  // 7. MALL ATRIUM (Multi-Level Central Void Atrium, Space-Frame Skylight Vault, Escalators, Grand 6m Portal)
  private static buildMallAtrium(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 5.8;
    const floors = Math.max(3, bld.floorCount || 4);
    const totalH = flH * floors;

    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.4;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // 1. Grand Hollow Multi-Floor Shell with 6.0m Wide Open Portal (4.5m High)
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, concreteMat, true, 6.0, 4.5, floors, flH);

    // 2. Grand Entrance Drop-Off Vehicular Canopy with Warm Wood Soffit
    const dropW = w * 0.45;
    const dropL = 5.5;
    const dropCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(dropW, dropL, 0.32);
    dropCanopy.position.set(0, plinthH + 4.8, l * 0.5 + dropL * 0.5);
    group.add(dropCanopy);

    // Drop-off portico structural columns
    this.addCylinder(group, 0.22, 0.22, 4.8, -dropW * 0.42, plinthH + 2.4, l * 0.5 + dropL * 0.85, frameMat);
    this.addCylinder(group, 0.22, 0.22, 4.8, dropW * 0.42, plinthH + 2.4, l * 0.5 + dropL * 0.85, frameMat);

    // 3. Multi-Storey 3D Mullion Glass Curtain Walls on Facade
    for (let f = 0; f < floors; f++) {
      const fy = plinthH + f * flH;
      const curtain = TectonicComponents.buildMullionCurtainWall(w * 0.8, flH * 0.75, 8, 3);
      curtain.position.set(0, fy, l * 0.5 + 0.05);
      group.add(curtain);
    }

    // 4. Central Multi-Level Void Atrium with Space-Frame Skylight Vault & Crossed Escalators
    const skyW = w * 0.42;
    const skyL = l * 0.42;
    const skylight = TectonicComponents.buildAtriumSkylightVault(skyW, skyL, 3.6);
    skylight.position.set(0, plinthH + totalH, 0);
    group.add(skylight);

    // Atrium skybridges & crossed escalators on intermediate floors
    for (let f = 1; f < floors; f++) {
      const by = plinthH + f * flH;
      // Skybridge crossing the atrium void
      this.addBox(group, skyW, 0.28, 2.6, 0, by + 0.14, 0, frameMat);
      this.addBox(group, skyW, 0.9, 0.04, 0, by + 0.72, 1.3, glassMat);
      this.addBox(group, skyW, 0.9, 0.04, 0, by + 0.72, -1.3, glassMat);

      // Escalator inclined trusses crossing the void
      const dir = f % 2 === 0 ? 1 : -1;
      const escGeom = new THREE.BoxGeometry(1.4, 0.25, skyL * 0.75);
      escGeom.rotateX(dir * 0.45);
      escGeom.translate(dir * 2.2, by - flH * 0.5, 0);
      const escMesh = new THREE.Mesh(escGeom, frameMat);
      group.add(escMesh);
    }

    // 5. Modern Flat Roof with Parapet & Coping
    this.buildModernFlatRoofWithOverhang(group, w + 1.2, l + 1.2, plinthH + totalH, frameMat, concreteMat);
  }

  // 8. MALL OPEN PLAZA (Split Retail Wings, Central Promenade, Double Skybridges, Green Planters)
  private static buildMallOpenPlaza(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 5.4;
    const floors = Math.max(2, bld.floorCount || 3);
    const totalH = flH * floors;

    const concreteMat = this.getMaterial('concrete_board');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.35;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // Promenade width
    const promW = 6.0;
    const wingW = (w - promW) * 0.5;

    // West Wing (Hollow Shell with 3.6m open portal)
    this.buildHollowPerimeterShell(group, wingW, totalH, l, plinthH, concreteMat, true, 3.6, 4.0, floors, flH);
    // East Wing (Hollow Shell with 3.6m open portal)
    this.buildHollowPerimeterShell(group, wingW, totalH, l, plinthH, concreteMat, true, 3.6, 4.0, floors, flH);

    // Central Pedestrian Promenade Paving
    this.addBox(group, promW, 0.05, l, 0, plinthH + 0.025, 0, this.getMaterial('paving'));

    // Skybridges crossing the promenade
    for (let f = 1; f < floors; f++) {
      const bridgeY = plinthH + f * flH;
      this.addBox(group, promW + 0.4, 0.3, 3.6, 0, bridgeY + 0.15, 0, frameMat);
      this.addBox(group, promW + 0.4, 0.9, 0.04, 0, bridgeY + 0.75, 1.8, glassMat);
      this.addBox(group, promW + 0.4, 0.9, 0.04, 0, bridgeY + 0.75, -1.8, glassMat);
    }

    // Glass Balconies with Sky Planters on each floor
    for (let f = 1; f < floors; f++) {
      const balcY = plinthH + f * flH;
      const balc1 = TectonicComponents.buildGlassBalconyWithPlanter(wingW * 0.6, 1.8);
      balc1.position.set(-w * 0.5 + wingW * 0.5, balcY, l * 0.5 + 0.9);
      group.add(balc1);

      const balc2 = TectonicComponents.buildGlassBalconyWithPlanter(wingW * 0.6, 1.8);
      balc2.position.set(w * 0.5 - wingW * 0.5, balcY, l * 0.5 + 0.9);
      group.add(balc2);
    }

    this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + totalH, frameMat, concreteMat);
  }

  // 9. COURTYARD BLOCK (Residential/Kos Courtyard, Hollow Perimeter, Planter Balconies)
  private static buildCourtyardBlock(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const floors = Math.max(2, bld.floorCount || 3);
    const totalH = flH * floors;

    const plasterMat = this.getMaterial(bld.wallMaterial, bld.wallColor);
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('clay_tile');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // Hollow Perimeter Shell with 3.4m Open Portal into Inner Courtyard
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.4, 3.8, floors, flH);

    // Glass Balconies with Sky Planters on each floor
    for (let f = 1; f < floors; f++) {
      const fy = plinthH + f * flH;
      const balc = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.45, 1.8);
      balc.position.set(0, fy, l * 0.5 + 0.9);
      group.add(balc);
    }

    // Timber Louver Screen for courtyard privacy
    const louver = TectonicComponents.buildTimberLouverScreen(w * 0.4, totalH * 0.8, 12, 25);
    louver.position.set(-w * 0.25, plinthH + totalH * 0.1, l * 0.5 + 0.05);
    group.add(louver);

    this.buildModernHipRoof(group, w + 1.4, l + 1.4, plinthH + totalH, 2.2, roofMat);
  }

  // 10. PODIUM TOWER (Grand Canopy, Articulated Glass Tower, Hollow Podiums)
  private static buildPodiumTower(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.8;
    const floors = Math.max(3, bld.floorCount || 4);

    const concreteMat = this.getMaterial('concrete');
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.4;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    const podiumFloors = Math.min(2, Math.max(1, Math.floor(floors / 2)));
    const podiumH = flH * podiumFloors;

    // Hollow Podium Base with Grand 4.5m Open Portal
    this.buildHollowPerimeterShell(group, w, podiumH, l, plinthH, concreteMat, true, 4.5, 4.2, podiumFloors, flH);

    // Grand Entrance Cantilever Canopy with Warm Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(w * 0.55, 3.2, 0.25);
    canopy.position.set(0, plinthH + 4.0, l * 0.5 + 1.6);
    group.add(canopy);

    const towerFloors = floors - podiumFloors;
    if (towerFloors > 0) {
      const towerW = w * 0.75;
      const towerL = l * 0.75;
      const towerH = flH * towerFloors;
      const towerBaseY = plinthH + podiumH;

      // Hollow Upper Tower Shell
      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, concreteMat, false, 3.0, 3.0, towerFloors, flH);

      // Ribbon Curtain Wall Panels on Tower Facades
      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * flH;
        const curtain = TectonicComponents.buildMullionCurtainWall(towerW * 0.8, flH * 0.7, 6, 2);
        curtain.position.set(0, tfY, towerL * 0.5 + 0.05);
        group.add(curtain);
      }

      this.buildModernFlatRoofWithOverhang(group, towerW + 0.8, towerL + 0.8, towerBaseY + towerH, frameMat, concreteMat);
    } else {
      this.buildModernFlatRoofWithOverhang(group, w + 0.8, l + 0.8, plinthH + podiumH, frameMat, concreteMat);
    }
  }

  // 11. ARCADE SHOPHOUSE (Pedestrian Arcade Colonnade, Open Storefront, Upper Balconies)
  private static buildArcadeShophouse(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.5;
    const floors = Math.max(2, bld.floorCount || 2);
    const totalH = flH * floors;

    const plasterMat = this.getMaterial(bld.wallMaterial, bld.wallColor);
    const frameMat = this.getMaterial('frame');
    const plinthMat = this.getMaterial('stone_plinth');

    const plinthH = 0.35;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // Hollow Multi-Floor Shell with 3.8m Open Storefront Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.8, 3.8, floors, flH);

    // Front Arcade Colonnade (Covered walkway columns)
    const colSize = 0.28;
    const colCount = Math.max(2, Math.round(w / 3.5));
    const stepX = (w - colSize) / (colCount - 1);
    for (let c = 0; c < colCount; c++) {
      const cx = -w * 0.5 + colSize * 0.5 + c * stepX;
      this.addBox(group, colSize, flH, colSize, cx, plinthH + flH * 0.5, l * 0.5 + 1.2, frameMat);
    }

    // Arcade Overhang Canopy with Warm Wood Soffit
    const arcadeCanopy = TectonicComponents.buildCantileverCanopyWithSoffit(w, 1.8, 0.22);
    arcadeCanopy.position.set(0, plinthH + flH, l * 0.5 + 0.9);
    group.add(arcadeCanopy);

    // Upper Floor Balconies with Planters
    for (let f = 1; f < floors; f++) {
      const fy = plinthH + f * flH;
      const balc = TectonicComponents.buildGlassBalconyWithPlanter(w * 0.7, 1.6);
      balc.position.set(0, fy, l * 0.5 + 0.8);
      group.add(balc);
    }

    this.buildModernFlatRoofWithOverhang(group, w + 0.6, l + 0.6, plinthH + totalH, frameMat, plasterMat);
  }

  // 12. PENDOPO OPEN (Saka Guru Pillars, Stepped Umpak Stones, Open Verandah)
  private static buildPendopoOpen(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 5.5;

    const woodMat = this.getMaterial('wood');
    const plinthMat = this.getMaterial('stone_plinth');
    const roofMat = this.getMaterial('clay_tile');

    const plinthH = 0.5;
    this.addBox(group, w + 0.8, plinthH, l + 0.8, 0, plinthH * 0.5, 0, plinthMat);

    // Central Soko Guru Master Pillars with Stepped Umpak Stones
    const sgW = w * 0.38;
    const sgL = l * 0.38;
    const sgColSize = 0.32;
    const umpakSize = 0.52;
    const umpakH = 0.35;

    const corners = [
      [-sgW * 0.5, -sgL * 0.5],
      [sgW * 0.5, -sgL * 0.5],
      [-sgW * 0.5, sgL * 0.5],
      [sgW * 0.5, sgL * 0.5]
    ];

    for (const [cx, cz] of corners) {
      this.addBox(group, umpakSize, umpakH, umpakSize, cx, plinthH + umpakH * 0.5, cz, plinthMat);
      this.addBox(group, sgColSize, h - umpakH, sgColSize, cx, plinthH + umpakH + (h - umpakH) * 0.5, cz, woodMat);
    }

    // Perimeter Colonnade
    const perimSize = 0.2;
    const colsX = Math.max(3, Math.round(w / 3.5));
    const colsZ = Math.max(3, Math.round(l / 3.5));
    const stepX = (w - perimSize) / (colsX - 1);
    const stepZ = (l - perimSize) / (colsZ - 1);

    for (let ix = 0; ix < colsX; ix++) {
      const px = -w * 0.5 + perimSize * 0.5 + ix * stepX;
      this.addBox(group, perimSize, h * 0.85, perimSize, px, plinthH + (h * 0.85) * 0.5, -l * 0.5 + perimSize * 0.5, woodMat);
      this.addBox(group, perimSize, h * 0.85, perimSize, px, plinthH + (h * 0.85) * 0.5, l * 0.5 - perimSize * 0.5, woodMat);
    }
    for (let iz = 1; iz < colsZ - 1; iz++) {
      const pz = -l * 0.5 + perimSize * 0.5 + iz * stepZ;
      this.addBox(group, perimSize, h * 0.85, perimSize, -w * 0.5 + perimSize * 0.5, plinthH + (h * 0.85) * 0.5, pz, woodMat);
      this.addBox(group, perimSize, h * 0.85, perimSize, w * 0.5 - perimSize * 0.5, plinthH + (h * 0.85) * 0.5, pz, woodMat);
    }

    const rw = w + 2.4;
    const rl = l + 2.4;
    this.buildModernHipRoof(group, rw, rl, plinthH + h * 0.85, 2.4, roofMat);
  }

  // 13. STILTED HOUSE (Tropical Timber Stilt House with Elevated Porch)
  private static buildStiltedHouse(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.2;

    const woodMat = this.getMaterial('wood');
    const darkWoodMat = this.getMaterial('wood_slat');
    const roofMat = this.getMaterial('clay_tile');
    const plinthMat = this.getMaterial('stone_plinth');

    const stiltH = 1.8;
    const stiltSize = 0.25;
    const colsX = Math.max(3, Math.round(w / 3));
    const colsZ = Math.max(3, Math.round(l / 3));
    const stepX = (w - stiltSize) / (colsX - 1);
    const stepZ = (l - stiltSize) / (colsZ - 1);

    for (let ix = 0; ix < colsX; ix++) {
      for (let iz = 0; iz < colsZ; iz++) {
        const sx = -w * 0.5 + stiltSize * 0.5 + ix * stepX;
        const sz = -l * 0.5 + stiltSize * 0.5 + iz * stepZ;
        this.addBox(group, 0.45, 0.25, 0.45, sx, 0.125, sz, plinthMat);
        this.addBox(group, stiltSize, stiltH - 0.25, stiltSize, sx, 0.25 + (stiltH - 0.25) * 0.5, sz, woodMat);
      }
    }

    const floorY = stiltH;
    this.addBox(group, w + 0.3, 0.25, l + 0.3, 0, floorY + 0.125, 0, woodMat);

    // Hollow shell on stilts with 2.8m open entrance portal
    this.buildHollowPerimeterShell(group, w, h, l, floorY + 0.25, darkWoodMat, true, 2.8, 3.2, 1, h);

    // Access stairs
    const stairSteps = 10;
    for (let s = 0; s < stairSteps; s++) {
      const sy = (s / stairSteps) * stiltH;
      const sz = l * 0.5 + 0.2 + (s / stairSteps) * 2.0;
      this.addBox(group, 1.2, 0.12, 0.35, w * 0.3, sy + 0.06, sz, woodMat);
    }

    const rw = w + 1.8;
    const rl = l + 1.8;
    this.buildModernGableRoof(group, rw, rl, floorY + 0.25 + h, 2.2, roofMat);
  }

  // 14. TRANSIT CANOPY (Glass Vaulted Sheltered Transit Platform)
  private static buildTransitCanopy(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = bld.floorHeight || 4.5;

    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const plinthMat = this.getMaterial('stone_plinth');
    const yellowMat = this.getMaterial('plaster', '#eab308');
    const woodMat = this.getMaterial('wood');

    const platH = 0.45;
    this.addBox(group, w, platH, l, 0, platH * 0.5, 0, plinthMat);
    this.addBox(group, 0.5, 0.03, l, w * 0.5 - 0.25, platH + 0.015, 0, yellowMat);

    const pylonCount = Math.max(2, Math.round(l / 4.5));
    const stepZ = (l - 2.5) / (pylonCount - 1);
    for (let p = 0; p < pylonCount; p++) {
      const pz = -l * 0.5 + 1.25 + p * stepZ;
      this.addBox(group, 0.25, h, 0.25, -w * 0.2, platH + h * 0.5, pz, frameMat);
      this.addBox(group, w * 0.95, 0.18, 0.25, 0, platH + h, pz, frameMat);
    }

    // Glass Roof Vault
    const rw = w + 1.2;
    const rl = l + 0.8;
    this.addBox(group, rw, 0.1, rl, 0, platH + h + 0.05, 0, glassMat);
    this.addBox(group, rw + 0.1, 0.14, 0.12, 0, platH + h + 0.05, rl * 0.5, frameMat);
    this.addBox(group, rw + 0.1, 0.14, 0.12, 0, platH + h + 0.05, -rl * 0.5, frameMat);

    // Platform benches & timetable display
    this.addBox(group, 0.6, 0.48, l * 0.4, -w * 0.2, platH + 0.24, 0, woodMat);
    this.addBox(group, 0.12, 2.0, 1.0, -w * 0.35, platH + 1.0, -l * 0.35, frameMat);
  }

  // 15. PARAMETRIC STANDARD BUILDING (Enterable Hollow Shell, Modern Cantilever Canopy, Balconies)
  private static buildParametricStandardBuilding(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const flH = bld.floorHeight || 4.2;
    const floors = Math.max(1, bld.floorCount || 1);
    const totalH = flH * floors;

    const plasterMat = this.getMaterial(bld.wallMaterial || item?.defaultWallMaterial || 'plaster', bld.wallColor || item?.defaultWallColor);
    const concreteMat = this.getMaterial('concrete_board');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const roofMat = this.getMaterial(bld.roofMaterial || item?.defaultRoofMaterial || 'metal');

    const plinthH = 0.35;
    this.addBox(group, w + 0.5, plinthH, l + 0.5, 0, plinthH * 0.5, 0, plinthMat);

    if (floors >= 6) {
      // High-Rise Articulation: Podium (fl 1-2) + Tower with setback (fl 3..N) + Penthouse Crown
      const podiumFloors = 2;
      const podiumH = flH * podiumFloors;
      this.buildHollowPerimeterShell(group, w, podiumH, l, plinthH, plasterMat, true, 4.5, 4.0, podiumFloors, flH);

      const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(Math.min(w * 0.6, 5.0), 2.8, 0.22);
      canopy.position.set(0, plinthH + 3.8, l * 0.5 + 1.4);
      group.add(canopy);

      const towerFloors = floors - podiumFloors;
      const setback = 0.8;
      const towerW = Math.max(6, w - setback * 2);
      const towerL = Math.max(6, l - setback * 2);
      const towerH = flH * towerFloors;
      const towerBaseY = plinthH + podiumH;

      this.buildHollowPerimeterShell(group, towerW, towerH, towerL, towerBaseY, plasterMat, false, 3.0, 3.0, towerFloors, flH);

      for (let tf = 0; tf < towerFloors; tf++) {
        const tfY = towerBaseY + tf * flH;
        const curtain = TectonicComponents.buildMullionCurtainWall(towerW * 0.8, flH * 0.65, 4, 2);
        curtain.position.set(0, tfY, towerL * 0.5 + 0.04);
        group.add(curtain);

        const balc = TectonicComponents.buildGlassBalconyWithPlanter(towerW * 0.6, 1.2);
        balc.position.set(0, tfY, towerL * 0.5 + 0.6);
        group.add(balc);
      }

      // Roof Penthouse Core & Crown
      const roofY = towerBaseY + towerH;
      this.buildModernFlatRoofWithOverhang(group, towerW + 0.6, towerL + 0.6, roofY, frameMat, concreteMat);

      const pentW = Math.min(towerW * 0.4, 5.0);
      const pentL = Math.min(towerL * 0.4, 5.0);
      this.addBox(group, pentW, 3.2, pentL, 0, roofY + 1.6, 0, concreteMat);
      this.addBox(group, towerW * 0.85, 0.2, towerL * 0.85, 0, roofY + 3.2, 0, frameMat);
      return;
    }

    // 1. Hollow Walkable Shell with 3.6m Open Entrance Portal
    this.buildHollowPerimeterShell(group, w, totalH, l, plinthH, plasterMat, true, 3.6, 3.6, floors, flH);

    // 2. Cantilevered Entrance Canopy with Warm Wood Soffit
    const canopy = TectonicComponents.buildCantileverCanopyWithSoffit(Math.min(w * 0.6, 4.5), 2.2, 0.18);
    canopy.position.set(0, plinthH + 3.4, l * 0.5 + 1.1);
    group.add(canopy);

    // 3. Modern Window Assemblies on each floor
    for (let f = 0; f < floors; f++) {
      const fy = plinthH + f * flH + flH * 0.5;
      this.createWindowAssembly(group, w * 0.65, flH * 0.55, 0, fy, l * 0.5 + 0.02, frameMat, glassMat, f === 0);
    }

    // 4. Cantilevered Glass Balconies with Hanging Planters on upper floors
    for (let f = 1; f < floors; f++) {
      const fy = plinthH + f * flH;
      const balcony = TectonicComponents.buildGlassBalconyWithPlanter(Math.min(w * 0.5, 4.0), 1.6);
      balcony.position.set(0, fy, l * 0.5 + 0.8);
      group.add(balcony);
    }

    const roofStyle = item?.roofStyle || 'flat_parapet';
    const overhang = bld.roofOverhang || item?.defaultOverhang || 1.2;
    const rw = w + overhang * 2;
    const rl = l + overhang * 2;
    const roofBaseY = plinthH + totalH;

    switch (roofStyle) {
      case 'sawtooth':
        this.buildSawtoothRoof(group, rw, rl, roofBaseY, 1.8, 3, roofMat, glassMat);
        break;
      case 'arched_vault':
        this.buildArchedVaultRoof(group, rw, rl, roofBaseY, 2.2, roofMat);
        break;
      case 'shed_industrial':
        this.buildShedRoof(group, rw, rl, roofBaseY, 1.6, roofMat);
        break;
      case 'butterfly':
        this.buildButterflyRoof(group, rw, rl, roofBaseY, 1.4, roofMat);
        break;
      case 'gable':
        this.buildModernGableRoof(group, rw, rl, roofBaseY, 1.8, roofMat);
        break;
      case 'hip':
      case 'joglo':
        this.buildModernHipRoof(group, rw, rl, roofBaseY, 2.0, roofMat);
        break;
      case 'flat_parapet':
      default:
        this.buildModernFlatRoofWithOverhang(group, rw, rl, roofBaseY, frameMat, concreteMat);
        break;
    }
  }

  // 15. TELECOM TOWER (High-rise Steel Lattice Mast, Multiple Antenna Galleries, Equipment Shelter)
  private static buildTelecomTower(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const totalH = Math.max(bld.floorHeight || 24, 20);

    const steelMat = this.getMaterial('frame');
    const redMat = this.getMaterial('plaster', '#dc2626');
    const whiteMat = this.getMaterial('plaster', '#f8fafc');
    const concreteMat = this.getMaterial('concrete');
    const plinthMat = this.getMaterial('stone_plinth');

    // 1. Concrete ground pad
    const plinthH = 0.5;
    this.addBox(group, w, plinthH, l, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Equipment shelter cabin
    const shelterW = Math.min(w * 0.45, 4.5);
    const shelterL = Math.min(l * 0.45, 4.5);
    const shelterH = 3.2;
    this.addBox(group, shelterW, shelterH, shelterL, -w * 0.22, plinthH + shelterH * 0.5, -l * 0.22, concreteMat);

    // 3. Four corner lattice legs tapering from bottom to top
    const baseSpan = Math.min(w, l) * 0.35;
    const topSpan = baseSpan * 0.3;
    const legThick = 0.25;
    const tiers = 6;
    const tierH = totalH / tiers;

    for (let t = 0; t < tiers; t++) {
      const y0 = plinthH + t * tierH;
      const y1 = plinthH + (t + 1) * tierH;
      const r0 = baseSpan - (t / tiers) * (baseSpan - topSpan);
      const r1 = baseSpan - ((t + 1) / tiers) * (baseSpan - topSpan);
      const tierMat = t % 2 === 0 ? redMat : whiteMat;

      // 4 Corner vertical posts
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1]
      ];
      for (const [cx, cz] of corners) {
        const xAvg = (cx * (r0 + r1)) * 0.5;
        const zAvg = (cz * (r0 + r1)) * 0.5;
        this.addBox(group, legThick, tierH, legThick, xAvg, (y0 + y1) * 0.5, zAvg, tierMat);
      }

      // Horizontal perimeter belt beams
      this.addBox(group, r1 * 2, 0.15, 0.15, 0, y1, -r1, steelMat);
      this.addBox(group, r1 * 2, 0.15, 0.15, 0, y1, r1, steelMat);
      this.addBox(group, 0.15, 0.15, r1 * 2, -r1, y1, 0, steelMat);
      this.addBox(group, 0.15, 0.15, r1 * 2, r1, y1, 0, steelMat);

      // Diagonal cross-bracing
      this.addBox(group, r1 * 2.2, 0.1, 0.1, 0, (y0 + y1) * 0.5, -r0, steelMat, 0, 0, 0.55);
      this.addBox(group, r1 * 2.2, 0.1, 0.1, 0, (y0 + y1) * 0.5, r0, steelMat, 0, 0, -0.55);
    }

    // 4. Upper platform & antenna gallery
    const platY = plinthH + totalH * 0.82;
    this.addBox(group, topSpan * 3.0, 0.2, topSpan * 3.0, 0, platY, 0, steelMat);
    this.addBox(group, topSpan * 3.0, 1.1, 0.08, 0, platY + 0.6, -topSpan * 1.5, steelMat);
    this.addBox(group, topSpan * 3.0, 1.1, 0.08, 0, platY + 0.6, topSpan * 1.5, steelMat);

    // 5. Directional sector panel antennas (white rectangles)
    for (const [ax, az] of [[0, -topSpan * 1.55], [0, topSpan * 1.55], [-topSpan * 1.55, 0], [topSpan * 1.55, 0]]) {
      this.addBox(group, 0.4, 2.2, 0.2, ax, platY + 1.2, az, whiteMat);
    }

    // 6. Microwave dish antennas (circular cylinders)
    this.addCylinder(group, 0.7, 0.7, 0.35, -topSpan * 1.3, platY + 2.0, 0, whiteMat);
    this.addCylinder(group, 0.6, 0.6, 0.35, topSpan * 1.3, platY + 1.2, 0, whiteMat);

    // 7. Lightning arrestor mast at apex
    const mastH = 4.5;
    const mastY = plinthH + totalH;
    this.addCylinder(group, 0.08, 0.12, mastH, 0, mastY + mastH * 0.5, 0, steelMat);
    this.addBox(group, 0.35, 0.35, 0.35, 0, mastY + mastH - 0.2, 0, redMat);
  }

  // 16. MONUMENT OBELISK (Stepped Terraced Base, Central Tapering Shaft, Golden Pinnacle)
  private static buildMonumentObelisk(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const totalH = Math.max(bld.floorHeight || 18, 14);

    const stoneMat = this.getMaterial('stone');
    const plinthMat = this.getMaterial('stone_plinth');
    const goldMat = this.getMaterial('plaster', '#eab308');
    const waterMat = this.getMaterial('concrete', '#0284c7');
    const accentMat = this.getMaterial('plaster', '#0f172a');

    // 1. Broad stepped circular fountain basin
    const baseRadius = Math.min(w, l) * 0.45;
    this.addCylinder(group, baseRadius, baseRadius + 0.5, 0.4, 0, 0.2, 0, plinthMat);
    this.addCylinder(group, baseRadius - 0.4, baseRadius - 0.4, 0.25, 0, 0.35, 0, waterMat);

    // 2. Multi-tiered octagonal pedestal
    this.addBox(group, w * 0.55, 0.6, l * 0.55, 0, 0.7, 0, stoneMat);
    this.addBox(group, w * 0.42, 0.8, l * 0.42, 0, 1.4, 0, accentMat);
    this.addBox(group, w * 0.32, 1.2, l * 0.32, 0, 2.4, 0, stoneMat);

    // 3. Central tapering obelisk shaft
    const shaftBaseY = 3.0;
    const shaftH = totalH - 5.5;
    const shaftW0 = Math.min(w, l) * 0.18;
    const shaftW1 = shaftW0 * 0.55;

    const segs = 5;
    const segH = shaftH / segs;
    for (let s = 0; s < segs; s++) {
      const sw = shaftW0 - (s / segs) * (shaftW0 - shaftW1);
      const sy = shaftBaseY + s * segH + segH * 0.5;
      this.addBox(group, sw, segH, sw, 0, sy, 0, stoneMat);
      if (s > 0) {
        this.addBox(group, sw + 0.1, 0.15, sw + 0.1, 0, shaftBaseY + s * segH, 0, accentMat);
      }
    }

    // 4. Pyramidion / Golden flame pinnacle
    const apexBaseY = shaftBaseY + shaftH;
    this.addBox(group, shaftW1 * 1.2, 0.3, shaftW1 * 1.2, 0, apexBaseY + 0.15, 0, accentMat);
    this.addCylinder(group, 0.05, shaftW1 * 0.6, 2.5, 0, apexBaseY + 1.55, 0, goldMat);
    this.addBox(group, 0.5, 0.5, 0.5, 0, apexBaseY + 2.8, 0, goldMat);
  }

  // 17. STADIUM ARENA (Tiered Seating Bowl, Green Pitch, Aerodynamic Roofs, Floodlight Pylons)
  private static buildStadiumArena(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const totalH = Math.max((bld.floorCount || 3) * (bld.floorHeight || 4.5), 14);

    const concreteMat = this.getMaterial('concrete');
    const plinthMat = this.getMaterial('stone_plinth');
    const frameMat = this.getMaterial('frame');
    const roofMat = this.getMaterial('zinc_roof');
    const grassMat = this.getMaterial('concrete', '#15803d');
    const trackMat = this.getMaterial('plaster', '#b91c1c');

    // 1. Base podium
    const plinthH = 0.5;
    this.addBox(group, w + 1.0, plinthH, l + 1.0, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Interior sports field: Running track and central green pitch
    const fieldW = w * 0.65;
    const fieldL = l * 0.70;
    this.addBox(group, fieldW + 3.0, 0.08, fieldL + 3.0, 0, plinthH + 0.04, 0, trackMat);
    this.addBox(group, fieldW, 0.1, fieldL, 0, plinthH + 0.06, 0, grassMat);

    // 3. Tiered Grandstand seating bowl surrounding the pitch
    const tiers = 4;
    const stepH = (totalH * 0.5) / tiers;
    for (let t = 0; t < tiers; t++) {
      const stepY = plinthH + (t + 1) * stepH;
      const ringW = fieldW + 3.0 + (t + 1) * 2.2;
      const ringL = fieldL + 3.0 + (t + 1) * 2.2;
      this.addBox(group, ringW, stepH, 2.0, 0, stepY - stepH * 0.5, -ringL * 0.5, concreteMat);
      this.addBox(group, ringW, stepH, 2.0, 0, stepY - stepH * 0.5, ringL * 0.5, concreteMat);
      this.addBox(group, 2.0, stepH, ringL, -ringW * 0.5, stepY - stepH * 0.5, 0, concreteMat);
      this.addBox(group, 2.0, stepH, ringL, ringW * 0.5, stepY - stepH * 0.5, 0, concreteMat);
    }

    // 4. Exterior facade perimeter ring with expressed structural colonnade
    const extW = w * 0.98;
    const extL = l * 0.98;
    this.addBox(group, extW, totalH * 0.65, 1.2, 0, plinthH + totalH * 0.325, -extL * 0.5, concreteMat);
    this.addBox(group, extW, totalH * 0.65, 1.2, 0, plinthH + totalH * 0.325, extL * 0.5, concreteMat);
    this.addBox(group, 1.2, totalH * 0.65, extL, -extW * 0.5, plinthH + totalH * 0.325, 0, concreteMat);
    this.addBox(group, 1.2, totalH * 0.65, extL, extW * 0.5, plinthH + totalH * 0.325, 0, concreteMat);

    // 5. Cantilevered aerodynamic stadium roof canopies (East & West)
    const canopyW = w * 0.28;
    const canopyL = l * 0.92;
    const canopyY = plinthH + totalH * 0.85;
    this.addBox(group, canopyW, 0.3, canopyL, -w * 0.32, canopyY, 0, roofMat, 0, 0, -0.15);
    this.addBox(group, canopyW, 0.3, canopyL, w * 0.32, canopyY, 0, roofMat, 0, 0, 0.15);

    // 6. Four corner floodlight towers
    const lightH = totalH * 1.35;
    for (const [lx, lz] of [[-w * 0.46, -l * 0.46], [w * 0.46, -l * 0.46], [-w * 0.46, l * 0.46], [w * 0.46, l * 0.46]]) {
      this.addCylinder(group, 0.3, 0.55, lightH, lx, lightH * 0.5, lz, frameMat);
      this.addBox(group, 2.4, 1.6, 0.6, lx, lightH, lz, frameMat);
      this.addBox(group, 2.2, 1.4, 0.1, lx, lightH, lz + 0.3, this.getMaterial('warm_light'));
    }
  }

  // 18. BRIDGE GIRDER (Massive Abutments, Concrete Piers, Steel Girders, Asphalt Deck, Railings)
  private static buildBridgeGirder(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = Math.max(bld.floorHeight || 5.2, 4.5);

    const concreteMat = this.getMaterial('concrete');
    const steelMat = this.getMaterial('dark_ibeam');
    const roadMat = this.getMaterial('concrete', '#1e293b');
    const lineMat = this.getMaterial('plaster', '#f8fafc');

    // 1. Concrete abutments at both longitudinal ends
    const abutmentW = w * 0.95;
    const abutmentL = 3.5;
    this.addBox(group, abutmentW, h, abutmentL, 0, h * 0.5, -l * 0.5 + abutmentL * 0.5, concreteMat);
    this.addBox(group, abutmentW, h, abutmentL, 0, h * 0.5, l * 0.5 - abutmentL * 0.5, concreteMat);

    // 2. Central pier pillars
    const pierH = h * 0.75;
    this.addCylinder(group, 0.8, 1.1, pierH, -w * 0.25, pierH * 0.5, 0, concreteMat);
    this.addCylinder(group, 0.8, 1.1, pierH, w * 0.25, pierH * 0.5, 0, concreteMat);
    this.addBox(group, w * 0.75, 0.6, 2.0, 0, pierH + 0.3, 0, concreteMat);

    // 3. Steel I-Beam longitudinal girders spanning underneath the deck
    const girderSpan = l - 1.0;
    const girderY = h - 0.5;
    for (const gx of [-w * 0.35, -w * 0.12, w * 0.12, w * 0.35]) {
      this.addBox(group, 0.35, 0.7, girderSpan, gx, girderY, 0, steelMat);
    }

    // 4. Bridge deck slab and asphalt roadway surface
    this.addBox(group, w, 0.35, l, 0, h + 0.175, 0, concreteMat);
    this.addBox(group, w * 0.75, 0.04, l, 0, h + 0.37, 0, roadMat);
    this.addBox(group, 0.18, 0.05, l * 0.9, 0, h + 0.38, 0, lineMat);

    // 5. Parapet crash barriers and pedestrian walkways on both sides
    const walkW = (w - w * 0.75) * 0.5;
    this.addBox(group, walkW, 0.15, l, -w * 0.5 + walkW * 0.5, h + 0.42, 0, concreteMat);
    this.addBox(group, walkW, 0.15, l, w * 0.5 - walkW * 0.5, h + 0.42, 0, concreteMat);

    this.addBox(group, 0.12, 1.0, l, -w * 0.5 + 0.06, h + 0.9, 0, steelMat);
    this.addBox(group, 0.12, 1.0, l, w * 0.5 - 0.06, h + 0.9, 0, steelMat);
  }

  // 19. FLYOVER VIADUCT (Hammerhead Piers, Box Girder Superstructure, Asphalt Roadway)
  private static buildFlyoverViaduct(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = Math.max((bld.floorCount || 2) * (bld.floorHeight || 4.5), 8.0);

    const concreteMat = this.getMaterial('concrete');
    const roadMat = this.getMaterial('concrete', '#1e293b');
    const barrierMat = this.getMaterial('concrete', '#64748b');
    const lineMat = this.getMaterial('plaster', '#eab308');

    // 1. Massive cylindrical hammerhead concrete piers rising from ground
    const pierH = h - 1.2;
    const pierZOffsets = [-l * 0.32, 0, l * 0.32];
    for (const pz of pierZOffsets) {
      this.addCylinder(group, 0.9, 1.1, pierH, 0, pierH * 0.5, pz, concreteMat);
      this.addBox(group, w * 0.75, 1.2, 2.4, 0, pierH + 0.6, pz, concreteMat);
    }

    // 2. Precast segmental concrete box girder superstructure
    const girderH = 1.6;
    const girderY = h + girderH * 0.5;
    this.addBox(group, w * 0.72, girderH, l, 0, girderY, 0, concreteMat);

    // 3. Cantilevered deck slab and asphalt pavement
    this.addBox(group, w, 0.35, l, 0, h + girderH + 0.175, 0, concreteMat);
    this.addBox(group, w * 0.92, 0.05, l, 0, h + girderH + 0.375, 0, roadMat);

    // Center median barrier
    this.addBox(group, 0.45, 0.75, l, 0, h + girderH + 0.75, 0, barrierMat);
    this.addBox(group, 0.15, 0.06, l * 0.9, -w * 0.22, h + girderH + 0.38, 0, lineMat);
    this.addBox(group, 0.15, 0.06, l * 0.9, w * 0.22, h + girderH + 0.38, 0, lineMat);

    // 4. Outer crash barrier parapets
    this.addBox(group, 0.25, 0.9, l, -w * 0.5 + 0.125, h + girderH + 0.8, 0, barrierMat);
    this.addBox(group, 0.25, 0.9, l, w * 0.5 - 0.125, h + girderH + 0.8, 0, barrierMat);
  }

  // 20. SUBSTATION POWER (Transformer Bays, Radiator Fins, Bushings, Control House, Solar/Bio Unit)
  private static buildSubstationPower(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = Math.max(bld.floorHeight || 4.5, 4.0);

    const concreteMat = this.getMaterial('concrete');
    const steelMat = this.getMaterial('frame');
    const metalMat = this.getMaterial('metal_panel');
    const ceramicMat = this.getMaterial('plaster', '#9a3412');
    const plinthMat = this.getMaterial('stone_plinth');
    const solarMat = this.getMaterial('glass', '#0f172a');

    // 1. Crushed gravel / concrete ground pad
    const plinthH = 0.4;
    this.addBox(group, w, plinthH, l, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Relay & Control Building on one quadrant
    const ctrlW = w * 0.38;
    const ctrlL = l * 0.42;
    const ctrlH = h;
    this.addBox(group, ctrlW, ctrlH, ctrlL, -w * 0.26, plinthH + ctrlH * 0.5, -l * 0.24, concreteMat);
    this.addBox(group, ctrlW * 0.5, 2.2, 0.1, -w * 0.26, plinthH + 1.1, -l * 0.24 + ctrlL * 0.5 + 0.05, steelMat);

    // 3. Two large step-down power transformers
    const transW = 3.6;
    const transL = 3.2;
    const transH = 2.8;
    for (const tx of [w * 0.12, w * 0.35]) {
      const ty = plinthH + transH * 0.5;
      this.addBox(group, transW, transH, transL, tx, ty, -l * 0.15, metalMat);
      this.addBox(group, transW + 0.4, transH * 0.75, 0.3, tx, ty, -l * 0.15 + transL * 0.5 + 0.15, steelMat);
      this.addBox(group, transW + 0.4, transH * 0.75, 0.3, tx, ty, -l * 0.15 - transL * 0.5 - 0.15, steelMat);
      for (const bx of [-1.0, 0, 1.0]) {
        this.addCylinder(group, 0.12, 0.18, 1.4, tx + bx, plinthH + transH + 0.7, -l * 0.15, ceramicMat);
      }
    }

    // 4. Overhead steel lattice gantry frames
    const gantryH = h * 1.5;
    this.addCylinder(group, 0.15, 0.2, gantryH, w * 0.05, gantryH * 0.5, l * 0.25, steelMat);
    this.addCylinder(group, 0.15, 0.2, gantryH, w * 0.42, gantryH * 0.5, l * 0.25, steelMat);
    this.addBox(group, w * 0.45, 0.3, 0.3, w * 0.235, gantryH, l * 0.25, steelMat);

    // 5. Ground solar PV array / bio converter unit
    const pvW = w * 0.45;
    const pvL = l * 0.35;
    this.addBox(group, pvW, 0.15, pvL, -w * 0.22, plinthH + 1.2, l * 0.25, solarMat, -0.25, 0, 0);
  }

  // 21. WATER CLARIFIER (Circular Clarifier Tanks, Scraper Bridges, Filtration House)
  private static buildWaterClarifier(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = Math.max(bld.floorHeight || 4.8, 4.0);

    const concreteMat = this.getMaterial('concrete');
    const plinthMat = this.getMaterial('stone_plinth');
    const waterMat = this.getMaterial('concrete', '#0284c7');
    const steelMat = this.getMaterial('frame');

    // 1. Concrete facility slab
    const plinthH = 0.4;
    this.addBox(group, w, plinthH, l, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Two circular sedimentation clarifier tanks
    const tankRadius = Math.min(w * 0.32, l * 0.36);
    const tankWallH = 2.4;
    const tankY = plinthH + tankWallH * 0.5;
    const tankOffsets = [-w * 0.22, w * 0.22];

    for (const tx of tankOffsets) {
      this.addCylinder(group, tankRadius, tankRadius, tankWallH, tx, tankY, -l * 0.08, concreteMat);
      this.addCylinder(group, tankRadius - 0.35, tankRadius - 0.35, 0.1, tx, tankY + tankWallH * 0.35, -l * 0.08, waterMat);
      this.addCylinder(group, 0.6, 0.6, tankWallH + 0.6, tx, tankY + 0.3, -l * 0.08, steelMat);
      this.addBox(group, tankRadius * 2.1, 0.3, 0.45, tx, plinthH + tankWallH + 0.2, -l * 0.08, steelMat);
    }

    // 3. Chemical filtration & pump control house
    const houseW = w * 0.65;
    const houseL = l * 0.28;
    const houseH = h;
    const houseZ = l * 0.32;
    this.addBox(group, houseW, houseH, houseL, 0, plinthH + houseH * 0.5, houseZ, concreteMat);

    this.addBox(group, w * 0.5, 0.25, 0.6, 0, plinthH + tankWallH, -l * 0.08, steelMat);
  }

  // 22. SACRED TEMPLE (Candi Bentar Gateway, Multi-Tiered Meru Roofs, Padmasana Shrines)
  private static buildSacredTemple(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const totalH = Math.max(bld.floorHeight || 6.8, 5.0);

    const brickMat = this.getMaterial('brick', '#b45309');
    const stoneMat = this.getMaterial('stone_plinth');
    const teakMat = this.getMaterial('carved_teak');
    const roofMat = this.getMaterial('wood_shingle');
    const goldMat = this.getMaterial('plaster', '#eab308');

    // 1. Terraced stone plinth
    const plinthH = 0.6;
    this.addBox(group, w, plinthH, l, 0, plinthH * 0.5, 0, stoneMat);

    // 2. Candi Bentar (Split Gateway) at front entrance
    const gateW = 2.0;
    const gateH = totalH * 0.85;
    const gateZ = l * 0.5 - 1.2;
    const gap = 2.2;
    this.addBox(group, gateW, gateH * 0.6, 1.4, -gap * 0.5 - gateW * 0.5, plinthH + gateH * 0.3, gateZ, brickMat);
    this.addBox(group, gateW * 0.75, gateH * 0.4, 1.2, -gap * 0.5 - gateW * 0.5, plinthH + gateH * 0.8, gateZ, brickMat);
    this.addBox(group, gateW, gateH * 0.6, 1.4, gap * 0.5 + gateW * 0.5, plinthH + gateH * 0.3, gateZ, brickMat);
    this.addBox(group, gateW * 0.75, gateH * 0.4, 1.2, gap * 0.5 + gateW * 0.5, plinthH + gateH * 0.8, gateZ, brickMat);

    // 3. Multi-tiered Meru shrine tower at rear courtyard
    const meruBaseW = Math.min(w * 0.35, 5.0);
    const meruBaseL = Math.min(l * 0.35, 5.0);
    const meruBaseZ = -l * 0.22;
    this.addBox(group, meruBaseW, 2.0, meruBaseL, 0, plinthH + 1.0, meruBaseZ, teakMat);

    const tiers = 5;
    const meruRoofH = totalH - 2.0;
    const stepH = meruRoofH / tiers;
    for (let t = 0; t < tiers; t++) {
      const tw = meruBaseW * (1.3 - (t / tiers) * 0.8);
      const tl = meruBaseL * (1.3 - (t / tiers) * 0.8);
      const ty = plinthH + 2.0 + t * stepH;
      this.addBox(group, tw, stepH * 0.75, tl, 0, ty + stepH * 0.375, meruBaseZ, roofMat);
    }
    this.addCylinder(group, 0.05, 0.2, 0.8, 0, plinthH + 2.0 + meruRoofH + 0.4, meruBaseZ, goldMat);

    // 4. Padmasana stone shrines on sides
    for (const sx of [-w * 0.28, w * 0.28]) {
      this.addBox(group, 1.4, 2.5, 1.4, sx, plinthH + 1.25, -l * 0.15, stoneMat);
      this.addBox(group, 1.1, 0.8, 1.1, sx, plinthH + 2.9, -l * 0.15, goldMat);
    }
  }

  // 23. CATHEDRAL CHURCH (High Gothic Nave, Tall Bell Tower, Lancet Windows, Cross Apex)
  private static buildCathedralChurch(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const naveH = Math.max(bld.floorHeight || 7.5, 6.0);

    const stoneMat = this.getMaterial('stone');
    const plinthMat = this.getMaterial('stone_plinth');
    const slateMat = this.getMaterial('slate_tile');
    const glassMat = this.getMaterial('glass', '#0284c7');
    const frameMat = this.getMaterial('frame');

    // 1. Stone plinth
    const plinthH = 0.5;
    this.addBox(group, w + 0.6, plinthH, l + 0.6, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Main nave hall
    const naveW = w * 0.62;
    const naveL = l * 0.72;
    const naveZ = -l * 0.08;
    this.buildHollowPerimeterShell(group, naveW, naveH, naveL, plinthH, stoneMat, false);

    // Buttresses along side walls
    const bays = 4;
    const bayStep = naveL / bays;
    for (let b = 0; b <= bays; b++) {
      const bz = naveZ - naveL * 0.5 + b * bayStep;
      this.addBox(group, 0.6, naveH * 0.9, 0.6, -naveW * 0.5 - 0.3, plinthH + naveH * 0.45, bz, stoneMat);
      this.addBox(group, 0.6, naveH * 0.9, 0.6, naveW * 0.5 + 0.3, plinthH + naveH * 0.45, bz, stoneMat);
      if (b < bays) {
        const winZ = bz + bayStep * 0.5;
        this.addBox(group, 0.08, naveH * 0.5, 1.2, -naveW * 0.5, plinthH + naveH * 0.5, winZ, glassMat);
        this.addBox(group, 0.08, naveH * 0.5, 1.2, naveW * 0.5, plinthH + naveH * 0.5, winZ, glassMat);
      }
    }

    this.buildModernGableRoof(group, naveW + 1.2, naveL + 1.0, plinthH + naveH, 3.2, slateMat);

    // 3. Tall bell tower & spire at front facade
    const towerW = Math.min(w * 0.32, 6.0);
    const towerL = Math.min(l * 0.25, 6.0);
    const towerH = naveH * 1.85;
    const towerZ = l * 0.5 - towerL * 0.5;
    this.addBox(group, towerW, towerH, towerL, 0, plinthH + towerH * 0.5, towerZ, stoneMat);

    const spireH = 5.5;
    const spireBaseY = plinthH + towerH;
    this.addCylinder(group, 0.1, towerW * 0.55, spireH, 0, spireBaseY + spireH * 0.5, towerZ, slateMat);

    const crossY = spireBaseY + spireH + 0.6;
    this.addBox(group, 0.12, 1.4, 0.12, 0, crossY, towerZ, frameMat);
    this.addBox(group, 0.8, 0.12, 0.12, 0, crossY + 0.2, towerZ, frameMat);
  }

  // 24. VIHARA PAGODA (Multi-tier Pagoda, Sweeping Flared Roofs, Crimson Columns, Stupa)
  private static buildViharaPagoda(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const totalH = Math.max((bld.floorCount || 2) * (bld.floorHeight || 5.5), 9.0);

    const stoneMat = this.getMaterial('stone_plinth');
    const yellowMat = this.getMaterial('plaster', '#fef08a');
    const redMat = this.getMaterial('plaster', '#b91c1c');
    const roofMat = this.getMaterial('clay_tile');
    const goldMat = this.getMaterial('plaster', '#eab308');

    // 1. Stepped lotus plinth
    const plinthH = 0.6;
    this.addBox(group, w, plinthH, l, 0, plinthH * 0.5, 0, stoneMat);

    // 2. Multi-tier Pagoda (3 tiers receding upwards)
    const tiers = 3;
    const tierH = totalH / tiers;
    for (let t = 0; t < tiers; t++) {
      const scale = 1.0 - t * 0.22;
      const tw = w * 0.75 * scale;
      const tl = l * 0.75 * scale;
      const ty = plinthH + t * tierH;

      this.addBox(group, tw, tierH * 0.65, tl, 0, ty + tierH * 0.325, 0, yellowMat);

      for (const [cx, cz] of [[-tw * 0.5, -tl * 0.5], [tw * 0.5, -tl * 0.5], [-tw * 0.5, tl * 0.5], [tw * 0.5, tl * 0.5]]) {
        this.addCylinder(group, 0.18, 0.22, tierH * 0.7, cx, ty + tierH * 0.35, cz, redMat);
      }

      const rw = tw + 1.8;
      const rl = tl + 1.8;
      this.buildModernHipRoof(group, rw, rl, ty + tierH * 0.65, 1.4, roofMat);
    }

    // 3. Ornate gold stupa pinnacle at top apex
    const apexY = plinthH + totalH + 0.8;
    this.addCylinder(group, 0.08, 0.45, 2.0, 0, apexY + 1.0, 0, goldMat);
    this.addBox(group, 0.4, 0.4, 0.4, 0, apexY + 2.2, 0, goldMat);
  }

  // 25. KLENTENG TRADITIONAL (Swallowtail Yanwei Roofs, Dragon Ridges, Red Colonnade, Lanterns)
  private static buildKlentengTraditional(
    group: THREE.Group,
    bld: BuildingInstance,
    item?: BuildingCatalogItem
  ): void {
    const w = bld.width;
    const l = bld.length;
    const h = Math.max(bld.floorHeight || 5.8, 5.0);

    const plinthMat = this.getMaterial('stone_plinth');
    const redMat = this.getMaterial('plaster', '#b91c1c');
    const goldMat = this.getMaterial('plaster', '#eab308');
    const roofMat = this.getMaterial('clay_tile');

    // 1. Terraced stone plinth with dragon-carved entrance steps
    const plinthH = 0.55;
    this.addBox(group, w, plinthH, l, 0, plinthH * 0.5, 0, plinthMat);

    // 2. Main prayer hall
    const hallW = w * 0.78;
    const hallL = l * 0.72;
    const hallZ = -l * 0.06;
    this.buildHollowPerimeterShell(group, hallW, h, hallL, plinthH, redMat, true, 2.8, 3.2);

    // 3. Colonnaded front porch supported by vibrant red columns
    const porchZ = l * 0.5 - 1.2;
    for (const px of [-hallW * 0.4, -hallW * 0.14, hallW * 0.14, hallW * 0.4]) {
      this.addCylinder(group, 0.35, 0.42, 0.4, px, plinthH + 0.2, porchZ, plinthMat);
      this.addCylinder(group, 0.22, 0.25, h - 0.4, px, plinthH + 0.4 + (h - 0.4) * 0.5, porchZ, redMat);
      this.addBox(group, 0.6, 0.25, 0.6, px, plinthH + h - 0.12, porchZ, goldMat);
    }

    // 4. Traditional Yanwei (swallowtail curved roof)
    const rw = hallW + 2.4;
    const rl = hallL + 2.2;
    this.buildModernHipRoof(group, rw, rl, plinthH + h, 2.2, roofMat);

    // Upturned sweeping ridge crest with twin dragon ornaments
    const ridgeY = plinthH + h + 2.2;
    this.addBox(group, rw * 0.7, 0.35, 0.3, 0, ridgeY, hallZ, goldMat);
    this.addBox(group, 0.35, 0.8, 0.3, -rw * 0.35, ridgeY + 0.35, hallZ, goldMat, 0, 0, 0.4);
    this.addBox(group, 0.35, 0.8, 0.3, rw * 0.35, ridgeY + 0.35, hallZ, goldMat, 0, 0, -0.4);
    this.addCylinder(group, 0.25, 0.25, 0.5, 0, ridgeY + 0.45, hallZ, redMat);

    // 5. Hanging red lanterns at front veranda
    for (const lx of [-hallW * 0.27, hallW * 0.27]) {
      this.addCylinder(group, 0.3, 0.25, 0.6, lx, plinthH + h - 0.8, porchZ, redMat);
      this.addBox(group, 0.1, 0.2, 0.1, lx, plinthH + h - 1.2, porchZ, goldMat);
    }
  }

  // Roof Builders (Modularized to RoofMeshBuilder)
  private static buildShedRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    RoofMeshBuilder.buildShedRoof(group, rw, rl, baseY, roofH, roofMat);
  }

  private static buildSawtoothRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    teethCount: number = 3,
    roofMat: THREE.Material,
    glassMat: THREE.Material
  ): void {
    RoofMeshBuilder.buildSawtoothRoof(group, rw, rl, baseY, roofH, teethCount, roofMat, glassMat);
  }

  private static buildArchedVaultRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    vaultH: number,
    roofMat: THREE.Material
  ): void {
    RoofMeshBuilder.buildArchedVaultRoof(group, rw, rl, baseY, vaultH, roofMat);
  }

  private static buildButterflyRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    roofH: number,
    roofMat: THREE.Material
  ): void {
    RoofMeshBuilder.buildButterflyRoof(group, rw, rl, baseY, roofH, roofMat);
  }

  // Primitive helpers
  private static addBox(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rotX: number = 0,
    rotY: number = 0,
    rotZ: number = 0
  ): THREE.Mesh {
    const geom = new THREE.BoxGeometry(w, h, d);

    // Tahap 4: World-Space UV Scaling (1 unit UV = 1.5 meters)
    const uv = geom.attributes.uv;
    if (uv) {
      const uvScale = 1.5;
      const dims = [
        [d, h], // +X
        [d, h], // -X
        [w, d], // +Y
        [w, d], // -Y
        [w, h], // +Z
        [w, h]  // -Z
      ];
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

    if (rotX || rotY || rotZ) {
      geom.rotateX(rotX);
      geom.rotateY(rotY);
      geom.rotateZ(rotZ);
    }
    geom.translate(x, y, z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  private static addCylinder(
    group: THREE.Group,
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const geom = new THREE.CylinderGeometry(rt, rb, h, 16);
    geom.translate(x, y, z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }
}
