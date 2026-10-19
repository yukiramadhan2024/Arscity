import * as THREE from 'three';
import { BuildingManager } from '../../buildings/BuildingManager';

export interface TourWaypoint {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  name: string;
}

export interface DroneTourState {
  isActive: boolean;
  progress: number; // 0.0 to 1.0
  currentWaypointName: string;
  isPaused: boolean;
  speed: number;
  subMode?: 'free_fly' | 'tour_auto' | 'custom_tour';
  keyframeCount?: number;
}

export type DslrLensType = '24mm' | '50mm' | '85mm';

export const DSLR_LENS_MAP: Record<DslrLensType, { name: string; fov: number; desc: string }> = {
  '24mm': { name: '24mm Wide Angle', fov: 84, desc: 'Lensa lanskap sudut lebar untuk menangkap seluruh kawasan kota' },
  '50mm': { name: '50mm Standard', fov: 40, desc: 'Lensa standar natural mirip perspektif mata manusia' },
  '85mm': { name: '85mm Telephoto', fov: 28, desc: 'Lensa telefoto untuk detail fasad dan kompresi kedalaman' }
};

export interface CustomKeyframe {
  id: string;
  name: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  fov: number;
  lens: DslrLensType;
  timeOfDay: number;
}

export class CinematicDroneController {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private buildingManager: BuildingManager;

  public isActive: boolean = false;
  public isPaused: boolean = false;
  public progress: number = 0; // 0 to 1
  public tourDurationSec: number = 45; // seconds for a complete loop
  public subMode: 'free_fly' | 'tour_auto' | 'custom_tour' = 'free_fly';

  private splineCurve: THREE.CatmullRomCurve3 | null = null;
  private waypoints: TourWaypoint[] = [];

  // Custom Keyframe Sequencer
  public customKeyframes: CustomKeyframe[] = [];

  // MediaRecorder video capture
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public isRecording: boolean = false;
  public recordingSeconds: number = 0;
  private recordingIntervalId: number | null = null;

  // DSLR Photo Mode
  public currentLens: DslrLensType = '50mm';
  private savedFov: number = 45;

