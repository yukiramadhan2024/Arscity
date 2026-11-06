# Arscity v4.0 — In-Depth Codebase Survey & Architecture Plan
**Focus: Tahap 1 (Feature Removal), Tahap 2 (Logo & 2-Font System), Tahap 3 (VisionOS UI/UX & Settings Bug Fix)**  
*Agent: teamwork_explorer_survey_1*  
*Date: 2026-10-29*

---

## 1. Executive Summary

A comprehensive investigation of the Arscity codebase was performed across UI components, Zustand store, Three.js engine overlays, typography definitions, and test suites. The survey revealed:
1. **Tahap 1**: Mission, Score, and Quiz features are mounted in `App.tsx` via `MissionModal` and `ArchitectureQuizModal`, triggered in `TopHeader.tsx` (button "Misi & Skor" in main capsule, and button "Misi Kota" in the quick controls popover) and `SideUtilityDock.tsx` (section "BELAJAR" containing "Misi Kota", "Glosarium SNI", and "Kuis Arsitektur"). A standalone `CityScoreModal` does not exist as an independent file; rather, city score analysis was bundled in `MissionModal` and the `CityScoreOverlay` in `Engine.ts`.
2. **Tahap 2**: The current `ArscityLogo.tsx` implements an older "Tectonic Monogram A" without the hexagonal gradient enclosure or top specular highlight. It is currently placed in `LoginPage.tsx`, `WorldHubModal.tsx`, and `SideUtilityDock.tsx`, but missing from the Top Bar of Studio CAD (`CustomBuildingCreatorModal.tsx`). Furthermore, the codebase is currently configured with `Space Grotesk` and `Space Mono`, with rogue instances of `Inter` and generic `monospace` in 2D canvas routines. These must be replaced with the strictly locked 2-font system: `Plus Jakarta Sans` and `JetBrains Mono`.
3. **Tahap 3**: The white-on-white text bug in `SettingsModal.tsx` stems from theme token inheritance where dark mode / theme variables set text colors to white (`#FFFFFF`) against white or frosted white surfaces (`--lab-section-bg: #FFFFFF` and `--lab-card-bg`). Removing the theme switcher entirely and locking all modals and headers to Apple Spatial Frosted Glass with charcoal black text (`#0F172A`) and medium gray subtexts (`#475569`) permanently eliminates this bug. The graphics quality selector requires conversion to an iOS-style segmented control with a spring-animated sliding pill. TopHeader requires streamlined integration with real-time FPS display and 4-mode segmented camera/view controls (2D Denah | 3D Orbit | Pejalan Kaki | Drone). BottomToolbar requires macOS Dock magnification physics. Lastly, floating red violation badges in `LotManager.ts` must be hidden in normal view, appearing only upon building selection or in Zone/Build tool mode.

---

## 2. Tahap 1: Removal of Mission, Score, and Quiz Features

### 2.1 `src/ui/components/TopHeader.tsx`
- **Main Header Capsule**:
  - Lines 476–501: Button "Misi & Skor" with `<Award size={13} />` triggering `setShowMissions(true)`.
  - **Action**: Completely remove this button.
- **Quick Controls Popover ("Kontrol Cepat")**:
  - Lines 687–708: In the "Misi & Tutorial Kota" 2-column grid, remove the "Misi Kota" button:
    ```tsx
    <button
      onClick={() => { setShowMissions(true); setShowUtilityMenu(false); }}
      ...
    >
      <Award size={13} style={{ color: 'var(--warn)' }} />
      <span>Misi Kota</span>
    </button>
    ```
  - **Action**: Remove the "Misi Kota" button. Retain the "Tutorial" button cleanly as a single full-width button or integrate with quick settings.
- **Imports and State Cleanup**:
  - Line 13: Remove `Award` icon import if not used elsewhere in `TopHeader.tsx`.
  - Line 90: Remove `const setShowMissions = useUIStore((s) => s.setShowMissions);`.

