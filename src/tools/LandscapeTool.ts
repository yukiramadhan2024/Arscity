import * as THREE from 'three';
import { LandscapeManager, LandscapeType, LandscapeItem } from '../world/LandscapeManager';
import { RaycastManager } from '../core/engine/RaycastManager';
import { AddLandscapeCommand } from '../core/commands/CityCommands';
import { proceduralAudio } from '../audio/ProceduralAudio';
import type { Engine } from '../core/engine/Engine';
import { showSnackbar } from '../ui/state/useSnackbarStore';

export class LandscapeTool {
  public landscapeManager: LandscapeManager;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;
  private engine?: Engine;

  public activeType: LandscapeType = 'grass_garden';
  public itemWidth: number = 4;
  public itemLength: number = 4;
  public itemRadius: number = 2.5;

  private ghostGroup: THREE.Group | null = null;
  private isVisible: boolean = false;

  constructor(
    landscapeManager: LandscapeManager,
    raycastManager: RaycastManager,
    scene: THREE.Scene,
    engine?: Engine
  ) {
    this.landscapeManager = landscapeManager;
    this.raycastManager = raycastManager;
    this.scene = scene;
    this.engine = engine;

    this.rebuildGhost();
  }

  public setEngine(engine: Engine): void {
    this.engine = engine;
  }

  public setType(type: LandscapeType): void {
    this.activeType = type;
    if (type === 'shade_tree' || type === 'tree') {
      this.itemRadius = 2.5;
    } else if (type === 'well') {
      this.itemRadius = 0.8;
    } else if (type === 'biopore') {
      this.itemRadius = 0.25;
    } else if (type === 'river_segment') {
      this.itemWidth = 12;
      this.itemLength = 24;
    } else if (type === 'retention_pond') {
      this.itemWidth = 16;
      this.itemLength = 16;
      this.itemRadius = 8;
    } else if (type === 'bioswale_channel') {
      this.itemWidth = 3;
      this.itemLength = 12;
    } else if (type === 'tree_tabebuya_pink' || type === 'tree_tabebuya_gold') {
      this.itemRadius = 3.0;
    } else if (type === 'tree_flamboyan') {
      this.itemRadius = 3.8;
    } else if (type === 'tree_frangipani') {
      this.itemRadius = 2.0;
    } else if (type === 'tree_banyan_kurung') {
      this.itemRadius = 6.5;
    } else if (type === 'tree_asam_jawa') {
      this.itemRadius = 3.4;
    } else if (type === 'flora_bougainvillea_arch') {
      this.itemWidth = 3.0;
      this.itemLength = 1.8;
    } else if (type === 'flora_yellow_bamboo') {
      this.itemWidth = 1.6;
      this.itemLength = 0.9;
    } else if (type === 'flora_lotus_water') {
      this.itemRadius = 2.4;
    } else if (type === 'monument_tugu_jogja') {
      this.itemWidth = 4.6;
      this.itemLength = 4.6;
    } else if (type === 'sculpture_kinetic_steel') {
      this.itemRadius = 1.6;
    } else if (type === 'sculpture_candi_stone') {
      this.itemWidth = 2.4;
      this.itemLength = 2.4;
    } else if (type === 'sculpture_wayang_corten') {
      this.itemWidth = 2.6;
      this.itemLength = 1.0;
    } else if (type === 'fountain_reflecting_pool') {
      this.itemRadius = 4.2;
    } else if (type === 'monument_clock_tower') {
      this.itemWidth = 3.2;
      this.itemLength = 3.2;
    } else if (type === 'street_malioboro_bollards') {
      this.itemWidth = 1.4;
      this.itemLength = 3.8;
    } else if (type === 'street_festoon_lights') {
      this.itemWidth = 1.0;
      this.itemLength = 8.0;
    } else if (type === 'street_timber_pergola') {
      this.itemWidth = 4.0;
      this.itemLength = 2.4;
    } else if (type === 'gate_candi_bentar') {
      this.itemWidth = 6.0;
      this.itemLength = 2.0;
    } else if (type === 'street_garden_lanterns') {
      this.itemWidth = 1.0;
      this.itemLength = 4.2;
    } else if (type === 'plaza_mini_amphitheater') {
      this.itemRadius = 7.5;
    } else if (type === 'waterfront_wood_deck') {
      this.itemWidth = 8.0;
      this.itemLength = 4.2;
    } else if (type === 'bridge_green_pedestrian') {
      this.itemWidth = 3.2;
      this.itemLength = 14.0;
    } else if (type === 'pavilion_garden_gazebo') {
      this.itemWidth = 3.6;
      this.itemLength = 3.6;
    } else {
      this.itemWidth = 4;
      this.itemLength = 4;
    }
    this.rebuildGhost();
  }

  private disposeGhost(): void {
    if (this.ghostGroup) {
      this.ghostGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      this.scene.remove(this.ghostGroup);
      this.ghostGroup = null;
    }
  }

