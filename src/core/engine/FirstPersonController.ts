import * as THREE from 'three';
import { BuildingManager } from '../../buildings/BuildingManager';
import { Terrain } from '../../world/Terrain';
import { InteriorInteractiveSystem, InteractiveSeat } from '../../buildings/InteriorInteractiveSystem';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { PolygonMath } from '../math/PolygonMath';

export interface MicroRoomMetrics {
  roomId: string;
  roomName: string;
  floorLabel: string;
  areaM2: number;
  lux: number;
  sniLuxStatus: 'Optimum (SNI)' | 'Cukup' | 'Kurang Cahaya' | 'Terlalu Terang';
  ach: number;
  temperatureC: number;
  noiseDba: number;
  interiorVariantName: string;
}

export interface FirstPersonState {
  isActive: boolean;
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  isGrounded: boolean;
  isSprinting: boolean;
  isUnderRoof: boolean;
  insideBuildingId: string | null;
  insideBuildingName: string | null;
  currentFloor: number;
  totalFloors: number;
  isSeated: boolean;
  nearbySeatLabel: string | null;
}

export class FirstPersonController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private buildingManager?: BuildingManager;
  private terrain?: Terrain;

  public isActive: boolean = false;
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.65, 0);
  public yaw: number = 0;
  public pitch: number = 0;

  // Speeds
  public walkSpeed: number = 4.0;   // m/s
  public sprintSpeed: number = 7.5; // m/s
  public jumpSpeed: number = 6.0;   // m/s
  public gravity: number = -18.0;   // m/s²
  public eyeHeight: number = 1.65;  // Human scale 1.65m

  private velocityY: number = 0;
  private isGrounded: boolean = true;
  public isUnderRoof: boolean = false;

  // Interactive Seating (0.45m Ergonomic Height)
  public isSeated: boolean = false;
  public seatedSeat: InteractiveSeat | null = null;
  public nearbySeat: InteractiveSeat | null = null;

  // Multi-floor traversal & interior location state
  public insideBuildingId: string | null = null;
  public insideBuildingName: string | null = null;
  public currentFloor: number = 1;
  public targetFloor: number = 1;
  public totalFloors: number = 1;
  public floorHeight: number = 3.2;
  private targetFloorGroundY: number = 0;

  // Keyboard input state
  private keysDown: Set<string> = new Set();
  public isPointerLocked: boolean = false;

  // Raycasters for collision, floor, and roof detection
  private downRaycaster: THREE.Raycaster;
  private upRaycaster: THREE.Raycaster;
  private horizontalRaycaster: THREE.Raycaster;

  // Callbacks
  public onStateChanged?: (state: FirstPersonState) => void;
  public onExit?: () => void;

  // Lapis 4: Zero-GC scratchpad vectors & quaternions
  private readonly _scratchMoveDir: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchOriginWaist: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchOriginChest: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchRayOrigin: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchDownDir: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
  private readonly _scratchUpDir: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private readonly _scratchWorldQuat: THREE.Quaternion = new THREE.Quaternion();
  private readonly _scratchWorldNormal: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchLookTarget: THREE.Vector3 = new THREE.Vector3();
  public onCycleInteriorVariant?: () => void;
  public onToggleCeilingLight?: () => void;
  public isCeilingLightOn: boolean = false;
  private warmCeilingLight: THREE.PointLight | null = null;
  public currentVariantName: 'Standar Tropis' | 'Open-Plan Modern' | 'Kompak' = 'Standar Tropis';

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    buildingManager?: BuildingManager,
    terrain?: Terrain
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.buildingManager = buildingManager;
    this.terrain = terrain;

    this.downRaycaster = new THREE.Raycaster();
    this.downRaycaster.far = 100.0;
    this.upRaycaster = new THREE.Raycaster();
    this.upRaycaster.far = 30.0;
    this.horizontalRaycaster = new THREE.Raycaster();
    this.horizontalRaycaster.far = 0.55;

    this.bindEvents();
  }

  private bindEvents(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this.onPointerLockChange);
      document.addEventListener('mousemove', this.onMouseMove);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }
  }

  private onPointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    if (!this.isPointerLocked && this.isActive) {
      this.emitState();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isActive || !this.isPointerLocked) return;

    const sensitivity = 0.0022;
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;

    // Clamp vertical pitch to prevent flipping (-85° to 85°)
    const maxPitch = (85 * Math.PI) / 180;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;
    this.keysDown.add(e.code);

    if (e.code === 'Space' && this.isGrounded) {
      this.velocityY = this.jumpSpeed;
      this.isGrounded = false;
    } else if (e.code === 'KeyG') {
      if (this.insideBuildingId) {
        this.cycleInteriorVariant();
      }
    } else if (e.code === 'KeyL') {
      if (this.insideBuildingId) {
        this.toggleCeilingLight();
      }
    } else if (e.code === 'KeyR') {
      this.traverseFloor('up');
    } else if (e.code === 'KeyF') {
      this.traverseFloor('down');
    } else if (e.code === 'KeyE') {
      if (this.isSeated) {
        this.standUp();
      } else if (this.nearbySeat) {
        this.sitDown(this.nearbySeat);
      } else if (this.insideBuildingId && this.totalFloors > 1) {
        const nextFloor = this.targetFloor < this.totalFloors ? this.targetFloor + 1 : 1;
        this.goToFloor(nextFloor);
      }
    } else if (e.code === 'Escape') {
      if (this.isSeated) {
        this.standUp();
      } else if (this.onExit) {
        this.onExit();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  public traverseFloor(direction: 'up' | 'down'): boolean {
    const bld = this.buildingManager?.getBuildingAtPosition?.(this.position.x, this.position.z);
    if (!bld && !this.insideBuildingId) return false;

    if (bld) {
      const total = Math.max(1, bld.floorCount || (bld.floors ? bld.floors.length : 1));
      this.totalFloors = total;
      this.insideBuildingId = bld.id;
      this.insideBuildingName = bld.name;
      this.floorHeight = bld.floorHeight || 3.2;
    }

    const flH = bld?.floorHeight || this.floorHeight || 3.2;
    const plinth = bld?.plinthHeight ?? 0;
    const baseY = bld ? bld.position.y + plinth : 0;

    if (direction === 'up' && this.targetFloor < this.totalFloors) {
      this.targetFloor++;
      this.currentFloor = this.targetFloor;
      this.targetFloorGroundY = baseY + (this.targetFloor - 1) * flH;
      this.position.y = this.targetFloorGroundY + this.eyeHeight;
      this.camera.position.copy(this.position);
      this.emitState();
      return true;
    } else if (direction === 'down' && this.targetFloor > 1) {
      this.targetFloor--;
      this.currentFloor = this.targetFloor;
      this.targetFloorGroundY = baseY + (this.targetFloor - 1) * flH;
      this.position.y = this.targetFloorGroundY + this.eyeHeight;
      this.camera.position.copy(this.position);
      this.emitState();
      return true;
    }
    return false;
  }

  public goToFloor(floorNum: number): boolean {
    const bld = this.buildingManager?.getBuildingAtPosition?.(this.position.x, this.position.z);
    if (!bld && !this.insideBuildingId) return false;

    if (bld) {
      const total = Math.max(1, bld.floorCount || (bld.floors ? bld.floors.length : 1));
      this.totalFloors = total;
      this.insideBuildingId = bld.id;
      this.insideBuildingName = bld.name;
      this.floorHeight = bld.floorHeight || 3.2;
    }

    if (floorNum < 1 || floorNum > this.totalFloors) return false;

    this.targetFloor = floorNum;
    this.currentFloor = floorNum;
    const flH = bld?.floorHeight || this.floorHeight || 3.2;
    const plinth = bld?.plinthHeight ?? 0.35;
    const baseY = bld ? bld.position.y + plinth : 0;
    this.targetFloorGroundY = baseY + (this.targetFloor - 1) * flH;
    this.position.y = this.targetFloorGroundY + this.eyeHeight;
    this.camera.position.copy(this.position);
    this.emitState();
    return true;
  }

  public enter(startPos?: THREE.Vector3, initialYaw?: number): void {
    this.isActive = true;
    if (startPos) {
      this.position.copy(startPos);
    }
    if (initialYaw !== undefined) {
      this.yaw = initialYaw;
    }
    this.pitch = 0;
    this.velocityY = 0;
    this.keysDown.clear();
    this.currentFloor = 1;
    this.targetFloor = 1;
    this.isSeated = false;
    this.seatedSeat = null;

    const groundY = this.calculateGroundHeight(this.position.x, this.position.z);
    this.position.y = groundY + this.eyeHeight;

    try {
      if (this.domElement && typeof this.domElement.requestPointerLock === 'function') {
        this.domElement.requestPointerLock();
      }
    } catch {
      // User hasn't interacted yet
    }

    this.emitState();
  }

  public exit(): void {
    this.isActive = false;
    this.keysDown.clear();
    if (typeof document !== 'undefined' && document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
    this.emitState();
  }

  public lockPointer(): void {
    if (this.isActive && this.domElement && typeof this.domElement.requestPointerLock === 'function') {
      this.domElement.requestPointerLock();
    }
  }

  public sitDown(seat: InteractiveSeat): void {
    this.isSeated = true;
    this.seatedSeat = seat;
    this.position.x = seat.worldPosition.x;
    this.position.z = seat.worldPosition.z;
    this.position.y = seat.worldPosition.y + 0.48; // Ergonomic 0.45-0.50m sitting eye height
    this.velocityY = 0;
    this.isGrounded = true;
    proceduralAudio.playSitDown();
    this.emitState();
  }

  public standUp(): void {
    if (!this.isSeated) return;
    this.isSeated = false;
    this.seatedSeat = null;
    const groundY = this.calculateGroundHeight(this.position.x, this.position.z);
    this.position.y = groundY + this.eyeHeight;
    proceduralAudio.playStandUp();
    this.emitState();
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    // Seated state check
    if (this.isSeated) {
      const wantsMove =
        this.keysDown.has('KeyW') ||
        this.keysDown.has('KeyS') ||
        this.keysDown.has('KeyA') ||
        this.keysDown.has('KeyD') ||
        this.keysDown.has('ArrowUp') ||
        this.keysDown.has('ArrowDown') ||
        this.keysDown.has('ArrowLeft') ||
        this.keysDown.has('ArrowRight') ||
        this.keysDown.has('Space');

      if (wantsMove) {
        this.standUp();
      } else {
        // Hold camera steady at chair cushion level
        if (this.seatedSeat) {
          this.position.x = this.seatedSeat.worldPosition.x;
          this.position.z = this.seatedSeat.worldPosition.z;
          this.position.y = this.seatedSeat.worldPosition.y + 0.48;
        }
        this.camera.position.copy(this.position);
        const lookTarget = new THREE.Vector3(
          this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch),
          this.position.y + Math.sin(this.pitch),
          this.position.z + Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        this.camera.lookAt(lookTarget);
        this.emitState();
        return;
      }
    }

    // Query nearby chair/sofa
    this.nearbySeat = InteriorInteractiveSystem.getInstance().getNearestSeat(this.position);

    const dt = Math.min(deltaTime, 0.1);
    const isSprinting = this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight');
    const speed = (isSprinting ? this.sprintSpeed : this.walkSpeed) * dt;

    let forward = 0;
    let strafe = 0;

    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) forward += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) forward -= 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) strafe -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) strafe += 1;

    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe);
      forward /= len;
      strafe /= len;

      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);

      const dx = (sinY * forward - cosY * strafe) * speed;
      const dz = (cosY * forward + sinY * strafe) * speed;

      // Wall and doorway portal collision detection
      const canMove = this.testWallCollision(dx, dz);
      if (canMove) {
        this.position.x += dx;
        this.position.z += dz;
      } else {
        // Slide along single axis if diagonal was blocked
        if (this.testWallCollision(dx, 0)) {
          this.position.x += dx;
        } else if (this.testWallCollision(0, dz)) {
          this.position.z += dz;
        }
      }
    }

    // Apply gravity & jumping
    this.velocityY += this.gravity * dt;
    this.position.y += this.velocityY * dt;

    // Ground and Multi-Floor Collision
    const groundY = this.calculateGroundHeight(this.position.x, this.position.z);
    const targetY = groundY + this.eyeHeight;

    if (this.position.y <= targetY) {
      this.position.y = targetY;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Check if player is under a roof
    this.isUnderRoof = this.checkIfUnderRoof(this.position);

    // Apply to Three.js camera
    this.camera.position.copy(this.position);
    const lookTarget = new THREE.Vector3(
      this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch),
      this.position.y + Math.sin(this.pitch),
      this.position.z + Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(lookTarget);

    this.emitState();
  }

  /**
   * Tests horizontal motion against building walls.
   * Open door portals (where wall geometry was subtracted by SubQuadWallBuilder)
   * produce zero intersection hits and allow seamless entry into the building.
   */
  private testWallCollision(dx: number, dz: number): boolean {
    const moveLen = Math.hypot(dx, dz);
    if (moveLen < 0.0001) return true;

    this._scratchMoveDir.set(dx, 0, dz).normalize();
    this._scratchOriginWaist.set(this.position.x, this.position.y - 0.45, this.position.z);
    this._scratchOriginChest.set(this.position.x, this.position.y - 0.1, this.position.z);

    if (!this.buildingManager || this.buildingManager.masterGroup.children.length === 0) {
      return true;
    }

    const origins = [this._scratchOriginWaist, this._scratchOriginChest];
    for (const origin of origins) {
      this.horizontalRaycaster.set(origin, this._scratchMoveDir);
      this.horizontalRaycaster.far = Math.max(0.42, moveLen + 0.32);

      const hits = this.horizontalRaycaster.intersectObjects(
        this.buildingManager.masterGroup.children,
        true
      );

      for (const hit of hits) {
        if (hit.distance < 0.32) {
          // If hit face normal directly opposes motion, block
          if (hit.face) {
            this._scratchWorldNormal.copy(hit.face.normal).applyQuaternion(
              hit.object.getWorldQuaternion(this._scratchWorldQuat)
            );
            if (this._scratchMoveDir.dot(this._scratchWorldNormal) < -0.15) {
              return false;
            }
          } else {
            return false;
          }
        }
      }
    }

    return true;
  }

  private calculateGroundHeight(x: number, z: number): number {
    const bld = this.buildingManager?.getBuildingAtPosition?.(x, z);
    if (bld) {
      this.insideBuildingId = bld.id;
      this.insideBuildingName = bld.name;
      this.totalFloors = Math.max(1, bld.floorCount || (bld.floors ? bld.floors.length : 1));

      const flH = bld.floorHeight || 3.2;
      const plinth = bld.plinthHeight ?? 0.35;

      // 1. Continuous Physical StairZone Check
      const stairZones: any[] = bld.userData?.stairZones || (bld as any).stairZones || [];
      if (stairZones.length > 0) {
        // Transform player (x, z) to building local coordinate space
        const dx = x - bld.position.x;
        const dz = z - bld.position.z;
        const rot = bld.rotationY || 0;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        const localX = cos * dx - sin * dz;
        const localZ = sin * dx + cos * dz;

        // Bounding corridor of the stair flight
        const coreX = -Math.max(1.2, Math.min(bld.width * 0.35, (bld.width || 12) * 0.22));
        const coreZ = 0;
        const runLength = 3.2;
        const flightX = coreX - 0.68;
        const flightW = 1.35;
        const zStart = coreZ - runLength * 0.5; // -1.6
        const zEnd = coreZ + runLength * 0.5;   // +1.6

        const inStairFootprint =
          localX >= flightX - flightW * 0.6 &&
          localX <= flightX + flightW * 0.6 &&
          localZ >= zStart - 0.5 &&
          localZ <= zEnd + 0.5;

        if (inStairFootprint) {
          // Find relevant stair zone for current or adjacent floor
          let currentZone = stairZones.find((sz: any) => sz.floorIndex === this.targetFloor - 1);
          if (!currentZone) {
            let minDiff = 999999;
            currentZone = stairZones[0];
            for (const sz of stairZones) {
              const diff = Math.abs(this.position.y - (bld.position.y + sz.baseFloorY));
              if (diff < minDiff) {
                minDiff = diff;
                currentZone = sz;
              }
            }
          }

          if (currentZone) {
            // Calculate progress t along the stair slope from 0.0 (foot) to 1.0 (landing)
            const t = Math.max(0.0, Math.min(1.0, (localZ - zStart) / (zEnd - zStart)));
            const stairElevation = bld.position.y + currentZone.baseFloorY + t * currentZone.floorHeight;

            // Lock targetFloor once player reaches top or bottom of flight
            if (t >= 0.98) {
              this.targetFloor = Math.min(this.totalFloors, currentZone.floorIndex + 2);
              this.currentFloor = this.targetFloor;
            } else if (t <= 0.02) {
              this.targetFloor = Math.max(1, currentZone.floorIndex + 1);
              this.currentFloor = this.targetFloor;
            }

            return stairElevation;
          }
        }
      }

      // Flat floor slab elevation for current targetFloor
      const targetY = bld.position.y + plinth + (this.targetFloor - 1) * flH;
      this.currentFloor = this.targetFloor;
      return targetY;
    }

    if (this.insideBuildingId) {
      const flH = this.floorHeight || 3.2;
      this.currentFloor = this.targetFloor;
      return (this.targetFloor - 1) * flH;
    }

    this.insideBuildingId = null;
    this.insideBuildingName = null;
    this.currentFloor = 1;
    this.targetFloor = 1;
    this.totalFloors = 1;

    let highestFloorY = 0;

    // Raycast against building geometry (floors, decks, rooftops) - Zero-GC
    this._scratchRayOrigin.set(x, Math.max(50, this.position.y + 10.0), z);
    this.downRaycaster.set(this._scratchRayOrigin, this._scratchDownDir);

    if (this.buildingManager?.masterGroup && this.buildingManager.masterGroup.children.length > 0) {
      this.buildingManager.masterGroup.updateMatrixWorld(true);
      const hits = this.downRaycaster.intersectObjects(
        this.buildingManager.masterGroup.children,
        true
      );
      if (hits.length > 0) {
        for (const hit of hits) {
          if (hit.point.y > highestFloorY) {
            highestFloorY = hit.point.y;
          }
        }
      }
    }

    const terrainY = this.terrain ? this.terrain.getHeightAt(x, z) : 0;
    return Math.max(terrainY, highestFloorY);
  }

  private checkIfUnderRoof(pos: THREE.Vector3): boolean {
    if (this.insideBuildingId) return true;
    if (!this.buildingManager || !this.buildingManager.masterGroup || this.buildingManager.masterGroup.children.length === 0) {
      return false;
    }
    this._scratchRayOrigin.set(pos.x, pos.y + 0.1, pos.z);
    this.upRaycaster.set(this._scratchRayOrigin, this._scratchUpDir);
    const hits = this.upRaycaster.intersectObjects(
      this.buildingManager.masterGroup.children,
      true
    );
    return hits.length > 0;
  }

  private emitState(): void {
    if (this.onStateChanged) {
      this.onStateChanged({
        isActive: this.isActive,
        position: this.position.clone(),
        yaw: this.yaw,
        pitch: this.pitch,
        isGrounded: this.isGrounded,
        isSprinting: this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight'),
        isUnderRoof: this.isUnderRoof,
        insideBuildingId: this.insideBuildingId,
        insideBuildingName: this.insideBuildingName,
        currentFloor: this.currentFloor,
        totalFloors: this.totalFloors,
        isSeated: this.isSeated,
        nearbySeatLabel: this.nearbySeat ? this.nearbySeat.label : null
      });
    }
  }

  /**
   * Calculates real-time micro-space environmental metrics for the room
   * where the player is currently standing inside a building.
   */
  public cycleInteriorVariant(): string {
    const variants: ('Standar Tropis' | 'Open-Plan Modern' | 'Kompak')[] = [
      'Standar Tropis',
      'Open-Plan Modern',
      'Kompak'
    ];
    const nextIdx = (variants.indexOf(this.currentVariantName) + 1) % variants.length;
    this.currentVariantName = variants[nextIdx];
    if (this.onCycleInteriorVariant) {
      this.onCycleInteriorVariant();
    }
    if (this.onStateChanged) {
      this.emitState();
    }
    return this.currentVariantName;
  }

  public toggleCeilingLight(): boolean {
    this.isCeilingLightOn = !this.isCeilingLightOn;
    if (this.isCeilingLightOn) {
      if (!this.warmCeilingLight) {
        this.warmCeilingLight = new THREE.PointLight(0xffecd2, 2.2, 16, 1.2);
        this.warmCeilingLight.castShadow = false;
        this.camera.add(this.warmCeilingLight);
      }
      this.warmCeilingLight.visible = true;
    } else {
      if (this.warmCeilingLight) {
        this.warmCeilingLight.visible = false;
      }
    }
    if (this.onToggleCeilingLight) {
      this.onToggleCeilingLight();
    }
    if (this.onStateChanged) {
      this.emitState();
    }
    return this.isCeilingLightOn;
  }

  public getCurrentRoomMetrics(): MicroRoomMetrics | null {
    if (!this.insideBuildingId || !this.buildingManager) return null;
    const bld = this.buildingManager.buildings.get(this.insideBuildingId);
    if (!bld || !bld.interiorLayouts || bld.interiorLayouts.length === 0) return null;

    const floorIdx = Math.max(0, Math.min(bld.interiorLayouts.length - 1, this.currentFloor - 1));
    const layout = bld.interiorLayouts[floorIdx];
    if (!layout || !layout.rooms || layout.rooms.length === 0) return null;

    // Convert player position to local coordinates of the building
    const rel = new THREE.Vector3().subVectors(this.position, bld.position);
    rel.applyAxisAngle(new THREE.Vector3(0, 1, 0), -bld.rotationY);
    const localPt = new THREE.Vector2(rel.x, rel.z);

    let activeRoom = layout.rooms.find((r) => PolygonMath.isPointInPolygon(localPt, r.boundary));
    if (!activeRoom) {
      activeRoom = layout.rooms[0];
    }

    // 1. Natural daylight illumination (Lux) calibrated to SNI 03-2396-2001
    const daylightFactor = activeRoom.type === 'living_room' || activeRoom.type === 'terrace' ? 0.025 : 0.016;
    const rawLux = Math.round(9500 * daylightFactor + (this.isCeilingLightOn ? 320 : 55));
    const lux = Math.max(40, Math.min(1000, rawLux));

    let sniLuxStatus: MicroRoomMetrics['sniLuxStatus'] = 'Optimum (SNI)';
    if (lux < 120) sniLuxStatus = 'Kurang Cahaya';
    else if (lux > 500) sniLuxStatus = 'Terlalu Terang';
    else if (lux >= 150 && lux <= 350) sniLuxStatus = 'Optimum (SNI)';
    else sniLuxStatus = 'Cukup';

    // 2. Ventilation rate (ACH) and Room Temperature (C)
    const ach = activeRoom.type === 'terrace' ? 12.5 : 6.4;
    const temperatureC = 27.6;

    // 3. Indoor noise level (dBA) with facade acoustic attenuation
    const noiseDba = activeRoom.type === 'terrace' ? 56 : 41;

    const variantKey = bld.interiorVariant || 'variant_a';
    const variantNames: Record<string, string> = {
      variant_a: 'Varian A: Standar Tropis',
      variant_b: 'Varian B: Open-Plan Modern',
      variant_c: 'Varian C: Kompak Efisien'
    };

    return {
      roomId: activeRoom.id,
      roomName: activeRoom.name,
      floorLabel: `Lantai ${this.currentFloor}`,
      areaM2: Math.round(activeRoom.areaM2 * 10) / 10,
      lux,
      sniLuxStatus,
      ach,
      temperatureC,
      noiseDba,
      interiorVariantName: variantNames[variantKey] || 'Varian A: Standar Tropis'
    };
  }

  public dispose(): void {
    this.exit();
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerlockchange', this.onPointerLockChange);
      document.removeEventListener('mousemove', this.onMouseMove);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
    }
  }
}
