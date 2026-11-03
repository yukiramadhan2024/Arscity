import * as THREE from 'three';
import { Engine } from '../engine/Engine';
import { ICommand } from './CommandManager';
import { RoadType, RoadEdge, RoadProfile, ROAD_PROFILES } from '../../roads/RoadTypes';
import { BuildingInstance } from '../../buildings/PrefabTypes';
import { LotParcel, ZoneType } from '../../zones/ZoneTypes';
import { LandscapeItem } from '../../world/LandscapeManager';
import { showSnackbar } from '../../ui/state/useSnackbarStore';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { FIRST_PERSON_MATERIAL_PALETTE } from '../../buildings/FirstPersonFurnitureCatalog';

function formatLandscapeTitle(type: string): string {
  const titles: Record<string, string> = {
    tree_tabebuya_pink: 'Pohon Tabebuya Pink',
    tree_tabebuya_gold: 'Pohon Tabebuya Emas',
    tree_flamboyan: 'Pohon Flamboyan',
    tree_frangipani: 'Pohon Kamboja',
    tree_banyan_kurung: 'Beringin Kurung',
    tree_asam_jawa: 'Pohon Asam Jawa',
    shade_tree: 'Pohon Peneduh',
    tree: 'Pohon Tropis',
    grass_garden: 'Taman Rumput',
    paving_block: 'Paving Block',
    river_segment: 'Alur Sungai',
    retention_pond: 'Kolam Retensi Banjir',
    bioswale_channel: 'Bioswale Alami',
    biopore: 'Lubang Biopori',
    well: 'Sumur Resapan',
    flora_bougainvillea_arch: 'Lengkung Bugenvil',
    flora_yellow_bamboo: 'Bambu Kuning',
    flora_lotus_water: 'Kolam Teratai',
    monument_tugu_jogja: 'Monumen Tugu',
    sculpture_kinetic_steel: 'Patung Kinetik',
    sculpture_candi_stone: 'Patung Batu Candi',
    sculpture_wayang_corten: 'Seni Wayang Corten',
    fountain_reflecting_pool: 'Kolam Refleksi',
    monument_clock_tower: 'Menara Jam Kota',
    street_malioboro_bollards: 'Bollard Malioboro',
    street_festoon_lights: 'Lampu Gantung Hias',
    street_timber_pergola: 'Pergola Kayu',
    gate_candi_bentar: 'Gapura Candi Bentar',
    street_garden_lanterns: 'Lentera Taman',
    plaza_mini_amphitheater: 'Mini Amfiteater',
    waterfront_wood_deck: 'Dermaga Kayu',
    bridge_green_pedestrian: 'Jembatan Pejalan Kaki',
    pavilion_garden_gazebo: 'Gazebo Taman',
  };
  return titles[type] || 'Lansekap';
}

function getLandscapeDetail(type: string): string {
  if (type.startsWith('tree_') || type === 'shade_tree' || type === 'tree') {
    const cooling: Record<string, string> = {
      tree_tabebuya_pink: 'Pendinginan -2.0°C',
      tree_tabebuya_gold: 'Pendinginan -2.0°C',
      tree_flamboyan: 'Pendinginan -2.5°C',
      tree_frangipani: 'Pendinginan -1.5°C',
      tree_banyan_kurung: 'Pendinginan -3.0°C',
      tree_asam_jawa: 'Pendinginan -2.2°C',
    };
    return cooling[type] || 'Pendinginan -2.0°C';
  }
  if (type === 'biopore') return 'Infiltrasi Air Hujan';
  if (type === 'well') return 'Resapan Air Tanah';
  if (type === 'retention_pond') return 'Retensi Banjir Tropis';
  if (type === 'bioswale_channel') return 'Drainase Bio-retensi';
  return 'Estetika Ruang Publik';
}

/**
 * CompositeCommand: Groups multiple atomic commands into a single undo/redo step.
 * Used for long drags, batch operations, or composite workflows.
 */
export class CompositeCommand implements ICommand {
  public description: string;
  private commands: ICommand[] = [];

  constructor(description: string, commands: ICommand[] = []) {
    this.description = description;
    this.commands = [...commands];
  }

  public add(cmd: ICommand): void {
    this.commands.push(cmd);
  }

  public execute(): void {
    for (const c of this.commands) {
      c.execute();
    }
  }

  public undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  public redo(): void {
    for (const c of this.commands) {
      if (c.redo) c.redo();
      else c.execute();
    }
  }
}

