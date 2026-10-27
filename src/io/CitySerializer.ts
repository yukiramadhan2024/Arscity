import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { RoadType, RoadEdge, RoadNode } from '../roads/RoadTypes';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { CustomBuilding, FloorDefinition, RoofDefinition, WallSegment } from '../buildings/CustomBuildingModel';
import { CustomBuildingMeshBuilder } from '../buildings/CustomBuildingMeshBuilder';
import { LotParcel, ZoneType } from '../zones/ZoneTypes';
import { WeatherType } from '../world/WeatherSystem';

export interface SerializedRoadNode {
  id: string;
  x: number;
  y: number;
  z: number;
  connectedEdgeIds: string[];
}

export interface SerializedRoadEdge {
  id: string;
  startNodeId: string;
  endNodeId: string;
  type: RoadType;
  controlPoints: [number, number, number][];
  length: number;
  customProfile?: {
    hasTrees?: boolean;
    hasStreetLights?: boolean;
  };
}

export interface SerializedBuilding {
  id: string;
  presetKey: string;
  name: string;
  category: string;
  position: [number, number, number];
  rotationY: number;
  width: number;
  length: number;
  floorCount: number;
  floorHeight: number;
  roofType: string;
  roofOverhang: number;
  wallMaterial: string;
  wallColor: string;
  roofMaterial: string;
  lotId?: string;
  isCustom?: boolean;
  footprintPolygon?: [number, number][]; // optional polygon for non-rectangular prefabs
  floors?: any[];
  customRoof?: any;
  archetype?: string;
  hasSolarPV?: boolean;
  customColor?: string;
  wallTexture?: string;
  interiorVariant?: string;
  massingShape?: string;
  windowStyle?: string;
  hasBalcony?: boolean;
  hasSunLouvers?: boolean;
  hasVerticalGarden?: boolean;
  hasFrontArcade?: boolean;
  useBasePlinthMaterial?: boolean;
  baseMaterial?: string;
  mullionColor?: string;
  hasSkylight?: boolean;
  placedFurniture?: any[];
  floorMaterial?: string;
}

export interface SerializedCustomBuilding {
  id: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  plinthHeight: number;
  floors: {
    floorIndex: number;
    height: number;
    footprint: [number, number][];
    walls: {
      wallIndex: number;
      openings: {
        id: string;
        type: string;
        positionRatio: number;
        width: number;
        height: number;
        sillHeight: number;
      }[];
    }[];
  }[];
  roof: {
    type: string;
    pitchAngle: number;
    overhang: number;
    material: string;
  };
  wallMaterial: string;
  wallColor: string;
  lotId?: string;
  massingShape?: string;
  windowStyle?: string;
  hasBalcony?: boolean;
  hasSunLouvers?: boolean;
  hasVerticalGarden?: boolean;
  hasFrontArcade?: boolean;
  useBasePlinthMaterial?: boolean;
  baseMaterial?: string;
  mullionColor?: string;
  hasSkylight?: boolean;
}

export interface SerializedLot {
  id: string;
  name: string;
  zone: ZoneType;
  position: [number, number, number];
  width: number;
  length: number;
  areaM2: number;
  gsbDistanceM?: number;
  polygon?: [number, number][];
}

export interface SerializedLandscapeItem {
  id: string;
  type: string;
  position: [number, number, number];
  scale?: number;
  width?: number;
  length?: number;
  radius?: number;
  rotationY?: number;
}

export interface SerializedDisplaySettings {
  themeMode?: string;
  graphicsQuality?: string;
  glassOpacity?: number;
  textScale?: number;
}

