# Quality & Adversarial Review Report — Tahap 3 (T3.4, T3.5, T3.6) First-Person UI & Audio

- **Reviewer**: reviewer_m3_2
- **Roles**: reviewer, critic
- **Verdict**: **APPROVE**
- **Date**: 2026-11-02T13:36:00Z
- **Target Deliverables**:
  - T3.4: Dual Floor Navigation (Physical stairs traversal & instant teleportation)
  - T3.5: Surface Material Footstep Audio (Procedural Web Audio API synthesis for 6 materials)
  - T3.6: Smooth Camera Bobbing & Settings Toggle (Amplitude ~0.015m, cadence sync, damp to rest in ~0.15s, settings modal toggle)

---

## 1. Observation

Direct code inspections and tool command outputs:

1. **T3.4: Dual Floor Navigation**
   - In `src/core/engine/FirstPersonController.ts`:
     - Lines 1258–1312: `calculateGroundHeight()` inspects `bld.userData?.stairZones`. Inside stair footprint (`localX` within flight bounds and `localZ` within `zStart` and `zEnd`), parameter $t$ is calculated via $t = \text{clamp}((localZ - zStart) / (zEnd - zStart), 0, 1)$. Calculates continuous ramp elevation `stairElevation = bld.position.y + currentZone.baseFloorY + t * currentZone.floorHeight`. Updates `currentFloor` to `floorIndex + 2` at $t \ge 0.98$ and `floorIndex + 1` at $t \le 0.02$.
     - Line 985: `this.smoothedCameraY = THREE.MathUtils.damp(this.smoothedCameraY, this.position.y, 16.0, dt)` ensures smooth vertical camera motion across stair risers without camera jitter.
     - Lines 2175–2224: `findSafeFloorClearancePoint()` checks if current player $(x, z)$ on target floor is within inner walls (`innerHalfW`, `innerHalfL`) and free of furniture collision (`collidesWithFurniture`). If blocked, evaluates rotated landing zone `stairLandingLocal = (-Math.max(1.2, (bld.width || 12) * 0.22) - 0.68, 0, 1.8)`. If landing collides, safely falls back to room center `(bld.position.x, groundY + eyeHeight, bld.position.z)`.
     - Lines 2226–2234: `triggerFloorTransitionFade(150)` sets `isFloorFading = true` and schedules reset after 150ms timeout.
     - Lines 2249–2276: `goToFloor(floorNum)` validates bounds ($1 \le \text{floorNum} \le \text{totalFloors}$), triggers 150ms fade, moves avatar to safe clearance point, updates `isUnderRoof`, calls `buildingManager.updateSpatialLOD(this.camera.position, true, this.insideBuildingId)`, and updates eye light adaptation.
     - Lines 454–460: Keyboard hotkeys `PageUp` and `PageDown` are captured with `e.preventDefault()` and delegate to `traverseFloor('up')` and `traverseFloor('down')`.
   - In `src/ui/components/FirstPersonHUD.tsx`:
     - Lines 254–267: 150ms screen fade overlay is conditionally rendered when `isFloorFading === true` with `backgroundColor: 'rgba(15, 23, 42, 0.40)'`, `backdropFilter: 'blur(8px)'`, and `transition: 'opacity 150ms ease-out'`.
     - Lines 1598–1662: When `isInsideBuilding && totalFloors > 1`, direct floor buttons (`Lt. 1`, `Lt. 2`, etc.) and `ChevronUp` / `ChevronDown` traversal buttons are rendered with active floor highlighting in `var(--accent)`.

