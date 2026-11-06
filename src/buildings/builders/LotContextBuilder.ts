import * as THREE from 'three';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { BuildingInstance } from '../PrefabTypes';

export interface LotContextOptions {
  showParkedVehicles?: boolean;
  seed?: number;
}

/**
 * LotContextBuilder - Builds rich, functional ground surroundings around buildings
 * to prevent the "placed out of nowhere" (gedung ditaruh begitu saja) look.
 *
 * Provides:
 * - Commercial/Shophouse: Asphalt parking forecourts with white/yellow painted stall markings,
 *   concrete wheel stops (stoper roda), concrete curbs, drainage grates, and hedge buffers.
 * - Residential: Interlocking paving carports, front garden lawn with stepping stones,
 *   low boundary perimeter walls (0.8m) with concrete coping, and steel sliding gates.
 * - Public/Civic: Granite/concrete plaza forecourts with yellow tactile guiding lines,
 *   stainless inverted-U bicycle racks, and concrete planter islands.
 * - Soft contact shadow decals under all props and vehicles.
 * - Parked vehicles disabled by default (strictly follows rule: toggle OFF by default).
 */
export class LotContextBuilder {
  private static getMaterial(name: string, fallbackColor?: string): THREE.Material {
    return (
      MaterialLibrary.get(name) ||
      MaterialLibrary.getInstance().getMaterial(name, {
        color: fallbackColor ? parseInt(fallbackColor.replace('#', '0x')) : 0xcccccc,
      })
    );
  }