export interface CitySaveData {
  version: string;
  cityTitle: string;
  timestamp: number;
  environment: {
    timeOfDay: number;
    dayOfYear: number;
    weather: WeatherType;
  };
  roads: {
    nodes: SerializedRoadNode[];
    edges: SerializedRoadEdge[];
  };
  buildings: SerializedBuilding[];
  customBuildings?: SerializedCustomBuilding[];
  lots: SerializedLot[];
  landscape?: SerializedLandscapeItem[];
  displaySettings?: SerializedDisplaySettings;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DeserializationResult {
  success: boolean;
  error?: string;
}

export class CitySerializer {
  public static readonly CURRENT_VERSION = '2.0.0';

  /**
   * Migrate old versions sequentially up to CURRENT_VERSION
   */
  public static migrateCityData(data: any): CitySaveData {
    if (!data || typeof data !== 'object') {
      throw new Error('Data kota tidak berbentuk objek JSON yang sah.');
    }

    const version = data.version || '1.0.0';

    // Clone data for migration
    const migrated: CitySaveData = {
      version: CitySerializer.CURRENT_VERSION,
      cityTitle: typeof data.cityTitle === 'string' ? data.cityTitle : 'Kota Tropis Mandiri',
      timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
      environment: {
        timeOfDay: data.environment?.timeOfDay ?? 11.5,
        dayOfYear: data.environment?.dayOfYear ?? 172,
        weather: data.environment?.weather ?? 'sunny',
      },
      roads: {
        nodes: Array.isArray(data.roads?.nodes) ? data.roads.nodes : [],
        edges: Array.isArray(data.roads?.edges) ? data.roads.edges : [],
      },
      buildings: Array.isArray(data.buildings) ? data.buildings : [],
      customBuildings: Array.isArray(data.customBuildings) ? data.customBuildings : [],
      lots: Array.isArray(data.lots) ? data.lots : [],
      landscape: Array.isArray(data.landscape) ? data.landscape : [],
      displaySettings: data.displaySettings || {},
    };

    // v1.0.0 -> v2.0.0: Ensure custom buildings, lots GSB, and landscape arrays exist
    if (version === '1.0.0') {
      migrated.customBuildings = migrated.customBuildings || [];
      migrated.landscape = migrated.landscape || [];
      migrated.lots.forEach((lot) => {
        if (lot.gsbDistanceM === undefined) {
          lot.gsbDistanceM = 3.5;
        }
      });
    }

    return migrated;
  }

