import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { THEME_TOKENS, getContrastRatio } from '../src/ui/constants/themeTokens';
import { LandscapeManager } from '../src/world/LandscapeManager';
import { RiverManager } from '../src/world/RiverManager';
import fs from 'fs';
import path from 'path';

describe('Arscity Dark Mode & Water Placement Regression Tests', () => {
  describe('1. WCAG AA Contrast Verification', () => {
    it('Dark theme: label on surface satisfies WCAG AA (>= 4.5:1)', () => {
      const dark = THEME_TOKENS.dark;
      const ratio = getContrastRatio(dark.label, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('Dark theme: label on surfaceRaised satisfies WCAG AA (>= 4.5:1)', () => {
      const dark = THEME_TOKENS.dark;
      const ratio = getContrastRatio(dark.label, dark.surfaceRaised);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('Dark theme: accent on surface satisfies UI component threshold (>= 3.0:1)', () => {
      const dark = THEME_TOKENS.dark;
      const ratio = getContrastRatio(dark.accent, dark.surface);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    it('Dark theme: status indicators (good, warn, bad) satisfy UI threshold (>= 3.0:1)', () => {
      const dark = THEME_TOKENS.dark;
      expect(getContrastRatio(dark.good, dark.surface)).toBeGreaterThanOrEqual(3.0);
      expect(getContrastRatio(dark.warn, dark.surface)).toBeGreaterThanOrEqual(3.0);
      expect(getContrastRatio(dark.bad, dark.surface)).toBeGreaterThanOrEqual(3.0);
    });

    it('Light theme: label on surface satisfies WCAG AA (>= 4.5:1)', () => {
      const light = THEME_TOKENS.light;
      const ratio = getContrastRatio(light.label, light.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('2. Anti-Literal Color Verification in Key UI Components', () => {
    it('TopHeader.tsx uses theme tokens for time and fps rather than hardcoded #0F172A', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/TopHeader.tsx'), 'utf-8');
      expect(content).not.toContain("color: '#0F172A'");
      expect(content).toContain("color: 'var(--label)'");
      expect(content).toContain("background: 'var(--fill-control)'");
    });

    it('BottomToolbar.tsx uses semantic tokens for inactive tools, Undo, and Redo', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/BottomToolbar.tsx'), 'utf-8');
      // Inactive tool buttons must not have hardcoded #334155
      expect(content).not.toContain("color: isActive ? '#007AFF' : '#334155'");
      expect(content).toContain("color: isActive ? 'var(--on-accent)' : 'var(--label-on-navy)'");
      expect(content).not.toContain("background: 'var(--separator)'");
    });

    it('ContextualHintBar.tsx uses glass token surface rather than hardcoded white background', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/ContextualHintBar.tsx'), 'utf-8');
      expect(content).not.toContain("background: 'rgba(255, 255, 255, 0.92)'");
      expect(content).toContain("background: 'var(--surface)'");
      expect(content).toContain("color: 'var(--label)'");
      expect(content).toContain("color: 'var(--accent)'");
    });

    it('Minimap.tsx adapts canvas background and roads to dark mode', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/Minimap.tsx'), 'utf-8');
      expect(content).toContain("isDark ? '#1C1C1E' : '#EEF4FA'");
      expect(content).toContain("isDark ? '#64748B' : '#475569'");
      expect(content).toContain("isDark ? '#38BDF8' : '#0F172A'");
      expect(content).not.toContain("background: 'rgba(255, 255, 255, 0.94)'");
    });

    it('SideUtilityDock.tsx has interactive ArscityLogo toggle and hotkey [ support', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/SideUtilityDock.tsx'), 'utf-8');
      expect(content).toContain("e.key === '['");
      expect(content).toContain('Kembali ke Layar Awal');
      expect(content).toContain('showExitConfirm');
    });
  });

  describe('3. Water Placement Prevention', () => {
    it('LandscapeManager accurately identifies retention pond coordinates as water', () => {
      const scene = new THREE.Scene();
      const lm = new LandscapeManager(scene);

      lm.createItem('retention_pond', new THREE.Vector3(50, 0, 50), { width: 16, length: 16 });

      // Inside pond
      expect(lm.isPositionInWater(50, 50)).toBe(true);
      expect(lm.isPositionInWater(55, 55)).toBe(true);

      // Outside pond
      expect(lm.isPositionInWater(100, 100)).toBe(false);
      expect(lm.isPositionInWater(0, 0)).toBe(false);
    });

    it('RiverManager accurately detects points falling within river segments', () => {
      const scene = new THREE.Scene();
      const rm = new RiverManager(scene);

      rm.addRiverSegment(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(100, 0, 0),
        'urban_river'
      );

      // On river axis
      expect(rm.isPointInRiver(50, 0)).toBe(true);
      expect(rm.isPointInRiver(20, 2)).toBe(true);

      // Far outside river
      expect(rm.isPointInRiver(50, 50)).toBe(false);
      expect(rm.isPointInRiver(200, 200)).toBe(false);
    });
  });

  describe('4. Foliage & Rendering Enhancements', () => {
    it('Tabebuya builder uses subdued tropical green rather than pink blossoms', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/world/AestheticLandscapeBuilder.ts'), 'utf-8');
      expect(content).not.toContain('0xdf98a8');
      expect(content).toContain('0x4a7c59');
    });

    it('Engine uses ACESFilmicToneMapping for UE5 photorealistic lighting', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/core/engine/Engine.ts'), 'utf-8');
      expect(content).toContain('THREE.ACESFilmicToneMapping');
      expect(content).toContain('1.05');
    });

    it('LotManager creates enlarged, roof-elevated 3D violation badges', () => {
      const content = fs.readFileSync(path.resolve(__dirname, '../src/zones/LotManager.ts'), 'utf-8');
      expect(content).toContain('badgeCanvas.width = 768');
      expect(content).toContain('badgeCanvas.height = 144');
      expect(content).toContain('Math.max(5.0, buildingH + 2.5)');
    });
  });
});
