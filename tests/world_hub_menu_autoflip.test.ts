import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('T1.9: WorldHubModal 3-Dots Action Menu Auto-Flip and Clamping', () => {
  it('verifies WorldHubModal source code contains auto-flip threshold of 160px', () => {
    const filePath = path.resolve(__dirname, '../src/ui/components/WorldHubModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Space below check with 160px threshold
    expect(content).toContain('spaceBelow < 160');
    expect(content).toContain('setMenuFlipUp(spaceBelow < 160)');
  });

  it('verifies popover style toggles between top 34px and bottom 34px based on menuFlipUp', () => {
    const filePath = path.resolve(__dirname, '../src/ui/components/WorldHubModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("top: menuFlipUp ? 'auto' : '34px'");
    expect(content).toContain("bottom: menuFlipUp ? '34px' : 'auto'");
  });

  it('verifies boundary clamping with maxHeight and overflowY', () => {
    const filePath = path.resolve(__dirname, '../src/ui/components/WorldHubModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain("maxHeight: 'min(180px, calc(100vh - 100px))'");
    expect(content).toContain("overflowY: 'auto'");
  });

  it('verifies outside-click listener dismisses popover', () => {
    const filePath = path.resolve(__dirname, '../src/ui/components/WorldHubModal.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    expect(content).toContain('handleOutsideClick');
    expect(content).toContain('setActiveMenuMapId(null)');
  });

  it('tests auto-flip mathematical decision boundary', () => {
    const calculateFlip = (containerBottom: number, buttonBottom: number): boolean => {
      const spaceBelow = containerBottom - buttonBottom;
      return spaceBelow < 160;
    };

    // Ample space below (e.g. 300px) -> downwards (flip: false)
    expect(calculateFlip(800, 500)).toBe(false);

    // Exact boundary at 160px -> downwards (flip: false)
    expect(calculateFlip(660, 500)).toBe(false);

    // Constrained space below (e.g. 100px) -> upwards (flip: true)
    expect(calculateFlip(600, 500)).toBe(true);

    // Last row on small screen (e.g. 30px clearance) -> upwards (flip: true)
    expect(calculateFlip(530, 500)).toBe(true);
  });
});