  /**
   * Validate entire city data structure before any modifications to the scene
   */
  public static validateCityData(rawData: unknown): ValidationResult {
    const errors: string[] = [];

    if (!rawData || typeof rawData !== 'object') {
      return { valid: false, errors: ['Format data bukan objek JSON yang valid.'] };
    }

    const data = rawData as any;

    if (!data.roads || typeof data.roads !== 'object') {
      errors.push('Struktur data jalan (roads) tidak ditemukan.');
    } else {
      if (!Array.isArray(data.roads.nodes)) {
        errors.push('Data nodes jalan harus berupa array.');
      }
      if (!Array.isArray(data.roads.edges)) {
        errors.push('Data edges jalan harus berupa array.');
      }
    }

    if (!Array.isArray(data.buildings)) {
      errors.push('Data bangunan prefab (buildings) harus berupa array.');
    }

    if (!Array.isArray(data.lots)) {
      errors.push('Data kavling (lots) harus berupa array.');
    }

    // Check node IDs and edge references
    if (Array.isArray(data.roads?.nodes) && Array.isArray(data.roads?.edges)) {
      const nodeIds = new Set<string>();
      data.roads.nodes.forEach((n: any, idx: number) => {
        if (!n.id || typeof n.id !== 'string') {
          errors.push(`Node #${idx} tidak memiliki id string yang valid.`);
        } else {
          nodeIds.add(n.id);
        }
        if (typeof n.x !== 'number' || typeof n.y !== 'number' || typeof n.z !== 'number' || !isFinite(n.x)) {
          errors.push(`Node [${n.id || idx}] memiliki koordinat yang tidak valid.`);
        }
      });

      data.roads.edges.forEach((e: any, idx: number) => {
        if (!e.id) errors.push(`Edge #${idx} tidak memiliki id.`);
        if (!nodeIds.has(e.startNodeId)) {
          errors.push(`Edge [${e.id}] merujuk startNodeId [${e.startNodeId}] yang tidak terdaftar.`);
        }
        if (!nodeIds.has(e.endNodeId)) {
          errors.push(`Edge [${e.id}] merujuk endNodeId [${e.endNodeId}] yang tidak terdaftar.`);
        }
      });
    }

    // Check buildings
    if (Array.isArray(data.buildings)) {
      data.buildings.forEach((b: any, idx: number) => {
        if (!b.id) errors.push(`Bangunan #${idx} tidak memiliki id.`);
        if (!Array.isArray(b.position) || b.position.length !== 3 || !b.position.every(isFinite)) {
          errors.push(`Bangunan [${b.id || idx}] memiliki posisi tidak valid.`);
        }
        if (typeof b.width !== 'number' || b.width <= 0 || typeof b.length !== 'number' || b.length <= 0) {
          errors.push(`Bangunan [${b.id || idx}] memiliki dimensi tidak valid.`);
        }
      });
    }

    // Check lots
    if (Array.isArray(data.lots)) {
      data.lots.forEach((l: any, idx: number) => {
        if (!l.id) errors.push(`Kavling #${idx} tidak memiliki id.`);
        if (!Array.isArray(l.position) || l.position.length !== 3 || !l.position.every(isFinite)) {
          errors.push(`Kavling [${l.id || idx}] memiliki posisi tidak valid.`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Serialize current engine state into a validated CitySaveData object
   */
  public static serialize(engine: Engine, cityTitle: string = 'Kota Tropis Mandiri'): CitySaveData {
    // 1. Roads
    const nodes: SerializedRoadNode[] = [];
    engine.roadManager.graph.nodes.forEach((node: RoadNode) => {
      nodes.push({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        z: node.position.z,
        connectedEdgeIds: [...node.connectedEdgeIds],
      });
    });

    const edges: SerializedRoadEdge[] = [];
    engine.roadManager.graph.edges.forEach((edge: RoadEdge) => {
      edges.push({
        id: edge.id,
        startNodeId: edge.startNodeId,
        endNodeId: edge.endNodeId,
        type: edge.type,
        controlPoints: edge.controlPoints.map((cp) => [cp.x, cp.y, cp.z]),
        length: edge.length,
        customProfile: edge.customProfile
          ? {
              hasTrees: edge.customProfile.hasTrees,
              hasStreetLights: edge.customProfile.hasStreetLights,
            }
          : undefined,
      });
    });

    // 2. Prefab Buildings
    const buildings: SerializedBuilding[] = [];
    engine.buildingManager.buildings.forEach((building: BuildingInstance) => {
      buildings.push({
        id: building.id,
        presetKey: building.presetKey,
        name: building.name,
        category: building.category,
        position: [building.position.x, building.position.y, building.position.z],
        rotationY: building.rotationY,
        width: building.width,
        length: building.length,
        floorCount: building.floorCount,
        floorHeight: building.floorHeight,
        roofType: building.roofType,
        roofOverhang: building.roofOverhang,
        wallMaterial: building.wallMaterial,
        wallColor: building.wallColor,
        roofMaterial: building.roofMaterial,
        lotId: building.lotId,
        isCustom: building.isCustom,
        footprintPolygon: building.footprintPolygon?.map((p) => [p.x, p.y]),
        floors: building.floors?.map((fl) => ({
          floorIndex: fl.floorIndex,
          height: fl.height,
          footprint: fl.footprint.map((p) => [p.x, p.y]),
          walls: fl.walls,
        })),
        customRoof: building.customRoof as any,
        archetype: building.archetype,
        hasSolarPV: building.hasSolarPV,
        customColor: building.customColor,
        wallTexture: building.wallTexture,
        massingShape: building.massingShape,
        windowStyle: building.windowStyle,
        hasBalcony: building.hasBalcony,
        hasSunLouvers: building.hasSunLouvers,
        hasVerticalGarden: building.hasVerticalGarden,
        hasFrontArcade: building.hasFrontArcade,
        useBasePlinthMaterial: building.useBasePlinthMaterial,
        baseMaterial: building.baseMaterial,
        mullionColor: building.mullionColor,
        hasSkylight: building.hasSkylight,
        placedFurniture: building.userData?.placedFurniture || [],
        floorMaterial: building.userData?.floorMaterial,
      });
    });

    const customBuildings: SerializedCustomBuilding[] = [];

    // 4. Landscapes
    const landscape: SerializedLandscapeItem[] = [];
    if (engine.landscapeManager?.items) {
      engine.landscapeManager.items.forEach((item) => {
        landscape.push({
          id: item.id,
          type: item.type as any,
          position: [item.position.x, item.position.y, item.position.z],
          scale: item.width,
          width: item.width,
          length: item.length,
          radius: item.radius,
          rotationY: item.rotationY,
        });
      });
    }

    // 5. Lots
    const lots: SerializedLot[] = [];
    engine.lotManager.lots.forEach((lot: LotParcel) => {
      lots.push({
        id: lot.id,
        name: lot.name,
        zone: lot.zone,
        position: [lot.position.x, lot.position.y, lot.position.z],
        width: lot.width,
        length: lot.length,
        areaM2: lot.areaM2,
        gsbDistanceM: lot.metrics?.gsbDistanceM ?? 3.5,
      });
    });

    return {
      version: CitySerializer.CURRENT_VERSION,
      cityTitle,
      timestamp: Date.now(),
      environment: {
        timeOfDay: engine.lightingSystem.currentHour,
        dayOfYear: engine.lightingSystem.currentDayOfYear,
        weather: engine.weatherSystem.currentWeather,
      },
      roads: { nodes, edges },
      buildings,
      customBuildings,
      lots,
      landscape,
      displaySettings: {},
    };
  }

  public static serializeCity(engine: Engine, cityTitle: string = 'Kota Tropis Mandiri'): CitySaveData {
    return this.serialize(engine, cityTitle);
  }

  public static deserializeCity(engine: Engine, rawData: unknown): DeserializationResult {
    return this.deserialize(engine, rawData);
  }

  /**
   * Atomic Deserialization: Validates and prepares entire new state BEFORE
   * touching or clearing existing scene objects.
   */
  public static deserialize(engine: Engine, rawData: unknown): DeserializationResult {
    // Step 1: Pre-validation
    const valResult = this.validateCityData(rawData);
    if (!valResult.valid) {
      const errText = `Validasi data kota gagal: ${valResult.errors.slice(0, 3).join('; ')}`;
      console.error('[CitySerializer] Validation failed:', valResult.errors);
      return { success: false, error: errText };
    }

    // Step 2: Migration
    let data: CitySaveData;
    try {
      data = this.migrateCityData(rawData);
    } catch (err: any) {
      return { success: false, error: `Gagal migrasi format kota: ${err?.message || 'Error tidak diketahui'}` };
    }

    // Step 3: Atomic reconstruction
    try {
      // Clear current scene objects only after validation succeeds
      // 1. Remove all buildings
      const buildingIds = Array.from(engine.buildingManager.buildings.keys());
      buildingIds.forEach((id) => engine.buildingManager.removeBuilding(id));

      // All buildings (including custom) are managed cleanly by buildingManager

      // 2. Remove all lots
      const lotIds = Array.from(engine.lotManager.lots.keys());
      lotIds.forEach((id) => engine.lotManager.removeLot(id));

      // 2b. Remove all landscape items
      if (engine.landscapeManager) {
        const landIds = Array.from(engine.landscapeManager.items.keys());
        landIds.forEach((id) => engine.landscapeManager.removeItem(id));
      }

      // 3. Remove all roads
      const roadIds = Array.from(engine.roadManager.graph.edges.keys());
      roadIds.forEach((id) => engine.roadManager.removeRoad(id));
      engine.roadManager.graph.nodes.clear();
      engine.roadManager.graph.edges.clear();

      // Reconstruct Roads
      data.roads.nodes.forEach((n) => {
        engine.roadManager.graph.nodes.set(n.id, {
          id: n.id,
          position: new THREE.Vector3(n.x, n.y, n.z),
          connectedEdgeIds: [...n.connectedEdgeIds],
        });
      });

      data.roads.edges.forEach((e) => {
        let cps = e.controlPoints.map((cp) => new THREE.Vector3(cp[0], cp[1], cp[2]));
        if (cps.length === 2) {
          const cp1 = new THREE.Vector3().lerpVectors(cps[0], cps[1], 0.33);
          const cp2 = new THREE.Vector3().lerpVectors(cps[0], cps[1], 0.67);
          cps = [cps[0], cp1, cp2, cps[1]];
        }
        const edge: RoadEdge = {
          id: e.id,
          startNodeId: e.startNodeId,
          endNodeId: e.endNodeId,
          type: e.type,
          controlPoints: cps,
          length: e.length,
          customProfile: e.customProfile,
        };
        engine.roadManager.graph.edges.set(e.id, edge);
        engine.roadManager.rebuildEdgeMesh(e.id);
      });

      data.roads.nodes.forEach((n) => {
        engine.roadManager.rebuildNodeIntersections(n.id);
      });

      // Reconstruct Lots
      data.lots.forEach((l) => {
        const parcel: LotParcel = {
          id: l.id,
          name: l.name,
          zone: l.zone,
          position: new THREE.Vector3(l.position[0], l.position[1], l.position[2]),
          width: l.width,
          length: l.length,
          areaM2: l.areaM2,
          containedBuildingIds: [],
          metrics: {
            groundFootprintM2: 0,
            totalFloorAreaM2: 0,
            greenAreaM2: 0,
            pavedAreaM2: l.areaM2,
            kdbPercent: 0,
            klbRatio: 0,
            kdhPercent: 0,
            gsbFrontActualM: l.gsbDistanceM ?? 3.5,
            gsbSideActualM: 3.0,
            gsbRearActualM: 3.0,
            gsbDistanceM: l.gsbDistanceM ?? 3.5,
            maxFloors: 0,
          },
          violations: [],
        };
        engine.lotManager.lots.set(l.id, parcel);
        engine.lotManager.rebuildLotMesh(parcel);
      });

      // Reconstruct Buildings (Prefabs & Custom Buildings unified)
      data.buildings.forEach((b: any) => {
        const instance: BuildingInstance = {
          id: b.id,
          presetKey: b.presetKey,
          name: b.name,
          category: b.category as 'residential' | 'commercial' | 'public',
          position: new THREE.Vector3(b.position[0], b.position[1], b.position[2]),
          rotationY: b.rotationY,
          width: b.width,
          length: b.length,
          floorCount: b.floorCount,
          floorHeight: b.floorHeight,
          roofType: b.roofType as BuildingInstance['roofType'],
          roofOverhang: b.roofOverhang,
          wallMaterial: b.wallMaterial as BuildingInstance['wallMaterial'],
          wallColor: b.wallColor,
          roofMaterial: b.roofMaterial as BuildingInstance['roofMaterial'],
          lotId: b.lotId,
          isCustom: b.isCustom,
          footprintPolygon: b.footprintPolygon?.map((p: any) => new THREE.Vector2(p[0], p[1])),
          floors: b.floors?.map((fl: any) => ({
            floorIndex: fl.floorIndex,
            height: fl.height,
            footprint: fl.footprint.map((p: any) => new THREE.Vector2(p[0], p[1])),
            walls: fl.walls || [],
          })),
          customRoof: b.customRoof,
          archetype: b.archetype,
          hasSolarPV: b.hasSolarPV,
          customColor: b.customColor,
          wallTexture: b.wallTexture,
          massingShape: b.massingShape,
          windowStyle: b.windowStyle,
          hasBalcony: b.hasBalcony,
          hasSunLouvers: b.hasSunLouvers,
          hasVerticalGarden: b.hasVerticalGarden,
          hasFrontArcade: b.hasFrontArcade,
          useBasePlinthMaterial: b.useBasePlinthMaterial,
          baseMaterial: b.baseMaterial,
          mullionColor: b.mullionColor,
          hasSkylight: b.hasSkylight,
          userData: {
            placedFurniture: b.placedFurniture || [],
            floorMaterial: b.floorMaterial
          }
        };
        engine.buildingManager.addBuilding(instance);
      });

      // Backward-compatibility: Reconstruct Legacy Custom Buildings if present
      if (data.customBuildings && data.customBuildings.length > 0) {
        data.customBuildings.forEach((cb) => {
          if (!engine.buildingManager.buildings.has(cb.id)) {
            const instance: BuildingInstance = {
              id: cb.id,
              presetKey: 'custom',
              name: cb.name,
              category: 'residential',
              position: new THREE.Vector3(cb.position[0], cb.position[1], cb.position[2]),
              rotationY: cb.rotationY,
              width: 10,
              length: 10,
              floorCount: cb.floors.length || 1,
              floorHeight: cb.floors[0]?.height || 3.2,
              roofType: cb.roof?.type as any || 'hip',
              roofOverhang: cb.roof?.overhang || 1.2,
              wallMaterial: cb.wallMaterial as any || 'plaster',
              wallColor: cb.wallColor || '#f8fafc',
              roofMaterial: 'clay_tile',
              isCustom: true,
              footprintPolygon: cb.floors[0]?.footprint?.map((pt) => new THREE.Vector2(pt[0], pt[1])),
              floors: cb.floors.map((fl) => ({
                floorIndex: fl.floorIndex,
                height: fl.height,
                footprint: fl.footprint.map((pt) => new THREE.Vector2(pt[0], pt[1])),
                walls: fl.walls as any,
              })),
              customRoof: cb.roof as any,
              massingShape: cb.massingShape,
              windowStyle: cb.windowStyle,
              hasBalcony: cb.hasBalcony,
              hasSunLouvers: cb.hasSunLouvers,
              hasVerticalGarden: cb.hasVerticalGarden,
              hasFrontArcade: cb.hasFrontArcade,
              useBasePlinthMaterial: cb.useBasePlinthMaterial,
              baseMaterial: cb.baseMaterial,
              mullionColor: cb.mullionColor,
              hasSkylight: cb.hasSkylight,
            };
            engine.buildingManager.addBuilding(instance);
          }
        });
      }

      // Restore Landscapes
      if (data.landscape && engine.landscapeManager) {
        data.landscape.forEach((item) => {
          engine.landscapeManager.addItem({
            id: item.id,
            type: item.type as any,
            position: new THREE.Vector3(item.position[0], item.position[1], item.position[2]),
            width: item.width ?? item.scale,
            length: item.length ?? item.scale,
            radius: item.radius,
            rotationY: item.rotationY,
          });
        });
      }

      // Restore Environment
      if (data.environment) {
        engine.setTimeOfDay(data.environment.timeOfDay, data.environment.dayOfYear);
        engine.setWeather(data.environment.weather);
      }

      // Evaluate lots & missions
      engine.lotManager.evaluateAllLots();
      engine.missionManager?.evaluate();

      return { success: true };
    } catch (err: any) {
      console.error('[CitySerializer] Deserialization error:', err);
      return {
        success: false,
        error: `Terjadi galat saat merekonstruksi objek kota: ${err?.message || 'Error tidak diketahui'}`,
      };
    }
  }
}
