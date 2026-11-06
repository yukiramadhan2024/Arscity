# BRIEFING — 2026-10-29T12:59:00Z

## Mission
Execute Milestone 1 (Tahap 1): Clean up gamification UI entry points ("Misi & Skor", "Misi Kota", "Glosarium SNI", "Kuis Arsitektur") from TopHeader, SideUtilityDock, and App while preserving Bantuan and full backward compatibility in useUIStore.ts.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Projects\Arscity\.agents\teamwork\teamwork_worker_m1_1\
- Original parent: d68ee8c4-0977-4823-9c25-eeec1173781b
- Milestone: milestone_1

## 🔒 Key Constraints
- EXCLUSIVE WRITE OWNERSHIP: ONLY edit `src/ui/components/TopHeader.tsx`, `src/ui/components/SideUtilityDock.tsx`, `src/app/App.tsx`, `src/ui/state/useUIStore.ts`.
- DO NOT edit any test files or other files.
- Retain `// Deprecated in v4.0: setShowMissions removed` in `TopHeader.tsx` to satisfy `test_navbar_sync.py`.
- DO NOT introduce literal `color: '#0F172A'` into `TopHeader.tsx` (violates dark mode test). Use `var(--label)` or semantic classes.
- PRESERVE the "Bantuan" (`onOpenHelp`) button in `SideUtilityDock.tsx` right below "Pengaturan".
- Retain `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz` in `src/ui/state/useUIStore.ts` with `@deprecated` comments.
- Verification must pass: `npx tsc --noEmit` (0 errors), `npx vitest run` (100% pass, all 300 tests).

## Current Parent
- Conversation ID: d68ee8c4-0977-4823-9c25-eeec1173781b
- Updated: not yet

## Task Summary
- **What to build**: Remove gamification triggers from TopHeader and SideUtilityDock; unmount MissionModal and ArchitectureQuizModal in App.tsx; mark store selectors deprecated in useUIStore.ts; retain Bantuan button.
- **Success criteria**: All 300 vitest tests pass, tsc passes with 0 errors, zero regressions.
- **Interface contracts**: PROJECT.md
- **Code layout**: src/ui/components, src/app, src/ui/state

## Key Decisions Made
- Initial setup: Initializing briefing and reading explorer handoffs and original request.

## Artifact Index
- `DISPATCH.md` — Incoming dispatch instructions
- `BRIEFING.md` — Persistent state index
- `progress.md` — Liveness heartbeat and step tracker
- `changes.md` — Implementation changes report
- `handoff.md` — Final 5-component handoff report

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending
- **Lint status**: Clean
- **Tests added/modified**: 0 (test files read-only)

## Loaded Skills
- None
