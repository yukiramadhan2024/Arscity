# Analysis & Implementation Blueprint: Milestone 1 (Tahap 1)
**Feature Removal: Complete Cleanup of Unused Mission, Score, and Quiz Features**  
*Agent: teamwork_explorer_m1_1*  
*Date: 2026-10-29*

---

## 1. Executive Summary

Milestone 1 implements **Tahap 1** of Arscity v4.0: Complete removal of the unused Mission, Score, and Quiz features across the UI surface (`TopHeader.tsx`, `SideUtilityDock.tsx`) and unmounting them from the main React component hierarchy (`App.tsx`), while maintaining strict backward compatibility within the Zustand store (`useUIStore.ts`) to ensure existing unit tests (`tests/ui_primitives_and_modal_policy.test.ts`) continue to pass 100%.

Baseline validation confirmed:
- `npx tsc --noEmit`: 0 errors
- `npm test -- --run`: 45 test files passed, 300 tests passed

---

## 2. File-by-File Line-Level Analysis & Plan

### 2.1 `src/ui/components/TopHeader.tsx`

#### Objective:
1. Remove "Misi & Skor" button from top bar.
2. Remove "Misi Kota" button from quick controls popover.
3. Clean up unused imports and hooks (`Award`, `setShowMissions`).
4. Avoid introducing literal `#0F172A` (enforced by `tests/batch3_dark_mode_and_water_violations.test.ts`).

#### Detailed Line Locations:
1. **Unused Import Removal (Line 13)**:
   - Location: Lines 12–15
   ```tsx
   // BEFORE:
   import {
     Sun,
     Cloud,
     CloudRain,
     MoreHorizontal,
     X,
     Grid,
     RotateCcw,
     Compass,
     Award,
     Sparkles,
     Check,
   ```
   - Target Change: Delete `Award,` (Line 13).
   - Verification: `Award` was only used at line 499 (Misi & Skor) and line 706 (Misi Kota). No other usages exist.

2. **Unused Hook Removal (Line 90)**:
   - Location: Line 90
   ```tsx
   // BEFORE:
   const engine = useUIStore((s) => s.engine);
   const setShowMissions = useUIStore((s) => s.setShowMissions);
   const setShowTutorial = useUIStore((s) => s.setShowTutorial);
   ```
   - Target Change: Delete line 90 (`const setShowMissions = useUIStore((s) => s.setShowMissions);`).
   - Verification: `setShowMissions` was only used at line 478 and line 689.

3. **"Misi & Skor" Top Bar Button Removal (Lines 475–502)**:
   - Location: Lines 475–502
   ```tsx
   // BEFORE:
             {showFps && <FpsDisplay />}

             {/* Widget Misi Aktif & Skor Kota Ringkas (A6) */}
             <motion.button
               onClick={() => {
                 setShowMissions(true);
                 proceduralAudio.playTaptic('selection');
               }}
               whileTap={{ scale: 0.95 }}
               whileHover={{ scale: 1.02 }}
               style={{
                 display: 'flex',
                 alignItems: 'center',
                 gap: '5px',
                 padding: '4px 12px',
                 borderRadius: '12px',
                 background: 'rgba(255, 255, 255, 0.92)',
                 border: 'none',
                 boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                 color: 'var(--label)',
                 fontSize: '11px',
                 fontWeight: 600,
                 cursor: 'pointer'
               }}
               title="Buka Misi & Indeks Skor Kota"
             >
               <Award size={13} style={{ color: 'var(--accent)' }} />
               <span>Misi & Skor</span>
             </motion.button>

             {/* Menu Popover Trigger Button tanpa border ganda */}
   ```
   - Target Change: Delete lines 475–502 completely.
   - Result:
   ```tsx
   // AFTER:
             {showFps && <FpsDisplay />}

             {/* Menu Popover Trigger Button tanpa border ganda */}
   ```