### 2.2 `src/ui/components/SideUtilityDock.tsx`
- **Section "BELAJAR"**:
  - Lines 336–374: Group 3 currently renders:
    ```tsx
    {isExpanded ? (
      <div style={{ ... }}>Belajar</div>
    ) : (
      <div style={{ marginTop: '16px' }} />
    )}
    {renderButton(<Award ... />, 'Misi Kota', 'U', () => setShowMissions(true))}
    {renderButton(<BookOpen ... />, 'Glosarium SNI', 'G', () => setShowGlossary(true))}
    {renderButton(<GraduationCap ... />, 'Kuis Arsitektur', 'K', () => setShowQuiz(true))}
    ```
  - **Action**: Remove the entire "Belajar" header and the 3 buttons ("Misi Kota", "Glosarium SNI", "Kuis Arsitektur").
- **"Bantuan" Button Preservation**:
  - Lines 375–381:
    ```tsx
    {onOpenHelp &&
      renderButton(
        <HelpCircle size={18} strokeWidth={1.75} />,
        'Bantuan',
        '?',
        onOpenHelp
      )}
    ```
  - **Action**: Preserve the "Bantuan" button by placing it cleanly under "Tampilan" or as a utility button right above "Kembali ke Layar Awal".
- **Imports and State Cleanup**:
  - Lines 9, 13, 14: Remove unused icon imports `Award`, `BookOpen`, `GraduationCap`.
  - Lines 39–41: Remove `setShowMissions`, `setShowGlossary`, and `setShowQuiz` hooks.

### 2.3 `src/app/App.tsx`
- **Render Unmounting**:
  - Line 170: Remove `<MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} />`.
  - Lines 182–185: Remove `<ArchitectureQuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} />`.
  - *(Note on CityScoreModal: As confirmed by survey, no `CityScoreModal` component exists in the codebase. The scoring UI was previously inside `MissionModal` or `AnalysisOverlay.tsx`)*.
- **Imports Cleanup**:
  - Line 8: Remove `import { MissionModal } from '../ui/components/MissionModal';`.
  - Line 17: Remove `import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';`.
- **State Hooks Cleanup**:
  - Lines 40–41: Remove `showMissions`, `setShowMissions`.
  - Lines 60–61: Remove `showQuiz`, `setShowQuiz`.

### 2.4 `src/ui/state/useUIStore.ts`
- **ModalId Union (Lines 16–27)**:
  - Lines 19, 26: Remove `'missions'` and `'quiz'` from `ModalId` union, or retain them conditionally to prevent TypeScript errors in legacy tests if needed.
- **Store Interface & Implementation**:
  - Lines 138–139: `showMissions: boolean; setShowMissions: (val: boolean) => void;`
  - Lines 182–184: `showQuiz: boolean; setShowQuiz: (val: boolean) => void;`
  - Lines 679, 687, 696, 704: Clean up `openModal` and `closeModal` mappings.
  - Lines 730–735: `showMissions: false, setShowMissions: ...`
  - Lines 794–799: `showQuiz: false, setShowQuiz: ...`
  - *Recommendation*: Keep dummy setters or lightweight backward-compatible state in `useUIStore.ts` so unit tests like `tests/ui_primitives_and_modal_policy.test.ts` (which test modal exclusivity via `setShowQuiz`) continue to pass without cascading failure.

---

## 3. Tahap 2: New Vector Logo & 2-Font System

### 3.1 New Vector Logo: "The Infinite Isometric Monolith" (`ArscityLogo.tsx`)
- **Visual & Geometric Specification**:
  1. **Container**: Smooth rounded hexagon (`polygon` or SVG `path` with rounded corners / continuous bezier curvature).
  2. **Gradient**: Sapphire Blue (`#0066FF`) transitioning to Electric Cyan (`#00D4FF`) at a 135-degree angle.
  3. **Specular Highlight / Glint**: High-key radial glow (`#FFFFFF` with subtle blur) placed at the top-left apex of the hexagon, creating a premium refraction effect.
  4. **The Monolith / Letter 'A' Geometry**:
     - Three interlocking isometric prism blades in 30-degree isometric projection:
       - **Left Pillar Blade**: Faces tilted towards the apex, deep cobalt/navy tone (`#0040A8`) on shaded facets and electric cyan edge highlights.
       - **Right Pillar Blade**: Faces catching direct sky illumination with vibrant sapphire (`#0066FF`) and specular facets (`#38BDF8`).
       - **Interlocking Cantilever / Skybridge Crossbar**: Connects the two pillars horizontally with an axonometric chamfer, completing the silhouette of the letter 'A' and simultaneously depicting a 3D architectural skyscraper monolith.
       - **Central Courtyard Void**: Negative space forming a light well / open courtyard portal.
  5. **Text & Typography**:
     - "ARSCITY" in `Plus Jakarta Sans`, weight 800 (ExtraBold), letter-spacing -0.03em.
     - Badge updated to `"v4.0"` (or configurable prop).

