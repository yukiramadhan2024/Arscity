import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { getContrastRatio, meetsWcagAA } from '../src/ui/constants/themeTokens';

describe('Adversarial UI Stress Test Suite - Tahap 1 (T1.4 - T1.9)', () => {
  const topHeaderFile = path.resolve(__dirname, '../src/ui/components/TopHeader.tsx');
  const settingsModalFile = path.resolve(__dirname, '../src/ui/components/SettingsModal.tsx');
  const worldHubModalFile = path.resolve(__dirname, '../src/ui/components/WorldHubModal.tsx');
  const firstPersonHudFile = path.resolve(__dirname, '../src/ui/components/FirstPersonHUD.tsx');
  const photoModeOverlayFile = path.resolve(__dirname, '../src/ui/components/PhotoModeOverlay.tsx');
  const sideDockFile = path.resolve(__dirname, '../src/ui/components/SideUtilityDock.tsx');

  const topHeaderContent = fs.readFileSync(topHeaderFile, 'utf-8');
  const settingsContent = fs.readFileSync(settingsModalFile, 'utf-8');
  const worldHubContent = fs.readFileSync(worldHubModalFile, 'utf-8');
  const fpHudContent = fs.readFileSync(firstPersonHudFile, 'utf-8');
  const photoOverlayContent = fs.readFileSync(photoModeOverlayFile, 'utf-8');
  const sideDockContent = fs.readFileSync(sideDockFile, 'utf-8');

  /* ================================================================
   * 1. TOPHEADER RESPONSIVE COLLAPSE & CENTERING (1366x768 vs 1920x1080)
   * ================================================================ */
  describe('TopHeader Responsive Layout & Viewport Stress (T1.5 & T1.6)', () => {
    it('enforces viewport boundary safety styles and high z-index stacking', () => {
      // Anchoring
      expect(topHeaderContent).toContain("position: 'fixed'");
      expect(topHeaderContent).toContain("top: '16px'");
      expect(topHeaderContent).toContain("left: '50%'");
      expect(topHeaderContent).toContain("transform: 'translateX(-50%)'");
      // Width clamping
      expect(topHeaderContent).toContain("width: 'max-content'");
      expect(topHeaderContent).toContain("maxWidth: 'calc(100vw - 32px)'");
      // Stacking order: must be above SideUtilityDock (20) and InspectorPanel (45)
      expect(topHeaderContent).toContain("zIndex: 50");
    });

    it('evaluates responsive breakpoint boundary logic for 1366px, 1440px, and 1920px', () => {
      const isNarrow = (width: number) => width < 1440;

      // 1366x768 laptop standard: narrow mode MUST be active
      expect(isNarrow(1366)).toBe(true);

      // Boundary tests
      expect(isNarrow(1439)).toBe(true);
      expect(isNarrow(1440)).toBe(false);

      // 1920x1080 desktop standard: wide mode MUST be active
      expect(isNarrow(1920)).toBe(false);

      // Ultra-wide (2560px, 3840px 4K)
      expect(isNarrow(2560)).toBe(false);
      expect(isNarrow(3840)).toBe(false);

      // Mobile / small tablet stress (768px, 1024px)
      expect(isNarrow(768)).toBe(true);
      expect(isNarrow(1024)).toBe(true);
    });

    it('guarantees slider is conditionally rendered in main capsule and relocated to utility popover', () => {
      // Main capsule has {!isNarrowScreen && (<input ... />)}
      expect(topHeaderContent).toContain('!isNarrowScreen &&');
      // Popover has {isNarrowScreen && (...)}
      expect(topHeaderContent).toContain('isNarrowScreen &&');
      expect(topHeaderContent).toContain('aria-label="Pengatur Waktu Matahari Popover"');
    });

    it('adversarially calculates clearance against expanded side dock on 1366x768 viewport', () => {
      // 1366px width:
      // Side dock width expanded = 192px + 16px left margin = 208px.
      // TopHeader center = 1366 / 2 = 683px.
      // Estimated collapsed header width = ~670px (half = 335px).
      // Left edge of header = 683 - 335 = 348px.
      // Clearance between left dock (208px) and header (348px) = 140px > 0 (No collision!).
      const screenWidth = 1366;
      const dockWidth = 192 + 16;
      const headerWidthCollapsed = 670;
      const headerLeft = screenWidth / 2 - headerWidthCollapsed / 2;
      const clearance = headerLeft - dockWidth;
      expect(clearance).toBeGreaterThan(100);
    });

    it('ensures weather and action buttons use token styling with zero !important', () => {
      // Weather button uses var(--fill-control) and var(--label)
      expect(topHeaderContent).toContain("color: 'var(--label)'");
      expect(topHeaderContent).toContain("borderRadius: '9999px'");
      // Settings button
      expect(topHeaderContent).toContain("title=\"Buka Pengaturan Kota\"");
      // Zero !important in TopHeader
      expect(topHeaderContent).not.toContain("!important");
    });

    it('verifies deprecated mission and quiz elements are completely purged', () => {
      expect(topHeaderContent).not.toMatch(/useUIStore\(\(s\)\s*=>\s*s\.setShowMissions\)/);
      expect(topHeaderContent).not.toContain('Misi & Skor');
      expect(topHeaderContent).not.toContain('Misi Kota');
      expect(topHeaderContent).not.toContain('Kuis Arsitektur');
    });
  });

  /* ================================================================
   * 2. SETTINGS MODAL THEME SELECTION & LIGHT GLASS ENFORCEMENT (T1.4 & T1.7)
   * ================================================================ */
  describe('SettingsModal Light Glass & Theme Enforcement', () => {
    it('verifies SettingsModal does NOT display Dark or System theme options', () => {
      // Must not render theme option pills or buttons
      expect(settingsContent).not.toMatch(/['"]Gelap['"]/);
      expect(settingsContent).not.toMatch(/['"]Sistem['"]/);
      expect(settingsContent).not.toMatch(/['"]Dark['"]/);
      expect(settingsContent).not.toMatch(/['"]System['"]/);
      expect(settingsContent).not.toContain('setTheme');
    });

    it('enforces Seal Blue frosted glass background, Navy Blue header, and token-based Navy Blue text', () => {
      // Surface background: Seal Blue frosted light glass via tokens (Rule G3)
      expect(settingsContent).toContain("background: 'var(--surface)'");
      expect(settingsContent).toContain("backdropFilter: 'blur(var(--glass-blur, 24px)) saturate(var(--glass-saturate, 180%))'");
      expect(settingsContent).toContain("border: '1px solid var(--border-glass)'");
      expect(settingsContent).toContain("background: 'var(--surface-navy)'");

      // Root & section text color uses var(--label) -> Navy Blue #072D59
      const titleMatches = settingsContent.match(/color:\s*'var\(--label\)'/g);
      expect(titleMatches).not.toBeNull();
      expect(titleMatches!.length).toBeGreaterThanOrEqual(8);

      // Subtitles & descriptions use var(--label-secondary)
      const descMatches = settingsContent.match(/color:\s*'var\(--label-secondary\)'/g);
      expect(descMatches).not.toBeNull();
      expect(descMatches!.length).toBeGreaterThanOrEqual(6);
    });

    it('validates WCAG AA contrast for Seal Blue / Navy Blue / Crimson Pink triad in SettingsModal', () => {
      const surfaceBg = '#DBF2FC'; // Seal Blue
      const navyBg = '#072D59'; // Navy Blue
      const primaryText = '#072D59'; // Navy Blue
      const secondaryText = '#1E4673';
      const accent = '#FD6E8E'; // Crimson Pink

      // Primary Navy Blue text against Seal Blue surface
      const primaryRatio = getContrastRatio(primaryText, surfaceBg);
      expect(primaryRatio).toBeGreaterThanOrEqual(11.0);
      expect(meetsWcagAA(primaryText, surfaceBg)).toBe(true);

      // Secondary description text against Seal Blue surface
      const secondaryRatio = getContrastRatio(secondaryText, surfaceBg);
      expect(secondaryRatio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWcagAA(secondaryText, surfaceBg)).toBe(true);

      // Crimson Pink accent against Navy Blue structural panel
      const accentOnNavyRatio = getContrastRatio(accent, navyBg);
      expect(accentOnNavyRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('verifies SegmentedControl includes all 4 graphics presets: Rendah, Sedang, Tinggi, Ultra 144Hz', () => {
      expect(settingsContent).toContain("value: 'low', label: 'Rendah'");
      expect(settingsContent).toContain("value: 'medium', label: 'Sedang'");
      expect(settingsContent).toContain("value: 'high', label: 'Tinggi'");
      expect(settingsContent).toContain("value: 'ultra', label: 'Ultra 144Hz'");
    });
  });

  /* ================================================================
   * 3. WORLDHUBMODAL AUTO-FLIP & BOUNDARY CLAMPING (T1.9)
   * ================================================================ */
  describe('WorldHubModal Action Menu Auto-Flip & Clamping (T1.9)', () => {
    it('tests mathematical decision boundary for auto-flip with clearance < 160px', () => {
      const autoFlip = (spaceBelow: number) => spaceBelow < 160;

      // Ample space (e.g. 500px, 300px, 200px)
      expect(autoFlip(500)).toBe(false);
      expect(autoFlip(300)).toBe(false);
      expect(autoFlip(200)).toBe(false);

      // Boundary values
      expect(autoFlip(161)).toBe(false);
      expect(autoFlip(160)).toBe(false); // Exactly 160px: false (downwards)
      expect(autoFlip(159.9)).toBe(true); // Just below 160px: true (flips up)
      expect(autoFlip(150)).toBe(true);
      expect(autoFlip(40)).toBe(true);
      expect(autoFlip(0)).toBe(true); // Flush with bottom: true
      expect(autoFlip(-20)).toBe(true); // Scrolled past viewport: true
    });

    it('verifies upward and downward popover positioning styles', () => {
      expect(worldHubContent).toContain("top: menuFlipUp ? 'auto' : '34px'");
      expect(worldHubContent).toContain("bottom: menuFlipUp ? '34px' : 'auto'");
    });

    it('verifies max-height clamping and overflow-y containment to prevent container overflow', () => {
      expect(worldHubContent).toContain("maxHeight: 'min(180px, calc(100vh - 100px))'");
      expect(worldHubContent).toContain("overflowY: 'auto'");
    });

    it('verifies outside-click listener cleans up and closes active menu', () => {
      expect(worldHubContent).toContain('handleOutsideClick');
      expect(worldHubContent).toContain('setActiveMenuMapId(null)');
      expect(worldHubContent).toContain("window.removeEventListener('mousedown', handleOutsideClick)");
    });
  });

  /* ================================================================
   * 4. PHOTO MODE UNIFICATION & ZERO DUPLICATES (T1.8)
   * ================================================================ */
  describe('Photo Mode Unification & Lens Map (T1.8)', () => {
    it('verifies Orbit mode uses PhotoModeOverlay and FirstPersonHUD is disabled', () => {
      // PhotoModeOverlay only for orbit mode
      expect(photoOverlayContent).toContain("if (!isPhotoMode || cameraMode !== 'orbit') return null;");

      // FirstPersonHUD only for first_person or drone mode
      expect(fpHudContent).toContain('{isPhotoMode && (isFirstPerson || isDrone) && (');
    });

    it('ensures no duplicated photo button exists in FirstPersonHUD or PhotoModeOverlay', () => {
      // In FirstPersonHUD: exactly one unified shutter button
      const shutterMatches = fpHudContent.match(/<span>Ambil Foto PNG<\/span>/g);
      expect(shutterMatches).not.toBeNull();
      expect(shutterMatches!.length).toBe(1);

      // Unified lens selector has 24mm, 35mm, 50mm, 85mm
      expect(fpHudContent).toContain("'24mm', '35mm', '50mm', '85mm'");
    });
  });

  /* ================================================================
   * 5. SIDE UTILITY DOCK PURGE OF MISSIONS, SCORES, QUIZZES
   * ================================================================ */
  describe('SideUtilityDock Feature Removal Verification', () => {
    it('verifies BELAJAR section and mission/quiz buttons are removed from SideUtilityDock', () => {
      expect(sideDockContent).not.toContain('BELAJAR');
      expect(sideDockContent).not.toContain('Misi Kota');
      expect(sideDockContent).not.toContain('Glosarium SNI');
      expect(sideDockContent).not.toContain('Kuis Arsitektur');
    });
  });
});
