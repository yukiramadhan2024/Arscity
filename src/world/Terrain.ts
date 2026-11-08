import * as THREE from 'three';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export class Terrain {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public size: number;
  public segments: number;
  public contourUniforms: Record<string, { value: any }>;
  private material: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, size: number = 1600, segments: number = 256) {
    this.size = size;
    this.segments = segments;

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Orient horizontally in XZ plane

    this.material = MaterialLibrary.getInstance().getMaterial('grass').clone();
    this.material.roughness = 0.85;
    this.material.normalScale = new THREE.Vector2(0.4, 0.4);

    const terrainRepeat = Math.max(1, Math.round(size / 24));
    const textureKeys: Array<'map' | 'normalMap' | 'roughnessMap' | 'bumpMap' | 'aoMap'> = [
      'map',
      'normalMap',
      'roughnessMap',
      'bumpMap',
      'aoMap',
    ];
    for (const key of textureKeys) {
      const tex = this.material[key];
      if (tex && tex instanceof THREE.Texture) {
        const clonedTex = tex.clone();
        clonedTex.wrapS = THREE.RepeatWrapping;
        clonedTex.wrapT = THREE.RepeatWrapping;
        clonedTex.repeat.set(terrainRepeat, terrainRepeat);
        clonedTex.generateMipmaps = true;
        clonedTex.minFilter = THREE.LinearMipmapLinearFilter;
        clonedTex.magFilter = THREE.LinearFilter;
        clonedTex.anisotropy = 4;
        clonedTex.needsUpdate = true;
        (this.material as any)[key] = clonedTex;
      }
    }

    // Topographic Contour Lines & Slope Shading Uniforms
    this.contourUniforms = {
      uContourActive: { value: 1.0 },
      uContourInterval: { value: 2.0 },
      uMajorContourInterval: { value: 10.0 },
      uContourColor: { value: new THREE.Color(0x183818) }, // Deep topographic moss line
      uMajorContourColor: { value: new THREE.Color(0x0a1e0a) }, // Crisp dark index contour line
    };
    this.material.userData.contourUniforms = this.contourUniforms;

    this.material.customProgramCacheKey = () => 'terrain_contour_shader_v2';
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uContourActive = this.contourUniforms.uContourActive;
      shader.uniforms.uContourInterval = this.contourUniforms.uContourInterval;
      shader.uniforms.uMajorContourInterval = this.contourUniforms.uMajorContourInterval;
      shader.uniforms.uContourColor = this.contourUniforms.uContourColor;
      shader.uniforms.uMajorContourColor = this.contourUniforms.uMajorContourColor;

      // 1. Export world position and normal from vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPositionTerrain;
        varying vec3 vWorldNormalTerrain;`
      );

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vWorldPositionTerrain = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWorldNormalTerrain = normalize(mat3(modelMatrix) * normal);`
      );

      // 2. Fragment shader: render crisp anti-aliased contour lines and slope cliff tint
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPositionTerrain;
        varying vec3 vWorldNormalTerrain;
        uniform float uContourActive;
        uniform float uContourInterval;
        uniform float uMajorContourInterval;
        uniform vec3 uContourColor;
        uniform vec3 uMajorContourColor;`
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (uContourActive > 0.5) {
          float elev = vWorldPositionTerrain.y;

          // Slope calculation: 0 on horizontal ground, 1 on vertical cliff
          float slope = 1.0 - clamp(abs(vWorldNormalTerrain.y), 0.0, 1.0);

          // If inside river trench (elev < -0.15m), shade with wet alluvial riverbed soil and suppress terrestrial contour lines
          if (elev < -0.15) {
            vec3 riverbedMud = vec3(0.22, 0.20, 0.16);
            vec3 wetBank = vec3(0.18, 0.25, 0.14);
            float riverbedDepth = clamp((-elev) / 1.5, 0.0, 1.0);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(wetBank, riverbedMud, riverbedDepth), 0.85);
          } else {
            // Only draw topographic contour lines on land (elev >= 0.10m)
            float landContourMask = smoothstep(0.08, 0.25, elev);

            // Minor contour lines (every 2m)
            float minorVal = abs(fract(elev / uContourInterval - 0.5) - 0.5);
            float minorW = max(fwidth(elev / uContourInterval), 0.0015);
            float minorLine = (1.0 - smoothstep(0.0, minorW * 1.6, minorVal)) * landContourMask;

            // Major index contour lines (every 10m)
            float majorVal = abs(fract(elev / uMajorContourInterval - 0.5) - 0.5);
            float majorW = max(fwidth(elev / uMajorContourInterval), 0.0015);
            float majorLine = (1.0 - smoothstep(0.0, majorW * 2.4, majorVal)) * landContourMask;

            // Rocky cliff shading for mountain slopes (> 18 deg)
            vec3 rockCliff = vec3(0.36, 0.33, 0.28);
            float cliffFactor = smoothstep(0.25, 0.60, slope);

            // Hypsometric elevation gradient: subtle earthy highlands
            float highAlt = clamp(elev / 35.0, 0.0, 1.0);
            vec3 highTint = mix(gl_FragColor.rgb, vec3(0.42, 0.44, 0.30), highAlt * 0.45);

            vec3 baseColor = mix(highTint, rockCliff, cliffFactor * 0.75);

            // Blend minor and major contour lines
            vec3 withMinor = mix(baseColor, uContourColor, minorLine * 0.50);
            vec3 withMajor = mix(withMinor, uMajorContourColor, majorLine * 0.92);

            gl_FragColor.rgb = withMajor;
          }
        }`
      );
    };

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'Terrain';

    scene.add(this.mesh);

    // Continuous tropical river water plane at Y = -0.45m
    const waterGeom = new THREE.PlaneGeometry(size, size);
    waterGeom.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0EA5E9,
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
      metalness: 0.1,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 2.0,
      polygonOffsetUnits: 2.0,
    });
    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.position.y = -0.45;
    this.waterMesh.receiveShadow = true;
    this.waterMesh.name = 'RiverWaterPlane';
    scene.add(this.waterMesh);
  }

  public resize(newSize: number): void {
    this.size = newSize;
    this.mesh.geometry.dispose();
    const newGeom = new THREE.PlaneGeometry(newSize, newSize, this.segments, this.segments);
    newGeom.rotateX(-Math.PI / 2);
    this.mesh.geometry = newGeom;

    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      const newWaterGeom = new THREE.PlaneGeometry(newSize, newSize);
      newWaterGeom.rotateX(-Math.PI / 2);
      this.waterMesh.geometry = newWaterGeom;
    }

    if (this.material.map) {
      this.material.map.repeat.set(newSize / 8, newSize / 8);
      if (this.material.map.image) {
        this.material.map.needsUpdate = true;
      }
    }
  }

  public setContourLinesVisible(enabled: boolean): void {
    if (this.contourUniforms && this.contourUniforms.uContourActive) {
      this.contourUniforms.uContourActive.value = enabled ? 1.0 : 0.0;
    }
  }

  public isContourLinesVisible(): boolean {
    return this.contourUniforms && this.contourUniforms.uContourActive ? this.contourUniforms.uContourActive.value > 0.5 : true;
  }

  /**
   * Continuous bilinear interpolation of terrain elevation at any world (x, z) coordinates.
   */
  public getHeightAt(x: number, z: number): number {
    const half = this.size / 2;
    const normX = (x + half) / this.size;
    const normZ = (z + half) / this.size;

    if (normX < 0 || normX > 1 || normZ < 0 || normZ > 1) {
      return 0;
    }

    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return 0;

    const colF = normX * this.segments;
    const rowF = normZ * this.segments;
    const c0 = Math.floor(colF);
    const r0 = Math.floor(rowF);
    const c1 = Math.min(this.segments, c0 + 1);
    const r1 = Math.min(this.segments, r0 + 1);
    const tx = colF - c0;
    const tz = rowF - r0;

    const stride = this.segments + 1;
    const i00 = r0 * stride + c0;
    const i10 = r0 * stride + c1;
    const i01 = r1 * stride + c0;
    const i11 = r1 * stride + c1;

    const count = pos.count;
    if (i11 >= count) return 0;

    const h00 = pos.getY(i00);
    const h10 = pos.getY(i10);
    const h01 = pos.getY(i01);
    const h11 = pos.getY(i11);

    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;

    return h0 * (1 - tz) + h1 * tz;
  }

  /**
   * Modifies terrain elevation within a circular brush radius with smooth cosine falloff.
   * Supports 'raise', 'lower', and 'flatten' modes.
   */
  public modifyElevation(
    centerX: number,
    centerZ: number,
    radius: number,
    deltaY: number,
    mode: 'raise' | 'lower' | 'flatten' | 'river' = 'raise',
    targetHeight?: number
  ): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;

    const half = this.size / 2;
    const step = this.size / this.segments;
    const minCol = Math.max(0, Math.floor(((centerX - radius) + half) / step));
    const maxCol = Math.min(this.segments, Math.ceil(((centerX + radius) + half) / step));
    const minRow = Math.max(0, Math.floor(((centerZ - radius) + half) / step));
    const maxRow = Math.min(this.segments, Math.ceil(((centerZ + radius) + half) / step));

    const stride = this.segments + 1;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const idx = r * stride + c;
        if (idx >= pos.count) continue;

        const vx = pos.getX(idx);
        const vz = pos.getZ(idx);
        const dist = Math.hypot(vx - centerX, vz - centerZ);

        if (dist <= radius) {
          const falloff = 0.5 * (1 + Math.cos(Math.PI * (dist / radius)));
          const currentY = pos.getY(idx);

          if (mode === 'raise') {
            const newY = currentY < -0.15 ? Math.min(currentY + deltaY * falloff, -0.22) : currentY + deltaY * falloff;
            pos.setY(idx, newY);
          } else if (mode === 'lower') {
            pos.setY(idx, currentY - deltaY * falloff);
          } else if (mode === 'river') {
            const riverDepth = -1.8;
            if (currentY > riverDepth) {
              const excavateSpeed = Math.min(1.0, (deltaY || 1.2) * 0.45);
              const newY = currentY + (riverDepth - currentY) * falloff * excavateSpeed;
              pos.setY(idx, Math.max(riverDepth, newY));
            }
          } else if (mode === 'flatten') {
            const target = targetHeight !== undefined ? targetHeight : 0;
            pos.setY(idx, currentY + (target - currentY) * falloff);
          }
        }
      }
    }

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Flattens a rectangular terrain area (e.g. building footprint or lot parcel) to a uniform target elevation.
   */
  public flattenArea(minX: number, minZ: number, maxX: number, maxZ: number, targetHeight: number = 0): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;

    const half = this.size / 2;
    const step = this.size / this.segments;
    const minCol = Math.max(0, Math.floor((minX + half) / step));
    const maxCol = Math.min(this.segments, Math.ceil((maxX + half) / step));
    const minRow = Math.max(0, Math.floor((minZ + half) / step));
    const maxRow = Math.min(this.segments, Math.ceil((maxZ + half) / step));

    const stride = this.segments + 1;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const idx = r * stride + c;
        if (idx >= pos.count) continue;

        const vx = pos.getX(idx);
        const vz = pos.getZ(idx);
        if (vx >= minX && vx <= maxX && vz >= minZ && vz <= maxZ) {
          pos.setY(idx, targetHeight);
        }
      }
    }

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Automatically flattens the ground directly under a lot parcel.
   */
  public flattenUnderLot(
    lot: { position: { x: number; z: number }; width: number; length: number },
    targetHeight?: number
  ): void {
    const h = targetHeight !== undefined ? targetHeight : this.getHeightAt(lot.position.x, lot.position.z);
    const halfW = lot.width / 2 + 1.0;
    const halfL = lot.length / 2 + 1.0;
    this.flattenArea(
      lot.position.x - halfW,
      lot.position.z - halfL,
      lot.position.x + halfW,
      lot.position.z + halfL,
      h
    );
  }

  /**
   * Measures the elevation difference across a building footprint to determine talud foundation depth.
   */
  public getElevationDeltaAcrossFootprint(
    centerX: number,
    centerZ: number,
    width: number,
    length: number
  ): { minH: number; maxH: number; deltaH: number } {
    const hw = width / 2;
    const hl = length / 2;
    const samples = [
      this.getHeightAt(centerX, centerZ),
      this.getHeightAt(centerX - hw, centerZ - hl),
      this.getHeightAt(centerX + hw, centerZ - hl),
      this.getHeightAt(centerX - hw, centerZ + hl),
      this.getHeightAt(centerX + hw, centerZ + hl)
    ];

    const minH = Math.min(...samples);
    const maxH = Math.max(...samples);
    return { minH, maxH, deltaH: maxH - minH };
  }

  /**
   * Samples a 2, 3, or 4-point Bezier curve at parameter t in [0, 1].
   */
  public sampleBezierPoints(points: THREE.Vector3[], t: number): THREE.Vector3 {
    if (points.length === 2) {
      return new THREE.Vector3().lerpVectors(points[0], points[1], t);
    }
    if (points.length === 3) {
      const p0 = points[0];
      const p1 = points[1];
      const p2 = points[2];
      const u = 1 - t;
      return new THREE.Vector3(
        u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
        u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z
      );
    }
    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];
    const p3 = points[3];
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    return new THREE.Vector3(
      uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
      uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
      uu * u * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + tt * t * p3.z
    );
  }

  public getCurveLength(points: THREE.Vector3[]): number {
    let len = 0;
    const steps = 16;
    let prev = points[0];
    for (let i = 1; i <= steps; i++) {
      const curr = this.sampleBezierPoints(points, i / steps);
      len += prev.distanceTo(curr);
      prev = curr;
    }
    return len;
  }

  private distToSegmentSquared(
    px: number,
    pz: number,
    ax: number,
    az: number,
    bx: number,
    bz: number
  ): number {
    const dx = bx - ax;
    const dz = bz - az;
    const l2 = dx * dx + dz * dz;
    if (l2 === 0) {
      const dpx = px - ax;
      const dpz = pz - az;
      return dpx * dpx + dpz * dpz;
    }
    let t = ((px - ax) * dx + (pz - az) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = ax + t * dx;
    const projZ = az + t * dz;
    const rx = px - projX;
    const rz = pz - projZ;
    return rx * rx + rz * rz;
  }

  /**
   * Smoothly carves a continuous U-channel river trench along a Bezier or polyline curve.
   * Modifies each affected vertex only once with continuous cosine falloff.
   */
  public carveRiverTrench(
    curvePoints: THREE.Vector3[],
    width: number,
    depth: number
  ): { indices: number[]; oldHeights: number[] } {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos || curvePoints.length < 2) return { indices: [], oldHeights: [] };

    const startElev = this.getHeightAt(curvePoints[0].x, curvePoints[0].z);
    const endElev = this.getHeightAt(curvePoints[curvePoints.length - 1].x, curvePoints[curvePoints.length - 1].z);

    const sampleCount = Math.max(24, Math.ceil(this.getCurveLength(curvePoints) * 2));
    const samples: THREE.Vector3[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      samples.push(this.sampleBezierPoints(curvePoints, i / sampleCount));
    }

    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    const trenchRadius = width * 0.75;

    for (const pt of samples) {
      minX = Math.min(minX, pt.x - trenchRadius);
      maxX = Math.max(maxX, pt.x + trenchRadius);
      minZ = Math.min(minZ, pt.z - trenchRadius);
      maxZ = Math.max(maxZ, pt.z + trenchRadius);
    }

    const half = this.size / 2;
    const step = this.size / this.segments;
    const minCol = Math.max(0, Math.floor((minX + half) / step));
    const maxCol = Math.min(this.segments, Math.ceil((maxX + half) / step));
    const minRow = Math.max(0, Math.floor((minZ + half) / step));
    const maxRow = Math.min(this.segments, Math.ceil((maxZ + half) / step));

    const stride = this.segments + 1;
    const modifiedIndices: number[] = [];
    const oldHeights: number[] = [];

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const idx = r * stride + c;
        if (idx >= pos.count) continue;

        const vx = pos.getX(idx);
        const vz = pos.getZ(idx);

        let minDistSq = Infinity;
        let closestSeg = 0;
        for (let s = 0; s < samples.length - 1; s++) {
          const dSq = this.distToSegmentSquared(
            vx, vz,
            samples[s].x, samples[s].z,
            samples[s + 1].x, samples[s + 1].z
          );
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closestSeg = s;
          }
        }
        const minDist = Math.sqrt(minDistSq);

        if (minDist < trenchRadius) {
          const currentY = pos.getY(idx);
          const tProgress = closestSeg / Math.max(1, samples.length - 2);
          const riverbedBaseY = THREE.MathUtils.lerp(startElev, endElev, tProgress) - depth;

          // Inside the riverbed channel, carve down to riverbedBaseY
          // Near the bank edges (between width * 0.5 and trenchRadius), smoothly transition up to bank
          const halfW = width * 0.5;
          let targetY: number;
          if (minDist <= halfW) {
            targetY = riverbedBaseY;
          } else {
            const bankRatio = (minDist - halfW) / Math.max(0.1, trenchRadius - halfW);
            const smoothT = 0.5 * (1.0 - Math.cos(Math.PI * bankRatio));
            targetY = THREE.MathUtils.lerp(riverbedBaseY, currentY, smoothT);
          }

          if (currentY > targetY) {
            modifiedIndices.push(idx);
            oldHeights.push(currentY);
            pos.setY(idx, targetY);
          }
        }
      }
    }

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();

    return { indices: modifiedIndices, oldHeights };
  }

  /**
   * Restores original elevations for specified vertex indices (used for Undo).
   */
  public restoreElevations(indices: number[], heights: number[]): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos || indices.length !== heights.length) return;

    for (let i = 0; i < indices.length; i++) {
      pos.setY(indices[i], heights[i]);
    }

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Resets all terrain vertices to completely flat elevation (Y = 0) (Tahap 2).
   */
  public resetFlat(): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, 0);
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Carves a scenic tropical river valley bisecting the map (Tahap 2).
   * Generates a gentle S-curve river trench to depth -2.2m and width 18m,
   * revealing the crystal-clear water plane at Y = -0.45m.
   */
  public generateTropicalRiverValley(): THREE.Vector3[] {
    const curvePoints = [
      new THREE.Vector3(-140, 0, -90),
      new THREE.Vector3(-45, 0, -25),
      new THREE.Vector3(35, 0, 35),
      new THREE.Vector3(140, 0, 105),
    ];
    this.carveRiverTrench(curvePoints, 18, 2.2);
    return curvePoints;
  }

  /**
   * Smoothly carves one or more custom river channels by mode, width (8-36m), and flow angle.
   */
  public generateCustomRiverChannels(
    curves2D: Array<Array<[number, number]>>,
    widthMeters: number = 18,
    isConfluence: boolean = false
  ): THREE.Vector3[][] {
    const outCurves: THREE.Vector3[][] = [];
    const safeWidth = Math.max(8, Math.min(36, widthMeters));
    curves2D.forEach((pts2D, idx) => {
      const vecs = pts2D.map(([x, z]) => new THREE.Vector3(x, 0, z));
      const w = idx > 0 && isConfluence ? Math.max(8, safeWidth * 0.72) : safeWidth;
      const depth = idx > 0 && isConfluence ? 1.85 : 2.35;
      this.carveRiverTrench(vecs, w, depth);
      outCurves.push(vecs);
    });
    return outCurves;
  }

  /**
   * Sculpts a gentle river-valley terrain depression framing the river corridor.
   */
  public generateRiverValleySlope(curves2D: Array<Array<[number, number]>>): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;

    const valleyHalfWidth = 135;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      let minDist = Infinity;
      for (const pts of curves2D) {
        if (pts.length < 2) continue;
        for (let s = 0; s < pts.length - 1; s++) {
          const d = Math.sqrt(
            this.distToSegmentSquared(vx, vz, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1])
          );
          if (d < minDist) minDist = d;
        }
      }
      if (!Number.isFinite(minDist)) {
        minDist = Math.abs(vz);
      }
      if (minDist > 32) {
        const slopeT = Math.min(1.0, (minDist - 32) / valleyHalfWidth);
        const smooth = slopeT * slopeT * (3 - 2 * slopeT);
        const undulation = Math.sin(vx * 0.03) * Math.cos(vz * 0.03) * 1.4;
        const elev = smooth * 7.5 + Math.max(0, undulation * smooth);
        pos.setY(i, pos.getY(i) + elev);
      }
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Generates rolling perimeter hills scaled by configurable hillHeight (4m - 24m).
   */
  public generateHillsWithHeight(hillHeight: number = 12): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;
    const hScale = Math.max(2, Math.min(30, hillHeight)) / 12.0;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const distFromCenter = Math.hypot(vx, vz);
      if (distFromCenter > 76) {
        const hillRatio = Math.min(1.0, (distFromCenter - 76) / 95);
        const wave = Math.sin(vx * 0.035) * Math.cos(vz * 0.035) * 4.5 + Math.sin(vx * 0.075 + vz * 0.055) * 2.0;
        const elevation = (hillRatio * 9.5 + Math.max(0, wave * hillRatio)) * hScale;
        pos.setY(i, Math.max(0, elevation));
      }
    }
    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Generates smooth natural perimeter hills around the district border (Tahap 2).
   * Keeps the central buildable basin (radius < 85m) flat at Y = 0 while sculpting
   * rolling perimeter hills up to 14m high on the outer borders.
   */
  public generateNaturalPerimeterHills(): void {
    this.generateHillsWithHeight(12);
  }

  public setSubsurfaceXRay(enabled: boolean): void {
    if (enabled) {
      this.material.transparent = true;
      this.material.opacity = 0.32;
      this.material.depthWrite = false;
      this.material.needsUpdate = true;
    } else {
      this.material.transparent = false;
      this.material.opacity = 1.0;
      this.material.depthWrite = true;
      this.material.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      (this.waterMesh.material as THREE.Material).dispose();
      if (this.waterMesh.parent) {
        this.waterMesh.parent.remove(this.waterMesh);
      }
    }
  }
}