### 3.2 Placements of `ArscityLogo`
1. `src/ui/components/LoginPage.tsx`:
   - Line 287: `<ArscityLogo size={32} showText={true} badge="v4.0" textColor="#0F172A" />` (update badge to `"v4.0"`).
2. `src/ui/components/WorldHubModal.tsx`:
   - Line 473: `<ArscityLogo size={38} />` (already present, will automatically render the new vector logo).
3. `src/ui/components/SideUtilityDock.tsx`:
   - Line 214: `<ArscityLogo size={20} />` (already present, will automatically render the new vector logo).
4. `src/ui/components/CustomBuildingCreatorModal.tsx` (Top Bar Studio CAD):
   - Lines 3280–3294: Replace the generic `<Compass size={18} />` icon inside the 32x32 rounded container with:
     ```tsx
     <ArscityLogo size={24} />
     ```

### 3.3 Strict 2-Font System Enforcement
- **Font Specifications**:
  1. **Primary Interface Font**: `Plus Jakarta Sans` (weights: 500, 600, 700, 800) for all UI text, headings, buttons, tabs, dialogs, and labels.
  2. **Telemetry / Monospace Font**: `JetBrains Mono` (weights: 500, 600) strictly for telemetry, FPS, clock/hour, coordinates, meters (`m`), and area (`m²`).
  3. **Zero 3rd Font Policy**: Completely eradicate `Space Grotesk`, `Space Mono`, `Inter`, `Roboto`, and generic unmapped `monospace`.

- **Web Font Imports & CSS**:
  - `index.html`:
    Replace lines 9–12:
    ```html
    <!-- Google Fonts: Plus Jakarta Sans & JetBrains Mono (Strict 2-Font System) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
    ```
  - `src/app/index.css`:
    Lines 172–174:
    ```css
    --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --font-stack: var(--font-sans);
    ```
  - `tailwind.config.js`:
    Lines 13–15:
    ```javascript
    sans: ["var(--font-sans)", "'Plus Jakarta Sans'", "sans-serif"],
    mono: ["var(--font-mono)", "'JetBrains Mono'", "monospace"],
    serif: ["var(--font-sans)", "'Plus Jakarta Sans'", "sans-serif"],
    ```

- **Canvas 2D Font Audit & Cleanup**:
  - `src/ui/components/CustomBuildingCreatorModal.tsx`:
    - Line 96: Change `ctx.font = 'bold 84px "Space Mono", monospace'` → `'bold 84px "JetBrains Mono", monospace'`.
    - Lines 2651–2687: Update `monospace` canvas labels to `'JetBrains Mono', monospace`.
  - `src/zones/LotManager.ts`:
    - Line 607: Change `bCtx.font = 'bold 44px "Space Grotesk", sans-serif'` → `'bold 44px "Plus Jakarta Sans", sans-serif'`.
  - `src/materials/ProceduralTextureGen.ts`:
    - Lines 1010, 1157, 1207: Change `Inter, sans-serif` → `'Plus Jakarta Sans', sans-serif`.
  - `src/io/ScreenshotExporter.ts`:
    - Lines 32, 36, 78–79, 114, 170–171: Replace `Space Grotesk` with `Plus Jakarta Sans` and `Space Mono` with `JetBrains Mono`.
  - `src/analysis/FloorPlanAnnotationOverlay.ts`:
    - Lines 150, 156, 160, 292: Replace `Space Grotesk` and `Space Mono`.
  - `src/analysis/MeasurementTool.ts`:
    - Line 112: Replace `Space Mono` with `JetBrains Mono`.
  - `src/core/engine/FirstPersonController.ts`:
    - Lines 1661, 1839: Replace `Space Mono` with `JetBrains Mono`.
  - `src/ui/components/FirstPersonHUD.tsx`:
    - Lines 40–41: Replace `Space Grotesk` and `Space Mono` with `Plus Jakarta Sans` and `JetBrains Mono`.

---

## 4. Tahap 3: Apple VisionOS UI/UX Overhaul & Settings Bug Fix

