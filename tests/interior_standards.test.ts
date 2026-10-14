import { describe, it, expect } from 'vitest';
import { roomStandardsRegistry, DEFAULT_ROOM_STANDARDS } from '../src/buildings/RoomStandards';
import { InteriorLayoutFactory } from '../src/buildings/InteriorLayoutFactory';
import { RoomDefinition } from '../src/buildings/InteriorTypes';
import * as THREE from 'three';

describe('T5.1: Interior & Floor Plan Architectural Standards', () => {
  it('evaluates room compliance correctly against SNI 03-1733 and Permen PUPR', () => {
    const validBedroom: RoomDefinition = {
      id: 'bed_1',
      name: 'Kamar Tidur Utama',
      type: 'bedroom',
      floorIndex: 0,
      boundary: [new THREE.Vector2(0, 0), new THREE.Vector2(3, 0), new THREE.Vector2(3, 3), new THREE.Vector2(0, 3)],
      areaM2: 9.0,
      ceilingHeight: 2.8,
      labelPosition: new THREE.Vector2(1.5, 1.5),
      isCompliant: true
    };

    const res = roomStandardsRegistry.evaluateRoomCompliance(validBedroom);
    expect(res.isCompliant).toBe(true);

    const substandardBedroom: RoomDefinition = {
      ...validBedroom,
      areaM2: 5.5, // Less than 9.0 m² minimum
    };
    const subRes = roomStandardsRegistry.evaluateRoomCompliance(substandardBedroom);
    expect(subRes.isCompliant).toBe(false);
    expect(subRes.note).toContain('kurang dari standar minimum');
  });

  it('detects substandard ceiling height according to tropical comfort standards', () => {
    const lowCeilingRoom: RoomDefinition = {
      id: 'bed_2',
      name: 'Kamar Tidur Rendah',
      type: 'bedroom',
      floorIndex: 0,
      boundary: [],
      areaM2: 10.0,
      ceilingHeight: 2.1, // Less than 2.6 m minimum
      labelPosition: new THREE.Vector2(0, 0),
      isCompliant: true
    };

    const res = roomStandardsRegistry.evaluateRoomCompliance(lowCeilingRoom);
    expect(res.isCompliant).toBe(false);
    expect(res.note).toContain('Tinggi plafon');
  });

  it('generates authentic Indonesian layouts for house_36, house_54, joglo, and ruko', () => {
    const house36Layouts = InteriorLayoutFactory.getLayoutForBuilding('house_36', 6, 6, 3.2, 1);
    expect(house36Layouts).toHaveLength(1);
    expect(house36Layouts[0].rooms.length).toBeGreaterThanOrEqual(4);

    const roomNames = house36Layouts[0].rooms.map(r => r.name);
    expect(roomNames.some(n => n.includes('Kamar Tidur'))).toBe(true);
    expect(roomNames.some(n => n.includes('Ruang Tamu') || n.includes('Keluarga'))).toBe(true);

    // Joglo layout should feature Pendopo / Omah Ageng
    const jogloLayouts = InteriorLayoutFactory.getLayoutForBuilding('joglo', 10, 10, 3.8, 1);
    expect(jogloLayouts[0].rooms.some(r => r.name.includes('Pendopo') || r.name.includes('Senthong'))).toBe(true);
  });

  it('allows dynamic updating of room standard thresholds in registry', () => {
    roomStandardsRegistry.updateStandard('bedroom', { minAreaM2: 12.0 });
    expect(roomStandardsRegistry.getStandard('bedroom').minAreaM2).toBe(12.0);

    roomStandardsRegistry.resetToDefaults();
    expect(roomStandardsRegistry.getStandard('bedroom').minAreaM2).toBe(DEFAULT_ROOM_STANDARDS.bedroom.minAreaM2);
  });
});
