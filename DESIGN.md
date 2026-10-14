# DESIGN.md - Arscity Architecture & Technical Specification

Dokumen ini adalah cetak biru teknis resmi untuk pengembangan sistem **Arscity**.

---

## 1. Prinsip Desain Inti

1. **Architecture-First Gameplay**: Fokus pada edukasi arsitektur dan tata kota tropis praktis tanpa NPC dan tanpa teks teori yang bertele-tele.
2. **Zero Commercial Assets (100% Free & Open Source)**: Hanya lisensi CC0, MIT, Apache 2.0, BSD, ISC, SIL OFL. Bebas aset berbayar, bebas lisensi restriktif.
3. **Procedural By Default**: Seluruh geometri jalan, persimpangan, gedung, jendela, atap, dan tekstur PBR dasar dibangkitkan secara prosedural berbasis kode matematika Three.js & Canvas.
4. **Strict Modular Decoupling**: Pemisahan tegas antara **Data Model** (state murni bebas dependensi render), **Render Engine** (Three.js), dan **User Interface** (React Apple Design Overlay).
5. **High Performance**: Target 60 FPS pada kartu grafis terintegrasi (iGPU) dengan instanced rendering, dirty-chunk invalidation, dan batasan draw call.

---

## 2. Struktur Modul & Folder Proyek

```
src/
├── app/
│   ├── App.tsx                     # Entrypoint React & Canvas container
│   ├── main.tsx                    # React DOM bootstrap
│   └── index.css                   # Global styling, tokens, Apple Design frosted glass
├── core/
│   ├── engine/
│   │   ├── Engine.ts               # Core Three.js render loop, resize, cleanup
│   │   ├── SceneManager.ts         # Scene hierarchy, fog, environment
│   │   ├── CameraController.ts     # God Eye view, pan, orbit, orthographic top-down
│   │   ├── LightingSystem.ts       # Sun calculation (Yogyakarta -7.8° LS), CSM shadows
│   │   └── RaycastManager.ts       # Ground, road, and building raycasting
│   ├── commands/
│   │   ├── CommandManager.ts       # Delta-based Command Pattern (Undo/Redo)
│   │   └── ICommand.ts             # Interface execute(), undo(), redo()
│   ├── math/
│   │   ├── Bezier.ts               # Cubic/Quadratic Bezier calculations
│   │   ├── Polygon.ts              # Polygon offset, area, centroid, clipping
│   │   └── SolarPosition.ts        # Solar azimuth & altitude equations
│   └── events/
│       └── EventBus.ts             # Decoupled pub-sub event dispatcher
├── world/
│   ├── CityModel.ts                # Master serializable data model of the city
│   ├── Terrain.ts                  # Ground plane, grass PBR, elevation mesh
│   ├── GridSystem.ts               # Adaptive snap grid (1m, 5m, 10m)
│   └── WeatherSystem.ts            # Clear, overcast, rain particles, atmospheric fog
├── roads/
│   ├── RoadGraph.ts                # Road nodes & edges graph structure
│   ├── RoadGeometryBuilder.ts      # Ribbon extrusion, asphalt, curbs, sidewalks
│   ├── IntersectionBuilder.ts      # Earcut polygon intersection generation
│   └── RoadPropPlacer.ts           # Street lights, sidewalk trees, road markings
├── buildings/
│   ├── BuildingModel.ts            # Building definition, floors, footprint, roof
│   ├── BuildingMeshBuilder.ts      # Analytical sub-quad wall slicer & floor extrusion
│   ├── RoofGenerators.ts           # Gable (pelana), Hip (limasan), Joglo, Flat dak
│   ├── PrefabCatalog.ts            # Parametric presets (Rumah 36/54, Ruko, Joglo, dll)
│   └── LotModel.ts                 # Parcel / kavling definition & boundary
├── materials/
│   ├── ProceduralTextureGen.ts     # Canvas-generated PBR textures (Asphalt, Tile, Brick, etc.)
│   ├── MaterialLibrary.ts          # Centralized PBR material cache & shaders
│   └── Shaders.ts                  # Lightweight foliage sway & water shaders
├── analysis/
│   ├── BuildingCodeChecker.ts      # KDB, KLB, GSB, KDH calculations & violations
│   ├── SolarAnalyzer.ts            # Facade heat exposure & natural lighting score
│   ├── VentilationAnalyzer.ts      # Cross-ventilation pathfinder & wind vector arrows
│   └── MeasurementTools.ts         # Ruler, area measurement, dimension lines
├── education/
│   ├── TutorialEngine.ts           # Step-by-step interactive onboarding
│   ├── GlossaryData.ts             # Architectural terms with concise 1-2 sentence notes
│   ├── MissionManager.ts           # Tiered 1-3 star challenges
│   └── WhyInspector.ts             # Contextual 'Kenapa?' design principle insights
├── ui/
│   ├── components/
│   │   ├── BottomToolbar.tsx       # SimCity-style Apple glass dock
│   │   ├── InspectorPanel.tsx      # Right property inspector & building code badge
│   │   ├── TopHeader.tsx           # Time slider, date, weather, fps counter
│   │   ├── Minimap.tsx             # Bottom-left 2D canvas city overview
│   │   ├── ModalDialog.tsx         # Apple-style sheets & modal dialogs
│   │   ├── AnalysisOverlay.tsx     # Solar heat map, wind arrows, section sliders
│   │   └── GlossaryTooltip.tsx     # Architectural term preview cards
│   ├── state/
│   │   └── useUIStore.ts           # Zustand store for active tool, selection, layer toggles
│   └── i18n/
│       ├── id.ts                   # Indonesian translations (default)
│       └── en.ts                   # English translations (future-ready)
└── io/
    ├── LocalStorageManager.ts      # Multi-slot autosave & recovery
    ├── JsonExporter.ts             # City serialization / deserialization
    └── ScreenshotExporter.ts       # Hi-res PNG photo mode & SVG floor plan export
```

