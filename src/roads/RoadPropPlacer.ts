import * as THREE from 'three';

export class RoadPropPlacer {
  private static lightPoleGeom: THREE.BufferGeometry | null = null;
  private static lightPoleMat: THREE.MeshStandardMaterial | null = null;
  private static lampGlowMat: THREE.MeshBasicMaterial | null = null;
  private static bulbGeom: THREE.BufferGeometry | null = null;

  private static treeTrunkGeom: THREE.BufferGeometry | null = null;
  private static treeTrunkMat: THREE.MeshStandardMaterial | null = null;
  private static treeFoliageGeom: THREE.BufferGeometry | null = null;
  private static treeFoliageMat: THREE.MeshStandardMaterial | null = null;

  private static initMaterials(): void {
    if (this.lightPoleGeom) return;

    // Street Light Pole Geometry (Pole height 6m, arm 1.5m)
    const pole = new THREE.CylinderGeometry(0.08, 0.12, 5.5, 8);
    pole.translate(0, 2.75, 0);

    this.lightPoleGeom = pole;

    this.bulbGeom = new THREE.SphereGeometry(0.25, 8, 8);
    this.bulbGeom.translate(0, 5.3, 0.4);

    this.lightPoleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.3
    });

    this.lampGlowMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0
    });

    // Tropical Shade Tree (Pohon Trembesi / Peneduh Tropis)
    const trunk = new THREE.CylinderGeometry(0.2, 0.3, 3.0, 8);
    trunk.translate(0, 1.5, 0);
    this.treeTrunkGeom = trunk;

    this.treeTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x543d2b,
      roughness: 0.9
    });

    // Broad umbrella-like tropical foliage
    const foliage = new THREE.DodecahedronGeometry(2.4, 1);
    foliage.translate(0, 4.0, 0);
    this.treeFoliageGeom = foliage;

    this.treeFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x2e6f40,
      roughness: 0.75,
      metalness: 0.05
    });
  }

  /**
   * InstancedMesh for streetlights along road corridor
   */
  public static addInstancedLights(group: THREE.Group, transforms: THREE.Matrix4[]): void {
    if (transforms.length === 0) return;
    this.initMaterials();

    const count = transforms.length;
    const instancedPoles = new THREE.InstancedMesh(this.lightPoleGeom!, this.lightPoleMat!, count);
    instancedPoles.castShadow = true;

    const instancedBulbs = new THREE.InstancedMesh(this.bulbGeom!, this.lampGlowMat!, count);

    for (let i = 0; i < count; i++) {
      instancedPoles.setMatrixAt(i, transforms[i]);
      instancedBulbs.setMatrixAt(i, transforms[i]);
    }

    instancedPoles.instanceMatrix.needsUpdate = true;
    instancedBulbs.instanceMatrix.needsUpdate = true;

    group.add(instancedPoles);
    group.add(instancedBulbs);
  }

  /**
   * InstancedMesh for shade trees along road sidewalk
   */
  public static addInstancedTrees(group: THREE.Group, transforms: THREE.Matrix4[]): void {
    if (transforms.length === 0) return;
    this.initMaterials();

    const count = transforms.length;
    const instancedTrunks = new THREE.InstancedMesh(this.treeTrunkGeom!, this.treeTrunkMat!, count);
    instancedTrunks.castShadow = true;
    instancedTrunks.receiveShadow = true;

    const instancedFoliage = new THREE.InstancedMesh(this.treeFoliageGeom!, this.treeFoliageMat!, count);
    instancedFoliage.castShadow = true;
    instancedFoliage.receiveShadow = true;

    for (let i = 0; i < count; i++) {
      instancedTrunks.setMatrixAt(i, transforms[i]);
      instancedFoliage.setMatrixAt(i, transforms[i]);
    }

    instancedTrunks.instanceMatrix.needsUpdate = true;
    instancedFoliage.instanceMatrix.needsUpdate = true;

    group.add(instancedTrunks);
    group.add(instancedFoliage);
  }

  public static createStreetLight(position: THREE.Vector3, rotationY: number): THREE.Group {
    this.initMaterials();

    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = rotationY;

    const poleMesh = new THREE.Mesh(this.lightPoleGeom!, this.lightPoleMat!);
    poleMesh.castShadow = true;
    group.add(poleMesh);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), this.lampGlowMat!);
    bulb.position.set(0, 5.3, 0.4);
    group.add(bulb);

    return group;
  }

  public static createShadeTree(position: THREE.Vector3, scale: number = 1.0): THREE.Group {
    this.initMaterials();

    const group = new THREE.Group();
    group.position.copy(position);
    group.scale.setScalar(scale);

    const trunk = new THREE.Mesh(this.treeTrunkGeom!, this.treeTrunkMat!);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(this.treeFoliageGeom!, this.treeFoliageMat!);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    group.add(foliage);

    return group;
  }
}
