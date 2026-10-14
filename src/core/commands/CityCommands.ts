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