---

## 3. Spesifikasi Geometri & Matematika

### 3.1 Sistem Jalan (Road & Intersection Topology)
- **Topologi**:
  - `RoadNode`: Posisi 3D $(x, y, z)$, daftar edge yang terhubung, tipe node (ujung jalan, belokan, persimpangan, bundaran).
  - `RoadEdge`: Node awal, node akhir, titik kontrol kurva Bezier $P_0, P_1, P_2, P_3$, profil jalan (lebar lajur, trotoar, median).
- **Ekstrusi Ruas Jalan**:
  - Dibagi per segmen interval kurva $\Delta t = 0.05$.
  - Vektor tegak lurus normal lateral dihitung sepanjang garis tangen kurva untuk membentangkan pita geometri (*ribbon strip*).
  - UV mapping memanjang (*continuous coordinate*) menjamin garis marka dan aspal tidak pecah atau terdistorsi.
- **Persimpangan Otomatis Tanpa Tumpang Tindih**:
  - Setiap ruas jalan yang memasuki persimpangan dipotong (*clipped*) pada jarak radius $R = \frac{W_{\text{road}}}{2 \sin(\theta/2)}$.
  - Titik potong sudut tepi jalan dikumpulkan searah jarum jam (*counter-clockwise sorting*).
  - Algoritma **Earcut** mentriangulasi poligon persimpangan menjadi mesh bidang datar mulus dengan UV aspal bersih.

### 3.2 Desainer Bangunan & Analisis Dinding Sub-Quad (Tanpa CSG)
- **Footprint**: Poligon 2D tertutup dengan verifikasi *non-self-intersecting*.
- **Pembagian Dinding Modular**:
  - Untuk setiap sisi dinding dari panjang $L$ dan tinggi lantai $H$:
  - Jika terdapat bukaan (pintu/jendela pada posisi horizontal $x_1 \dots x_2$ dan tinggi vertikal $y_1 \dots y_2$):
    - Dinding kiri: quad $[0 \dots x_1] \times [0 \dots H]$
    - Dinding kanan: quad $[x_2 \dots L] \times [0 \dots H]$
    - Lintel atas: quad $[x_1 \dots x_2] \times [y_2 \dots H]$
    - Ambang bawah (jika jendela): quad $[x_1 \dots x_2] \times [0 \dots y_1]$
  - Pendekatan analitis ini menghasilkan zero-boolean mesh dengan performa komputasi instan $O(1)$.
