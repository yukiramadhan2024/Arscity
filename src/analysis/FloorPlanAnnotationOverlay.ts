import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { RoomDefinition, RoomType } from '../buildings/InteriorTypes';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { roomStandardsRegistry } from '../buildings/RoomStandards';
import { InteriorLayoutFactory } from '../buildings/InteriorLayoutFactory';

interface CachedFloorBuilding {
  signature: string;
  totalFloors: number;
  root: THREE.Group;
  floorGroups: Map<number, THREE.Group>;
  roofSilhouette: THREE.Mesh;
}

export class FloorPlanAnnotationOverlay {
  private scene: THREE.Scene;
  private buildingManager: BuildingManager;
  private overlayGroup: THREE.Group;
  private elevationGroup: THREE.Group;
  public isActive: boolean = false;
  public activeFloorIndex: number = 0;
  private createdTextures: THREE.Texture[] = [];
  private createdGeometries: THREE.BufferGeometry[] = [];
  private createdMaterials: THREE.Material[] = [];
  private cachedBuildings: Map<string, CachedFloorBuilding> = new Map();
  private elevationGeometries: THREE.BufferGeometry[] = [];
  private elevationMaterials: THREE.Material[] = [];
  private elevationTextures: THREE.Texture[] = [];

  constructor(scene: THREE.Scene, buildingManager: BuildingManager) {
    this.scene = scene;
    this.buildingManager = buildingManager;
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'FloorPlanAnnotationOverlayGroup';
    this.overlayGroup.visible = false;
    this.scene.add(this.overlayGroup);

    this.elevationGroup = new THREE.Group();
    this.elevationGroup.name = 'ElevationAnnotationOverlayGroup';
    this.elevationGroup.visible = false;
    this.scene.add(this.elevationGroup);
  }

  public setActiveFloor(floorIndex: number): void {
    const safeFloor = Number.isFinite(floorIndex) ? Math.max(0, Math.floor(floorIndex)) : 0;
    this.activeFloorIndex = safeFloor;
    if (this.isActive) {
      this.applyFloorVisibility();
    }
  }

  public setVisible(visible: boolean, _sliceHeight?: number): void {
    this.isActive = visible;
    this.overlayGroup.visible = visible;
    this.elevationGroup.visible = false;

    if (!visible) {
      return;
    }

    this.syncCachedBuildings();
    this.applyFloorVisibility();
  }

  private getBuildingSignature(bld: BuildingInstance): string {
    const w = Number.isFinite(bld.width) && bld.width > 0 ? bld.width : 8;
    const l = Number.isFinite(bld.length) && bld.length > 0 ? bld.length : 8;
    const fl = Math.max(1, bld.floorCount || 1);
    const fh = Number.isFinite(bld.floorHeight) && bld.floorHeight > 0 ? bld.floorHeight : 3.2;
    return `${bld.presetKey}:${w.toFixed(2)}:${l.toFixed(2)}:${fl}:${fh.toFixed(2)}:${bld.interiorVariant || 'a'}`;
  }

  private syncCachedBuildings(): void {
    const activeIds = new Set<string>();
    for (const [id, bld] of this.buildingManager.buildings.entries()) {
      activeIds.add(id);
      const sig = this.getBuildingSignature(bld);
      const existing = this.cachedBuildings.get(id);
      if (existing && existing.signature === sig) {
        existing.root.position.set(bld.position.x, 0, bld.position.z);
        existing.root.rotation.y = bld.rotationY || 0;
        continue;
      }

      if (existing) {
        this.overlayGroup.remove(existing.root);
        this.disposeSubtree(existing.root);
        this.cachedBuildings.delete(id);
      }

      const built = this.buildCachedBuildingNode(bld, sig);
      this.cachedBuildings.set(id, built);
      this.overlayGroup.add(built.root);
    }

    // Remove demolished buildings cleanly
    for (const [id, cached] of this.cachedBuildings.entries()) {
      if (!activeIds.has(id)) {
        this.overlayGroup.remove(cached.root);
        this.disposeSubtree(cached.root);
        this.cachedBuildings.delete(id);
      }
    }
  }

