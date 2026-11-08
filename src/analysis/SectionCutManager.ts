import * as THREE from 'three';
import { proceduralAudio } from '../audio/ProceduralAudio';

export type CutMode = 'none' | 'floor_plan' | 'section_vertical';

export class SectionCutManager {
  private renderer: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.Camera;
  private domElement?: HTMLElement;
  public currentMode: CutMode = 'none';

  private horizontalPlane: THREE.Plane;
  private verticalPlane: THREE.Plane;
  public cutHeight: number = 2.4; // Default horizontal floor plan slice (0.5m to 12.0m)
  public cutOffset: number = 0;   // Default vertical slice offset

  // 3D Visualizer & Interactive Drag Handle
  public visualizerGroup: THREE.Group;
  private planeMesh: THREE.Mesh | null = null;
  private borderLine: THREE.LineSegments | null = null;
  private dragHandleMesh: THREE.Group | null = null;

  private isDraggingHandle: boolean = false;
  private dragStartY: number = 0;
  private dragStartHeight: number = 2.4;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene?: THREE.Scene,
    camera?: THREE.Camera,
    domElement?: HTMLElement
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.renderer.localClippingEnabled = true;

    this.horizontalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.cutHeight);
    this.verticalPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), this.cutOffset);

    this.visualizerGroup = new THREE.Group();
    this.visualizerGroup.name = 'SectionCutVisualizer';
    this.visualizerGroup.visible = false;
    if (this.scene) {
      this.scene.add(this.visualizerGroup);
    }

    this.build3DVisualizer();

    if (this.domElement) {
      this.domElement.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
    }
  }

  public setContext(scene: THREE.Scene, camera: THREE.Camera, domElement: HTMLElement): void {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    if (!this.visualizerGroup.parent) {
      this.scene.add(this.visualizerGroup);
    }
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public get slicePlane(): THREE.Plane {
    return this.horizontalPlane;
  }

  public getHorizontalPlane(): THREE.Plane {
    this.horizontalPlane.constant = this.cutHeight;
    return this.horizontalPlane;
  }

  private build3DVisualizer(): void {
    // 1. Semi-transparent cutting plane (28m x 28m)
    const planeGeom = new THREE.PlaneGeometry(28, 28);
    planeGeom.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xfd6e8e,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.planeMesh = new THREE.Mesh(planeGeom, planeMat);
    this.planeMesh.renderOrder = 950;
    this.visualizerGroup.add(this.planeMesh);

    // 2. Crimson framed edges
    const edgesGeom = new THREE.EdgesGeometry(planeGeom);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0xfd6e8e,
      transparent: true,
      opacity: 0.85,
      linewidth: 2
    });
    this.borderLine = new THREE.LineSegments(edgesGeom, edgesMat);
    this.borderLine.renderOrder = 951;
    this.visualizerGroup.add(this.borderLine);

    // 3. Vertical Interactive Drag Handle (Diamond & arrows)
    this.dragHandleMesh = new THREE.Group();
    this.dragHandleMesh.name = 'SectionCutDragHandle';

    const coneGeomUp = new THREE.ConeGeometry(0.3, 0.6, 16);
    coneGeomUp.translate(0, 0.35, 0);
    const coneGeomDown = new THREE.ConeGeometry(0.3, 0.6, 16);
    coneGeomDown.rotateX(Math.PI);
    coneGeomDown.translate(0, -0.35, 0);

    const handleMat = new THREE.MeshBasicMaterial({
      color: 0xfd6e8e,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });

    const coneUp = new THREE.Mesh(coneGeomUp, handleMat);
    const coneDown = new THREE.Mesh(coneGeomDown, handleMat);
    coneUp.renderOrder = 999;
    coneDown.renderOrder = 999;
    coneUp.userData = { isSectionHandle: true };
    coneDown.userData = { isSectionHandle: true };

    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })
    );
    centerSphere.renderOrder = 999;
    centerSphere.userData = { isSectionHandle: true };

    this.dragHandleMesh.add(coneUp);
    this.dragHandleMesh.add(coneDown);
    this.dragHandleMesh.add(centerSphere);
    this.dragHandleMesh.position.set(14, 0, 0); // At edge of cutting plane
    this.visualizerGroup.add(this.dragHandleMesh);
  }

  public setCutMode(mode: CutMode): void {
    this.currentMode = mode;

    if (mode === 'none') {
      this.renderer.clippingPlanes = [];
      this.visualizerGroup.visible = false;
    } else if (mode === 'floor_plan') {
      this.horizontalPlane.constant = this.cutHeight;
      this.renderer.clippingPlanes = [this.horizontalPlane];
      this.visualizerGroup.visible = true;
      this.updateVisualizerPosition();
    } else if (mode === 'section_vertical') {
      this.verticalPlane.constant = this.cutOffset;
      this.renderer.clippingPlanes = [this.verticalPlane];
      this.visualizerGroup.visible = false;
    }
  }

  public setCutHeight(height: number): void {
    if (!Number.isFinite(height)) return;
    this.cutHeight = Math.max(0.5, Math.min(50.0, height));
    this.horizontalPlane.constant = this.cutHeight;
    this.updateVisualizerPosition();
  }

  public setVerticalSectionCut(center: THREE.Vector3): void {
    this.currentMode = 'section_vertical';
    this.verticalPlane.set(new THREE.Vector3(0, 0, 1), -center.z);
    this.renderer.clippingPlanes = [this.verticalPlane];
    this.visualizerGroup.visible = false;
  }

  public setCutOffset(offset: number): void {
    this.cutOffset = offset;
    this.verticalPlane.constant = offset;
  }

  public updateCenter(pos: THREE.Vector3): void {
    if (this.visualizerGroup) {
      this.visualizerGroup.position.x = pos.x;
      this.visualizerGroup.position.z = pos.z;
    }
  }

  private updateVisualizerPosition(): void {
    if (this.visualizerGroup) {
      this.visualizerGroup.position.y = this.cutHeight;
    }
  }

  public getInspectedLayerName(height: number = this.cutHeight): string {
    if (height < 3.0) return 'Denah Lantai 1 (Ground Floor Plan)';
    if (height <= 6.2) return 'Denah Lantai 2 (Upper Floor Plan)';
    return 'Struktur Rangka Atap & Nok Joglo (Roof Framing)';
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || this.currentMode !== 'floor_plan' || !this.camera || !this.domElement) return;

    const rect = this.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    if (this.dragHandleMesh) {
      const hits = raycaster.intersectObjects(this.dragHandleMesh.children, true);
      if (hits.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        this.isDraggingHandle = true;
        this.dragStartY = e.clientY;
        this.dragStartHeight = this.cutHeight;
        proceduralAudio.playClick();
      }
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDraggingHandle) return;

    // 1 meter cut height per 30 pixels vertical movement
    const dy = this.dragStartY - e.clientY;
    const deltaHeight = dy / 30;
    const newHeight = Math.max(0.5, Math.min(50.0, this.dragStartHeight + deltaHeight));

    if (Math.abs(newHeight - this.cutHeight) >= 0.05) {
      this.setCutHeight(newHeight);
      proceduralAudio.playGizmoHarmonic(Math.round(newHeight * 2));
    }
  };

  private onPointerUp = (): void => {
    if (this.isDraggingHandle) {
      this.isDraggingHandle = false;
      proceduralAudio.playStarChime();
    }
  };

  public dispose(): void {
    this.setCutMode('none');
    if (this.domElement) {
      this.domElement.removeEventListener('pointerdown', this.onPointerDown);
    }
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);

    if (this.scene && this.visualizerGroup) {
      this.scene.remove(this.visualizerGroup);
    }
  }
}
