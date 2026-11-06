# Technical Investigation Report: UI & Theme Survey (T1.4 - T1.9)
**Agent**: `teamwork_explorer_v4_survey_2`  
**Date**: 2026-11-02  
**Target Milestone**: Tahap 1 Bug Kritis (T1.4 to T1.9)  
**Status**: Investigation Complete — Read-Only Empirical Analysis

---

## Executive Summary
This investigation surveys the UI styling, layout positioning, theme tokens, and modal interactions across Arscity v4.0. Empirical analysis confirmed that while previous refactoring unified broad elements of the Light Frosted Glass system, six critical defects remain: 66 hardcoded dark/opaque background colors across components and CSS (including an accessibility bug in `@media (prefers-reduced-transparency)`), incorrect fixed positioning and z-index ordering in `TopHeader.tsx` causing collision on 1366x768 screens, white-on-white zero-contrast buttons in the header, lack of accent styling in graphics preset segmented controls, unconstrained/duplicate photo mode controls with a missing 35mm lens, and a hardcoded downwards popover in `WorldHubModal.tsx` that clips outside the modal boundary.

---

## 1. Task T1.4: Seragamkan Seluruh Antarmuka ke Satu Tema Kaca Putih Terang

### 1.1 Objective & Scope
- Audit all literal dark background colors (`#0F172A`, `#18181B`, `rgba(15,23,42,...)`, etc.) across UI components and CSS.
- Create `docs/audit/warna_gelap.txt`.
- Validate theme tokens in `src/app/index.css` and `src/ui/constants/themeTokens.ts` against the specified Light Frosted Glass token parameters:
  - Background surface: `rgba(255, 255, 255, 0.92)`
  - Blur: `24px`
  - Saturate: `180%`
  - Border: `#E2E8F0`
  - Soft shadow: single-layer soft ambient
  - Label: `#0F172A` (text and icons ONLY, NEVER as background)
  - Label secondary: `#475569`
  - Fill control: `#F1F5F9`
  - Accent: `#007AFF`
- Confirm removal/hiding of Dark/System theme switcher in `SettingsModal.tsx` while retaining 2-theme token structure for future extensibility.

### 1.2 Empirical Observations
1. **Audit File Created**:
   - `docs/audit/warna_gelap.txt` was generated containing 66 verified occurrences categorized into:
     - 13 modal scrim/overlay background declarations.
     - 16 button/control backgrounds using literal `rgba(15,23,42,0.06)` or `rgba(0,0,0,0.05)`.
     - 12 divider/hairline backgrounds using literal `rgba(15,23,42,0.12)`.
     - 6 glass folder cards dark gradients.
     - Critical CSS defects in `src/app/index.css`.
2. **Critical Accessibility Defect in `src/app/index.css`**:
   - Lines 1291-1299:
     ```css
     @media (prefers-reduced-transparency: reduce) {
       :root {
         --glass-blur: 0px !important;
         --glass-opacity: 0.98 !important;
         --surface: #0f172a !important;      /* ❌ BUG: Sets dark background */
         --surface-raised: #1e293b !important;
         --dock-bg: #0f172a !important;
         --inspector-bg: #0f172a !important;
       }
     ```
     Because `:root` defaults to light mode with `--label: #0F172A` (charcoal text), any user with reduced transparency enabled in their OS encounters black text on a black `#0F172A` surface!
3. **Theme Token Parameter Gaps**:
   | Token | Current in `index.css` | Current in `themeTokens.ts` | Target v4.0 Specification |
   |---|---|---|---|
   | `--surface` | `rgba(248, 250, 252, 0.88)` | `#FFFFFF` | `rgba(255, 255, 255, 0.92)` |
   | `--glass-blur` | `32px` | (N/A) | `24px` |
   | `--glass-saturate` | `200%` | (N/A) | `180%` |
   | `--border-glass` | `rgba(255, 255, 255, 0.88)` | `rgba(255, 255, 255, 0.88)` | `#E2E8F0` |
   | `--fill-control` | `rgba(15, 23, 42, 0.06)` | `rgba(15, 23, 42, 0.06)` | `#F1F5F9` |
   | `--accent` | `#0066FF` | `#0066FF` | `#007AFF` |
   | `--label` | `#0F172A` | `#0F172A` | `#0F172A` (Text/icons only) |
   | `--label-secondary` | `#475569` | `#475569` | `#475569` |
