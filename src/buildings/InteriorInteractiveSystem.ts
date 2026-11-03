import * as THREE from 'three';
import { proceduralAudio } from '../audio/ProceduralAudio';

export type InteractiveDoorType = 'swing' | 'sliding';
export type InteractiveSeatType = 'chair' | 'sofa' | 'bench';

export interface InteractiveDoor {
  id: string;
  type: InteractiveDoorType;
  buildingId: string;
  floorIndex: number;
  group: THREE.Group;
  leftLeafMesh: THREE.Mesh;
  rightLeafMesh?: THREE.Mesh;
  doorCenterLocal: THREE.Vector3;
  worldPosition: THREE.Vector3;
  doorWidth: number;
  doorHeight: number;
  isOpen: boolean;
  currentRatio: number; // 0.0 (closed) to 1.0 (open)
  targetRatio: number;
  swingAngle: number;
  slideDist: number;
  swingDirection?: number; // T3.3: -1 or +1 (swings away from player approach)
  closeDistance?: number; // Close threshold distance (default 3.2m for T3.3, or 2.8m for standard 90 deg)
}

export interface InteractiveSeat {
  id: string;
  type: InteractiveSeatType;
  buildingId: string;
  floorIndex: number;
  worldPosition: THREE.Vector3;
  facingAngle: number;
  label: string;
}

export interface InteractiveRoomFixture {
  id: string;
  buildingId: string;
  floorIndex: number;
  roomType: string;
  fanGroup?: THREE.Group;
  lightMesh?: THREE.Mesh;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    floorY: number;
    height: number;
  };
  isOccupied: boolean;
  fanSpeed: number;
}

/**
 * Singleton system managing physical interactions for building interiors:
 * - Dynamic opening/closing doors via proximity detection (< 2.2m open, > 2.8m close)
 * - Interactive seating zones (0.45m eye level ergonomic sit/stand)
 * - Proximity room lighting & spinning tropical ceiling fans
 * - Real-time acoustic & thermal cross-ventilation telemetry
 */
export class InteriorInteractiveSystem {
  private static instance: InteriorInteractiveSystem | null = null;
  public static readonly MAX_ACTIVE_CEILING_LIGHTS: number = 0;

  public doors: Map<string, InteractiveDoor> = new Map();
  public seats: Map<string, InteractiveSeat> = new Map();
  public fixtures: Map<string, InteractiveRoomFixture> = new Map();
  public ceilingLightPool: THREE.PointLight[] = [];
  public ceilingLightMasterEnabled: boolean = false;
  public activeIndoorBuildingId: string | null = null;

  private scene: THREE.Scene | null = null;
  private readonly _scratchLightPos: THREE.Vector3 = new THREE.Vector3();

  // Cached door open factor per building for physics analyzers (0.0 = all closed, 1.0 = all open)
  private buildingDoorFactors: Map<string, number> = new Map();

