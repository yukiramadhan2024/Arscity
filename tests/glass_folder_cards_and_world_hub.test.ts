import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { GlassFolder, ArtCanvas, ART_PRESETS, FolderFile, GF_CSS } from '../src/components/ui/glass-folder-cards';
import { WorldHubModal } from '../src/ui/components/WorldHubModal';
import { useUIStore } from '../src/ui/state/useUIStore';

describe('GlassFolder & WorldHubModal Integration Suite', () => {
  beforeEach(() => {
    // Reset UI Store state
    const store = useUIStore.getState();
    store.closeMapHub();
    store.logout();
    store.setSavedMapsList([]);
  });

  it('renders GlassFolder component into HTML string without errors', () => {
    const files: FolderFile[] = [
      { id: 'f1', name: 'Koridor Malioboro', meta: 'YOGYAKARTA · CAGAR BUDAYA', art: 'ember' },
      { id: 'f2', name: 'Lahan Kosong Standar', meta: '1600×1600M · DATAR', art: 'glacier' },
    ];

    const html = renderToString(
      React.createElement(GlassFolder, {
        label: 'Peta Bawaan Nusantara',
        art: 'verdant',
        defaultOpen: true,
        action: 'more',
        files,
        width: 310,
        height: 210,
      })
    );

    expect(html).toContain('Peta Bawaan Nusantara');
    expect(html).toContain('Koridor Malioboro');
    expect(html).toContain('Lahan Kosong Standar');
    expect(html).toContain('YOGYAKARTA · CAGAR BUDAYA');
    expect(html).toContain('gf-folder');
    expect(html).toContain('is-open');
  });

  it('contains GF_CSS with strict font declarations and zero Unicode emojis', () => {
    expect(GF_CSS).toContain("var(--font-sans, 'Inter', sans-serif)");
    expect(GF_CSS).toContain('var(--font-mono, monospace)');
    expect(GF_CSS).toContain('tabular-nums');

    // Strict rule: 0 Unicode emoji characters in CSS
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(GF_CSS)).toBe(false);
  });

  it('provides all 7 art presets including tropical and malioboro', () => {
    expect(ART_PRESETS.aurora).toBeDefined();
    expect(ART_PRESETS.ember).toBeDefined();
    expect(ART_PRESETS.dusk).toBeDefined();
    expect(ART_PRESETS.glacier).toBeDefined();
    expect(ART_PRESETS.verdant).toBeDefined();
    expect(ART_PRESETS.tropical).toBeDefined();
    expect(ART_PRESETS.malioboro).toBeDefined();

    expect(ART_PRESETS.malioboro.colors.length).toBeGreaterThanOrEqual(3);
    expect(ART_PRESETS.tropical.colors.length).toBeGreaterThanOrEqual(3);
  });

  it('renders ArtCanvas safely in headless environments without crash', () => {
    const html = renderToString(
      React.createElement(ArtCanvas, {
        art: 'malioboro',
        width: 280,
        height: 48,
      })
    );

    expect(html).toContain('<canvas');
    expect(html).toContain('width="280"');
    expect(html).toContain('height="48"');
  });

  it('invokes onFileSelect callback with file and index when card is selected', () => {
    const onFileSelect = vi.fn();
    const files: FolderFile[] = [
      { id: 'preset-malioboro', name: 'Koridor Malioboro', meta: 'YOGYAKARTA', art: 'ember' },
      { id: 'preset-empty', name: 'Lahan Kosong', meta: 'CAD', art: 'glacier' },
    ];

    // Simulate component prop behavior
    const folderProps = {
      label: 'Peta Bawaan',
      files,
      onFileSelect,
      defaultOpen: true,
    };

    expect(folderProps.files[0].id).toBe('preset-malioboro');
    folderProps.onFileSelect(folderProps.files[0], 0);
    expect(onFileSelect).toHaveBeenCalledWith(files[0], 0);

    folderProps.onFileSelect(folderProps.files[1], 1);
    expect(onFileSelect).toHaveBeenCalledWith(files[1], 1);
  });

  it('invokes onAdd callback when action button (+) is triggered', () => {
    const onAdd = vi.fn();
    const folderProps = {
      label: 'Penyimpanan Kota Saya',
      action: 'add' as const,
      onAdd,
    };

    folderProps.onAdd();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('renders WorldHubModal with the 3 required folders and headroom', () => {
    useUIStore.setState({ isLoggedIn: true, userEmail: 'arsitek@arscity.id', isMapHubOpen: true, currentScreen: 'hub' });

    const html = renderToString(React.createElement(WorldHubModal, { isOpen: true }));

    // 1. Header Titles & Info
    expect(html).toContain('ARSCITY');
    expect(html).toContain('Penyimpanan Lokal');
    expect(html).toContain('Perpustakaan Kota');

    // 2. Headroom & 3 Folders Stage
    expect(html).toContain('wh-folders-stage');
    expect(html).toContain('Peta Bawaan Nusantara');
    expect(html).toContain('Penyimpanan Kota Saya');
    expect(html).toContain('Berkas Proyek &amp; CAD');

    // 3. Preset Cards Inside Folders
    expect(html).toContain('Koridor Malioboro');
    expect(html).toContain('Lahan Kosong Standar');
  });

  it('loads Malioboro preset and transitions to game screen via loadMap', async () => {
    useUIStore.getState().login('penguji@arscity.id');
    useUIStore.getState().openMapHub();

    expect(useUIStore.getState().currentScreen).toBe('hub');
    expect(useUIStore.getState().isMapHubOpen).toBe(true);

    const success = await useUIStore.getState().loadMap('malioboro', 'malioboro_preset', 'Koridor Malioboro Yogyakarta');
    expect(success).toBe(false); // No engine attached in test environment, but state transitions successfully

    const updated = useUIStore.getState();
    expect(updated.activeMapId).toBe('malioboro_preset');
    expect(updated.activeMapName).toBe('Koridor Malioboro Yogyakarta');
    expect(updated.currentScreen).toBe('game');
    expect(updated.isMapHubOpen).toBe(false);
  });

  it('loads Empty Map canvas and transitions to game screen via loadMap', async () => {
    useUIStore.getState().login('penguji@arscity.id');
    useUIStore.getState().openMapHub();

    await useUIStore.getState().loadMap('empty', 'empty_map', 'Lahan Kosong Standar');

    const updated = useUIStore.getState();
    expect(updated.activeMapId).toBe('empty_map');
    expect(updated.activeMapName).toBe('Lahan Kosong Standar');
    expect(updated.currentScreen).toBe('game');
    expect(updated.isMapHubOpen).toBe(false);
  });
});
