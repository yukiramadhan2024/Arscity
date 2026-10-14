import * as THREE from 'three';

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

  private domElement: HTMLElement;

  // Orbit target (look-at point on terrain)
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetGoal: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Spherical coordinates
  public distance: number = 75;
  private distanceGoal: number = 75;
  public minDistance: number = 8;
  public maxDistance: number = 400;

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

  // Walk Mode (1.6m eye level)
  public isWalkMode: boolean = false;
  public walkPosition: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);
  public walkYaw: number = 0;
  public walkPitch: number = 0;
  private savedDistance: number = 75;
  private savedPolar: number = (40 * Math.PI) / 180;
  private savedTarget: THREE.Vector3 = new THREE.Vector3();
  public onWalkModeChanged?: (isWalk: boolean) => void;

  constructor(domElement: HTMLElement, options: CameraOptions = {}) {
    this.domElement = domElement;

    const aspect = domElement.clientWidth / domElement.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(options.fov || 45, aspect, 0.5, 1200);

    const orthoFrustum = 60;
    this.orthoCamera = new THREE.OrthographicCamera(
      (-orthoFrustum * aspect) / 2,
      (orthoFrustum * aspect) / 2,
      orthoFrustum / 2,
      -orthoFrustum / 2,
      1,
      1200
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
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
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
    this.previousMousePosition = { x: e.clientX, y: e.clientY };

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
    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };

    if (this.isWalkMode && (this.isRightDragging || this.isAltOrbitDragging || e.buttons === 1)) {
      this.walkYaw += deltaX * 0.004 * this.mousepadSensitivity;
      this.walkPitch -= deltaY * 0.003 * this.mousepadSensitivity;
      this.walkPitch = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, this.walkPitch));
      return;
    }

    if (this.isMiddleDragging) {
      // Pan along camera plane
      this.pan(
        deltaX * 0.12 * (this.distance / 50) * this.mousepadSensitivity,
        deltaY * 0.12 * (this.distance / 50) * this.mousepadSensitivity
      );
    } else if (this.isRightDragging || this.isAltOrbitDragging) {
      if (e.shiftKey || this.isShiftDragging) {
        // Shift + Drag = Pitch tilt adjust
        this.polarGoal += deltaY * 0.006 * this.mousepadSensitivity;
        this.polarGoal = Math.max(this.minPolar, Math.min(this.maxPolar, this.polarGoal));
      } else {
        // Free 360-degree horizontal azimuth orbit & pitch
        this.azimuthGoal += deltaX * 0.007 * this.mousepadSensitivity;
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
    this.isMiddleDragging = false;
    this.isRightDragging = false;
    this.isShiftDragging = false;
    this.isAltOrbitDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();

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
    // Convert screen pan to ground XZ vectors based on current azimuth
    const forward = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth)).normalize();
    const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth)).normalize();

    this.targetGoal.addScaledVector(right, -screenDeltaX);
    this.targetGoal.addScaledVector(forward, screenDeltaY);

    // Keep target within world bounds (512 x 512 m terrain => [-240, 240])
    this.targetGoal.x = Math.max(-250, Math.min(250, this.targetGoal.x));
    this.targetGoal.z = Math.max(-250, Math.min(250, this.targetGoal.z));
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
    this.targetGoal.set(0, 0, 0);
    this.distanceGoal = 75;
    this.azimuthGoal = Math.PI * 0.25;
    this.polarGoal = (40 * Math.PI) / 180;
    this.isOrthographic = false;
    this.isInspectMode = false;
  }

  public toggleTopDown(): void {
    this.isOrthographic = !this.isOrthographic;
    if (this.isOrthographic) {
      this.polarGoal = 0.05; // Straight down
    } else {
      this.polarGoal = (40 * Math.PI) / 180; // 50 deg incline
    }
  }

  public toggleWalkMode(): boolean {
    return this.setWalkMode(!this.isWalkMode);
  }

  public setWalkMode(enabled: boolean): boolean {
    if (this.isWalkMode === enabled) return this.isWalkMode;

    if (enabled) {
      this.savedDistance = this.distanceGoal;
      this.savedPolar = this.polarGoal;
      this.savedTarget.copy(this.targetGoal);

      this.isWalkMode = true;
      this.isOrthographic = false;
      this.walkPosition.set(this.target.x, 1.6, this.target.z);
      this.walkYaw = this.azimuth + Math.PI;
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
        this.walkPosition.x += (sinY * forward + cosY * strafe) * walkSpeed;
        this.walkPosition.z += (cosY * forward - sinY * strafe) * walkSpeed;
      }

      this.camera.position.set(this.walkPosition.x, 1.6, this.walkPosition.z);
      const lookTarget = new THREE.Vector3(
        this.walkPosition.x + Math.sin(this.walkYaw) * Math.cos(this.walkPitch),
        1.6 + Math.sin(this.walkPitch),
        this.walkPosition.z + Math.cos(this.walkYaw) * Math.cos(this.walkPitch)
      );
      this.camera.lookAt(lookTarget);
      return;
    }

    // Process keyboard continuous WASD panning
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
      this.orthoCamera.position.set(this.target.x, 250, this.target.z);
      this.orthoCamera.lookAt(this.target);
      this.orthoCamera.updateProjectionMatrix();
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