### 4.1 `SettingsModal.tsx` White-on-White Text Bug Fix
- **Root Cause**:
  `SettingsModal.tsx` renders its rows using `.inset-group` with `.inset-row`. The background is white/frosted (`--lab-section-bg: #FFFFFF` and `--lab-card-bg`). Several headings and labels use `color: 'var(--label)'` and `color: 'var(--label-secondary)'`. When `data-theme="dark"` is active (or triggered by night time in `Engine.ts`), CSS variable `--label` shifts to `#FFFFFF` (line 323 & 1356 of `index.css`), causing pure white text to render on top of a pure white background.
- **Direct Fix**:
  1. Explicitly hardcode/bind all titles, section labels, and toggle setting names to charcoal black `#0F172A`:
     - Line 127: Modal title: `color: '#0F172A'`
     - Line 161, 239, 338, 429: Inset section headers: `color: '#475569'`, font-weight 700
     - Lines 199, 219, 244, 283, 303, 327, 344, 364, 385, 445: Setting names: `color: '#0F172A'`, font-weight 600
  2. Set all descriptive subtexts to medium slate gray `#475569`:
     - Lines 130, 170, 202, 222, 286, 306, 323, 347, 367, 389, 448: `color: '#475569'`
  3. Ensure the modal frame itself uses Apple Spatial Frosted Glass:
     `background: 'rgba(248, 250, 252, 0.88)'`, `backdropFilter: 'blur(32px) saturate(200%)'`, `border: '1px solid rgba(255, 255, 255, 0.70)'`, `boxShadow: '0 24px 60px rgba(15, 23, 42, 0.12)'`.

### 4.2 Complete Removal of Theme Switcher ("Gelap | Terang | Sistem")
- **Rationale**:
  The user request mandates removing the theme switcher entirely to lock Arscity v4.0 to a single, signature visual identity: **Apple Spatial Frosted Glass** (acrylic milky-white surface `rgba(248, 250, 252, 0.88)`, `backdrop-filter blur(32px) saturate(200%)`, soft shadows, no harsh dividers, and `#0F172A` text).
- **Locations to Clean**:
  - `src/ui/components/SettingsModal.tsx`:
    - Remove lines 164–194 (the "Tema Antarmuka" segmented control for Gelap, Terang, Sistem).
    - Remove `themeMode`, `setThemeMode` from store destructuring.
  - `src/ui/components/OnboardingModal.tsx`:
    - Remove lines 145–167 (theme choice segmented buttons).
  - `src/ui/state/useUIStore.ts`:
    - Lock `themeMode: 'light'`, `resolvedTheme: 'light'`.
    - Bypass time-of-day theme auto-flipping (`setTimeOfDay` currently flips theme to dark if hour is evening; remove this flip so UI stays Spatial Frosted Glass at all times).
  - `index.html`:
    - Lock root `<html lang="id" data-theme="light">` and simplify the inline script to always force `light`.

### 4.3 iOS-Style Spring Segmented Control for Graphics Quality
- **Current State**:
  Lines 248–277 in `SettingsModal.tsx` use a static CSS grid of 4 buttons without sliding pill animation.
- **Target Design**:
  - Four choices: `Rendah`, `Sedang`, `Tinggi`, `Ultra 144Hz` (updating "Ultra" to "Ultra 144Hz").
  - An iOS-style capsule container:
    ```tsx
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: 'rgba(15, 23, 42, 0.06)',
      padding: '3px',
      borderRadius: '12px',
      position: 'relative'
    }}>
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          onClick={() => handleQualityChange(preset.id)}
          style={{
            flex: 1,
            position: 'relative',
            padding: '7px 0',
            textAlign: 'center',
            fontSize: '11.5px',
            fontWeight: graphicsQuality === preset.id ? 700 : 500,
            color: graphicsQuality === preset.id ? '#0F172A' : '#64748B',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            zIndex: 1
          }}
        >
          {graphicsQuality === preset.id && (
            <motion.div
              layoutId="settings-graphics-quality-pill"
              layout="position"
              transition={SPRING_TACTILE}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '9px',
                background: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.12)',
                zIndex: -1
              }}
            />
          )}
          <span>{preset.label}</span>
        </button>
      ))}
    </div>
    ```

