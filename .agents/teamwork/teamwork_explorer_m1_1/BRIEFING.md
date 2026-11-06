# BRIEFING — 2026-10-29T12:56:00Z

## Mission
Analyze Milestone 1 (Tahap 1: Complete Removal of Unused Mission, Score, and Quiz Features) and produce an exact line-level implementation plan and handoff report for the worker.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer (read-only investigation, synthesis, handoff)
- Working directory: c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_m1_1\
- Original parent: d68ee8c4-0977-4823-9c25-eeec1173781b
- Milestone: Milestone 1 (Tahap 1: Removal of Mission, Score, and Quiz Features)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Preserved Bantuan (`onOpenHelp`) button cleanly relocated
- Check and preserve backward compatibility with existing unit tests (`tests/ui_primitives_and_modal_policy.test.ts`)
- Produce analysis.md and 5-component handoff.md

## Current Parent
- Conversation ID: d68ee8c4-0977-4823-9c25-eeec1173781b
- Updated: not yet

## Investigation State
- **Explored paths**:
  - `src/ui/components/TopHeader.tsx` (lines 13, 90, 475-502, 686-730)
  - `src/ui/components/SideUtilityDock.tsx` (lines 9, 13, 14, 39-41, 328-384)
  - `src/app/App.tsx` (lines 8, 17, 40-41, 60-61, 170, 182-185)
  - `src/ui/state/useUIStore.ts` (ModalId, UIState, actions)
  - `tests/ui_primitives_and_modal_policy.test.ts`
  - `tests/batch3_dark_mode_and_water_violations.test.ts`
  - `tests/education_and_pwa.test.ts`
- **Key findings**:
  - Baseline: 0 tsc errors, 300/300 unit tests passing (45 test files).
  - TopHeader: "Misi & Skor" button (lines 476-501) and "Misi Kota" button (lines 688-708) can be safely removed, along with `Award` import and `setShowMissions`. Tutorial button is adjusted to full width.
  - SideUtilityDock: BELAJAR section (lines 336-374) removed; `onOpenHelp` cleanly relocated directly below Settings; unused imports (`Award`, `BookOpen`, `GraduationCap`) and hooks removed.
  - App.tsx: `<MissionModal>` and `<ArchitectureQuizModal>` unmounted; imports and selectors removed.
  - useUIStore.ts: Backward compatibility preserved for tests (`ui_primitives_and_modal_policy.test.ts`) by retaining signatures and annotating as `@deprecated`.
- **Unexplored areas**: None for Milestone 1.

## Key Decisions Made
- Confirmed no standalone `CityScoreModal` exists in codebase (bundled in MissionModal/AnalysisOverlay).
- Confirmed underlying modal component files should NOT be deleted to prevent breaking `education_and_pwa.test.ts`.
- Confirmed `onOpenHelp` is relocated directly below `Pengaturan` in `SideUtilityDock.tsx`.

## Artifact Index
- DISPATCH.md — record of incoming task instructions
- progress.md — liveness heartbeat and step tracker
- analysis.md — detailed line-by-line removal analysis and code diff blueprints
- handoff.md — 5-component handoff report for worker
