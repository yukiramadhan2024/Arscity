import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DSLR_LENS_MAP, DslrLensType } from '../src/core/engine/CinematicDroneController';

describe('T1.8: Mode Foto Arsitektur Unifikasi Bar & 35mm Lens', () => {
  it('supports all 4 DSLR lenses including 35mm in DSLR_LENS_MAP', () => {
    const expectedLenses: DslrLensType[] = ['24mm', '35mm', '50mm', '85mm'];
    expectedLenses.forEach((lens) => {
      expect(DSLR_LENS_MAP[lens]).toBeDefined();
      expect(DSLR_LENS_MAP[lens].fov).toBeGreaterThan(0);
      expect(typeof DSLR_LENS_MAP[lens].name).toBe('string');
      expect(typeof DSLR_LENS_MAP[lens].desc).toBe('string');
    });

    expect(DSLR_LENS_MAP['35mm'].fov).toBe(63);
    expect(DSLR_LENS_MAP['35mm'].name).toContain('35mm');
  });

  it('verifies FirstPersonHUD restricts photo mode to first-person and drone modes', () => {
    const fpHudPath = path.resolve(__dirname, '../src/ui/components/FirstPersonHUD.tsx');
    const content = fs.readFileSync(fpHudPath, 'utf-8');

    // Ensure FirstPersonHUD gates photo viewfinder and bottom bar
    expect(content).toContain('{isPhotoMode && (isFirstPerson || isDrone) && (');

    // Ensure FirstPersonHUD returns null when not in first person, drone, or recording video
    expect(content).toContain('if (!isFirstPerson && !isDrone && !isRecordingVideo) {');
  });

  it('verifies FirstPersonHUD contains 35mm lens in the lens list and unified Ambil Foto PNG button', () => {
    const fpHudPath = path.resolve(__dirname, '../src/ui/components/FirstPersonHUD.tsx');
    const content = fs.readFileSync(fpHudPath, 'utf-8');

    // Lens selector contains all 4 lenses
    expect(content).toContain("'24mm', '35mm', '50mm', '85mm'");

    // Shutter button label is Ambil Foto PNG
    expect(content).toContain('<span>Ambil Foto PNG</span>');
  });

  it('verifies PhotoModeOverlay is restricted to orbit mode only, preventing duplicate bars', () => {
    const photoOverlayPath = path.resolve(__dirname, '../src/ui/components/PhotoModeOverlay.tsx');
    const content = fs.readFileSync(photoOverlayPath, 'utf-8');

    expect(content).toContain("if (!isPhotoMode || cameraMode !== 'orbit') return null;");
  });
});
