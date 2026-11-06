# Handoff Report — Milestone 1: Tahap 1 Specification Mining & UI Layout Integrity

**Agent**: teamwork_spec_miner_m1_3 (Specification Miner)  
**Date**: 2026-10-29  
**Target Milestone**: Milestone 1 (Tahap 1: Cleanup Mission, Score, and Quiz)  
**Deliverables**: `analysis.md`, `handoff.md`, `progress.md`

---

## 1. Observation

1. **`TopHeader.tsx` Structure**:
   - `src/ui/components/TopHeader.tsx` line 205:
     ```tsx
     <div className="top-header-capsule arscity-glass-bar" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '6px 18px', ... }}>
     ```
   - Lines 469–472:
     ```tsx
     <div className="whitespace-nowrap" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
     ```
   - Lines 476–501: Button "Misi & Skor" with `<Award size={13} style={{ color: 'var(--accent)' }} />` and text `<span>Misi & Skor</span>`.
   - Lines 687–708: Quick controls popover 2-column grid:
     ```tsx
     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
       <button onClick={() => { setShowMissions(true); setShowUtilityMenu(false); }} ...>
         <Award size={13} style={{ color: 'var(--warn)' }} />
         <span>Misi Kota</span>
       </button>
       <button onClick={() => { setShowTutorial(true); setShowUtilityMenu(false); }} ...>
         <Sparkles size={13} style={{ color: 'var(--accent)' }} />
         <span>Tutorial</span>
       </button>
     </div>
     ```
2. **`SideUtilityDock.tsx` Structure & Hotkeys**:
   - `src/ui/components/SideUtilityDock.tsx` lines 110–116:
     ```tsx
     const renderButton = (
       icon: React.ReactNode,
       label: string,
       _hotkey: string,
       onClick: () => void,
       isActive: boolean = false
     ) => {
     ```
   - Lines 336–374: Group 3 "Belajar" renders 3 buttons ("Misi Kota" with `'U'`, "Glosarium SNI" with `'G'`, "Kuis Arsitektur" with `'K'`), followed by "Bantuan" button (lines 375–381) with `HelpCircle` and `'?'`.
   - `FirstPersonController.ts` lines 403–404:
     ```typescript
     } else if (e.code === 'KeyG') {
       this.grabHoveredFurniture();
     ```
3. **`App.tsx` Modal Mounting**:
   - `src/app/App.tsx` lines 8 & 17:
     ```tsx
     import { MissionModal } from '../ui/components/MissionModal';
     import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';
     ```
   - Lines 40–41: `showMissions, setShowMissions,`
   - Lines 60–61: `showQuiz, setShowQuiz,`
   - Line 170: `<MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} />`
   - Lines 182–185: `<ArchitectureQuizModal isOpen={showQuiz} onClose={() => setShowQuiz(false)} />`
   - No `CityScoreModal.tsx` file exists in the codebase.
4. **Test Suite Verification**:
   - `npm test` (`vitest run`): 45 test files passed (45/45), 300 tests passed (300/300) in 45.11s.
   - `npx tsc --noEmit`: Exited with code 0 (0 errors).
   - `python tests/run_all_tests.py`: Exited with code 1 due to emoji in `src/ui/components/CustomBuildingCreatorModal.tsx:2746` (flagged for M2/M6/M7).
   - `tests/test_navbar_sync.py` line 30: `expected_features = ["timeOfDay", "weather", "gridSnap", "setShowMissions", "setShowTutorial"]`.
   - `tests/ui_primitives_and_modal_policy.test.ts` line 57: `store.setShowQuiz(true); expect(state.activeModal).toBe('quiz')`.

---

## 2. Logic Chain

1. **TopHeader Layout Balance**:
   - From Observation 1, the right cluster of `TopHeader.tsx` is an inline flexbox container with `gap: 8px`. In flexbox layout, removing a child element does not leave an empty column; instead, the container contracts by the exact width of the removed element (~105px).
   - Therefore, removing "Misi & Skor" leaves no gap or alignment defect in the main capsule.
   - However, the quick controls popover uses `display: 'grid', gridTemplateColumns: '1fr 1fr'`. Removing "Misi Kota" would leave an empty right column cell unless changed to `gridTemplateColumns: '1fr'` or `display: 'flex'`.
2. **TopHeader Sleek Floating Look**:
   - TopHeader currently measures ~800px wide. Adding the 4-mode segmented control in Tahap 3 requires ~70px of additional width.
   - Removing the ~105px "Misi & Skor" button offsets this expansion, keeping the total width at ~760px, maintaining an uncluttered, floating bar appearance.
3. **SideUtilityDock Visual Hierarchy**:
   - Removing Section "BELAJAR" removes 3 buttons and reduces the total button count from 12 to 9, lowering dock height from ~550px to ~380px.
   - Moving "Bantuan" above "Kembali ke Layar Awal" or into "Tampilan" establishes a clear 3-group hierarchy: Berkas (3), Tampilan (4), and Bantuan/Keluar (2).
4. **Keyboard Shortcut Conflict Resolution**:
   - From Observation 2, `_hotkey` was never wired to a keydown event listener in `SideUtilityDock.tsx`.
   - However, `FirstPersonController.ts` binds `KeyG` to furniture grabbing. Advertising 'G' in the dock was a confusing collision. Removing 'G' completely clears this ambiguity.
   - 'U' and 'K' are unbound globally; their removal leaves zero conflicts.
5. **App.tsx Cleanliness**:
   - From Observation 3, `CityScoreModal` does not exist as an independent component. Removing `MissionModal` and `ArchitectureQuizModal` imports and JSX leaves zero unreferenced variables in `App.tsx`.
   - Retaining dummy getters/setters in `useUIStore.ts` protects `tests/ui_primitives_and_modal_policy.test.ts`.

---

## 3. Caveats

1. In `tests/test_navbar_sync.py` line 30, `"setShowMissions"` is explicitly expected in `TopHeader.tsx`. When removing the button, either retain an internal comment `// setShowMissions removed for Tahap 1` or update `test_navbar_sync.py` to avoid breaking Python test suites.
2. In `tests/ui_primitives_and_modal_policy.test.ts`, `setShowQuiz` is directly called to test single modal exclusivity. Do not delete `showQuiz` or `setShowQuiz` from `useUIStore.ts`.

---

## 4. Conclusion

The specification mining for Milestone 1 (Tahap 1) confirms that removing the designated features is completely safe, structurally sound, and directly enhances UI layout integrity:
1. `TopHeader.tsx` main bar will cleanly shrink without empty gaps; popover grid must be set to `1fr` for "Tutorial".
2. `SideUtilityDock.tsx` will gain a balanced 3-tier hierarchy (Berkas: 3, Tampilan: 4, Bantuan/Keluar: 2) and eliminate a latent shortcut conflict with `KeyG`.
3. `App.tsx` will be completely free of unmounted modal references.

---

## 5. Verification Method

To verify these findings:
1. Check `TopHeader.tsx` lines 476–501 and lines 687–708 via `view_file`.
2. Check `SideUtilityDock.tsx` lines 336–381 via `view_file`.
3. Check `FirstPersonController.ts` lines 403–404 for `KeyG` binding via `view_file`.
4. Run `npm test` (`npx vitest run`) to confirm existing test suites pass.
5. Run `npx tsc --noEmit` to confirm 0 TypeScript compilation errors.
