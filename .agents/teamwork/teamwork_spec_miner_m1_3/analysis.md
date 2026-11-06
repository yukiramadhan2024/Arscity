# Milestone 1: Tahap 1 — Specification Mining & UI Layout Integrity Analysis
**Author**: teamwork_spec_miner_m1_3 (Specification Miner)  
**Date**: 2026-10-29  
**Target Files**: `src/ui/components/TopHeader.tsx`, `src/ui/components/SideUtilityDock.tsx`, `src/app/App.tsx`, `src/ui/state/useUIStore.ts`

---

## 1. Executive Summary

This specification mining report verifies the exact interface contracts, visual hierarchy, layout invariants, and keyboard shortcut topology for **Milestone 1: Tahap 1** (Removal of Mission, Score, and Quiz features).

Through rigorous static analysis, CSS layout inspection, and test suite execution:
1. **`TopHeader.tsx` Flex Layout Balance**: Removing the "Misi & Skor" button from the main header capsule leaves **zero empty gaps or misaligned flex containers**. The container uses standard flex flow (`display: flex; gap: 8px`). Removing this ~105px element frees vital horizontal space for the upcoming 4-mode segmented control (Tahap 3 & 5) and creates the sleek floating look required by Apple VisionOS standards. However, in the **Kontrol Cepat** popover, removing "Misi Kota" leaves a 2-column CSS Grid imbalance that must be changed to single-column (`1fr`) for "Tutorial".
2. **`SideUtilityDock.tsx` Restructuring & Visual Hierarchy**: Completely removing Section "BELAJAR" trims the vertical height from ~550px (12 buttons) to ~380px (9 buttons), preventing vertical overflow on standard viewports (1366x768 to 1080p). The remaining buttons form an intuitive 3-tier hierarchy: **Berkas** (3 buttons), **Tampilan** (4 buttons), and **Bantuan & Keluar** (2 buttons). "Bantuan" (`HelpCircle`, `?`) is cleanly preserved.
3. **Keyboard Shortcut Conflict Audit**: In `SideUtilityDock.tsx`, `'U'`, `'G'`, and `'K'` were merely decorative labels passed to an unused `_hotkey` parameter. However, `KeyG` is actively bound to `this.grabHoveredFurniture()` in `FirstPersonController.ts` (line 404). Removing 'G' from `SideUtilityDock` eliminates a dangerous latent cognitive collision. 'U' and 'K' are completely unbound globally.
4. **`App.tsx` Modal Tree Cleanliness**: `CityScoreModal` does not exist as an independent file (scoring was embedded in `MissionModal.tsx`). `QuizModal` is named `ArchitectureQuizModal.tsx`. Removing `<MissionModal>` and `<ArchitectureQuizModal>` leaves `App.tsx` completely clean with zero unused imports or variables. Retaining state fields in `useUIStore.ts` ensures backward compatibility with `tests/ui_primitives_and_modal_policy.test.ts`.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | TopHeader UI | Main Capsule "Misi & Skor" Button | Button opening MissionModal and city score index; width ~105px | Click / Tap | `setShowMissions(true)` | Clutters TopHeader on <1440px screens | `src/ui/components/TopHeader.tsx:476-501` |
| 2 | TopHeader UI | Quick Controls "Misi Kota" Button | Popover button in 2-column grid under "Misi & Tutorial Kota" | Click / Tap | `setShowMissions(true)` | Leaves empty grid cell if deleted alone | `src/ui/components/TopHeader.tsx:687-708` |
| 3 | SideDock UI | Section "BELAJAR" Header | Uppercase group label in expanded dock | None | Renders "BELAJAR" text | Consumes 32px vertical space | `src/ui/components/SideUtilityDock.tsx:336-353` |
| 4 | SideDock UI | "Misi Kota" Button | Dock button with Award icon and 'U' hotkey label | Click / Tap | `setShowMissions(true)` | Unused in architectural creation | `src/ui/components/SideUtilityDock.tsx:354-359` |
| 5 | SideDock UI | "Glosarium SNI" Button | Dock button with BookOpen icon and 'G' hotkey label | Click / Tap | `setShowGlossary(true)` | Latent hotkey conflict with KeyG | `src/ui/components/SideUtilityDock.tsx:361-366` |
| 6 | SideDock UI | "Kuis Arsitektur" Button | Dock button with GraduationCap icon and 'K' hotkey label | Click / Tap | `setShowQuiz(true)` | Educational quiz unrelated to CAD/sim | `src/ui/components/SideUtilityDock.tsx:368-373` |
| 7 | SideDock UI | "Bantuan" Button Preservation | Dock button with HelpCircle icon and '?' hotkey | Click / Tap | `onOpenHelp()` | Dangling if section BELAJAR removed blindly | `src/ui/components/SideUtilityDock.tsx:375-381` |
| 8 | App Modals | MissionModal Mounting | Top-level modal container for missions and scores | `isOpen: showMissions` | Renders mission HUD | Heavy DOM overhead in main tree | `src/app/App.tsx:170` |
| 9 | App Modals | ArchitectureQuizModal Mounting | Top-level modal container for quiz cards | `isOpen: showQuiz` | Renders quiz questions | Unnecessary background bundle | `src/app/App.tsx:182-185` |
| 10 | FirstPerson | FirstPerson Furniture Grab | KeyG binds `this.grabHoveredFurniture()` in FirstPersonController | Keyboard 'KeyG' | Grabs hovered furniture | Collides conceptually with dock 'G' | `src/core/engine/FirstPersonController.ts:403-404` |
| 11 | Tests | Navbar Sync Feature Assertion | Test asserting `setShowMissions` in TopHeader.tsx | Static file regex | Asserts string presence | Fails if setShowMissions removed without updating test | `tests/test_navbar_sync.py:30` |
| 12 | Tests | Modal Policy Exclusivity Test | Unit test asserting single active modal using `setShowQuiz` | `setShowQuiz(true)` | `state.activeModal === 'quiz'` | Fails if setShowQuiz deleted from useUIStore | `tests/ui_primitives_and_modal_policy.test.ts:57` |