  public static getInstance(): InteriorInteractiveSystem {
    if (!InteriorInteractiveSystem.instance) {
      InteriorInteractiveSystem.instance = new InteriorInteractiveSystem();
    }
    return InteriorInteractiveSystem.instance;
  }

  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    this.ensureCeilingLightPool();
  }

  private ensureCeilingLightPool(fallbackRoot?: THREE.Object3D | null): void {
    while (this.ceilingLightPool.length < InteriorInteractiveSystem.MAX_ACTIVE_CEILING_LIGHTS) {
      const light = new THREE.PointLight(0xffecd2, 2.2, 14, 1.4);
      light.castShadow = false;
      light.visible = false;
      light.name = `PooledCeilingLight_${this.ceilingLightPool.length + 1}`;
      this.ceilingLightPool.push(light);
    }

    const targetParent = this.scene || fallbackRoot || null;
    if (targetParent) {
      for (const light of this.ceilingLightPool) {
        if (light.parent !== targetParent) {
          targetParent.add(light);
        }
      }
    }
  }

  public disableCeilingLights(): void {
    for (const light of this.ceilingLightPool) {
      light.visible = false;
    }
  }

  public getActiveCeilingLightCount(): number {
    return this.ceilingLightPool.filter((l) => l.visible).length;
  }

  public registerDoor(door: InteractiveDoor): void {
    this.doors.set(door.id, door);
  }

  public registerSeat(seat: InteractiveSeat): void {
    this.seats.set(seat.id, seat);
  }

  public unregisterSeat(seatId: string): void {
    this.seats.delete(seatId);
  }

  public unregisterDoor(doorId: string): void {
    this.doors.delete(doorId);
  }

  public registerFixture(fixture: InteractiveRoomFixture): void {
    this.fixtures.set(fixture.id, fixture);
  }

  public clearBuilding(buildingId: string): void {
    for (const [id, door] of this.doors.entries()) {
      if (door.buildingId === buildingId) {
        this.doors.delete(id);
      }
    }
    for (const [id, seat] of this.seats.entries()) {
      if (seat.buildingId === buildingId) {
        this.seats.delete(id);
      }
    }
    for (const [id, fix] of this.fixtures.entries()) {
      if (fix.buildingId === buildingId) {
        this.fixtures.delete(id);
      }
    }
    this.buildingDoorFactors.delete(buildingId);
  }

  public clearAll(): void {
    this.doors.clear();
    this.seats.clear();
    this.fixtures.clear();
    this.buildingDoorFactors.clear();
    this.ceilingLightMasterEnabled = false;
    this.activeIndoorBuildingId = null;
    this.disableCeilingLights();
  }

  private resolveRootScene(obj?: THREE.Object3D | null): THREE.Object3D | null {
    let cur: THREE.Object3D | null | undefined = obj;
    let last: THREE.Object3D | null = null;
    while (cur) {
      last = cur;
      cur = cur.parent;
    }
    return last;
  }

  /**
   * Deactivated per T1.1: Ceiling PointLight pool is disabled to ensure active PointLight count is 0.
   * Primary lighting uses single DirectionalLight (sun/moon) + HemisphereLight with emissive materials.
   */
  public updateCeilingLights(
    playerPos: THREE.Vector3,
    enabled: boolean,
    activeBuildingId?: string | null
  ): void {
    this.disableCeilingLights();
  }

  /**
   * Evaluates proximity of player to all doors, seats, and room fixtures.
   * Updates animations smoothly with THREE.MathUtils.damp.
   */
  public update(
    deltaTime: number,
    playerPos: THREE.Vector3,
    isFirstPerson: boolean,
    isCeilingLightOn?: boolean,
    activeBuildingId?: string | null
  ): void {
    const dt = Math.min(deltaTime, 0.1);
    const effectiveLightOn = isCeilingLightOn !== undefined ? isCeilingLightOn : this.ceilingLightMasterEnabled;
    const effectiveBldId = activeBuildingId !== undefined ? activeBuildingId : this.activeIndoorBuildingId;

    // 1. Process Doors
    const buildingRatios: Record<string, { sum: number; count: number }> = {};

    for (const door of this.doors.values()) {
      // Re-evaluate world position if group matrix changed
      if (door.group.parent) {
        door.group.getWorldPosition(door.worldPosition);
      }

      if (isFirstPerson) {
        // Vertical distance check (same floor, +/- 2.2m)
        const dY = Math.abs(playerPos.y - door.worldPosition.y);
        const dHorizontal = Math.hypot(playerPos.x - door.worldPosition.x, playerPos.z - door.worldPosition.z);

        if (dY < 2.2) {
          if (dHorizontal < 2.2) {
            // T3.3: Two-way swing door: dot product of (player pos - door pos) against door normal
            if (door.targetRatio === 0) {
              const doorNormal = new THREE.Vector3(0, 0, 1);
              if (door.group) {
                const q = new THREE.Quaternion();
                door.group.getWorldQuaternion(q);
                doorNormal.applyQuaternion(q).normalize();
              }
              const toPlayerX = playerPos.x - door.worldPosition.x;
              const toPlayerZ = playerPos.z - door.worldPosition.z;
              const dot = toPlayerX * doorNormal.x + toPlayerZ * doorNormal.z;
              // Swings AWAY from player around edge hinge axis:
              // If dot >= 0 (player in front / along normal), swing backwards (-1)
              // If dot < 0 (player behind / opposite normal), swing forwards (+1)
              door.swingDirection = dot >= 0 ? -1 : 1;
            }
            door.targetRatio = 1.0;
          } else {
            const closeDist = door.closeDistance ?? (door.swingAngle && Math.abs(door.swingAngle) > 1.65 ? 3.2 : 2.8);
            if (dHorizontal > closeDist) {
              door.targetRatio = 0.0;
            }
          }
        } else {
          door.targetRatio = 0.0;
        }
      } else {
        door.targetRatio = 0.0;
      }

      // Smooth interpolation (~0.35s with easing: lambda ~8.5)
      const prevRatio = door.currentRatio;
      door.currentRatio = THREE.MathUtils.damp(door.currentRatio, door.targetRatio, 8.5, dt);

      // Trigger audio events at threshold
      if (prevRatio < 0.15 && door.currentRatio >= 0.15 && !door.isOpen) {
        door.isOpen = true;
        proceduralAudio.playDoorOpen(door.type);
      } else if (prevRatio > 0.15 && door.currentRatio <= 0.15 && door.isOpen) {
        door.isOpen = false;
        proceduralAudio.playDoorClose(door.type);
      }

      // Animate Geometry
      if (door.type === 'swing') {
        // T3.3: Swing door leaf around edge hinge axis (~100 degrees, ~1.745 rad) AWAY from player
        const maxSwingRad = 100 * (Math.PI / 180);
        const dir = door.swingDirection !== undefined ? door.swingDirection : -1;
        const angle = door.currentRatio * maxSwingRad * dir;
        door.leftLeafMesh.rotation.y = angle;
      } else if (door.type === 'sliding') {
        // Slide left and right leaves apart horizontally
        const slide = door.currentRatio * door.slideDist;
        door.leftLeafMesh.position.x = -slide;
        if (door.rightLeafMesh) {
          door.rightLeafMesh.position.x = slide;
        }
      }

      // Track building door factors
      if (!buildingRatios[door.buildingId]) {
        buildingRatios[door.buildingId] = { sum: 0, count: 0 };
      }
      buildingRatios[door.buildingId].sum += door.currentRatio;
      buildingRatios[door.buildingId].count += 1;
    }

    for (const [bId, data] of Object.entries(buildingRatios)) {
      this.buildingDoorFactors.set(bId, data.count > 0 ? data.sum / data.count : 0);
    }

    // 2. Process Room Fixtures (Lighting & Ceiling Fans)
    for (const fix of this.fixtures.values()) {
      if (isFirstPerson) {
        const inX = playerPos.x >= fix.bounds.minX && playerPos.x <= fix.bounds.maxX;
        const inZ = playerPos.z >= fix.bounds.minZ && playerPos.z <= fix.bounds.maxZ;
        const inY = playerPos.y >= fix.bounds.floorY - 0.2 && playerPos.y <= fix.bounds.floorY + fix.bounds.height;
        fix.isOccupied = inX && inZ && inY;
      } else {
        fix.isOccupied = false;
      }

      // Rotate ceiling fan
      if (fix.fanGroup) {
        const targetSpeed = fix.isOccupied ? 6.5 : 0.0;
        fix.fanSpeed = THREE.MathUtils.damp(fix.fanSpeed, targetSpeed, 2.5, dt);
        fix.fanGroup.rotation.y += fix.fanSpeed * dt;
      }

      // Modulate light intensity
      if (fix.lightMesh && fix.lightMesh.material) {
        const mat = fix.lightMesh.material as THREE.MeshBasicMaterial;
        const targetAlpha = fix.isOccupied || effectiveLightOn ? 1.0 : 0.25;
        if (mat.opacity !== undefined) {
          mat.opacity = THREE.MathUtils.damp(mat.opacity, targetAlpha, 4.0, dt);
        }
      }
    }

    // 3. Update bounded max-2 ceiling PointLight pool
    const shouldEnableLights =
      isFirstPerson &&
      effectiveLightOn &&
      (activeBuildingId !== undefined
        ? activeBuildingId === null
          ? false
          : true
        : this.activeIndoorBuildingId === null && isCeilingLightOn === undefined
          ? false
          : true);
    this.updateCeilingLights(playerPos, shouldEnableLights, effectiveBldId);
  }

  /**
   * Finds the nearest seat within interaction radius (< 1.4m horizontal, < 1.0m vertical)
   */
  public getNearestSeat(playerPos: THREE.Vector3): InteractiveSeat | null {
    let nearest: InteractiveSeat | null = null;
    let minDist = 1.4;

    for (const seat of this.seats.values()) {
      const dY = Math.abs(playerPos.y - seat.worldPosition.y);
      if (dY > 1.2) continue;

      const dH = Math.hypot(playerPos.x - seat.worldPosition.x, playerPos.z - seat.worldPosition.z);
      if (dH < minDist) {
        minDist = dH;
        nearest = seat;
      }
    }

    return nearest;
  }

  /**
   * Gets the door open factor for a building (0.0 to 1.0)
   * Used by AcousticAnalyzer and ThermalVentilationAnalyzer
   */
  public getBuildingDoorOpenFactor(buildingId: string): number {
    return this.buildingDoorFactors.get(buildingId) || 0;
  }
}
