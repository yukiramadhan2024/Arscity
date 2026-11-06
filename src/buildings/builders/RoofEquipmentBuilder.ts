import * as THREE from 'three';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { BuildingInstance } from '../PrefabTypes';

/**
 * RoofEquipmentBuilder - Generates detailed, high-fidelity architectural rooftop equipment
 * and flat roof parapet details tailored to Indonesian tropical vernacular and contemporary urban typologies.
 *
 * Equipment includes:
 * - Toren Air (Penguin orange, blue HDPE, and stainless steel tanks on structural angle-iron stands with ladders)
 * - Photovoltaic Solar Panels (Grid-tied PV modules oriented facing True North for the Southern Hemisphere / Yogyakarta at ~7.8° S)
 * - Commercial Rooftop HVAC Chillers & Condenser Banks with top exhaust fans and vibration rails
 * - Rotary Cyclone Turbine Ventilators & Mushroom Exhaust Hoods
 * - Rooftop Skylights with raised curb frames and safety glazing
 * - Roof Access Maintenance Hatches with coaming and safety guardrails
 * - Solar Water Heaters (Solahart/Wika Solar horizontal cylinder with tilted collector)
 * - Telecom Antenna Masts & Parabolic Dishes
 * - Parapet walls with stone/metal coping, drainage scuppers, and gravel/membrane/green roof decks
 */
export class RoofEquipmentBuilder {
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

  // =========================================================================
  // 1. TANGKI AIR TOREN NUSANTARA (Indonesian Water Storage Tanks)
  // =========================================================================
  public static buildWaterTankToren(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    options: {
      capacity?: '500L' | '1000L' | '2000L';
      material?: 'orange' | 'blue' | 'stainless';
      hasStand?: boolean;
      standHeight?: number;
    } = {}
  ): void {
    const capacity = options.capacity || '1000L';
    const matType = options.material || 'orange';
    const hasStand = options.hasStand ?? true;
    const standH = options.standHeight || 1.1;

    let radius = 0.52;
    let tankH = 1.35;
    if (capacity === '500L') {
      radius = 0.42;
      tankH = 1.05;
    } else if (capacity === '2000L') {
      radius = 0.70;
      tankH = 1.75;
    }

    const steelMat = this.getMaterial('galvanized_steel', '#94a3b8');
    const darkMetal = this.getMaterial('dark_metal', '#334155');
    const valveRed = this.getMaterial('plaster', '#dc2626');

    let tankMat: THREE.Material;
    if (matType === 'blue') {
      tankMat = this.getMaterial('toren_blue', '#0284c7');
    } else if (matType === 'stainless') {
      tankMat = this.getMaterial('toren_stainless', '#e2e8f0');
    } else {
      tankMat = this.getMaterial('toren_orange', '#ea580c');
    }

    let currentY = y;

    // A. Structural Angle-Iron Stand Frame (Kaki Menara Toren)
    if (hasStand) {
      const standW = radius * 2.2;
      const legThick = 0.06;
      const halfW = standW * 0.5 - legThick * 0.5;

      // 4 Angle Legs
      this.addBox(group, legThick, standH, legThick, x - halfW, currentY + standH * 0.5, z - halfW, steelMat);
      this.addBox(group, legThick, standH, legThick, x + halfW, currentY + standH * 0.5, z - halfW, steelMat);
      this.addBox(group, legThick, standH, legThick, x - halfW, currentY + standH * 0.5, z + halfW, steelMat);
      this.addBox(group, legThick, standH, legThick, x + halfW, currentY + standH * 0.5, z + halfW, steelMat);

      // Horizontal perimeter ring ties (Top & Mid)
      const tieThick = 0.04;
      [0.45, 0.95].forEach((frac) => {
        const ringY = currentY + standH * frac;
        this.addBox(group, standW, tieThick, tieThick, x, ringY, z - halfW, steelMat);
        this.addBox(group, standW, tieThick, tieThick, x, ringY, z + halfW, steelMat);
        this.addBox(group, tieThick, tieThick, standW, x - halfW, ringY, z, steelMat);
        this.addBox(group, tieThick, tieThick, standW, x + halfW, ringY, z, steelMat);
      });

      // Top Support Platform Grate
      this.addBox(group, standW + 0.08, 0.05, standW + 0.08, x, currentY + standH, z, steelMat);

      // Vertical Climbing Ladder on front side
      const ladderW = 0.32;
      const rungs = Math.floor(standH / 0.28);
      const ladderZ = z + halfW + 0.05;
      this.addBox(group, 0.03, standH, 0.03, x - ladderW * 0.5, currentY + standH * 0.5, ladderZ, steelMat);
      this.addBox(group, 0.03, standH, 0.03, x + ladderW * 0.5, currentY + standH * 0.5, ladderZ, steelMat);
      for (let r = 1; r <= rungs; r++) {
        this.addBox(group, ladderW, 0.025, 0.025, x, currentY + r * 0.26, ladderZ, steelMat);
      }

      currentY += standH + 0.05;
    }

    // B. Cylindrical Tank Body
    const bodyCenterY = currentY + tankH * 0.5;
    this.addCylinder(group, radius, radius, tankH, 16, x, bodyCenterY, z, tankMat);

    // Domed Top Lid & Inspection Cover Knob
    const domeH = radius * 0.28;
    this.addCylinder(group, radius * 0.85, radius, domeH, 16, x, currentY + tankH + domeH * 0.5, z, tankMat);
    this.addCylinder(group, radius * 0.35, radius * 0.38, 0.10, 12, x, currentY + tankH + domeH + 0.05, z, darkMetal);

    // C. Discharge & Inlet Piping with Shutoff Ball Valve
    const pipeDiam = 0.04;
    const pipeLen = tankH * 0.85;
    const pipeX = x + radius + 0.05;
    // Vertical discharge downpipe
    this.addCylinder(group, pipeDiam, pipeDiam, pipeLen, 8, pipeX, bodyCenterY, z, steelMat);
    // Upper elbow into tank
    this.addBox(group, 0.12, pipeDiam, pipeDiam, x + radius, currentY + tankH * 0.85, z, steelMat);
    // Red Ball Valve Handle
    this.addBox(group, 0.08, 0.04, 0.08, pipeX, currentY + 0.35, z, darkMetal);
    this.addBox(group, 0.12, 0.02, 0.03, pipeX + 0.04, currentY + 0.38, z, valveRed);
  }

