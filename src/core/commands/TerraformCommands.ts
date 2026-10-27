import * as THREE from 'three';
import { ICommand } from './CommandManager';
import { Engine } from '../engine/Engine';
import { RiverSegment, RiverType } from '../../world/RiverTypes';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { showSnackbar } from '../../ui/state/useSnackbarStore';

/**
 * Command for carving a river path and creating 3D water & talud meshes.
 */
export class CarveRiverCommand implements ICommand {
  public id: string = `carve_river_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  public description: string;
  private engine: Engine;
  private startPos: THREE.Vector3;
  private endPos: THREE.Vector3;
  private riverType: RiverType;
  private controlPoints?: THREE.Vector3[];
  private createdSegment?: RiverSegment;

  constructor(
    engine: Engine,
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    riverType: RiverType = 'urban_river',
    controlPoints?: THREE.Vector3[]
  ) {
    this.engine = engine;
    this.startPos = startPos.clone();
    this.endPos = endPos.clone();
    this.riverType = riverType;
    this.controlPoints = controlPoints ? controlPoints.map((p) => p.clone()) : undefined;
    this.description = `Pahat Alur Sungai (${riverType})`;
  }

  public execute(): boolean {
    if (!this.engine.riverManager) return false;
    this.createdSegment = this.engine.riverManager.addRiverSegment(
      this.startPos,
      this.endPos,
      this.riverType,
      this.controlPoints
    );
    proceduralAudio.playTaptic('selection');
    return true;
  }

  public undo(): boolean {
    if (!this.engine.riverManager || !this.createdSegment) return false;
    this.engine.riverManager.removeRiverSegment(this.createdSegment.id);
    return true;
  }
}

/**
 * Command for sculpturing terrain elevation with brush falloff.
 */
export class SculptTerrainCommand implements ICommand {
  public id: string = `sculpt_terrain_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  public description: string;
  private engine: Engine;
  private centerX: number;
  private centerZ: number;
  private radius: number;
  private deltaY: number;
  private mode: 'raise' | 'lower' | 'flatten' | 'river';
  private targetHeight?: number;

  constructor(
    engine: Engine,
    centerX: number,
    centerZ: number,
    radius: number,
    deltaY: number,
    mode: 'raise' | 'lower' | 'flatten' | 'river' = 'raise',
    targetHeight?: number
  ) {
    this.engine = engine;
    this.centerX = centerX;
    this.centerZ = centerZ;
    this.radius = radius;
    this.deltaY = deltaY;
    this.mode = mode;
    this.targetHeight = targetHeight;
    this.description = `Terraform: ${mode} (r=${radius}m)`;
  }

  public execute(): boolean {
    if (!this.engine.terrain) return false;
    this.engine.terrain.modifyElevation(
      this.centerX,
      this.centerZ,
      this.radius,
      this.deltaY,
      this.mode,
      this.targetHeight
    );
    proceduralAudio.playTaptic('medium');
    return true;
  }

  public undo(): boolean {
    if (!this.engine.terrain) return false;
    // Invert the operation
    if (this.mode === 'raise') {
      this.engine.terrain.modifyElevation(this.centerX, this.centerZ, this.radius, this.deltaY, 'lower');
    } else if (this.mode === 'lower' || this.mode === 'river') {
      this.engine.terrain.modifyElevation(this.centerX, this.centerZ, this.radius, this.deltaY, 'raise');
    }
    return true;
  }
}

export type DemolishTargetType = 'building' | 'road' | 'lot' | 'landscape' | 'river';

/**
 * Bulldozer / Demolish Command for destroying city elements with full 1-step Undo/Redo.
 */
export class DemolishCommand implements ICommand {
  public id: string = `demolish_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  public description: string;
  private engine: Engine;
  private targetType: DemolishTargetType;
  private targetId: string;
  private savedState?: any;
  private hasExecuted: boolean = false;

  constructor(engine: Engine, targetType: DemolishTargetType, targetId: string) {
    this.engine = engine;
    this.targetType = targetType;
    this.targetId = targetId;
    this.description = `Buldoser: Hancurkan ${targetType} [${targetId}]`;
  }

  public execute(): boolean {
    if (this.targetType === 'building') {
      const bld = this.engine.buildingManager.buildings.get(this.targetId);
      if (!bld) return false;
      this.savedState = { ...bld };
      this.engine.buildingManager.removeBuilding(this.targetId);
    } else if (this.targetType === 'road') {
      const edge = this.engine.roadManager.graph.edges.get(this.targetId);
      if (!edge) return false;
      const sNode = this.engine.roadManager.graph.nodes.get(edge.startNodeId);
      const eNode = this.engine.roadManager.graph.nodes.get(edge.endNodeId);
      if (sNode && eNode) {
        this.savedState = {
          startPos: sNode.position.clone(),
          endPos: eNode.position.clone(),
          type: edge.type,
          controlPoints: edge.controlPoints ? edge.controlPoints.map((p) => p.clone()) : undefined,
        };
      }
      this.engine.roadManager.removeRoad(this.targetId);
    } else if (this.targetType === 'landscape') {
      const item = this.engine.landscapeManager.items.get(this.targetId);
      if (!item) return false;
      this.savedState = { ...item };
      this.engine.landscapeManager.removeItem(this.targetId);
    } else if (this.targetType === 'river') {
      if (!this.engine.riverManager) return false;
      const seg = this.engine.riverManager.segments.get(this.targetId);
      if (!seg) return false;
      this.savedState = {
        startPos: seg.controlPoints[0].clone(),
        endPos: seg.controlPoints[seg.controlPoints.length - 1].clone(),
        type: seg.type,
        controlPoints: seg.controlPoints.map((p) => p.clone()),
      };
      this.engine.riverManager.removeRiverSegment(this.targetId);
    }

    // Audio & tactile feedback
    proceduralAudio.playTaptic('boundary');

    if (!this.hasExecuted) {
      this.hasExecuted = true;
      try {
        let title = 'Objek Dihapus';
        if (this.targetType === 'building') {
          title = this.savedState?.name ? `${this.savedState.name} Dihapus` : 'Gedung Dihapus';
        } else if (this.targetType === 'road') {
          title = 'Ruas Jalan Dihapus';
        } else if (this.targetType === 'landscape') {
          title = this.savedState?.type ? `${this.savedState.type} Dihapus` : 'Lansekap Dihapus';
        } else if (this.targetType === 'river') {
          title = 'Alur Sungai Dihapus';
        }

        showSnackbar({
          variant: 'destructive',
          title,
          undoable: true,
          groupKey: `demolish_${this.targetType}`,
        });
      } catch {}
    }

    return true;
  }

  public undo(): boolean {
    if (!this.savedState) return false;

    if (this.targetType === 'building') {
      this.engine.buildingManager.addBuilding(this.savedState);
    } else if (this.targetType === 'road') {
      this.engine.roadManager.addRoad(
        this.savedState.startPos,
        this.savedState.endPos,
        this.savedState.type,
        this.savedState.controlPoints
      );
    } else if (this.targetType === 'landscape') {
      this.engine.landscapeManager.addItem(this.savedState);
    } else if (this.targetType === 'river' && this.engine.riverManager) {
      this.engine.riverManager.addRiverSegment(
        this.savedState.startPos,
        this.savedState.endPos,
        this.savedState.type,
        this.savedState.controlPoints
      );
    }

    return true;
  }
}
