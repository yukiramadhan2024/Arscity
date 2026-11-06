## 2026-11-02T13:39:59Z
You are teamwork_worker_tahap4_1, a versatile worker for Arscity v4.0.0.
Your working directory: c:\Projects\Arscity\.agents\teamwork\teamwork_worker_tahap4_1\
Your parent orchestrator conversation ID: 25bbd895-1472-4fe5-97de-94aaa637c46d

Authoritative User Request: c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md
Master Project Specification: c:\Projects\Arscity\PROJECT.md
Predecessor Tahap 3 Worker Handoff: c:\Projects\Arscity\.agents\teamwork\teamwork_worker_tahap3_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
Part A — Atomic Commits for Tahap 3 (if uncommitted):
- Check git status. If files modified during Tahap 3 (T3.1–T3.6) and tests are unstaged/uncommitted, commit them atomically per task ID:
  - T3.1: feat(fp): T3.1 dynamic eye light exposure adaptation and roof detection
  - T3.2: feat(fp): T3.2 predictive smooth step-up and headroom collision
  - T3.3: feat(fp): T3.3 two-way swing interactive doors with normal dot product
  - T3.4: feat(fp): T3.4 dual floor navigation with physical stairs and HUD teleportation
  - T3.5: feat(audio): T3.5 procedural surface material footsteps with 4-voice limit
  - T3.6: feat(fp): T3.6 smooth camera bobbing with accessibility toggle and test suite

Part B — Implement Tahap 4: Perabot Berpermukaan & Magnet Kursi (T4.1–T4.4):
1. T4.1: Surface Furniture Data Model:
   - In `src/buildings/FirstPersonFurnitureCatalog.ts` and related interfaces/stores:
     - Add slot metadata: `'floor' | 'tabletop' | 'wall'`.
     - Add optional parent-child fields: `parentId?: string`, `relativePosition?: [number, number, number]`, `relativeRotation?: number`.
     - Implement backward-compatible migration for legacy save data (defaulting missing slots to `'floor'`).
     - Update furniture catalog items with their appropriate slot tags (e.g. laptop, lamp, mug -> `'tabletop'`; painting, clock, wall lamp -> `'wall'`; table, sofa, bed, chair -> `'floor'`).
2. T4.2: Tabletop & Wall Placement Logic:
   - In `src/core/engine/FirstPersonController.ts` (and/or building furniture interaction handlers):
     - Tabletop items: Raycast/snap onto parent tabletop surface (`groundY = parentMesh.position.y + tableHeight`). Constrain placement locally within tabletop surface boundaries so objects do not float off edges.
     - Wall items: Raycast onto vertical wall surfaces, orient along wall surface normal, clamp height between 0.8m and 2.2m from floor.
     - Visual ghost hint: Display valid/invalid placement ghost indicator with slot compatibility hint.
3. T4.3: Rounded 3D Furniture Models:
   - In `src/buildings/FirstPersonFurnitureCatalog.ts`:
     - Upgrade crude rectangular box furniture models to realistic rounded 3D composite models.
     - Use cylinders, capsules, and beveled cushion geometries for sofas, chairs, tables, and beds.
     - Budget: ~600 triangles per model, using geometry caching to ensure high performance and zero memory bloat.
4. T4.4: Chair Magnet & Parent-Child Relationships:
   - Chair Magnet: When placing or moving a chair within 1.3m of a desk/table, automatically rotate the chair to face the table center and snap to a 0.45m seat offset. Allow holding [Alt] to bypass auto-magnet snapping.
   - Parent-Child Synchronization: Moving a parent table translates all child tabletop items attached to it. Deleting a parent table automatically deletes (or detaches) all child items attached to it. Ensure undo/redo handles these operations atomically.

Part C — Testing & Verification:
- Create comprehensive automated test suite in `tests/v4_surface_furniture.test.ts` covering T4.1 through T4.4.
- Commit each Tahap 4 task atomically per Task ID (T4.1, T4.2, T4.3, T4.4).
- Verify:
  - `npx tsc --noEmit` -> 0 errors.
  - `npx vitest run tests/v4_surface_furniture.test.ts` -> 100% pass.
  - Full test suite `npx vitest run` -> 0 failures across all suites.
  - `npm run build` -> Clean production build.
- Write your complete handoff report to `c:\Projects\Arscity\.agents\teamwork\teamwork_worker_tahap4_1\handoff.md`.
- Send message back to parent orchestrator (`25bbd895-1472-4fe5-97de-94aaa637c46d`).
