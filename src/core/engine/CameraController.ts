import * as THREE from 'three';
import { proceduralAudio } from '../../audio/ProceduralAudio';

export type OrthographicViewMode = 'top' | 'front' | 'side' | 'section';

export interface CameraOptions {
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  defaultPitch?: number; // radians (default 50 deg)
  dampingFactor?: number;
}

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public orthoCamera: THREE.OrthographicCamera;
  public isOrthographic: boolean = false;
  public orthoMode: OrthographicViewMode = 'top';
  public enabled: boolean = true;

  private domElement: HTMLElement;

  // Orbit target (look-at point on terrain)
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetGoal: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Spherical coordinates
  public distance: number = 75;
  private distanceGoal: number = 75;
  public minDistance: number = 8;
  public maxDistance: number = 1200;

  // Azimuth (yaw, horizontal rotation around Y axis)
  public azimuth: number = Math.PI * 0.25; // 45 deg angle
  private azimuthGoal: number = Math.PI * 0.25;

  // Polar angle / pitch (vertical angle from zenith: 0 is top-down, PI/2 is ground level)
  // 50 deg incline from ground = 40 deg from vertical = (90 - 50) * PI / 180 = ~0.698 rad
  public polar: number = (40 * Math.PI) / 180;
  private polarGoal: number = (40 * Math.PI) / 180;
  public minPolar: number = (5 * Math.PI) / 180;   // Almost vertical top-down
  public maxPolar: number = (75 * Math.PI) / 180;  // Prevent ground clipping

  private damping: number = 0.12;

  // Apple iOS Momentum & Inertia Projection
  private azimuthVelocity: number = 0;
  private panVelocityX: number = 0;
  private panVelocityY: number = 0;
  private lastDragTimestamp: number = 0;
  private lastDeltaAzimuth: number = 0;
  private lastDeltaPanX: number = 0;
  private lastDeltaPanY: number = 0;

  // Apple iOS Hooke's Rubber-Banding parameters
  public readonly worldBound: number = 750;
  public readonly maxRubberStretch: number = 100;

  // Lapis 4: Zero-GC scratchpad vectors
  private readonly _scratchForward: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchRight: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchDelta: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchNewTarget: THREE.Vector3 = new THREE.Vector3();

  // Input states
  private isMiddleDragging: boolean = false;
  private isRightDragging: boolean = false;
  private isShiftDragging: boolean = false;
  private isAltOrbitDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };

  // Mousepad / Touchpad sensitivity (0.2x to 3.0x)
  public mousepadSensitivity: number = 1.0;

  // Touch tracking for pinch-zoom and 360 twist rotation
  private previousTouchDistance: number | null = null;
  private previousTouchAngle: number | null = null;
  private previousTouchCenter: { x: number; y: number } | null = null;

  private keysDown: Set<string> = new Set();
  public enableEdgePan: boolean = false;

  // Inspect mode
  public isInspectMode: boolean = false;
  private inspectSpeed: number = 0.3;

  // Walk Mode (1.65m eye level)
  public isWalkMode: boolean = false;
  public walkPosition: THREE.Vector3 = new THREE.Vector3(0, 1.65, 0);
  public walkYaw: number = 0;
  public walkPitch: number = 0;
  private savedDistance: number = 75;
  private savedPolar: number = (40 * Math.PI) / 180;
  private savedTarget: THREE.Vector3 = new THREE.Vector3();
  public onWalkModeChanged?: (isWalk: boolean) => void;

  // True 6-DOF Free-Fly Drone Mode
  public isDroneMode: boolean = false;
  public dronePosition: THREE.Vector3 = new THREE.Vector3(0, 15, 0);
  public droneVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public droneYaw: number = 0;
  public dronePitch: number = 0;
  public droneSpeed: number = 12.0;
  public droneMinSpeed: number = 1.0;
  public droneMaxSpeed: number = 35.0;
  public minDroneY: number = 0.8;
  public onDroneModeChanged?: (isDrone: boolean) => void;

  constructor(domElement: HTMLElement, options: CameraOptions = {}) {
    this.domElement = domElement;

    const aspect = domElement.clientWidth / domElement.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(options.fov || 45, aspect, 0.06, 4000);

    const orthoFrustum = 60;
    this.orthoCamera = new THREE.OrthographicCamera(
      (-orthoFrustum * aspect) / 2,
      (orthoFrustum * aspect) / 2,
      orthoFrustum / 2,
      -orthoFrustum / 2,
      1,
      4000
    );

    if (options.minDistance) this.minDistance = options.minDistance;
    if (options.maxDistance) this.maxDistance = options.maxDistance;

    this.bindEvents();
    this.updateCameraTransform(1.0); // Immediate snap
  }

  public get activeCamera(): THREE.Camera {
    return this.isOrthographic ? this.orthoCamera : this.camera;
  }

  private bindEvents(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('mousemove', this.onMouseMove);
      window.addEventListener('mouseup', this.onMouseUp);
      window.addEventListener('touchmove', this.onTouchMove, { passive: false });
      window.addEventListener('touchend', this.onTouchEnd);
    }
    if (this.domElement && this.domElement.addEventListener) {
      this.domElement.addEventListener('mousedown', this.onMouseDown);
      this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
      this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
      this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }
  }

  public dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      window.removeEventListener('mousemove', this.onMouseMove);
      window.removeEventListener('mouseup', this.onMouseUp);
      window.removeEventListener('touchmove', this.onTouchMove);
      window.removeEventListener('touchend', this.onTouchEnd);
    }
    if (this.domElement && this.domElement.removeEventListener) {
      this.domElement.removeEventListener('mousedown', this.onMouseDown);
      this.domElement.removeEventListener('wheel', this.onWheel);
      this.domElement.removeEventListener('touchstart', this.onTouchStart);
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    // Ignore if typing in an input
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
      return;
    }
    this.keysDown.add(e.code);

    if (e.code === 'KeyQ') {
      this.azimuthGoal -= (Math.PI / 8) * this.mousepadSensitivity; // Rotate counter-clockwise
    } else if (e.code === 'KeyE') {
      this.azimuthGoal += (Math.PI / 8) * this.mousepadSensitivity; // Rotate clockwise
    } else if (e.code === 'KeyF') {
      this.focusSelected();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (!this.enabled) return;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.lastDragTimestamp = performance.now();
    // Reset any ongoing momentum when starting a new gesture
    this.azimuthVelocity = 0;
    this.panVelocityX = 0;
    this.panVelocityY = 0;
    this.lastDeltaAzimuth = 0;
    this.lastDeltaPanX = 0;
    this.lastDeltaPanY = 0;

    if (e.button === 0 && e.altKey) {
      // Alt + Left Drag = Orbit 360 degrees (convenient for touchpad users)
      this.isAltOrbitDragging = true;
      e.preventDefault();
    } else if (e.button === 1) {
      // Middle click pan
      this.isMiddleDragging = true;
      e.preventDefault();
    } else if (e.button === 2) {
      // Right click orbit / tilt
      this.isRightDragging = true;
      this.isShiftDragging = e.shiftKey;
      e.preventDefault();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled) return;
    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };

    const now = performance.now();
    const dt = Math.max(0.001, (now - this.lastDragTimestamp) / 1000);
    this.lastDragTimestamp = now;

    if (this.isDroneMode && (this.isRightDragging || this.isAltOrbitDragging || e.buttons === 1 || e.buttons === 2)) {
      this.droneYaw -= deltaX * 0.003 * this.mousepadSensitivity;
      this.dronePitch -= deltaY * 0.003 * this.mousepadSensitivity;
      const maxPitch = (85 * Math.PI) / 180;
      this.dronePitch = Math.max(-maxPitch, Math.min(maxPitch, this.dronePitch));
      return;
    }

    if (this.isWalkMode && (this.isRightDragging || this.isAltOrbitDragging || e.buttons === 1)) {
      this.walkYaw -= deltaX * 0.003 * this.mousepadSensitivity;
      this.walkPitch -= deltaY * 0.003 * this.mousepadSensitivity;
      this.walkPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this.walkPitch));
      return;
    }

    if (this.isMiddleDragging) {
      // Pan along camera plane
      const pX = deltaX * 0.12 * (this.distance / 50) * this.mousepadSensitivity;
      const pY = deltaY * 0.12 * (this.distance / 50) * this.mousepadSensitivity;
      this.pan(pX, pY);
      this.lastDeltaPanX = pX / dt;
      this.lastDeltaPanY = pY / dt;
    } else if (this.isRightDragging || this.isAltOrbitDragging) {
      if (e.shiftKey || this.isShiftDragging) {
        // Shift + Drag = Pitch tilt adjust
        this.polarGoal += deltaY * 0.006 * this.mousepadSensitivity;
        this.polarGoal = Math.max(this.minPolar, Math.min(this.maxPolar, this.polarGoal));
      } else {
        // Free 360-degree horizontal azimuth orbit & pitch
        const deltaAz = deltaX * 0.007 * this.mousepadSensitivity;
        this.azimuthGoal += deltaAz;
        this.lastDeltaAzimuth = deltaAz / dt;
        this.polarGoal += deltaY * 0.005 * this.mousepadSensitivity;
        this.polarGoal = Math.max(this.minPolar, Math.min(this.maxPolar, this.polarGoal));
      }
    }

    // Optional edge panning
    if (this.enableEdgePan && !this.isMiddleDragging && !this.isRightDragging && !this.isAltOrbitDragging) {
      const edgeThreshold = 18;
      const rect = this.domElement.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let panX = 0;
      let panY = 0;
      if (mouseX < edgeThreshold) panX = 1;
      else if (mouseX > rect.width - edgeThreshold) panX = -1;

      if (mouseY < edgeThreshold) panY = 1;
      else if (mouseY > rect.height - edgeThreshold) panY = -1;

      if (panX !== 0 || panY !== 0) {
        this.pan(panX * 0.6 * this.mousepadSensitivity, panY * 0.6 * this.mousepadSensitivity);
      }
    }
  };

  private onMouseUp = (): void => {
    const timeSinceLastDrag = performance.now() - this.lastDragTimestamp;
    // If released while actively moving within 80ms, project natural physical inertia
    if (timeSinceLastDrag < 80) {
      if (this.isRightDragging || this.isAltOrbitDragging) {
        this.azimuthVelocity = THREE.MathUtils.clamp(this.lastDeltaAzimuth, -12, 12);
      }
      if (this.isMiddleDragging) {
        this.panVelocityX = THREE.MathUtils.clamp(this.lastDeltaPanX, -200, 200);
        this.panVelocityY = THREE.MathUtils.clamp(this.lastDeltaPanY, -200, 200);
      }
    } else {
      this.azimuthVelocity = 0;
      this.panVelocityX = 0;
      this.panVelocityY = 0;
    }

    this.isMiddleDragging = false;
    this.isRightDragging = false;
    this.isShiftDragging = false;
    this.isAltOrbitDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (!this.enabled) return;

    // 0. Drone speed adjustment when in Drone Mode
    if (this.isDroneMode) {
      this.droneSpeed = THREE.MathUtils.clamp(
        this.droneSpeed - e.deltaY * 0.03,
        this.droneMinSpeed,
        this.droneMaxSpeed
      );
      return;
    }

    // 1. Two-finger swipe or Shift/Alt held on mousepad/trackpad:
    // Enables continuous 360-degree horizontal rotation!
    if (e.shiftKey || e.altKey) {
      this.azimuthGoal += (e.deltaX || e.deltaY) * 0.005 * this.mousepadSensitivity;
      return;
    }

    // 2. Trackpad horizontal swipe (deltaX dominates) -> 360 degree orbit
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.8 && Math.abs(e.deltaX) > 2) {
      this.azimuthGoal += e.deltaX * 0.004 * this.mousepadSensitivity;
      return;
    }

    // 3. Zoom / Pinch-to-zoom
    const zoomDelta = e.deltaY * 0.04 * (this.distance / 50) * this.mousepadSensitivity;
    this.distanceGoal += zoomDelta;
    this.distanceGoal = Math.max(this.minDistance, Math.min(this.maxDistance, this.distanceGoal));
  };

  // Touch handlers for touchpad and touchscreen gestures
  private onTouchStart = (e: TouchEvent): void => {
    if (!this.enabled) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      this.previousTouchDistance = Math.hypot(dx, dy);
      this.previousTouchAngle = Math.atan2(dy, dx);
      this.previousTouchCenter = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.enabled) return;
    if (e.touches.length === 2 && this.previousTouchDistance !== null && this.previousTouchAngle !== null) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const currentDistance = Math.hypot(dx, dy);
      const currentAngle = Math.atan2(dy, dx);

      // Pinch zoom
      const distDelta = (this.previousTouchDistance - currentDistance) * 0.2 * this.mousepadSensitivity;
      this.distanceGoal += distDelta;
      this.distanceGoal = Math.max(this.minDistance, Math.min(this.maxDistance, this.distanceGoal));

      // 360-degree twist rotation
      let angleDelta = currentAngle - this.previousTouchAngle;
      // Wrap angle difference to [-PI, PI]
      while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
      while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
      this.azimuthGoal -= angleDelta * 1.5 * this.mousepadSensitivity;

      // Two finger pan
      if (this.previousTouchCenter) {
        const currentCenterX = (t1.clientX + t2.clientX) / 2;
        const currentCenterY = (t1.clientY + t2.clientY) / 2;
        const panDeltaX = (currentCenterX - this.previousTouchCenter.x) * 0.1 * (this.distance / 50);
        const panDeltaY = (currentCenterY - this.previousTouchCenter.y) * 0.1 * (this.distance / 50);
        this.pan(panDeltaX, panDeltaY);
        this.previousTouchCenter = { x: currentCenterX, y: currentCenterY };
      }

      this.previousTouchDistance = currentDistance;
      this.previousTouchAngle = currentAngle;
    }
  };

  private onTouchEnd = (e: TouchEvent): void => {
    if (e.touches.length < 2) {
      this.previousTouchDistance = null;
      this.previousTouchAngle = null;
      this.previousTouchCenter = null;
    }
  };

  public pan(screenDeltaX: number, screenDeltaY: number): void {
    // Convert screen pan to ground XZ vectors based on current azimuth (Zero-GC)
    this._scratchForward.set(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth)).normalize();
    this._scratchRight.set(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth)).normalize();

    const deltaGroundX = -this._scratchRight.x * screenDeltaX + this._scratchForward.x * screenDeltaY;
    const deltaGroundZ = -this._scratchRight.z * screenDeltaX + this._scratchForward.z * screenDeltaY;

    // Apple Rubber-Banding Hooke's Law:
    // When pulling camera beyond city ground boundary, apply progressive elastic resistance
    const applyHookeResistance = (current: number, delta: number, bound: number, maxStretch: number): number => {
      if (current > bound && delta > 0) {
        const stretch = current - bound;
        const factor = Math.max(0.04, 1.0 - (stretch / maxStretch));
        return delta * (factor * 0.35);
      }
      if (current < -bound && delta < 0) {
        const stretch = -bound - current;
        const factor = Math.max(0.04, 1.0 - (stretch / maxStretch));
        return delta * (factor * 0.35);
      }
      return delta;
    };

    const isDragging = this.isMiddleDragging || this.previousTouchCenter !== null;
    const bound = this.worldBound;
    const maxStretch = this.maxRubberStretch;

    let resX = deltaGroundX;
    let resZ = deltaGroundZ;

    if (isDragging) {
      resX = applyHookeResistance(this.targetGoal.x, deltaGroundX, bound, maxStretch);
      resZ = applyHookeResistance(this.targetGoal.z, deltaGroundZ, bound, maxStretch);
    }

    const wasInside = Math.abs(this.targetGoal.x) <= bound && Math.abs(this.targetGoal.z) <= bound;
    const limit = bound + maxStretch;

    this.targetGoal.x = Math.max(-limit, Math.min(limit, this.targetGoal.x + resX));
    this.targetGoal.z = Math.max(-limit, Math.min(limit, this.targetGoal.z + resZ));

    const isNowOutside = Math.abs(this.targetGoal.x) > bound || Math.abs(this.targetGoal.z) > bound;
    if (wasInside && isNowOutside && isDragging) {
      proceduralAudio.playTaptic('boundary');
    }
  }

  public focusAt(position: THREE.Vector3, distance?: number): void {
    this.targetGoal.copy(position);
    this.targetGoal.y = 0; // Keep ground reference
    if (distance) this.distanceGoal = distance;
  }

  public focusSelected(): void {
    // Focus near center or currently inspected point
    this.targetGoal.set(0, 0, 0);
    this.distanceGoal = 50;
  }

  public resetCamera(): void {
    if (this.isDroneMode) {
      this.setDroneMode(false);
    }
    if (this.isWalkMode) {
      this.setWalkMode(false);
    }
    this.targetGoal.set(0, 0, 0);
    this.distanceGoal = 75;
    this.azimuthGoal = Math.PI * 0.25;
    this.polarGoal = (40 * Math.PI) / 180;
    this.isOrthographic = false;
    this.isInspectMode = false;
  }

  public rotateOrbit(deltaRad: number): void {
    this.azimuthGoal += deltaRad;
  }

  public resetNorth(): void {
    this.azimuthGoal = 0;
  }

  public toggleTopDown(): void {
    this.isOrthographic = !this.isOrthographic;
    if (this.isOrthographic) {
      this.polarGoal = 0.05; // Straight down
    } else {
      this.polarGoal = (40 * Math.PI) / 180; // 50 deg incline
    }
  }

  /**
   * Synchronizes yaw and pitch directly from camera quaternion in 'YXZ' Euler order
   * Guarantees zero jumping, snapping, or direction flipping when switching modes.
   */
  public syncAnglesFromCameraQuaternion(): { yaw: number; pitch: number } {
    const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
    const maxPitch = (85 * Math.PI) / 180;
    const pitch = THREE.MathUtils.clamp(euler.x, -maxPitch, maxPitch);
    const yaw = euler.y;
    return { yaw, pitch };
  }

  public toggleDroneMode(): boolean {
    return this.setDroneMode(!this.isDroneMode);
  }

  public setDroneMode(enabled: boolean): boolean {
    if (this.isDroneMode === enabled) return this.isDroneMode;

    if (enabled) {
      if (this.isWalkMode) {
        this.isWalkMode = false;
        if (this.onWalkModeChanged) this.onWalkModeChanged(false);
      }

      this.savedDistance = this.distanceGoal;
      this.savedPolar = this.polarGoal;
      this.savedTarget.copy(this.targetGoal);

      this.isDroneMode = true;
      this.isOrthographic = false;

      // Extract current camera position and orientation seamlessly via quaternion
      this.dronePosition.copy(this.camera.position);
      if (this.dronePosition.y < 2.5) {
        this.dronePosition.y = 3.2; // cruising height for enterability
      }
      this.dronePosition.y = Math.max(this.minDroneY, this.dronePosition.y);

      const angles = this.syncAnglesFromCameraQuaternion();
      this.droneYaw = angles.yaw;
      this.dronePitch = angles.pitch;
      this.droneVelocity.set(0, 0, 0);
    } else {
      this.isDroneMode = false;

      // Smoothly compute ground look-at point ahead of drone so camera doesn't jump (Zero-GC)
      this._scratchForward.set(
        -Math.sin(this.droneYaw) * Math.cos(this.dronePitch),
        Math.sin(this.dronePitch),
        -Math.cos(this.droneYaw) * Math.cos(this.dronePitch)
      ).normalize();

      this._scratchNewTarget.copy(this.dronePosition).addScaledVector(this._scratchForward, Math.max(15, this.savedDistance * 0.7));
      this._scratchNewTarget.y = 0;
      this._scratchNewTarget.x = THREE.MathUtils.clamp(this._scratchNewTarget.x, -750, 750);
      this._scratchNewTarget.z = THREE.MathUtils.clamp(this._scratchNewTarget.z, -750, 750);

      this.targetGoal.copy(this._scratchNewTarget);
      this.target.copy(this._scratchNewTarget);

      this._scratchDelta.subVectors(this.camera.position, this._scratchNewTarget);
      const dist = this._scratchDelta.length();
      this.distanceGoal = THREE.MathUtils.clamp(dist, this.minDistance, this.maxDistance);
      this.distance = this.distanceGoal;

      if (dist > 0.001) {
        this.polarGoal = Math.acos(THREE.MathUtils.clamp(this._scratchDelta.y / dist, 0.05, 0.98));
        this.azimuthGoal = Math.atan2(this._scratchDelta.x, this._scratchDelta.z);
      } else {
        this.polarGoal = this.savedPolar;
        this.azimuthGoal = this.azimuth;
      }
      this.polar = this.polarGoal;
      this.azimuth = this.azimuthGoal;
    }

    if (this.onDroneModeChanged) this.onDroneModeChanged(this.isDroneMode);
    return this.isDroneMode;
  }

  public toggleWalkMode(): boolean {
    return this.setWalkMode(!this.isWalkMode);
  }

  public setWalkMode(enabled: boolean): boolean {
    if (this.isWalkMode === enabled) return this.isWalkMode;

    if (enabled) {
      if (this.isDroneMode) {
        this.isDroneMode = false;
        if (this.onDroneModeChanged) this.onDroneModeChanged(false);
      }

      this.savedDistance = this.distanceGoal;
      this.savedPolar = this.polarGoal;
      this.savedTarget.copy(this.targetGoal);

      this.isWalkMode = true;
      this.isOrthographic = false;

      // Seamless quaternion angle extraction
      const angles = this.syncAnglesFromCameraQuaternion();
      this.walkPosition.set(this.camera.position.x, 1.65, this.camera.position.z);
      this.walkYaw = angles.yaw;
      this.walkPitch = 0;
    } else {
      this.isWalkMode = false;
      this.targetGoal.copy(this.savedTarget);
      this.distanceGoal = this.savedDistance;
      this.polarGoal = this.savedPolar;
    }

    if (this.onWalkModeChanged) this.onWalkModeChanged(this.isWalkMode);
    return this.isWalkMode;
  }

  public update(deltaTime: number): void {
    if (!this.enabled) return;

    // 1. True 6-DOF Free-Fly Drone Mode
    if (this.isDroneMode) {
      this.dronePitch = THREE.MathUtils.clamp(this.dronePitch, -1.48, 1.48);
      const cosPitch = Math.cos(this.dronePitch);
      const sinPitch = Math.sin(this.dronePitch);
      const sinYaw = Math.sin(this.droneYaw);
      const cosYaw = Math.cos(this.droneYaw);

      // Local 3D forward vector
      const forwardDir = new THREE.Vector3(
        -sinYaw * cosPitch,
        sinPitch,
        -cosYaw * cosPitch
      ).normalize();

      // Horizontal strafe right vector
      const rightDir = new THREE.Vector3(
        cosYaw,
        0,
        -sinYaw
      ).normalize();

      // World vertical vector
      const upDir = new THREE.Vector3(0, 1, 0);

      const targetVel = new THREE.Vector3(0, 0, 0);

      // W / S / Up / Down: Fly forward / backward along look vector
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) targetVel.add(forwardDir);
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) targetVel.sub(forwardDir);

      // A / D / Left / Right: Strafe laterally
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) targetVel.add(rightDir);
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) targetVel.sub(rightDir);

      // E / Space: Ascend (+Y)
      if (this.keysDown.has('KeyE') || this.keysDown.has('Space')) targetVel.add(upDir);

      // Q / Shift / C: Descend (-Y)
      if (
        this.keysDown.has('KeyQ') ||
        this.keysDown.has('ShiftLeft') ||
        this.keysDown.has('ShiftRight') ||
        this.keysDown.has('KeyC')
      ) {
        targetVel.sub(upDir);
      }

      if (targetVel.lengthSq() > 0) {
        targetVel.normalize().multiplyScalar(this.droneSpeed);
      }

      // Smooth exponential velocity damping
      const decay = 1 - Math.exp(-12 * Math.max(0.001, deltaTime));
      this.droneVelocity.lerp(targetVel, decay);

      this.dronePosition.addScaledVector(this.droneVelocity, deltaTime);

      // Ground safety clamping (never falls below minDroneY = 0.8m)
      if (this.dronePosition.y < this.minDroneY) {
        this.dronePosition.y = this.minDroneY;
        if (this.droneVelocity.y < 0) this.droneVelocity.y = 0;
      }

      // World boundary clamping (-780m to 780m)
      this.dronePosition.x = THREE.MathUtils.clamp(this.dronePosition.x, -780, 780);
      this.dronePosition.z = THREE.MathUtils.clamp(this.dronePosition.z, -780, 780);

      // Apply transform to camera
      this.camera.position.copy(this.dronePosition);
      const euler = new THREE.Euler(this.dronePitch, this.droneYaw, 0, 'YXZ');
      this.camera.quaternion.setFromEuler(euler);

      // Keep target synchronized ahead of drone for sun lighting & audio
      this.target.copy(this.dronePosition).addScaledVector(forwardDir, 25);
      this.target.y = 0;
      return;
    }

    // 2. Walk Mode (Human Eye Level 1.65m)
    if (this.isWalkMode) {
      const walkSpeed = 5.0 * deltaTime;
      const sinY = Math.sin(this.walkYaw);
      const cosY = Math.cos(this.walkYaw);

      let forward = 0;
      let strafe = 0;

      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) forward += 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) forward -= 1;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) strafe -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) strafe += 1;

      if (forward !== 0 || strafe !== 0) {
        this.walkPosition.x += (sinY * forward - cosY * strafe) * walkSpeed;
        this.walkPosition.z += (cosY * forward + sinY * strafe) * walkSpeed;
      }

      this.walkPosition.x = THREE.MathUtils.clamp(this.walkPosition.x, -780, 780);
      this.walkPosition.z = THREE.MathUtils.clamp(this.walkPosition.z, -780, 780);

      this.camera.position.set(this.walkPosition.x, 1.65, this.walkPosition.z);
      const lookTarget = new THREE.Vector3(
        this.walkPosition.x + Math.sin(this.walkYaw) * Math.cos(this.walkPitch),
        1.65 + Math.sin(this.walkPitch),
        this.walkPosition.z + Math.cos(this.walkYaw) * Math.cos(this.walkPitch)
      );
      this.camera.lookAt(lookTarget);

      this.target.set(this.walkPosition.x, 0, this.walkPosition.z);
      return;
    }

    // 3. Orbit God-Eye Mode (Process keyboard continuous WASD panning)
    const moveSpeed = (this.distance / 35) * 40 * deltaTime;
    let keyPanX = 0;
    let keyPanY = 0;

    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) keyPanY += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) keyPanY -= 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) keyPanX += 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) keyPanX -= 1;

    if (keyPanX !== 0 || keyPanY !== 0) {
      this.pan(keyPanX * moveSpeed, keyPanY * moveSpeed);
    }

    // Inspect mode continuous smooth rotation
    if (this.isInspectMode) {
      this.azimuthGoal += this.inspectSpeed * deltaTime;
    }

    // 4. Apple Rubber-Band Snap-back & Momentum / Inertia Simulation
    const isActivelyDragging = this.isMiddleDragging || this.previousTouchCenter !== null;
    const bound = this.worldBound;

    // A. Hooke's elastic return: smoothly spring back inside map boundary when mouse is released
    if (!isActivelyDragging) {
      const springFactor = Math.min(1.0, 12.0 * deltaTime);
      if (this.targetGoal.x > bound) {
        this.targetGoal.x = THREE.MathUtils.lerp(this.targetGoal.x, bound, springFactor);
        this.panVelocityX = 0;
      } else if (this.targetGoal.x < -bound) {
        this.targetGoal.x = THREE.MathUtils.lerp(this.targetGoal.x, -bound, springFactor);
        this.panVelocityX = 0;
      }

      if (this.targetGoal.z > bound) {
        this.targetGoal.z = THREE.MathUtils.lerp(this.targetGoal.z, bound, springFactor);
        this.panVelocityY = 0;
      } else if (this.targetGoal.z < -bound) {
        this.targetGoal.z = THREE.MathUtils.lerp(this.targetGoal.z, -bound, springFactor);
        this.panVelocityY = 0;
      }
    }

    // B. Inertia glide: project residual velocity and smoothly decay with natural friction
    if (!this.isRightDragging && !this.isAltOrbitDragging && Math.abs(this.azimuthVelocity) > 0.001) {
      this.azimuthGoal += this.azimuthVelocity * deltaTime;
      this.azimuthVelocity *= Math.exp(-4.5 * deltaTime);
      if (Math.abs(this.azimuthVelocity) <= 0.001) this.azimuthVelocity = 0;
    }

    if (!isActivelyDragging && (Math.abs(this.panVelocityX) > 0.05 || Math.abs(this.panVelocityY) > 0.05)) {
      this.pan(this.panVelocityX * deltaTime, this.panVelocityY * deltaTime);
      const friction = Math.exp(-5.0 * deltaTime);
      this.panVelocityX *= friction;
      this.panVelocityY *= friction;
      if (Math.abs(this.panVelocityX) <= 0.05) this.panVelocityX = 0;
      if (Math.abs(this.panVelocityY) <= 0.05) this.panVelocityY = 0;
    }

    this.updateCameraTransform(this.damping);
  }

  private updateCameraTransform(dampingFactor: number): void {
    // Smooth lerp towards goals
    this.target.lerp(this.targetGoal, dampingFactor);
    this.distance = THREE.MathUtils.lerp(this.distance, this.distanceGoal, dampingFactor);
    this.azimuth = THREE.MathUtils.lerp(this.azimuth, this.azimuthGoal, dampingFactor);
    this.polar = THREE.MathUtils.lerp(this.polar, this.polarGoal, dampingFactor);

    // Compute eye position using spherical to Cartesian conversion
    const sinPolar = Math.sin(this.polar);
    const cosPolar = Math.cos(this.polar);
    const sinAzimuth = Math.sin(this.azimuth);
    const cosAzimuth = Math.cos(this.azimuth);

    const eyeX = this.target.x + this.distance * sinPolar * sinAzimuth;
    const eyeY = Math.max(1.5, this.target.y + this.distance * cosPolar); // Ground safety clamping
    const eyeZ = this.target.z + this.distance * sinPolar * cosAzimuth;

    this.camera.position.set(eyeX, eyeY, eyeZ);
    this.camera.lookAt(this.target);

    // Sync orthographic camera
    if (this.isOrthographic) {
      const orthoSize = this.distance * 0.9;
      const aspect = this.domElement.clientWidth / this.domElement.clientHeight || 1;
      this.orthoCamera.left = (-orthoSize * aspect) / 2;
      this.orthoCamera.right = (orthoSize * aspect) / 2;
      this.orthoCamera.top = orthoSize / 2;
      this.orthoCamera.bottom = -orthoSize / 2;
      if (this.orthoMode === 'front' || this.orthoMode === 'section') {
        this.orthoCamera.position.set(this.target.x, this.target.y, this.target.z + 180);
        this.orthoCamera.lookAt(this.target.x, this.target.y, this.target.z);
      } else if (this.orthoMode === 'side') {
        this.orthoCamera.position.set(this.target.x + 180, this.target.y, this.target.z);
        this.orthoCamera.lookAt(this.target.x, this.target.y, this.target.z);
      } else {
        this.orthoCamera.position.set(this.target.x, 250, this.target.z);
        this.orthoCamera.lookAt(this.target);
      }
      this.orthoCamera.updateProjectionMatrix();
    }
  }

  public setOrthographicMode(
    enabled: boolean,
    mode: OrthographicViewMode = 'top',
    focusTarget?: THREE.Vector3,
    approxDistance?: number
  ): void {
    this.isOrthographic = enabled;
    this.orthoMode = mode;
    if (focusTarget) {
      this.target.copy(focusTarget);
      this.targetGoal.copy(focusTarget);
    }
    if (approxDistance) {
      this.distance = approxDistance;
      this.distanceGoal = approxDistance;
    }
  }

  public handleResize(): void {
    const aspect = this.domElement.clientWidth / this.domElement.clientHeight || 1;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    if (this.isOrthographic) {
      const orthoSize = this.distance * 0.9;
      this.orthoCamera.left = (-orthoSize * aspect) / 2;
      this.orthoCamera.right = (orthoSize * aspect) / 2;
      this.orthoCamera.top = orthoSize / 2;
      this.orthoCamera.bottom = -orthoSize / 2;
      this.orthoCamera.updateProjectionMatrix();
    }
  }
}
