import * as THREE from 'three';
import { MaterialLibrary } from '../materials/MaterialLibrary';

/**
 * TectonicComponents.ts
 *
 * 100% Procedural High-End Architectural Components Generator for Arscity.
 * Pure procedural Three.js BufferGeometry without external models.
 *
 * Provides:
 * - 3D Mullion Curtain Walls (black aluminum frames with inset glass)
 * - Tropical Timber Louver Screens (sun shading secondary skins)
 * - Perforated Roster Walls (hollow breeze block screens)
 * - Cantilevered Canopies with Warm Wood Soffits & LED Strips
 * - Glass Balconies with Lush Hanging Sky-Planters
 * - Space-Frame Atrium Skylight Vaults
 * - Monolithic Architectural Signage Totems & Dynamic Facade Fins
 * - Complete Permanent Interior Furniture Sets per Archetype
 */
export class TectonicComponents {
  private static matLib = MaterialLibrary.getInstance();

  public static getMaterial(type: string, color?: string): THREE.Material {
    if (type === 'warm_led' || type === 'warm_light') {
      return new THREE.MeshBasicMaterial({ color: 0xfff1dc });
    }
    if (type === 'brand_gold') {
      return new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.25,
        metalness: 0.85
      });
    }
    if (type === 'brand_red') {
      return new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.35,
        metalness: 0.1
      });
    }
    if (type === 'dark_aluminum') {
      return new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.35,
        metalness: 0.85
      });
    }
    if (type === 'teak_wood') {
      return this.matLib.getMaterial('wood_slat', { color: '#9a3412' });
    }
    return this.matLib.getMaterial(type, { color });
  }

  /**
   * 1. 3D Mullion Curtain Wall
   * Articulated black aluminum frame grid with recessed ultra-transparent glass.
   */
  public static buildMullionCurtainWall(
    width: number,
    height: number,
    cols: number = 4,
    rows: number = 3,
    frameDepth: number = 0.14,
    frameMat?: THREE.Material,
    glassMat?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const frame = frameMat || this.getMaterial('dark_aluminum');
    const glass = glassMat || this.getMaterial('glass');

    const mullionWidth = 0.08;
    const colW = width / cols;
    const rowH = height / rows;

    // Vertical Mullions
    for (let c = 0; c <= cols; c++) {
      const x = -width * 0.5 + c * colW;
      const geom = new THREE.BoxGeometry(mullionWidth, height, frameDepth);
      const mesh = new THREE.Mesh(geom, frame);
      mesh.position.set(x, height * 0.5, 0);
      mesh.castShadow = true;
      group.add(mesh);
    }

    // Horizontal Transoms
    for (let r = 0; r <= rows; r++) {
      const y = r * rowH;
      const geom = new THREE.BoxGeometry(width, mullionWidth, frameDepth * 0.85);
      const mesh = new THREE.Mesh(geom, frame);
      mesh.position.set(0, y, 0);
      mesh.castShadow = true;
      group.add(mesh);
    }

    // Glass Panes
    const glassGeom = new THREE.BoxGeometry(
      Math.max(0.1, width - mullionWidth),
      Math.max(0.1, height - mullionWidth),
      0.02
    );
    const glassMesh = new THREE.Mesh(glassGeom, glass);
    glassMesh.position.set(0, height * 0.5, 0);
    group.add(glassMesh);

    return group;
  }

  /**
   * 2. Tropical Timber Louver Screen (Secondary Skin)
   * Angled teak timber fins blocking harsh equatorial solar heat while allowing airflow.
   */
  public static buildTimberLouverScreen(
    width: number,
    height: number,
    finCount: number = 12,
    angle: number = Math.PI / 6,
    isVertical: boolean = true,
    woodMat?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = woodMat || this.getMaterial('teak_wood');
    const frame = this.getMaterial('dark_aluminum');

    const finThickness = 0.04;
    const finDepth = 0.22;

    // Perimeter sub-frame
    const subFrameT = 0.05;
    const fTop = new THREE.Mesh(new THREE.BoxGeometry(width, subFrameT, finDepth), frame);
    fTop.position.set(0, height, 0);
    group.add(fTop);
    const fBot = new THREE.Mesh(new THREE.BoxGeometry(width, subFrameT, finDepth), frame);
    fBot.position.set(0, 0, 0);
    group.add(fBot);

    if (isVertical) {
      const spacing = width / Math.max(1, finCount);
      for (let i = 0; i < finCount; i++) {
        const x = -width * 0.5 + (i + 0.5) * spacing;
        const finGeo = new THREE.BoxGeometry(finThickness, height - subFrameT * 2, finDepth);
        const finMesh = new THREE.Mesh(finGeo, mat);
        finMesh.position.set(x, height * 0.5, 0);
        finMesh.rotation.y = angle;
        finMesh.castShadow = true;
        group.add(finMesh);
      }
    } else {
      const spacing = height / Math.max(1, finCount);
      for (let i = 0; i < finCount; i++) {
        const y = (i + 0.5) * spacing;
        const finGeo = new THREE.BoxGeometry(width - subFrameT * 2, finThickness, finDepth);
        const finMesh = new THREE.Mesh(finGeo, mat);
        finMesh.position.set(0, y, 0);
        finMesh.rotation.x = angle;
        finMesh.castShadow = true;
        group.add(finMesh);
      }
    }

    return group;
  }

  /**
   * 3. Perforated Roster Wall (Indonesian Breeze Block)
   * Authentic geometric breezeblock screen with real pierced apertures for light & breeze.
   */
  public static buildPerforatedRosterWall(
    width: number,
    height: number,
    rosterMat?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const mat = rosterMat || this.getMaterial('concrete', '#e2e8f0');

    const blockW = 0.5;
    const blockH = 0.5;
    const thickness = 0.25;
    const cols = Math.max(1, Math.floor(width / blockW));
    const rows = Math.max(1, Math.floor(height / blockH));
    const strutT = 0.06;

    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * blockH;
      // Horizontal rib
      const ribH = new THREE.Mesh(new THREE.BoxGeometry(width, strutT, thickness), mat);
      ribH.position.set(0, r * blockH, 0);
      group.add(ribH);

      for (let c = 0; c < cols; c++) {
        const x = -width * 0.5 + (c + 0.5) * blockW;
        // Vertical rib
        const ribV = new THREE.Mesh(new THREE.BoxGeometry(strutT, blockH, thickness), mat);
        ribV.position.set(x - blockW * 0.5, y, 0);
        group.add(ribV);

        // Center cross / diamond motif
        const diamond = new THREE.Mesh(new THREE.BoxGeometry(blockW * 0.35, blockH * 0.35, thickness * 0.7), mat);
        diamond.position.set(x, y, 0);
        diamond.rotation.z = Math.PI * 0.25;
        diamond.castShadow = true;
        group.add(diamond);
      }
    }

    return group;
  }

  /**
   * 4. Cantilever Canopy with Warm Wood Soffit & Strip LED Lighting
   * Sleek floating canopy without posts, lined with rich teak soffit and warm glowing LED.
   */
  public static buildCantileverCanopyWithSoffit(
    width: number,
    depth: number,
    thickness: number = 0.22,
    frameMat?: THREE.Material,
    woodMat?: THREE.Material,
    ledMat?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const frame = frameMat || this.getMaterial('dark_aluminum');
    const wood = woodMat || this.getMaterial('teak_wood');
    const led = ledMat || this.getMaterial('warm_led');

    // Structural steel / concrete top fascia
    const topFascia = new THREE.Mesh(new THREE.BoxGeometry(width, thickness, depth), frame);
    topFascia.position.set(0, thickness * 0.5, depth * 0.5);
    topFascia.castShadow = true;
    group.add(topFascia);

    // Warm Wood Underside Soffit (inset 2cm)
    const soffit = new THREE.Mesh(new THREE.BoxGeometry(width - 0.1, 0.03, depth - 0.1), wood);
    soffit.position.set(0, -0.015, depth * 0.5);
    group.add(soffit);

    // Perimeter Warm LED Light Strip
    const ledThickness = 0.02;
    const ledFront = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, ledThickness, 0.04), led);
    ledFront.position.set(0, -0.03, depth - 0.1);
    group.add(ledFront);

    const ledLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, ledThickness, depth - 0.2), led);
    ledLeft.position.set(-width * 0.5 + 0.1, -0.03, depth * 0.5);
    group.add(ledLeft);

    const ledRight = new THREE.Mesh(new THREE.BoxGeometry(0.04, ledThickness, depth - 0.2), led);
    ledRight.position.set(width * 0.5 - 0.1, -0.03, depth * 0.5);
    group.add(ledRight);

    return group;
  }

  /**
   * 5. Modern Glass Balcony with Hanging Planter Box
   * Tempered glass railing, black aluminum handrail, and lush cascading tropical planters.
   */
  public static buildGlassBalconyWithPlanter(
    width: number,
    depth: number,
    frameMat?: THREE.Material,
    glassMat?: THREE.Material,
    foliageMat?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const frame = frameMat || this.getMaterial('dark_aluminum');
    const glass = glassMat || this.getMaterial('glass');
    const concrete = this.getMaterial('concrete', '#94a3b8');
    const foliage = foliageMat || this.getMaterial('foliage');

    // Balcony cantilever floor slab (0.2m)
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width, 0.2, depth), concrete);
    slab.position.set(0, 0.1, depth * 0.5);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);

    const railH = 1.05;
    // Front Glass Railing Panel
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(width, railH, 0.02), glass);
    frontGlass.position.set(0, 0.2 + railH * 0.5, depth);
    group.add(frontGlass);

    // Front Black Handrail
    const frontRail = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, 0.06, 0.08), frame);
    frontRail.position.set(0, 0.2 + railH, depth);
    group.add(frontRail);

    // Side Glass Railings
    const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.02, railH, depth), glass);
    sideGlassL.position.set(-width * 0.5, 0.2 + railH * 0.5, depth * 0.5);
    group.add(sideGlassL);

    const sideGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.02, railH, depth), glass);
    sideGlassR.position.set(width * 0.5, 0.2 + railH * 0.5, depth * 0.5);
    group.add(sideGlassR);

    // Hanging Planter Box along front rim
    const planterW = width * 0.9;
    const planterH = 0.45;
    const planterD = 0.4;
    const planterMesh = new THREE.Mesh(new THREE.BoxGeometry(planterW, planterH, planterD), concrete);
    planterMesh.position.set(0, -planterH * 0.4, depth + planterD * 0.5);
    planterMesh.castShadow = true;
    group.add(planterMesh);

    // Cascading Lush Foliage (Tropical Ferns & Vines)
    const folMesh = new THREE.Mesh(new THREE.BoxGeometry(planterW + 0.1, 0.35, planterD + 0.15), foliage);
    folMesh.position.set(0, planterH * 0.1, depth + planterD * 0.5);
    folMesh.castShadow = true;
    group.add(folMesh);

    return group;
  }

  /**
   * 6. Atrium Skylight Space-Frame Vault
   * 3D triangular steel truss frame glazed with transparent skylight glass for Atriums & Roasteries.
   */
  public static buildAtriumSkylightVault(
    width: number,
    depth: number,
    height: number = 3.5,
    frameMat?: THREE.Material,
    glassMat?: THREE.Material
  ): THREE.Group {
    const group = new THREE.Group();
    const frame = frameMat || this.getMaterial('dark_aluminum');
    const glass = glassMat || this.getMaterial('glass');

    const ridgeY = height;
    const halfW = width * 0.5;
    const halfD = depth * 0.5;

    // Center Ridge Beam
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, depth), frame);
    ridgeBeam.position.set(0, ridgeY, 0);
    group.add(ridgeBeam);

    // Space-Frame Rafters
    const rafterCount = Math.max(3, Math.floor(depth / 3.0));
    for (let i = 0; i <= rafterCount; i++) {
      const z = -halfD + (i / rafterCount) * depth;

      // Left rafter slope
      const rafterLen = Math.hypot(halfW, ridgeY);
      const angle = Math.atan2(ridgeY, halfW);

      const rL = new THREE.Mesh(new THREE.BoxGeometry(rafterLen, 0.1, 0.1), frame);
      rL.position.set(-halfW * 0.5, ridgeY * 0.5, z);
      rL.rotation.z = -angle;
      group.add(rL);

      const rR = new THREE.Mesh(new THREE.BoxGeometry(rafterLen, 0.1, 0.1), frame);
      rR.position.set(halfW * 0.5, ridgeY * 0.5, z);
      rR.rotation.z = angle;
      group.add(rR);
    }

    // Glass Facets (Left and Right sloped planes)
    const facetLen = Math.hypot(halfW, ridgeY);
    const angle = Math.atan2(ridgeY, halfW);

    const gL = new THREE.Mesh(new THREE.BoxGeometry(facetLen, 0.02, depth - 0.1), glass);
    gL.position.set(-halfW * 0.5, ridgeY * 0.5, 0);
    gL.rotation.z = -angle;
    group.add(gL);

    const gR = new THREE.Mesh(new THREE.BoxGeometry(facetLen, 0.02, depth - 0.1), glass);
    gR.position.set(halfW * 0.5, ridgeY * 0.5, 0);
    gR.rotation.z = angle;
    group.add(gR);

    return group;
  }

  /**
   * 7. Modern Monolithic Signage Totem & Facade Fins
   */
  public static buildModernSignageTotem(
    name: string,
    width: number = 1.4,
    height: number = 5.5,
    baseMat?: THREE.Material | string,
    accentMat?: THREE.Material | string,
    emissiveMat?: THREE.Material | string
  ): THREE.Group {
    const group = new THREE.Group();
    const darkSlate = typeof baseMat === 'string'
      ? this.getMaterial('plaster', baseMat)
      : (baseMat || this.getMaterial('dark_aluminum'));
    const gold = typeof accentMat === 'string'
      ? this.getMaterial('plaster', accentMat)
      : (accentMat || this.getMaterial('brand_gold'));
    const led = typeof emissiveMat === 'string'
      ? this.getMaterial('plaster', emissiveMat)
      : (emissiveMat || this.getMaterial('warm_led'));

    // Concrete Pedestal base
    const baseH = 0.5;
    const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, baseH, 0.8), this.getMaterial('concrete', '#475569'));
    base.position.set(0, baseH * 0.5, 0);
    base.castShadow = true;
    group.add(base);

    // Monolithic Pylon Column
    const pylonH = height - baseH;
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(width, pylonH, 0.45), darkSlate);
    pylon.position.set(0, baseH + pylonH * 0.5, 0);
    pylon.castShadow = true;
    group.add(pylon);

    // Glowing Architectural Brand Slot
    const slot = new THREE.Mesh(new THREE.BoxGeometry(width * 0.75, pylonH * 0.45, 0.48), gold);
    slot.position.set(0, baseH + pylonH * 0.65, 0);
    group.add(slot);

    // Vertical LED Light Line
    const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, pylonH * 0.85, 0.49), led);
    ledStrip.position.set(-width * 0.35, baseH + pylonH * 0.5, 0);
    group.add(ledStrip);

    return group;
  }

  public static buildFacadeFin(
    height: number,
    depth: number = 0.6,
    thickness: number = 0.1,
    angle: number = Math.PI / 12,
    mat?: THREE.Material | string
  ): THREE.Mesh {
    const finMat = typeof mat === 'string'
      ? this.getMaterial('plaster', mat)
      : (mat || this.getMaterial('dark_aluminum'));
    const geom = new THREE.BoxGeometry(thickness, height, depth);
    const mesh = new THREE.Mesh(geom, finMat);
    mesh.rotation.y = angle;
    mesh.castShadow = true;
    return mesh;
  }

  /**
   * 8. Permanent Architectural Interior Furniture Set per Archetype
   * Built directly inside buildings with warm ceiling lights so walkthroughs and drone flights
   * are visually stunning and deeply immersive.
   */
  public static buildInteriorFurnitureSet(
    archetype: string,
    width: number,
    depth: number,
    floorHeight: number = 4.2
  ): THREE.Group {
    const group = new THREE.Group();
    const wood = this.getMaterial('teak_wood');
    const darkWood = this.getMaterial('wood_slat', '#451a03');
    const darkMetal = this.getMaterial('dark_aluminum');
    const fabricRed = this.getMaterial('brand_red');
    const fabricGray = this.getMaterial('plaster', '#cbd5e1');
    const warmLight = this.getMaterial('warm_light');
    const stainless = this.getMaterial('metal', '#94a3b8');
    const glass = this.getMaterial('glass');

    // Warm Emissive Ceiling Lighting Grid (Soft ambient warmth)
    const ceilingY = floorHeight - 0.12;
    const lightCols = Math.max(2, Math.floor(width / 5.0));
    const lightRows = Math.max(2, Math.floor(depth / 5.0));
    for (let c = 0; c < lightCols; c++) {
      const lx = -width * 0.4 + (c / Math.max(1, lightCols - 1)) * (width * 0.8);
      for (let r = 0; r < lightRows; r++) {
        const lz = -depth * 0.4 + (r / Math.max(1, lightRows - 1)) * (depth * 0.8);
        const lightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), warmLight);
        lightPanel.position.set(lx, ceilingY, lz);
        group.add(lightPanel);
      }
    }

    // A. RESTO MIE GACOAN: Double-volume industrial hall, long communal tables, open kitchen counter
    if (archetype === 'gacoan_industrial_hall' || archetype === 'resto_mie_gacoan') {
      // Long communal dining tables with bench seats
      const tableSpacing = 4.0;
      const rows = Math.max(2, Math.floor((depth * 0.6) / tableSpacing));
      for (let r = 0; r < rows; r++) {
        const tz = -depth * 0.25 + r * tableSpacing;

        // Left Communal Table (Solid Teak with Black Steel Frame)
        const tLeft = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.75, 1.1), wood);
        tLeft.position.set(-width * 0.25, 0.375, tz);
        tLeft.castShadow = true;
        group.add(tLeft);

        // Benches along table
        const bL1 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.45, 0.35), darkWood);
        bL1.position.set(-width * 0.25, 0.225, tz - 0.8);
        group.add(bL1);
        const bL2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.45, 0.35), darkWood);
        bL2.position.set(-width * 0.25, 0.225, tz + 0.8);
        group.add(bL2);

        // Right Communal Table
        const tRight = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.75, 1.1), wood);
        tRight.position.set(width * 0.25, 0.375, tz);
        tRight.castShadow = true;
        group.add(tRight);

        const bR1 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.45, 0.35), darkWood);
        bR1.position.set(width * 0.25, 0.225, tz - 0.8);
        group.add(bR1);
        const bR2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.45, 0.35), darkWood);
        bR2.position.set(width * 0.25, 0.225, tz + 0.8);
        group.add(bR2);
      }

      // Open Kitchen / Ordering Counter at rear
      const counterW = width * 0.75;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(counterW, 1.1, 1.2), stainless);
      counter.position.set(0, 0.55, -depth * 0.38);
      counter.castShadow = true;
      group.add(counter);

      // Order Display Screen Panels
      const menuBoard = new THREE.Mesh(new THREE.BoxGeometry(counterW * 0.8, 0.7, 0.08), darkMetal);
      menuBoard.position.set(0, 2.4, -depth * 0.38);
      group.add(menuBoard);
    }
    // B. BURGER SHOP DRIVE-THRU: Booth diner seating, ordering counter, drive-thru window
    else if (archetype === 'burger_drivethru' || archetype === 'resto_burger_drivethru') {
      // Red booth leather sofas along glass wall
      const boothCount = Math.max(2, Math.floor((depth * 0.7) / 3.2));
      for (let b = 0; b < boothCount; b++) {
        const bz = -depth * 0.3 + b * 3.2;

        // Sofa Seat 1
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.65), fabricRed);
        s1.position.set(-width * 0.32, 0.425, bz - 0.8);
        group.add(s1);

        // Diner Table
        const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.8), wood);
        tbl.position.set(-width * 0.32, 0.375, bz);
        group.add(tbl);

        // Sofa Seat 2
        const s2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.65), fabricRed);
        s2.position.set(-width * 0.32, 0.425, bz + 0.8);
        group.add(s2);
      }

      // Burger Ordering & Pick-up Counter
      const burgerCounter = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, 1.05, 1.0), stainless);
      burgerCounter.position.set(width * 0.18, 0.525, 0);
      burgerCounter.castShadow = true;
      group.add(burgerCounter);
    }
    // C. CAFES: Central barista coffee bar, espresso machine, pastry case, floating staircase
    else if (archetype.startsWith('cafe')) {
      // Central Barista Coffee Bar Island
      const barW = Math.min(width * 0.5, 4.8);
      const barD = 2.0;
      const barCounter = new THREE.Mesh(new THREE.BoxGeometry(barW, 1.05, barD), darkWood);
      barCounter.position.set(0, 0.525, 0);
      barCounter.castShadow = true;
      group.add(barCounter);

      // Espresso Machine (Stainless steel block)
      const espressoMachine = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), stainless);
      espressoMachine.position.set(-barW * 0.25, 1.3, 0);
      group.add(espressoMachine);

      // Glass Pastry Display Case
      const pastryCase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 0.6), glass);
      pastryCase.position.set(barW * 0.25, 1.275, 0);
      group.add(pastryCase);

      // Bar Stools along the front
      for (let s = -barW * 0.35; s <= barW * 0.35; s += 0.8) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.75, 16), darkMetal);
        stool.position.set(s, 0.375, barD * 0.5 + 0.45);
        group.add(stool);
      }

      // Cafe Round Seating Tables
      const roundTableCoords = [
        [-width * 0.35, -depth * 0.25],
        [-width * 0.35, depth * 0.25],
        [width * 0.35, -depth * 0.25],
        [width * 0.35, depth * 0.25]
      ];
      for (const [tx, tz] of roundTableCoords) {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.75, 16), wood);
        table.position.set(tx, 0.375, tz);
        group.add(table);

        // 3 Chairs per table
        for (let a = 0; a < 3; a++) {
          const ang = (a / 3) * Math.PI * 2;
          const chair = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), fabricGray);
          chair.position.set(tx + Math.cos(ang) * 0.8, 0.4, tz + Math.sin(ang) * 0.8);
          group.add(chair);
        }
      }
    }
    // D. MALL & ATRIUM: Multi-storey void atrium, cross escalators, retail islands
    else if (archetype.startsWith('mall') || archetype.includes('atrium')) {
      // Central Atrium Multi-Level Void Balcony Ring
      const ringW = width * 0.65;
      const ringD = depth * 0.65;

      // Crossing Escalator Structure
      const escLength = Math.hypot(ringD * 0.6, floorHeight);
      const escAngle = Math.atan2(floorHeight, ringD * 0.6);

      const esc1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, escLength), darkMetal);
      esc1.position.set(-ringW * 0.2, floorHeight * 0.5, 0);
      esc1.rotation.x = escAngle;
      group.add(esc1);

      const esc2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, escLength), darkMetal);
      esc2.position.set(ringW * 0.2, floorHeight * 0.5, 0);
      esc2.rotation.x = -escAngle;
      group.add(esc2);

      // Ground Floor Centerpiece: Circular Planter with Indoor Tree
      const planterRing = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.5, 24), this.getMaterial('concrete', '#475569'));
      planterRing.position.set(0, 0.25, 0);
      group.add(planterRing);

      const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 3.8, 12), wood);
      treeTrunk.position.set(0, 2.1, 0);
      group.add(treeTrunk);

      const treeCanopy = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10), this.getMaterial('foliage'));
      treeCanopy.position.set(0, 4.4, 0);
      group.add(treeCanopy);
    }
    // E. JOGLO & PENDOPO: Saka Guru timber columns with stone umpak pedestals
    else if (archetype.includes('joglo') || archetype.includes('pendopo')) {
      const spanX = Math.min(width * 0.35, 4.5);
      const spanZ = Math.min(depth * 0.35, 4.5);

      const sakaGuruCoords = [
        [-spanX, -spanZ],
        [spanX, -spanZ],
        [-spanX, spanZ],
        [spanX, spanZ]
      ];

      for (const [sx, sz] of sakaGuruCoords) {
        // Stone Umpak Pedestal
        const umpak = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.65), this.getMaterial('stone_plinth'));
        umpak.position.set(sx, 0.225, sz);
        umpak.castShadow = true;
        group.add(umpak);

        // Saka Guru Solid Teak Column (Polished dark wood)
        const colH = floorHeight + 1.2;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, colH, 16), darkWood);
        col.position.set(sx, 0.45 + colH * 0.5, sz);
        col.castShadow = true;
        group.add(col);
      }

      // Tumpangsari Tiered Ceiling Beams
      const tumpangW = spanX * 2 + 0.6;
      const tumpangD = spanZ * 2 + 0.6;
      for (let t = 0; t < 3; t++) {
        const factor = 1 - t * 0.18;
        const beamH = floorHeight + 0.8 + t * 0.35;
        const beam = new THREE.Mesh(new THREE.BoxGeometry(tumpangW * factor, 0.2, tumpangD * factor), wood);
        beam.position.set(0, beamH, 0);
        group.add(beam);
      }
    }
    // F. DEFAULT / RESIDENTIAL / KOS: Living Room, Bed, Desk, Wardrobe
    else {
      // Queen Bed
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.2), darkWood);
      bed.position.set(-width * 0.28, 0.275, -depth * 0.25);
      bed.castShadow = true;
      group.add(bed);

      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 2.1), fabricGray);
      mattress.position.set(-width * 0.28, 0.65, -depth * 0.25);
      group.add(mattress);

      // Study / Work Desk & Ergonomic Chair
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 0.7), wood);
      desk.position.set(width * 0.25, 0.375, -depth * 0.25);
      group.add(desk);

      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.85, 0.55), darkMetal);
      chair.position.set(width * 0.25, 0.425, -depth * 0.25 + 0.75);
      group.add(chair);

      // Living Sofa
      const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 0.9), fabricGray);
      sofa.position.set(0, 0.375, depth * 0.25);
      sofa.castShadow = true;
      group.add(sofa);
    }

    return group;
  }

  /**
   * 9. Procedural 2D/3D Illuminated Signage Texture Generator
   */
  public static createSignageTexture(
    mainText: string,
    subText?: string,
    bgColor: string = '#141416',
    textColor: string = '#fff5ea'
  ): THREE.CanvasTexture {
    if (typeof document === 'undefined') return new THREE.Texture() as any;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.Texture() as any;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 1024, 256);

    // Architectural border outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 1008, 240);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (subText) {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 74px Inter, sans-serif';
      ctx.fillText(mainText, 512, 105);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '600 30px "JetBrains Mono", monospace';
      ctx.fillText(subText, 512, 185);
    } else {
      ctx.fillStyle = textColor;
      ctx.font = 'bold 88px Inter, sans-serif';
      ctx.fillText(mainText, 512, 128);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * 10. 3D Architectural Illuminated Signage Box
   * Emits calibrated warm bloom under UnrealBloomPass.
   */
  public static buildIlluminatedSign(
    mainText: string,
    subText: string | undefined,
    width: number,
    height: number,
    depth: number = 0.12
  ): THREE.Group {
    const group = new THREE.Group();
    const signTex = this.createSignageTexture(mainText, subText);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: new THREE.Color(0xfffae0),
      emissiveMap: signTex,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.85
    });

    const boxGeom = new THREE.BoxGeometry(width, height, depth);
    const mesh = new THREE.Mesh(boxGeom, signMat);
    mesh.castShadow = true;
    group.add(mesh);
    return group;
  }

  /**
   * 11. Black Candi Stone Monument with Illuminated Embossed Letters
   * Front yard marker for Joglo Yogyakarta.
   */
  public static buildJogloMonument(): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = this.getMaterial('stone_plinth');

    // Stepped candi stone plinth
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.35, 1.2), stoneMat);
    base.position.set(0, 0.175, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const pylon = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 0.6), stoneMat);
    pylon.position.set(0, 0.35 + 0.7, 0);
    pylon.castShadow = true;
    group.add(pylon);

    // Glowing embossed signage
    const sign = this.buildIlluminatedSign('JOGLO YOGYAKARTA', 'HERITAGE • KEPATIHAN', 2.8, 1.0, 0.08);
    sign.position.set(0, 1.05, 0.34);
    group.add(sign);

    return group;
  }

  /**
   * 12. Wide 4-Step Polished Stone Stairs
   */
  public static buildStoneStairs(
    width: number,
    stepCount: number = 4,
    stepH: number = 0.10,
    stepD: number = 0.35
  ): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = this.getMaterial('stone_plinth');

    for (let s = 0; s < stepCount; s++) {
      const remainingSteps = stepCount - s;
      const d = remainingSteps * stepD;
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, stepH, d),
        stoneMat
      );
      stepMesh.position.set(0, (s + 0.5) * stepH, s * stepD * 0.5);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      group.add(stepMesh);
    }
    return group;
  }

  /**
   * 13. Pillar Warm Uplight Glow (2700K optical ring)
   */
  public static buildColumnUplightGlow(radius: number = 0.35): THREE.Mesh {
    const glowGeom = new THREE.CylinderGeometry(radius, radius * 1.15, 0.06, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffb347, // 2700K warm uplight glow
      transparent: true,
      opacity: 0.95
    });
    return new THREE.Mesh(glowGeom, glowMat);
  }

  /**
   * 14. External Semi-Open Black Steel Staircase to 2nd Floor Balcony
   * Complete with steel stringers, treads, landings, glass railing, and black handrail.
   */
  public static buildExternalSteelStaircase(
    height: number,
    width: number = 1.4,
    runDepth: number = 5.2
  ): THREE.Group {
    const group = new THREE.Group();
    const darkSteel = this.getMaterial('dark_aluminum');
    const glass = this.getMaterial('glass');

    const stepCount = 14;
    const riserH = height / stepCount;
    const treadD = runDepth / stepCount;

    // Stringers (Left and Right sloped steel channel beams)
    const slopeLen = Math.hypot(height, runDepth);
    const slopeAngle = Math.atan2(height, runDepth);

    const stringerL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, slopeLen), darkSteel);
    stringerL.position.set(-width * 0.5, height * 0.5, runDepth * 0.5);
    stringerL.rotation.x = -slopeAngle;
    group.add(stringerL);

    const stringerR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, slopeLen), darkSteel);
    stringerR.position.set(width * 0.5, height * 0.5, runDepth * 0.5);
    stringerR.rotation.x = -slopeAngle;
    group.add(stringerR);

    // Step treads
    for (let i = 0; i < stepCount; i++) {
      const y = (i + 0.5) * riserH;
      const z = (i + 0.5) * treadD;
      const tread = new THREE.Mesh(new THREE.BoxGeometry(width, 0.05, treadD * 1.1), darkSteel);
      tread.position.set(0, y, z);
      tread.castShadow = true;
      group.add(tread);
    }

    // Outer Glass Railing & Handrail
    const railH = 0.95;
    const glassPanel = new THREE.Mesh(new THREE.BoxGeometry(0.02, railH, slopeLen), glass);
    glassPanel.position.set(width * 0.5 + 0.02, height * 0.5 + railH * 0.5, runDepth * 0.5);
    glassPanel.rotation.x = -slopeAngle;
    group.add(glassPanel);

    const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, slopeLen), darkSteel);
    handrail.position.set(width * 0.5 + 0.02, height * 0.5 + railH, runDepth * 0.5);
    handrail.rotation.x = -slopeAngle;
    group.add(handrail);

    return group;
  }

  /**
   * 15. Concrete Planter Box with Lush Cascading Tropical Greenery
   */
  public static buildRooftopPlanterBox(
    width: number,
    depth: number,
    height: number = 0.55
  ): THREE.Group {
    const group = new THREE.Group();
    const concrete = this.getMaterial('concrete', '#cbd5e1');
    const foliage = this.getMaterial('foliage');

    const planterMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), concrete);
    planterMesh.position.set(0, height * 0.5, 0);
    planterMesh.castShadow = true;
    group.add(planterMesh);

    // Cascading hanging shrubs and vines
    const shrub = new THREE.Mesh(new THREE.BoxGeometry(width + 0.15, height * 0.7, depth + 0.2), foliage);
    shrub.position.set(0, height * 0.85, 0);
    shrub.castShadow = true;
    group.add(shrub);

    return group;
  }
}