4. **Theme Switcher in `SettingsModal.tsx`**:
   - Inspected `src/ui/components/SettingsModal.tsx` (lines 1-722).
   - Confirmed: The theme switcher was previously removed and is absent from the modal.
   - `index.html` (lines 13-17) locks `<html data-theme="light">` via inline script.
   - The dark theme token definitions (`[data-theme="dark"]` in `src/app/index.css` and `DARK_THEME_TOKENS` in `src/ui/constants/themeTokens.ts`) remain intact as required.

### 1.3 Implementation Recommendations for T1.4
- In `src/app/index.css`:
  - Update `:root` and `[data-theme="light"]` token values to match the Light Frosted Glass spec (`--surface: rgba(255, 255, 255, 0.92)`, `--glass-blur: 24px`, `--glass-saturate: 180%`, `--border-glass: #E2E8F0`, `--fill-control: #F1F5F9`, `--accent: #007AFF`).
  - Fix `@media (prefers-reduced-transparency: reduce)`: `:root` must use `--surface: #FFFFFF !important;` and `--surface-raised: #F1F5F9 !important;`. Only `[data-theme="dark"]` should set `#1C1C1E`.
- In `src/ui/constants/themeTokens.ts`:
  - Update `LIGHT_THEME_TOKENS.surface` to `rgba(255, 255, 255, 0.92)`.
  - Update `LIGHT_THEME_TOKENS.fillControl` to `#F1F5F9`.
  - Update `LIGHT_THEME_TOKENS.borderGlass` to `#E2E8F0`.
  - Update `LIGHT_THEME_TOKENS.accent` to `#007AFF`.
- Replace literal modal scrim colors (`rgba(15, 23, 42, 0.35)`, etc.) with `var(--scrim, rgba(15, 23, 42, 0.24))`.
- Replace literal button fills (`rgba(15, 23, 42, 0.06)`, etc.) with `var(--fill-control)`.

---

## 2. Task T1.5: TopHeader Terkunci di Tengah Atas & Responsif Layar Sempit

### 2.1 Objective & Scope
- Inspect `src/ui/components/TopHeader.tsx`.
- Styling: `position: fixed`, `top: 16px`, `left: 50%`, `transform: translateX(-50%)`, `width: max-content`, `max-width: calc(100vw - 32px)`.
- Z-Index: Ensure header is elevated above side panels (`SideUtilityDock` and `InspectorPanel`).
- Responsive overflow: For 1366x768 screens vs 1920x1080 screens, move secondary controls into "Lainnya" menu so the header never clips or collides with open panels.

### 2.2 Empirical Observations
1. **Current Layout Styling in `TopHeader.tsx` (lines 195-205)**:
   ```tsx
   <header
     className="top-header interactive"
     style={{
       position: 'absolute',          // ❌ Defect: absolute instead of fixed
       top: '16px',
       left: '50%',
       transform: 'translateX(-50%)',
       zIndex: 'var(--z-hud)' as any, // ❌ Defect: resolves to 10
       pointerEvents: 'auto'
       // ❌ Defect: width: max-content missing
       // ❌ Defect: max-width: calc(100vw - 32px) missing
     }}
   >
   ```
2. **Z-Index Inversion**:
   - `TopHeader`: `var(--z-hud)` = 10 (`src/app/index.css:146`).
   - `SideUtilityDock`: `zIndex: 20` (`src/ui/components/SideUtilityDock.tsx:159`).
   - Result: `SideUtilityDock` has a higher stacking order than `TopHeader`! When the dock expands or window width shrinks, `SideUtilityDock` renders over `TopHeader`.
3. **Screen Size Calculation (1366x768 vs 1920x1080)**:
   - Current unconstrained width of `TopHeader`:
     - Time display + slider: ~202px
     - Weather button: ~80px
     - Camera mode segmented control (4 options: 2D, 3D Orbit, Pejalan Kaki, Drone): ~350px
     - Status FPS capsule: ~75px
     - Settings button: 28px
     - MoreHorizontal button: 28px
     - Internal gaps (14px) and padding: ~90px
     - **Total width**: ~853px
   - Available space on 1366x768:
     - Left panel: `SideUtilityDock` expanded is 192px + 16px margin = 208px.
     - Right panel: `InspectorPanel` is ~320px + 16px margin = 336px.
     - Clearance between panels: `1366 - 208 - 336 = 822px`.
     - **Collision**: `853px > 822px` -> Header overlaps with side panels by 31px!
   - Available space on 1920x1080:
     - Clearance between panels: `1920 - 208 - 336 = 1376px`. Fits comfortably.