4. **"Misi Kota" Button Removal in Quick Controls Popover (Lines 686–730)**:
   - Location: Lines 686–730
   ```tsx
   // BEFORE:
                 {/* Misi & Tutorial Kota */}
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                   <button
                     onClick={() => { setShowMissions(true); setShowUtilityMenu(false); }}
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '5px',
                       padding: '8px 10px',
                       borderRadius: '12px',
                       background: 'rgba(255, 255, 255, 0.92)',
                       border: 'none',
                       color: 'var(--label)',
                       fontSize: '11px',
                       fontWeight: 500,
                       cursor: 'pointer',
                       boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                     }}
                   >
                     <Award size={13} style={{ color: 'var(--warn)' }} />
                     <span>Misi Kota</span>
                   </button>
                   <button
                     onClick={() => { setShowTutorial(true); setShowUtilityMenu(false); }}
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '5px',
                       padding: '8px 10px',
                       borderRadius: '12px',
                       background: 'rgba(255, 255, 255, 0.92)',
                       border: 'none',
                       color: 'var(--label)',
                       fontSize: '11px',
                       fontWeight: 500,
                       cursor: 'pointer',
                       boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                     }}
                   >
                     <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                     <span>Tutorial</span>
                   </button>
                 </div>
   ```
   - Target Change: Remove the "Misi Kota" button and adapt the container so the "Tutorial" button spans cleanly full-width:
   ```tsx
   // AFTER:
                 {/* Tutorial Kota */}
                 <div>
                   <button
                     onClick={() => { setShowTutorial(true); setShowUtilityMenu(false); }}
                     style={{
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       gap: '5px',
                       padding: '8px 10px',
                       borderRadius: '12px',
                       background: 'rgba(255, 255, 255, 0.92)',
                       border: 'none',
                       color: 'var(--label)',
                       fontSize: '11px',
                       fontWeight: 500,
                       cursor: 'pointer',
                       boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                       width: '100%'
                     }}
                   >
                     <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                     <span>Tutorial</span>
                   </button>
                 </div>
   ```

---

### 2.2 `src/ui/components/SideUtilityDock.tsx`

#### Objective:
1. Remove the entire "BELAJAR" section (header + Misi Kota, Glosarium SNI, Kuis Arsitektur).
2. Cleanly relocate the "Bantuan" (`onOpenHelp`) button so it is preserved.
3. Remove unused imports (`Award`, `BookOpen`, `GraduationCap`) and hooks (`setShowMissions`, `setShowGlossary`, `setShowQuiz`).

#### Detailed Line Locations:
1. **Unused Imports Removal (Lines 9, 13, 14)**:
   - Location: Lines 3–19
   ```tsx
   // BEFORE:
   import {
     HardDrive,
     Camera,
     Settings,
     HelpCircle,
     Share2,
     Award,          // Line 9
     FolderOpen,
     LogOut,
     DraftingCompass,
     BookOpen,       // Line 13
     GraduationCap,  // Line 14
     Layers,
     ChevronRight,
     ChevronLeft,
     Home
   } from 'lucide-react';
   ```
   - Target Change: Remove `Award,`, `BookOpen,`, and `GraduationCap,`.
   - Verification: Grep confirms zero other usages of these three icons in `SideUtilityDock.tsx`.

2. **Unused Hooks Removal (Lines 39–41)**:
   - Location: Lines 38–42
   ```tsx
   // BEFORE:
     const setShowRealWorldExport = useUIStore((s) => s.setShowRealWorldExport);
     const setShowMissions = useUIStore((s) => s.setShowMissions);
     const setShowGlossary = useUIStore((s) => s.setShowGlossary);
     const setShowQuiz = useUIStore((s) => s.setShowQuiz);
     const showLotOverlays = useUIStore((s) => s.showLotOverlays);
   ```
   - Target Change: Delete lines 39–41.
   - Verification: None of `setShowMissions`, `setShowGlossary`, `setShowQuiz` are used anywhere else in `SideUtilityDock.tsx`.