2. **T3.5: Surface Material Footstep Audio**
   - In `src/audio/ProceduralAudio.ts`:
     - Line 8: `public static readonly MAX_FOOTSTEP_VOICES: number = 4;`
     - Lines 591–823: `playFootstep(material)` strictly enforces `if (!this.enabled || this.volume <= 0) return;` and `if (this.activeFootstepVoiceCount >= ProceduralAudio.MAX_FOOTSTEP_VOICES) return;`.
     - Implements 6 distinct procedural synthesis pipelines using standard Web Audio API primitives:
       - `grass`: Bandpass filter (1800 Hz, Q 1.2) over exponentially decaying white noise burst (duration 0.06s).
       - `asphalt`: Bandpass filter (600 Hz, Q 1.8) over coarse granular noise burst (duration 0.05s).
       - `paving`: Bandpass filter (1100 Hz, Q 2.2) combined with triangle pitch sweep oscillator (120 Hz $\to$ 50 Hz, duration 0.045s).
       - `wood`: Sine wave oscillator pitch sweep (210 Hz $\to$ 90 Hz) paired with resonant bandpass noise (380 Hz, Q 3.5, duration 0.06s).
       - `ceramic`: High-frequency bandpass noise (2800 Hz, Q 3.0) paired with sharp sine impact (800 Hz $\to$ 300 Hz, duration 0.035s).
       - `dirt`: Lowpass filter (350 Hz) over dull crunch noise (duration 0.055s).
     - Lines 601–603 & 820–822: Voices are safely released on source node `onended` callbacks and inside error catch blocks (`releaseVoice`), preventing voice count leakage.
   - In `src/core/engine/FirstPersonController.ts`:
     - Lines 960–969: Traversed horizontal distance accumulator `this.traversedDistance += horizontalDist;` when grounded. Every 1.8m traversed, fires `proceduralAudio.playFootstep(mat)` and preserves fractional remainder via `this.traversedDistance -= 1.8;`.
     - Lines 1515–1589: `detectSurfaceMaterial()` detects interior room types (terrace $\to$ `wood`, indoor room $\to$ `ceramic`), downward raycasts against roads (sidewalk $\to$ `paving`, roadway $\to$ `asphalt`), terrain (trench elevation $< -0.2$ $\to$ `dirt`, normal $\to$ `grass`), and defaults to `paving`.

3. **T3.6: Smooth Camera Bobbing & Settings Toggle**
   - In `src/core/engine/FirstPersonController.ts`:
     - Line 139: `public bobbingAmplitude: number = 0.015;` (~0.015m vertical amplitude).
     - Lines 993–1017: Cadence syncs with velocity: `const cadenceFreq = moveSpeed * 3.5; this.bobbingPhase += cadenceFreq * dt;`.
     - Suppresses bobbing target to `0.0` when idle, when aiming or placing furniture (`activeTool !== 'pointer'`, `grabbedFurniture`, `isDrawerOpen`, `isPhotoModeOpen`), or when `reduceMotion` or `cameraBobbing === false`.
     - Dampens bobbing target smoothly using `THREE.MathUtils.damp(this.smoothedBobbingTarget, targetBobAmp, 20.0, dt)`. At lambda 20, amplitude drops by $>95\%$ within ~0.15s ($e^{-20 \times 0.15} \approx 0.0498$).
     - Line 1019: Offsets camera Y directly: `camera.position.set(position.x, smoothedCameraY + currentBobbingOffset, position.z)`.
   - In `src/ui/state/useUIStore.ts`:
     - Lines 131, 272, 357, 705–709: `cameraBobbing` state initialized from localStorage, exposed via `setCameraBobbing(boolean)` action, and persisted.
   - In `src/ui/components/SettingsModal.tsx`:
     - Lines 270–297: Dedicated accessibility settings row with title `"Goyangan Kamera"`, description `"Simulasi gerak langkah alami saat berjalan di mode pejalan kaki"`, iOS switch toggle bound to `cameraBobbing`, and compliant theme token typography (`var(--label, #0F172A)` and `var(--labelSecondary, #475569)`).

4. **Verification & Test Execution**
   - `npx tsc --noEmit`: Exited with code 0 (0 type errors).
   - `npx vitest run tests/v4_first_person_experience.test.ts`: 30/30 tests passed in 59ms.
   - `npx vitest run tests/v4_adversarial_audio_motion.test.ts`: 16/16 adversarial tests passed in 68ms.
   - `npx vitest run tests/first_person_and_virtual_tour.test.ts tests/first_person_builder_suite.test.ts tests/e2e/tier2_boundary_corner.test.ts`: 51/51 regression tests passed in 3.94s.
   - `npx vitest run`: 65 test files passed, 538/538 tests passed in 75.69s.
   - `npm run build`: Production build succeeded in 10.88s (`dist/assets/index-DE8pd7cB.js` 2,364.71 kB, `dist/assets/index-D4KANIoM.css` 34.05 kB).

---

## 2. Logic Chain

