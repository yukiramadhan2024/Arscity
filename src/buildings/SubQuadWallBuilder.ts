import * as THREE from 'three';
import { WallOpening } from './CustomBuildingModel';

export class SubQuadWallBuilder {
  public static buildWallSegment(
    start: THREE.Vector2,
    end: THREE.Vector2,
    baseY: number,
    height: number,
    thickness: number,
    openings: WallOpening[],
    wallMaterial: THREE.Material,
    frameMaterial: THREE.Material,
    glassMaterial: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();

    const dir = new THREE.Vector2().subVectors(end, start);
    const length = dir.length();
    if (length < 0.1) return group;

    const u = dir.clone().normalize(); // along wall
    const n = new THREE.Vector2(-u.y, u.x); // perpendicular to wall

    // If no openings, generate single solid wall box
    if (!openings || openings.length === 0) {
      const mid = new THREE.Vector2().addVectors(start, end).multiplyScalar(0.5);
      const angle = Math.atan2(dir.y, dir.x);

      const geom = new THREE.BoxGeometry(length, height, thickness);
      geom.translate(0, baseY + height * 0.5, 0);

      const mesh = new THREE.Mesh(geom, wallMaterial);
      mesh.position.set(mid.x, 0, mid.y);
      mesh.rotation.y = -angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      return group;
    }

    // Sort openings from left to right (0 to length)
    const sorted = [...openings].map((op) => {
      const cx = op.positionRatio * length;
      const x0 = Math.max(0, cx - op.width * 0.5);
      const x1 = Math.min(length, cx + op.width * 0.5);
      return {
        ...op,
        x0,
        x1,
        y0: op.sillHeight,
        y1: Math.min(height, op.sillHeight + op.height)
      };
    }).sort((a, b) => a.x0 - b.x0);

    const angle = Math.atan2(dir.y, dir.x);
    const wallSubGroup = new THREE.Group();
    wallSubGroup.position.set(start.x, 0, start.y);
    wallSubGroup.rotation.y = -angle;

    let prevX = 0;

    for (const op of sorted) {
      // 1. Solid quad before opening
      if (op.x0 > prevX + 0.05) {
        const spanW = op.x0 - prevX;
        const geom = new THREE.BoxGeometry(spanW, height, thickness);
        geom.translate(prevX + spanW * 0.5, baseY + height * 0.5, 0);
        const mesh = new THREE.Mesh(geom, wallMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wallSubGroup.add(mesh);
      }

      const opW = op.x1 - op.x0;

      // 2. Sill quad below opening
      if (op.y0 > 0.05) {
        const sillH = op.y0;
        const geom = new THREE.BoxGeometry(opW, sillH, thickness);
        geom.translate(op.x0 + opW * 0.5, baseY + sillH * 0.5, 0);
        const mesh = new THREE.Mesh(geom, wallMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wallSubGroup.add(mesh);
      }

      // 3. Lintel quad above opening
      if (op.y1 < height - 0.05) {
        const lintelH = height - op.y1;
        const geom = new THREE.BoxGeometry(opW, lintelH, thickness);
        geom.translate(op.x0 + opW * 0.5, baseY + op.y1 + lintelH * 0.5, 0);
        const mesh = new THREE.Mesh(geom, wallMaterial);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        wallSubGroup.add(mesh);
      }

      // 4. Opening Insert (Window frame + Glass or Door)
      const opH = op.y1 - op.y0;
      const frameGeom = new THREE.BoxGeometry(opW, opH, thickness * 0.5);
      frameGeom.translate(op.x0 + opW * 0.5, baseY + op.y0 + opH * 0.5, 0);
      const frameMesh = new THREE.Mesh(frameGeom, frameMaterial);
      wallSubGroup.add(frameMesh);

      if (op.type.startsWith('window')) {
        const glassGeom = new THREE.BoxGeometry(opW - 0.1, opH - 0.1, thickness * 0.2);
        glassGeom.translate(op.x0 + opW * 0.5, baseY + op.y0 + opH * 0.5, 0);
        const glassMesh = new THREE.Mesh(glassGeom, glassMaterial);
        wallSubGroup.add(glassMesh);
      }

      prevX = op.x1;
    }

    // Final solid quad after last opening
    if (prevX < length - 0.05) {
      const spanW = length - prevX;
      const geom = new THREE.BoxGeometry(spanW, height, thickness);
      geom.translate(prevX + spanW * 0.5, baseY + height * 0.5, 0);
      const mesh = new THREE.Mesh(geom, wallMaterial);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      wallSubGroup.add(mesh);
    }

    group.add(wallSubGroup);
    return group;
  }
}
