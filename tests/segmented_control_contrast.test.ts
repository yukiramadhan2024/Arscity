import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('T1.7: SegmentedControl Graphics Preset Label Contrast & Active Pill', () => {
  const segControlPath = path.resolve(__dirname, '../src/ui/primitives/SegmentedControl.tsx');
  const segContent = fs.readFileSync(segControlPath, 'utf-8');

  it('Inactive options use var(--label) with fontWeight 600', () => {
    // Both active and inactive buttons have fontWeight 600 for high legibility
    expect(segContent).toContain('fontWeight: 600');
    expect(segContent).not.toContain('fontWeight: isSelected ? 600 : 500');

    // Inactive button text uses var(--label), active uses #FFFFFF
    expect(segContent).toContain("color: isSelected ? '#FFFFFF' : 'var(--label)'");
  });

  it('Active pill uses var(--accent) background with pure white text and accent shadow', () => {
    // Active pill background is var(--accent)
    expect(segContent).toContain("backgroundColor: 'var(--accent)'");

    // Active pill shadow has 0 2px 6px accent glow
    expect(segContent).toContain("boxShadow: '0 2px 6px rgba(0, 122, 255, 0.35)'");

    // Active icon uses #FFFFFF
    expect(segContent).toContain("color: isSelected ? '#FFFFFF' : 'inherit'");
  });

  it('SettingsModal defines graphics preset options (Rendah, Sedang, Tinggi, Ultra)', () => {
    const settingsPath = path.resolve(__dirname, '../src/ui/components/SettingsModal.tsx');
    const settingsContent = fs.readFileSync(settingsPath, 'utf-8');

    expect(settingsContent).toContain("label: 'Rendah'");
    expect(settingsContent).toContain("label: 'Sedang'");
    expect(settingsContent).toContain("label: 'Tinggi'");
    expect(settingsContent).toContain("label: 'Ultra");
  });
});