1. **Physical Stairs Traversal vs. Teleportation (T3.4)**:
   - Ground height calculation smoothly interpolates $Y$ along $Z$ inside `stairZones` bounding boxes without teleports or discontinuous step heights.
   - Floor index tracking is decoupled between physical traversal (advances upon reaching ramp apex at $t \ge 0.98$) and programmatic teleportation (`goToFloor`/`traverseFloor`).
   - Safe landing clearance accounts for rotated building frames ($cos(\theta), sin(\theta)$ transformations) to test against furniture bounding boxes. Spawning inside furniture is prevented by checking placement data on the destination floor index and falling back to a known core landing or room center.
   - Spatial LOD is explicitly refreshed on floor teleportation via `buildingManager.updateSpatialLOD` with `isFirstPerson = true` and `insideBuildingId`, ensuring correct zone clamping for the host structure.

2. **Procedural Footstep Audio Engine (T3.5)**:
   - All audio synthesis is 100% procedural Web Audio API (oscillators, biquad bandpass/lowpass filters, generated white noise buffers), adhering strictly to Rule G1 (zero external binary sound files, zero proprietary asset dependencies).
   - Voice limiting is bounded by `MAX_FOOTSTEP_VOICES = 4` with guaranteed voice release via `onended` events and try/catch handlers, preventing runaway node allocation or audio context choking under high FPS.
   - Distance accumulation uses subtraction (`this.traversedDistance -= 1.8`) rather than reset to zero, ensuring that remainder distances are preserved across frames for steady rhythmic cadence.

3. **Motion Sickness Mitigation & Camera Bobbing (T3.6)**:
   - Head bobbing uses a subtle 0.015m amplitude and syncs frequency with movement speed ($3.5 \times v$).
   - Aiming and editing tools require reticle precision; suppressing bobbing target to 0 during furniture grabbing, catalogue browsing, or photo mode prevents jitter while building.
   - The dampening coefficient ($\lambda = 20.0$) brings bobbing to rest within 0.15s, eliminating sudden stops or jarring phase breaks.
   - Adheres to WCAG accessibility guidelines by checking both OS-level `prefers-reduced-motion` and user-controlled `cameraBobbing` setting.

4. **Integrity Assessment**:
   - Zero hardcoded test values or mock facades exist in `FirstPersonController.ts` or `ProceduralAudio.ts`.
   - The test suites instantiate real Three.js scenes, raycasters, and audio nodes, validating exact physics, mathematical transformations, and boundary conditions.

---

## 3. Caveats

1. In automated headless test environments (Node / Vitest), Web Audio API is simulated via mock audio contexts. In real browser environments, `AudioContext` is automatically initialized or resumed upon first user interaction (pointer lock or click), conforming to browser autoplay policies.
2. Building models must define stair zones in `userData.stairZones` or have a standard stair core footprint to enable physical ramp walking; buildings without explicit stairzones fall back to HUD/PageUp teleportation.

---

## 4. Conclusion

The implementation of Tahap 3 tasks T3.4, T3.5, and T3.6 in Arscity v4.0.0 is robust, complete, and thoroughly tested:
- T3.4 Dual Floor Navigation operates seamlessly via both continuous physical stair climbing and instant teleportation with safe clearance, 150ms screen fade, and spatial LOD synchronization.
- T3.5 Surface Material Footsteps synthesizes authentic procedural sound profiles across 6 material typologies with strict 4-voice concurrency and 1.8m stride cadence.
- T3.6 Smooth Camera Bobbing delivers natural movement immersion with ~0.015m amplitude, 0.15s rapid damping when idle or aiming, and full accessibility toggle integration.
- 100% type-safe compilation (`tsc`), 100% test pass rate (538/538 tests across 65 suites), and clean production build.

Verdict: **APPROVE**.

---

## 5. Verification Method

To independently verify the deliverables:
1. Typecheck: `npx tsc --noEmit` $\implies$ Exits with code 0.
2. Targeted Unit Tests: `npx vitest run tests/v4_first_person_experience.test.ts` $\implies$ 30/30 passed.
3. Adversarial Motion & Audio Tests: `npx vitest run tests/v4_adversarial_audio_motion.test.ts` $\implies$ 16/16 passed.
4. Full Test Suite: `npx vitest run` $\implies$ 65 test files, 538 tests passed.
5. Production Build: `npm run build` $\implies$ Exits with code 0.
