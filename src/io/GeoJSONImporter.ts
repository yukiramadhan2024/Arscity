import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { RoadType } from '../roads/RoadTypes';
import { BuildingInstance, PREFAB_CATALOG } from '../buildings/PrefabTypes';
import { CitySerializer, CitySaveData } from './CitySerializer';

export interface GeoJSONImportResult {
  importedRoads: number;
  importedBuildings: number;
}

export interface ArscityProjectFile {
  format: 'arscity';
  version: string;
  exportedAt: string;
  projectName?: string;
  cityData: CitySaveData;
}

export class GeoJSONImporter {
  /**
   * Converts a GeoJSON FeatureCollection into Arscity road segments and building instances.
   */
  public static parseGeoJSON(data: any): {
    roads: Array<{ start: THREE.Vector3; end: THREE.Vector3; type: RoadType }>;
    buildings: Array<Partial<BuildingInstance>>;
  } {
    const roads: Array<{ start: THREE.Vector3; end: THREE.Vector3; type: RoadType }> = [];
    const buildings: Array<Partial<BuildingInstance>> = [];

    const features = Array.isArray(data?.features)
      ? data.features
      : Array.isArray(data)
      ? data
      : data?.geometry
      ? [data]
      : [];

    if (features.length === 0) {
      return { roads, buildings };
    }

    // 1. Detect if coordinates are in WGS84 (lon/lat degrees) or local Cartesian meters
    let isGeographic = false;
    let minLon = Infinity,
      maxLon = -Infinity,
      minLat = Infinity,
      maxLat = -Infinity;

    const hasHighPrecision = (n: number) => {
      const s = n.toString();
      const idx = s.indexOf('.');
      return idx !== -1 && s.length - idx - 1 >= 3;
    };

    const inspectCoord = (coord: any) => {
      if (Array.isArray(coord) && typeof coord[0] === 'number' && typeof coord[1] === 'number') {
        const x = coord[0];
        const y = coord[1];
        // Typical GIS WGS84 coordinates have longitude > 30° (or < -30°) and/or high floating-point precision (>= 3 decimals)
        // Local CAD/engineering coordinates are usually integers or <= 2 decimals within standard bounds
        const isLikelyWGS84 =
          (Math.abs(x) > 30 && Math.abs(x) <= 180 && Math.abs(y) <= 90) ||
          (Math.abs(x) <= 180 && Math.abs(y) <= 90 && (hasHighPrecision(x) || hasHighPrecision(y)));
        if (isLikelyWGS84) {
          isGeographic = true;
          if (x < minLon) minLon = x;
          if (x > maxLon) maxLon = x;
          if (y < minLat) minLat = y;
          if (y > maxLat) maxLat = y;
        }
      }
    };

    for (const f of features) {
      const geom = f?.geometry;
      if (!geom?.coordinates) continue;
      const coords = geom.coordinates;
      if (geom.type === 'LineString' && Array.isArray(coords)) {
        for (const pt of coords) inspectCoord(pt);
      } else if (geom.type === 'Polygon' && Array.isArray(coords[0])) {
        for (const pt of coords[0]) inspectCoord(pt);
      } else if (geom.type === 'MultiLineString' && Array.isArray(coords)) {
        for (const line of coords) {
          if (Array.isArray(line)) {
            for (const pt of line) inspectCoord(pt);
          }
        }
      } else if (geom.type === 'MultiPolygon' && Array.isArray(coords)) {
        for (const poly of coords) {
          if (Array.isArray(poly[0])) {
            for (const pt of poly[0]) inspectCoord(pt);
          }
        }
      }
    }

    const centerLon = isGeographic && isFinite(minLon) ? (minLon + maxLon) / 2 : 0;
    const centerLat = isGeographic && isFinite(minLat) ? (minLat + maxLat) / 2 : 0;
    const radScale = (Math.PI / 180) * 6378137;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);