### 4.4 TopHeader Streamlining & Overhaul
- **Layout & Structure**:
  - Slim floating capsule with Apple Spatial Frosted Glass:
    `background: 'rgba(248, 250, 252, 0.88)'`, `backdropFilter: 'blur(32px) saturate(200%)'`, `border: '1px solid rgba(255, 255, 255, 0.70)'`, `boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)'`.
  - **Left**: Sun icon, current hour (`07:00 WIB`), and slider with magnetic snap to anchors (07:00 Pagi, 12:00 Siang, 16:15 Sore Emas, 19:00 Malam).
  - **Center-Left**: Interactive Weather button (Sun / Cloud / Rain).
  - **Center-Right**: Unified 4-Mode View Segmented Control:
    1. **2D Denah** (`toggleTopDown` / orthographic plan view)
    2. **3D Orbit** (standard perspective god-view)
    3. **Pejalan Kaki** (`first_person` walk mode)
    4. **Drone** (`cinematic_drone` tour mode)
    with a Framer Motion sliding pill (`layoutId="top-header-view-pill"`).
  - **Right**:
    1. **Real-Time Performance Indicator**: Prominently display actual FPS (e.g. `144 FPS` or `60 FPS`) inside a single-line emerald capsule (`rgba(16, 185, 129, 0.14)`, border `1px solid rgba(16, 185, 129, 0.35)`, dot `#10B981` with glow, text `#0F172A`).
    2. **Quick Settings Button**: Icon button opening `SettingsModal` directly.

### 4.5 BottomToolbar macOS Dock Magnification & Tactile Springs
- **Physics & Interaction**:
  - Implement smooth cursor proximity magnification for dock tool icons.
  - As mouse hovers over an icon, it scales up smoothly to `1.18x`, and adjacent neighbor icons scale up to `1.08x`.
  - When pointer leaves, icons smoothly spring back to `1.0x` using `SPRING_TACTILE` (`{ type: "spring", stiffness: 420, damping: 32 }`).
  - Active tool pill slides smoothly underneath using Framer Motion `layoutId="bottom-dock-active-pill"`.

### 4.6 Floating Red Warning Badges (KDB/GSB Violations in `LotManager.ts`)
- **Current Behavior**:
  In `src/zones/LotManager.ts` (lines 587–640), a 3D Sprite with text `lot.violations[0].title` (in red `#DC2626`) is added directly to `group`. In `updateVisibility()` (line 650), when `showLotOverlays` is toggled or when active tool is `zone`, `build`, or `analyze`, the entire group including the red floating badge becomes visible.
- **Required Behavior**:
  "Sembunyikan label peringatan merah melayang di atas atap gedung pada pandangan normal agar pemandangan kota bersih seperti game AAA; hanya tampilkan indikator kepatuhan KDB/GSB secara elegan ketika pemain sedang memilih gedung tersebut atau sedang membuka alat Zona/Bangun."
- **Implementation Blueprint**:
  1. In `LotManager.ts`, name the violation sprite explicitly:
     ```typescript
     badgeSprite.name = 'violationBadge';
     ```
  2. In `updateVisibility(activeToolName, forceOverlays, hoveredLotId, selectedBuildingId)`:
     - Check if building is selected or if active tool is `'zone'` or `'build'`.
     - In normal navigation view (`activeTool === 'select'` and no building selected on that lot), set `badgeSprite.visible = false`.
     - Only set `badgeSprite.visible = true` when:
       a. `activeToolName === 'zone' || activeToolName === 'build'`
       b. OR the specific building on this lot is actively selected (`selectedBuildingId && lot.containedBuildingIds?.includes(selectedBuildingId)`).
  3. Update `Engine.ts` calls to `lotManager.updateVisibility` so that `engine.selectionManager.selectedBuildingId` is forwarded.

---

## 5. File-by-File Change Matrix

