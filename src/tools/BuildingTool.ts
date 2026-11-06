import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { PREFAB_CATALOG, BuildingInstance, PrefabPreset } from '../buildings/PrefabTypes';
import { RaycastManager } from '../core/engine/RaycastManager';
import { PrefabMeshBuilder } from '../buildings/PrefabMeshBuilder';
import { proceduralAudio } from '../audio/ProceduralAudio';
import { AddBuildingCommand } from '../core/commands/CityCommands';
import { HumanScaleFigure } from '../buildings/HumanScaleFigure';
import { ZONE_RULES } from '../zones/ZoneTypes';
import { CustomBuildingMeshBuilder } from '../buildings/CustomBuildingMeshBuilder';
import { CustomBuilding, generateFloorsForMassingShape } from '../buildings/CustomBuildingModel';
import type { Engine } from '../core/engine/Engine';
import { showSnackbar } from '../ui/state/useSnackbarStore';
import { AutoFixService } from '../zones/AutoFixService';

export class BuildingTool {
  public buildingManager: BuildingManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;
  public engine?: Engine;

  public activePresetKey: string = 'house_36';
  public customBuildingTemplate: Partial<BuildingInstance> | null = null;
  public currentRotation: number = 0; // 0, PI/2, PI, 3PI/2
  public manualRotationOffset: number = 0;
  public isNearRoad: boolean = false;
  public autoRotationAngle: number = 0;
  private lastGsbCompliant: boolean | null = null;

  private ghostGroup: THREE.Group | null = null;
  private nextBuildingId: number = 1;
  public isPlacementValid: boolean = true;

  // Stretch-to-Fit Lot & Building Massing drag state
  public isDraggingStretch: boolean = false;
  private stretchStartPos: THREE.Vector3 | null = null;
  public stretchedWidthOverride: number | null = null;
  public stretchedApronOverride: number | null = null;
  private lastStretchStepSound: number = 0;
  private suppressNextClick: boolean = false;

  constructor(
    buildingManager: BuildingManager,
    raycastManager: RaycastManager,
    scene: THREE.Scene,
    engine?: Engine
  ) {
    this.buildingManager = buildingManager;
    this.raycastManager = raycastManager;
    this.scene = scene;
    this.engine = engine;

    this.rebuildGhost();
  }

  public setPreset(key: string): void {
    this.customBuildingTemplate = null;
    if (!PREFAB_CATALOG[key]) return;
    this.activePresetKey = key;
    this.rebuildGhost();
  }

  public setCustomTemplate(template: Partial<BuildingInstance> | null): void {
    this.customBuildingTemplate = template;
    this.rebuildGhost();
  }

  public rotate(): void {
    this.manualRotationOffset = (this.manualRotationOffset + Math.PI * 0.5) % (Math.PI * 2);
    if (this.isNearRoad) {
      this.currentRotation = (this.autoRotationAngle + this.manualRotationOffset) % (Math.PI * 2);
    } else {
      this.currentRotation = this.manualRotationOffset;
    }
    if (this.ghostGroup) {
      this.ghostGroup.rotation.y = this.currentRotation;
    }
  }

