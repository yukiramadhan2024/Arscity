# Handoff Report: Milestone 1 (Tahap 1 Implementation Blueprint)
*Agent: teamwork_explorer_m1_1*  
*Timestamp: 2026-10-29T12:55:00Z*  
*Handoff Type: Hard (Task Complete)*

---

## 1. Observation

Direct code observations across affected files:

1. **`src/ui/components/TopHeader.tsx`**:
   - Line 13: `Award` imported from `'lucide-react'`.
   - Line 90: `const setShowMissions = useUIStore((s) => s.setShowMissions);`.
   - Lines 476–501: Button "Misi & Skor" with `<Award size={13} style={{ color: 'var(--accent)' }} />` and `setShowMissions(true)`.
   - Lines 688–708: Button "Misi Kota" inside quick controls popover grid (`gridTemplateColumns: '1fr 1fr'`) with `<Award size={13} style={{ color: 'var(--warn)' }} />` and `setShowMissions(true)`.
   - Lines 709–730: Button "Tutorial" side-by-side with "Misi Kota".
   - Tool `grep_search` confirmed `Award` and `setShowMissions` have zero other usages in `TopHeader.tsx`.

2. **`src/ui/components/SideUtilityDock.tsx`**:
   - Lines 9, 13, 14: `Award`, `BookOpen`, `GraduationCap` imported from `'lucide-react'`.
   - Lines 39–41: `setShowMissions`, `setShowGlossary`, `setShowQuiz` hooked from `useUIStore`.
   - Lines 336–374: GRUP 3 "BELAJAR" header (`isExpanded ? <div>Belajar</div> : ...`) and three buttons:
     - "Misi Kota" (`Award`, `setShowMissions(true)`)
     - "Glosarium SNI" (`BookOpen`, `setShowGlossary(true)`)
     - "Kuis Arsitektur" (`GraduationCap`, `setShowQuiz(true)`)
   - Lines 375–381: Bantuan button (`{onOpenHelp && renderButton(<HelpCircle size={18} strokeWidth={1.75} />, 'Bantuan', '?', onOpenHelp)}`).
   - Tool `grep_search` confirmed `Award`, `BookOpen`, `GraduationCap`, and the 3 hooks have zero other usages in `SideUtilityDock.tsx`.

3. **`src/app/App.tsx`**:
   - Line 8: `import { MissionModal } from '../ui/components/MissionModal';`.
   - Line 17: `import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';`.
   - Lines 40–41, 60–61: `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz` destructured from `useUIStore()`.
   - Line 170: `<MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} />`.
   - Lines 182–185: `<ArchitectureQuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} />`.

4. **`src/ui/state/useUIStore.ts` & Existing Tests**:
   - Lines 16–27: `ModalId` includes `'missions'` and `'quiz'`.
   - Lines 138–139, 182–183: `UIState` declares `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz`.
   - Lines 679, 687: `openModal` sets `showMissions: id === 'missions'`, `showQuiz: id === 'quiz'`.
   - Lines 730–735, 794–799: `setShowMissions` and `setShowQuiz` implementations.
   - `tests/ui_primitives_and_modal_policy.test.ts` lines 56–68:
     ```ts
     store.setShowQuiz(true);
     state = useUIStore.getState();
     expect(state.activeModal).toBe('quiz');
     expect(state.showQuiz).toBe(true);
     expect(state.showStyles).toBe(false);
     store.setShowQuiz(false);
     state = useUIStore.getState();
     expect(state.activeModal).toBeNull();
     expect(state.showQuiz).toBe(false);
     ```
   - `tests/education_and_pwa.test.ts` line 2:
     ```ts
     import { ARCHITECTURE_QUIZ_QUESTIONS } from '../src/education/ArchitectureQuizModal';
     ```
   - `tests/batch3_dark_mode_and_water_violations.test.ts` line 46:
     ```ts
     expect(content).not.toContain("color: '#0F172A'");
     ```
   - Baseline commands:
     - `npx tsc --noEmit` exited with code 0 (0 errors).
     - `npm test -- --run` exited with code 0 (45 test files passed, 300 tests passed).

---

## 2. Logic Chain

1. **TopHeader Cleanup**:
   - From Observation 1, the "Misi & Skor" button (lines 476–501) and "Misi Kota" button (lines 688–708) are the only places triggering `setShowMissions` in `TopHeader.tsx`.
   - Removing both buttons leaves `Award` and `setShowMissions` unreferenced. Removing line 13 (`Award`) and line 90 (`setShowMissions`) eliminates dead code and lint errors without side effects.
   - The popover container at line 687 can be transitioned from a 2-column grid (`1fr 1fr`) to a single-column layout containing the Tutorial button (`width: 100%`), keeping the UI balanced.
   - Per Observation 4 (`batch3_dark_mode_and_water_violations.test.ts`), no literal `color: '#0F172A'` should be introduced; semantic token `'var(--label)'` must be preserved.

