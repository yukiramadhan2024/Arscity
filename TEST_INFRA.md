# TEST_INFRA.md — Arscity v4.0.0 End-to-End Test Infrastructure

## 1. Overview & Test Architecture

This document defines the architectural specification, execution framework, and test inventory mapping for the **Arscity v4.0.0 E2E Testing Track**. 

Arscity v4.0.0 is an advanced Three.js and React architectural city-building and simulation application. The E2E test suite operates as an **independent, opaque-box test track** designed to validate system integrity, compliance with user specifications (`ORIGINAL_REQUEST.md`), and interface contracts defined in `PROJECT.md`.

```
 tests/e2e/
 ├── tier1_feature_coverage.test.ts   # Tier 1: Primary feature coverage (>=5 tests per area)
 ├── tier2_boundary_corner.test.ts    # Tier 2: Boundary conditions, extremes & corner cases
 ├── tier3_cross_feature.test.ts      # Tier 3: Pairwise cross-feature subsystem interactions
 └── tier4_real_world_scenarios.test.ts # Tier 4: Real-world user journeys & architectural workflows
```

### Execution Framework
- **Test Runner**: Vitest (`v2.1.8`) with native TypeScript execution and ESM support.
- **Execution Command**: `npx vitest run tests/e2e/`
- **Isolation Principle**: Each test case is hermetic and self-contained; mocks, global DOM/Three.js state, and Zustand store instances (`useUIStore`) are reset between tests.
- **Progressive Testability**: Tests verify observable behavioral contracts, geometrical invariants, and mathematical formulas derived from authoritative specifications.

---

## 2. The 4-Tier Test Methodology

The E2E test suite strictly adheres to the 4-tier testing hierarchy:

### Tier 1: Feature Coverage (>=5 Test Cases per Feature Area)
Validates primary behaviors ("happy paths") and functional contracts for each of the 6 core feature areas:
1. **Feature Area 1 (Cleanup of Mission/Score/Quiz entry points)**: Verifies clean top header, side dock, quick controls, and modal unmounts.
2. **Feature Area 2 (Vector Logo & 2-Font Typography Adherence)**: Verifies "The Infinite Isometric Monolith" logo geometry, placement in key screens, and adherence to Plus Jakarta Sans + JetBrains Mono.
3. **Feature Area 3 (Apple VisionOS Frosted Glass & Settings)**: Verifies charcoal black (#0F172A) text, WCAG AA compliance, removal of legacy theme switcher, iOS spring segmented control, and sleek floating TopHeader.
4. **Feature Area 4 (Engine 144Hz Uncapped Loop & UE5 Visuals)**: Verifies unthrottled rAF loop, delta time clamping ($dt = \min(\Delta t, 0.1)$), rolling EMA FPS telemetry, device pixel ratio clamping, and static mesh matrix update freezing.
5. **Feature Area 5 (Lush Foliage, Hydrology & 2D/3D Mode)**: Verifies multi-layered botanical crowns, riverbed excavation ($Y = -2.0\text{m}$) and water plane ($Y = -0.30\text{m}$), automatic road bridge triggering over river channels ($Y < -0.25\text{m}$), and top-down 2D orthographic camera with horizontal section cut clipping ($Y = 2.4\text{m}$).
6. **Feature Area 6 (Realistic Furniture, First-Person & Universal CAD Studio)**: Verifies ergonomic composite furniture geometries (105° tilt sofas, king bed with duvet/pillows, Monstera plants), 3D architrave door frames with dual handles and edge hinge rotation, stairwell ceiling voids (2.8m x 4.2m) with instant floor teleportation hotkeys, and Universal CAD Studio 3 modes with calibrated stage lighting.

### Tier 2: Boundary & Corner Cases (>=5 Test Cases per Feature Area)
Challenges each feature area against extreme values, boundary conditions, edge inputs, and error recovery:
- **Area 1**: Rapid concurrent modal toggles, handling obsolete modal IDs, null activeModal transitions, unmounted modal state purity.
- **Area 2**: Extreme logo dimensions ($size = 0$, $size = 1000$), font fallback degradation, canvas text telemetry resilience, zero 3rd-font leakage.
- **Area 3**: Extreme text scales (0.8x to 1.4x), high-contrast accessibility ratios ($> 4.5:1$ and $> 7:1$), spring parameter stability, rapid quality preset transitions.
- **Area 4**: Clock delta time spikes ($dt \ge 1.0\text{s}$ clamped to 0.1s, negative delta time, zero delta time), EMA FPS smoothing under extreme framerate jumps (0 to 144 FPS), freezing 500+ static meshes without memory leakage.
- **Area 5**: River carving at map boundaries ($X/Z = \pm 800\text{m}$), extreme embankment slope gradients, acute road-river intersection angles, section cut plane exactly at floor slab boundaries, orthographic camera extreme zoom distances.
- **Area 6**: Floor teleport boundary limits ($floor < 1$, $floor > totalFloors$, outside building boundaries), door proximity boundaries ($2.2\text{m}$ open threshold vs $2.8\text{m}$ close threshold), zero-dimension CAD geometries, rotated furniture half-extent bounding box math at arbitrary angles ($0^\circ, 30^\circ, 45^\circ, 90^\circ, 180^\circ$).

### Tier 3: Cross-Feature Combinations (Pairwise Coverage)
Evaluates interactions across subsystem boundaries:
- **Engine 144Hz Loop $\times$ 2D Orthographic Mode $\times$ Section Cut Clipping**: Verifies engine renders smoothly when camera switches from 3D orbit to 2D top-down plan view with horizontal clipping active at $Y = 2.4\text{m}$.
- **Riverbed Excavation $\times$ Road Geometry Bridge Generation $\times$ Water Ripple Normal**: Verifies that when a road crosses a carved river trench ($Y < -0.25\text{m}$), concrete bridge decks, railings, and piers instantiate automatically without z-fighting with the water plane at $Y = -0.30\text{m}$.
- **Realistic Furniture Placement $\times$ First-Person Stairwell Traversal $\times$ Instant Floor Teleport**: Verifies placed furniture persists across floor transitions, does not obstruct stairwell circulation voids ($2.8\text{m} \times 4.2\text{m}$), and updates room metric telemetry upon teleportation.
- **Apple VisionOS Frosted Glass UI $\times$ iOS Spring Segmented Controls $\times$ Diurnal Lighting Cycles**: Verifies frosted glass acrylic panels maintain crisp charcoal text readability and spring transition smoothness as day/night cycles transition from 07:00 WIB to 19:00 WIB.
- **Universal CAD Studio $\times$ First-Person Furniture Catalog $\times$ Building Instance Export**: Verifies custom models designed in Studio Modes 1, 2, and 3 preserve parametric metadata, material indices, and can be placed in the city scene.

### Tier 4: Real-World Application Scenarios (Integration & User Journeys)
Simulates end-to-end user workflows:
- **Journey 1: "Tropical Waterfront Boulevard Masterplan"**: Terraforming river channel to $Y = -2.0\text{m}$, water at $Y = -0.30\text{m}$, constructing an arterial road that spans the river with concrete bridge parapets, planting Tabebuya trees with fallen petals, and inspecting the layout in 2D masterplan view.
- **Journey 2: "Human-Scale Architectural Walkthrough"**: Transitioning to first-person mode, approaching an entrance door with dual handles that swings open on edge hinges, inspecting realistic L-shape sofa and king bed, walking up physical stairs through ceiling void, using instant floor teleportation hotkey to floor 3, and checking microclimate room metrics.
- **Journey 3: "Universal CAD Studio Prototyping Flow"**: Opening full-screen CAD Studio, toggling through Mode 1 (Building Architecture), Mode 2 (Furniture & Interior), and Mode 3 (Pavilions & Park Elements), validating stage lighting on Joglo roofs and sharp 3D dimension line text, saving instance, and placing on the urban grid with an automatic paving entrance path.
- **Journey 4: "Adaptive Graphics & Display Calibration Journey"**: Accessing Settings modal, validating crisp charcoal black text (#0F172A) on frosted glass, switching quality preset to Ultra 144Hz via iOS spring segmented control, observing EMA FPS counter capsule, and toggling high-contrast and reduce-motion accessibility.

---

## 3. Feature Inventory to Test Mapping

| # | Feature Area | Feature Description | Tier 1 Tests | Tier 2 Tests | Tier 3 / Tier 4 Tests |
|---|--------------|---------------------|--------------|--------------|-----------------------|
| 1 | Cleanup Entry Points | Remove "Misi & Skor" button from TopHeader | `test_topheader_no_mission_button` | `test_topheader_rapid_mode_switches` | `test_journey_waterfront_masterplan` |
| 2 | Cleanup Entry Points | Remove "BELAJAR" section from SideUtilityDock | `test_sidedock_no_belajar_section` | `test_sidedock_collapsed_expanded_safety` | `test_journey_waterfront_masterplan` |
| 3 | Cleanup Entry Points | Remove "Misi Kota" from Quick Controls Popover | `test_quick_controls_no_mission_button` | `test_quick_controls_outside_click` | `test_journey_waterfront_masterplan` |
| 4 | Cleanup Entry Points | Unmount MissionModal, QuizModal, CityScoreModal | `test_modal_tree_unmounted` | `test_legacy_modal_id_resilience` | `test_journey_graphics_calibration` |
| 5 | Vector Logo & Typography | The Infinite Isometric Monolith vector logo | `test_logo_isometric_monolith_geometry` | `test_logo_extreme_scales` | `test_frosted_glass_with_logo_header` |
| 6 | Vector Logo & Typography | Logo placement in Login, WorldHub, Dock, CAD | `test_logo_consistent_screen_placements` | `test_logo_null_textColor_fallback` | `test_journey_cad_studio_prototyping` |
| 7 | Vector Logo & Typography | Plus Jakarta Sans + JetBrains Mono system | `test_typography_font_family_adherence` | `test_typography_fallback_resilience` | `test_journey_graphics_calibration` |
| 8 | Vector Logo & Typography | 2D canvas font purge (no 3rd fonts) | `test_canvas_2d_font_purge` | `test_canvas_telemetry_font_rendering` | `test_journey_walkthrough` |
| 9 | VisionOS Glass & Settings | Fix white-on-white text bug (#0F172A / #475569) | `test_settings_text_contrast_fix` | `test_settings_wcag_aa_ratios` | `test_journey_graphics_calibration` |
| 10 | VisionOS Glass & Settings | Lock identity to Apple Spatial Frosted Glass | `test_frosted_glass_design_tokens` | `test_glass_blur_saturation_presets` | `test_frosted_glass_with_logo_header` |
| 11 | VisionOS Glass & Settings | iOS spring segmented graphics quality control | `test_ios_spring_segmented_control` | `test_spring_interruption_dynamics` | `test_journey_graphics_calibration` |
| 12 | VisionOS Glass & Settings | Floating TopHeader with emerald FPS badge | `test_floating_topheader_fps_badge` | `test_fps_badge_telemetry_smoothing` | `test_engine_144hz_and_2d_ortho` |
| 13 | VisionOS Glass & Settings | macOS Dock Magnification with SPRING_TACTILE | `test_bottom_dock_magnification_physics` | `test_dock_edge_hover_boundaries` | `test_journey_waterfront_masterplan` |
| 14 | VisionOS Glass & Settings | Hide rooftop red violation badges in normal view | `test_rooftop_badges_hidden_in_normal_view`| `test_rooftop_badges_shown_on_select` | `test_journey_waterfront_masterplan` |
| 15 | Engine 144Hz & Visuals | Uncapped rAF loop, dt clamping, EMA FPS | `test_engine_144hz_uncapped_dt_clamping` | `test_engine_dt_spike_clamp_extremes` | `test_engine_144hz_and_2d_ortho` |
| 16 | Engine 144Hz & Visuals | Discrete GPU preference & pixel ratio limit | `test_engine_gpu_preference_pixel_ratio` | `test_engine_headless_gpu_fallback` | `test_journey_graphics_calibration` |
| 17 | Engine 144Hz & Visuals | Static mesh matrix update freeze | `test_static_mesh_matrix_freeze` | `test_bulk_static_mesh_matrix_freeze_stress`| `test_journey_waterfront_masterplan` |
| 18 | Engine 144Hz & Visuals | ACESFilmicToneMapping & SRGBColorSpace | `test_tone_mapping_aces_exposure` | `test_tone_mapping_exposure_extremes` | `test_botanical_foliage_diurnal_lighting` |
| 19 | Engine 144Hz & Visuals | Diurnal atmospheric PMREM environment | `test_pmrem_dynamic_sky_reflections` | `test_pmrem_hour_transition_boundaries` | `test_botanical_foliage_diurnal_lighting` |
| 20 | Engine 144Hz & Visuals | 1024 PBR procedural texture generators | `test_pbr_procedural_texture_maps` | `test_pbr_texture_repeat_scaling` | `test_journey_cad_studio_prototyping` |
| 21 | Foliage & Hydrology | Multi-layered botanical crown tree generation | `test_multi_layered_botanical_crown` | `test_botanical_crown_scale_extremes` | `test_botanical_foliage_diurnal_lighting` |
| 22 | Foliage & Hydrology | Under-canopy ground dressing & fallen petals | `test_under_canopy_petal_scatter` | `test_petal_scatter_zero_radius` | `test_journey_waterfront_masterplan` |
| 23 | Foliage & Hydrology | Riverbed excavation down to depth Y = -2.0m | `test_riverbed_excavation_depth` | `test_riverbed_excavation_map_boundary` | `test_river_excavation_bridge_water` |
| 24 | Foliage & Hydrology | Riverbank slope texture shading | `test_riverbank_slope_texture_shading` | `test_riverbank_vertical_cliff_clamp` | `test_journey_waterfront_masterplan` |
| 25 | Foliage & Hydrology | Water plane at Y = -0.30m & bridge triggering | `test_flowing_water_and_bridge_trigger` | `test_bridge_trigger_acute_crossing_angle`| `test_river_excavation_bridge_water` |
| 26 | Foliage & Hydrology | 2D Top-Down Orthographic camera mode | `test_2d_top_down_orthographic_mode` | `test_ortho_camera_extreme_zoom` | `test_engine_144hz_and_2d_ortho` |
| 27 | Foliage & Hydrology | Horizontal clipping plane at Y = 2.4m | `test_horizontal_clipping_plane_at_2_4m` | `test_clipping_plane_exact_floor_slab` | `test_engine_144hz_and_2d_ortho` |
| 28 | Foliage & Hydrology | 2D tree architectural drafting symbols | `test_2d_tree_architectural_symbol` | `test_2d_tree_symbol_transparent_layer` | `test_journey_waterfront_masterplan` |
| 29 | Furniture, Interiors & CAD | Realistic L-shape and 3-seater sofas | `test_realistic_sofas_ergonomics` | `test_sofa_rotation_bounding_extents` | `test_furniture_stair_teleport_pipeline` |
| 30 | Furniture, Interiors & CAD | Realistic dining and office desks & chairs | `test_realistic_desks_and_chairs` | `test_desk_chair_clearance_boundaries` | `test_journey_walkthrough` |
| 31 | Furniture, Interiors & CAD | Realistic King Bed with duvet and pillows | `test_realistic_king_bed_geometry` | `test_king_bed_mattress_plinth_alignment` | `test_journey_walkthrough` |
| 32 | Furniture, Interiors & CAD | Terracotta Monstera plants & warm floor lamps | `test_indoor_plants_and_floor_lamps` | `test_floor_lamp_warm_light_temperature` | `test_journey_walkthrough` |
| 33 | Furniture, Interiors & CAD | 3D door frames, dual handles & edge hinge rotation | `test_3d_doors_and_edge_hinge_pivoting` | `test_door_proximity_exact_thresholds` | `test_furniture_door_collision_pipeline` |
| 34 | Furniture, Interiors & CAD | Physical stairs & stairwell void (2.8m x 4.2m) | `test_stairs_and_stairwell_ceiling_void`| `test_stairwell_void_dimension_invariants`| `test_furniture_stair_teleport_pipeline` |
| 35 | Furniture, Interiors & CAD | Floor teleportation hotkeys & HUD pill buttons | `test_floor_teleportation_hotkeys_and_hud`| `test_floor_teleport_out_of_bounds` | `test_furniture_stair_teleport_pipeline` |
| 36 | Furniture, Interiors & CAD | Road-to-building paving entrance paths | `test_road_to_building_entrance_path` | `test_entrance_path_no_road_in_range` | `test_cad_studio_prefab_placement` |
| 37 | Furniture, Interiors & CAD | Universal CAD Studio 3 modes | `test_universal_cad_studio_3_modes` | `test_cad_studio_mode_switching_dirty_state`| `test_journey_cad_studio_prototyping` |
| 38 | Furniture, Interiors & CAD | CAD 3D stage lighting & 3D dimension line text | `test_cad_stage_lighting_and_dimension_text`| `test_dimension_line_text_size_1_65m` | `test_journey_cad_studio_prototyping` |

---

## 4. Authoritative Expected Output Derivation

Expected outputs are derived authoritatively from mathematical laws, physical constraints, and the canonical Arscity v4.0.0 specification documents:

1. **Delta Time Clamping**:
   $$dt = \min(\Delta t, 0.1)$$
   Prevents physics explosion on tab backgrounding. An input delta time of $\Delta t = 0.5\text{s}$ must strictly yield $dt = 0.1\text{s}$.
2. **Exponential Moving Average (EMA) FPS**:
   $$\text{EMA}_{\text{FPS}} = \alpha \cdot \text{FPS}_{\text{inst}} + (1 - \alpha) \cdot \text{EMA}_{\text{prev}}$$
   Guarantees smooth framerate reporting without single-frame jitter up to 144+ FPS.
3. **Rotated Furniture Half-Extents**:
   $$\text{halfW}_{\text{eff}} = \frac{W |\cos \theta| + D |\sin \theta|}{2}, \quad \text{halfD}_{\text{eff}} = \frac{W |\sin \theta| + D |\cos \theta|}{2}$$
   Derived from axis-aligned bounding box projections. At $\theta = 0$, $\text{halfW}_{\text{eff}} = W/2$. At $\theta = \pi/2$, $\text{halfW}_{\text{eff}} = D/2$.
4. **Hydrological River Profile**:
   $$\text{Excavation Depth} = -2.0\text{m}, \quad \text{Water Level} = -0.30\text{m}, \quad \text{Bridge Trigger} \iff \text{Terrain } Y < -0.25\text{m}$$
5. **Section Cut Height**:
   $$\text{Global Clipping Plane } Y = 2.4\text{m} \implies \text{Normal } (0, -1, 0), \text{ Constant } 2.4$$
6. **WCAG AA Contrast Ratio**:
   $$\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05} \ge 4.5:1$$
   Where $L_1, L_2$ are relative luminances of text (#0F172A) and background (#FFFFFF or acrylic milk surface `rgba(248, 250, 252, 0.88)`).

---

## 5. Verification & Test Execution

To execute the test suite:

```bash
# Run entire E2E test suite
npx vitest run tests/e2e/

# Run specific tier test file
npx vitest run tests/e2e/tier1_feature_coverage.test.ts
npx vitest run tests/e2e/tier2_boundary_corner.test.ts
npx vitest run tests/e2e/tier3_cross_feature.test.ts
npx vitest run tests/e2e/tier4_real_world_scenarios.test.ts
```