3. **Section "BELAJAR" Removal & "Bantuan" Button Relocation (Lines 328–384)**:
   - Location: Lines 328–384
   ```tsx
   // BEFORE:
           {renderButton(
             <Settings size={18} strokeWidth={1.75} />,
             'Pengaturan',
             'Ctrl+,',
             () => setShowSettings(true)
           )}

           {/* ================= GRUP 3: BELAJAR ================= */}
           {isExpanded ? (
             <div
               style={{
                 fontSize: '10px',
                 fontWeight: 700,
                 color: 'var(--label-tertiary)',
                 letterSpacing: '0.05em',
                 padding: '8px 8px 6px',
                 marginTop: '16px',
                 textTransform: 'uppercase'
               }}
             >
               Belajar
             </div>
           ) : (
             <div style={{ marginTop: '16px' }} />
           )}

           {renderButton(
             <Award size={18} strokeWidth={1.75} />,
             'Misi Kota',
             'U',
             () => setShowMissions(true)
           )}

           {renderButton(
             <BookOpen size={18} strokeWidth={1.75} />,
             'Glosarium SNI',
             'G',
             () => setShowGlossary(true)
           )}

           {renderButton(
             <GraduationCap size={18} strokeWidth={1.75} />,
             'Kuis Arsitektur',
             'K',
             () => setShowQuiz(true)
           )}

           {onOpenHelp &&
             renderButton(
               <HelpCircle size={18} strokeWidth={1.75} />,
               'Bantuan',
               '?',
               onOpenHelp
             )}

           {/* ================= GRUP 4: KEMBALI KE LAYAR AWAL ================= */}
           <div style={{ marginTop: '16px' }} />
   ```
   - Target Change:
     - Remove the "BELAJAR" header (lines 336–352) and the three learning buttons (lines 354–373).
     - Relocate the `onOpenHelp` button directly under `Pengaturan` (in the Tampilan/Utility section).
     - Renumber or rename the comment for `GRUP 3: KEMBALI KE LAYAR AWAL`.
   ```tsx
   // AFTER:
           {renderButton(
             <Settings size={18} strokeWidth={1.75} />,
             'Pengaturan',
             'Ctrl+,',
             () => setShowSettings(true)
           )}

           {onOpenHelp &&
             renderButton(
               <HelpCircle size={18} strokeWidth={1.75} />,
               'Bantuan',
               '?',
               onOpenHelp
             )}

           {/* ================= GRUP 3: KEMBALI KE LAYAR AWAL ================= */}
           <div style={{ marginTop: '16px' }} />
   ```
   - Ergonomic Evaluation: In both expanded and collapsed modes, placing `Bantuan` directly beneath `Pengaturan` creates a cohesive utility cluster, followed cleanly by the home exit button.

---

### 2.3 `src/app/App.tsx`

#### Objective:
1. Unmount `<MissionModal>` and `<ArchitectureQuizModal>`.
2. Remove unused component imports.
3. Clean up `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz` from store destructuring.

#### Detailed Line Locations:
1. **Unused Imports Removal (Lines 8 & 17)**:
   - Line 8: `import { MissionModal } from '../ui/components/MissionModal';` -> Delete
   - Line 17: `import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';` -> Delete

2. **Unused Store Selectors Removal (Lines 40–41 & 60–61)**:
   - Lines 40–41:
     ```tsx
     showMissions,
     setShowMissions,
     ```
     -> Delete
   - Lines 60–61:
     ```tsx
     showQuiz,
     setShowQuiz,
     ```
     -> Delete

3. **Unmounting Component JSX (Lines 170 & 182–185)**:
   - Line 170:
     ```tsx
     // BEFORE:
     <GlossaryModal isOpen={showGlossary} onClose={() => setShowGlossary(false)} />
     <StyleLibraryModal isOpen={showStyles} onClose={() => setShowStyles(false)} />
     <MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} />
     <TutorialOverlay isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
     ```
     - Target Change: Delete line 170 (`<MissionModal ... />`).
   - Lines 182–185:
     ```tsx
     // BEFORE:
     <RealWorldExportModal
       isOpen={showRealWorldExport}
       onClose={() => setShowRealWorldExport(false)}
     />
     <ArchitectureQuizModal
       isOpen={showQuiz}
       onClose={() => setShowQuiz(false)}
     />
     ```
     - Target Change: Delete lines 182–185 (`<ArchitectureQuizModal ... />`).

---

### 2.4 `src/ui/state/useUIStore.ts`

#### Objective:
1. Address state fields `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz` and `ModalId`.
2. Maintain 100% backward compatibility with `tests/ui_primitives_and_modal_policy.test.ts`.

#### Investigation & Backward Compatibility Strategy:
- `tests/ui_primitives_and_modal_policy.test.ts` (lines 56–68) contains the following assertions:
  ```ts
  // Opening quiz via legacy setter closes styles
  store.setShowQuiz(true);
  state = useUIStore.getState();
  expect(state.activeModal).toBe('quiz');
  expect(state.showQuiz).toBe(true);
  expect(state.showStyles).toBe(false);

  // Closing via legacy setter
  store.setShowQuiz(false);
  state = useUIStore.getState();
  expect(state.activeModal).toBeNull();
  expect(state.showQuiz).toBe(false);
  ```
