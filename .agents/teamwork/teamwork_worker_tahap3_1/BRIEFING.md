# BRIEFING — 2026-11-02T13:21:00Z

## Mission
Implement Tahap 3: Enam Logika Pengalaman Mode Pejalan Kaki (T3.1 - T3.6) with full tests, Indonesian UI, type safety, and clean build.

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Projects\Arscity\.agents\teamwork\teamwork_worker_tahap3_1\
- Original parent: aafb2a0a-5e3b-45ab-a54f-5592069d1b2d
- Milestone: Tahap 3 (T3.1 - T3.6)

## 🔒 Key Constraints
- G1: Open source CC0/MIT/Apache2/SIL OFL assets only. Update CREDITS.md if adding external assets.
- G2: Indonesian UI language via i18n, Indonesian number formatting (comma decimal, space before units). Zero emojis in UI.
- G3: Colors strictly via semantic design tokens. No `!important`, no literal hex/rgb in components.
- G4: Target 60 FPS stable on High preset; 100+ FPS indoors in first person.
- G5: Confine changes strictly to requested features.
- G6: Data is the source of truth. Visibility only affects rendering, never deletes data.
- G7: Every task ends with `npx tsc --noEmit` (0 error), `npx vitest run` (all pass), `npm run build` (clean success).
- Integrity Mandate: DO NOT CHEAT. All implementations must be genuine. Maintain real state and behavior.

## Current Parent
- Conversation ID: aafb2a0a-5e3b-45ab-a54f-5592069d1b2d
- Updated: 2026-11-02T12:35:00Z

## Task Summary
- **What to build**: 6 First Person Experience Logics:
  1. T3.1: Eye light adaptation (toneMappingExposure damp lambda ~3, 1.05 outdoor baseline to 1.28 under roof, 150ms throttled upward raycast, orbit mode unaffected)
  2. T3.2: Predictive smooth step-up (0.05m–0.42m height with damp lambda ~12, headroom >= 1.7m, furniture prohibited, vertical walls >0.42m blocked)
  3. T3.3: Two-way swinging interactive doors (open away from avatar via dot product against door normal, ~100 deg in ~0.35s with easing, auto close >3.2m, excluded from wall collision)
  4. T3.4: Dual floor navigation (physical stair traversal + PageUp/PageDown & HUD buttons with safe clearance point, 150ms screen fade, triggers spatial updates)
  5. T3.5: Surface material footstep procedural audio (Web Audio noise synthesis for grass, asphalt, paving, wood, ceramic, dirt every 1.8m, max 4 concurrent voices)
  6. T3.6: Smooth walking camera bobbing (~0.015m amplitude, idle damp ~0.15s, disabled on aiming/placing furniture, reduceMotion support, Settings toggle)
  7. Comprehensive Unit & Integration test suite in `tests/v4_first_person_experience.test.ts` (30 tests)
- **Success criteria**: All 6 features implemented genuinely, 100% tests pass (538/538), 0 tsc error, clean build.
- **Interface contracts**: PROJECT.md & ORIGINAL_REQUEST.md
- **Code layout**: src/core/engine, src/buildings, src/audio, src/ui

## Key Decisions Made
- [T3.1]: Exposure module encapsulated in `FirstPersonController`, damp lambda 3.0 smoothly interpolates `renderer.toneMappingExposure`. Debounced upward raycast throttled to 150ms intervals and clamped to 6.0m max distance. On `exit()`, baseline exposure is restored.
- [T3.2]: Forward probing raycast predicts step-up (0.05m to 0.42m). Low horizontal raycast (`_scratchOriginLow` at 0.50m from foot) blocks vertical obstacles >0.42m. Headroom check validates >=1.7m above target height. `isSurfaceFurniture` prevents stepping onto tables.
- [T3.3]: Calculated dot product between `(playerPos - doorPos)` and door normal to set `swingDirection = dot >= 0 ? -1 : 1`. Opens away from approach direction up to 100 degrees (~1.745 rad). Backward-compatible close threshold (3.2m for 100° swing doors, 2.8m for standard 90° doors). Door leaf excluded from blocking collision.
- [T3.4]: Dual traversal implemented: continuous 3D `StairZone` updates floor during walk; hotkeys / HUD floor buttons teleport to safe clearance landing spot avoiding furniture/walls, with 150ms screen fade and post-teleport LOD/microclimate refresh.
- [T3.5]: Procedural noise & bandpass/lowpass filters synthesized per surface type. Voice concurrency capped at 4 voices. Footstep triggers every 1.8m traversed distance.
- [T3.6]: Head bobbing (~0.015m amplitude) damps to 0 within ~0.15s upon stopping or when aiming/placing furniture. Automatically respects `reduceMotion` and new UI store `cameraBobbing` setting.

## Artifact Index
- DISPATCH.md — Assignment instructions
- BRIEFING.md — Persistent context & memory
- progress.md — Liveness heartbeat & step tracking
- handoff.md — 5-component handoff report

## Change Tracker
- **Files modified**:
  - `src/core/engine/FirstPersonController.ts`: Exposure owner, predictive step-up, floor navigation, footsteps accumulator, camera bobbing.
  - `src/buildings/InteriorInteractiveSystem.ts`: Two-way swing doors away from avatar approach, close threshold hysteresis.
  - `src/audio/ProceduralAudio.ts`: Procedural footstep audio synthesis for 6 materials, 4-voice concurrency limit.
  - `src/ui/components/FirstPersonHUD.tsx`: 150ms screen fade overlay, direct floor buttons.
  - `src/ui/components/SettingsModal.tsx`: Indonesian toggle row for "Goyangan kamera".
  - `src/ui/state/useUIStore.ts`: `cameraBobbing` state and setter with persistence.
  - `src/core/engine/Engine.ts`: Calibrated initial baseline exposure.
  - `tests/v4_first_person_experience.test.ts`: 30 new automated unit and integration tests.
- **Build status**: `npm run build` succeeded cleanly (9.37s). `npx tsc --noEmit` 0 errors.
- **Pending issues**: None.

## Quality Status
- **Build/test result**: 65 test files passed, 538 tests passed (100% pass).
- **Lint status**: 0 TypeScript compilation errors.
- **Tests added/modified**: `tests/v4_first_person_experience.test.ts` (30 tests covering T3.1 to T3.6).

## Loaded Skills
- None requested in dispatch prompt.
