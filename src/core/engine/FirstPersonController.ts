import * as THREE from 'three';
import { BuildingManager } from '../../buildings/BuildingManager';
import { Terrain } from '../../world/Terrain';

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
    } else if (e.code === 'KeyR') {
      this.traverseFloor('up');
    } else if (e.code === 'KeyF') {
      this.traverseFloor('down');
    } else if (e.code === 'Escape') {
      if (this.onExit) this.onExit();
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

  public update(deltaTime: number): void {
    if (!this.isActive) return;

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

    const moveDir = new THREE.Vector3(dx, 0, dz).normalize();
    const rayOrigins = [
      new THREE.Vector3(this.position.x, this.position.y - 0.45, this.position.z), // Waist level
      new THREE.Vector3(this.position.x, this.position.y - 0.1, this.position.z),  // Chest level
    ];

    if (!this.buildingManager || this.buildingManager.masterGroup.children.length === 0) {
      return true;
    }

    for (const origin of rayOrigins) {
      this.horizontalRaycaster.set(origin, moveDir);
      this.horizontalRaycaster.far = Math.max(0.42, moveLen + 0.32);

      const hits = this.horizontalRaycaster.intersectObjects(
        this.buildingManager.masterGroup.children,
        true
      );

      for (const hit of hits) {
        if (hit.distance < 0.32) {
          // If hit face normal directly opposes motion, block
          if (hit.face) {
            const worldNormal = hit.face.normal.clone().applyQuaternion(hit.object.getWorldQuaternion(new THREE.Quaternion()));
            if (moveDir.dot(worldNormal) < -0.15) {
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

    // Raycast against building geometry (floors, decks, rooftops)
    const rayOrigin = new THREE.Vector3(x, Math.max(50, this.position.y + 10.0), z);
    this.downRaycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));

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
    const rayOrigin = new THREE.Vector3(pos.x, pos.y + 0.1, pos.z);
    this.upRaycaster.set(rayOrigin, new THREE.Vector3(0, 1, 0));
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
        totalFloors: this.totalFloors
      });
    }
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
