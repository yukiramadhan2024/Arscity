## 2026-10-29T12:49:00Z
You are teamwork_explorer_m1_1.
Your working directory: c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_m1_1\
Original request path: c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md
Project plan path: c:\Projects\Arscity\PROJECT.md
Prior survey report: c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_survey_1\analysis.md

You MUST read c:\Projects\Arscity\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Projects\Arscity\PROJECT.md before starting work.

TASK:
Milestone 1: Tahap 1 — Complete Removal of Unused Mission, Score, and Quiz Features.
Your objective is to provide a precise implementation plan for the worker:
1. In `src/ui/components/TopHeader.tsx`:
   - Identify exact lines to remove the "Misi & Skor" button from the top bar (around lines 476–501).
   - Identify exact lines to remove "Misi Kota" button from quick controls popover (around lines 688–708).
   - Clean up any unused imports (e.g. `Award` from lucide-react if no longer used elsewhere).
2. In `src/ui/components/SideUtilityDock.tsx`:
   - Identify exact lines to remove the entire "BELAJAR" section (around lines 336–374) containing "Misi Kota", "Glosarium SNI", and "Kuis Arsitektur".
   - CRITICAL: Verify that the "Bantuan" (`onOpenHelp`) button (lines 375–381) is preserved and cleanly relocated (e.g. to Tampilan section or footer).
   - Clean up unused imports (`Award`, `BookOpen`, `GraduationCap` if unused).
3. In `src/app/App.tsx`:
   - Unmount `MissionModal` (around line 170) and `ArchitectureQuizModal` (around line 182–185).
   - Remove unused imports (`MissionModal`, `ArchitectureQuizModal`).
4. In `src/ui/state/useUIStore.ts`:
   - Check state fields `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz`.
   - Recommend how to preserve state action signatures for backward compatibility with existing unit tests (`tests/ui_primitives_and_modal_policy.test.ts`) while unmounting components.

OUTPUT REQUIREMENTS:
- Write your analysis and implementation strategy to `c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_m1_1\analysis.md`.
- Write your 5-component handoff report to `c:\Projects\Arscity\.agents\teamwork\teamwork_explorer_m1_1\handoff.md`.
- Keep `progress.md` updated with liveness timestamps.
- Send a completion message via send_message when done.