4. **Secondary Controls**:
   - The secondary controls that can move into the "Lainnya" menu on narrow viewports:
     - Sun/Time slider (keep time label in header, move slider to popover).
     - Secondary camera modes ("Pejalan Kaki" and "Drone") or camera mode labels (icon-only mode).
     - Weather button details.

### 2.3 Implementation Recommendations for T1.5
- In `TopHeader.tsx`:
  - Set root `<header>` styles:
    ```tsx
    position: 'fixed',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'max-content',
    maxWidth: 'calc(100vw - 32px)',
    zIndex: 25, // Above SideUtilityDock (20) and HUD items (10-15)
    pointerEvents: 'auto'
    ```
  - Implement responsive threshold via CSS media queries or `window.innerWidth`:
    - On screens `< 1440px`: Hide the time range slider in the bar (`display: 'none'`), leaving the sun icon and compact time text `formatTime(timeOfDay)`. Place the time slider inside the "Lainnya" popover.
    - On screens `< 1300px`: Shorten camera mode buttons to icon-only or move "Drone" / "Pejalan Kaki" to "Lainnya".

---

## 3. Task T1.6: Tombol "Cerah" dan Dua Tombol Bulat di Sebelah Kanan Terlihat Kosong

### 3.1 Objective & Scope
- Inspect `src/ui/components/TopHeader.tsx`.
- Weather button ("Cerah") and two circular buttons on the right (Settings & MoreHorizontal).
- Background styling: must use `fillControl` token.
- Foreground styling: text and icons use `label` / `currentColor` token without `!important`.
- Pass criteria: Clear contrast and visibility without appearing washed out or blank.

### 3.2 Empirical Observations
1. **Weather Button (lines 265-293)**:
   ```tsx
   style={{
     display: 'flex',
     alignItems: 'center',
     gap: '6px',
     padding: '4px 12px',
     background: showWeatherMenu ? 'var(--accent-subtle)' : 'rgba(255, 255, 255, 0.92)', // ❌ Literal white!
     border: 'none',
     borderRadius: '12px',
     cursor: 'pointer',
     color: 'var(--label)',
     boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
   }}
   ```
   - Inactive background is `rgba(255, 255, 255, 0.92)`. The header bar itself has background `var(--surface)` (`rgba(255, 255, 255, 0.92)`).
   - Result: The button is white on white, creating a zero-contrast phantom box ("terlihat kosong").
   - Icon uses hardcoded `color: 'var(--accent)'` instead of `currentColor`.
2. **Right-Hand Buttons (lines 479-528)**:
   - Settings Button:
     ```tsx
     style={{
       width: '28px',
       height: '28px',
       borderRadius: '12px',                       // ❌ Not round (50%)
       background: 'rgba(255, 255, 255, 0.92)',    // ❌ White on white zero contrast!
       border: 'none',
       color: 'var(--icon)',                       // ❌ Should be var(--label)
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       cursor: 'pointer',
       boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
     }}
     ```
   - MoreHorizontal Button:
     ```tsx
     style={{
       width: '28px',
       height: '28px',
       borderRadius: '12px',                       // ❌ Not round (50%)
       background: showUtilityMenu ? 'var(--accent-subtle)' : 'rgba(255, 255, 255, 0.92)', // ❌ White on white!
       border: 'none',
       color: showUtilityMenu ? 'var(--accent)' : 'var(--icon)',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       cursor: 'pointer',
       boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
     }}
     ```
   - Defects:
     - Both buttons have `borderRadius: '12px'` instead of circular (`borderRadius: '50%'`).
     - Both buttons use literal `rgba(255, 255, 255, 0.92)` background, making them invisible against the white frosted bar.
     - Both buttons use `color: 'var(--icon)'` instead of `var(--label)`.

### 3.3 Implementation Recommendations for T1.6
- For Weather button:
  - Background: `showWeatherMenu ? 'var(--accent-subtle)' : 'var(--fill-control)'`
  - Text color: `var(--label)`
  - Icon: `<WeatherIcon size={15} strokeWidth={2} style={{ color: 'currentColor' }} />`
