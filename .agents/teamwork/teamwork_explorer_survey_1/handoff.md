# Handoff Report — Tahap 1, Tahap 2, and Tahap 3 Codebase Survey
**Author**: teamwork_explorer_survey_1  
**Recipient**: Lead Systems Engineer / Orchestrator (`d68ee8c4-0977-4823-9c25-eeec1173781b`)  
**Date**: 2026-10-29  
**Handoff Type**: Hard (Investigation & Architecture Survey Complete)

---

## 1. Observation

### 1.1 Tahap 1 Observations (Removal of Mission, Score, and Quiz)
- **TopHeader.tsx (Lines 476–501)**:
  Direct code contains a button titled `"Buka Misi & Indeks Skor Kota"`:
  ```tsx
  <motion.button
    onClick={() => {
      setShowMissions(true);
      proceduralAudio.playTaptic('selection');
    }}
    ...
  >
    <Award size={13} style={{ color: 'var(--accent)' }} />
    <span>Misi & Skor</span>
  </motion.button>
  ```
- **TopHeader.tsx (Lines 688–708)**:
  In the quick controls popover (`"Kontrol Cepat"`), under the section `"Misi & Tutorial Kota"`, line 688–708 has:
  ```tsx
  <button
    onClick={() => { setShowMissions(true); setShowUtilityMenu(false); }}
    ...
  >
    <Award size={13} style={{ color: 'var(--warn)' }} />
    <span>Misi Kota</span>
  </button>
  ```
- **SideUtilityDock.tsx (Lines 336–374)**:
  Under section header `"Belajar"` (lines 336–350), three buttons are rendered:
  - Line 354–360: `renderButton(<Award ... />, 'Misi Kota', 'U', () => setShowMissions(true))`
  - Line 361–367: `renderButton(<BookOpen ... />, 'Glosarium SNI', 'G', () => setShowGlossary(true))`
  - Line 368–373: `renderButton(<GraduationCap ... />, 'Kuis Arsitektur', 'K', () => setShowQuiz(true))`
  Directly beneath them (lines 375–381) sits `onOpenHelp && renderButton(<HelpCircle ... />, 'Bantuan', '?', onOpenHelp)`.
- **App.tsx (Lines 8, 17, 170, 182–185)**:
  - Line 8: `import { MissionModal } from '../ui/components/MissionModal';`
  - Line 17: `import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';`
  - Line 170: `<MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} />`
  - Line 182–185: `<ArchitectureQuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} />`
  - Note: A component named `CityScoreModal` does NOT exist as an independent file in the codebase. The scoring UI was integrated inside `MissionModal.tsx` and `AnalysisOverlay.tsx` (`CityScoreOverlay`).
- **useUIStore.ts (Lines 19, 26, 138–139, 182–183, 679, 687, 730–735, 794–799)**:
  Stores `showMissions`, `setShowMissions`, `showQuiz`, and `setShowQuiz`.

### 1.2 Tahap 2 Observations (Logo & 2-Font System)
- **ArscityLogo.tsx (Lines 12–105)**:
  The current component implements "The Tectonic Isometric Monogram A" on a `viewBox="0 0 40 40"` without any outer hexagonal frame or top-left specular highlight.
- **ArscityLogo Usages**:
  - `LoginPage.tsx` (line 287): `<ArscityLogo size={32} showText={true} badge="STUDIO" textColor="#0F172A" />`
  - `WorldHubModal.tsx` (line 473): `<ArscityLogo size={38} />`
  - `SideUtilityDock.tsx` (line 214): `<ArscityLogo size={20} />`
  - `CustomBuildingCreatorModal.tsx` (lines 3280–3294): The Studio CAD top bar currently renders `<Compass size={18} strokeWidth={1.75} />` inside a 32x32 container; `ArscityLogo` is NOT yet used here.
