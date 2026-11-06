## 2026-10-29T12:58:51Z
You are teamwork_worker_m1_1.
Your working directory: c:\Projects\Arscity\.agents\teamwork\teamwork_worker_m1_1\
Original request path: c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan path: c:\Projects\Arscity\PROJECT.md
Explorer handoffs to review before starting:
- c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_m1_1\handoff.md
- c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_m1_1\analysis.md
- c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_m1_2\handoff.md
- c:\Projects\Arscity\.agents\teamwork\teamwork_spec_miner_m1_3\handoff.md

You MUST read c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md completely before starting work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You own and may ONLY edit the following files:
- `src/ui/components/TopHeader.tsx`
- `src/ui/components/SideUtilityDock.tsx`
- `src/app/App.tsx`
- `src/ui/state/useUIStore.ts`
Do NOT edit any test files or other files.

TASK — MILESTONE 1 (TAHAP 1):
1. In `src/ui/components/TopHeader.tsx`:
   - Remove the "Misi & Skor" button from the top bar (around lines 476–501).
   - Remove "Misi Kota" button from the "Kontrol Cepat" popover (around lines 688–708), and adjust the popover container so the remaining "Tutorial" button spans full width cleanly.
   - Clean up unused `Award` import from `'lucide-react'` and unused hook calls.
   - Retain a comment: `// Deprecated in v4.0: setShowMissions removed` (satisfies `test_navbar_sync.py`).
   - DO NOT introduce literal `color: '#0F172A'` into `TopHeader.tsx` (violates `tests/batch3_dark_mode_and_water_violations.test.ts`). Use `var(--label)` or semantic classes.

2. In `src/ui/components/SideUtilityDock.tsx`:
   - Remove the entire "BELAJAR" section (around lines 336–374) with buttons "Misi Kota", "Glosarium SNI", and "Kuis Arsitektur".
   - Clean up unused imports `Award`, `BookOpen`, `GraduationCap` from `'lucide-react'` and unused store selectors.
   - CRITICAL: PRESERVE the "Bantuan" (`onOpenHelp`) button by placing it right below "Pengaturan" (or cleanly in the Tampilan section).

3. In `src/app/App.tsx`:
   - Unmount `<MissionModal>` and `<ArchitectureQuizModal>` from the component tree.
   - Remove their imports (`MissionModal` and `ArchitectureQuizModal`) and unused store selectors (`showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz`).

4. In `src/ui/state/useUIStore.ts`:
   - Retain `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz` with `@deprecated` comments for 100% backward compatibility with `tests/ui_primitives_and_modal_policy.test.ts`.

VERIFICATION:
You must run and verify:
1. `npx tsc --noEmit` — must exit with 0 errors.
2. `npx vitest run` — must pass 100% (all 300 tests).

OUTPUT REQUIREMENTS:
- Write your implementation report to `c:\Projects\Arscity\.agents\teamwork\teamwork_worker_m1_1\changes.md`.
- Write your 5-component handoff report to `c:\Projects\Arscity\.agents\teamwork\teamwork_worker_m1_1\handoff.md` with build/test command outputs.
- Keep `progress.md` updated and send a message via send_message when done.