export class AddRoadCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private startPos: THREE.Vector3;
  private endPos: THREE.Vector3;
  private type: RoadType;
  private controlPoints?: THREE.Vector3[];
  private createdEdgeId: string | null = null;
  private hasExecuted: boolean = false;

  constructor(
    engine: Engine,
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    type: RoadType,
    controlPoints?: THREE.Vector3[]
  ) {
    this.engine = engine;
    this.startPos = startPos.clone();
    this.endPos = endPos.clone();
    this.type = type;
    this.controlPoints = controlPoints?.map((p) => p.clone());
    this.description = `Tambah Jalan ${type}`;
  }

  public execute(): void {
    const edge = this.engine.roadManager.addRoad(
      this.startPos,
      this.endPos,
      this.type,
      this.controlPoints
    );
    if (edge) {
      this.createdEdgeId = edge.id;
    }
    this.engine.lotManager.evaluateAllLots();

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        const dist = Math.round(this.startPos.distanceTo(this.endPos));
        const prof = ROAD_PROFILES[this.type];
        const width = prof?.width || 8;
        const roadName = prof?.name || `Jalan ${this.type}`;
        const isBridge = (edge as any)?.isBridge || this.startPos.y < -0.25 || this.endPos.y < -0.25;
        const detail = isBridge
          ? `Panjang ${dist} m • Lebar ${width} m • Jembatan Otomatis Aktif`
          : `Panjang ${dist} m • Lebar ${width} m`;

        showSnackbar({
          variant: 'success',
          title: `${roadName} Dibangun`,
          detail,
          undoable: true,
          groupKey: `place_road_${this.type}`,
        });
      } catch {}
    }
  }

  public undo(): void {
    if (this.createdEdgeId) {
      this.engine.roadManager.removeRoad(this.createdEdgeId);
      this.engine.lotManager.evaluateAllLots();
    }
  }

  public redo(): void {
    this.execute();
  }
}

export class RemoveRoadCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private edgeId: string;
  private savedStartPos?: THREE.Vector3;
  private savedEndPos?: THREE.Vector3;
  private savedType?: RoadType;
  private savedControlPoints?: THREE.Vector3[];
  private savedCustomProfile?: Partial<RoadProfile>;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, edgeId: string) {
    this.engine = engine;
    this.edgeId = edgeId;
    this.description = `Hapus Ruas Jalan #${edgeId.slice(-4)}`;

    const edge = engine.roadManager.graph.edges.get(edgeId);
    if (edge) {
      const sNode = engine.roadManager.graph.nodes.get(edge.startNodeId);
      const eNode = engine.roadManager.graph.nodes.get(edge.endNodeId);
      if (sNode && eNode) {
        this.savedStartPos = sNode.position.clone();
        this.savedEndPos = eNode.position.clone();
        this.savedType = edge.type;
        this.savedControlPoints = edge.controlPoints?.map((p) => p.clone());
        this.savedCustomProfile = edge.customProfile ? { ...edge.customProfile } : undefined;
      }
    }
  }

  public execute(): void {
    this.engine.roadManager.removeRoad(this.edgeId);
    this.engine.lotManager.evaluateAllLots();

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        showSnackbar({
          variant: 'destructive',
          title: 'Ruas Jalan Dihapus',
          undoable: true,
          groupKey: 'demolish_road',
        });
      } catch {}
    }
  }

  public undo(): void {
    if (this.savedStartPos && this.savedEndPos && this.savedType) {
      const restored = this.engine.roadManager.addRoad(
        this.savedStartPos,
        this.savedEndPos,
        this.savedType,
        this.savedControlPoints
      );
      if (restored) {
        this.edgeId = restored.id;
        if (this.savedCustomProfile) {
          restored.customProfile = { ...this.savedCustomProfile };
          this.engine.roadManager.rebuildEdgeMesh(restored.id);
        }
      }
      this.engine.lotManager.evaluateAllLots();
    }
  }

  public redo(): void {
    this.execute();
  }
}

export class AddBuildingCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private building: BuildingInstance;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, building: BuildingInstance) {
    this.engine = engine;
    this.building = { ...building, position: building.position.clone() };
    this.description = `Bangun ${building.name}`;
  }

  public execute(): void {
    this.engine.buildingManager.addBuilding(this.building);
    this.engine.lotManager.evaluateAllLots();

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        const floorCount = this.building.floorCount || 1;
        const area = Math.round((this.building.width || 10) * (this.building.length || 10));
        showSnackbar({
          variant: 'success',
          title: `Membangun ${this.building.name}`,
          detail: `${floorCount} Lantai • Tapak ${area} m²`,
          undoable: true,
          groupKey: `place_building_${this.building.presetKey || 'custom'}`,
        });
      } catch {}
    }
  }

  public undo(): void {
    this.engine.buildingManager.removeBuilding(this.building.id);
    this.engine.lotManager.evaluateAllLots();
  }

  public redo(): void {
    this.execute();
  }
}