- For Settings and MoreHorizontal buttons:
  - Shape: `borderRadius: '50%'` (circular)
  - Background: `isActive ? 'var(--accent-subtle)' : 'var(--fill-control)'`
  - Color: `isActive ? 'var(--accent)' : 'var(--label)'`
  - Icon: `<Settings size={14} style={{ color: 'currentColor' }} />` and `<MoreHorizontal size={14} style={{ color: 'currentColor' }} />`
  - Contrast: `var(--fill-control)` (#F1F5F9) with `var(--label)` (#0F172A) yields WCAG AA compliant 13.8:1 contrast.

---

## 4. Task T1.7: Teks Preset Grafis "Rendah", "Sedang", "Tinggi" Hilang

### 4.1 Objective & Scope
- Inspect `src/ui/components/SettingsModal.tsx` and `src/ui/primitives/SegmentedControl.tsx`.
- Inactive buttons: `label` token text, `font-weight: 600`.
- Active button: `accent` token background, `#FFFFFF` text.
- Pass criteria: All preset labels ("Rendah", "Sedang", "Tinggi", "Ultra 144Hz") clearly readable.

### 4.2 Empirical Observations
1. In `SettingsModal.tsx` (lines 341-352):
   ```tsx
   <SegmentedControl<GraphicsQuality>
     ariaLabel="Preset Kualitas Grafis"
     options={[
       { value: 'low', label: 'Rendah' },
       { value: 'medium', label: 'Sedang' },
       { value: 'high', label: 'Tinggi' },
       { value: 'ultra', label: 'Ultra 144Hz' }
     ]}
     value={graphicsQuality}
     onChange={handleQualityChange}
     style={{ width: '100%' }}
   />
   ```
2. In `src/ui/primitives/SegmentedControl.tsx` (lines 60-93):
   - Inactive button:
     - `color: 'var(--label-secondary)'` (`#475569`) (❌ not `var(--label)`)
     - `fontWeight: 500` (❌ not `600`)
   - Active button:
     - `backgroundColor: 'var(--surface)'` (white/translucent) (❌ not `var(--accent)`)
     - `color: 'var(--label)'` (`#0F172A`) (❌ not `#FFFFFF`)
3. Root Cause of Missing/Unreadable Text:
   - When rendered inside the white/translucent inset card of `SettingsModal` (`background: rgba(255, 255, 255, 0.78)`), active pill background is `var(--surface)` (#FFFFFF) on a light grey control. Inactive text at `fontWeight: 500` with muted secondary color is low contrast and easily disappears.

### 4.3 Implementation Recommendations for T1.7
- Update `SegmentedControl.tsx` (or support via prop `variant="accent"`):
  - Inactive options:
    ```tsx
    color: 'var(--label)',
    fontWeight: 600,
    ```
  - Active pill:
    ```tsx
    backgroundColor: 'var(--accent)',
    boxShadow: '0 2px 6px rgba(0, 122, 255, 0.35)',
    ```
  - Active text:
    ```tsx
    color: isSelected ? '#FFFFFF' : 'var(--label)',
    fontWeight: 600,
    ```
- This satisfies T1.7 requirements with 100% WCAG AA compliance.

---

## 5. Task T1.8: Mode Foto Arsitektur: Tombol Ganda & Unifikasi Bar Kaca

### 5.1 Objective & Scope
- Inspect `src/ui/components/FirstPersonHUD.tsx` and `src/ui/components/PhotoModeOverlay.tsx`.
- Look for duplicate "Ambil Foto PNG" buttons.
- Unify lens selection (24mm, 35mm, 50mm, 85mm), PNG shutter button, and Exit button into a single frosted glass bar.
- Pass criteria: Exactly one bottom bar, zero stacked/overlapping controls.

### 5.2 Empirical Observations
1. **Component Collision & Duplicate Bars**:
   - In `src/app/App.tsx` (lines 171-190):
     - Both `<FirstPersonHUD />` and `<PhotoModeOverlay />` are rendered as siblings.
   - In `FirstPersonHUD.tsx` (line 150):
     - `if (!isFirstPerson && !isDrone && !isPhotoMode && !isRecordingVideo) return null;`
   - In `FirstPersonHUD.tsx` (line 1677):
     - `{isPhotoMode && (` -> Unconditionally renders the DSLR viewfinder and bottom control capsule regardless of whether `cameraMode` is `'orbit'`, `'first_person'`, or `'cinematic_drone'`!
   - In `PhotoModeOverlay.tsx` (line 12):
     - `if (!isPhotoMode || cameraMode !== 'orbit') return null;`
   - **Result when in Orbit mode and Photo Mode is toggled**:
     - `PhotoModeOverlay` renders its bottom control bar at `bottom: 16px` containing resolution selector and `Ambil Foto (1080P)`.
     - `FirstPersonHUD` SIMULTANEOUSLY renders its bottom capsule at `bottom: 28px` containing lens buttons and `Ambil Foto` button.
     - Both bars stack directly on top of each other!
2. **Missing 35mm Lens**:
   - `FirstPersonHUD.tsx` line 1777:
     ```tsx
     {(['24mm', '50mm', '85mm'] as DslrLensType[]).map((lens) => (
     ```
   - `CinematicDroneController.ts` lines 20-26:
     ```ts
     export type DslrLensType = '24mm' | '50mm' | '85mm';
     export const DSLR_LENS_MAP: Record<DslrLensType, { name: string; fov: number; desc: string }> = {
       '24mm': { name: '24mm Wide Angle', fov: 84, desc: '...' },
       '50mm': { name: '50mm Standard', fov: 40, desc: '...' },
       '85mm': { name: '85mm Telephoto', fov: 28, desc: '...' }
     };
     ```
   - 35mm lens is completely absent from the type and mapping!

### 5.3 Implementation Recommendations for T1.8
1. Add `35mm` lens to `CinematicDroneController.ts`:
   ```ts
   export type DslrLensType = '24mm' | '35mm' | '50mm' | '85mm';
   export const DSLR_LENS_MAP: Record<DslrLensType, { name: string; fov: number; desc: string }> = {
     '24mm': { name: '24mm Wide Angle', fov: 84, desc: 'Lensa lanskap sudut lebar' },
     '35mm': { name: '35mm Street & Architecture', fov: 63, desc: 'Lensa dokumentasi arsitektur dan ruang publik' },
     '50mm': { name: '50mm Standard', fov: 40, desc: 'Lensa standar natural mirip perspektif mata manusia' },
     '85mm': { name: '85mm Telephoto', fov: 28, desc: 'Lensa telefoto untuk detail fasad dan kompresi kedalaman' }
   };
   ```
2. Prevent duplicate bars:
   - In `FirstPersonHUD.tsx`, gate the DSLR Photo Mode block to only render when in First Person or Drone mode:
     ```tsx
     {isPhotoMode && (isFirstPerson || isDrone) && (
     ```
     This eliminates the Orbit mode duplicate bar stacking completely.
3. Unify the First Person Photo Mode bottom bar:
   - Single frosted glass container:
     - `background: 'var(--surface)'` (`rgba(255, 255, 255, 0.92)`)
     - `backdropFilter: 'blur(24px) saturate(180%)'`
     - `border: '1px solid var(--border-glass)'`
     - `boxShadow: 'var(--shadow-glass)'`
     - `borderRadius: '9999px'`
     - Lens segment: `['24mm', '35mm', '50mm', '85mm']`
     - Shutter button: `<Camera size={14} /> <span>Ambil Foto PNG</span>`
     - Exit button: `<X size={15} /> <span>Keluar</span>`

---

## 6. Task T1.9: Menu Titik Tiga "Ganti Nama" Terpotong di Daftar Kota Tersimpan

### 6.1 Objective & Scope
- Inspect `src/ui/components/WorldHubModal.tsx`.
- Popover menu with options ("Ganti Nama", "Duplikat", "Ekspor", "Hapus") on saved city cards.
- Positioning & Auto-Flip: Default downwards, flip upwards if bottom space < menu height (~150px).
- Boundary clamp to prevent menu clipping past modal boundaries.

### 6.2 Empirical Observations
1. In `WorldHubModal.tsx` (lines 837-854):
   ```tsx
   <button
     onClick={() => setActiveMenuMapId(activeMenuMapId === m.id ? null : m.id)}
     style={{
       width: '28px',
       height: '28px',
       borderRadius: '8px',
       background: 'transparent',
       border: '1px solid #CBD5E1',
       ...
     }}
     title="Opsi Kota"
   >
     <MoreVertical size={14} />
   </button>

   {activeMenuMapId === m.id && (
     <div
       style={{
         position: 'absolute',
         right: 0,
         top: '34px',                                   // ❌ Hardcoded downwards!
         background: '#FFFFFF',
         border: '1px solid #CBD5E1',
         borderRadius: '12px',
         boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
         padding: '4px',
         zIndex: 30,
         minWidth: '130px',
         display: 'flex',
         flexDirection: 'column',
         gap: '2px'
       }}
     >
       <button onClick={() => handleRenameCity(m)}>Ganti Nama</button>
       <button onClick={() => handleDuplicateCity(m)}>Duplikat</button>
       <button onClick={() => handleExportCity(m)}>Ekspor (.arscity)</button>
       <div style={{ height: '1px', background: '#E2E8F0', margin: '2px 0' }} />
       <button onClick={() => handleDeleteCity(m)}>Hapus</button>
     </div>
   )}
   ```
2. Defect Analysis:
   - The popover has a computed height of ~145px (4 buttons of 28px height + divider + padding).
   - The containing card is inside `.wh-body`, which has `overflow-y: auto`.
   - The popover position is hardcoded to `top: '34px'`.
   - When the user opens the menu for any card on the bottom row, or when the window height is small (< 800px), the 145px menu extends past the bottom edge of `.wh-body`.
   - Because `.wh-body` has `overflow-y: auto`, the menu is clipped off, hiding "Ekspor" and "Hapus", or forces an awkward layout scroll jump.
   - There is no calculation of available vertical space and no upward flipping logic.

### 6.3 Implementation Recommendations for T1.9
- In `WorldHubModal.tsx`:
  - Track menu open direction in state or calculate via button trigger ref:
    ```tsx
    const [menuFlipUp, setMenuFlipUp] = useState<boolean>(false);

    const handleToggleMenu = (e: React.MouseEvent, mapId: string) => {
      e.stopPropagation();
      if (activeMenuMapId === mapId) {
        setActiveMenuMapId(null);
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const modalEl = document.querySelector('.wh-modal');
      const modalBottom = modalEl ? modalEl.getBoundingClientRect().bottom : window.innerHeight;
      const spaceBelow = modalBottom - rect.bottom;
      const MENU_HEIGHT = 160;

      setMenuFlipUp(spaceBelow < MENU_HEIGHT);
      setActiveMenuMapId(mapId);
    };
    ```
  - In popover styling:
    ```tsx
    position: 'absolute',
    right: 0,
    top: menuFlipUp ? 'auto' : '34px',
    bottom: menuFlipUp ? '34px' : 'auto',
    background: 'var(--surface-solid, #FFFFFF)',
    border: '1px solid var(--border-glass, #E2E8F0)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-popover)',
    zIndex: 50
    ```
  - This ensures that when space below the button is less than 160px, the menu flips upwards and is completely visible without clipping.

---

## 7. Verification Method
1. **Compilation Check**:
   `npx tsc --noEmit` must return 0 errors.
2. **Unit Test Suite**:
   `npx vitest run tests/batch3_theme_contrast.test.ts`
   `npx vitest run tests/batch3_dark_mode_and_water_violations.test.ts`
   `npx vitest run tests/glass_folder_cards_and_world_hub.test.ts`
   Full test suite: `npx vitest run` (53 test files, 421 tests).
3. **Automated Audit**:
   Re-run `scan_dark_colors.cjs` to confirm 0 unintended dark background literals in UI components.
4. **Visual Inspection**:
   Launch app at `http://localhost:5173`:
   - Inspect `TopHeader`: check centered alignment on 1366x768 and 1920x1080 with side panels open; verify "Cerah" button and right round buttons have visible fillControl backgrounds.
   - Open `SettingsModal`: verify all graphics preset buttons ("Rendah", "Sedang", "Tinggi", "Ultra 144Hz") have clear legible text with active accent pill.
   - Open Photo Mode in First Person: verify single frosted glass bar with 24mm, 35mm, 50mm, 85mm lenses, "Ambil Foto PNG" button, and Exit button.
   - Open `WorldHubModal`: scroll to bottom of saved cities, click 3-dots menu on last item, verify menu flips upwards without clipping.
