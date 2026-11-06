## 2026-11-02T04:47:01Z
You are teamwork_worker_tahap1_1, an implementation specialist subagent for Tahap 1: Perbaikan 9 Bug Kritis (T1.1 - T1.9).
Your working directory is: c:\Projects\Arscity\.agents\teamwork\teamwork_worker_tahap1_1\

MANDATORY FIRST STEP:
Read c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Also read the detailed survey findings and blueprints prepared by the Explorers:
- c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_v4_survey_1\handoff.md (Detailed findings for T1.1, T1.2, T1.3)
- c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_v4_survey_1\analysis.md
- c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_v4_survey_2\handoff.md (Detailed findings for T1.4, T1.5, T1.6, T1.7, T1.8, T1.9)
- c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_v4_survey_2\analysis.md
- c:\Projects\Arscity\docs\audit\warna_gelap.txt
- c:\Projects\Arscity\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

GLOBAL RULES TO FOLLOW:
- G1: Only CC0/MIT/open source assets.
- G2: Indonesian UI language & Indonesian number formatting (comma decimal, space before unit, e.g. "11,96 m"). No emojis in UI.
- G3: UI colors via theme tokens only. NO !important for colors, NO literal hex/rgb in components. Tokens defined in src/app/index.css / themeTokens.
- G5: Strictly implement prompt requirements.
- G7: Finish with: npx tsc --noEmit (0 error), npx vitest run (all pass), npm run build (success), console clean.
- "Satu commit per ID": Create a git commit for EACH task ID (T1.1 through T1.9) as each is completed and verified.

TASKS TO IMPLEMENT (T1.1 through T1.9):

T1.1: FPS drop at night (lights)
- Files: src/core/engine/LightingSystem.ts, src/core/engine/Engine.ts, src/materials/MaterialLibrary.ts, src/world/LandscapeManager.ts, src/buildings/InteriorInteractiveSystem.ts, src/roads/RoadPropPlacer.ts, src/core/engine/PostProcessingManager.ts.
- Steps:
  1. Deactivate indoor ceiling PointLight pool in InteriorInteractiveSystem.ts (guarantee active PointLight count is 0).
  2. Remove `needsUpdate = true` on uniform changes in `MaterialLibrary.ts:setNightGlow` and `LandscapeManager.ts:updateNightGlow`.
  3. Street lamp and window shared emissive material cache with smooth emissiveIntensity ramp (rise 17:30 to 18:30, fall 05:00 to 06:00).
  4. Street lamp glow effect: enable bloom on 'high' and 'ultra' in PostProcessingManager.ts, smooth emissive on lamp glow mesh.
  5. Primary lighting: single DirectionalLight (sun day, faint moon night) + light hemisphere.
- Pass: active PointLight count is 0, smooth night transitions without shader recompilation stalls.

T1.2: Stars looking like dust balls on grass
- File: src/core/engine/LightingSystem.ts, src/core/engine/Engine.ts
- Steps:
  1. starDome follows camera: every frame in Engine.ts renderLoop or LightingSystem update, copy camera position to star dome before render. Set frustumCulled = false.
  2. Radius: 0.9 * camera.far (or 4000m if camera.far > 4500). Material: depthWrite false, depthTest false, renderOrder = -1000, fog false.
  3. Star points use fixed pixel size: sizeAttenuation = false.
  4. Only visible at night, with fade based on game hour.
- Pass: stars never touch ground or change size regardless of camera height/angle; no stars during daytime.

T1.3: Malioboro layout untidy
- File: src/world/MalioboroPreset.ts
- Steps:
  1. Replace hardcoded arrays with parametric placement (corridor length, road width, lot width, front setback).
  2. Eliminate the 3 identified collisions (ruko vs joglo, ruko vs jl pajeksan, bale vs pendopo).
  3. Add unit test (tests/malioboro_no_overlap.test.ts) verifying no building polygon overlaps with other buildings or roads (0.1m tolerance).
- Pass: unit test passes with 0 overlaps.

