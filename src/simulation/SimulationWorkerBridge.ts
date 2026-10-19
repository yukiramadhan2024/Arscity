import { BuildingManager } from '../buildings/BuildingManager';
import { RoadManager } from '../roads/RoadManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { LotManager } from '../zones/LotManager';
import { acousticAnalyzer, CityAcousticReport } from '../analysis/AcousticAnalyzer';
import { solarAnalyzer, DaylightEvaluation, RooftopSolarEstimate } from '../analysis/SolarAnalyzer';
import { BuildingInstance } from '../buildings/PrefabTypes';

export interface OffThreadAcousticResult {
  report: CityAcousticReport;
  wasOffThread: boolean;
}

export class SimulationWorkerBridge {
  private static instance: SimulationWorkerBridge | null = null;
  public static readonly HEAVY_SIMULATION_THRESHOLD = 50;

  private worker: Worker | null = null;
  private workerFailed: boolean = false;
  private nextRequestId: number = 1;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

  public static getInstance(): SimulationWorkerBridge {
    if (!this.instance) {
      this.instance = new SimulationWorkerBridge();
    }
    return this.instance;
  }

  private constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (this.workerFailed) return;
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return;
    }

    try {
      this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<any>) => {
        const { id, success, data, error } = event.data;
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          if (success) {
            pending.resolve(data);
          } else {
            pending.reject(new Error(error || 'Simulation worker error'));
          }
        }
      };
      this.worker.onerror = (err) => {
        console.warn('[SimulationWorkerBridge] Web Worker error, switching to synchronous simulation fallback:', err);
        this.workerFailed = true;
        this.worker?.terminate();
        this.worker = null;
        for (const req of this.pendingRequests.values()) {
          req.reject(new Error('Worker terminated'));
        }
        this.pendingRequests.clear();
      };
    } catch (err) {
      console.warn('[SimulationWorkerBridge] Web Worker not available, using synchronous simulation:', err);
      this.workerFailed = true;
      this.worker = null;
    }
  }

  public shouldRunAsync(buildingCount: number): boolean {
    return buildingCount > SimulationWorkerBridge.HEAVY_SIMULATION_THRESHOLD && this.worker !== null && !this.workerFailed;
  }

  private postToWorker(action: string, payload: any, timeoutMs: number = 5000): Promise<any> {
    if (!this.worker || this.workerFailed) {
      return Promise.reject(new Error('Worker unavailable'));
    }

    const id = `sim_req_${this.nextRequestId++}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Simulation worker timeout on action: ${action}`));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });

      this.worker!.postMessage({ id, action, payload });
    });
  }

  /**
   * Evaluates city acoustic noise levels.
   * If building count > 50 and Worker is active, processes off-thread.
   * Otherwise falls back synchronously to acousticAnalyzer.evaluateCity.
   */
  public async evaluateAcoustics(
    buildingManager: BuildingManager,
    roadManager: RoadManager,
    landscapeManager: LandscapeManager,
    lotManager: LotManager
  ): Promise<OffThreadAcousticResult> {
    const buildings = Array.from(buildingManager.buildings.values());

    if (!this.shouldRunAsync(buildings.length)) {
      // Synchronous execution fallback
      const report = acousticAnalyzer.evaluateCity(buildingManager, roadManager, landscapeManager, lotManager);
      return { report, wasOffThread: false };
    }

    try {
      const roadEdges = Array.from(roadManager.graph.edges.values());
      const payload = {
        buildings: buildings.map((b) => ({
          id: b.id,
          name: b.name,
          catalogId: b.presetKey,
          position: { x: b.position.x, y: b.position.y, z: b.position.z },
          width: b.width,
          length: b.length,
          footprintAreaM2: b.width * b.length,
          hasSecondarySkin: b.hasSecondarySkin
        })),
        roads: roadEdges.map((e) => {
          const cp = e.controlPoints;
          const midX = (cp[0].x + cp[3].x) / 2;
          const midZ = (cp[0].z + cp[3].z) / 2;
          return {
            type: e.type,
            edgeCenter: { x: midX, y: 0, z: midZ }
          };
        }),
        trees: landscapeManager.elements
          .filter((el) => el.type === 'shade_tree')
          .map((el) => ({
            position: { x: el.position.x, y: el.position.y, z: el.position.z },
            isLarge: true
          })),
        commercialSources: buildings
          .filter((b) =>
            ['resto_mie_gacoan', 'mall_grand_atrium', 'pasar_rakyat_modern', 'stasiun_komuter_heritage'].includes(b.presetKey)
          )
          .map((b) => ({
            name: b.name,
            catalogId: b.presetKey,
            position: { x: b.position.x, y: b.position.y, z: b.position.z },
            emissionDba: b.presetKey === 'stasiun_komuter_heritage' ? 74.0 : 70.0
          }))
      };

      const workerData = await this.postToWorker('EVALUATE_ACOUSTICS', payload);
      return { report: workerData as CityAcousticReport, wasOffThread: true };
    } catch (err) {
      console.warn('[SimulationWorkerBridge] Worker acoustic run failed, using sync fallback:', err);
      const report = acousticAnalyzer.evaluateCity(buildingManager, roadManager, landscapeManager, lotManager);
      return { report, wasOffThread: false };
    }
  }

  /**
   * Evaluates solar daylight and rooftop PV for buildings in batch.
   */
  public async evaluateSolarDaylightBatch(
    buildings: BuildingInstance[]
  ): Promise<Record<string, { daylight: DaylightEvaluation; solar: RooftopSolarEstimate }>> {
    const result: Record<string, { daylight: DaylightEvaluation; solar: RooftopSolarEstimate }> = {};

    for (const b of buildings) {
      result[b.id] = {
        daylight: solarAnalyzer.evaluateDaylightAutonomy(b),
        solar: solarAnalyzer.estimateRooftopSolar(b)
      };
    }

    return result;
  }
}

export const simulationWorkerBridge = SimulationWorkerBridge.getInstance();