  private disposeGhostGroup(): void {
    if (this.ghostGroup) {
      this.ghostGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      });
      this.scene.remove(this.ghostGroup);
      this.ghostGroup = null;
    }
  }

  private rebuildGhost(): void {
    this.disposeGhostGroup();

    let group: THREE.Group;
    let bWidth = 6;
    let bLength = 10;

    if (this.customBuildingTemplate) {
      const tmpl = this.customBuildingTemplate;
      bWidth = tmpl.width || 10;
      bLength = tmpl.length || 12;
      const flCount = tmpl.floorCount || 2;
      const flH = tmpl.floorHeight || 3.2;

      const customModel: CustomBuilding = {
        id: 'ghost_preview_custom',
        name: tmpl.name || 'Bangunan Kustom',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: this.currentRotation,
        plinthHeight: 0.35,
        floors: tmpl.floors && tmpl.floors.length > 0
          ? tmpl.floors
          : generateFloorsForMassingShape(
              tmpl.massingShape || 'box',
              bWidth,
              bLength,
              flCount,
              flH
            ),
        roof: tmpl.customRoof || {
          type: tmpl.roofType === 'dome' ? 'flat' : (tmpl.roofType as any) || 'hip',
          pitchAngle: 30,
          overhang: tmpl.roofOverhang || 1.2,
          material: (tmpl.roofMaterial || 'clay_tile') as any
        },
        wallMaterial: tmpl.wallMaterial || 'plaster',
        wallColor: tmpl.wallColor || '#f8fafc',
        massingShape: tmpl.massingShape,
        windowStyle: tmpl.windowStyle,
        hasBalcony: tmpl.hasBalcony,
        hasSunLouvers: tmpl.hasSunLouvers,
        hasVerticalGarden: tmpl.hasVerticalGarden,
        hasFrontArcade: tmpl.hasFrontArcade,
        useBasePlinthMaterial: tmpl.useBasePlinthMaterial,
        baseMaterial: tmpl.baseMaterial,
        mullionColor: tmpl.mullionColor,
        hasSkylight: tmpl.hasSkylight,
        hasSolarPV: tmpl.hasSolarPV,
        exposeSteelFrame: tmpl.exposeSteelFrame,
        hasCarportAndTopBalcony: tmpl.hasCarportAndTopBalcony,
        hasVerticalSecondarySkin: tmpl.hasVerticalSecondarySkin
      };

      group = CustomBuildingMeshBuilder.buildCustomBuilding(customModel);
    } else {
      const preset = PREFAB_CATALOG[this.activePresetKey];
      if (!preset) return;
      bWidth = preset.defaultWidth;
      bLength = preset.defaultLength;

      const dummyInstance: BuildingInstance = {
        id: 'ghost_preview',
        presetKey: preset.key,
        name: preset.name,
        category: preset.category,
        position: new THREE.Vector3(0, 0, 0),
        rotationY: this.currentRotation,
        width: preset.defaultWidth,
        length: preset.defaultLength,
        floorCount: preset.defaultFloorCount,
        floorHeight: preset.floorHeight,
        roofType: preset.defaultRoofType,
        roofOverhang: preset.defaultRoofOverhang,
        wallMaterial: preset.defaultWallMaterial,
        wallColor: preset.defaultWallColor,
        roofMaterial: preset.defaultRoofMaterial
      };

      group = PrefabMeshBuilder.buildBuildingGroup(dummyInstance);
    }

    this.updateGhostGroupMaterial(group, true);

    // 1.65m Human Scale Ghost Figure positioned next to entrance
    const humanFigure = new HumanScaleFigure(1.65);
    humanFigure.setPosition(bWidth / 2 + 1.2, 0, -bLength / 2);
    group.add(humanFigure.getObject());

    this.ghostGroup = group;
    this.ghostGroup.name = 'BuildingGhostPreview';
    this.scene.add(this.ghostGroup);
  }

  private updateGhostGroupMaterial(group: THREE.Group, isValid: boolean): void {
    // iOS 27 System Tokens: --good (#34C759) and --bad (#FF3B30)
    const color = isValid ? 0x34c759 : 0xff3b30;
    const opacity = isValid ? 0.55 : 0.70;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if ((mesh.material as any)?.userData?.isScaleFigure) {
          return; // Keep 1.65m human silhouette in translucent cyan
        }
        if (!mesh.material || !(mesh.material as THREE.Material).userData?.isGhostMat) {
          mesh.material = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity,
            depthWrite: false
          });
          mesh.material.userData = { isGhostMat: true };
        } else {
          const mat = mesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(color);
          mat.opacity = opacity;
        }
      }
    });
  }

  /**
   * Helper to get oriented 2D polygon corners for SAT collision check.
   */
  private getFootprintCorners(center: THREE.Vector3, width: number, length: number, rotation: number, margin = 0.3): THREE.Vector2[] {
    const hw = (width / 2) + margin;
    const hl = (length / 2) + margin;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return [
      new THREE.Vector2(center.x + (-hw * cos - -hl * sin), center.z + (-hw * sin + -hl * cos)),
      new THREE.Vector2(center.x + (hw * cos - -hl * sin),  center.z + (hw * sin + -hl * cos)),
      new THREE.Vector2(center.x + (hw * cos - hl * sin),   center.z + (hw * sin + hl * cos)),
      new THREE.Vector2(center.x + (-hw * cos - hl * sin),  center.z + (-hw * sin + hl * cos))
    ];
  }

  /**
   * Separating Axis Theorem (SAT) collision test between two 2D convex polygons.
   */
  private doPolygonsIntersect(polyA: THREE.Vector2[], polyB: THREE.Vector2[]): boolean {
    const polygons = [polyA, polyB];
    for (let i = 0; i < polygons.length; i++) {
      const polygon = polygons[i];
      for (let i1 = 0; i1 < polygon.length; i1++) {
        const i2 = (i1 + 1) % polygon.length;
        const p1 = polygon[i1];
        const p2 = polygon[i2];
        const normal = new THREE.Vector2(-(p2.y - p1.y), p2.x - p1.x).normalize();

        let minA = Infinity, maxA = -Infinity;
        for (const p of polyA) {
          const dot = p.dot(normal);
          minA = Math.min(minA, dot);
          maxA = Math.max(maxA, dot);
        }

        let minB = Infinity, maxB = -Infinity;
        for (const p of polyB) {
          const dot = p.dot(normal);
          minB = Math.min(minB, dot);
          maxB = Math.max(maxB, dot);
        }

        if (maxA < minB || maxB < minA) {
          return false; // Separating axis found, no collision
        }
      }
    }
    return true; // Overlap on all axes => collision!
  }

  /**
   * Check whether candidate building collides with existing buildings or roads.
   */
  public checkCollision(center: THREE.Vector3, width: number, length: number, rotation: number): boolean {
    // 1. Raycast direct test: is the cursor hovering directly over an existing building?
    const bldHits = this.raycastManager.raycastObjects([this.buildingManager.masterGroup]);
    if (bldHits.length > 0) {
      return true; // Direct cursor hit on building
    }

    const candidateCorners = this.getFootprintCorners(center, width, length, rotation, 0.35);
    const candidateRadius = Math.hypot(width / 2, length / 2);

    // 2. Check collision with all existing buildings in BuildingManager
    for (const bld of this.buildingManager.buildings.values()) {
      const bldRadius = Math.hypot(bld.width / 2, bld.length / 2);
      const dist = new THREE.Vector2(center.x - bld.position.x, center.z - bld.position.z).length();
      if (dist > candidateRadius + bldRadius + 0.5) continue; // Broad phase prune

      const existingCorners = this.getFootprintCorners(bld.position, bld.width, bld.length, bld.rotationY, 0.35);
      if (this.doPolygonsIntersect(candidateCorners, existingCorners)) {
        return true; // Overlaps existing building!
      }
    }

    // 3. Check collision with road graph: is footprint overlapping road corridor or asphalt?
    if (this.engine?.roadManager) {
      const footprint = this.getFootprintCorners(center, width, length, rotation, 0);
      if (this.engine.roadManager.isFootprintOverlappingRoad(footprint, 0.5)) {
        return true; // Overlaps road asphalt or sidewalk corridor!
      }
    }

    // 4. Check collision with water bodies (retention ponds, rivers)
    if (this.engine?.landscapeManager?.isPositionInWater(center.x, center.z, 0.5)) {
      return true;
    }
    if (this.engine?.riverManager?.isPointInRiver(center.x, center.z, 0.5)) {
      return true;
    }
    for (const corner of candidateCorners) {
      if (this.engine?.landscapeManager?.isPositionInWater(corner.x, corner.y, 0.2)) {
        return true;
      }
      if (this.engine?.riverManager?.isPointInRiver(corner.x, corner.y, 0.2)) {
        return true;
      }
    }

    return false;
  }

  public getHighestFootprintGroundY(center: THREE.Vector3, width: number, length: number, rotation: number): number {
    const terrain = this.engine?.terrain;
    if (!terrain) return center.y;
    const corners = this.getFootprintCorners(center, width, length, rotation, 0);
    let maxY = terrain.getHeightAt(center.x, center.z);
    for (const corner of corners) {
      const gy = terrain.getHeightAt(corner.x, corner.y); // Note: Vector2.y corresponds to world Z
      if (gy > maxY) maxY = gy;
    }
    return maxY;
  }

  public handlePointerDown(snappedPos: THREE.Vector3): void {
    this.isDraggingStretch = true;
    this.stretchStartPos = snappedPos.clone();
    this.stretchedWidthOverride = null;
    this.stretchedApronOverride = null;
    this.lastStretchStepSound = 0;
  }

  public handlePointerUp(snappedPos: THREE.Vector3): void {
    if (!this.isDraggingStretch || !this.stretchStartPos) {
      this.isDraggingStretch = false;
      return;
    }
    const dragDist = this.stretchStartPos.distanceTo(snappedPos);
    const startClone = this.stretchStartPos.clone();
    this.isDraggingStretch = false;
    this.stretchStartPos = null;

    if (dragDist >= 1.8 && this.stretchedWidthOverride !== null) {
      const midPos = startClone.clone().lerp(snappedPos, 0.5);
      this.suppressNextClick = true;
      this.handleClick(midPos, this.stretchedWidthOverride, this.stretchedApronOverride ?? undefined);
      this.stretchedWidthOverride = null;
      this.stretchedApronOverride = null;
      if (this.ghostGroup) {
        this.ghostGroup.scale.set(1, 1, 1);
      }
    } else {
      this.stretchedWidthOverride = null;
      this.stretchedApronOverride = null;
      if (this.ghostGroup) {
        this.ghostGroup.scale.set(1, 1, 1);
      }
    }
  }

  public handleClick(
    snappedPos: THREE.Vector3,
    overridePodiumWidth?: number,
    overrideApronDepth?: number
  ): void {
    if (this.suppressNextClick && overridePodiumWidth === undefined) {
      this.suppressNextClick = false;
      return;
    }
    this.suppressNextClick = false;

    let bWidth: number;
    let bLength: number;

    if (this.customBuildingTemplate) {
      bWidth = this.customBuildingTemplate.width || 10;
      bLength = this.customBuildingTemplate.length || 12;
    } else {
      const preset = PREFAB_CATALOG[this.activePresetKey];
      if (!preset) return;
      bWidth = preset.defaultWidth;
      bLength = preset.defaultLength;
    }

    const effectivePodiumWidth = overridePodiumWidth ? Math.max(bWidth, overridePodiumWidth) : undefined;
    const collisionWidth = effectivePodiumWidth ?? bWidth;

    // 1. Check collision with road asphalt / corridor
    if (this.engine?.roadManager) {
      const footprint = this.getFootprintCorners(snappedPos, collisionWidth, bLength, this.currentRotation, 0);
      if (this.engine.roadManager.isFootprintOverlappingRoad(footprint, 0.5)) {
        proceduralAudio.playTaptic('boundary');
        showSnackbar({
          variant: 'warning',
          title: 'Lokasi Terhalang Jalan Raya',
          detail: 'Objek tidak boleh berada di atas aspal',
          groupKey: 'collision_road',
        });
        return;
      }
    }

    // Check collision with water bodies
    if (
      this.engine?.landscapeManager?.isPositionInWater(snappedPos.x, snappedPos.z, 0.5) ||
      this.engine?.riverManager?.isPointInRiver(snappedPos.x, snappedPos.z, 0.5)
    ) {
      proceduralAudio.playTaptic('boundary');
      showSnackbar({
        variant: 'warning',
        title: 'Lokasi Berada di Atas Air',
        detail: 'Bangunan tidak boleh dibangun di atas badan air atau kolam retensi',
        groupKey: 'collision_water',
      });
      return;
    }

    // 2. Check collision with existing buildings or obstacles
    const isColliding = this.checkCollision(snappedPos, bWidth, bLength, this.currentRotation);
    if (isColliding) {
      proceduralAudio.playTaptic('boundary');
      showSnackbar({
        variant: 'warning',
        title: 'Lokasi Tidak Valid',
        detail: 'Menabrak bangunan atau rintangan lain',
        groupKey: 'collision_obstacle',
      });
      return;
    }

    const highestY = this.getHighestFootprintGroundY(snappedPos, bWidth, bLength, this.currentRotation);
    const placedPos = snappedPos.clone();
    placedPos.y = highestY;

    const id = `bld_${this.nextBuildingId++}`;
    let instance: BuildingInstance;

    if (this.customBuildingTemplate) {
      const tmpl = this.customBuildingTemplate;
      instance = {
        id,
        presetKey: tmpl.presetKey || 'custom_designer',
        isCustom: true,
        name: tmpl.name || 'Bangunan Kustom',
        category: tmpl.category || 'residential',
        position: placedPos,
        rotationY: this.currentRotation,
        width: bWidth,
        length: bLength,
        floorCount: tmpl.floorCount || 2,
        floorHeight: tmpl.floorHeight || 3.2,
        roofType: tmpl.roofType || 'hip',
        roofOverhang: tmpl.roofOverhang || 1.2,
        wallMaterial: tmpl.wallMaterial || 'plaster',
        wallColor: tmpl.wallColor || '#f8fafc',
        roofMaterial: (tmpl.roofMaterial || 'dark_zinc') as any,
        massingShape: tmpl.massingShape,
        windowStyle: tmpl.windowStyle,
        hasBalcony: tmpl.hasBalcony,
        hasSunLouvers: tmpl.hasSunLouvers,
        hasVerticalGarden: tmpl.hasVerticalGarden,
        hasFrontArcade: tmpl.hasFrontArcade,
        useBasePlinthMaterial: tmpl.useBasePlinthMaterial,
        baseMaterial: tmpl.baseMaterial,
        mullionColor: tmpl.mullionColor,
        hasSkylight: tmpl.hasSkylight,
        hasSolarPV: tmpl.hasSolarPV,
        exposeSteelFrame: tmpl.exposeSteelFrame,
        hasCarportAndTopBalcony: tmpl.hasCarportAndTopBalcony,
        hasVerticalSecondarySkin: tmpl.hasVerticalSecondarySkin,
        apronDepth: overrideApronDepth ?? tmpl.apronDepth,
        subParts: effectivePodiumWidth
          ? {
              ...(tmpl.subParts || {}),
              podium_base: {
                partWidth: effectivePodiumWidth,
                partDepth: bLength,
                partFloors: (tmpl.floorCount || 2) >= 3 ? 2 : 1
              }
            }
          : tmpl.subParts
      };
    } else {
      const preset = PREFAB_CATALOG[this.activePresetKey];
      if (!preset) return;
      instance = {
        id,
        presetKey: preset.key,
        name: preset.name,
        category: preset.category,
        position: placedPos,
        rotationY: this.currentRotation,
        width: effectivePodiumWidth ? Math.min(effectivePodiumWidth, preset.defaultWidth * 1.45) : preset.defaultWidth,
        length: preset.defaultLength,
        floorCount: preset.defaultFloorCount,
        floorHeight: preset.floorHeight,
        roofType: preset.defaultRoofType,
        roofOverhang: preset.defaultRoofOverhang,
        wallMaterial: preset.defaultWallMaterial,
        wallColor: preset.defaultWallColor,
        roofMaterial: preset.defaultRoofMaterial,
        apronDepth: overrideApronDepth,
        subParts: effectivePodiumWidth
          ? {
              podium_base: {
                partWidth: effectivePodiumWidth,
                partDepth: preset.defaultLength * 1.08,
                partFloors: preset.defaultFloorCount >= 3 ? 2 : 1
              }
            }
          : undefined
      };
    }

    // Execute via CommandManager for full Undo/Redo capability!
    if (this.engine) {
      const command = new AddBuildingCommand(this.engine, instance);
      this.engine.commandManager.execute(command);

      // Check if placed building caused regulatory violations on its lot
      const lot = this.engine.lotManager.getLotAtPosition(placedPos.x, placedPos.z);
      if (lot && (lot.violations.length > 0 || lot.metrics.kdbPercent > (ZONE_RULES[lot.zone]?.maxKDB ?? 60))) {
        const violationDetails = lot.violations.join(' • ') || `KDB ${Math.round(lot.metrics.kdbPercent)}% (Maks ${ZONE_RULES[lot.zone]?.maxKDB}%)`;
        showSnackbar({
          variant: 'warning',
          title: 'Peringatan Regulasi Tata Ruang',
          detail: violationDetails,
          action: {
            label: 'Perbaiki Sekarang',
            onClick: () => {
              if (this.engine && lot) {
                const b = this.engine.buildingManager.buildings.get(id);
                if (b) {
                  AutoFixService.applyAutoFix(this.engine, lot, b);
                }
              }
            },
          },
          groupKey: `violation_lot_${lot.id}`,
        });
      }
    } else {
      this.buildingManager.addBuilding(instance);
    }

    proceduralAudio.playPlaceBuilding();
    proceduralAudio.playPlacementChord();
    proceduralAudio.playTaptic('boundary');
  }

  public update(): void {
    if (!this.ghostGroup) return;

    if (this.raycastManager.isHoveringGround) {
      const snapped = this.raycastManager.snappedPoint.clone();
      const preset = PREFAB_CATALOG[this.activePresetKey];
      const width = this.customBuildingTemplate ? (this.customBuildingTemplate.width || 10) : (preset ? preset.defaultWidth : 6);
      const length = this.customBuildingTemplate ? (this.customBuildingTemplate.length || 12) : (preset ? preset.defaultLength : 10);

      // 1. Auto-Rotate towards nearest road (Magnetic Street Alignment within 25m)
      if (this.engine?.roadManager) {
        const nearestRoad = this.engine.roadManager.findNearestRoadWithTangent(snapped, 25);
        if (nearestRoad) {
          this.isNearRoad = true;
          // Calculate angle so front facade faces the road
          const toRoadX = nearestRoad.nearestPoint.x - snapped.x;
          const toRoadZ = nearestRoad.nearestPoint.z - snapped.z;
          this.autoRotationAngle = Math.atan2(toRoadX, toRoadZ);
          this.currentRotation = (this.autoRotationAngle + this.manualRotationOffset) % (Math.PI * 2);
        } else {
          this.isNearRoad = false;
          this.currentRotation = this.manualRotationOffset;
        }
      }

      // 2. Stretch-to-Fit preview scaling when dragging along road
      let previewPos = snapped.clone();
      let effectiveW = width;
      if (this.isDraggingStretch && this.stretchStartPos) {
        const dragVec = snapped.clone().sub(this.stretchStartPos);
        const dragLen = Math.hypot(dragVec.x, dragVec.z);
        if (dragLen >= 1.8) {
          effectiveW = Math.min(width * 2.8, Math.max(width, Math.round((width + dragLen) * 2) / 2));
          this.stretchedWidthOverride = effectiveW;
          this.stretchedApronOverride = Math.min(12.0, Math.max(4.5, Number((4.5 + dragLen * 0.22).toFixed(1))));
          previewPos = this.stretchStartPos.clone().lerp(snapped, 0.5);
          this.ghostGroup.scale.set(effectiveW / width, 1, 1);

          const stepM = Math.round(effectiveW);
          if (stepM !== this.lastStretchStepSound) {
            proceduralAudio.playScaleStepSound(stepM);
            this.lastStretchStepSound = stepM;
          }
        } else {
          this.ghostGroup.scale.set(1, 1, 1);
        }
      } else {
        this.ghostGroup.scale.set(1, 1, 1);
      }

      // Adaptive Terrain Plinth: anchor height to highest ground elevation under footprint
      const highestY = this.getHighestFootprintGroundY(previewPos, effectiveW, length, this.currentRotation);
      previewPos.y = highestY;

      this.ghostGroup.position.copy(previewPos);
      this.ghostGroup.rotation.y = this.currentRotation;
      this.ghostGroup.visible = true;

      // 3. Collision check
      const isColliding = this.checkCollision(previewPos, effectiveW, length, this.currentRotation);
      const nextValid = !isColliding;
      if (nextValid !== this.isPlacementValid) {
        if (!nextValid) {
          proceduralAudio.playTaptic('boundary');
        }
        this.isPlacementValid = nextValid;
        this.updateGhostGroupMaterial(this.ghostGroup, this.isPlacementValid);
      }

      // 4. Real-time GSB guideline & boundary feedback
      if (this.engine?.lotManager && this.engine.spatialHighlighter) {
        const lot = this.engine.lotManager.getLotAtPosition(snapped.x, snapped.z);
        if (lot) {
          const zoneRule = ZONE_RULES[lot.zone];
          const minSide = zoneRule?.minGSBSide ?? 1.5;
          const minFront = zoneRule?.minGSBFront ?? 3.0;
          const minRear = zoneRule?.minGSBRear ?? 2.0;

          const hwSafe = Math.max(0.5, (lot.width - minSide * 2) / 2);
          const hlSafe = Math.max(0.5, (lot.length - minFront - minRear) / 2);
          const offsetZ = (minFront - minRear) / 2;

          const candCorners = this.getFootprintCorners(snapped, width, length, this.currentRotation, 0);

          let isGsbCompliant = true;
          for (const c of candCorners) {
            const relX = c.x - lot.position.x;
            const relZ = c.y - lot.position.z - offsetZ;

            if (Math.abs(relX) > hwSafe || Math.abs(relZ) > hlSafe) {
              isGsbCompliant = false;
              break;
            }
          }

          if (this.lastGsbCompliant !== isGsbCompliant) {
            if (!isGsbCompliant && this.lastGsbCompliant !== null) {
              proceduralAudio.playTaptic('boundary');
            }
            this.lastGsbCompliant = isGsbCompliant;
          }

          this.engine.spatialHighlighter.showGsbGuideline(lot, isGsbCompliant);
        } else {
          this.engine.spatialHighlighter.hideGsbGuideline();
          this.lastGsbCompliant = null;
        }
      }
    } else {
      this.ghostGroup.visible = false;
      if (this.engine?.spatialHighlighter) {
        this.engine.spatialHighlighter.hideGsbGuideline();
      }
      this.lastGsbCompliant = null;
    }
  }

  public setVisible(visible: boolean): void {
    if (this.ghostGroup) {
      this.ghostGroup.visible = visible;
    }
    if (!visible && this.engine?.spatialHighlighter) {
      this.engine.spatialHighlighter.hideGsbGuideline();
    }
  }

  public dispose(): void {
    if (this.engine?.spatialHighlighter) {
      this.engine.spatialHighlighter.hideGsbGuideline();
    }
    this.disposeGhostGroup();
  }
}
