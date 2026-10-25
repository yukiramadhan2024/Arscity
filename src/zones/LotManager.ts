import * as THREE from 'three';
import { LotParcel, ZoneType, ZONE_RULES, BuildingCodeViolation } from './ZoneTypes';
import { BuildingManager } from '../buildings/BuildingManager';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';
import type { RoadManager } from '../roads/RoadManager';
import type { LandscapeManager } from '../world/LandscapeManager';

export class LotManager {
  public lots: Map<string, LotParcel> = new Map();
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;
  private buildingManager: BuildingManager;
  public roadManager?: RoadManager;
  public landscapeManager?: LandscapeManager;

  private lotMeshGroups: Map<string, THREE.Group> = new Map();
  public selectedLotId: string | null = null;
  public onSelectionChanged?: () => void;
  public onLotsUpdated?: () => void;

  private nextLotId: number = 1;

  constructor(
    scene: THREE.Scene,
    buildingManager: BuildingManager,
    roadManager?: RoadManager,
    landscapeManager?: LandscapeManager
  ) {
    this.scene = scene;
    this.buildingManager = buildingManager;
    this.roadManager = roadManager;
    this.landscapeManager = landscapeManager;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'LotsMasterGroup';
    scene.add(this.masterGroup);
  }

  public setDependencies(roadManager?: RoadManager, landscapeManager?: LandscapeManager): void {
    if (roadManager) this.roadManager = roadManager;
    if (landscapeManager) this.landscapeManager = landscapeManager;
    this.evaluateAllLots();
  }

