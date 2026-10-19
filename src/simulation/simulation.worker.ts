/**
 * simulation.worker.ts - Web Worker for off-thread building physics and urban simulation matrices.
 * Prevents main-thread micro-stutter in 50+ to 300+ building cities, ensuring a steady 60+ FPS Three.js viewport.
 */

export interface SimulationWorkerRequest {
  id: string;
  action: 'EVALUATE_ACOUSTICS' | 'EVALUATE_SOLAR_DAYLIGHT' | 'EVALUATE_RUNOFF';
  payload: any;
}

export interface SimulationWorkerResponse {
  id: string;
  action: string;
  success: boolean;
  data?: any;
  error?: string;
}

// ---------------------------------------------------------------------
// 1. Off-Thread Acoustic Calculations (SNI 03-6386-2000)
// ---------------------------------------------------------------------
function computeAcousticsOffThread(payload: {
  buildings: Array<{
    id: string;
    name: string;
    catalogId: string;
    position: { x: number; y: number; z: number };
    width: number;
    length: number;
    footprintAreaM2: number;
    hasSecondarySkin?: boolean;
    wallWindowRatio?: number;
  }>;
  roads: Array<{
    type: string;
    edgeCenter: { x: number; y: number; z: number };
  }>;
  trees: Array<{
    position: { x: number; y: number; z: number };
    isLarge: boolean;
  }>;
  commercialSources: Array<{
    name: string;
    catalogId: string;
    position: { x: number; y: number; z: number };
    emissionDba: number;
  }>;
}) {
  const { buildings, roads, trees, commercialSources } = payload;
  const buildingResults: Record<string, any> = {};

  let totalNoise = 0;
  let calmCount = 0;
  let moderateCount = 0;
  let noisyCount = 0;
  let maxNoiseDba = 0;
  let maxNoiseBldName = '-';

  for (const bld of buildings) {
    let maxRoadNoiseContribution = 35.0; // background quiet baseline

    for (const road of roads) {
      const dx = bld.position.x - road.edgeCenter.x;
      const dz = bld.position.z - road.edgeCenter.z;
      const dist = Math.max(3.0, Math.sqrt(dx * dx + dz * dz));

      let emissionDba = 58.0;
      if (road.type === 'artery_20m') emissionDba = 76.0;
      else if (road.type === 'collector_12m') emissionDba = 68.0;
      else if (road.type === 'local_7m') emissionDba = 58.0;
      else if (road.type === 'alley_4m') emissionDba = 48.0;

      // Distance attenuation: 20 * log10(d / d0)
      const distAttenuation = 20 * Math.log10(dist / 3.0);
      const receivedFromRoad = Math.max(30.0, emissionDba - distAttenuation);
      if (receivedFromRoad > maxRoadNoiseContribution) {
        maxRoadNoiseContribution = receivedFromRoad;
      }
    }

    // Setback attenuation: front distance
    let setbackReduction = 0;
    if (bld.position.z !== undefined) {
      setbackReduction = Math.min(8.0, Math.max(0, 3.0 + Math.abs(bld.position.z % 10) * 0.4));
    }

    // Vegetative buffer count
    let bufferTrees = 0;
    for (const tree of trees) {
      const d = Math.hypot(bld.position.x - tree.position.x, bld.position.z - tree.position.z);
      if (d < 25.0) {
        bufferTrees++;
      }
    }
    const treeReduction = Math.min(8.0, bufferTrees * 1.5);

    // Facade secondary skin bonus
    const facadeReduction = bld.hasSecondarySkin ? 6.0 : 0.0;

    let totalOutdoorNoise = Math.max(35.0, maxRoadNoiseContribution - setbackReduction - treeReduction);

    // Commercial activity emission
    for (const comm of commercialSources) {
      const d = Math.hypot(bld.position.x - comm.position.x, bld.position.z - comm.position.z);
      if (d < 40.0) {
        const commRec = comm.emissionDba - 20 * Math.log10(Math.max(2.0, d) / 2.0);
        if (commRec > totalOutdoorNoise) {
          totalOutdoorNoise = commRec;
        }
      }
    }

    const indoorNoise = Math.max(30.0, totalOutdoorNoise - (15.0 + facadeReduction));

    let comfortCategory = 'moderate';
    if (indoorNoise <= 55.0) {
      comfortCategory = 'calm';
      calmCount++;
    } else if (indoorNoise <= 65.0) {
      comfortCategory = 'moderate';
      moderateCount++;
    } else {
      comfortCategory = 'noisy';
      noisyCount++;
    }

    totalNoise += indoorNoise;
    if (indoorNoise > maxNoiseDba) {
      maxNoiseDba = indoorNoise;
      maxNoiseBldName = bld.name;
    }

    buildingResults[bld.id] = {
      buildingId: bld.id,
      buildingName: bld.name,
      indoorNoiseDba: indoorNoise,
      outdoorNoiseDba: totalOutdoorNoise,
      comfortCategory,
      treeBufferCount: bufferTrees
    };
  }

  const avgNoise = buildings.length > 0 ? totalNoise / buildings.length : 50.0;

  return {
    avgNoiseDba: avgNoise,
    calmCount,
    moderateCount,
    noisyCount,
    maxNoiseDba,
    maxNoiseBuildingName: maxNoiseBldName,
    buildingResults,
    mitigationAdvice:
      noisyCount > 0
        ? `Ditemukan ${noisyCount} bangunan terpapar kebisingan tinggi (>65 dBA). Perlebar GSB depan atau tanam sabuk pohon peneduh di tepi jalan arteri.`
        : 'Seluruh bangunan berada dalam ambang batas kenyamanan akustik SNI 03-6386-2000.'
  };
}