T1.4: Seragamkan antarmuka ke satu tema kaca putih terang
- Files: UI components and src/app/index.css
- Steps:
  1. Fix the accessibility bug in `src/app/index.css:1295` where `@media (prefers-reduced-transparency)` sets `--surface: #0f172a !important;`.
  2. Replace literal dark backgrounds with frosted glass tokens (bg rgba(255, 255, 255, 0.92), blur 24px, saturate 180%, border #E2E8F0, soft shadow).
  3. Text and icons use token label (#0F172A), icons use currentColor.
  4. Confirm Dark and System theme options are hidden from SettingsModal.
- Pass: 0 literal dark background colors in UI components, contrast tests pass (text >= 4.5:1, icons >= 3:1).

T1.5: TopHeader fixed center
- File: src/ui/components/TopHeader.tsx
- Steps:
  1. `position: fixed`, `top: 16px`, `left: 50%`, `transform: translateX(-50%)`, `width: max-content`, `maxWidth: calc(100vw - 32px)`.
  2. `zIndex: 50` (above side panels and docks).
  3. On narrow viewports (e.g. 1366x768 with panels open), collapse/move secondary controls into "Lainnya" popover so it does not overflow or clip.
- Pass: TopHeader remains centered and fully visible at 1366x768 and 1920x1080 even when left and right docks are open.

T1.6: Tombol "Cerah" dan 2 tombol bulat di sebelah kanan
- File: src/ui/components/TopHeader.tsx
- Steps:
  1. Button background uses token `var(--fill-control)` (#F1F5F9).
  2. Text and icons use token `var(--label)` (#0F172A), icons use `currentColor`.
  3. No `!important`. Circular buttons have true circular shape (`border-radius: 50%` or pill).
- Pass: "Cerah" text and both circular button icons clearly visible with high contrast.

T1.7: Teks preset grafis "Rendah", "Sedang", "Tinggi", "Ultra"
- Files: src/ui/components/SegmentedControl.tsx, src/ui/components/SettingsModal.tsx
- Steps:
  1. Inactive button text uses `var(--label)` with `fontWeight: 600`.
  2. Active button uses `var(--accent)` (#007AFF) background with pure white text (`#FFFFFF`).
- Pass: all graphics preset labels clearly legible, active and inactive.

T1.8: Mode Foto Arsitektur tombol ganda
- Files: src/ui/components/FirstPersonHUD.tsx, src/core/engine/CinematicDroneController.ts
- Steps:
  1. Remove duplicate "Ambil Foto PNG" button.
  2. Ensure 35mm lens is supported in CinematicDroneController lenses array alongside 24mm, 50mm, 85mm.
  3. Unify lens choices (24mm, 35mm, 50mm, 85mm), "Ambil Foto PNG" button, and Exit button in a single frosted glass bottom bar.
  4. Ensure FirstPersonHUD only renders photo bar when in first-person/drone photo mode.
- Pass: only one single bottom bar, no stacked/duplicate buttons.

T1.9: Menu titik tiga "Ganti Nama" terpotong di Daftar Kota Tersimpan
- File: src/ui/components/WorldHubModal.tsx
- Steps:
  1. Auto-flip popover direction: default downwards (`top: 34px`), flip upwards (`bottom: 34px`, `top: auto`) when remaining bottom space in modal is less than menu height (~160px).
  2. Clamp boundaries so it never overflows the modal viewport.
- Pass: menu is never clipped, including on low height windows and on the last row of the list.

FINAL VERIFICATION:
- Commit each task ID with a clear message: e.g. `feat(T1.1): ...`, `feat(T1.2): ...`, etc.
- Run `npx tsc --noEmit` -> must be 0 errors.
- Run `npx vitest run` -> all tests must pass.
- Run `npm run build` -> production build must succeed cleanly.
- Document all file modifications, commit hashes, and test results in `handoff.md`.
- Send a completion message via send_message when done.


## 2026-11-02T05:18:57Z
**Context**: Pause execution requested by user
**Content**: The user has requested to pause execution ("pause"). Since you are currently running verification tests for T1.4, please finish verifying T1.4, commit T1.4 if tests pass, ensure all modified files are saved and committed cleanly, update your progress.md, and report your status. Pause further execution (do NOT proceed to T1.5) until resumed.
**Action**: Commit T1.4, update progress.md, and reply with your checkpoint status.

## 2026-11-02T07:24:07Z
**Context**: Resume execution instruction ("lanjutkan") received from user
**Content**: The user has instructed to resume execution ("lanjutkan"). Please resume working immediately from task T1.5 through T1.9:
- T1.5: TopHeader fixed center & responsive collapsible menu (position fixed, top 16px, left 50%, transform translateX(-50%), responsive collapse to "Lainnya" popover on narrow screens, z-index above docks).
- T1.6: Button "Cerah" & circular action buttons contrast & styling (fillControl background, label text, currentColor icon, no !important).
- T1.7: Graphics preset SegmentedControl contrast & styling (inactive text var(--label) with fontWeight 600, active pill var(--accent) with white text).
- T1.8: Photo Mode duplicate button removal, 35mm lens support in CinematicDroneController, and unified single glass bottom bar.
- T1.9: WorldHubModal 3-dots dropdown auto-flip when bottom space < 160px with boundary clamping.

Maintain the one-commit-per-task discipline, running tests and tsc after each task.
After finishing T1.9, run final verification: `npx tsc --noEmit` (0 error), `npx vitest run` (all pass), and `npm run build` (clean success).
Document all changes and test outputs in your `handoff.md` and send a completion message when done.
**Action**: Resume active execution starting with T1.5.