  /**
   * Smart Block Subdivider: Subdivides a rectangular area into a regular grid
   * of uniform parcels, each automatically calibrated to face the nearest road.
   */
  public subdivideBlock(
    center: THREE.Vector3,
    blockWidth: number,
    blockLength: number,
    parcelWidth: number = 10,
    parcelLength: number = 20,
    zone: ZoneType = 'residential'
  ): LotParcel[] {
    const createdParcels: LotParcel[] = [];
    const safeBlockW = Math.max(1, Math.abs(blockWidth));
    const safeBlockL = Math.max(1, Math.abs(blockLength));
    const safeParcelW = Math.max(1, Math.abs(parcelWidth));
    const safeParcelL = Math.max(1, Math.abs(parcelLength));

    const cols = Math.max(1, Math.floor(safeBlockW / safeParcelW));
    const rows = Math.max(1, Math.floor(safeBlockL / safeParcelL));

    const actualW = safeBlockW / cols;
    const actualL = safeBlockL / rows;

    const startX = center.x - safeBlockW / 2 + actualW / 2;
    const startZ = center.z - safeBlockL / 2 + actualL / 2;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const px = startX + c * actualW;
        const pz = startZ + r * actualL;
        const pos = new THREE.Vector3(px, center.y, pz);

        const parcel = this.createLot(pos, actualW, actualL, zone);

        if (this.roadManager) {
          const nearest = this.roadManager.findNearestRoadEdge(pos);
          if (nearest) {
            const dx = nearest.closestPt.x - pos.x;
            const dz = nearest.closestPt.z - pos.z;
            if (Math.abs(dz) >= Math.abs(dx)) {
              parcel.frontEdgeIndex = dz > 0 ? 0 : 2;
            } else {
              parcel.frontEdgeIndex = dx > 0 ? 1 : 3;
            }
          }
        }

        createdParcels.push(parcel);
      }
    }

    if (this.onLotsUpdated) this.onLotsUpdated();
    return createdParcels;
  }

  public createLot(
    position: THREE.Vector3,
    width: number,
    length: number,
    zone: ZoneType = 'residential'
  ): LotParcel {
    const id = `lot_${this.nextLotId++}`;
    const areaM2 = width * length;

    const parcel: LotParcel = {
      id,
      name: `Kavling #${this.nextLotId - 1}`,
      zone,
      position: position.clone(),
      width,
      length,
      areaM2,
      containedBuildingIds: [],
      metrics: {
        groundFootprintM2: 0,
        totalFloorAreaM2: 0,
        greenAreaM2: 0,
        pavedAreaM2: areaM2,
        kdbPercent: 0,
        klbRatio: 0,
        kdhPercent: 0,
        gsbFrontActualM: 4.0,
        gsbSideActualM: 3.0,
        gsbRearActualM: 3.0,
        gsbDistanceM: 4.0,
        maxFloors: 0
      },
      violations: []
    };

    this.lots.set(id, parcel);
    this.evaluateBuildingCode(parcel);
    this.rebuildLotMesh(parcel);

    if (this.onLotsUpdated) this.onLotsUpdated();
    return parcel;
  }

  public removeLot(id: string): boolean {
    if (!this.lots.has(id)) return false;

    const group = this.lotMeshGroups.get(id);
    if (group) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
      this.lotMeshGroups.delete(id);
    }

    if (this.selectedLotId === id) {
      this.selectedLotId = null;
      if (this.onSelectionChanged) this.onSelectionChanged();
    }

    this.lots.delete(id);
    if (this.onLotsUpdated) this.onLotsUpdated();
    return true;
  }

  public setLotZone(lotId: string, newZone: ZoneType): void {
    const lot = this.lots.get(lotId);
    if (!lot) return;

    lot.zone = newZone;
    this.evaluateBuildingCode(lot);
    this.rebuildLotMesh(lot);
    if (this.onLotsUpdated) this.onLotsUpdated();
  }

  /**
   * Get 2D lot boundary corners in world coordinate space (counter-clockwise).
   * Edge 0: C0 -> C1 (North / top edge)
   * Edge 1: C1 -> C2 (East / right edge)
   * Edge 2: C2 -> C3 (South / bottom edge)
   * Edge 3: C3 -> C0 (West / left edge)
   */
  public getLotCorners2D(lot: LotParcel): Vec2D[] {
    const hw = lot.width * 0.5;
    const hl = lot.length * 0.5;
    const cx = lot.position.x;
    const cz = lot.position.z;

    return [
      { x: cx - hw, y: cz - hl }, // C0: North-West
      { x: cx + hw, y: cz - hl }, // C1: North-East
      { x: cx + hw, y: cz + hl }, // C2: South-East
      { x: cx - hw, y: cz + hl }, // C3: South-West
    ];
  }

  /**
   * Identifies lot edges and detects which edge faces the nearest road (Front Edge).
   * Returns indices: front, rear, side1, side2.
   */
  public getLotEdgeClassification(lot: LotParcel): {
    frontIdx: number;
    rearIdx: number;
    sideIndices: number[];
  } {
    const corners = this.getLotCorners2D(lot);
    let frontIdx = 2; // Default to South edge (Z+)

    if (this.roadManager && this.roadManager.graph.edges.size > 0) {
      let minDistanceToRoad = Infinity;

      for (let i = 0; i < 4; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % 4];
        const edgeMid = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };

        for (const edge of this.roadManager.graph.edges.values()) {
          const sNode = this.roadManager.graph.nodes.get(edge.startNodeId);
          const eNode = this.roadManager.graph.nodes.get(edge.endNodeId);
          if (!sNode || !eNode) continue;

          const segA = { x: sNode.position.x, y: sNode.position.z };
          const segB = { x: eNode.position.x, y: eNode.position.z };
          const dist = PolygonMath.distancePointToSegment(edgeMid, segA, segB);

          if (dist < minDistanceToRoad) {
            minDistanceToRoad = dist;
            frontIdx = i;
          }
        }
      }
    }

    const rearIdx = (frontIdx + 2) % 4;
    const sideIndices = [(frontIdx + 1) % 4, (frontIdx + 3) % 4];

    return { frontIdx, rearIdx, sideIndices };
  }

  public evaluateBuildingCode(lot: LotParcel): void {
    const rule = ZONE_RULES[lot.zone];
    const lotCorners = this.getLotCorners2D(lot);
    const { frontIdx, rearIdx, sideIndices } = this.getLotEdgeClassification(lot);

    // Edges of the lot
    const lotEdges = [
      { start: lotCorners[0], end: lotCorners[1] },
      { start: lotCorners[1], end: lotCorners[2] },
      { start: lotCorners[2], end: lotCorners[3] },
      { start: lotCorners[3], end: lotCorners[0] },
    ];

    const insideBuildingIds: string[] = [];
    let groundArea = 0;
    let totalFloorArea = 0;
    let highestFloor = 0;

    let minGsbFront = Infinity;
    let minGsbSide = Infinity;
    let minGsbRear = Infinity;

    const violations: BuildingCodeViolation[] = [];

    // Find and evaluate all buildings against this lot's polygon footprint
    for (const bld of this.buildingManager.buildings.values()) {
      const bldFootprint = BuildingManager.getBuildingWorldFootprint(bld);
      if (bldFootprint.length < 3) continue;

      const bldPoly: Vec2D[] = bldFootprint.map((p) => ({ x: p.x, y: p.y }));

      // Check how many vertices are inside this lot
      let insideCount = 0;
      for (const v of bldPoly) {
        if (PolygonMath.isPointInPolygon(v, lotCorners)) {
          insideCount++;
        }
      }

      // Check if center or any part is inside lot
      const bldCenter: Vec2D = { x: bld.position.x, y: bld.position.z };
      const centerInside = PolygonMath.isPointInPolygon(bldCenter, lotCorners);

      if (insideCount > 0 || centerInside) {
        insideBuildingIds.push(bld.id);

        const bldGround = BuildingManager.getBuildingGroundArea(bld);
        const bldTotal = BuildingManager.getBuildingTotalFloorArea(bld);
        groundArea += bldGround;
        totalFloorArea += bldTotal;
        highestFloor = Math.max(highestFloor, bld.floorCount);

        // Check OUT_OF_BOUNDS or CROSS_LOTS
        if (insideCount < bldPoly.length) {
          // Check if outer vertices fall into another lot
          let fallsIntoOtherLot = false;
          for (const otherLot of this.lots.values()) {
            if (otherLot.id === lot.id) continue;
            const otherCorners = this.getLotCorners2D(otherLot);
            for (const v of bldPoly) {
              if (PolygonMath.isPointInPolygon(v, otherCorners)) {
                fallsIntoOtherLot = true;
                break;
              }
            }
            if (fallsIntoOtherLot) break;
          }

          if (fallsIntoOtherLot) {
            violations.push({
              code: 'CROSS_LOTS',
              title: 'Bangunan Melintasi Batas Kavling',
              actual: 'Melintasi 2 kavling',
              allowed: '1 kavling utuh',
              message: `Bangunan '${bld.name}' berdiri melintasi dua kavling berbeda.`,
              advice: 'Posisikan bangunan seutuhnya dalam satu kepemilikan kavling atau satukan kavling terlebih dahulu.'
            });
          } else {
            violations.push({
              code: 'OUT_OF_BOUNDS',
              title: 'Bangunan Keluar Batas Kavling',
              actual: 'Menjorok ke luar',
              allowed: 'Dalam kavling',
              message: `Sebagian tapak bangunan '${bld.name}' menjorok keluar dari batas kavling.`,
              advice: 'Kecilkan ukuran bangunan atau geser posisinya agar seluruh tapak berada di dalam kavling.'
            });
          }
        }

        // Measure GSB: Shortest distance to Front, Side, and Rear edges
        const dFront = PolygonMath.minDistancePolygonToSegment(
          bldPoly,
          lotEdges[frontIdx].start,
          lotEdges[frontIdx].end
        );
        const dRear = PolygonMath.minDistancePolygonToSegment(
          bldPoly,
          lotEdges[rearIdx].start,
          lotEdges[rearIdx].end
        );
        const dSide = Math.min(
          PolygonMath.minDistancePolygonToSegment(bldPoly, lotEdges[sideIndices[0]].start, lotEdges[sideIndices[0]].end),
          PolygonMath.minDistancePolygonToSegment(bldPoly, lotEdges[sideIndices[1]].start, lotEdges[sideIndices[1]].end)
        );

        if (dFront < minGsbFront) minGsbFront = dFront;
        if (dSide < minGsbSide) minGsbSide = dSide;
        if (dRear < minGsbRear) minGsbRear = dRear;
      }
    }

    lot.containedBuildingIds = insideBuildingIds;

    // Evaluate true green area from LandscapeManager (unmarked space is paved, not green)
    const greenArea = this.landscapeManager ? this.landscapeManager.getGreenAreaInLot(lot) : 0;
    const pavedArea = Math.max(0, lot.areaM2 - groundArea - greenArea);

    const kdb = Math.min(100, Math.round((groundArea / lot.areaM2) * 100));
    const klb = parseFloat((totalFloorArea / lot.areaM2).toFixed(2));
    const kdh = Math.min(100, Math.round((greenArea / lot.areaM2) * 100));

    const gsbFrontActual = isFinite(minGsbFront) ? parseFloat(minGsbFront.toFixed(1)) : lot.length * 0.5;
    const gsbSideActual = isFinite(minGsbSide) ? parseFloat(minGsbSide.toFixed(1)) : lot.width * 0.5;
    const gsbRearActual = isFinite(minGsbRear) ? parseFloat(minGsbRear.toFixed(1)) : lot.length * 0.5;
    const gsbMinOverall = Math.min(gsbFrontActual, gsbSideActual, gsbRearActual);

    lot.metrics = {
      groundFootprintM2: groundArea,
      totalFloorAreaM2: totalFloorArea,
      greenAreaM2: greenArea,
      pavedAreaM2: pavedArea,
      kdbPercent: kdb,
      klbRatio: klb,
      kdhPercent: kdh,
      gsbFrontActualM: gsbFrontActual,
      gsbSideActualM: gsbSideActual,
      gsbRearActualM: gsbRearActual,
      gsbDistanceM: gsbMinOverall,
      maxFloors: highestFloor
    };

    // 1. KDB violation
    if (kdb > rule.maxKDB) {
      violations.push({
        code: 'KDB',
        title: 'Pelanggaran KDB (Kepadatan Lahan Berlebih)',
        actual: `${kdb}%`,
        allowed: `maks ${rule.maxKDB}%`,
        message: `KDB ${kdb}% melebihi batas zonasi ${rule.maxKDB}%. Lahan terlalu padat tertutup bangunan.`,
        advice: 'Kecilkan denah bangunan atau sisakan ruang terbuka agar resapan air hujan optimal.'
      });
    }

    // 2. KLB violation
    if (klb > rule.maxKLB) {
      violations.push({
        code: 'KLB',
        title: 'Pelanggaran KLB (Kapasitas Lantai Berlebih)',
        actual: `${klb}`,
        allowed: `maks ${rule.maxKLB}`,
        message: `KLB ${klb} melebihi batas zonasi ${rule.maxKLB}. Luas lantai total terlalu masif untuk daya dukung lingkungan.`,
        advice: 'Kurangi jumlah lantai atau kurangi luas lantai atas (buat teras/setback).'
      });
    }

    // 3. KDH violation (true green area test)
    if (kdh < rule.minKDH) {
      violations.push({
        code: 'KDH',
        title: 'Kekurangan Ruang Terbuka Hijau (KDH)',
        actual: `${kdh}%`,
        allowed: `min ${rule.minKDH}%`,
        message: `KDH ${kdh}% kurang dari syarat minimum ${rule.minKDH}%. Sisa lahan tanpa lansekap dihitung sebagai perkerasan.`,
        advice: 'Tanam pohon peneduh atau buat taman berumput menggunakan alat Lansekap.'
      });
    }

    // 4. Height violation
    if (highestFloor > rule.maxFloors) {
      violations.push({
        code: 'HEIGHT',
        title: 'Tinggi Bangunan Melebihi Batas',
        actual: `${highestFloor} lantai`,
        allowed: `maks ${rule.maxFloors} lantai`,
        message: `Tinggi ${highestFloor} lantai melebihi batas zonasi ${rule.maxFloors} lantai.`,
        advice: 'Pangkas jumlah lantai agar sesuai dengan karakter kawasan peruntukan.'
      });
    }

    // 5. GSB Front violation
    if (insideBuildingIds.length > 0 && gsbFrontActual < rule.minGSBFront) {
      violations.push({
        code: 'GSB_FRONT',
        title: 'Pelanggaran GSB Depan (Menjorok ke Jalan)',
        actual: `${gsbFrontActual} m`,
        allowed: `min ${rule.minGSBFront} m`,
        message: `Jarak dinding ke sisi jalan ${gsbFrontActual}m lebih kecil dari sempadan jalan minimum ${rule.minGSBFront}m.`,
        advice: 'Mundurkan bangunan dari arah jalan agar berada di belakang garis sempadan muka.'
      });
    }

    // 6. GSB Side violation
    if (insideBuildingIds.length > 0 && gsbSideActual < rule.minGSBSide) {
      violations.push({
        code: 'GSB_SIDE',
        title: 'Pelanggaran GSB Samping (Terlalu Rapat Tetangga)',
        actual: `${gsbSideActual} m`,
        allowed: `min ${rule.minGSBSide} m`,
        message: `Jarak samping ${gsbSideActual}m lebih kecil dari jarak bebas samping minimum ${rule.minGSBSide}m.`,
        advice: 'Sisakan celah samping untuk sirkulasi udara alami dan jalur evakuasi kebakaran.'
      });
    }

    // 7. GSB Rear violation
    if (insideBuildingIds.length > 0 && gsbRearActual < rule.minGSBRear) {
      violations.push({
        code: 'GSB_REAR',
        title: 'Pelanggaran GSB Belakang',
        actual: `${gsbRearActual} m`,
        allowed: `min ${rule.minGSBRear} m`,
        message: `Jarak belakang ${gsbRearActual}m lebih kecil dari sempadan belakang minimum ${rule.minGSBRear}m.`,
        advice: 'Sisakan halaman belakang untuk ruang terbuka dan resapan air.'
      });
    }

    // 8. GSS (Garis Sempadan Sungai) Check (Permen PUPR No. 28/PRT/M/2015)
    if (this.landscapeManager && insideBuildingIds.length > 0) {
      let minRiverDistance = Infinity;
      for (const item of this.landscapeManager.items.values()) {
        if (item.type === 'river_segment') {
          const rW = item.width || 12;
          const rL = item.length || 24;
          for (const bldId of insideBuildingIds) {
            const bld = this.buildingManager.buildings.get(bldId);
            if (bld) {
              const dx = Math.max(0, Math.abs(bld.position.x - item.position.x) - (rW / 2 + bld.width / 2));
              const dz = Math.max(0, Math.abs(bld.position.z - item.position.z) - (rL / 2 + bld.length / 2));
              const d = Math.hypot(dx, dz);
              if (d < minRiverDistance) minRiverDistance = d;
            }
          }
        }
      }

      if (minRiverDistance < 10.0) {
        violations.push({
          code: 'GSS',
          title: 'Pelanggaran Garis Sempadan Sungai (GSS)',
          actual: `${minRiverDistance.toFixed(1)} m`,
          allowed: 'min 10.0 m',
          message: `Jarak bangunan ke tepi alur sungai (${minRiverDistance.toFixed(1)} m) kurang dari batas sempadan 10.0 m (Permen PUPR No. 28/PRT/M/2015).`,
          advice: 'Mundurkan tapak bangunan minimal 10 meter dari tepi sungai dan pertahankan sabuk hijau sempadan.'
        });
      }
    }

    lot.violations = violations;
  }

  public evaluateAllLots(): void {
    for (const lot of this.lots.values()) {
      this.evaluateBuildingCode(lot);
      this.rebuildLotMesh(lot);
    }
  }

  public rebuildLotMesh(lot: LotParcel): void {
    const existing = this.lotMeshGroups.get(lot.id);
    if (existing) {
      this.masterGroup.remove(existing);
      this.disposeGroup(existing);
    }

    const group = new THREE.Group();
    group.name = `Lot_${lot.id}`;
    group.position.set(lot.position.x, 0.03, lot.position.z);
    group.userData = { lotId: lot.id, type: 'lot' };

    const rule = ZONE_RULES[lot.zone];
    const hasViolations = lot.violations.length > 0;

    // 1. Transparent tinted zone surface plane
    const planeGeom = new THREE.PlaneGeometry(lot.width - 0.2, lot.length - 0.2);
    planeGeom.rotateX(-Math.PI / 2);

    const planeMat = new THREE.MeshBasicMaterial({
      color: rule.colorHexInt,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    const surfaceMesh = new THREE.Mesh(planeGeom, planeMat);
    group.add(surfaceMesh);

    // 2. Lot Boundary Border Line
    const hw = lot.width * 0.5;
    const hl = lot.length * 0.5;
    const borderPoints = [
      new THREE.Vector3(-hw, 0.01, -hl),
      new THREE.Vector3(hw, 0.01, -hl),
      new THREE.Vector3(hw, 0.01, hl),
      new THREE.Vector3(-hw, 0.01, hl),
      new THREE.Vector3(-hw, 0.01, -hl)
    ];
    const lineGeom = new THREE.BufferGeometry().setFromPoints(borderPoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: hasViolations ? 0xff3b30 : rule.colorHexInt,
      linewidth: hasViolations ? 3 : 2
    });
    const lineMesh = new THREE.Line(lineGeom, lineMat);
    group.add(lineMesh);

    // 3. Setback (GSB) Envelope Line: Inward permissible building envelope
    const gsbFront = rule.minGSBFront || 3.0;
    const gsbSide = rule.minGSBSide || 1.5;
    const gsbRear = rule.minGSBRear || 2.0;

    const envLeft = -hw + gsbSide;
    const envRight = hw - gsbSide;
    const envTop = -hl + gsbRear;
    const envBottom = hl - gsbFront;

    if (envRight > envLeft && envBottom > envTop) {
      const setbackPoints = [
        new THREE.Vector3(envLeft, 0.045, envTop),
        new THREE.Vector3(envRight, 0.045, envTop),
        new THREE.Vector3(envRight, 0.045, envBottom),
        new THREE.Vector3(envLeft, 0.045, envBottom),
        new THREE.Vector3(envLeft, 0.045, envTop)
      ];
      const setbackGeom = new THREE.BufferGeometry().setFromPoints(setbackPoints);
      const isGsbViolated = lot.violations.some(v => v.code.startsWith('GSB'));
      const gsbColor = isGsbViolated ? 0xff3b30 : 0x00ff66; // Emerald green glow (#00FF66)

      const setbackMat = new THREE.LineDashedMaterial({
        color: gsbColor,
        dashSize: 1.2,
        gapSize: 0.6,
        linewidth: 2.5,
        transparent: true,
        opacity: 0.95
      });
      const setbackLine = new THREE.Line(setbackGeom, setbackMat);
      setbackLine.computeLineDistances();
      setbackLine.renderOrder = 920;
      group.add(setbackLine);
    }

    this.masterGroup.add(group);
    this.lotMeshGroups.set(lot.id, group);
  }

  public selectLot(id: string | null): void {
    this.selectedLotId = id;
    if (this.onSelectionChanged) this.onSelectionChanged();
  }

  public getSelectedLot(): LotParcel | null {
    if (!this.selectedLotId) return null;
    return this.lots.get(this.selectedLotId) || null;
  }

  public getLotForBuilding(buildingId: string): LotParcel | null {
    for (const lot of this.lots.values()) {
      if (lot.containedBuildingIds && lot.containedBuildingIds.includes(buildingId)) {
        return lot;
      }
    }
    const bld = this.buildingManager.buildings.get(buildingId);
    if (!bld) return null;
    for (const lot of this.lots.values()) {
      if (lot.position.distanceTo(bld.position) <= Math.max(lot.width, lot.length) * 0.6) {
        return lot;
      }
    }
    return null;
  }

  public getLotAtPosition(x: number, z: number): LotParcel | null {
    const pt = { x, y: z };
    for (const lot of this.lots.values()) {
      const corners = this.getLotCorners2D(lot);
      if (PolygonMath.isPointInPolygon(pt, corners)) {
        return lot;
      }
    }
    return null;
  }

  public findLotAtPosition(x: number, z: number): LotParcel | null {
    return this.getLotAtPosition(x, z);
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh || (child as THREE.Line).isLine) {
        const obj = child as THREE.Mesh;
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }

  public rebuildAll(): void {
    for (const lot of this.lots.values()) {
      this.evaluateBuildingCode(lot);
      this.rebuildLotMesh(lot);
    }
  }

  public clearAll(): void {
    this.selectLot(null);
    for (const g of this.lotMeshGroups.values()) {
      this.masterGroup.remove(g);
      this.disposeGroup(g);
    }
    this.lots.clear();
    this.lotMeshGroups.clear();
    if (this.onLotsUpdated) this.onLotsUpdated();
    if (this.onSelectionChanged) this.onSelectionChanged();
  }

  public dispose(): void {
    for (const g of this.lotMeshGroups.values()) {
      this.disposeGroup(g);
    }
    this.lots.clear();
    this.lotMeshGroups.clear();
    this.scene.remove(this.masterGroup);
  }
}
