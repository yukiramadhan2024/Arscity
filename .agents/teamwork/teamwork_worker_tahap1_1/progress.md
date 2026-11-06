# Progress — Tahap 1 (T1.1 - T1.9)
Last visited: 2026-11-02T07:50:00Z

## Status
- [x] Read mandatory files (ORIGINAL_REQUEST.md, survey handoffs, analysis, PROJECT.md, warna_gelap.txt)
- [x] Check baseline build & tests (`npx tsc --noEmit`: 0 error, `npx vitest run`: 53 passed)
- [x] T1.1: FPS drop at night (lights) & commit (`f1a6f2a`)
- [x] T1.2: Stars looking like dust balls on grass & commit (`6cc56f4`)
- [x] T1.3: Malioboro layout untidy & commit (`22043f5`)
- [x] T1.4: Bright white glass theme (remove dark overrides) & commit (`bcd24f9`)
- [x] T1.5: TopHeader fixed center & responsive collapsible & commit (`9e52d18`)
- [x] T1.6: Button Cerah & circular action buttons contrast & commit (`3422d48`)
- [x] T1.7: Graphics preset SegmentedControl contrast & commit (`4258fc1`)
- [x] T1.8: Photo Mode duplicate button & 35mm lens & commit (`6a0f450`)
- [x] T1.9: WorldHubModal 3-dots dropdown auto-flip & commit (`4b94ee2`)
- [x] Final verification (`tsc`: 0 error, `vitest`: 58/58 passed, `npm run build`: success)
- [x] Write handoff.md and send completion message

## Completed Task Commits
- **T1.1**: `f1a6f2a` — eliminate night lighting FPS drop with zero pointlights and smooth emissive transitions
- **T1.2**: `6cc56f4` — fix star dome following camera with 3600m radius and fixed pixel size
- **T1.3**: `22043f5` — parametric Malioboro corridor layout eliminating all building and road overlaps
- **T1.4**: `bcd24f9` — unify UI to single bright white frosted glass theme and fix reduced transparency contrast
- **T1.5**: `9e52d18` — fix TopHeader center positioning and responsive narrow viewport handling
- **T1.6**: `3422d48` — enhance contrast of Cerah and circular action buttons in TopHeader
- **T1.7**: `4258fc1` — fix graphics preset segmented control label contrast
- **T1.8**: `6a0f450` — eliminate duplicate photo mode button and add 35mm architectural lens
- **T1.9**: `4b94ee2` — add auto-flip upward positioning and viewport clamping for saved city action menu in WorldHubModal