    const projectPoint = (coord: [number, number]): { x: number; z: number } => {
      if (isGeographic) {
        const x = (coord[0] - centerLon) * radScale * cosLat;
        const z = -(coord[1] - centerLat) * radScale;
        return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
      }
      return { x: Number(coord[0]) || 0, z: Number(coord[1]) || 0 };
    };

    // 2. Parse features
    for (const f of features) {
      const geom = f?.geometry;
      const props = f?.properties || {};
      if (!geom) continue;

      // LINESTRING: Road network
      if (geom.type === 'LineString' || geom.type === 'MultiLineString') {
        const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
        const highway = String(props.highway || props.roadType || '').toLowerCase();
        let roadType: RoadType = 'local';

        if (highway.includes('primary') || highway.includes('trunk') || highway.includes('motorway')) {
          roadType = 'arterial';
        } else if (highway.includes('secondary') || highway.includes('tertiary')) {
          roadType = 'collector';
        } else if (highway.includes('pedestrian') || highway.includes('footway') || highway.includes('path')) {
          roadType = 'pedestrian';
        }

        for (const line of lines) {
          if (!Array.isArray(line) || line.length < 2) continue;
          for (let i = 0; i < line.length - 1; i++) {
            const p0 = projectPoint(line[i]);
            const p1 = projectPoint(line[i + 1]);
            const dist = Math.hypot(p1.x - p0.x, p1.z - p0.z);
            if (dist >= 1.5) {
              roads.push({
                start: new THREE.Vector3(p0.x, 0, p0.z),
                end: new THREE.Vector3(p1.x, 0, p1.z),
                type: roadType
              });
            }
          }
        }
      }

      // POLYGON: Building Footprints
      if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;

        for (const poly of polygons) {
          const ring = poly?.[0];
          if (!Array.isArray(ring) || ring.length < 3) continue;

          let pMinX = Infinity,
            pMaxX = -Infinity,
            pMinZ = Infinity,
            pMaxZ = -Infinity;

          for (const pt of ring) {
            const pr = projectPoint(pt);
            if (pr.x < pMinX) pMinX = pr.x;
            if (pr.x > pMaxX) pMaxX = pr.x;
            if (pr.z < pMinZ) pMinZ = pr.z;
            if (pr.z > pMaxZ) pMaxZ = pr.z;
          }

          const cx = Math.round(((pMinX + pMaxX) / 2) * 10) / 10;
          const cz = Math.round(((pMinZ + pMaxZ) / 2) * 10) / 10;
          const width = Math.max(6, Math.min(60, Math.round(pMaxX - pMinX)));
          const length = Math.max(6, Math.min(60, Math.round(pMaxZ - pMinZ)));

          const bldType = String(props.building || props.type || props.amenity || '').toLowerCase();
          let presetKey = 'house_36';

          if (bldType.includes('commercial') || bldType.includes('shop') || bldType.includes('ruko') || bldType.includes('retail')) {
            presetKey = 'ruko_3fl';
          } else if (bldType.includes('office')) {
            presetKey = 'office_tower';
          } else if (bldType.includes('school') || bldType.includes('university') || bldType.includes('college')) {
            presetKey = 'school';
          } else if (bldType.includes('worship') || bldType.includes('mosque')) {
            presetKey = 'mosque';
          } else if (bldType.includes('joglo') || props.architecture === 'vernacular') {
            presetKey = 'joglo';
          } else if (width > 12 || length > 14) {
            presetKey = 'house_54';
          }

          const floorCount = Number(props.levels || props['building:levels'] || (props.height ? Math.round(props.height / 3.5) : 1)) || 1;

          buildings.push({
            presetKey,
            name: props.name || `Gedung GeoJSON #${buildings.length + 1}`,
            position: new THREE.Vector3(cx, 0, cz),
            rotationY: 0,
            width,
            length,
            floorCount: Math.max(1, Math.min(12, floorCount)),
            floorHeight: 3.2,
            roofType: 'hip',
            roofOverhang: 1.2,
            wallMaterial: 'plaster',
            wallColor: '#f8fafc',
            roofMaterial: 'clay_tile'
          });
        }
      }
    }

    return { roads, buildings };
  }

  /**
   * Imports GeoJSON data directly into an active engine instance.
   */
  public static importGeoJSON(engine: Engine, geoJsonInput: string | object): GeoJSONImportResult {
    let data: any = geoJsonInput;
    if (typeof geoJsonInput === 'string') {
      try {
        data = JSON.parse(geoJsonInput);
      } catch (err) {
        throw new Error('Format GeoJSON tidak valid (gagal parsing JSON): ' + (err as Error).message);
      }
    }

    const { roads, buildings } = this.parseGeoJSON(data);

    let importedRoads = 0;
    let importedBuildings = 0;

    // Add road segments
    for (const r of roads) {
      const edge = engine.roadManager.addRoad(r.start, r.end, r.type);
      if (edge) importedRoads++;
    }

    // Add building instances
    for (const b of buildings) {
      const catalogItem = PREFAB_CATALOG[b.presetKey || 'house_36'];
      const buildingInstance: BuildingInstance = {
        id: `bld_geojson_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        presetKey: b.presetKey || 'house_36',
        name: b.name || catalogItem?.name || 'Gedung GeoJSON',
        category: catalogItem?.category || 'residential',
        position: b.position || new THREE.Vector3(0, 0, 0),
        rotationY: b.rotationY || 0,
        width: b.width || catalogItem?.defaultWidth || 8,
        length: b.length || catalogItem?.defaultLength || 10,
        floorCount: b.floorCount || catalogItem?.defaultFloorCount || 1,
        floorHeight: b.floorHeight || catalogItem?.floorHeight || 3.2,
        roofType: b.roofType || catalogItem?.defaultRoofType || 'hip',
        roofOverhang: b.roofOverhang || catalogItem?.defaultRoofOverhang || 1.2,
        wallMaterial: b.wallMaterial || catalogItem?.defaultWallMaterial || 'plaster',
        wallColor: b.wallColor || catalogItem?.defaultWallColor || '#f8fafc',
        roofMaterial: b.roofMaterial || catalogItem?.defaultRoofMaterial || 'clay_tile'
      };

      engine.buildingManager.addBuilding(buildingInstance);
      importedBuildings++;
    }

    return { importedRoads, importedBuildings };
  }

  /**
   * Exports full project to a standalone `.arscity` file.
   */
  public static exportToArscity(engine: Engine, projectName: string = 'Proyek_Arscity'): string {
    const cityData = CitySerializer.serializeCity(engine);
    const project: ArscityProjectFile = {
      format: 'arscity',
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      projectName,
      cityData
    };
    return JSON.stringify(project, null, 2);
  }

  /**
   * Imports a `.arscity` file content into the engine.
   */
  public static async importFromArscity(engine: Engine, arscityContent: string | object): Promise<boolean> {
    let project: any = arscityContent;
    if (typeof arscityContent === 'string') {
      try {
        project = JSON.parse(arscityContent);
      } catch (err) {
        throw new Error('Berkas .arscity tidak valid: ' + (err as Error).message);
      }
    }

    const cityData = project?.cityData || project;
    const res = await CitySerializer.deserializeCity(engine, cityData);
    return res.success;
  }

  /**
   * Universal file importer: automatically detects GeoJSON or .arscity format.
   */
  public static async importFromFile(
    file: File,
    engine: Engine
  ): Promise<{ type: 'geojson' | 'arscity'; roadsCount: number; buildingsCount: number }> {
    const text = await file.text();
    const isArscity = file.name.endsWith('.arscity') || text.includes('"format": "arscity"') || text.includes('"cityTitle":');

    if (isArscity) {
      await this.importFromArscity(engine, text);
      return {
        type: 'arscity',
        roadsCount: engine.roadManager.graph.edges.size,
        buildingsCount: engine.buildingManager.buildings.size
      };
    } else {
      const res = this.importGeoJSON(engine, text);
      return {
        type: 'geojson',
        roadsCount: res.importedRoads,
        buildingsCount: res.importedBuildings
      };
    }
  }
}