- **Atap Parametrik**:
  - **Pelana (Gable)**: Ekstrusi segitiga dari sumbu utama dengan overhang teritis variabel.
  - **Limasan / Perisai (Hip)**: Piramida terpotong dengan kemiringan 4 sisi dan kemiringan khas tropis 30°–35°.
  - **Joglo**: Struktur bertingkat dua dengan bagian brunjung tengah menjulang curam (45°–50°) dan atap emper keliling landai (25°–30°).
  - **Dak Datar**: Plat beton tipis dengan parapet keliling setinggi 0.6–1.0 meter.

---

## 4. Simulasi Iklim Tropis & Building Code Lite

### 4.1 Posisi Matahari Yogyakarta
- Koordinat acuan: Lintang $-7.8^\circ$ LS, Bujur $110.37^\circ$ BT.
- Perhitungan posisi deklinasi matahari $\delta$, sudut waktu $H$, elevasi surya $\alpha$, dan azimuth surya $\gamma$:
  $$\sin \alpha = \sin \phi \sin \delta + \cos \phi \cos \delta \cos H$$
- Radiasi panas fasad dihitung dari perkalian dot product vektor normal dinding terhadap vektor sinar matahari saat jam terik (10:00–15:00). Dinding menghadap Barat dan Timur menerima skor panas tertinggi, mendorong pemain menerapkan kanopi/teritis panjang dan vegetasi peneduh.

### 4.2 Building Code Lite Rules
- **KDB (Koefisien Dasar Bangunan)**:
  $$\text{KDB} = \frac{\text{Luas Lantai Dasar}}{\text{Luas Kavling}} \times 100\%$$
- **KLB (Koefisien Lantai Bangunan)**:
  $$\text{KLB} = \frac{\text{Total Luas Seluruh Lantai}}{\text{Luas Kavling}}$$
- **KDH (Koefisien Dasar Hijau)**:
  $$\text{KDH} = \frac{\text{Luas Terbuka Hijau}}{\text{Luas Kavling}} \times 100\%$$
- **GSB (Garis Sempadan Bangunan)**: Jarak minimum dinding terluar terhadap batas depan kavling menghadap jalan (misal $0.5 \times \text{Lebar Jalan} + 1\text{m}$).

---

## 5. Antarmuka Pengguna (iOS 27 Liquid Glass Refined)

- **Surface Material**: Dynamic frosted glass (`--material-glass: rgba(...)`, `--blur-surface: 20px`, `--border-glass: rgba(...)`) dengan peredupan pantulan cahaya adaptif mode terang dan gelap.
- **Aksen Visual Sistem Diredam (Desaturated Apple System Tokens)**:
  - `--good`: Hijau sistem `#34c759` (keabsahan penempatan, indikator zona nyaman).
  - `--warn`: Amber sistem `#ff9500` (peringatan sempadan mendekati batas).
  - `--bad`: Merah sistem `#ff3b30` (pelanggaran KDB, KLB, GSB, tabrakan poligon).
  - `--accent`: Biru sistem `#007aff` (seleksi objek dan fokus interaktif).
- **Corner Radii & Kontur**: Super-elips Apple fluid (`--radius-large: 24px`, `--radius-medium: 16px`, `--radius-capsule: 9999px`).
- **Tipografi**: Inter WOFF2 lokal (SIL OFL 1.1) ter-cache di mesin klien tanpa koneksi CDN eksternal.
- **Micro-interactions**: Transisi spring dinamis iOS 27 (`cubic-bezier(0.16, 1, 0.3, 1)`) dengan responsivitas sentuhan haptik Web Audio.

---

## 6. Pipeline Aset, Penyimpanan & Audit Lisensi

1. **Tekstur PBR Asli CC0**: 13 paket material 1K fisik dimuat dari `public/assets/textures/` terkelola lewat singleton `MaterialLibrary` dengan `ProceduralTextureGen` sebagai failover fallback internal.
2. **Penyimpanan Tahan Banting**: Menggunakan `IndexedDBStorage` bertingkat dengan skema v2.0.0, migrasi sekuensial, dan deserialisasi atomik aman dari kegagalan berkas rusak.
3. **Audit Lisensi Mutlak**: Seluruh dependensi diaudit bebas dari lisensi restriktif/komersial (100% MIT, CC0, ISC, SIL OFL) tercatat pada `CREDITS.md` dan `LICENSE-AUDIT.md`.