  private rebuildGhost(): void {
    this.disposeGhost();

    const group = new THREE.Group();
    group.name = 'LandscapeGhostPreview';

    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x34c759, // iOS 27 system --good
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });

    if (
      this.activeType.startsWith('tree') ||
      this.activeType === 'shade_tree'
    ) {
      const trunkGeom = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 8);
      const trunkMesh = new THREE.Mesh(trunkGeom, ghostMat);
      trunkMesh.position.y = 1.25;
      group.add(trunkMesh);

      const canopyGeom = new THREE.DodecahedronGeometry(this.itemRadius, 1);
      const canopyMesh = new THREE.Mesh(canopyGeom, ghostMat);
      canopyMesh.position.y = 3.6;
      group.add(canopyMesh);
    } else if (
      this.activeType === 'fountain_reflecting_pool' ||
      this.activeType === 'flora_lotus_water' ||
      this.activeType === 'sculpture_kinetic_steel' ||
      this.activeType === 'plaza_mini_amphitheater' ||
      this.activeType === 'well' ||
      this.activeType === 'biopore'
    ) {
      const r = this.itemRadius || 2.0;
      const geom = new THREE.CylinderGeometry(r, r, 0.4, 16);
      const mesh = new THREE.Mesh(geom, ghostMat);
      mesh.position.y = 0.2;
      group.add(mesh);
    } else {
      const w = this.itemWidth || 4;
      const l = this.itemLength || 4;
      const geom = new THREE.BoxGeometry(w, 0.4, l);
      const mesh = new THREE.Mesh(geom, ghostMat);
      mesh.position.y = 0.2;
      group.add(mesh);
    }

    group.visible = this.isVisible;
    this.scene.add(group);
    this.ghostGroup = group;
  }

  public handleClick(snappedPos: THREE.Vector3): void {
    // Reject placement if position is on road asphalt
    if (this.engine?.roadManager?.isPointOnRoadAsphalt(snappedPos.x, snappedPos.z, 0.6)) {
      proceduralAudio.playTaptic('boundary');
      showSnackbar({
        variant: 'warning',
        title: 'Lokasi Terhalang Jalan Raya',
        detail: 'Objek tidak boleh berada di atas aspal',
        groupKey: 'collision_road',
      });
      return;
    }

    // Reject placement on water for non-water elements (trees, pavilions, sculptures, etc.)
    const isWaterCompatible =
      this.activeType === 'flora_lotus_water' ||
      this.activeType === 'waterfront_wood_deck' ||
      this.activeType === 'bridge_green_pedestrian';

    if (!isWaterCompatible && (
      this.landscapeManager.isPositionInWater(snappedPos.x, snappedPos.z, 0.2) ||
      (this.engine?.riverManager && this.engine.riverManager.isPointInRiver(snappedPos.x, snappedPos.z, 0.2))
    )) {
      proceduralAudio.playTaptic('boundary');
      showSnackbar({
        variant: 'warning',
        title: 'Lokasi Berada di Atas Air',
        detail: 'Pohon dan elemen darat tidak boleh ditempatkan di atas badan air atau kolam',
        groupKey: 'collision_water',
      });
      return;
    }

    const nextId = `land_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const hasDimensions =
      this.activeType === 'grass_garden' ||
      this.activeType === 'paving_block' ||
      this.activeType === 'river_segment' ||
      this.activeType === 'retention_pond' ||
      this.activeType === 'bioswale_channel' ||
      this.activeType === 'flora_bougainvillea_arch' ||
      this.activeType === 'flora_yellow_bamboo' ||
      this.activeType === 'monument_tugu_jogja' ||
      this.activeType === 'sculpture_candi_stone' ||
      this.activeType === 'sculpture_wayang_corten' ||
      this.activeType === 'monument_clock_tower' ||
      this.activeType === 'street_malioboro_bollards' ||
      this.activeType === 'street_festoon_lights' ||
      this.activeType === 'street_timber_pergola' ||
      this.activeType === 'gate_candi_bentar' ||
      this.activeType === 'street_garden_lanterns' ||
      this.activeType === 'waterfront_wood_deck' ||
      this.activeType === 'bridge_green_pedestrian' ||
      this.activeType === 'pavilion_garden_gazebo';

    const item: LandscapeItem = {
      id: nextId,
      type: this.activeType,
      position: snappedPos.clone(),
      width: hasDimensions ? this.itemWidth : undefined,
      length: hasDimensions ? this.itemLength : undefined,
      radius: this.itemRadius
    };

    if (this.engine?.commandManager) {
      const cmd = new AddLandscapeCommand(this.engine, item);
      this.engine.commandManager.execute(cmd);
    } else {
      this.landscapeManager.addItem(item);
    }

    proceduralAudio.playClick();
  }

  public update(): void {
    if (!this.ghostGroup) return;

    if (this.isVisible && this.raycastManager.isHoveringGround) {
      const snapX = this.raycastManager.snappedPoint.x;
      const snapZ = this.raycastManager.snappedPoint.z;

      let isOnRoad = false;
      if (this.engine?.roadManager) {
        isOnRoad = this.engine.roadManager.isPointOnRoadAsphalt(snapX, snapZ, 0.6);
      }

      this.ghostGroup.position.set(snapX, 0, snapZ);
      this.ghostGroup.visible = true;

      const targetColor = isOnRoad ? 0xff3b30 : 0x34c759;
      this.ghostGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (m.material && (m.material as any).color) {
            (m.material as THREE.MeshBasicMaterial).color.setHex(targetColor);
          }
        }
      });
    } else {
      this.ghostGroup.visible = false;
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    if (this.ghostGroup) {
      this.ghostGroup.visible = visible;
    }
  }

  public dispose(): void {
    this.disposeGhost();
  }
}
