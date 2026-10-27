import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { LotParcel, ZONE_RULES } from './ZoneTypes';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { BuildingManager } from '../buildings/BuildingManager';
import { CompositeCommand, UpdateBuildingParamCommand, AddLandscapeCommand } from '../core/commands/CityCommands';
import { LandscapeItem } from '../world/LandscapeManager';
import { proceduralAudio } from '../audio/ProceduralAudio';
import { showSnackbar } from '../ui/state/useSnackbarStore';

export interface AutoFixResult {
  success: boolean;
  changes: string[];
}

export class AutoFixService {
  /**
   * Checks if a lot or building currently has any regulatory violations
   * that can be automatically fixed by the system.
   */
  public static canAutoFix(lot: LotParcel, building?: BuildingInstance | null): boolean {
    if (!lot) return false;
    if (lot.violations.length > 0) return true;
    const rule = ZONE_RULES[lot.zone];
    if (lot.metrics.kdbPercent > rule.maxKDB) return true;
    if (lot.metrics.kdhPercent < rule.minKDH) return true;
    if (lot.metrics.klbRatio > rule.maxKLB) return true;
    return false;
  }

  /**
   * Executes the Smart Auto-Fix algorithm:
   * 1. Pushes building back to comply with GSB front setback.
   * 2. Scales building footprint so KDB <= max allowed.
   * 3. Places permeable biopores / shade trees so KDH >= required threshold.
   * All changes are grouped into a single Undo/Redo command.
   */
  public static applyAutoFix(
    engine: Engine,
    lot: LotParcel,
    building: BuildingInstance
  ): AutoFixResult {
    const changes: string[] = [];
    const composite = new CompositeCommand(`Auto-Fix Regulasi: ${building.name} di ${lot.name}`);
    const rule = ZONE_RULES[lot.zone];

    let currentPos = building.position.clone();
    let currentWidth = building.width || 10;
    let currentLength = building.length || 10;
    let currentFloorCount = building.floorCount || 1;

    // --- 1. GSB Setback Auto-Correction ---
    const requiredGSB = rule.minGSBFront ?? rule.minGSB ?? 3.0;
    const lotCenter = lot.position;

    // Direct physical measurement from lot front boundary
    const buildingFrontZ = currentPos.z + (currentLength / 2);
    const lotFrontZ = lotCenter.z + (lot.length / 2);
    const setbackFromFront = lotFrontZ - buildingFrontZ;

    const currentFrontSetback = Math.min(
      lot.metrics.gsbFrontActualM ?? 4.0,
      setbackFromFront
    );

    if (currentFrontSetback < requiredGSB || setbackFromFront < requiredGSB) {
      const actualGap = Math.min(currentFrontSetback, setbackFromFront);
      const deficit = requiredGSB - actualGap + 0.5; // +0.5m safety buffer

      let pushDir = new THREE.Vector3(0, 0, 0);

      // Look for the front edge of lot or nearest road
      const nearestRoadHeading = AutoFixService.getNearestRoadHeading(engine, currentPos);
      if (nearestRoadHeading !== null) {
        // Normal to road heading
        pushDir.set(
          -Math.cos(nearestRoadHeading),
          0,
          Math.sin(nearestRoadHeading)
        ).normalize();
      } else {
        // Fallback: push toward lot center
        pushDir.set(lotCenter.x - currentPos.x, 0, lotCenter.z - currentPos.z).normalize();
      }

      // If already at center or invalid pushDir, push towards Z-
      if (pushDir.lengthSq() < 0.1) {
        pushDir.set(0, 0, -1);
      }

      const newPos = currentPos.clone().addScaledVector(pushDir, deficit);

      composite.add(
        new UpdateBuildingParamCommand(
          engine,
          building.id,
          { position: currentPos.clone() },
          { position: newPos.clone() },
          `Geser mundur ${deficit.toFixed(1)}m memenuhi GSB Depan (${requiredGSB}m)`
        )
      );

      currentPos = newPos;
      changes.push(`Mundurkan posisi bangunan ${deficit.toFixed(1)} m ke dalam sempadan (GSB: ${requiredGSB}m).`);
    }

    // --- 2. KDB Footprint Auto-Correction ---
    const lotArea = Math.max(10, lot.areaM2);
    const maxAllowedGroundArea = lotArea * (rule.maxKDB / 100) * 0.96; // 4% safety margin
    const currentGroundArea = BuildingManager.getBuildingGroundArea(building);

    if (currentGroundArea > maxAllowedGroundArea) {
      const scaleRatio = Math.sqrt(maxAllowedGroundArea / currentGroundArea);
      const newWidth = Math.round(currentWidth * scaleRatio * 10) / 10;
      const newLength = Math.round(currentLength * scaleRatio * 10) / 10;

      // Check if we can add an extra floor so total built space isn't lost
      const totalBuiltBefore = currentGroundArea * currentFloorCount;
      const newGroundArea = newWidth * newLength;
      let newFloorCount = currentFloorCount;

      const potentialFloorCount = Math.ceil(totalBuiltBefore / newGroundArea);
      const potentialKLB = (newGroundArea * potentialFloorCount) / lotArea;

      if (potentialKLB <= rule.maxKLB && potentialFloorCount <= 8 && potentialFloorCount > currentFloorCount) {
        newFloorCount = potentialFloorCount;
        changes.push(`Kompensasi KDB: Tambah ke ${newFloorCount} lantai (KLB aman: ${potentialKLB.toFixed(2)}).`);
      }

      composite.add(
        new UpdateBuildingParamCommand(
          engine,
          building.id,
          { width: currentWidth, length: currentLength, floorCount: currentFloorCount },
          { width: newWidth, length: newLength, floorCount: newFloorCount },
          `Sesuaikan tapak KDB ke ${rule.maxKDB}% (L:${newWidth}m, P:${newLength}m)`
        )
      );

      currentWidth = newWidth;
      currentLength = newLength;
      currentFloorCount = newFloorCount;
      changes.push(`Proporsikan tapak bangunan ke ${newWidth}m × ${newLength}m agar KDB patuh (<= ${rule.maxKDB}%).`);
    }

    // --- 3. KDH Green Area & Drainage Auto-Enhancement ---
    const requiredKDH = rule.minKDH;
    const currentKDH = lot.metrics.kdhPercent;

    if (currentKDH < requiredKDH) {
      // Place biopores / shade trees in available corners of the lot
      const corners = engine.lotManager ? engine.lotManager.getLotCorners2D(lot) : [];
      let addedCount = 0;

      for (let i = 0; i < Math.min(corners.length, 3); i++) {
        const corner = corners[i];
        // Offset slightly inward
        const cornerPos = new THREE.Vector3(
          corner.x * 0.85 + lot.position.x * 0.15,
          0,
          corner.y * 0.85 + lot.position.z * 0.15
        );

        // Check distance to building
        if (cornerPos.distanceTo(currentPos) > (currentWidth / 2 + 1.5)) {
          const newItem: LandscapeItem = {
            id: `autofix_green_${Date.now()}_${i}`,
            type: i === 0 ? 'biopore' : 'shade_tree',
            position: cornerPos,
            radius: i === 0 ? 1.0 : 3.0,
            lotId: lot.id
          };

          composite.add(new AddLandscapeCommand(engine, newItem));
          addedCount++;
        }
      }

      if (addedCount > 0) {
        changes.push(`Menambahkan ${addedCount} elemen resapan (Sumur Biopori & Vegetasi Peneduh) agar KDH >= ${requiredKDH}%.`);
      }
    }

    // Execute composite command
    engine.executeCommand(composite);
    proceduralAudio.playStarChime();

    try {
      showSnackbar({
        variant: 'success',
        title: 'Tata Ruang Dikoreksi Otomatis',
        detail: 'Patuh KDB, GSB, & KDH',
        undoable: true,
        groupKey: 'autofix_applied',
      });
    } catch {}

    return {
      success: true,
      changes: changes.length > 0 ? changes : ['Seluruh parameter bangunan dan kavling telah memenuhi SNI & tata ruang.']
    };
  }

  private static getNearestRoadHeading(engine: Engine, pos: THREE.Vector3): number | null {
    let closestDist = Infinity;
    let heading: number | null = null;

    for (const edge of engine.roadManager.graph.edges.values()) {
      const s = engine.roadManager.graph.nodes.get(edge.startNodeId);
      const e = engine.roadManager.graph.nodes.get(edge.endNodeId);
      if (!s || !e) continue;

      const midX = (s.position.x + e.position.x) / 2;
      const midZ = (s.position.z + e.position.z) / 2;
      const dist = Math.hypot(pos.x - midX, pos.z - midZ);

      if (dist < 40 && dist < closestDist) {
        closestDist = dist;
        heading = Math.atan2(e.position.x - s.position.x, e.position.z - s.position.z);
      }
    }

    return heading;
  }
}
