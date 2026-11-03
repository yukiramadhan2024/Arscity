import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  FIRST_PERSON_FURNITURE_CATALOG,
  FirstPersonFurnitureBuilder,
  FurnitureCatalogItem
} from '../src/buildings/FirstPersonFurnitureCatalog';
import { CitySerializer, CitySaveData } from '../src/io/CitySerializer';
import { PlacedFurnitureData, MoveFurnitureCommand, RemoveFurnitureCommand } from '../src/core/commands/CityCommands';

describe('Tahap 4 (T4.1 - T4.4): Perabot Berpermukaan dan Magnet Kursi', () => {
  // =========================================================================
  // T4.1: MODEL DATA & MIGRASI SKEMA
  // =========================================================================
  describe('T4.1: Model data (Slots, ParentId & Legacy Migration)', () => {
    it('1. Catalog items specify allowedSlots per furniture type', () => {
      const tabletopItems = FIRST_PERSON_FURNITURE_CATALOG.filter((f) =>
        f.allowedSlots?.includes('tabletop')
      );
      expect(tabletopItems.length).toBeGreaterThanOrEqual(4);
      expect(tabletopItems.some((f) => f.id === 'monitor_pc')).toBe(true);
      expect(tabletopItems.some((f) => f.id === 'coffee_machine')).toBe(true);
      expect(tabletopItems.some((f) => f.id === 'table_lamp')).toBe(true);
      expect(tabletopItems.some((f) => f.id === 'small_pot')).toBe(true);

      const wallItems = FIRST_PERSON_FURNITURE_CATALOG.filter((f) =>
        f.allowedSlots?.includes('wall')
      );
      expect(wallItems.length).toBeGreaterThanOrEqual(3);
      expect(wallItems.some((f) => f.id === 'painting_art')).toBe(true);
      expect(wallItems.some((f) => f.id === 'wall_sconce')).toBe(true);
      expect(wallItems.some((f) => f.id === 'wall_signage')).toBe(true);

      const floorItems = FIRST_PERSON_FURNITURE_CATALOG.filter((f) =>
        f.allowedSlots?.includes('floor')
      );
      expect(floorItems.length).toBeGreaterThanOrEqual(10);
      expect(floorItems.some((f) => f.id === 'sofa_l')).toBe(true);
      expect(floorItems.some((f) => f.id === 'desk_office')).toBe(true);
    });

    it('2. Desks, tables, and counters specify top surface metadata', () => {
      const surfaceDesks = FIRST_PERSON_FURNITURE_CATALOG.filter((f) => f.hasTopSurface);
      expect(surfaceDesks.length).toBeGreaterThanOrEqual(4);

      const desk = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'desk_office');
      expect(desk).toBeDefined();
      expect(desk?.hasTopSurface).toBe(true);
      expect(desk?.topSurfaceHeight).toBeCloseTo(0.74, 2);
      expect(desk?.topSurfaceBounds).toBeDefined();
      expect(desk?.topSurfaceBounds?.width).toBeGreaterThan(1.0);
      expect(desk?.topSurfaceBounds?.depth).toBeGreaterThan(0.5);

      const dining = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'dining_set');
      expect(dining?.hasTopSurface).toBe(true);
      expect(dining?.topSurfaceHeight).toBeCloseTo(0.75, 2);

      const bar = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === 'bar_counter');
      expect(bar?.hasTopSurface).toBe(true);
      expect(bar?.topSurfaceHeight).toBeCloseTo(0.90, 2);
    });

    it('3. Migrates legacy city save files without slot to "floor" and upgrades schema version to 2.1.0', () => {
      const legacySave = {
        version: '2.0.0',
        cityTitle: 'Kota Lawas',
        timestamp: 1700000000000,
        environment: { timeOfDay: 12, dayOfYear: 100 },
        roads: { nodes: [], edges: [] },
        buildings: [
          {
            id: 'bld_legacy_1',
            presetKey: 'house_36',
            name: 'Rumah Warisan',
            position: [0, 0, 0],
            rotationY: 0,
            placedFurniture: [
              {
                id: 'fur_1',
                type: 'sofa_l',
                name: 'Sofa Lawas',
                position: [1, 0, 1],
                rotationY: 0,
                floorIndex: 1
                // No slot or parentId property
              },
              {
                id: 'fur_2',
                type: 'desk_office',
                name: 'Meja Lawas',
                position: [2, 0, 2],
                rotationY: 0,
                floorIndex: 1
              }
            ]
          }
        ],
        lots: []
      };

      const migrated = CitySerializer.migrateCityData(legacySave);
      expect(migrated.version).toBe('2.1.0');

      const bld = migrated.buildings[0];
      expect(bld.placedFurniture).toBeDefined();
      expect(bld.placedFurniture).toHaveLength(2);
      expect(bld.placedFurniture![0].slot).toBe('floor');
      expect(bld.placedFurniture![1].slot).toBe('floor');
      expect(bld.placedFurniture![0].parentId).toBeUndefined();
    });

    it('4. Preserves existing slot and parentId when migrating or serializing', () => {
      const modernSave = {
        version: '2.1.0',
        cityTitle: 'Kota Modern',
        timestamp: 1700000000000,
        environment: { timeOfDay: 12, dayOfYear: 100 },
        roads: { nodes: [], edges: [] },
        buildings: [
          {
            id: 'bld_mod_1',
            presetKey: 'office_tower',
            name: 'Menara Kantor',
            position: [0, 0, 0],
            rotationY: 0,
            placedFurniture: [
              {
                id: 'fur_desk',
                type: 'desk_office',
                name: 'Meja Kerja',
                position: [0, 0, 0],
                rotationY: 0,
                floorIndex: 1,
                slot: 'floor'
              },
              {
                id: 'fur_monitor',
                type: 'monitor_pc',
                name: 'Monitor PC',
                position: [0, 0.74, 0],
                rotationY: 0,
                floorIndex: 1,
                slot: 'tabletop',
                parentId: 'fur_desk'
              },
              {
                id: 'fur_art',
                type: 'painting_art',
                name: 'Lukisan Dinding',
                position: [0, 1.5, -4],
                rotationY: 0,
                floorIndex: 1,
                slot: 'wall'
              }
            ]
          }
        ],
        lots: []
      };

      const migrated = CitySerializer.migrateCityData(modernSave);
      expect(migrated.version).toBe('2.1.0');
      const furList = migrated.buildings[0].placedFurniture;
      expect(furList).toBeDefined();
      expect(furList![0].slot).toBe('floor');
      expect(furList![1].slot).toBe('tabletop');
      expect(furList![1].parentId).toBe('fur_desk');
      expect(furList![2].slot).toBe('wall');
    });
  });
});
