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

describe('T1.6: Tombol Cerah dan 2 Tombol Bulat di Kanan', () => {
  const topHeaderPath = path.resolve(__dirname, '../src/ui/components/TopHeader.tsx');
  const content = fs.readFileSync(topHeaderPath, 'utf-8');

  it('Tombol Cuaca "Cerah" menggunakan token var(--fill-control), icon currentColor, dan border-radius kapsul', () => {
    // Background uses var(--fill-control) when not open
    expect(content).toContain("background: showWeatherMenu ? 'var(--accent-subtle)' : 'var(--fill-control)'");
    // Text color uses var(--label)
    expect(content).toContain("color: 'var(--label)'");
    // Icon uses currentColor
    expect(content).toContain("<WeatherIcon size={15} strokeWidth={2} style={{ color: 'currentColor' }} />");
    // Border uses token
    expect(content).toContain("border: '1px solid var(--border)'");
    // Radius is capsule/pill
    expect(content).toContain("borderRadius: '9999px'");
  });

  it('Dua tombol aksi di kanan berbentuk bulat sempurna (50%), menggunakan var(--fill-control), dan icon currentColor', () => {
    // Both circular buttons use borderRadius: '50%'
    const circularButtonsMatch = content.match(/borderRadius:\s*'50%'/g);
    expect(circularButtonsMatch).not.toBeNull();
    expect(circularButtonsMatch!.length).toBeGreaterThanOrEqual(2);

    // Settings button styling
    expect(content).toContain("<Settings size={14} style={{ color: 'currentColor' }} />");

    // MoreHorizontal button styling
    expect(content).toContain("<MoreHorizontal size={14} style={{ color: 'currentColor' }} />");

    // None use !important
    expect(content).not.toContain("!important");
  });
});