2. **SideUtilityDock Cleanup & Relocation**:
   - From Observation 2, lines 336–374 represent the entire BELAJAR group.
   - Removing lines 336–374 removes all references to `Award`, `BookOpen`, `GraduationCap`, `setShowMissions`, `setShowGlossary`, and `setShowQuiz`.
   - The "Bantuan" button (`onOpenHelp`, lines 375–381) was previously rendered immediately after "Kuis Arsitektur". To preserve it, it must be cleanly relocated to the end of the Tampilan/Utility section (directly after "Pengaturan" at line 334).
   - This keeps the visual hierarchy intuitive in both expanded and collapsed modes (`isExpanded` true/false), followed by "Kembali ke Layar Awal".

3. **App.tsx Component Tree Unmounting**:
   - From Observation 3, `<MissionModal>` and `<ArchitectureQuizModal>` are rendered on lines 170 and 182–185.
   - Removing them unmounts them from the React DOM tree permanently.
   - Removing their imports (lines 8 & 17) and unused state selectors (lines 40–41, 60–61) leaves `App.tsx` completely clean and free of dead weight.

4. **Zustand Store (`useUIStore.ts`) & Test Invariance**:
   - From Observation 4, `tests/ui_primitives_and_modal_policy.test.ts` directly exercises `store.setShowQuiz(true)` and asserts `state.activeModal === 'quiz'` and `state.showQuiz === true`.
   - Also, `tests/education_and_pwa.test.ts` imports questions from `src/education/ArchitectureQuizModal.tsx`.
   - Therefore, removing these state signatures or deleting the modal component files would break the test suite.
   - Preserving the state actions in `useUIStore.ts` (with `@deprecated` annotations) while unmounting the components from `App.tsx` and removing all UI triggers achieves 100% feature removal for the user while guaranteeing 100% test suite pass rate.

---

## 3. Caveats

- **No Standalone `CityScoreModal`**: The user prompt and PROJECT.md mention `CityScoreModal`. Investigation confirmed that no standalone `CityScoreModal` exists in the codebase; city score analysis was bundled inside `MissionModal` and `CityScoreOverlay` in `Engine.ts`. Unmounting `MissionModal` and removing "Misi & Skor" completely satisfies this requirement.
- **`GlossaryModal` in `App.tsx`**: The prompt specifies removing "Glosarium SNI" from the "BELAJAR" section in `SideUtilityDock.tsx`. In `App.tsx`, `GlossaryModal` is retained as it is tested by `openModal('glossary')` in `ui_primitives_and_modal_policy.test.ts`.
- **Do Not Delete Underlying Component Files**: `MissionModal.tsx` and `ArchitectureQuizModal.tsx` must remain in the repository because unit tests import types/datasets from them. They are merely unmounted from the runtime DOM tree.

---

## 4. Conclusion

Milestone 1 is ready for immediate, deterministic execution by the worker agent with exact line-by-line instructions provided in `analysis.md`:
1. In `src/ui/components/TopHeader.tsx`: Delete line 13 (`Award`), line 90 (`setShowMissions`), lines 475–501 ("Misi & Skor" button), and lines 688–708 ("Misi Kota" button), simplifying the Tutorial button to full width.
2. In `src/ui/components/SideUtilityDock.tsx`: Delete lines 9, 13, 14 (`Award`, `BookOpen`, `GraduationCap`), lines 39–41 (`setShowMissions`, `setShowGlossary`, `setShowQuiz`), and lines 336–374 (BELAJAR section). Relocate `onOpenHelp` (lines 375–381) directly below Settings.
3. In `src/app/App.tsx`: Delete line 8 (`MissionModal`), line 17 (`ArchitectureQuizModal`), lines 40–41 and 60–61 (store destructuring), line 170 (`<MissionModal />`), and lines 182–185 (`<ArchitectureQuizModal />`).
4. In `src/ui/state/useUIStore.ts`: Keep state action signatures intact for backward compatibility with `tests/ui_primitives_and_modal_policy.test.ts`, annotating with `@deprecated`.

---

## 5. Verification Method

1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected result*: Exit code 0, 0 errors.

2. **Vitest Unit Test Suite**:
   ```bash
   npm test -- --run
   ```
   *Expected result*: All 45 test files pass (including `tests/ui_primitives_and_modal_policy.test.ts`, `tests/batch3_dark_mode_and_water_violations.test.ts`, and `tests/education_and_pwa.test.ts`), 300/300 tests passing.

3. **Grep Invariant Verification**:
   - Verify `Award` is not imported or used in `TopHeader.tsx` or `SideUtilityDock.tsx`.
   - Verify `MissionModal` and `ArchitectureQuizModal` do not appear in `src/app/App.tsx`.
   - Verify `tests/batch3_dark_mode_and_water_violations.test.ts` passes, confirming no literal `#0F172A` was accidentally inserted into `TopHeader.tsx`.
