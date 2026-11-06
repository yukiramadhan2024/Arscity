## 2026-11-02T12:35:07Z
You are `teamwork_worker_tahap3_1` operating in working directory `c:\Projects\Arscity\.agents\teamwork\teamwork_worker_tahap3_1\`.
Parent orchestrator conversation ID: `aafb2a0a-5e3b-45ab-a54f-5592069d1b2d`.

MANDATORY FIRST STEP:
Read `c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md` (specifically Section 6: TAHAP 3: ENAM LOGIKA PENGALAMAN MODE PEJALAN KAKI, tasks T3.1 to T3.6) and `c:\Projects\Arscity\PROJECT.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

GLOBAL RULES TO FOLLOW:
- G1: Open source CC0/MIT/Apache2/SIL OFL assets only. Update CREDITS.md if adding external assets.
- G2: Indonesian UI language via i18n, Indonesian number formatting (comma decimal, space before units). Zero emojis in UI.
- G3: Colors strictly via semantic design tokens. No `!important`, no literal hex/rgb in components.
- G4: Target 60 FPS stable on High preset; 100+ FPS indoors in first person.
- G5: Confine changes strictly to requested features.
- G6: Data is the source of truth. Visibility only affects rendering, never deletes data.
- G7: Every task ends with `npx tsc --noEmit` (0 error), `npx vitest run` (all pass), `npm run build` (clean success).

SCOPE OF WORK — TAHAP 3 (T3.1 - T3.6):
Main files: `src/core/engine/FirstPersonController.ts`, `src/buildings/InteriorInteractiveSystem.ts`, `src/audio/ProceduralAudio.ts`, `src/ui/components/FirstPersonHUD.tsx`, `src/ui/components/SettingsModal.tsx`, `src/ui/state/useUIStore.ts`.

1. **T3.1: Adaptasi cahaya mata**
   - Single exposure owner module in `FirstPersonController.ts` controlling `renderer.toneMappingExposure`.
   - Use `THREE.MathUtils.damp` with lambda ~3 (transition ~1.0s).
   - Outdoor baseline 1.05; under roof (`isUnderRoof === true`) rises to 1.28.
   - Apply as factor ~1.22 against game diurnal sun/ambient exposure so it works seamlessly with day/night cycle.
   - `isUnderRoof`: raycast upward 6m from avatar head detecting roof or ceiling with 150ms debounce. Orbit mode unaffected.
   - Commit: `feat(T3.1): eye light adaptation with damped tone mapping exposure and roof raycast`

2. **T3.2: Naik langkah otomatis tanpa lompat**
   - Predictive auto step-up when moving forward and surface ahead is 0.05m to 0.42m higher.
   - Elevate avatar Y with damp (lambda ~12).
   - Constraints: headroom above new height >= 1.7m, not a furniture surface, not a vertical wall (>0.42m blocks forward motion).
   - Commit: `feat(T3.2): predictive smooth step up for curbs and steps with headroom validation`

3. **T3.3: Pintu ayun dua arah**
   - In `InteriorInteractiveSystem.ts`: when player distance to door is < 2.2m, calculate dot product of (player position - door position) against door normal.
   - Door leaf swings AWAY from player around edge hinge axis (~100 degrees in ~0.35s with easing).
   - Closes automatically when player distance > 3.2m.
   - Door leaf excluded from player blocking collision, but respects avatar near-plane so it doesn't clip face.
   - Commit: `feat(T3.3): two way swinging interactive doors opening away from avatar approach`

4. **T3.4: Naik lantai (dua cara)**
   - Physical walking traversal via 3D `StairZone`.
   - Hotkeys [PageUp] / [PageDown] and HUD floor buttons (Lt. 1, Lt. 2, etc.): teleport to nearest safe clearance point on target floor (near stair top or clear spot, not inside walls or furniture) with 150ms screen fade.
   - Only allow floors that exist on the host building.
   - After floor change: trigger update for `isUnderRoof`, `updateSpatialLOD`, and microclimate card.
   - Commit: `feat(T3.4): dual floor navigation with physical stairs and safe teleportation hotkeys`

5. **T3.5: Suara langkah berdasarkan material**
   - In `ProceduralAudio.ts`: detect surface material under avatar foot (downward raycast detecting surface tags: 'grass', 'asphalt', 'paving'/'concrete', 'wood', 'ceramic'/'marble', 'dirt').
   - Trigger procedural footstep sound every 1.8m traversed with distinct synthesized filtered noise profile per material.
   - Max 4 concurrent voices.
   - Resume `AudioContext` on first user interaction, respect audio volume settings and mute.
   - Commit: `feat(T3.5): surface material footstep procedural audio with Web Audio API`

6. **T3.6: Goyangan kamera halus**
   - Vertical head bobbing (~0.015m amplitude) synchronized with walking cadence.
   - Smoothly damp to stop within ~0.15s when idle or when aiming/placing furniture.
   - Automatically disabled if `prefers-reduced-motion` or setting "Kurangi Animasi" is enabled.
   - Add toggle "Goyangan kamera" in `SettingsModal.tsx` and UI store.
   - Commit: `feat(T3.6): smooth walking head bobbing with reduce motion support and toggle`

7. **Unit & Integration Tests**:
   - Create `tests/v4_first_person_experience.test.ts` covering all 6 logics with automated assertions.
   - Ensure `npx tsc --noEmit`, `npx vitest run`, and `npm run build` all pass cleanly.

8. **Handoff Report**:
   - Write `c:\Projects\Arscity\.agents\teamwork\teamwork_worker_tahap3_1\handoff.md` with commit hashes, test results, and file diffs.
   - Send completion message to parent when finished.