  private buildCachedBuildingNode(bld: BuildingInstance, signature: string): CachedFloorBuilding {
    if (!Array.isArray(bld.interiorLayouts) || bld.interiorLayouts.length === 0) {
      bld.interiorLayouts = InteriorLayoutFactory.getLayoutForBuilding(
        bld.presetKey,
        bld.width,
        bld.length,
        bld.floorHeight || 3.2,
        Math.max(1, bld.floorCount || 1)
      );
    }

    const totalFloors = Math.max(1, bld.floorCount || 1);
    const floorH = Number.isFinite(bld.floorHeight) && bld.floorHeight > 0 ? bld.floorHeight : 3.2;
    const bldWidth = Number.isFinite(bld.width) && bld.width > 0 ? bld.width : 8;
    const bldLength = Number.isFinite(bld.length) && bld.length > 0 ? bld.length : 8;

    const root = new THREE.Group();
    root.name = `FloorPlanBuilding_${bld.id}`;
    root.position.set(bld.position.x, 0, bld.position.z);
    root.rotation.y = bld.rotationY || 0;

    const floorGroups = new Map<number, THREE.Group>();

    const wallCutMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a, // Dark slate section cut hatch (#0F172A)
      depthTest: true
    });
    this.createdMaterials.push(wallCutMat);

    for (let fl = 0; fl < totalFloors; fl++) {
      const floorGroup = new THREE.Group();
      floorGroup.name = `FloorPlanLevel_${fl}`;
      const floorElevation = fl * floorH;

      const layout =
        Array.isArray(bld.interiorLayouts) && fl < bld.interiorLayouts.length
          ? bld.interiorLayouts[fl]
          : Array.isArray(bld.interiorLayouts) && bld.interiorLayouts.length > 0
            ? bld.interiorLayouts[0]
            : null;

      if (layout) {
        for (const room of layout.rooms || []) {
          const b = room.boundary || [];
          if (b.length >= 3) {
            const shape = new THREE.Shape();
            shape.moveTo(b[0].x, b[0].y);
            for (let i = 1; i < b.length; i++) {
              shape.lineTo(b[i].x, b[i].y);
            }
            shape.closePath();

            const geo = new THREE.ShapeGeometry(shape);
            this.createdGeometries.push(geo);

            const zoneColor = this.getRoomColor(room.type);
            const mat = new THREE.MeshBasicMaterial({
              color: zoneColor,
              transparent: true,
              opacity: 0.16,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            this.createdMaterials.push(mat);

            const surfaceMesh = new THREE.Mesh(geo, mat);
            surfaceMesh.rotation.x = Math.PI * 0.5;
            surfaceMesh.position.y = floorElevation + 0.04;
            floorGroup.add(surfaceMesh);

            const points: THREE.Vector3[] = [];
            for (let i = 0; i <= b.length; i++) {
              const pt = b[i % b.length];
              points.push(new THREE.Vector3(pt.x, floorElevation + 0.06, pt.y));
            }
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            this.createdGeometries.push(lineGeo);

            const lineMat = new THREE.LineBasicMaterial({
              color: zoneColor,
              transparent: true,
              opacity: 0.60
            });
            this.createdMaterials.push(lineMat);

            floorGroup.add(new THREE.Line(lineGeo, lineMat));
          }

          if (room.labelPosition) {
            const sprite = this.createRoomBadgeSprite(room);
            if (sprite) {
              sprite.position.set(room.labelPosition.x, floorElevation + 1.15, room.labelPosition.y);
              floorGroup.add(sprite);
            }
          }
        }

        const cutY = floorElevation + 1.18;

        if (Array.isArray(layout.walls)) {
          for (const wall of layout.walls) {
            if (!wall.start || !wall.end) continue;
            const dx = wall.end.x - wall.start.x;
            const dz = wall.end.y - wall.start.y;
            const wallLen = Math.hypot(dx, dz);
            if (wallLen < 0.05) continue;
            const angle = Math.atan2(dz, dx);
            const midX = (wall.start.x + wall.end.x) / 2;
            const midZ = (wall.start.y + wall.end.y) / 2;

            const wallBoxGeom = new THREE.BoxGeometry(wallLen, 0.03, wall.thickness || 0.15);
            wallBoxGeom.rotateY(-angle);
            this.createdGeometries.push(wallBoxGeom);

            const wallMesh = new THREE.Mesh(wallBoxGeom, wallCutMat);
            wallMesh.position.set(midX, cutY, midZ);
            floorGroup.add(wallMesh);
          }
        }

        // Skip perimeter cut walls for wall-less open pavilions (pendopo / gazebo)
        const isOpenWallStructure = bld.presetKey?.includes('pendopo') || bld.presetKey?.includes('gazebo');
        if (!isOpenWallStructure) {
          const hw = bldWidth / 2;
          const hl = bldLength / 2;
          const wallThickness = 0.20;

          const fbGeom = new THREE.BoxGeometry(bldWidth, 0.03, wallThickness);
          this.createdGeometries.push(fbGeom);
          const frontWall = new THREE.Mesh(fbGeom, wallCutMat);
          frontWall.position.set(0, cutY, hl - wallThickness / 2);
          floorGroup.add(frontWall);

          const backWall = new THREE.Mesh(fbGeom, wallCutMat);
          backWall.position.set(0, cutY, -hl + wallThickness / 2);
          floorGroup.add(backWall);

          const lrLen = Math.max(0.2, bldLength - 2 * wallThickness);
          const lrGeom = new THREE.BoxGeometry(wallThickness, 0.03, lrLen);
          this.createdGeometries.push(lrGeom);
          const leftWall = new THREE.Mesh(lrGeom, wallCutMat);
          leftWall.position.set(-hw + wallThickness / 2, cutY, 0);
          floorGroup.add(leftWall);

          const rightWall = new THREE.Mesh(lrGeom, wallCutMat);
          rightWall.position.set(hw - wallThickness / 2, cutY, 0);
          floorGroup.add(rightWall);
        }
      }

      floorGroup.visible = false;
      floorGroups.set(fl, floorGroup);
      root.add(floorGroup);
    }

    // Dimmed roof silhouette shown safely when viewing floors above this building's totalFloors
    const silhouetteGeom = new THREE.PlaneGeometry(bldWidth + 0.6, bldLength + 0.6);
    silhouetteGeom.rotateX(-Math.PI / 2);
    this.createdGeometries.push(silhouetteGeom);

    const silhouetteMat = new THREE.MeshBasicMaterial({
      color: 0x072d59,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
      clippingPlanes: []
    });
    this.createdMaterials.push(silhouetteMat);

    const roofSilhouette = new THREE.Mesh(silhouetteGeom, silhouetteMat);
    roofSilhouette.name = 'DimmedRoofSilhouette';
    roofSilhouette.position.y = totalFloors * floorH + 0.05;
    roofSilhouette.visible = false;
    root.add(roofSilhouette);

    return {
      signature,
      totalFloors,
      root,
      floorGroups,
      roofSilhouette
    };
  }

  private applyFloorVisibility(): void {
    const targetFloor = Math.max(0, this.activeFloorIndex);
    for (const cached of this.cachedBuildings.values()) {
      const hasFloor = targetFloor < cached.totalFloors && cached.floorGroups.has(targetFloor);
      for (const [fl, grp] of cached.floorGroups.entries()) {
        grp.visible = hasFloor && fl === targetFloor;
      }
      cached.roofSilhouette.visible = !hasFloor;
    }
  }

  private disposeSubtree(group: THREE.Object3D): void {
    group.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as any).material;
      if (Array.isArray(mat)) {
        mat.forEach((entry) => {
          if (entry?.map) entry.map.dispose();
          entry?.dispose?.();
        });
      } else if (mat) {
        if (mat.map) mat.map.dispose();
        mat.dispose?.();
      }
    });
  }

  private getRoomColor(type: RoomType): number {
    switch (type) {
      case 'bedroom':
        return 0x5e5ce6; // Indigo
      case 'living_room':
        return 0x072d59; // Navy Blue
      case 'dining':
      case 'cafe_dining':
        return 0xf59e0b; // Warm Amber
      case 'kitchen':
        return 0xff9500; // Amber
      case 'bathroom':
        return 0x30b0c7; // Cyan
      case 'terrace':
        return 0x34c759; // Green
      case 'retail_storefront':
        return 0xfd6e8e; // Crimson Pink
      case 'office_workstation':
      case 'conference_room':
        return 0x2563eb; // Architectural Cobalt
      case 'lobby_reception':
        return 0x0ea5e9; // Bright Sky
      default:
        return 0x8e8e93; // Muted gray
    }
  }

  private createRoomBadgeSprite(room: RoomDefinition): THREE.Sprite | null {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background pill frosted glass (Aturan G3)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = room.isCompliant ? '#16a34a' : '#dc2626';
    ctx.lineWidth = 4;

    const x = 10, y = 10, w = 360, h = 140, r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text: Room Name (Display Sans, Aturan G3 & G2)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, 190, 52);

    // Text: Area m² & Ceiling Height (Indonesian numbers, Aturan G2)
    ctx.fillStyle = '#475569';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const areaStr = room.areaM2.toFixed(1).replace('.', ',');
    const ceilStr = room.ceilingHeight.toFixed(1).replace('.', ',');
    ctx.fillText(`${areaStr} m²  •  Plafon ${ceilStr} m`, 190, 92);

    // Compliance Badge
    ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    if (room.isCompliant) {
      ctx.fillStyle = '#16a34a';
      ctx.fillText('[SNI 03-1733: STANDAR TERPENUHI]', 190, 126);
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.fillText('[SNI 03-1733: DI BAWAH STANDAR]', 190, 126);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    this.createdTextures.push(texture);

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.createdMaterials.push(mat);

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.2, 1.35, 1.0);
    return sprite;
  }

  /**
   * Renders orthographic architectural elevation level datum lines
   * and the legal maximum height regulation boundary line (H <= 1.5W).
   */
  public renderElevationAnnotations(
    bld: BuildingInstance,
    _mode: 'elevation' | 'section'
  ): void {
    this.clearElevation();
    this.overlayGroup.visible = false;
    this.elevationGroup.visible = true;
    this.isActive = true;

    const group = new THREE.Group();
    group.name = 'ElevationAnnotationsGroup';
    group.position.copy(bld.position);

    const totalFloors = bld.floorCount || 1;
    const floorH = bld.floorHeight || 3.2;
    const plinthH = 0.35;
    const bldW = bld.width || 10;
    const totalHeight = plinthH + totalFloors * floorH + 2.5;

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85
    });
    this.elevationMaterials.push(lineMat);

    const markerX = bldW / 2 + 3.0;

    // Floor levels
    for (let fl = 0; fl <= totalFloors; fl++) {
      const elevY = fl === 0 ? 0.0 : plinthH + (fl - 1) * floorH;
      const labelText = fl === 0 ? '?0.00 Lantai Dasar' : `+${elevY.toFixed(2)} Lantai ${fl}`;

      const pts = [
        new THREE.Vector3(bldW / 2, elevY, 0),
        new THREE.Vector3(markerX + 4.5, elevY, 0)
      ];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      this.elevationGeometries.push(lineGeom);
      const line = new THREE.Line(lineGeom, lineMat);
      group.add(line);

      const sprite = this.createElevationSprite(labelText, '#00E5FF');
      sprite.position.set(markerX + 5.5, elevY, 0);
      group.add(sprite);
    }

    // Roof peak datum
    const roofY = totalHeight;
    const roofPts = [
      new THREE.Vector3(0, roofY, 0),
      new THREE.Vector3(markerX + 4.5, roofY, 0)
    ];
    const roofLineGeom = new THREE.BufferGeometry().setFromPoints(roofPts);
    this.elevationGeometries.push(roofLineGeom);
    const roofLine = new THREE.Line(roofLineGeom, lineMat);
    group.add(roofLine);

    const roofSprite = this.createElevationSprite(`+${roofY.toFixed(2)} Puncak Atap`, '#00E5FF');
    roofSprite.position.set(markerX + 5.5, roofY, 0);
    group.add(roofSprite);

    // Maximum height regulation boundary line (H <= 1.5 * Road Width)
    const roadWidth = 16.0;
    const maxRegHeight = 1.5 * roadWidth; // 24.0m
    const regPts = [
      new THREE.Vector3(-bldW / 2 - 2.0, maxRegHeight, 0),
      new THREE.Vector3(markerX + 8.0, maxRegHeight, 0)
    ];
    const regGeom = new THREE.BufferGeometry().setFromPoints(regPts);
    this.elevationGeometries.push(regGeom);
    const regMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 1.2,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.95
    });
    this.elevationMaterials.push(regMat);
    const regLine = new THREE.Line(regGeom, regMat);
    regLine.computeLineDistances();
    group.add(regLine);

    const regSprite = this.createElevationSprite(`Batas Maks Regulasi (H <= 1.5W = +${maxRegHeight.toFixed(1)}m)`, '#F59E0B');
    regSprite.position.set(markerX + 5.5, maxRegHeight + 0.6, 0);
    group.add(regSprite);

    this.elevationGroup.add(group);
  }

  private createElevationSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 64);

    // Frosted white glass background (Aturan G3)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.fillRect(4, 4, 504, 56);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 504, 56);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 18, 32);

    const texture = new THREE.CanvasTexture(canvas);
    this.elevationTextures.push(texture);

    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.elevationMaterials.push(mat);

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6.0, 0.75, 1.0);
    return sprite;
  }

  private clearElevation(): void {
    while (this.elevationGroup.children.length > 0) {
      this.elevationGroup.remove(this.elevationGroup.children[0]);
    }
    for (const t of this.elevationTextures) t.dispose();
    for (const g of this.elevationGeometries) g.dispose();
    for (const m of this.elevationMaterials) m.dispose();

    this.elevationTextures = [];
    this.elevationGeometries = [];
    this.elevationMaterials = [];
  }

  public clear(): void {
    this.clearElevation();
    while (this.overlayGroup.children.length > 0) {
      this.overlayGroup.remove(this.overlayGroup.children[0]);
    }
    this.cachedBuildings.clear();
    for (const t of this.createdTextures) t.dispose();
    for (const g of this.createdGeometries) g.dispose();
    for (const m of this.createdMaterials) m.dispose();

    this.createdTextures = [];
    this.createdGeometries = [];
    this.createdMaterials = [];
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.overlayGroup);
    this.scene.remove(this.elevationGroup);
  }
}