export class RemoveBuildingCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private building: BuildingInstance;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, building: BuildingInstance) {
    this.engine = engine;
    this.building = { ...building, position: building.position.clone() };
    this.description = `Hapus ${building.name}`;
  }

  public execute(): void {
    this.engine.buildingManager.removeBuilding(this.building.id);
    this.engine.lotManager.evaluateAllLots();

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        showSnackbar({
          variant: 'destructive',
          title: `${this.building.name} Dihapus`,
          undoable: true,
          groupKey: 'demolish_building',
        });
      } catch {}
    }
  }

  public undo(): void {
    this.engine.buildingManager.addBuilding(this.building);
    this.engine.lotManager.evaluateAllLots();
  }

  public redo(): void {
    this.execute();
  }
}


export class UpdateBuildingParamCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private buildingId: string;
  private prevParams: Partial<BuildingInstance>;
  private nextParams: Partial<BuildingInstance>;
  private hasExecuted: boolean = false;

  constructor(
    engine: Engine,
    buildingId: string,
    prevParams: Partial<BuildingInstance>,
    nextParams: Partial<BuildingInstance>,
    description = 'Ubah Parameter Bangunan'
  ) {
    this.engine = engine;
    this.buildingId = buildingId;
    this.prevParams = { ...prevParams };
    this.nextParams = { ...nextParams };
    this.description = description;
  }

  public execute(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;

    Object.assign(bld, this.nextParams);
    this.engine.buildingManager.updateBuilding(bld);
    this.engine.lotManager.evaluateAllLots();

    if (!this.hasExecuted) {
      this.hasExecuted = true;
    }
  }

  public undo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;

    Object.assign(bld, this.prevParams);
    this.engine.buildingManager.updateBuilding(bld);
    this.engine.lotManager.evaluateAllLots();
  }

  public redo(): void {
    this.execute();
  }
}

export class AddLotCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private parcel: LotParcel;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, parcel: LotParcel) {
    this.engine = engine;
    this.parcel = parcel;
    this.description = `Buat ${parcel.name}`;
  }

  public execute(): void {
    this.engine.lotManager.lots.set(this.parcel.id, this.parcel);
    this.engine.lotManager.rebuildLotMesh(this.parcel);
    this.engine.lotManager.evaluateBuildingCode(this.parcel);
    if (this.engine.lotManager.onLotsUpdated) {
      this.engine.lotManager.onLotsUpdated();
    }

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        const area = Math.round(this.parcel.width * this.parcel.length);
        showSnackbar({
          variant: 'success',
          title: `Kavling ${this.parcel.name} Dibuat`,
          detail: `Luas ${area} m²`,
          undoable: true,
          groupKey: `add_lot_${this.parcel.zone}`,
        });
      } catch {}
    }
  }

  public undo(): void {
    this.engine.lotManager.removeLot(this.parcel.id);
  }

  public redo(): void {
    this.execute();
  }
}

export class RemoveLotCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private parcel: LotParcel;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, parcel: LotParcel) {
    this.engine = engine;
    this.parcel = parcel;
    this.description = `Hapus ${parcel.name}`;
  }

  public execute(): void {
    this.engine.lotManager.removeLot(this.parcel.id);

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        showSnackbar({
          variant: 'destructive',
          title: `Kavling ${this.parcel.name} Dihapus`,
          undoable: true,
          groupKey: 'demolish_lot',
        });
      } catch {}
    }
  }

  public undo(): void {
    this.engine.lotManager.lots.set(this.parcel.id, this.parcel);
    this.engine.lotManager.rebuildLotMesh(this.parcel);
    this.engine.lotManager.evaluateBuildingCode(this.parcel);
    if (this.engine.lotManager.onLotsUpdated) {
      this.engine.lotManager.onLotsUpdated();
    }
  }

  public redo(): void {
    this.execute();
  }
}

export class SetLotZoneCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private lotId: string;
  private prevZone: ZoneType;
  private nextZone: ZoneType;

  constructor(engine: Engine, lotId: string, prevZone: ZoneType, nextZone: ZoneType) {
    this.engine = engine;
    this.lotId = lotId;
    this.prevZone = prevZone;
    this.nextZone = nextZone;
    this.description = `Ubah Zona ke ${nextZone}`;
  }

  public execute(): void {
    this.engine.lotManager.setLotZone(this.lotId, this.nextZone);
  }

  public undo(): void {
    this.engine.lotManager.setLotZone(this.lotId, this.prevZone);
  }

  public redo(): void {
    this.execute();
  }
}

