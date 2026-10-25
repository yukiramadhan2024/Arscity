import * as THREE from 'three';
import { Engine } from '../engine/Engine';
import { ICommand } from './CommandManager';
import { RoadType, RoadEdge, RoadProfile } from '../../roads/RoadTypes';
import { BuildingInstance } from '../../buildings/PrefabTypes';
import { LotParcel, ZoneType } from '../../zones/ZoneTypes';
import { LandscapeItem } from '../../world/LandscapeManager';

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

  constructor(engine: Engine, building: BuildingInstance) {
    this.engine = engine;
    this.building = { ...building, position: building.position.clone() };
    this.description = `Bangun ${building.name}`;
  }

  public execute(): void {
    this.engine.buildingManager.addBuilding(this.building);
    this.engine.lotManager.evaluateAllLots();
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

  constructor(engine: Engine, building: BuildingInstance) {
    this.engine = engine;
    this.building = { ...building, position: building.position.clone() };
    this.description = `Hapus ${building.name}`;
  }

  public execute(): void {
    this.engine.buildingManager.removeBuilding(this.building.id);
    this.engine.lotManager.evaluateAllLots();
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

  constructor(engine: Engine, parcel: LotParcel) {
    this.engine = engine;
    this.parcel = parcel;
    this.description = `Hapus ${parcel.name}`;
  }

  public execute(): void {
    this.engine.lotManager.removeLot(this.parcel.id);
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

  constructor(engine: Engine, item: LandscapeItem) {
    this.engine = engine;
    this.item = { ...item, position: item.position.clone() };
    this.description = `Tambah Lansekap ${item.type}`;
  }

  public execute(): void {
    this.engine.landscapeManager.addItem(this.item);
    this.engine.lotManager.evaluateAllLots();
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

  constructor(engine: Engine, item: LandscapeItem) {
    this.engine = engine;
    this.item = { ...item, position: item.position.clone() };
    this.description = `Hapus Lansekap ${item.type}`;
  }

  public execute(): void {
    this.engine.landscapeManager.removeItem(this.item.id);
    this.engine.lotManager.evaluateAllLots();
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
    if (this.engine.roadManager.onGraphChanged) {
      this.engine.roadManager.onGraphChanged(this.engine.roadManager.graph.getTotalLengthKm());
    }
  }

  public undo(): void {
    const edge = this.engine.roadManager.graph.edges.get(this.edgeId);
    if (!edge) return;
    edge.type = this.prevType;
    edge.customProfile = this.prevProfile ? { ...this.prevProfile } : undefined;
    this.engine.roadManager.rebuildEdgeMesh(this.edgeId);
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
