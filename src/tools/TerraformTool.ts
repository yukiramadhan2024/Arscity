import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { SculptTerrainCommand } from '../core/commands/TerraformCommands';
import { RaycastManager } from '../core/engine/RaycastManager';
import { proceduralAudio } from '../audio/ProceduralAudio';

export type TerraformBrushMode = 'raise' | 'lower' | 'flatten' | 'river';

export class TerraformTool {
  private engine: Engine;
  private raycastManager: RaycastManager;
  private scene: THREE.Scene;

  public mode: TerraformBrushMode = 'raise';
  public radius: number = 12.0;
  public strength: number = 1.2;

  private brushIndicator: THREE.LineLoop;
  private isPointerDown: boolean = false;
  private lastActionTime: number = 0;

  constructor(engine: Engine, raycastManager: RaycastManager, scene: THREE.Scene) {
    this.engine = engine;
    this.raycastManager = raycastManager;
    this.scene = scene;

    // Visual ring for circular brush
    const segments = 32;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * this.radius;
      positions[i * 3 + 1] = 0.08;
      positions[i * 3 + 2] = Math.sin(theta) * this.radius;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8, // light cyan
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });

    this.brushIndicator = new THREE.LineLoop(geom, mat);
    this.brushIndicator.name = 'TerraformBrushIndicator';
    this.brushIndicator.visible = false;
    this.scene.add(this.brushIndicator);
  }

  public setMode(mode: TerraformBrushMode): void {
    this.mode = mode;
    const mat = this.brushIndicator.material as THREE.LineBasicMaterial;
    if (mode === 'river') {
      mat.color.setHex(0x0ea5e9); // Tropical river blue
    } else if (mode === 'raise') {
      mat.color.setHex(0x34c759); // Green
    } else if (mode === 'lower') {
      mat.color.setHex(0x0284c7); // Blue
    } else {
      mat.color.setHex(0xf59e0b); // Amber
    }
  }

  public setRadius(radius: number): void {
    this.radius = Math.max(4, Math.min(40, radius));
    this.rebuildIndicator();
  }

  public setStrength(strength: number): void {
    this.strength = Math.max(0.2, Math.min(5.0, strength));
  }

  private rebuildIndicator(): void {
    const segments = 32;
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * this.radius;
      positions[i * 3 + 1] = 0.08;
      positions[i * 3 + 2] = Math.sin(theta) * this.radius;
    }
    this.brushIndicator.geometry.dispose();
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.brushIndicator.geometry = geom;
  }

  public handlePointerDown(pos: THREE.Vector3): void {
    this.isPointerDown = true;
    this.applyBrush(pos);
  }

  public handlePointerUp(): void {
    this.isPointerDown = false;
  }

  public applyBrush(pos: THREE.Vector3): void {
    const now = performance.now();
    if (now - this.lastActionTime < 140) return; // throttle continuous drag
    this.lastActionTime = now;

    const cmd = new SculptTerrainCommand(
      this.engine,
      pos.x,
      pos.z,
      this.radius,
      this.strength,
      this.mode,
      this.mode === 'flatten' ? 0.0 : undefined
    );
    this.engine.commandManager.execute(cmd);
    proceduralAudio.playTaptic('medium');
  }

  public update(): void {
    if (this.raycastManager.isHoveringGround) {
      const p = this.raycastManager.groundPoint;
      const centerGroundY = this.engine.terrain ? this.engine.terrain.getHeightAt(p.x, p.z) : 0;

      const posAttr = this.brushIndicator.geometry.attributes.position as THREE.BufferAttribute;
      if (posAttr) {
        const segments = 32;
        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const wx = p.x + Math.cos(theta) * this.radius;
          const wz = p.z + Math.sin(theta) * this.radius;
          const wy = this.engine.terrain ? this.engine.terrain.getHeightAt(wx, wz) : 0;
          posAttr.setY(i, wy - centerGroundY + 0.10);
        }
        posAttr.needsUpdate = true;
      }

      this.brushIndicator.position.set(p.x, centerGroundY, p.z);
      this.brushIndicator.visible = true;

      if (this.isPointerDown) {
        this.applyBrush(p);
      }
    } else {
      this.brushIndicator.visible = false;
    }
  }

  public dispose(): void {
    this.brushIndicator.geometry.dispose();
    (this.brushIndicator.material as THREE.Material).dispose();
    this.scene.remove(this.brushIndicator);
  }
}