export class AddLandscapeCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private item: LandscapeItem;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, item: LandscapeItem) {
    this.engine = engine;
    this.item = { ...item, position: item.position.clone() };
    this.description = `Tambah Lansekap ${item.type}`;
  }

  public execute(): void {
    this.engine.landscapeManager.addItem(this.item);
    this.engine.lotManager.evaluateAllLots();

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        const title = `${formatLandscapeTitle(this.item.type)} Ditempatkan`;
        const detail = getLandscapeDetail(this.item.type);
        showSnackbar({
          variant: 'success',
          title,
          detail,
          undoable: true,
          groupKey: `place_landscape_${this.item.type}`,
        });
      } catch {}
    }
  }

  public undo(): void {
    this.engine.landscapeManager.removeItem(this.item.id);
    this.engine.lotManager.evaluateAllLots();
  }

  public redo(): void {
    this.execute();
  }
}

export class RemoveLandscapeCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private item: LandscapeItem;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, item: LandscapeItem) {
    this.engine = engine;
    this.item = { ...item, position: item.position.clone() };
    this.description = `Hapus Lansekap ${item.type}`;
  }

  public execute(): void {
    this.engine.landscapeManager.removeItem(this.item.id);
    this.engine.lotManager.evaluateAllLots();

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        showSnackbar({
          variant: 'destructive',
          title: `${formatLandscapeTitle(this.item.type)} Dihapus`,
          undoable: true,
          groupKey: 'demolish_landscape',
        });
      } catch {}
    }
  }

  public undo(): void {
    this.engine.landscapeManager.addItem(this.item);
    this.engine.lotManager.evaluateAllLots();
  }

  public redo(): void {
    this.execute();
  }
}

export const AddLandscapeItemCommand = AddLandscapeCommand;


/**
 * SwapInteriorVariantCommand: Cycles / switches 3D interior furniture layout variant
 * ('variant_a' | 'variant_b' | 'variant_c') for a building, with full Undo/Redo.
 */
export class SwapInteriorVariantCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private buildingId: string;
  private newVariant: 'variant_a' | 'variant_b' | 'variant_c';
  private previousVariant: 'variant_a' | 'variant_b' | 'variant_c';

  constructor(
    engine: Engine,
    buildingId: string,
    newVariant: 'variant_a' | 'variant_b' | 'variant_c'
  ) {
    this.engine = engine;
    this.buildingId = buildingId;
    this.newVariant = newVariant;
    const bld = engine.buildingManager.buildings.get(buildingId);
    this.previousVariant = (bld?.interiorVariant as any) || 'variant_a';
    this.description = `Ganti Varian Interior: ${newVariant}`;
  }

  public execute(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;
    bld.interiorVariant = this.newVariant;
    this.engine.buildingManager.updateBuilding(bld);
  }

  public undo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;
    bld.interiorVariant = this.previousVariant;
    this.engine.buildingManager.updateBuilding(bld);
  }

  public redo(): void {
    this.execute();
  }
}

/**
 * UpdateRoadEdgeCommand: Upgrades road type and/or toggles trees/streetlights with Undo/Redo.
 */