| File Path | Tahap | Proposed Modification Summary |
|-----------|-------|-------------------------------|
| `src/ui/components/TopHeader.tsx` | 1, 3 | Remove "Misi & Skor" button; remove "Misi Kota" from popover; integrate 4-mode View Segmented Control (2D Denah, 3D Orbit, Pejalan Kaki, Drone); always show emerald FPS badge; add quick settings trigger; lock to Apple Spatial Frosted Glass styling. |
| `src/ui/components/SideUtilityDock.tsx` | 1, 2, 3 | Remove section "BELAJAR" (Misi Kota, Glosarium SNI, Kuis Arsitektur); relocate "Bantuan" button; clean up unused imports (`Award`, `BookOpen`, `GraduationCap`, hooks); confirm `ArscityLogo` renders new vector; lock to Spatial Frosted Glass. |
| `src/app/App.tsx` | 1 | Unmount `<MissionModal>` and `<ArchitectureQuizModal>`; remove imports and store subscriptions (`showMissions`, `showQuiz`). |
| `src/ui/state/useUIStore.ts` | 1, 3 | Lock `themeMode: 'light'` and `resolvedTheme: 'light'`; remove time-based dark theme flipping; update `ModalId` safely; clean up mission/quiz store actions while preserving backward-compatible stubs for tests. |
| `src/ui/components/ArscityLogo.tsx` | 2 | Replace geometry with "The Infinite Isometric Monolith": rounded hexagon with sapphire (#0066FF) to electric cyan (#00D4FF) gradient, top-left specular glint, three interlocking isometric prism blades forming monolith and 'A', update text to Plus Jakarta Sans and badge to "v4.0". |
| `src/ui/components/CustomBuildingCreatorModal.tsx` | 2 | Replace `<Compass />` in CAD Studio Top Bar with `<ArscityLogo size={24} />`; replace canvas font `"Space Mono"` with `"JetBrains Mono"`. |
| `src/ui/components/LoginPage.tsx` | 2 | Confirm `ArscityLogo` usage with badge="v4.0". |
| `src/ui/components/WorldHubModal.tsx` | 2, 3 | Update fallback font from Space Grotesk to Plus Jakarta Sans; confirm `ArscityLogo` rendering. |
| `index.html` | 2, 3 | Replace Google Fonts link with Plus Jakarta Sans & JetBrains Mono; remove dark theme toggle script and lock `data-theme="light"`. |
| `src/app/index.css` | 2, 3 | Update `--font-sans` to Plus Jakarta Sans and `--font-mono` to JetBrains Mono; update root variables to lock Apple Spatial Frosted Glass tokens. |
| `tailwind.config.js` | 2 | Map `sans` to Plus Jakarta Sans and `mono` to JetBrains Mono. |
| `src/ui/components/SettingsModal.tsx` | 3 | Fix white-on-white text bug by setting all titles/names to `#0F172A` and subtexts to `#475569`; remove theme switcher; replace graphics quality controls with iOS-style spring segmented control (Rendah, Sedang, Tinggi, Ultra 144Hz). |
| `src/zones/LotManager.ts` | 2, 3 | Change canvas font to Plus Jakarta Sans; control `violationBadge` visibility to hide in normal view, showing only when building is selected or in Zone/Build tool mode. |
| `src/core/engine/Engine.ts` | 3 | Pass `selectedBuildingId` to `lotManager.updateVisibility()`. |
| `src/materials/ProceduralTextureGen.ts` | 2 | Replace canvas `Inter` font with `'Plus Jakarta Sans', sans-serif`. |
| `src/ui/components/FirstPersonHUD.tsx` | 2 | Replace fallback font strings with Plus Jakarta Sans and JetBrains Mono. |
| `tests/*.test.ts` | 1, 2, 3 | Update tests that assert old font names (`Space Grotesk`, `Space Mono`) to expect `Plus Jakarta Sans` and `JetBrains Mono`. |

---

## 6. Verification and Test Strategy
1. **TypeScript Compilation**: `npx tsc --noEmit` must return 0 errors.
2. **Vitest Unit Tests**: `npx vitest run` must pass 100% across all suites.
3. **Build Check**: `npm run build` must compile cleanly into production bundles.
4. **Visual Verification**:
   - Welcome/Login screen and World Hub modal display the new Infinite Isometric Monolith logo.
   - TopHeader has no "Misi & Skor" button and shows the emerald real-time FPS counter and 4-choice view mode pill.
   - SideUtilityDock has no "BELAJAR" section.
   - SettingsModal displays sharp charcoal black text on frosted glass with zero white-on-white text; graphics quality options smoothly slide with spring physics.
   - Rooftop violation badges are hidden in normal navigation mode and only appear when selecting a building or opening Zone/Build tools.