  public static addBox(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rotX: number = 0,
    rotY: number = 0,
    rotZ: number = 0
  ): THREE.Mesh {
    const geom = new THREE.BoxGeometry(w, h, d);
    MaterialLibrary.applyWorldScaleUVs(geom, 2.0);

    if (rotX || rotY || rotZ) {
      if (rotX) geom.rotateX(rotX);
      if (rotY) geom.rotateY(rotY);
      if (rotZ) geom.rotateZ(rotZ);
    }
    geom.translate(x, y, z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  public static addCylinder(
    group: THREE.Group,
    rTop: number,
    rBottom: number,
    height: number,
    radialSegments: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rotX: number = 0,
    rotY: number = 0,
    rotZ: number = 0
  ): THREE.Mesh {
    const geom = new THREE.CylinderGeometry(rTop, rBottom, height, radialSegments);
    MaterialLibrary.applyWorldScaleUVs(geom, 1.5);

    if (rotX || rotY || rotZ) {
      if (rotX) geom.rotateX(rotX);
      if (rotY) geom.rotateY(rotY);
      if (rotZ) geom.rotateZ(rotZ);
    }
    geom.translate(x, y, z);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  }

  /**
   * Soft Contact Shadow Blob Plane (Grounds props to the earth)
   */
  public static addContactShadow(
    group: THREE.Group,
    w: number,
    l: number,
    x: number,
    y: number,
    z: number,
    opacity: number = 0.65
  ): THREE.Mesh {
    const geom = new THREE.PlaneGeometry(w, l);
    geom.rotateX(-Math.PI * 0.5);
    geom.translate(x, y + 0.005, z);
    const mat = MaterialLibrary.getInstance().getMaterial('contact_shadow', { opacity });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    group.add(mesh);
    return mesh;
  }

  // =========================================================================
  // 1. COMMERCIAL & SHOPHOUSE PARKING FORECOURT
  // =========================================================================
  public static buildCommercialParkingLot(
    group: THREE.Group,
    bld: BuildingInstance,
    options: LotContextOptions = {}
  ): void {
    const bldW = Math.max(bld.width, bld.subParts?.podium_base?.partWidth ?? bld.width);
    const bldL = bld.length;
    const forecourtL = bld.apronDepth
      ? Math.max(4.0, bld.apronDepth)
      : Math.min(8.0, Math.max(5.0, bldL * 0.5));
    const forecourtW = bldW + 1.2;
    const forecourtZ = bldL * 0.5 + forecourtL * 0.5;

    const asphaltMat = this.getMaterial('asphalt');
    const curbMat = this.getMaterial('curb');
    const markingWhite = this.getMaterial('marking_white');
    const markingYellow = this.getMaterial('marking_yellow');
    const concreteMat = this.getMaterial('concrete_board');
    const darkMetal = this.getMaterial('dark_metal', '#1e293b');
    const grassMat = this.getMaterial('grass');

    // A. Main Asphalt Parking Apron (Plat Aspal Pelataran Parkir)
    this.addBox(group, forecourtW, 0.06, forecourtL, 0, 0.03, forecourtZ, asphaltMat);

    // B. Concrete Curbs (Kerb Beton Tepi)
    const curbH = 0.16;
    const curbThick = 0.18;
    // Left & Right boundary curbs
    this.addBox(group, curbThick, curbH, forecourtL, -forecourtW * 0.5 - curbThick * 0.5, curbH * 0.5, forecourtZ, curbMat);
    this.addBox(group, curbThick, curbH, forecourtL, forecourtW * 0.5 + curbThick * 0.5, curbH * 0.5, forecourtZ, curbMat);

    // C. Street-edge Drainage Gutter Grate (Saluran U-Ditch Tertutup Kisi Besi)
    const grateZ = bldL * 0.5 + forecourtL - 0.25;
    this.addBox(group, forecourtW, 0.03, 0.35, 0, 0.04, grateZ, darkMetal);

    // D. Parking Stalls: Painted 2.5m x 5.0m striping & Concrete Wheel Stops
    const stallW = 2.5;
    const stallL = 4.8;
    const stallsCount = Math.max(1, Math.floor((forecourtW - 0.8) / stallW));
    const totalStallsW = stallsCount * stallW;
    const startX = -totalStallsW * 0.5 + stallW * 0.5;
    const stallCenterZ = bldL * 0.5 + stallL * 0.5 + 0.3;

    // Line marking thickness
    const lineThick = 0.10;
    const lineLen = stallL - 0.4;

    for (let i = 0; i < stallsCount; i++) {
      const sx = startX + i * stallW;

      // Stall divider stripe line
      if (i > 0) {
        const divX = sx - stallW * 0.5;
        this.addBox(group, lineThick, 0.01, lineLen, divX, 0.065, stallCenterZ, markingWhite);
      }

      // Concrete Wheel Stop at head of stall (Stoper Roda Beton 1.8m x 0.12m)
      const stopZ = bldL * 0.5 + 0.65;
      this.addBox(group, 1.8, 0.12, 0.14, sx, 0.06 + 0.06, stopZ, concreteMat);
      // Yellow hazard reflective bands on wheel stop
      this.addBox(group, 0.25, 0.122, 0.142, sx - 0.45, 0.06 + 0.06, stopZ, markingYellow);
      this.addBox(group, 0.25, 0.122, 0.142, sx + 0.45, 0.06 + 0.06, stopZ, markingYellow);
      // Soft contact shadow under wheel stop
      this.addContactShadow(group, 2.1, 0.35, sx, 0.06, stopZ, 0.6);

      // Optional Parked Vehicles (STRICTLY OFF BY DEFAULT)
      if (options.showParkedVehicles) {
        const seed = Math.abs((options.seed ?? 101) + i * 37);
        // Only occupy some stalls (realistic city occupancy ~50-70%)
        if (seed % 3 !== 0) {
          const carZ = stallCenterZ + 0.2;
          this.buildStylizedParkedCar(group, sx, 0.06, carZ, seed);
        }
      }
    }

    // E. Side Green Planting Buffer Strip
    const plantStripW = 0.8;
    this.addBox(group, plantStripW, 0.10, forecourtL, -forecourtW * 0.5 - curbThick - plantStripW * 0.5, 0.05, forecourtZ, grassMat);
    this.addBox(group, plantStripW, 0.10, forecourtL, forecourtW * 0.5 + curbThick + plantStripW * 0.5, 0.05, forecourtZ, grassMat);

    // Low hedge shrubs in planting strip
    const hedgeMat = this.getMaterial('grass', '#2d5a27');
    for (let zOffset = -forecourtL * 0.35; zOffset <= forecourtL * 0.35; zOffset += 1.6) {
      this.addCylinder(group, 0.35, 0.28, 0.55, 8, -forecourtW * 0.5 - curbThick - plantStripW * 0.5, 0.10 + 0.28, forecourtZ + zOffset, hedgeMat);
      this.addCylinder(group, 0.35, 0.28, 0.55, 8, forecourtW * 0.5 + curbThick + plantStripW * 0.5, 0.10 + 0.28, forecourtZ + zOffset, hedgeMat);
    }
  }

  // =========================================================================
  // 2. RESIDENTIAL DRIVEWAY, CARPORT, GARDEN & PERIMETER WALL
  // =========================================================================
  public static buildResidentialDrivewayAndFence(
    group: THREE.Group,
    bld: BuildingInstance,
    options: LotContextOptions = {}
  ): void {
    const bldW = Math.max(bld.width, bld.subParts?.podium_base?.partWidth ?? bld.width);
    const bldL = bld.length;
    const lotFrontL = bld.apronDepth ? Math.max(3.5, bld.apronDepth) : 4.2;
    const lotZ = bldL * 0.5 + lotFrontL * 0.5;
    const totalW = bldW + 1.2;

    const pavingMat = this.getMaterial('paving');
    const grassMat = this.getMaterial('grass');
    const wallMat = this.getMaterial('plaster', '#f8fafc');
    const plinthMat = this.getMaterial('stone_plinth', '#475569');
    const gateMat = this.getMaterial('dark_metal', '#1e293b');

    // A. Carport / Driveway Interlock Paving (Right Side)
    const carportW = Math.max(3.0, bldW * 0.45);
    const carportX = totalW * 0.5 - carportW * 0.5;
    this.addBox(group, carportW, 0.04, lotFrontL, carportX, 0.02, lotZ, pavingMat);

    // B. Front Garden Green Lawn (Left Side)
    const gardenW = totalW - carportW - 0.2;
    const gardenX = -totalW * 0.5 + gardenW * 0.5;
    this.addBox(group, gardenW, 0.04, lotFrontL, gardenX, 0.02, lotZ, grassMat);

    // Natural Andesite Stepping Stones from gate to front porch
    const stoneMat = this.getMaterial('stone_plinth', '#64748b');
    for (let step = 0; step < 4; step++) {
      const stepZ = bldL * 0.5 + 0.8 + step * 0.85;
      this.addBox(group, 0.65, 0.025, 0.40, gardenX + 0.2, 0.04 + 0.0125, stepZ, stoneMat);
      this.addContactShadow(group, 0.75, 0.50, gardenX + 0.2, 0.04, stepZ, 0.5);
    }

    // C. Low Perimeter Masonry Wall with Coping Cap (Pagar Keliling 0.85m)
    const wallH = 0.85;
    const wallThick = 0.15;
    const curbBaseH = 0.20;

    // Left Side Boundary Wall
    const leftX = -totalW * 0.5 - wallThick * 0.5;
    this.addBox(group, wallThick, curbBaseH, lotFrontL, leftX, curbBaseH * 0.5, lotZ, plinthMat);
    this.addBox(group, wallThick - 0.02, wallH - curbBaseH, lotFrontL, leftX, curbBaseH + (wallH - curbBaseH) * 0.5, lotZ, wallMat);
    // Wall Coping Capstone
    this.addBox(group, wallThick + 0.05, 0.05, lotFrontL, leftX, wallH + 0.025, lotZ, plinthMat);

    // Right Side Boundary Wall
    const rightX = totalW * 0.5 + wallThick * 0.5;
    this.addBox(group, wallThick, curbBaseH, lotFrontL, rightX, curbBaseH * 0.5, lotZ, plinthMat);
    this.addBox(group, wallThick - 0.02, wallH - curbBaseH, lotFrontL, rightX, curbBaseH + (wallH - curbBaseH) * 0.5, lotZ, wallMat);
    this.addBox(group, wallThick + 0.05, 0.05, lotFrontL, rightX, wallH + 0.025, lotZ, plinthMat);

    // D. Front Boundary Fence & Sliding Steel Gate (Pintu Gerbang Besi)
    const frontEdgeZ = bldL * 0.5 + lotFrontL;

    // Garden low wall section
    this.addBox(group, gardenW, wallH, wallThick, gardenX, wallH * 0.5, frontEdgeZ, wallMat);
    this.addBox(group, gardenW, 0.05, wallThick + 0.05, gardenX, wallH + 0.025, frontEdgeZ, plinthMat);

    // Gate Posts (Pilar Pagar)
    const postW = 0.35;
    this.addBox(group, postW, wallH + 0.3, postW, carportX - carportW * 0.5, (wallH + 0.3) * 0.5, frontEdgeZ, plinthMat);
    this.addBox(group, postW, wallH + 0.3, postW, carportX + carportW * 0.5, (wallH + 0.3) * 0.5, frontEdgeZ, plinthMat);

    // Sliding Iron Vehicle Gate (Open slightly 1.0m to welcome pedestrian entrance)
    const gateW = carportW - 0.1;
    const gateH = 1.1;
    this.addBox(group, gateW, 0.04, 0.04, carportX, gateH * 0.5, frontEdgeZ + 0.05, gateMat);
    // Vertical iron pickets
    for (let gx = -gateW * 0.45; gx <= gateW * 0.45; gx += 0.22) {
      this.addBox(group, 0.02, gateH, 0.02, carportX + gx, gateH * 0.5, frontEdgeZ + 0.05, gateMat);
    }
  }

  // =========================================================================
  // 3. PUBLIC & CIVIC PLAZA FORECOURT
  // =========================================================================
  public static buildPublicPlazaForecourt(
    group: THREE.Group,
    bld: BuildingInstance,
    options: LotContextOptions = {}
  ): void {
    const bldW = bld.width;
    const bldL = bld.length;
    const plazaL = Math.min(8.0, Math.max(5.0, bldL * 0.45));
    const plazaW = bldW + 2.0;
    const plazaZ = bldL * 0.5 + plazaL * 0.5;

    const pavingMat = this.getMaterial('paving');
    const tactileMat = this.getMaterial('plaster', '#f59e0b'); // Yellow tactile guiding tiles
    const curbMat = this.getMaterial('curb');
    const steelMat = this.getMaterial('galvanized_steel', '#94a3b8');
    const concreteMat = this.getMaterial('concrete_board');
    const foliageMat = this.getMaterial('grass', '#2d5a27');

    // A. Main Interlocking Paver Plaza Slab
    this.addBox(group, plazaW, 0.06, plazaL, 0, 0.03, plazaZ, pavingMat);

    // B. Tactile Guiding Tiles (Jalur Pemandu Difabel Kuning) leading to entrance
    this.addBox(group, 0.40, 0.01, plazaL - 0.6, 0, 0.065, plazaZ, tactileMat);

    // C. Stainless Inverted-U Bicycle Parking Racks (Rak Sepeda)
    const bikeX = -plazaW * 0.38;
    for (let b = -1.2; b <= 1.2; b += 0.8) {
      const bz = plazaZ + b;
      // Inverted U tube
      this.addCylinder(group, 0.025, 0.025, 0.85, 8, bikeX - 0.3, 0.06 + 0.425, bz, steelMat);
      this.addCylinder(group, 0.025, 0.025, 0.85, 8, bikeX + 0.3, 0.06 + 0.425, bz, steelMat);
      this.addBox(group, 0.60, 0.05, 0.05, bikeX, 0.06 + 0.85, bz, steelMat);
      this.addContactShadow(group, 0.85, 0.35, bikeX, 0.06, bz, 0.5);
    }

    // D. Raised Concrete Planter Islands with Sitting Coping (Bangku Taman & Pot Bunga)
    const planterX = plazaW * 0.36;
    const planterW = 1.8;
    const planterL = 3.2;
    const planterH = 0.50;

    // Concrete planter box
    this.addBox(group, planterW, planterH, planterL, planterX, 0.06 + planterH * 0.5, plazaZ, concreteMat);
    // Teak wood seating coping perimeter
    this.addBox(group, planterW + 0.15, 0.06, planterL + 0.15, planterX, 0.06 + planterH + 0.03, plazaZ, this.getMaterial('wood_slat', '#78350f'));
    // Foliage mound
    this.addBox(group, planterW - 0.3, 0.35, planterL - 0.3, planterX, 0.06 + planterH + 0.20, plazaZ, foliageMat);
    this.addContactShadow(group, planterW + 0.6, planterL + 0.6, planterX, 0.06, plazaZ, 0.65);

    // E. Perimeter Curbs
    const curbH = 0.16;
    const curbThick = 0.18;
    this.addBox(group, curbThick, curbH, plazaL, -plazaW * 0.5 - curbThick * 0.5, curbH * 0.5, plazaZ, curbMat);
    this.addBox(group, curbThick, curbH, plazaL, plazaW * 0.5 + curbThick * 0.5, curbH * 0.5, plazaZ, curbMat);
  }

  // =========================================================================
  // 4. LOW-POLY STYLIZED PARKED VEHICLE (Strictly for optional vehicle toggle)
  // =========================================================================
  private static buildStylizedParkedCar(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    seed: number
  ): void {
    const CAR_COLORS = ['#f8fafc', '#1e293b', '#94a3b8', '#b91c1c', '#0369a1', '#78350f'];
    const colIdx = seed % CAR_COLORS.length;
    const bodyMat = this.getMaterial('plaster', CAR_COLORS[colIdx]);
    const glassMat = this.getMaterial('glass');
    const tireMat = this.getMaterial('dark_metal', '#18181b');

    const carW = 1.8;
    const carL = 4.2;
    const carH = 1.4;

    // Soft contact shadow under car
    this.addContactShadow(group, 2.4, 4.6, x, y, z, 0.75);

    // Lower Chassis & Body
    this.addBox(group, carW, 0.55, carL, x, y + 0.45, z, bodyMat);

    // Cabin Greenhouse & Glass
    this.addBox(group, carW * 0.88, 0.55, carL * 0.55, x, y + 0.55 + 0.35, z - 0.2, glassMat);

    // Wheels (4 tires)
    const wheelR = 0.30;
    const wheelThick = 0.22;
    const trackW = carW * 0.5;
    const wheelBaseZ = carL * 0.32;

    [
      { wx: -trackW, wz: -wheelBaseZ },
      { wx: trackW, wz: -wheelBaseZ },
      { wx: -trackW, wz: wheelBaseZ },
      { wx: trackW, wz: wheelBaseZ },
    ].forEach(({ wx, wz }) => {
      this.addCylinder(group, wheelR, wheelR, wheelThick, 12, x + wx, y + wheelR, z + wz, tireMat, 0, 0, Math.PI * 0.5);
    });
  }

  // =========================================================================
  // 5. MASTER ENTRY POINT: ATTACH LOT GROUND CONTEXT
  // =========================================================================
  public static attachLotGroundContext(
    group: THREE.Group,
    building: BuildingInstance,
    options: LotContextOptions = {}
  ): void {
    if (group.getObjectByName('LotGroundContextGroup')) return;

    const contextGroup = new THREE.Group();
    contextGroup.name = 'LotGroundContextGroup';

    const baseGroup = new THREE.Group();
    baseGroup.name = 'LotGroundBase';
    contextGroup.add(baseGroup);

    const detailGroup = new THREE.Group();
    detailGroup.name = 'LotDetailProps';
    contextGroup.add(detailGroup);

    const cat = building.category || '';
    const preset = building.presetKey || '';

    const isCommercial =
      cat === 'commercial' ||
      preset.includes('ruko') ||
      preset.includes('minimarket') ||
      preset.includes('retail') ||
      preset.includes('office') ||
      preset.includes('cafe') ||
      preset.includes('resto');

    const isResidential =
      cat === 'residential' ||
      preset.includes('house') ||
      preset.includes('villa') ||
      preset.includes('joglo');

    const isPublic =
      cat === 'public' ||
      preset.includes('school') ||
      preset.includes('puskesmas') ||
      preset.includes('hall') ||
      preset.includes('mosque');

    const tempGroup = new THREE.Group();
    if (isCommercial) {
      this.buildCommercialParkingLot(tempGroup, building, options);
    } else if (isResidential) {
      this.buildResidentialDrivewayAndFence(tempGroup, building, options);
    } else if (isPublic) {
      this.buildPublicPlazaForecourt(tempGroup, building, options);
    } else {
      this.buildCommercialParkingLot(tempGroup, building, options);
    }

    const items = [...tempGroup.children];
    if (items.length > 0) {
      baseGroup.add(items[0]);
      for (let i = 1; i < items.length; i++) {
        detailGroup.add(items[i]);
      }
    } else {
      detailGroup.add(new THREE.Group());
    }

    group.add(contextGroup);
  }
}

