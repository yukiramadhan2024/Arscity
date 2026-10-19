import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { LotParcel, ZONE_RULES, ZoneType } from './ZoneTypes';
import { BuildingInstance, RoofType, WallMaterialType, RoofMaterialType } from '../buildings/PrefabTypes';
import { LandscapeItem } from '../world/LandscapeManager';
import { CompositeCommand, AddBuildingCommand, AddLandscapeItemCommand } from '../core/commands/CityCommands';

export interface AutoZoningResult {
  building: BuildingInstance;
  tree: LandscapeItem;
  well: LandscapeItem;
}

export class AutoZoningService {
  /**
   * Automatically designs and places a fully compliant building, shade tree, and absorption well
   * tailored to the lot's zone, geometry, and road network orientation.
   */
  public static generateCompliantLotDevelopment(
    engine: Engine,
    lot: LotParcel
  ): AutoZoningResult | null {
    const rule = ZONE_RULES[lot.zone];
    const { frontIdx } = engine.lotManager.getLotEdgeClassification(lot);

    // 1. Choose preset key based on zone and lot size
    let presetKey = 'house_36';
    let category: 'residential' | 'commercial' | 'public' = 'residential';
    let baseWidth = 6.0;
    let baseLength = 6.0;
    let floorCount = 1;
    let roofType: RoofType = 'hip';
    let roofMaterial: RoofMaterialType = 'clay_tile';
    let wallMaterial: WallMaterialType = 'plaster';
    let wallColor = '#ffffff';

    if (lot.zone === 'residential') {
      category = 'residential';
      if (lot.areaM2 <= 140) {
        presetKey = 'house_36';
        baseWidth = 6.0;
        baseLength = 6.0;
        roofType = 'gable';
        roofMaterial = 'clay_tile';
      } else {
        presetKey = 'house_54';
        baseWidth = 6.0;
        baseLength = 8.5;
        roofType = 'hip';
        roofMaterial = 'clay_tile';
      }
    } else if (lot.zone === 'mixed_use') {
      category = 'residential';
      presetKey = 'villa_2fl';
      baseWidth = 7.5;
      baseLength = 9.0;
      floorCount = 2;
      roofType = 'hip';
      roofMaterial = 'clay_tile';
    } else if (lot.zone === 'commercial') {
      category = 'commercial';
      presetKey = 'ruko_3fl';
      baseWidth = 5.0;
      baseLength = 11.0;
      floorCount = 3;
      roofType = 'flat';
      roofMaterial = 'concrete';
      wallMaterial = 'concrete';
    } else if (lot.zone === 'office') {
      category = 'commercial';
      presetKey = 'office_4fl';
      baseWidth = 10.0;
      baseLength = 12.0;
      floorCount = 3;
      roofType = 'flat';
      roofMaterial = 'concrete';
      wallMaterial = 'concrete';
    } else if (lot.zone === 'public_facility') {
      category = 'public';
      presetKey = 'community_hall';
      baseWidth = 9.0;
      baseLength = 9.0;
      floorCount = 1;
      roofType = 'joglo';
      roofMaterial = 'clay_tile';
      wallMaterial = 'wood';
      wallColor = '#78350f';
    }

    // 2. Adjust building dimensions to respect maximum KDB and side setbacks
    const maxKdbArea = (lot.areaM2 * (rule.maxKDB - 2)) / 100; // Leave 2% safety buffer
    let bldW = baseWidth;
    let bldL = baseLength;

    const isFacingZ = frontIdx === 0 || frontIdx === 2;
    const availableLotWidth = isFacingZ ? lot.width : lot.length;
    const availableLotLength = isFacingZ ? lot.length : lot.width;

    const maxAllowedWidth = Math.max(4.0, availableLotWidth - (rule.minGSBSide * 2) - 1.0);
    const maxAllowedLength = Math.max(4.0, availableLotLength - rule.minGSBFront - rule.minGSBRear - 1.0);

    bldW = Math.min(bldW, maxAllowedWidth);
    bldL = Math.min(bldL, maxAllowedLength);

    if (bldW * bldL > maxKdbArea) {
      const scale = Math.sqrt(maxKdbArea / (bldW * bldL));
      bldW = Math.max(4.0, Math.floor(bldW * scale * 10) / 10);
      bldL = Math.max(4.0, Math.floor(bldL * scale * 10) / 10);
    }

    // 3. Compute rotation and position to face road behind front GSB
    let rotY = 0;
    const bldPos = lot.position.clone();
    const treePos = lot.position.clone();
    const wellPos = lot.position.clone();

    const gsbFrontSetback = rule.minGSBFront + 0.6; // 0.6m aesthetic setback buffer behind front line

    if (frontIdx === 2) {
      // Faces South (Z+)
      rotY = 0;
      bldPos.z = (lot.position.z + lot.length * 0.5) - gsbFrontSetback - (bldL * 0.5);
      treePos.z = lot.position.z + (lot.length * 0.5) - (gsbFrontSetback * 0.5);
      treePos.x = lot.position.x - (bldW * 0.35);
      wellPos.z = lot.position.z + (lot.length * 0.5) - (gsbFrontSetback * 0.5);
      wellPos.x = lot.position.x + (bldW * 0.35);
    } else if (frontIdx === 0) {
      // Faces North (Z-)
      rotY = Math.PI;
      bldPos.z = (lot.position.z - lot.length * 0.5) + gsbFrontSetback + (bldL * 0.5);
      treePos.z = lot.position.z - (lot.length * 0.5) + (gsbFrontSetback * 0.5);
      treePos.x = lot.position.x + (bldW * 0.35);
      wellPos.z = lot.position.z - (lot.length * 0.5) + (gsbFrontSetback * 0.5);
      wellPos.x = lot.position.x - (bldW * 0.35);
    } else if (frontIdx === 1) {
      // Faces East (X+)
      rotY = -Math.PI / 2;
      bldPos.x = (lot.position.x + lot.width * 0.5) - gsbFrontSetback - (bldL * 0.5);
      treePos.x = lot.position.x + (lot.width * 0.5) - (gsbFrontSetback * 0.5);
      treePos.z = lot.position.z - (bldW * 0.35);
      wellPos.x = lot.position.x + (lot.width * 0.5) - (gsbFrontSetback * 0.5);
      wellPos.z = lot.position.z + (bldW * 0.35);
    } else if (frontIdx === 3) {
      // Faces West (X-)
      rotY = Math.PI / 2;
      bldPos.x = (lot.position.x - lot.width * 0.5) + gsbFrontSetback + (bldL * 0.5);
      treePos.x = lot.position.x - (lot.width * 0.5) + (gsbFrontSetback * 0.5);
      treePos.z = lot.position.z + (bldW * 0.35);
      wellPos.x = lot.position.x - (lot.width * 0.5) + (gsbFrontSetback * 0.5);
      wellPos.z = lot.position.z - (bldW * 0.35);
    }

    const buildingId = `bld_auto_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const building: BuildingInstance = {
      id: buildingId,
      name: `${rule.name.split(' (')[0]} ${bldW.toFixed(0)}x${bldL.toFixed(0)}m`,
      presetKey,
      category,
      position: bldPos,
      rotationY: rotY,
      width: bldW,
      length: bldL,
      floorCount,
      floorHeight: 3.2,
      roofType,
      roofOverhang: roofType === 'joglo' ? 1.6 : roofType === 'hip' ? 1.2 : 0.8,
      wallMaterial,
      wallColor,
      roofMaterial,
      lotId: lot.id
    };

    const tree: LandscapeItem = {
      id: `land_tree_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'shade_tree',
      position: treePos,
      radius: 2.5,
      lotId: lot.id
    };

