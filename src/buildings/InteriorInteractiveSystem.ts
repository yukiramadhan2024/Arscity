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

  public doors: Map<string, InteractiveDoor> = new Map();
  public seats: Map<string, InteractiveSeat> = new Map();
  public fixtures: Map<string, InteractiveRoomFixture> = new Map();

  // Cached door open factor per building for physics analyzers (0.0 = all closed, 1.0 = all open)
  private buildingDoorFactors: Map<string, number> = new Map();

  public static getInstance(): InteriorInteractiveSystem {
    if (!InteriorInteractiveSystem.instance) {
      InteriorInteractiveSystem.instance = new InteriorInteractiveSystem();
    }
    return InteriorInteractiveSystem.instance;
  }

  public registerDoor(door: InteractiveDoor): void {
    this.doors.set(door.id, door);
  }

  public registerSeat(seat: InteractiveSeat): void {
    this.seats.set(seat.id, seat);
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
  }

  /**
   * Evaluates proximity of player to all doors, seats, and room fixtures.
   * Updates animations smoothly with THREE.MathUtils.damp.
   */
  public update(deltaTime: number, playerPos: THREE.Vector3, isFirstPerson: boolean): void {
    const dt = Math.min(deltaTime, 0.1);

    // 1. Process Doors
    const buildingRatios: Record<string, { sum: number; count: number }> = {};

    for (const door of this.doors.values()) {
      // Re-evaluate world position if group matrix changed
      if (door.group.parent) {
        door.group.getWorldPosition(door.worldPosition);
      }

      if (isFirstPerson) {
        // Vertical distance check (same floor, +/- 1.8m)
        const dY = Math.abs(playerPos.y - door.worldPosition.y);
        const dHorizontal = Math.hypot(playerPos.x - door.worldPosition.x, playerPos.z - door.worldPosition.z);

        if (dY < 2.2) {
          if (dHorizontal < 2.2) {
            door.targetRatio = 1.0;
          } else if (dHorizontal > 2.8) {
            door.targetRatio = 0.0;
          }
        } else {
          door.targetRatio = 0.0;
        }
      } else {
        door.targetRatio = 0.0;
      }

      // Smooth interpolation
      const prevRatio = door.currentRatio;
      door.currentRatio = THREE.MathUtils.damp(door.currentRatio, door.targetRatio, 9.0, dt);

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
        // Swing door leaves around hinge pivot (Y axis)
        const angle = door.currentRatio * door.swingAngle;
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
        const targetAlpha = fix.isOccupied ? 1.0 : 0.25;
        if (mat.opacity !== undefined) {
          mat.opacity = THREE.MathUtils.damp(mat.opacity, targetAlpha, 4.0, dt);
        }
      }
    }
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
