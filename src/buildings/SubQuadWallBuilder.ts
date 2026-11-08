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

      // 4. Opening Insert (>= 0.12m outward facade offset + polygonOffset materials for zero z-fighting)
      const opH = op.y1 - op.y0;
      const frameCasingThickness = 0.05;
      const facadeOffsetZ = thickness * 0.5 + 0.12;
      const frameDepth = 0.08;
      const sillProjection = 0.08;

      if (op.type.startsWith('window')) {
        // Window Head Frame (>= 0.06m proud of wall outer plane)
        const headGeom = new THREE.BoxGeometry(opW, frameCasingThickness, frameDepth);
        headGeom.translate(op.x0 + opW * 0.5, baseY + op.y1 - frameCasingThickness * 0.5, facadeOffsetZ);
        const headMesh = new THREE.Mesh(headGeom, frameMaterial);
        headMesh.castShadow = true;
        wallSubGroup.add(headMesh);

        // Window Left Jamb Frame
        const jambLeftGeom = new THREE.BoxGeometry(frameCasingThickness, opH - frameCasingThickness, frameDepth);
        jambLeftGeom.translate(op.x0 + frameCasingThickness * 0.5, baseY + op.y0 + opH * 0.5, facadeOffsetZ);
        const jambLeftMesh = new THREE.Mesh(jambLeftGeom, frameMaterial);
        jambLeftMesh.castShadow = true;
        wallSubGroup.add(jambLeftMesh);

        // Window Right Jamb Frame
        const jambRightGeom = new THREE.BoxGeometry(frameCasingThickness, opH - frameCasingThickness, frameDepth);
        jambRightGeom.translate(op.x1 - frameCasingThickness * 0.5, baseY + op.y0 + opH * 0.5, facadeOffsetZ);
        const jambRightMesh = new THREE.Mesh(jambRightGeom, frameMaterial);
        jambRightMesh.castShadow = true;
        wallSubGroup.add(jambRightMesh);

        // 3D Projecting Stone/Concrete Sill
        const sillDepth = frameDepth + sillProjection;
        const sillGeom = new THREE.BoxGeometry(opW + 0.12, frameCasingThickness + 0.02, sillDepth);
        sillGeom.translate(op.x0 + opW * 0.5, baseY + op.y0 + (frameCasingThickness + 0.02) * 0.5, facadeOffsetZ + sillProjection * 0.3);
        const sillMesh = new THREE.Mesh(sillGeom, frameMaterial);
        sillMesh.castShadow = true;
        wallSubGroup.add(sillMesh);

        // 3D Glass Pane (>= 0.06m offset from outer wall face)
        const glassGeom = new THREE.BoxGeometry(Math.max(0.1, opW - frameCasingThickness * 2), Math.max(0.1, opH - frameCasingThickness * 2), 0.02);
        glassGeom.translate(op.x0 + opW * 0.5, baseY + op.y0 + opH * 0.5, facadeOffsetZ);
        const glassMesh = new THREE.Mesh(glassGeom, glassMaterial);
        glassMesh.name = 'WindowGlass';
        glassMesh.userData.isWindowGlass = true;
        wallSubGroup.add(glassMesh);
      } else {
        // Door Head Casing
        const headGeom = new THREE.BoxGeometry(opW + frameCasingThickness * 2, frameCasingThickness, thickness + 0.04);
        headGeom.translate(op.x0 + opW * 0.5, baseY + op.y1 - frameCasingThickness * 0.5, 0);
        const headMesh = new THREE.Mesh(headGeom, frameMaterial);
        headMesh.castShadow = true;
        wallSubGroup.add(headMesh);

        // Left Jamb Casing
        const jambLeftGeom = new THREE.BoxGeometry(frameCasingThickness, opH, thickness + 0.04);
        jambLeftGeom.translate(op.x0 + frameCasingThickness * 0.5, baseY + op.y0 + opH * 0.5, 0);
        const jambLeftMesh = new THREE.Mesh(jambLeftGeom, frameMaterial);
        jambLeftMesh.castShadow = true;
        wallSubGroup.add(jambLeftMesh);

        // Right Jamb Casing
        const jambRightGeom = new THREE.BoxGeometry(frameCasingThickness, opH, thickness + 0.04);
        jambRightGeom.translate(op.x1 - frameCasingThickness * 0.5, baseY + op.y0 + opH * 0.5, 0);
        const jambRightMesh = new THREE.Mesh(jambRightGeom, frameMaterial);
        jambRightMesh.castShadow = true;
        wallSubGroup.add(jambRightMesh);
      }

      if (!op.type.startsWith('window')) {
        // Open walk-through portal: Door leaves are positioned open to the sides (swung 90 degrees)
        // leaving the central portal passage 100% open for camera (Walk Mode & Drone View) access!
        const leafW = (opW - frameCasingThickness * 2) * 0.45;
        const leafH = Math.max(0.1, opH - frameCasingThickness);
        const leafThick = 0.05;

        // Left open glass/frame leaf (resting perpendicular along door jamb)
        const leftDoorGeom = new THREE.BoxGeometry(leafThick, leafH, leafW);
        leftDoorGeom.translate(op.x0 + frameCasingThickness + leafThick * 0.5, baseY + op.y0 + leafH * 0.5, leafW * 0.5);
        const leftDoorMesh = new THREE.Mesh(leftDoorGeom, frameMaterial);
        leftDoorMesh.castShadow = true;
        leftDoorMesh.userData = { isDoor: true, isWalkThroughPortal: true };
        wallSubGroup.add(leftDoorMesh);

        // Right open glass/frame leaf (resting perpendicular along door jamb)
        const rightDoorGeom = new THREE.BoxGeometry(leafThick, leafH, leafW);
        rightDoorGeom.translate(op.x1 - frameCasingThickness - leafThick * 0.5, baseY + op.y0 + leafH * 0.5, leafW * 0.5);
        const rightDoorMesh = new THREE.Mesh(rightDoorGeom, frameMaterial);
        rightDoorMesh.castShadow = true;
        rightDoorMesh.userData = { isDoor: true, isWalkThroughPortal: true };
        wallSubGroup.add(rightDoorMesh);
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