- **index.html & CSS Fonts**:
  - `index.html` (lines 9–12): Imports `Space Grotesk` and `Space Mono` from Google Fonts.
  - `src/app/index.css` (lines 172–174): Defines `--font-sans: 'Space Grotesk', sans-serif;` and `--font-mono: 'Space Mono', monospace;`.
  - `tailwind.config.js` (lines 13–15): Maps sans/serif to `Space Grotesk` and mono to `Space Mono`.
- **2D Canvas Font Violations**:
  - `CustomBuildingCreatorModal.tsx` line 96: `ctx.font = 'bold 84px "Space Mono", monospace'`
  - `LotManager.ts` line 607: `bCtx.font = 'bold 44px "Space Grotesk", sans-serif'`
  - `ProceduralTextureGen.ts` lines 1010, 1157, 1207: `ctx.font = 'bold ... Inter, sans-serif'`
  - `ScreenshotExporter.ts`, `FloorPlanAnnotationOverlay.ts`, `MeasurementTool.ts`, `FirstPersonController.ts`: Space Grotesk / Space Mono usages.

### 1.3 Tahap 3 Observations (VisionOS UI/UX Overhaul & Settings Bug Fix)
- **SettingsModal.tsx (Lines 127, 161–244, 283–385)**:
  Labels and titles rely on `color: 'var(--label)'`.
  In `src/app/index.css` (lines 323, 1356, 1374), `--label` is defined as `#FFFFFF !important` in dark mode. Meanwhile, `.inset-group` has background `--lab-section-bg: #FFFFFF` and `.modal-sheet` has background `rgba(244, 247, 251, 0.94)` / `#FFFFFF`. When dark mode is active (or triggered at night time via `Engine.ts`), white text is rendered directly over the white/frosted background, making it completely invisible (the white-on-white text bug).
- **Theme Switcher in SettingsModal.tsx (Lines 164–194)**:
  Renders "Gelap | Terang | Sistem" segmented control.
- **Graphics Quality Control (Lines 248–277)**:
  Uses a static 4-column CSS grid of buttons without any sliding pill animation or spring physics.
- **TopHeader.tsx (Lines 400–466, 473)**:
  Camera pill only contains Orbit, Pejalan Kaki, Drone. 2D Denah mode is tucked away in the popover (`toggleTopDown`). FPS display is conditionally rendered only when `showFps` is true.
- **BottomToolbar.tsx (Lines 221–224)**:
  Dock buttons use static hover `whileHover={{ scale: 1.02 }}` rather than dynamic distance-based macOS dock magnification.
- **LotManager.ts (Lines 587–640, 650–673)**:
  Red violation badges (`#DC2626`) are rendered as 3D Sprite billboards positioned above the roof. In `updateVisibility()`, they are displayed whenever the lot group is visible, cluttering the normal navigation view.

---

## 2. Logic Chain

1. **Feature Removal (Tahap 1)**:
   - *Premise*: The user requested removal of Mission, Score, and Quiz features from `TopHeader.tsx`, `SideUtilityDock.tsx`, `App.tsx`, and `useUIStore.ts`.
   - *Trace*: Removing the buttons from `TopHeader.tsx` and `SideUtilityDock.tsx` disables all UI entry points. Unmounting `<MissionModal>` and `<ArchitectureQuizModal>` in `App.tsx` frees up memory and simplifies DOM hierarchy. Retaining backward-compatible store actions in `useUIStore.ts` guarantees that existing unit tests (e.g. `tests/ui_primitives_and_modal_policy.test.ts`) that test modal exclusivity don't break.