export class UpdateRoadEdgeCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private edgeId: string;
  private newType?: RoadType;
  private newProfile?: Partial<RoadProfile>;
  private prevType: RoadType;
  private prevProfile?: Partial<RoadProfile>;
  private hasExecuted: boolean = false;

  constructor(
    engine: Engine,
    edgeId: string,
    updates: { type?: RoadType; customProfile?: Partial<RoadProfile> }
  ) {
    this.engine = engine;
    this.edgeId = edgeId;
    this.newType = updates.type;
    this.newProfile = updates.customProfile;

    const edge = engine.roadManager.graph.edges.get(edgeId);
    this.prevType = edge ? edge.type : 'local';
    this.prevProfile = edge?.customProfile ? { ...edge.customProfile } : undefined;
    this.description = `Upgrade Ruas Jalan #${edgeId.slice(-4)}`;
  }

  public execute(): void {
    const edge = this.engine.roadManager.graph.edges.get(this.edgeId);
    if (!edge) return;
    if (this.newType !== undefined) edge.type = this.newType;
    if (this.newProfile !== undefined) {
      edge.customProfile = { ...edge.customProfile, ...this.newProfile };
    }
    this.engine.roadManager.rebuildEdgeMesh(this.edgeId);
    if (typeof (this.engine as any).enforceRoadClearance === 'function') {
      (this.engine as any).enforceRoadClearance();
    } else if (typeof (this.engine.roadManager as any)?.enforceRoadClearance === 'function') {
      (this.engine.roadManager as any).enforceRoadClearance();
    }
    if (this.engine.roadManager.onGraphChanged) {
      this.engine.roadManager.onGraphChanged(this.engine.roadManager.graph.getTotalLengthKm());
    }

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        const newLabel = this.newType ? (ROAD_PROFILES[this.newType]?.name || this.newType) : 'Profil Diperbarui';
        showSnackbar({
          variant: 'info',
          title: 'Ruas Jalan Diperbarui',
          detail: newLabel,
          undoable: true,
          groupKey: `upgrade_road_${this.edgeId}`,
        });
      } catch {}
    }
  }

  public undo(): void {
    const edge = this.engine.roadManager.graph.edges.get(this.edgeId);
    if (!edge) return;
    edge.type = this.prevType;
    edge.customProfile = this.prevProfile ? { ...this.prevProfile } : undefined;
    this.engine.roadManager.rebuildEdgeMesh(this.edgeId);
    if (typeof (this.engine as any).enforceRoadClearance === 'function') {
      (this.engine as any).enforceRoadClearance();
    } else if (typeof (this.engine.roadManager as any)?.enforceRoadClearance === 'function') {
      (this.engine.roadManager as any).enforceRoadClearance();
    }
    if (this.engine.roadManager.onGraphChanged) {
      this.engine.roadManager.onGraphChanged(this.engine.roadManager.graph.getTotalLengthKm());
    }
  }

  public redo(): void {
    this.execute();
  }
}


/**
 * SubdivideBlockCommand: Smart Block Subdivider into uniform parcels facing the road,
 * with full composite Undo/Redo capability.
 */
export class SubdivideBlockCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private center: THREE.Vector3;
  private blockW: number;
  private blockL: number;
  private parcelW: number;
  private parcelL: number;
  private zone: ZoneType;
  private createdLotIds: string[] = [];

  constructor(
    engine: Engine,
    center: THREE.Vector3,
    blockW: number,
    blockL: number,
    parcelW: number = 10,
    parcelL: number = 20,
    zone: ZoneType = 'residential'
  ) {
    this.engine = engine;
    this.center = center.clone();
    this.blockW = blockW;
    this.blockL = blockL;
    this.parcelW = parcelW;
    this.parcelL = parcelL;
    this.zone = zone;
    this.description = `Bagi Blok Kavling Otomatis (${parcelW}x${parcelL}m)`;
  }

  public execute(): void {
    const lots = this.engine.lotManager.subdivideBlock(
      this.center,
      this.blockW,
      this.blockL,
      this.parcelW,
      this.parcelL,
      this.zone
    );
    this.createdLotIds = lots.map((l) => l.id);
  }

  public undo(): void {
    for (const id of this.createdLotIds) {
      this.engine.lotManager.removeLot(id);
    }
    this.createdLotIds = [];
  }

  public redo(): void {
    this.execute();
  }
}

export class DuplicateDistrictCommand extends CompositeCommand {
  public duplicatedBuildingIds: string[] = [];

