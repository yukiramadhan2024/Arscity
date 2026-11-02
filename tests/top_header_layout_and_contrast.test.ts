import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('T1.5: TopHeader Fixed Center & Responsive Collapsible Layout', () => {
  const topHeaderPath = path.resolve(__dirname, '../src/ui/components/TopHeader.tsx');
  const content = fs.readFileSync(topHeaderPath, 'utf-8');

  it('TopHeader uses fixed centering positioning with zIndex 50 and max width boundaries', () => {
    // 1. position: 'fixed'
    expect(content).toMatch(/position:\s*'fixed'/);
    expect(content).not.toMatch(/position:\s*'absolute',\s*top:\s*'16px'/);

    // 2. top: '16px', left: '50%', transform: 'translateX(-50%)'
    expect(content).toContain("top: '16px'");
    expect(content).toContain("left: '50%'");
    expect(content).toContain("transform: 'translateX(-50%)'");

    // 3. width: 'max-content' and maxWidth: 'calc(100vw - 32px)'
    expect(content).toContain("width: 'max-content'");
    expect(content).toContain("maxWidth: 'calc(100vw - 32px)'");

    // 4. zIndex: 50 (above SideUtilityDock zIndex 20 and InspectorPanel zIndex 45)
    expect(content).toContain("zIndex: 50");
  });

  it('TopHeader implements responsive collapsible behavior on narrow screens (< 1440px / 1366px)', () => {
    // Verifies window.innerWidth < 1440 responsive threshold
    expect(content).toContain('innerWidth < 1440');
    expect(content).toContain('isNarrowScreen');

    // Time slider collapses from main capsule when screen is narrow
    expect(content).toContain('!isNarrowScreen &&');

    // Collapsed slider is provided in the utility menu popover
    expect(content).toContain('isNarrowScreen &&');
    expect(content).toContain('aria-label="Pengatur Waktu Matahari Popover"');
  });
});