  // Callbacks
  public onStateChanged?: (state: DroneTourState) => void;
  public onRecordingStateChanged?: (isRecording: boolean, seconds: number) => void;
  public onTimeOfDayInterpolated?: (hour: number) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    buildingManager: BuildingManager
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.buildingManager = buildingManager;
  }

  // =========================================================================
  // CUSTOM KEYFRAME TOUR DIRECTOR
  // =========================================================================

  public addKeyframe(nameOrFov?: string | number, timeOfDay: number = 12): CustomKeyframe {
    const isFov = typeof nameOrFov === 'number';
    const name = !isFov && typeof nameOrFov === 'string' ? nameOrFov : `Titik ${this.customKeyframes.length + 1}`;
    const fov = isFov ? nameOrFov : this.camera.fov;
    const kf: CustomKeyframe = {
      id: `kf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone(),
      quaternion: this.camera.quaternion.clone(),
      fov,
      lens: this.currentLens,
      timeOfDay
    };
    this.customKeyframes.push(kf);
    this.emitState();
    return kf;
  }

  public removeKeyframe(target: string | number): void {
    if (typeof target === 'number') {
      this.customKeyframes.splice(target, 1);
    } else {
      this.customKeyframes = this.customKeyframes.filter((k) => k.id !== target);
    }
    this.emitState();
  }

  public clearKeyframes(): void {
    this.customKeyframes = [];
    this.emitState();
  }

  public getKeyframes(): CustomKeyframe[] {
    return [...this.customKeyframes];
  }

  public dispose(): void {
    this.stopTour();
    this.stopCustomTour();
    this.stopVideoRecording();
    this.customKeyframes = [];
  }

  public startCustomTour(durationSec: number = 30): boolean {
    if (this.customKeyframes.length < 2) {
      console.warn('[CinematicDrone] Minimal butuh 2 titik keyframe untuk memutar tur custom.');
      return false;
    }

    const points = this.customKeyframes.map((k) => k.position.clone());
    // Smooth Catmull-Rom 3D curve through all keyframe positions
    this.splineCurve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    this.subMode = 'custom_tour';
    this.tourDurationSec = Math.max(5, durationSec);
    this.isActive = true;
    this.isPaused = false;
    this.progress = 0;
    this.savedFov = this.camera.fov;

    this.emitState();
    return true;
  }

  public stopCustomTour(): void {
    this.stopTour();
    this.subMode = 'free_fly';
    this.emitState();
  }

  // =========================================================================
  // AUTOMATIC CITY LANDMARK TOUR
  // =========================================================================

  public generateTourPath(): void {
    const blds = Array.from(this.buildingManager.buildings.values());
    const rawPoints: THREE.Vector3[] = [];
    this.waypoints = [];

    if (blds.length >= 3) {
      const sortedBlds = [...blds].sort((a, b) => b.width * b.length - a.width * a.length);
      const selected = sortedBlds.slice(0, Math.min(8, sortedBlds.length));

      selected.forEach((bld, idx) => {
        const camPos = new THREE.Vector3(
          bld.position.x + Math.sin((idx * Math.PI) / 2) * 22,
          Math.max(14, bld.position.y + bld.floorCount * 3.5 + 8),
          bld.position.z + Math.cos((idx * Math.PI) / 2) * 22
        );
        rawPoints.push(camPos);
        this.waypoints.push({
          position: camPos,
          lookAt: bld.position.clone(),
          name: bld.name
        });
      });
    }

    if (rawPoints.length < 3) {
      const radius = 65;
      const height = 22;
      const count = 6;
      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2;
        const pt = new THREE.Vector3(
          Math.cos(theta) * radius,
          height + Math.sin(theta * 2) * 4,
          Math.sin(theta) * radius
        );
        rawPoints.push(pt);
        this.waypoints.push({
          position: pt,
          lookAt: new THREE.Vector3(0, 2, 0),
          name: `Panorama Sudut ${i + 1}`
        });
      }
    }

    this.splineCurve = new THREE.CatmullRomCurve3(rawPoints, true, 'catmullrom', 0.5);
  }

  public startTour(): void {
    this.generateTourPath();
    this.subMode = 'tour_auto';
    this.isActive = true;
    this.isPaused = false;
    this.progress = 0;
    this.savedFov = this.camera.fov;
    this.emitState();
  }

  public stopTour(): void {
    this.isActive = false;
    this.isPaused = false;
    this.subMode = 'free_fly';
    if (this.isRecording) {
      this.stopVideoRecording();
    }
    this.camera.fov = this.savedFov;
    this.camera.updateProjectionMatrix();
    this.emitState();
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    this.emitState();
    return this.isPaused;
  }

  public setProgress(p: number): void {
    this.progress = THREE.MathUtils.clamp(p, 0, 1);
  }

  public update(deltaTime: number): void {
    if (!this.isActive || this.isPaused || !this.splineCurve) return;

    const dt = Math.min(deltaTime, 0.1);
    this.progress += dt / this.tourDurationSec;

    if (this.subMode === 'custom_tour') {
      if (this.progress >= 1.0) {
        this.progress = 1.0;
        this.stopCustomTour();
        return;
      }

      // 1. Spline position interpolation
      const camPos = this.splineCurve.getPointAt(this.progress);
      this.camera.position.copy(camPos);

      // 2. Quaternion Slerp orientation interpolation
      const segCount = this.customKeyframes.length - 1;
      const t = this.progress * segCount;
      const idx0 = Math.floor(t);
      const idx1 = Math.min(segCount, idx0 + 1);
      const localT = t - idx0;

      const q0 = this.customKeyframes[idx0].quaternion;
      const q1 = this.customKeyframes[idx1].quaternion;
      this.camera.quaternion.slerpQuaternions(q0, q1, localT);

      // 3. Focal length / FOV interpolation
      const fov0 = this.customKeyframes[idx0].fov;
      const fov1 = this.customKeyframes[idx1].fov;
      this.camera.fov = THREE.MathUtils.lerp(fov0, fov1, localT);
      this.camera.updateProjectionMatrix();

      // 4. Solar Time of Day interpolation
      const tod0 = this.customKeyframes[idx0].timeOfDay ?? 12;
      const tod1 = this.customKeyframes[idx1].timeOfDay ?? 12;
      const currentHour = THREE.MathUtils.lerp(tod0, tod1, localT);
      if (this.onTimeOfDayInterpolated) {
        this.onTimeOfDayInterpolated(currentHour);
      }

      this.emitState();
      return;
    }

    // Default Automatic Landmark Tour Loop
    if (this.progress > 1.0) {
      this.progress = 0.0;
    }

    const camPos = this.splineCurve.getPointAt(this.progress);
    const tangent = this.splineCurve.getTangentAt(this.progress);

    this.camera.position.copy(camPos);

    const lookTarget = new THREE.Vector3().copy(camPos).add(tangent.multiplyScalar(20));
    lookTarget.y = Math.max(1.5, lookTarget.y - 3.5);
    this.camera.lookAt(lookTarget);

    this.emitState();
  }

  // =========================================================================
  // VIDEO RECORDING & DSLR PHOTO CAPTURE
  // =========================================================================

  public startVideoRecording(): boolean {
    if (this.isRecording || typeof window === 'undefined') return false;

    const canvas = this.renderer.domElement;
    const stream = canvas.captureStream ? canvas.captureStream(60) : null;
    if (!stream) {
      console.warn('[CinematicDrone] Canvas captureStream not supported in this browser.');
      return false;
    }

    try {
      const mimeTypes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 6_000_000
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.downloadRecordedVideo();
      };

      this.mediaRecorder.start(250);
      this.isRecording = true;
      this.recordingSeconds = 0;

      this.recordingIntervalId = window.setInterval(() => {
        this.recordingSeconds++;
        if (this.onRecordingStateChanged) {
          this.onRecordingStateChanged(this.isRecording, this.recordingSeconds);
        }
      }, 1000);

      if (this.onRecordingStateChanged) {
        this.onRecordingStateChanged(this.isRecording, this.recordingSeconds);
      }
      return true;
    } catch (err) {
      console.error('[CinematicDrone] Failed to start MediaRecorder:', err);
      return false;
    }
  }

  public stopVideoRecording(): void {
    if (!this.isRecording || !this.mediaRecorder) return;

    if (this.recordingIntervalId !== null) {
      clearInterval(this.recordingIntervalId);
      this.recordingIntervalId = null;
    }

    this.mediaRecorder.stop();
    this.isRecording = false;

    if (this.onRecordingStateChanged) {
      this.onRecordingStateChanged(this.isRecording, this.recordingSeconds);
    }
  }

  private downloadRecordedVideo(): void {
    if (this.recordedChunks.length === 0) return;

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `Arscity_Cinematic_Flythrough_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.recordedChunks = [];
    }, 1500);
  }

  public setDslrLens(lens: DslrLensType): void {
    this.currentLens = lens;
    const config = DSLR_LENS_MAP[lens];
    if (config) {
      this.camera.fov = config.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  public capturePhoto(cityName: string = 'Arscity'): string {
    const dataUrl = this.renderer.domElement.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${cityName.replace(/\s+/g, '_')}_DSLR_${this.currentLens}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 1000);
    return dataUrl;
  }

  private emitState(): void {
    if (this.onStateChanged) {
      let wpName = 'Drone Free-Fly';
      if (this.subMode === 'custom_tour') {
        const seg = Math.floor(this.progress * Math.max(1, this.customKeyframes.length));
        wpName = this.customKeyframes[seg]?.name ?? 'Tur Custom';
      } else if (this.subMode === 'tour_auto') {
        const activeIdx = Math.floor(this.progress * Math.max(1, this.waypoints.length));
        wpName = this.waypoints[activeIdx]?.name ?? 'Tur Landmark';
      }

      this.onStateChanged({
        isActive: this.isActive,
        progress: this.progress,
        currentWaypointName: wpName,
        isPaused: this.isPaused,
        speed: 1.0,
        subMode: this.subMode,
        keyframeCount: this.customKeyframes.length
      });
    }
  }
}