  constructor(
    engine: Engine,
    buildingIds: string[],
    offset: THREE.Vector3 = new THREE.Vector3(14, 0, 14),
    description = 'Duplikasi Blok Kawasan'
  ) {
    super(description, []);
    for (const bId of buildingIds) {
      const orig = engine.buildingManager.buildings.get(bId);
      if (!orig) continue;
      const targetX = orig.position.x + offset.x;
      const targetZ = orig.position.z + offset.z;
      const targetY = engine.terrain ? engine.terrain.getHeightAt(targetX, targetZ) : 0;
      const newId = `bld_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      this.duplicatedBuildingIds.push(newId);
      const newInstance: BuildingInstance = {
        ...orig,
        id: newId,
        position: new THREE.Vector3(targetX, targetY, targetZ),
        rotationY: orig.rotationY
      };
      this.add(new AddBuildingCommand(engine, newInstance));
    }
  }
}

export type FurnitureSlotType = 'floor' | 'tabletop' | 'wall';

export interface PlacedFurnitureData {
  id: string;
  type: string;
  name: string;
  position: [number, number, number];
  rotationY: number;
  floorIndex: number;
  slot?: FurnitureSlotType;
  parentId?: string;
}

/**
 * PlaceFurnitureCommand: Adds a piece of furniture to building.userData.placedFurniture with full Undo/Redo
 */
export class PlaceFurnitureCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private buildingId: string;
  private furniture: PlacedFurnitureData;

  constructor(engine: Engine, buildingId: string, furniture: PlacedFurnitureData) {
    this.engine = engine;
    this.buildingId = buildingId;
    this.furniture = furniture;
    this.description = `Pasang ${furniture.name}`;
  }

  public execute(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;

    if (!bld.userData) bld.userData = {};
    if (!bld.userData.placedFurniture) bld.userData.placedFurniture = [];
    const existingIdx = bld.userData.placedFurniture.findIndex(
      (f: PlacedFurnitureData) => f.id === this.furniture.id
    );
    if (existingIdx >= 0) {
      bld.userData.placedFurniture[existingIdx] = this.furniture;
    } else {
      bld.userData.placedFurniture.push(this.furniture);
    }

    if (typeof this.engine.buildingManager.attachFurniture === 'function') {
      const mesh = this.engine.buildingManager.attachFurniture(this.buildingId, this.furniture);
      if (!mesh) return;
    }

    try {
      proceduralAudio.playClick();
      showSnackbar({
        variant: 'info',
        title: 'Perabot Dipasang',
        groupKey: 'fp_place_furniture',
        detail: this.furniture.name,
        undoable: true
      });
    } catch {}
  }

  public undo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (bld && bld.userData?.placedFurniture) {
      bld.userData.placedFurniture = bld.userData.placedFurniture.filter(
        (f: PlacedFurnitureData) => f.id !== this.furniture.id
      );
    }
    if (typeof this.engine.buildingManager.detachFurniture === 'function') {
      this.engine.buildingManager.detachFurniture(this.buildingId, this.furniture.id);
    }
    try {
      proceduralAudio.playClick();
    } catch {}
  }

  public redo(): void {
    this.execute();
  }
}

/**
 * RemoveFurnitureCommand: Removes a piece of furniture from building with full Undo/Redo
 */
export class RemoveFurnitureCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private buildingId: string;
  private furniture: PlacedFurnitureData;
  private removedChildren: PlacedFurnitureData[] = [];

  constructor(engine: Engine, buildingId: string, furniture: PlacedFurnitureData) {
    this.engine = engine;
    this.buildingId = buildingId;
    this.furniture = { ...furniture };
    this.description = `Hapus ${furniture.name}`;
  }

  public execute(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld || !bld.userData?.placedFurniture) return;
    const existingFur = bld.userData.placedFurniture.find(
      (f: PlacedFurnitureData) => f.id === this.furniture.id
    );
    if (existingFur) {
      this.furniture = { ...existingFur };
    }

    // Cascade delete: find all child furniture placed on this parent
    this.removedChildren = bld.userData.placedFurniture.filter(
      (f: PlacedFurnitureData) => f.parentId === this.furniture.id
    );

    const idsToRemove = new Set([this.furniture.id, ...this.removedChildren.map((c) => c.id)]);

    bld.userData.placedFurniture = bld.userData.placedFurniture.filter(
      (f: PlacedFurnitureData) => !idsToRemove.has(f.id)
    );

    if (typeof this.engine.buildingManager.detachFurniture === 'function') {
      this.engine.buildingManager.detachFurniture(this.buildingId, this.furniture.id);
      for (const child of this.removedChildren) {
        this.engine.buildingManager.detachFurniture(this.buildingId, child.id);
      }
    }

    try {
      proceduralAudio.playDemolish();
      showSnackbar({
        variant: 'warning',
        title: 'Perabot Dihapus',
        groupKey: 'fp_remove_furniture',
        detail: this.furniture.name,
        undoable: true
      });
    } catch {}
  }

  public undo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (bld) {
      if (!bld.userData) bld.userData = {};
      if (!bld.userData.placedFurniture) bld.userData.placedFurniture = [];
      bld.userData.placedFurniture.push(this.furniture);
      for (const child of this.removedChildren) {
        bld.userData.placedFurniture.push(child);
      }
    }
    if (typeof this.engine.buildingManager.attachFurniture === 'function') {
      this.engine.buildingManager.attachFurniture(this.buildingId, this.furniture);
      for (const child of this.removedChildren) {
        this.engine.buildingManager.attachFurniture(this.buildingId, child);
      }
    }
    try {
      proceduralAudio.playClick();
    } catch {}
  }

  public redo(): void {
    this.execute();
  }
}

/**
 * AutoFurnishRoomCommand: Fills ground floor of building with standard furniture
 */
export class AutoFurnishRoomCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private buildingId: string;
  private addedFurniture: PlacedFurnitureData[] = [];
  private prevFurniture: PlacedFurnitureData[] = [];

  constructor(engine: Engine, buildingId: string) {
    this.engine = engine;
    this.buildingId = buildingId;
    this.description = 'Isi Paket Ruangan Otomatis';
  }

  public execute(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;
    bld.userData = bld.userData || {};
    this.prevFurniture = [...(bld.userData.placedFurniture || [])];

    const w = bld.width || 10;
    const l = bld.length || 10;
    const items: PlacedFurnitureData[] = [
      {
        id: `fur_${Date.now()}_1`,
        type: 'sofa_l',
        name: 'Sofa L-Shape Ruang Tamu',
        position: [-w * 0.2, 0, -l * 0.15],
        rotationY: 0,
        floorIndex: 1
      },
      {
        id: `fur_${Date.now()}_2`,
        type: 'dining_set',
        name: 'Meja Makan + 4 Kursi',
        position: [w * 0.22, 0, -l * 0.1],
        rotationY: Math.PI * 0.5,
        floorIndex: 1
      },
      {
        id: `fur_${Date.now()}_3`,
        type: 'plant_monstera',
        name: 'Tanaman Pot Monstera',
        position: [-w * 0.35, 0, l * 0.25],
        rotationY: 0,
        floorIndex: 1
      },
      {
        id: `fur_${Date.now()}_4`,
        type: 'floor_lamp',
        name: 'Lampu Berdiri 2700K',
        position: [w * 0.32, 0, l * 0.25],
        rotationY: 0,
        floorIndex: 1
      }
    ];

    this.addedFurniture = items;
    bld.userData.placedFurniture = [...this.prevFurniture, ...items];
    this.engine.buildingManager.updateBuilding(bld);
    try {
      proceduralAudio.playPlaceBuilding();
      showSnackbar({
        variant: 'success',
        title: 'Paket Ruangan Diterapkan',
        detail: `${items.length} perabot berhasil dipasang`,
        undoable: true
      });
    } catch {}
  }

  public undo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;
    bld.userData = bld.userData || {};
    bld.userData.placedFurniture = [...this.prevFurniture];
    this.engine.buildingManager.updateBuilding(bld);
  }

  public redo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;
    bld.userData = bld.userData || {};
    bld.userData.placedFurniture = [...this.prevFurniture, ...this.addedFurniture];
    this.engine.buildingManager.updateBuilding(bld);
  }
}

/**
 * PaintSurfaceCommand: Paints wall or floor material for building with Undo/Redo
 */
export class MoveFurnitureCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private buildingId: string;
  private prevFurniture: PlacedFurnitureData;
  private nextFurniture: PlacedFurnitureData;
  private childMoves: { prev: PlacedFurnitureData; next: PlacedFurnitureData }[] = [];

  constructor(
    engine: Engine,
    buildingId: string,
    prevFurniture: PlacedFurnitureData,
    nextFurniture: PlacedFurnitureData
  ) {
    this.engine = engine;
    this.buildingId = buildingId;
    this.prevFurniture = {
      ...prevFurniture,
      position: [...prevFurniture.position] as [number, number, number]
    };
    this.nextFurniture = {
      ...nextFurniture,
      position: [...nextFurniture.position] as [number, number, number]
    };
    this.description = `Geser ${nextFurniture.name}`;

    // Translation delta
    const dx = this.nextFurniture.position[0] - this.prevFurniture.position[0];
    const dy = this.nextFurniture.position[1] - this.prevFurniture.position[1];
    const dz = this.nextFurniture.position[2] - this.prevFurniture.position[2];

    const bld = engine.buildingManager.buildings.get(buildingId);
    const placed = bld?.userData?.placedFurniture || [];
    this.childMoves = placed
      .filter((f: PlacedFurnitureData) => f.parentId === prevFurniture.id)
      .map((child: PlacedFurnitureData) => {
        const nextChild: PlacedFurnitureData = {
          ...child,
          position: [
            child.position[0] + dx,
            child.position[1] + dy,
            child.position[2] + dz
          ] as [number, number, number]
        };
        return {
          prev: { ...child, position: [...child.position] as [number, number, number] },
          next: nextChild
        };
      });
  }

  public execute(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;

    if (!bld.userData) bld.userData = {};
    if (!bld.userData.placedFurniture) bld.userData.placedFurniture = [];

    const existingIdx = bld.userData.placedFurniture.findIndex(
      (f: PlacedFurnitureData) => f.id === this.prevFurniture.id || f.id === this.nextFurniture.id
    );
    if (existingIdx >= 0) {
      bld.userData.placedFurniture[existingIdx] = {
        ...this.nextFurniture,
        position: [...this.nextFurniture.position] as [number, number, number]
      };
    } else {
      bld.userData.placedFurniture.push({
        ...this.nextFurniture,
        position: [...this.nextFurniture.position] as [number, number, number]
      });
    }

    if (typeof this.engine.buildingManager.attachFurniture === 'function') {
      this.engine.buildingManager.attachFurniture(this.buildingId, this.nextFurniture);
    }

    // Cascade move all children
    for (const cm of this.childMoves) {
      const cIdx = bld.userData.placedFurniture.findIndex((f: PlacedFurnitureData) => f.id === cm.next.id);
      if (cIdx >= 0) {
        bld.userData.placedFurniture[cIdx] = {
          ...cm.next,
          position: [...cm.next.position] as [number, number, number]
        };
      }
      if (typeof this.engine.buildingManager.attachFurniture === 'function') {
        this.engine.buildingManager.attachFurniture(this.buildingId, cm.next);
      }
    }

    try {
      proceduralAudio.playClick();
      showSnackbar({
        variant: 'success',
        title: 'Perabot Dipindahkan',
        detail: this.nextFurniture.name,
        undoable: true,
        groupKey: 'fp_move_furniture'
      });
    } catch {}
  }

  public undo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;

    if (!bld.userData) bld.userData = {};
    if (!bld.userData.placedFurniture) bld.userData.placedFurniture = [];

    const existingIdx = bld.userData.placedFurniture.findIndex(
      (f: PlacedFurnitureData) => f.id === this.nextFurniture.id || f.id === this.prevFurniture.id
    );
    if (existingIdx >= 0) {
      bld.userData.placedFurniture[existingIdx] = {
        ...this.prevFurniture,
        position: [...this.prevFurniture.position] as [number, number, number]
      };
    } else {
      bld.userData.placedFurniture.push({
        ...this.prevFurniture,
        position: [...this.prevFurniture.position] as [number, number, number]
      });
    }

    if (typeof this.engine.buildingManager.attachFurniture === 'function') {
      this.engine.buildingManager.attachFurniture(this.buildingId, this.prevFurniture);
    }

    // Restore all children to previous position
    for (const cm of this.childMoves) {
      const cIdx = bld.userData.placedFurniture.findIndex((f: PlacedFurnitureData) => f.id === cm.prev.id);
      if (cIdx >= 0) {
        bld.userData.placedFurniture[cIdx] = {
          ...cm.prev,
          position: [...cm.prev.position] as [number, number, number]
        };
      }
      if (typeof this.engine.buildingManager.attachFurniture === 'function') {
        this.engine.buildingManager.attachFurniture(this.buildingId, cm.prev);
      }
    }

    try {
      proceduralAudio.playClick();
    } catch {}
  }

  public redo(): void {
    this.execute();
  }
}

export class PaintSurfaceCommand implements ICommand {
  public description: string;
  private engine: Engine;
  private buildingId: string;
  private surface: 'wall' | 'floor';
  private newMaterial: string;
  private prevMaterial: string;

  constructor(engine: Engine, buildingId: string, surface: 'wall' | 'floor', material: string) {
    this.engine = engine;
    this.buildingId = buildingId;
    this.surface = surface;
    this.newMaterial = material;

    const bld = engine.buildingManager.buildings.get(buildingId);
    this.prevMaterial = (surface === 'wall' ? bld?.wallMaterial : bld?.userData?.floorMaterial || bld?.roofMaterial) || 'concrete';
    (this as any)._prevFloorMaterial = bld?.userData?.floorMaterial;
    this.description = `Kuas Material ${material} (${surface})`;
  }

  public execute(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;
    if (this.surface === 'wall') {
      bld.wallMaterial = this.newMaterial as any;
    } else {
      bld.userData = bld.userData || {};
      bld.userData.floorMaterial = this.newMaterial;
    }
    this.engine.buildingManager.updateBuilding(bld);
    try {
      proceduralAudio.playClick();
      showSnackbar({
        variant: 'info',
        title: 'Material Diperbarui',
        detail: `${this.surface === 'wall' ? 'Dinding' : 'Lantai'}: ${FIRST_PERSON_MATERIAL_PALETTE.find((m) => m.id === this.newMaterial)?.name || this.newMaterial}`,
        groupKey: 'fp_paint_surface',
        undoable: true
      });
    } catch {}
  }

  public undo(): void {
    const bld = this.engine.buildingManager.buildings.get(this.buildingId);
    if (!bld) return;
    if (this.surface === 'wall') {
      bld.wallMaterial = this.prevMaterial as any;
    } else {
      bld.userData = bld.userData || {};
      bld.userData.floorMaterial = (this as any)._prevFloorMaterial;
    }
    this.engine.buildingManager.updateBuilding(bld);
    try {
      proceduralAudio.playClick();
    } catch {}
  }

  public redo(): void {
    this.execute();
  }
}