  // =========================================================================
  // 2. PANEL SURYA FOTOVOLTAIK (Solar PV Panels facing True North)
  // Sleman/Yogyakarta ~7.8° S latitude -> Modules face True North (-Z) at ~12° tilt
  // =========================================================================
  public static buildSolarPanelArray(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    options: {
      rows?: number;
      cols?: number;
      panelW?: number;
      panelL?: number;
      tiltDeg?: number;
      faceNorth?: boolean;
    } = {}
  ): void {
    const rows = options.rows || 2;
    const cols = options.cols || 3;
    const pW = options.panelW || 1.05;
    const pL = options.panelL || 1.70;
    const tilt = (options.tiltDeg ?? 12) * (Math.PI / 180);
    const faceNorth = options.faceNorth ?? true;

    const solarMat = this.getMaterial('solar_panel', '#0f172a');
    const frameMat = this.getMaterial('galvanized_steel', '#94a3b8');

    const totalW = cols * (pW + 0.04);
    const totalL = rows * (pL + 0.04);
    const startX = x - totalW * 0.5 + pW * 0.5;
    const startZ = z - totalL * 0.5 + pL * 0.5;

    // Pitch angle: in Arscity, North is -Z. To tilt upwards towards North, panel slope drops towards South (+Z)
    const rotX = faceNorth ? -tilt : tilt;

    // 1. Aluminum Unistrut Mounting Rack Rails
    const railHeightFront = 0.15;
    const railHeightRear = railHeightFront + pL * Math.sin(tilt);

    for (let c = 0; c < cols; c++) {
      const cx = startX + c * (pW + 0.04);
      // Front & rear leg posts
      this.addBox(group, 0.04, railHeightFront, 0.04, cx, y + railHeightFront * 0.5, z + totalL * 0.45, frameMat);
      this.addBox(group, 0.04, railHeightRear, 0.04, cx, y + railHeightRear * 0.5, z - totalL * 0.45, frameMat);
    }

    // 2. Solar Modules
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = startX + c * (pW + 0.04);
        const pz = startZ + r * (pL + 0.04);
        const py = y + railHeightFront + (rows - 1 - r) * (pL * Math.sin(tilt) / rows) + 0.08;

        // Anodized aluminum frame border
        this.addBox(group, pW, 0.04, pL, px, py, pz, frameMat, rotX, 0, 0);
        // Active silicon PV wafer top plane
        this.addBox(group, pW - 0.05, 0.02, pL - 0.05, px, py + 0.02, pz, solarMat, rotX, 0, 0);
      }
    }
  }

  // =========================================================================
  // 3. UNIT HVAC / CHILLER KOMERSIAL (Packaged Commercial Rooftop Chiller)
  // =========================================================================
  public static buildHvacChillerUnit(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    options: {
      width?: number;
      height?: number;
      length?: number;
      dualFan?: boolean;
    } = {}
  ): void {
    const w = options.width || 1.8;
    const h = options.height || 1.15;
    const l = options.length || 1.35;
    const dualFan = options.dualFan ?? (w >= 2.0);

    const cabinetMat = this.getMaterial('hvac_chiller', '#64748b');
    const darkMetal = this.getMaterial('dark_metal', '#1e293b');
    const steelMat = this.getMaterial('galvanized_steel', '#94a3b8');

    // 1. Neoprene / Spring Vibration Damping Mounting Rails (Paduan bantalan getaran)
    const padH = 0.10;
    this.addBox(group, w * 0.95, padH, 0.12, x, y + padH * 0.5, z - l * 0.38, darkMetal);
    this.addBox(group, w * 0.95, padH, 0.12, x, y + padH * 0.5, z + l * 0.38, darkMetal);

    const cabinetBaseY = y + padH;

    // 2. Heavy-gauge sheet metal enclosure
    this.addBox(group, w, h, l, x, cabinetBaseY + h * 0.5, z, cabinetMat);

    // 3. Side Intake Louver Recesses
    this.addBox(group, w * 0.88, h * 0.65, 0.04, x, cabinetBaseY + h * 0.5, z + l * 0.505, darkMetal);
    this.addBox(group, w * 0.88, h * 0.65, 0.04, x, cabinetBaseY + h * 0.5, z - l * 0.505, darkMetal);

    // 4. Circular Top Discharge Fan Cowls with Mesh Grilles
    const fanRadius = 0.38;
    const fanH = 0.14;
    const topY = cabinetBaseY + h;

    if (dualFan) {
      const fanSpacing = w * 0.28;
      // Left Fan
      this.addCylinder(group, fanRadius, fanRadius * 1.05, fanH, 16, x - fanSpacing, topY + fanH * 0.5, z, darkMetal);
      this.addCylinder(group, fanRadius * 0.88, fanRadius * 0.88, 0.02, 16, x - fanSpacing, topY + fanH + 0.01, z, steelMat);
      // Right Fan
      this.addCylinder(group, fanRadius, fanRadius * 1.05, fanH, 16, x + fanSpacing, topY + fanH * 0.5, z, darkMetal);
      this.addCylinder(group, fanRadius * 0.88, fanRadius * 0.88, 0.02, 16, x + fanSpacing, topY + fanH + 0.01, z, steelMat);
    } else {
      // Single Center Fan
      this.addCylinder(group, fanRadius * 1.15, fanRadius * 1.20, fanH, 16, x, topY + fanH * 0.5, z, darkMetal);
      this.addCylinder(group, fanRadius * 1.02, fanRadius * 1.02, 0.02, 16, x, topY + fanH + 0.01, z, steelMat);
    }

    // 5. Electrical Disconnect Switch Box on side
    this.addBox(group, 0.08, 0.28, 0.22, x + w * 0.505, cabinetBaseY + h * 0.6, z - l * 0.2, steelMat);
  }

  // =========================================================================
  // 4. VENTILATOR TURBIN & MUSHROOM EXHAUST (Indonesian Wind Cyclone Ventilator)
  // =========================================================================
  public static buildTurbineVentilator(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    options: { count?: number; spacing?: number } = {}
  ): void {
    const count = options.count || 1;
    const spacing = options.spacing || 1.1;
    const steelMat = this.getMaterial('galvanized_steel', '#cbd5e1');
    const darkMetal = this.getMaterial('dark_metal', '#475569');

    const startX = x - ((count - 1) * spacing) * 0.5;

    for (let i = 0; i < count; i++) {
      const vx = startX + i * spacing;

      // Square flashing roof deck curb
      this.addBox(group, 0.55, 0.12, 0.55, vx, y + 0.06, z, darkMetal);
      // Cylindrical collar throat
      this.addCylinder(group, 0.22, 0.24, 0.28, 12, vx, y + 0.12 + 0.14, z, steelMat);
      // Aerodynamic spherical ribbed turbine rotor head
      this.addCylinder(group, 0.35, 0.24, 0.38, 16, vx, y + 0.12 + 0.28 + 0.19, z, steelMat);
      // Dome finial apex
      this.addCylinder(group, 0.05, 0.26, 0.10, 12, vx, y + 0.12 + 0.28 + 0.38 + 0.05, z, steelMat);
    }
  }

  public static buildMushroomExhaustCap(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    radius: number = 0.22,
    height: number = 0.65
  ): void {
    const darkMetal = this.getMaterial('dark_metal', '#334155');
    const collarMat = this.getMaterial('concrete_board', '#64748b');

    // Square flashing collar
    this.addBox(group, radius * 2.8, 0.08, radius * 2.8, x, y + 0.04, z, collarMat);
    // Vertical duct stack
    this.addCylinder(group, radius, radius, height, 12, x, y + 0.08 + height * 0.5, z, darkMetal);
    // Overhanging mushroom umbrella hood cap
    const capR = radius * 1.8;
    const capH = 0.16;
    this.addCylinder(group, 0.08, capR, capH, 12, x, y + 0.08 + height + capH * 0.5, z, darkMetal);
  }

  // =========================================================================
  // 5. SKYLIGHT ATAP (Architectural Glazed Rooftop Skylight)
  // =========================================================================
  public static buildRooftopSkylight(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    options: {
      width?: number;
      length?: number;
      curbHeight?: number;
    } = {}
  ): void {
    const w = options.width || 1.8;
    const l = options.length || 2.4;
    const curbH = options.curbHeight || 0.32;

    const concreteMat = this.getMaterial('concrete_board', '#94a3b8');
    const frameMat = this.getMaterial('frame', '#1e293b');
    const glassMat = this.getMaterial('glass');

    // 1. Waterproof Concrete Upstand Curb (Mencegah air tergenang masuk)
    const curbThick = 0.14;
    // Front & back curb
    this.addBox(group, w, curbH, curbThick, x, y + curbH * 0.5, z - l * 0.5 + curbThick * 0.5, concreteMat);
    this.addBox(group, w, curbH, curbThick, x, y + curbH * 0.5, z + l * 0.5 - curbThick * 0.5, concreteMat);
    // Left & right curb
    this.addBox(group, curbThick, curbH, l - curbThick * 2, x - w * 0.5 + curbThick * 0.5, y + curbH * 0.5, z, concreteMat);
    this.addBox(group, curbThick, curbH, l - curbThick * 2, x + w * 0.5 - curbThick * 0.5, y + curbH * 0.5, z, concreteMat);

    // 2. Extruded Aluminum Weather-seal Frame
    this.addBox(group, w + 0.06, 0.06, l + 0.06, x, y + curbH + 0.03, z, frameMat);

    // 3. Inclined Safety Glazing Pane (Slight pitch ~6° to shed rainwater)
    const glassPitch = 0.10 * (Math.PI / 180);
    this.addBox(group, w - 0.12, 0.03, l - 0.12, x, y + curbH + 0.07, z, glassMat, glassPitch, 0, 0);
  }

  // =========================================================================
  // 6. PINTU MONYET / MAINTENANCE ROOF ACCESS HATCH
  // =========================================================================
  public static buildRoofMaintenanceHatch(
    group: THREE.Group,
    x: number,
    y: number,
    z: number
  ): void {
    const w = 0.90;
    const l = 0.90;
    const coamingH = 0.35;

    const frameMat = this.getMaterial('dark_metal', '#1e293b');
    const steelMat = this.getMaterial('galvanized_steel', '#94a3b8');

    // 1. Raised waterproof coaming
    const coamingThick = 0.08;
    this.addBox(group, w, coamingH, coamingThick, x, y + coamingH * 0.5, z - l * 0.5 + coamingThick * 0.5, frameMat);
    this.addBox(group, w, coamingH, coamingThick, x, y + coamingH * 0.5, z + l * 0.5 - coamingThick * 0.5, frameMat);
    this.addBox(group, coamingThick, coamingH, l - coamingThick * 2, x - w * 0.5 + coamingThick * 0.5, y + coamingH * 0.5, z, frameMat);
    this.addBox(group, coamingThick, coamingH, l - coamingThick * 2, x + w * 0.5 - coamingThick * 0.5, y + coamingH * 0.5, z, frameMat);

    // 2. Hinged insulated steel cover lid with drip edge lip
    this.addBox(group, w + 0.08, 0.06, l + 0.08, x, y + coamingH + 0.03, z, frameMat);
    // Safety grab handle
    this.addBox(group, 0.22, 0.04, 0.04, x, y + coamingH + 0.08, z + 0.25, steelMat);

    // 3. Safety grab rail posts around hatch
    const railH = 0.90;
    const railR = 0.03;
    this.addBox(group, railR, railH, railR, x - w * 0.6, y + railH * 0.5, z - l * 0.6, steelMat);
    this.addBox(group, railR, railH, railR, x + w * 0.6, y + railH * 0.5, z - l * 0.6, steelMat);
    this.addBox(group, railR, railH, railR, x - w * 0.6, y + railH * 0.5, z + l * 0.6, steelMat);
    // Connecting safety top rail
    this.addBox(group, w * 1.2, railR, railR, x, y + railH, z - l * 0.6, steelMat);
    this.addBox(group, railR, railR, l * 1.2, x - w * 0.6, y + railH, z, steelMat);
  }

  // =========================================================================
  // 7. PEMANAS AIR TENAGA SURYA (Indonesian Residential Solar Water Heater)
  // =========================================================================
  public static buildSolarWaterHeater(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    tubesCount: number = 12
  ): void {
    const steelMat = this.getMaterial('galvanized_steel', '#cbd5e1');
    const darkMetal = this.getMaterial('dark_metal', '#1e293b');
    const solarMat = this.getMaterial('solar_panel', '#0f172a');
    const stainlessMat = this.getMaterial('toren_stainless', '#e2e8f0');

    const tilt = 18 * (Math.PI / 180);
    const collectorW = 1.35;
    const collectorL = 1.55;

    // 1. Triangular Stand Frame
    const legH = 0.55;
    this.addBox(group, 0.04, legH, 0.04, x - collectorW * 0.45, y + legH * 0.5, z - collectorL * 0.4, steelMat);
    this.addBox(group, 0.04, legH, 0.04, x + collectorW * 0.45, y + legH * 0.5, z - collectorL * 0.4, steelMat);

    // 2. Horizontal Insulated Storage Cylinder Tank on top
    const tankRadius = 0.24;
    const tankLen = collectorW + 0.15;
    const tankY = y + legH + tankRadius + 0.05;
    const tankZ = z - collectorL * 0.4;
    // Rotated along X axis to lie horizontal
    this.addCylinder(group, tankRadius, tankRadius, tankLen, 16, x, tankY, tankZ, stainlessMat, 0, 0, Math.PI * 0.5);

    // 3. Inclined Solar Collector Panel / Evacuated Vacuum Tubes facing North (-Z)
    const panelY = y + legH * 0.5 + 0.10;
    const panelZ = z + 0.20;
    this.addBox(group, collectorW, 0.06, collectorL, x, panelY, panelZ, darkMetal, -tilt, 0, 0);
    this.addBox(group, collectorW - 0.08, 0.02, collectorL - 0.08, x, panelY + 0.035, panelZ, solarMat, -tilt, 0, 0);
  }

  // =========================================================================
  // 8. ANTENA & PARABOLA TELEKOMUNIKASI (Telecom Antenna & Satellite Dish)
  // =========================================================================
  public static buildTelecomAntennaDish(
    group: THREE.Group,
    x: number,
    y: number,
    z: number,
    type: 'parabola' | 'mast' = 'parabola'
  ): void {
    const steelMat = this.getMaterial('galvanized_steel', '#94a3b8');
    const darkMetal = this.getMaterial('dark_metal', '#334155');

    // Base mounting tripod plate
    this.addBox(group, 0.45, 0.04, 0.45, x, y + 0.02, z, darkMetal);

    if (type === 'parabola') {
      // Mast post
      const mastH = 1.25;
      this.addCylinder(group, 0.03, 0.03, mastH, 8, x, y + mastH * 0.5, z, steelMat);

      // Angled satellite dish reflector
      const dishR = 0.42;
      const dishY = y + mastH;
      const dishTilt = 38 * (Math.PI / 180);
      this.addCylinder(group, dishR, dishR * 0.2, 0.08, 16, x, dishY, z, steelMat, dishTilt, 0, 0);
      // LNB Feed horn arm
      this.addBox(group, 0.02, 0.02, 0.35, x, dishY + 0.12, z + 0.16, darkMetal, dishTilt * 0.5, 0, 0);
    } else {
      // Tall Communication Mast with Guy Struts
      const mastH = 3.6;
      this.addCylinder(group, 0.04, 0.04, mastH, 8, x, y + mastH * 0.5, z, steelMat);
      // Omni cross element at peak
      this.addBox(group, 0.65, 0.02, 0.02, x, y + mastH, z, steelMat);
      this.addBox(group, 0.02, 0.02, 0.65, x, y + mastH, z, steelMat);
    }
  }

  // =========================================================================
  // 9. ATAP DATAR DETIL & PARAPET (Detailed Flat Roof with Coping & Scuppers)
  // =========================================================================
  public static buildDetailedFlatRoof(
    group: THREE.Group,
    rw: number,
    rl: number,
    baseY: number,
    options: {
      parapetHeight?: number;
      parapetThickness?: number;
      deckSurface?: 'gravel' | 'membrane' | 'green_roof' | 'concrete';
      wallMat?: THREE.Material;
      copingMat?: THREE.Material;
      hasScuppers?: boolean;
    } = {}
  ): void {
    const parapetH = options.parapetHeight ?? 0.75;
    const parapetThick = options.parapetThickness ?? 0.16;
    const deckSurface = options.deckSurface || 'gravel';
    const hasScuppers = options.hasScuppers ?? true;

    const wallMat = options.wallMat || this.getMaterial('concrete_board', '#94a3b8');
    const copingMat = options.copingMat || this.getMaterial('frame', '#334155');
    const concreteMat = this.getMaterial('concrete', '#94a3b8');

    let deckMat: THREE.Material;
    if (deckSurface === 'gravel') {
      deckMat = this.getMaterial('kerikil_atap');
    } else if (deckSurface === 'membrane') {
      deckMat = this.getMaterial('membran_atap');
    } else if (deckSurface === 'green_roof') {
      deckMat = this.getMaterial('green_roof');
    } else {
      deckMat = concreteMat;
    }

    // 1. Structural Concrete Slab Base (Plat dak beton)
    const slabThick = 0.22;
    this.addBox(group, rw, slabThick, rl, 0, baseY + slabThick * 0.5, 0, concreteMat);

    // 2. Waterproof Recessed Deck Layer (Permukaan kerikil / membran / taman atap)
    const deckThick = 0.04;
    const innerW = rw - parapetThick * 2;
    const innerL = rl - parapetThick * 2;
    this.addBox(group, innerW, deckThick, innerL, 0, baseY + slabThick + deckThick * 0.5, 0, deckMat);

    // 3. Perimeter Parapet Wall (Dinding parapet keliling)
    const wallY = baseY + slabThick + parapetH * 0.5;
    // Front & Back Parapets
    this.addBox(group, rw, parapetH, parapetThick, 0, wallY, rl * 0.5 - parapetThick * 0.5, wallMat);
    this.addBox(group, rw, parapetH, parapetThick, 0, wallY, -rl * 0.5 + parapetThick * 0.5, wallMat);
    // Left & Right Parapets
    const sideParapetL = rl - parapetThick * 2;
    this.addBox(group, parapetThick, parapetH, sideParapetL, rw * 0.5 - parapetThick * 0.5, wallY, 0, wallMat);
    this.addBox(group, parapetThick, parapetH, sideParapetL, -rw * 0.5 + parapetThick * 0.5, wallY, 0, wallMat);

    // 4. Coping Stone / Metal Flashing Capstone with 0.05m drip edge overhang
    const copingH = 0.08;
    const copingOverhang = 0.05;
    const copingThick = parapetThick + copingOverhang * 2;
    const copingY = baseY + slabThick + parapetH + copingH * 0.5;

    this.addBox(group, rw + copingOverhang * 2, copingH, copingThick, 0, copingY, rl * 0.5 - parapetThick * 0.5, copingMat);
    this.addBox(group, rw + copingOverhang * 2, copingH, copingThick, 0, copingY, -rl * 0.5 + parapetThick * 0.5, copingMat);
    this.addBox(group, copingThick, copingH, sideParapetL, rw * 0.5 - parapetThick * 0.5, copingY, 0, copingMat);
    this.addBox(group, copingThick, copingH, sideParapetL, -rw * 0.5 + parapetThick * 0.5, copingY, 0, copingMat);

    // 5. Drainage Scupper Outlets & Rainwater Collection Box
    if (hasScuppers) {
      const darkMetal = this.getMaterial('dark_metal', '#1e293b');
      const scupperY = baseY + slabThick + 0.12;
      // Scupper openings on corner parapets
      const scupperX = rw * 0.5 - parapetThick * 0.5;
      const scupperZ = rl * 0.5 - 0.45;
      // Collector hopper box on outside
      this.addBox(group, 0.22, 0.28, 0.22, scupperX + parapetThick * 0.5 + 0.11, scupperY, scupperZ, darkMetal);
    }
  }

  // =========================================================================
  // 10. DETERMINISTIC EQUIPMENT SCATTER ENGINE
  // =========================================================================
  public static scatterRooftopEquipment(
    group: THREE.Group,
    building: BuildingInstance,
    roofW: number,
    roofL: number,
    roofY: number,
    roofType: string = 'flat'
  ): void {
    // Deterministic pseudo-random seed per building
    const seed = Math.abs(
      building.id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0) ^
        Math.floor(building.position.x * 73 + building.position.z * 37)
    );

    const rand = (offset: number) => {
      const s = (seed + offset * 1337) % 2147483647;
      return (s & 0xffff) / 65536;
    };

    const isCommercial =
      building.category === 'commercial' ||
      building.presetKey?.includes('ruko') ||
      building.presetKey?.includes('minimarket') ||
      building.presetKey?.includes('office') ||
      building.presetKey?.includes('retail') ||
      building.presetKey?.includes('cafe') ||
      building.presetKey?.includes('resto');

    const isHighRise =
      (building.floorCount || 1) >= 4 ||
      building.presetKey?.includes('tower') ||
      building.presetKey?.includes('skyscraper') ||
      building.presetKey?.includes('apartment') ||
      building.presetKey?.includes('hotel');

    const isResidential =
      building.category === 'residential' ||
      building.presetKey?.includes('house') ||
      building.presetKey?.includes('villa');

    // Usable roof boundary (safely inset from perimeter edges)
    const margin = 1.2;
    const usableW = Math.max(1.0, roofW - margin * 2);
    const usableL = Math.max(1.0, roofL - margin * 2);

    // =======================================================================
    // A. RESIDENTIAL BUILDINGS (House 36, House 54, 2-Story Villa)
    // =======================================================================
    if (isResidential) {
      // 1. Toren Air: signature Indonesian orange or blue on stand
      const torenColor = rand(1) > 0.4 ? 'orange' : rand(1) > 0.15 ? 'blue' : 'stainless';
      const torenX = (rand(2) - 0.5) * usableW * 0.6;
      const torenZ = -usableL * 0.28;
      this.buildWaterTankToren(group, torenX, roofY, torenZ, {
        capacity: rand(3) > 0.5 ? '1000L' : '500L',
        material: torenColor,
        hasStand: true,
        standHeight: 1.1,
      });

      // 2. Solar Water Heater or Solar PV panel facing True North (-Z)
      if (rand(4) > 0.45) {
        const heaterX = -usableW * 0.22;
        const heaterZ = usableL * 0.15;
        this.buildSolarWaterHeater(group, heaterX, roofY, heaterZ, 10);
      } else {
        const pvX = -usableW * 0.20;
        const pvZ = usableL * 0.10;
        this.buildSolarPanelArray(group, pvX, roofY, pvZ, {
          rows: 1,
          cols: 2,
          tiltDeg: 12,
          faceNorth: true,
        });
      }

      // 3. Turbine Ventilator or Mushroom Cap
      const ventX = usableW * 0.25;
      const ventZ = usableL * 0.20;
      if (rand(5) > 0.5) {
        this.buildTurbineVentilator(group, ventX, roofY, ventZ, { count: 1 });
      } else {
        this.buildMushroomExhaustCap(group, ventX, roofY, ventZ);
      }

      // 4. Parabolic TV Antenna
      if (rand(6) > 0.6) {
        const antX = usableW * 0.35;
        const antZ = -usableL * 0.35;
        this.buildTelecomAntennaDish(group, antX, roofY, antZ, 'parabola');
      }
      return;
    }

    // =======================================================================
    // B. COMMERCIAL SHOPHOUSE (Ruko 3fl) & RETAIL (Minimarket)
    // =======================================================================
    if (isCommercial && !isHighRise) {
      // 1. Dual Toren Air (Stainless steel or Orange 1000L/2000L)
      const torenColor = rand(10) > 0.5 ? 'stainless' : 'orange';
      const torenX = -usableW * 0.25;
      const torenZ = -usableL * 0.30;
      this.buildWaterTankToren(group, torenX, roofY, torenZ, {
        capacity: '1000L',
        material: torenColor,
        hasStand: true,
        standHeight: 1.2,
      });

      // 2. Commercial HVAC Condenser / Chiller Unit
      const hvacX = usableW * 0.22;
      const hvacZ = -usableL * 0.15;
      this.buildHvacChillerUnit(group, hvacX, roofY, hvacZ, {
        width: 1.8,
        height: 1.1,
        length: 1.3,
        dualFan: false,
      });

      // 3. Maintenance Access Roof Hatch with Safety Guardrail
      const hatchX = -usableW * 0.15;
      const hatchZ = usableL * 0.25;
      this.buildRoofMaintenanceHatch(group, hatchX, roofY, hatchZ);

      // 4. Array of Turbine Cyclone Ventilators
      const ventX = usableW * 0.20;
      const ventZ = usableL * 0.25;
      this.buildTurbineVentilator(group, ventX, roofY, ventZ, { count: 2, spacing: 1.0 });

      // 5. Solar PV grid facing True North (-Z)
      if (rand(12) > 0.35) {
        const pvX = 0;
        const pvZ = -usableL * 0.05;
        this.buildSolarPanelArray(group, pvX, roofY, pvZ, {
          rows: 1,
          cols: 3,
          tiltDeg: 12,
          faceNorth: true,
        });
      }
      return;
    }

    // =======================================================================
    // C. HIGH-RISE BUILDINGS (Office Tower, Apartment, Skyscraper)
    // =======================================================================
    if (isHighRise) {
      // 1. Major Commercial Packaged HVAC Chillers on Vibration Dampers
      const chiller1X = -usableW * 0.25;
      const chiller1Z = -usableL * 0.22;
      this.buildHvacChillerUnit(group, chiller1X, roofY, chiller1Z, {
        width: 2.5,
        height: 1.4,
        length: 1.6,
        dualFan: true,
      });

      const chiller2X = -usableW * 0.25;
      const chiller2Z = usableL * 0.12;
      this.buildHvacChillerUnit(group, chiller2X, roofY, chiller2Z, {
        width: 2.2,
        height: 1.3,
        length: 1.5,
        dualFan: true,
      });

      // 2. Large Industrial Stainless Steel Water Reservoirs
      const torenX = usableW * 0.28;
      const torenZ = -usableL * 0.28;
      this.buildWaterTankToren(group, torenX, roofY, torenZ, {
        capacity: '2000L',
        material: 'stainless',
        hasStand: true,
        standHeight: 1.4,
      });

      // 3. Solar PV Power Grid facing True North (-Z)
      const pvX = usableW * 0.15;
      const pvZ = usableL * 0.15;
      this.buildSolarPanelArray(group, pvX, roofY, pvZ, {
        rows: 2,
        cols: 4,
        tiltDeg: 12,
        faceNorth: true,
      });

      // 4. Roof Access Maintenance Hatch
      const hatchX = 0;
      const hatchZ = usableL * 0.32;
      this.buildRoofMaintenanceHatch(group, hatchX, roofY, hatchZ);

      // 5. Tall Telecom Antenna Mast
      const mastX = -usableW * 0.38;
      const mastZ = -usableL * 0.38;
      this.buildTelecomAntennaDish(group, mastX, roofY, mastZ, 'mast');

      // 6. Rooftop Turbine Ventilator Cluster
      const ventX = 0;
      const ventZ = -usableL * 0.20;
      this.buildTurbineVentilator(group, ventX, roofY, ventZ, { count: 3, spacing: 1.1 });
      return;
    }

    // =======================================================================
    // D. PUBLIC & CIVIC BUILDINGS (School, Puskesmas, Community Hall)
    // =======================================================================
    // 1. Clean Eco Solar PV Array
    const pvX = -usableW * 0.15;
    const pvZ = 0;
    this.buildSolarPanelArray(group, pvX, roofY, pvZ, {
      rows: 2,
      cols: 3,
      tiltDeg: 12,
      faceNorth: true,
    });

    // 2. Toren Air
    const torenX = usableW * 0.30;
    const torenZ = -usableL * 0.25;
    this.buildWaterTankToren(group, torenX, roofY, torenZ, {
      capacity: '1000L',
      material: 'blue',
      hasStand: true,
      standHeight: 1.2,
    });

    // 3. Natural Daylight Skylight
    const skyX = usableW * 0.15;
    const skyZ = usableL * 0.20;
    this.buildRooftopSkylight(group, skyX, roofY, skyZ, {
      width: Math.min(2.0, usableW * 0.4),
      length: Math.min(2.8, usableL * 0.4),
    });

    // 4. Turbine Ventilators
    const ventX = -usableW * 0.25;
    const ventZ = usableL * 0.28;
    this.buildTurbineVentilator(group, ventX, roofY, ventZ, { count: 2, spacing: 1.2 });
  }
}