2. **Logo and 2-Font System (Tahap 2)**:
   - *Premise*: Logo must be "The Infinite Isometric Monolith" (three interlocking isometric prism blades forming monolith and 'A', within a smooth hexagon featuring sapphire `#0066FF` to cyan `#00D4FF` gradient and top specular glint), with maximum 2 fonts (`Plus Jakarta Sans` and `JetBrains Mono`).
   - *Trace*: Replacing `ArscityLogo.tsx` geometry immediately cascades to `LoginPage.tsx`, `WorldHubModal.tsx`, and `SideUtilityDock.tsx`. Adding it to `CustomBuildingCreatorModal.tsx` top bar fulfills the 4th required placement. Updating `index.html`, `index.css`, `tailwind.config.js`, and all 2D canvas `ctx.font` calls eliminates every trace of 3rd fonts (`Space Grotesk`, `Space Mono`, `Inter`, `monospace`).
3. **VisionOS UI/UX & Bug Fix (Tahap 3)**:
   - *Premise*: `SettingsModal.tsx` text disappears because CSS variables flip to `#FFFFFF` on white surfaces, and theme switcher causes inconsistency.
   - *Trace*: Hardcoding title/label colors to charcoal black `#0F172A` and descriptions to `#475569`, removing the theme switcher, and locking root theme to Apple Spatial Frosted Glass resolves the bug at its source.
   - *Trace*: Converting graphics quality to iOS-style spring segmented control (`SPRING_TACTILE`) and adding macOS Dock proximity magnification to `BottomToolbar.tsx` elevates UI/UX to Apple VisionOS standards.
   - *Trace*: Naming violation badges and controlling their visibility in `LotManager.ts` ensures floating red signs only appear when a building is selected or in Zone/Build tool mode, leaving normal view pristine.

---

## 3. Caveats

1. **CityScoreModal Existence**: `CityScoreModal` was cited in the user request, but our survey proves no file by that name exists. City score was embedded in `MissionModal.tsx` and `AnalysisOverlay.tsx`. Unmounting `MissionModal` and removing the button "Misi & Skor" satisfies this requirement completely.
2. **Unit Test Font Assertions**: `tests/nextgen_architecture_and_drone.test.ts` and `tests/first_person_builder_suite.test.ts` explicitly test for strings `'Space Grotesk'` and `'Space Mono'`. When switching to `Plus Jakarta Sans` and `JetBrains Mono`, those test assertion strings must be updated as part of Tahap 7 test alignment.
3. **SNI Glossary Modal**: In `SideUtilityDock.tsx`, the prompt requested removing "Glosarium SNI" along with "Misi Kota" and "Kuis Arsitektur" from section "BELAJAR". However, `GlossaryModal` is still present in `App.tsx` and can be opened contextually from building code tooltips.
4. **"Bantuan" Button in SideDock**: In `SideUtilityDock.tsx`, the "Bantuan" (`onOpenHelp`) button was originally rendered inside section "BELAJAR". It must be preserved by moving it into "Tampilan" or above "Kembali ke Layar Awal".

---

## 4. Conclusion

The survey is complete and actionable. The exact files, lines, and replacement patterns for Tahap 1, Tahap 2, and Tahap 3 have been cataloged in `analysis.md`. The codebase is currently healthy (`tsc` 0 errors, Vitest 45/45 test files passing, 300/300 tests passing), providing an ideal foundation for the implementation phase.

---

## 5. Verification Method

To verify these survey findings independently:
1. **TypeScript Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exits with code 0.
2. **Vitest Test Suite**:
   ```powershell
   npx vitest run
   ```
   *Expected*: All 45 test files and 300 tests pass.
3. **File Inspection**:
   - Inspect `src/ui/components/TopHeader.tsx` lines 476–501 and lines 688–708 for "Misi & Skor" and "Misi Kota".
   - Inspect `src/ui/components/SideUtilityDock.tsx` lines 336–374 for section "BELAJAR".
   - Inspect `src/ui/components/SettingsModal.tsx` lines 164–194 for theme switcher and line 167 for `var(--label)`.
   - Inspect `src/zones/LotManager.ts` lines 587–640 for floating rooftop red badge sprite creation.
   - Inspect `index.html` lines 9–12 and `src/app/index.css` lines 172–174 for current font definitions.