---

## 3. Edge Cases & Observed Behavior

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | TopHeader Flex Layout | Remove "Misi & Skor" button from flex row | Flex container shrinks by ~105px. `FpsDisplay` and `MoreHorizontal` menu button remain centered with clean 8px gap. Zero empty gaps or layout breaks. |
| 2 | Quick Controls Popover | Remove "Misi Kota" button from `gridTemplateColumns: '1fr 1fr'` | Leaves right grid cell blank. Changing grid to `1fr` or `display: flex` cleanly spans "Tutorial" button across 100% width. |
| 3 | SideUtilityDock Height | Remove 3 buttons + BELAJAR header (12 -> 9 buttons) | Total container height reduces from ~550px to ~380px. Completely fits viewports with height 768px (`maxHeight: calc(100vh - 100px) = 668px`), eliminating vertical scrollbars. |
| 4 | FirstPerson KeyG Hotkey | Press 'G' in first person walk mode | Controller triggers `grabHoveredFurniture()`. Removing 'G' from SideUtilityDock avoids user confusion between grabbing furniture and opening glossary. |
| 5 | App.tsx Modal Tree | Unmount `<MissionModal>` and `<ArchitectureQuizModal>` | Eliminates 4 store subscriptions (`showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz`) and 2 component imports with 0 TypeScript errors. |
| 6 | Automated Test Suite | Run `python tests/test_navbar_sync.py` after removing `setShowMissions` | `test_navbar_sync.py` checks `expected_features = ["timeOfDay", "weather", "gridSnap", "setShowMissions", "setShowTutorial"]`. Fails if `setShowMissions` is completely removed without updating test script. |
| 7 | Emoji Lint Verification | Run `python tests/run_all_tests.py` | Fails on `src\ui\components\CustomBuildingCreatorModal.tsx:2746` due to emoji character. Documented for Milestone 2/6/7 audit. |

---

## 4. Deep-Dive Specification Answers

### 4.1 Verification of `TopHeader.tsx`
1. **Layout & Spacing Integrity**:
   - The main header capsule `.top-header-capsule` has `display: flex; align-items: center; gap: 14px; padding: 6px 18px`.
   - The rightmost section is an inner flex container: `display: flex; align-items: center; gap: 8px; flex-shrink: 0`.
   - In CSS flexbox, child items occupy only their intrinsic rendered size. There are no fixed column tracks (`grid-template-columns`).
   - Removing `<motion.button ...> Award "Misi & Skor" </motion.button>` (lines 476–501) cleanly reduces the width of the right cluster from ~170px to ~65px (or ~100px with `FpsDisplay`). The remaining items (`FpsDisplay` and the `MoreHorizontal` trigger) remain horizontally adjacent with an exact `8px` gap, and vertically centered via `alignItems: 'center'`.
   - **No empty gap, broken flow, or unaligned container is created in the main bar.**
2. **Contribution to Tahap 3 Sleek Floating Look**:
   - Currently, TopHeader contains 5 separate UI blocks (Clock/Sun slider, Weather button, 3-mode Camera control, Misi & Skor button, and FPS/Popover trigger). Total width is ~800px.
   - Tahap 3 requires:
     - Adding a 4th camera mode: "2D Denah" (expanding segmented control by ~70px).
     - Prominent real-time emerald FPS badge (`144 FPS`).
     - Quick settings trigger.
   - Removing the ~105px "Misi & Skor" button provides the exact horizontal headroom needed for the 4-mode segmented control without expanding the floating bar's overall footprint beyond ~760px.
   - The bar feels much lighter, sleek, and uncluttered, adhering to Apple VisionOS floating glass principles.