- If `'quiz'` or `showQuiz` / `setShowQuiz` were removed or disabled in `useUIStore.ts`, this test would fail immediately.
- Furthermore, `tests/education_and_pwa.test.ts` imports `ARCHITECTURE_QUIZ_QUESTIONS` from `src/education/ArchitectureQuizModal.tsx`.
- **Recommendation**:
  1. Do NOT delete the source files `src/ui/components/MissionModal.tsx` or `src/education/ArchitectureQuizModal.tsx`.
  2. Keep `ModalId` ('missions' and 'quiz') and state fields (`showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz`) in `useUIStore.ts`.
  3. Annotate these fields with JSDoc `@deprecated` indicating they are legacy modal actions preserved for unit test backward compatibility.
  4. Because the modals are completely unmounted from `App.tsx` and all buttons triggering them are stripped from `TopHeader.tsx` and `SideUtilityDock.tsx`, these features are 100% removed from user reach and DOM memory without risking any regression in the existing test suite.

---

## 3. Risk Assessment & Verification Checkpoints

| Checkpoint | Risk | Mitigation |
|------------|------|------------|
| Anti-Literal Color Test | `TopHeader.tsx` has a test asserting `content.not.toContain("color: '#0F172A'")` | Ensure no modifications in `TopHeader.tsx` introduce literal `'#0F172A'`; use `'var(--label)'` or existing tokens. |
| SideUtilityDock Test | `SideUtilityDock.tsx` has a test asserting `e.key === '['`, `Kembali ke Layar Awal`, `showExitConfirm` | Ensure keyboard listeners and return home buttons remain untouched. |
| Modal Exclusivity Test | `tests/ui_primitives_and_modal_policy.test.ts` checks `setShowQuiz(true)` -> `activeModal === 'quiz'` | Keep `showQuiz` and `setShowQuiz` in `useUIStore.ts` intact. |
| Education Quiz Test | `tests/education_and_pwa.test.ts` imports question constants | Do not delete `src/education/ArchitectureQuizModal.tsx`. |
| TypeScript Typing | Missing or dangling imports | Verify with `npx tsc --noEmit`. |
| Full Test Suite | Any unexpected test regression | Verify with `npm test -- --run`. |

---

## 4. Implementation Steps for Worker

1. **Step 1: Edit `src/ui/components/TopHeader.tsx`**
   - Remove `Award,` from import statement at line 13.
   - Remove `const setShowMissions = useUIStore((s) => s.setShowMissions);` at line 90.
   - Remove `<motion.button> ... Misi & Skor ... </motion.button>` at lines 475–501.
   - Remove `<button> ... Misi Kota ... </button>` from popover grid at lines 688–708, leaving a single clean Tutorial button.

2. **Step 2: Edit `src/ui/components/SideUtilityDock.tsx`**
   - Remove `Award,`, `BookOpen,`, `GraduationCap,` from imports at lines 9, 13, 14.
   - Remove `setShowMissions`, `setShowGlossary`, `setShowQuiz` at lines 39–41.
   - Remove lines 336–374 (BELAJAR section header and Misi Kota, Glosarium SNI, Kuis Arsitektur buttons).
   - Relocate the `onOpenHelp` (Bantuan) button immediately after `Settings` (Pengaturan).

3. **Step 3: Edit `src/app/App.tsx`**
   - Remove imports for `MissionModal` and `ArchitectureQuizModal` at lines 8 and 17.
   - Remove `showMissions`, `setShowMissions`, `showQuiz`, `setShowQuiz` from `useUIStore()` call.
   - Remove `<MissionModal ... />` (line 170) and `<ArchitectureQuizModal ... />` (lines 182–185).

4. **Step 4: Edit `src/ui/state/useUIStore.ts`**
   - Add `@deprecated` annotations to `showMissions` and `showQuiz` actions clarifying backward-compatibility status.

5. **Step 5: Verify**
   - Run `npx tsc --noEmit` -> ensure 0 errors.
   - Run `npm test -- --run` -> ensure 45/45 test files and 300/300 tests pass.
