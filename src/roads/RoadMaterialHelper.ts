import * as THREE from 'three';
import { RoadType, RoadNode } from './RoadTypes';
import { RoadGraph } from './RoadGraph';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { ProceduralTextureGen } from '../materials/ProceduralTextureGen';

export interface RoadMaterialConfig {
  type: RoadType;
  surfaceMaterialKey: string;
  hasCenterMarking: boolean;
  centerMarkingType: 'dashed' | 'double_solid' | 'none';
  centerMarkingColor: number;
  hasEdgeMarking: boolean;
  edgeMarkingColor: number;
  previewColor: number;
}

export const ROAD_MATERIAL_CONFIGS: Record<RoadType, RoadMaterialConfig> = {
  arterial: {
    type: 'arterial',
    surfaceMaterialKey: 'road_asphalt',
    hasCenterMarking: true,
    centerMarkingType: 'double_solid',
    centerMarkingColor: 0xf59e0b, // Kuning cerah ganda
    hasEdgeMarking: true,
    edgeMarkingColor: 0xffffff,
    previewColor: 0xffffff,
  },
  collector: {
    type: 'collector',
    surfaceMaterialKey: 'road_asphalt',
    hasCenterMarking: true,
    centerMarkingType: 'dashed',
    centerMarkingColor: 0xf59e0b, // Kuning putus-putus
    hasEdgeMarking: true,
    edgeMarkingColor: 0xffffff,
    previewColor: 0xffffff,
  },
  local: {
    type: 'local',
    surfaceMaterialKey: 'road_asphalt',
    hasCenterMarking: true,
    centerMarkingType: 'dashed',
    centerMarkingColor: 0xffffff, // Putih putus-putus
    hasEdgeMarking: true,
    edgeMarkingColor: 0xffffff,
    previewColor: 0xffffff,
  },
  alley: {
    type: 'alley',
    surfaceMaterialKey: 'road_alley',
    hasCenterMarking: false,
    centerMarkingType: 'none',
    centerMarkingColor: 0xffffff,
    hasEdgeMarking: true,
    edgeMarkingColor: 0xe2e8f0,
    previewColor: 0x334155,
  },
  cycle: {
    type: 'cycle',
    surfaceMaterialKey: 'cycle_track',
    hasCenterMarking: true,
    centerMarkingType: 'dashed',
    centerMarkingColor: 0xffffff,
    hasEdgeMarking: true,
    edgeMarkingColor: 0xffffff,
    previewColor: 0x166534, // Hijau arsitektural
  },
  pedestrian: {
    type: 'pedestrian',
    surfaceMaterialKey: 'sidewalk_paving',
    hasCenterMarking: false,
    centerMarkingType: 'none',
    centerMarkingColor: 0xffffff,
    hasEdgeMarking: false,
    edgeMarkingColor: 0xffffff,
    previewColor: 0xd1d5db, // Paving ubin
  },
};

export class RoadMaterialHelper {
  private static previewMaterialsCache: Map<string, THREE.Material> = new Map();
  private static invalidPreviewMaterial: THREE.MeshBasicMaterial | null = null;

  public static getConfig(type: RoadType): RoadMaterialConfig {
    return ROAD_MATERIAL_CONFIGS[type] || ROAD_MATERIAL_CONFIGS.local;
  }

  /**
   * Mengambil material permukaan jalan permanen (PBR) sesuai tipe jalannya
   */
  public static getRoadSurfaceMaterial(type: RoadType): THREE.MeshStandardMaterial {
    const config = this.getConfig(type);
    const mat = MaterialLibrary.get(config.surfaceMaterialKey);
    mat.side = THREE.DoubleSide;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;
    return mat;
  }

  /**
   * Mengambil material untuk persimpangan jalan berdasarkan ruas-ruas yang terhubung
   */
  public static getIntersectionMaterial(node: RoadNode, graph: RoadGraph): THREE.MeshStandardMaterial {
    let hasVehicular = false;
    let hasCycle = false;
    let hasPedestrian = false;
    let hasAlley = false;

    for (const edgeId of node.connectedEdgeIds) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;
      if (edge.type === 'pedestrian') hasPedestrian = true;
      else if (edge.type === 'cycle') hasCycle = true;
      else if (edge.type === 'alley') hasAlley = true;
      else hasVehicular = true;
    }

    let materialKey = 'road_asphalt';
    if (!hasVehicular && !hasAlley) {
      if (hasCycle && !hasPedestrian) {
        materialKey = 'cycle_track';
      } else if (hasPedestrian && !hasCycle) {
        materialKey = 'sidewalk_paving';
      }
    } else if (!hasVehicular && hasAlley) {
      materialKey = 'road_alley';
    }

    const mat = MaterialLibrary.get(materialKey);
    mat.side = THREE.DoubleSide;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;
    return mat;
  }

  /**
   * Mengambil material ghost preview transparan yang konsisten dengan tipe jalan
   */
  public static getPreviewMaterial(type: RoadType, isValid: boolean): THREE.Material {
    if (!isValid) {
      if (!this.invalidPreviewMaterial) {
        this.invalidPreviewMaterial = new THREE.MeshBasicMaterial({
          color: 0xff3b30,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
      }
      return this.invalidPreviewMaterial;
    }

    const cacheKey = `preview_${type}`;
    if (this.previewMaterialsCache.has(cacheKey)) {
      return this.previewMaterialsCache.get(cacheKey)!;
    }

    let tex: THREE.Texture;
    let color: number = 0xffffff;

    if (type === 'pedestrian') {
      tex = ProceduralTextureGen.getPavingTexture(512);
      color = 0xffffff;
    } else if (type === 'cycle') {
      tex = ProceduralTextureGen.getAsphaltTexture(512);
      color = 0x166534;
    } else if (type === 'alley') {
      tex = ProceduralTextureGen.getAsphaltTexture(512);
      color = 0x334155;
    } else {
      tex = ProceduralTextureGen.getAsphaltTexture(512);
      color = 0xffffff;
    }

    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      color,
      roughness: 0.88,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.previewMaterialsCache.set(cacheKey, mat);
    return mat;
  }
}