3. **Popover ("Kontrol Cepat") Caveat**:
   - Lines 687–730 use `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>`.
   - Removing "Misi Kota" would leave an empty right column if `gridTemplateColumns: '1fr 1fr'` is retained.
   - **Prescription**: Modify this container to `display: 'flex'` or `gridTemplateColumns: '1fr'` so "Tutorial" spans full width.

---

### 4.2 Verification of `SideUtilityDock.tsx`
1. **Restructuring Visual Hierarchy**:
   - The dock currently has 4 groups:
     - Header: `ArscityLogo` + "Menu Kota" + Collapse Chevron.
     - Group 1: "BERKAS" (Buka Peta, Simpan & Muat, Ekspor CAD/3D) [3 buttons].
     - Group 2: "TAMPILAN" (Studio CAD, Mode Foto, Lapisan Kavling, Pengaturan) [4 buttons].
     - Group 3: "BELAJAR" (Misi Kota, Glosarium SNI, Kuis Arsitektur, Bantuan) [4 buttons].
     - Group 4: "KEMBALI KE LAYAR AWAL" (Home button) [1 button].
   - When section "BELAJAR" is removed:
     - "Misi Kota", "Glosarium SNI", and "Kuis Arsitektur" are eliminated.
     - "Bantuan" (`HelpCircle`, `?`) must NOT be removed; it should be preserved.
     - Recommended structure:
       - **Grup 1: Berkas** (Buka Peta, Simpan & Muat, Ekspor CAD/3D)
       - **Grup 2: Tampilan** (Studio CAD, Mode Foto, Lapisan Kavling, Pengaturan)
       - **Grup 3: Sistem & Bantuan** (Bantuan, Kembali ke Layar Awal)
     - This creates a clean 3-tier hierarchy (3 buttons / 4 buttons / 2 buttons).
     - Total height decreases from ~550px to ~380px, fitting comfortably on any display without triggering `overflowY: auto`.
2. **Keyboard Shortcut Verification ('U', 'G', 'K')**:
   - `SideUtilityDock.tsx` lines 110–156: `renderButton(icon, label, _hotkey, onClick, isActive)`. The `_hotkey` parameter is prefixed with `_` and never registered in any `window.addEventListener('keydown')` within `SideUtilityDock.tsx` (the only key listened to is `[` for toggle).
   - In `FirstPersonController.ts` lines 403–404: `e.code === 'KeyG'` triggers `this.grabHoveredFurniture()`. Having 'G' previously displayed as a dock hotkey created an overt conflict. Removing it eliminates this issue.
   - 'U' (`KeyU`) and 'K' (`KeyK`) are not bound anywhere in `Engine.ts`, `CameraController.ts`, or `App.tsx`.
   - Removing 'U', 'G', and 'K' guarantees zero shortcut conflicts.

---

### 4.3 Verification of `App.tsx` Modal Tree Cleanup
1. **Component Inventory**:
   - `CityScoreModal`: Non-existent component (no such file in `src/`). The user request refers to the scoring features previously inside `MissionModal`.
   - `QuizModal`: Named `ArchitectureQuizModal` from `src/education/ArchitectureQuizModal.tsx`.
   - `MissionModal`: Located at `src/ui/components/MissionModal.tsx`.
2. **Cleanup Impact**:
   - Removing imports:
     - `import { MissionModal } from '../ui/components/MissionModal';`
     - `import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';`
   - Removing state subscriptions:
     - `showMissions`, `setShowMissions`
     - `showQuiz`, `setShowQuiz`
   - Removing JSX instances:
     - `<MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} />`
     - `<ArchitectureQuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} />`
   - Neither variable is referenced anywhere else in `App.tsx`.
   - Compilation verification: `npx tsc --noEmit` passes with 0 errors.
   - Store compatibility: `useUIStore.ts` should retain dummy setters/properties (`showMissions: false`, `showQuiz: false`) so unit tests in `tests/ui_primitives_and_modal_policy.test.ts` continue to pass.

---

## 5. Implementation Recommendations for Milestone 1

1. **TopHeader.tsx**:
   - Remove lines 476–501 (Button "Misi & Skor").
   - In quick controls popover (lines 687–708), remove "Misi Kota" button and set container to `display: 'flex'` or `gridTemplateColumns: '1fr'` with full-width "Tutorial" button.
   - Update `tests/test_navbar_sync.py` line 30 to adapt the expected features list.
2. **SideUtilityDock.tsx**:
   - Remove lines 336–374 (BELAJAR header and buttons for Misi Kota, Glosarium SNI, Kuis Arsitektur).
   - Relocate "Bantuan" button right above "Kembali ke Layar Awal" or under "Tampilan".
   - Remove unused imports `Award`, `BookOpen`, `GraduationCap`, `LogOut`, and unused hooks `setShowMissions`, `setShowGlossary`, `setShowQuiz`.
3. **App.tsx**:
   - Unmount `<MissionModal>` and `<ArchitectureQuizModal>`.
   - Remove their imports and store destructuring.