    const well: LandscapeItem = {
      id: `land_well_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: 'well',
      position: wellPos,
      radius: 0.8,
      lotId: lot.id
    };

    return { building, tree, well };
  }

  /**
   * Generates a single undoable CompositeCommand to auto-develop one specific lot.
   */
  public static createAutoDevelopLotCommand(engine: Engine, lotId: string): CompositeCommand | null {
    const lot = engine.lotManager.lots.get(lotId);
    if (!lot) return null;

    // Check if lot already has buildings
    if (lot.containedBuildingIds && lot.containedBuildingIds.length > 0) {
      return null;
    }

    const dev = this.generateCompliantLotDevelopment(engine, lot);
    if (!dev) return null;

    const cmd = new CompositeCommand(`Kembangkan Otomatis ${lot.name}`);
    cmd.add(new AddBuildingCommand(engine, dev.building));
    cmd.add(new AddLandscapeItemCommand(engine, dev.tree));
    cmd.add(new AddLandscapeItemCommand(engine, dev.well));

    return cmd;
  }

  /**
   * Generates a single undoable CompositeCommand to auto-develop all empty zoned lots.
   */
  public static createAutoDevelopAllLotsCommand(engine: Engine): CompositeCommand | null {
    const emptyLots: LotParcel[] = [];
    for (const lot of engine.lotManager.lots.values()) {
      if (!lot.containedBuildingIds || lot.containedBuildingIds.length === 0) {
        emptyLots.push(lot);
      }
    }

    if (emptyLots.length === 0) return null;

    const composite = new CompositeCommand(`Kembangkan Otomatis ${emptyLots.length} Kavling`);

    for (const lot of emptyLots) {
      const dev = this.generateCompliantLotDevelopment(engine, lot);
      if (dev) {
        composite.add(new AddBuildingCommand(engine, dev.building));
        composite.add(new AddLandscapeItemCommand(engine, dev.tree));
        composite.add(new AddLandscapeItemCommand(engine, dev.well));
      }
    }

    return composite;
  }
}