// ---------------------------------------------------------------------
// 2. Off-Thread Solar Daylight & PV Calculations
// ---------------------------------------------------------------------
function computeSolarDaylightOffThread(payload: {
  buildings: Array<{
    id: string;
    catalogId: string;
    width: number;
    length: number;
    floorCount: number;
    footprintAreaM2: number;
    roofType?: string;
  }>;
}) {
  const results: Record<string, any> = {};

  for (const b of payload.buildings) {
    const depth = Math.max(b.width, b.length);
    const floorH = 3.6;
    const depthToHeightRatio = depth / floorH;

    let daylightFactor = 1.0;
    if (depthToHeightRatio <= 2.5) daylightFactor = 3.5;
    else if (depthToHeightRatio <= 4.0) daylightFactor = 2.4;
    else if (depthToHeightRatio <= 6.0) daylightFactor = 1.5;
    else daylightFactor = 0.8;

    const daylightAdequate = daylightFactor >= 2.0;

    // Rooftop Solar PV potential
    const effectiveRoofArea = b.footprintAreaM2 * 0.75;
    const capacityKwp = effectiveRoofArea * 0.16;
    const annualKwh = capacityKwp * 4.8 * 365 * 0.8;
    const annualSavingsIdr = annualKwh * 1444.7;

    results[b.id] = {
      buildingId: b.id,
      daylightFactor,
      daylightAdequate,
      effectiveRoofAreaM2: effectiveRoofArea,
      capacityKwp: Number(capacityKwp.toFixed(1)),
      annualKwh: Number(annualKwh.toFixed(0)),
      annualSavingsIdr: Number(annualSavingsIdr.toFixed(0))
    };
  }

  return results;
}

// ---------------------------------------------------------------------
// 3. Worker Event Listener
// ---------------------------------------------------------------------
if (typeof self !== 'undefined') {
  self.onmessage = (e: MessageEvent<SimulationWorkerRequest>) => {
    const { id, action, payload } = e.data;

    try {
      switch (action) {
        case 'EVALUATE_ACOUSTICS': {
          const data = computeAcousticsOffThread(payload);
          self.postMessage({ id, action, success: true, data } as SimulationWorkerResponse);
          break;
        }

        case 'EVALUATE_SOLAR_DAYLIGHT': {
          const data = computeSolarDaylightOffThread(payload);
          self.postMessage({ id, action, success: true, data } as SimulationWorkerResponse);
          break;
        }

        default:
          self.postMessage({
            id,
            action,
            success: false,
            error: `Aksi simulasi worker tidak dikenal: ${action}`
          } as SimulationWorkerResponse);
      }
    } catch (err: any) {
      self.postMessage({
        id,
        action,
        success: false,
        error: err?.message || 'Kesalahan internal simulation worker.'
      } as SimulationWorkerResponse);
    }
  };
}
