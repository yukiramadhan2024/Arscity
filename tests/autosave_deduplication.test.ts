import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDBStorage } from '../src/io/IndexedDBStorage';
import { useUIStore } from '../src/ui/state/useUIStore';
import fs from 'fs';
import path from 'path';

if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

describe('Tahap 4 & Tahap 3: Autosave, Deduplication & UI Balance Tests', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    useUIStore.setState({
      activeCityId: 'empty_map',
      hasUnsavedChanges: false,
      activeMapName: 'Map Kosong Baru',
    });
  });

  it('IndexedDBStorage deduplicates saved maps list with identical city names, keeping the newest', async () => {
    // Mock saveSlot / saveMapById items in fallback storage
    const now = Date.now();
    const city1Old = {
      version: '2.0.0',
      cityTitle: 'Kota Tropis Nusantara',
      timestamp: now - 10000,
      environment: { timeOfDay: 9, dayOfYear: 172, weather: 'clear' },
      roads: { nodes: [], edges: [] },
      buildings: [{ id: 'b1' }],
      customBuildings: [],
      lots: [],
      landscape: [],
      displaySettings: {},
    };

    const city1New = {
      version: '2.0.0',
      cityTitle: 'Kota Tropis Nusantara',
      timestamp: now - 1000,
      environment: { timeOfDay: 12, dayOfYear: 172, weather: 'clear' },
      roads: { nodes: [], edges: [] },
      buildings: [{ id: 'b1' }, { id: 'b2' }],
      customBuildings: [],
      lots: [],
      landscape: [],
      displaySettings: {},
    };

    const city2Distinct = {
      version: '2.0.0',
      cityTitle: 'Malioboro Heritage',
      timestamp: now - 5000,
      environment: { timeOfDay: 16, dayOfYear: 172, weather: 'clear' },
      roads: { nodes: [], edges: [] },
      buildings: [],
      customBuildings: [],
      lots: [],
      landscape: [],
      displaySettings: {},
    };

    // Save under two different slot IDs but identical title "Kota Tropis Nusantara"
    await IndexedDBStorage.saveMapById('map_old_1', 'Kota Tropis Nusantara', city1Old as any);
    await IndexedDBStorage.saveMapById('map_new_1', 'Kota Tropis Nusantara', city1New as any);
    await IndexedDBStorage.saveMapById('map_distinct_2', 'Malioboro Heritage', city2Distinct as any);

    const list = await IndexedDBStorage.listSavedMaps();

    // Verify deduplication: only 2 entries should remain (not 3)
    const nusantaraEntries = list.filter(
      (m) => m.name.toLowerCase() === 'kota tropis nusantara'
    );
    expect(nusantaraEntries.length).toBe(1);
    expect(nusantaraEntries[0].id).toBe('map_new_1');
    expect(nusantaraEntries[0].buildingCount).toBe(2);

    const distinctEntries = list.filter(
      (m) => m.name.toLowerCase() === 'malioboro heritage'
    );
    expect(distinctEntries.length).toBe(1);
  });

  it('useUIStore tracks activeCityId and hasUnsavedChanges flag properly', () => {
    const store = useUIStore.getState();
    expect(store.hasUnsavedChanges).toBe(false);

    store.setHasUnsavedChanges(true);
    expect(useUIStore.getState().hasUnsavedChanges).toBe(true);

    store.setActiveCityId('custom_map_123');
    expect(useUIStore.getState().activeCityId).toBe('custom_map_123');

    store.setHasUnsavedChanges(false);
    expect(useUIStore.getState().hasUnsavedChanges).toBe(false);
  });

  it('SideUtilityDock is centered vertically (top: 50%, translateY(-50%)) and logo wrapper is borderless', () => {
    const sideDockContent = fs.readFileSync(
      path.resolve(__dirname, '../src/ui/components/SideUtilityDock.tsx'),
      'utf8'
    );

    // Verify vertical centering
    expect(sideDockContent).toContain("top: '50%'");
    expect(sideDockContent).toContain("transform: 'translateY(-50%)'");
    expect(sideDockContent).toContain("left: '16px'");
    expect(sideDockContent).toContain("zIndex: 950");

    // Verify logo size 30 and no circle background / border
    expect(sideDockContent).toContain('<ArscityLogo size={30} iconOnly variant="dark" />');
    expect(sideDockContent).not.toContain("borderRadius: '9999px'");
  });

  it('LoginPage.tsx has size 36 logo and no Sparkles icon in Buat Kota Baru button', () => {
    const loginPageContent = fs.readFileSync(
      path.resolve(__dirname, '../src/ui/components/LoginPage.tsx'),
      'utf8'
    );

    expect(loginPageContent).toContain('<ArscityLogo size={36}');
    expect(loginPageContent).not.toContain('<Sparkles');
    expect(loginPageContent).toContain('<span>Buat Kota Baru</span>');
    expect(loginPageContent).toContain('ArrowRight');
  });

  it('SettingsModal.tsx uses 50:50 pastel styling with high contrast text and no glow', () => {
    const settingsContent = fs.readFileSync(
      path.resolve(__dirname, '../src/ui/components/SettingsModal.tsx'),
      'utf8'
    );

    // Modal background is Seal Blue gradient
    expect(settingsContent).toContain('#DBF2FC');
    expect(settingsContent).toContain('#072D59');
    // Group container background is white (#FFFFFF) with high contrast Navy labels
    expect(settingsContent).toContain("background: '#FFFFFF'");
    expect(settingsContent).toContain("color: '#072D59'");
    expect(settingsContent).toContain("color: 'rgba(7, 45, 89, 0.70)'");
    // Done button is 3D pastel pink
    expect(settingsContent).toContain('btn-3d-pastel-pink');
  });

  it('BottomToolbar does not render ContextualHintBar text capsule above navbar', () => {
    const toolbarContent = fs.readFileSync(
      path.resolve(__dirname, '../src/ui/components/BottomToolbar.tsx'),
      'utf8'
    );

    expect(toolbarContent).not.toContain('<ContextualHintBar');
    expect(toolbarContent).not.toContain('import { ContextualHintBar }');
  });
});
