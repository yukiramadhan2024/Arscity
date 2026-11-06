Tim pengembang bertindak sebagai Principal Game Engine Architect (Unreal Engine / Three.js Specialist), World-Class Apple UI/UX Designer, dan Lead Systems Engineer untuk perombakan menyeluruh Arscity v4.0.0.

Working directory: c:\Projects\Arscity
Integrity mode: [OPEN: Pembatasan apa saja yang berlaku bagi tim pengembang?]

## Requirements

### R1. Penghapusan Fitur Misi, Skor, dan Kuis
- Hapus tombol "Misi & Skor" dari bilah atas di `src/ui/components/TopHeader.tsx`.
- Hapus seluruh bagian "BELAJAR" (berisi tombol "Misi Kota", "Glosarium SNI", dan "Kuis Arsitektur") dari `src/ui/components/SideUtilityDock.tsx` dan popover Kontrol Cepat.
- Hapus tombol "Misi Kota" dari dalam menu pop-up Kontrol Cepat.
- Lepaskan render komponen `MissionModal`, `QuizModal`, dan `CityScoreModal` dari pohon komponen utama di `src/app/App.tsx` dan `src/ui/state/useUIStore.ts` agar antarmuka fokus murni pada pembangunan kota dan desain arsitektur.

### R2. Logo Vektor Baru dan Sistem Dua Font Modern
- Buat komponen logo vektor baru di `src/ui/components/ArscityLogo.tsx` dengan desain geometri orisinal "The Infinite Isometric Monolith": perpaduan tiga bilah prisma isometrik yang saling mengunci membentuk siluet huruf A sekaligus gedung pencakar langit 3D di dalam heksagon halus bergradasi biru safir (#0066FF) ke sian elektrik (#00D4FF) dengan kilau cahaya di sudut atas.
- Pasang `ArscityLogo` secara konsisten di `LoginPage.tsx` (layar sambutan), `WorldHubModal.tsx` (perpustakaan kota), `SideUtilityDock.tsx` (pojok kiri atas), dan Top Bar Studio CAD.
- Kunci maksimal 2 font di `index.html` dan `src/app/index.css`: Plus Jakarta Sans (bobot 500, 600, 700, 800) untuk seluruh antarmuka dan judul, serta JetBrains Mono (bobot 500, 600) untuk angka telemetri, jam, dan ukuran meter. Pastikan tidak ada font ketiga di seluruh kode CSS maupun kanvas 2D.

### R3. Perombakan UI/UX Gaya Apple VisionOS dan Perbaikan Pengaturan
- Perbaiki bug teks putih di atas putih pada `SettingsModal.tsx`: ubah seluruh judul dan nama pengaturan menjadi hitam arang (#0F172A) dan subteks deskripsi menjadi abu-abu sedang (#475569).
- Hapus pemilih tema "Gelap | Terang | Sistem" di `TopHeader.tsx`. Kunci identitas visual pada Apple Spatial Frosted Glass (`rgba(248, 250, 252, 0.88)`, `backdrop-filter: blur(32px) saturate(200%)`, bayangan lembut berlapis, tanpa garis pemisah kasar, teks hitam arang #0F172A).
- Seragamkan tombol pilihan kualitas grafis (Rendah, Sedang, Tinggi, Ultra 144Hz) menggunakan Segmented Control bergaya iOS dengan pil aktif berbasis animasi pegas.
- Buat `TopHeader` ramping dan mengambang: memuat Jam & Slider Matahari dengan titik magnetik, Pemilih Cuaca, Segmented Control Mode Pandang (2D Denah | 3D Orbit | Pejalan Kaki | Drone), Indikator Performa Real-Time (angka FPS aktual dalam kapsul hijau zamrud satu baris), dan tombol Pengaturan Cepat.
- Berikan efek macOS Dock Magnification halus pada `BottomToolbar` dengan transisi pegas tactile yang dapat diinterupsi.
- Sembunyikan label peringatan merah melayang di atas atap gedung pada pandangan normal; hanya tampilkan indikator kepatuhan KDB/GSB saat gedung dipilih atau saat alat Zona/Bangun aktif.

### R4. Optimasi Engine 144 FPS dan Visual Standar Unreal Engine
- Pastikan loop `requestAnimationFrame` di `src/core/engine/Engine.ts` berjalan murni mengikuti refresh rate monitor tanpa pembatas 60 FPS, hitung delta time secara presisi (`dt = Math.min(clock.getDelta(), 0.1)`), dan perbarui FPS counter di `TopHeader` dengan rata-rata bergerak yang akurat hingga 144+ FPS.
- Set `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))` dan aktifkan `renderer.powerPreference = "high-performance"`.
- Bekukan perhitungan matriks pada mesh gedung, jalan, dan pohon yang diam (`mesh.matrixAutoUpdate = false; mesh.updateMatrix()`).
- Di `LightingSystem.ts`, aktifkan `THREE.ACESFilmicToneMapping` dengan exposure 1.05 dan `THREE.SRGBColorSpace`. Bangun generator Environment Map langit dan atmosfer prosedural menggunakan `THREE.PMREMGenerator` agar permukaan kaca, logam, air, dan marmer memantulkan gradasi langit/matahari.
- Di `ProceduralTextureGen.ts`, buat normal map, roughness map, dan AO map detail untuk serat kayu jati, nat bata merah terakota, pori batu candi andesit, genteng tanah liat mengilap tipis, dan aspal berbutir.

### R5. Vegetasi Rimbun Berdaun, Logika Sungai & Landscaping, serta Mode 2D/3D
- Ganti model pohon bola hijau di `AestheticLandscapeBuilder.ts` & `ProceduralTextureGen.ts` dengan kanopi dedaunan berlapis (Multi-Layered Botanical Crown): tekstur daun tropis beresolusi tinggi dengan transparansi lekuk daun (`alphaTest: 0.45`), gradasi pucuk muda ke daun tua, batang meruncing dengan 3-5 cabang dahan menyangga 12-18 gugus kanopi daun dan crossed foliage clusters bergoyang halus via shader vertex. Tambahkan semak perdu berdaun, rumput taman, dan kelopak bunga gugur di bawah pohon Tabebuya.
- Pada `Terrain.ts` & `src/tools/TerrainTool.ts`, implementasikan alat Sungai: penggalian palung sungai mulus hingga kedalaman Y = -2.0m dengan tebing melandai alami, tekstur lereng tebing batu kali dan pasir tepian, serta air mengalir jernih pada Y = -0.30m dengan animasi riak gelombang normal map, pantulan lingkungan, dan pembangunan jembatan beton berpagar otomatis saat dilewati jalan.
- Pada `CameraController.ts` & `Engine.ts`, sediakan transisi Mode 2D Masterplan vs 3D: Mode 2D beralih ke proyeksi Ortografis 90 derajat top-down dengan clippingPlane horizontal Y = 2.4m (atau sembunyikan atap) untuk menampilkan denah dinding lantai dasar, bukaan pintu, dan interior bersih, serta menyederhanakan pohon menjadi simbol arsitektur transparan. Mode 3D memulihkan perspektif dan volume atap secara mulus.

### R6. Furnitur Realistis, Logika First-Person Penuh, dan Universal Creation Studio
- Di `FirstPersonFurnitureCatalog.ts`, ganti balok kasar dengan furnitur proporsional dan detail (silinder halus, bevel/rounded cushions, rangka kaki): Sofa L-Shape & 3 Dudukan (busa berlapis, sandaran miring 105 derajat, sandaran tangan membulat, bantal aksen, kaki ramping), Meja & Kursi (daun meja tipis, 4 kaki silinder meruncing, kursi sandaran lengkung, monitor tipis ber-stand aluminium), Tempat Tidur King (dipan jati, kasur tebal + duvet lipat, 4 bantal, headboard kain, lampu meja), Tanaman Indoor Monstera menjuntai & Lampu berdiri silinder bersinar hangat.
- Di `FirstPersonController.ts`, `InteriorMeshBuilder.ts`, dan `InteriorInteractiveSystem.ts`: setiap pintu memiliki kusen 3D, panel kayu/kaca, dan handle di kedua sisi, berputar mulus pada engsel tepi saat didekati/tekan tombol E tanpa membuat pemain tersangkut.
- Sediakan tangga fisik dengan anak tangga 3D, railing, dan stairwell void pada plafon lantai atas, dilengkapi tombol pintas Teleportasi Lantai Instan di HUD dan keyboard ([PageUp] / [PageDown] / klik nomor lantai).
- Otomatis buat jalur perkerasan masuk (paving entrance path) dari teras gedung ke trotoar jalan terdekat.
- Di `CustomBuildingCreatorModal.tsx` & `CustomBuildingMeshBuilder.ts`, tambahkan pemilih 3 Mode Studio CAD: Mode 1 (Rancang Gedung Arsitektur), Mode 2 (Rancang Furnitur & Interior Kustom untuk disimpan ke katalog First-Person), dan Mode 3 (Rancang Paviliun & Elemen Taman). Perbaiki pencahayaan panggung 3D agar atap limasan/joglo terlihat jelas bertekstur, serta perbesar label garis ukur 3D.

### R7. Verifikasi dan Pengujian
- Lulus kompilasi tipe TypeScript tanpa error.
- Lulus 100% test suite pada unit testing.
- Lulus proses build produksi.
- Verifikasi visual antarmuka dan visual 3D pada aplikasi yang sedang berjalan.

## Acceptance Criteria

### Kompilasi dan Pengujian Otomatis
- [ ] Perintah `npx tsc --noEmit` berhasil tanpa error (0 error).
- [ ] Perintah `npx vitest run` menghasilkan 100% test suite lulus tanpa kegagalan.
- [ ] Perintah `npm run build` menyelesaikan build produksi tanpa error.

### UI/UX dan Desain Visual
- [ ] Komponen tombol "Misi & Skor" tidak lagi tampil di bilah atas TopHeader.
- [ ] Bagian "BELAJAR" dan tombol "Misi Kota", "Glosarium SNI", "Kuis Arsitektur" tidak ada di SideUtilityDock maupun popover Kontrol Cepat.
- [ ] Komponen MissionModal, QuizModal, dan CityScoreModal tidak dirender dalam pohon DOM aplikasi.
- [ ] Komponen `ArscityLogo` ("The Infinite Isometric Monolith") terpasang dan tampil tajam di LoginPage, WorldHubModal, SideUtilityDock, dan Studio CAD Top Bar.
- [ ] Hanya ada maksimal 2 font keluarga (Plus Jakarta Sans dan JetBrains Mono) pada CSS dan tidak ada font ketiga.
- [ ] Seluruh judul dan teks baris di SettingsModal berwarna kontras (#0F172A dan #475569) dan tidak ada teks putih di atas latar putih.
- [ ] Pemilih tema di TopHeader telah dihapus, dan antarmuka mengadopsi tema Apple Spatial Frosted Glass secara konsisten.
- [ ] Tombol pemilihan kualitas grafis menggunakan segmented control dengan indikator pil geser berbasis pegas.
- [ ] TopHeader menampilkan jam, slider matahari magnetik, cuaca, segmented control pandangan, badge FPS real-time, dan tombol pengaturan cepat.
- [ ] BottomToolbar menampilkan efek pembesaran kursor (dock magnification) yang mulus.
- [ ] Label peringatan KDB/GSB di atas gedung disembunyikan pada pandangan normal dan hanya muncul saat gedung dipilih atau alat pembangunan aktif.

### Engine, Visual, dan Landscape 3D
- [ ] Render loop tidak dibatasi secara artifisial pada 60 FPS dan mendukung display refresh rate tinggi hingga 144 FPS.
- [ ] Tone mapping ACESFilmic dan environment map PMREM aktif pada pencahayaan Three.js.
- [ ] Mesh statis (gedung, jalan, pohon) mengaktifkan `matrixAutoUpdate = false`.
- [ ] Tekstur PBR prosedural untuk kayu jati, bata merah, batu candi, genteng, dan aspal memiliki normal map, roughness map, dan AO map.
- [ ] Model pohon menggunakan sistem dedaunan kanopi bertingkat (Multi-Layered Botanical Crown) dengan shader goyangan angin ringan, bukan 3 bola polos.
- [ ] Alat sungai memotong tanah hingga Y = -2.0m dengan lereng bertekstur tebing/pasir dan air beranimasi di Y = -0.30m, serta menaruh jembatan ketika bersilangan dengan jalan.
- [ ] Mode 2D beralih ke proyeksi ortografis top-down dengan bidang potong horizontal atau atap tersembunyi serta pohon berbentuk simbol arsitektur; kembali ke 3D memulihkan atap dan proyeksi perspektif.

### Interior, First-Person, dan CAD Studio
- [ ] Model furnitur first-person di FirstPersonFurnitureCatalog memiliki detail realistis (sofa beveled cushions & kaki ramping, meja berkaki meruncing, tempat tidur king lengkap, tanaman pot monstera).
- [ ] Pintu di mode first-person memiliki kusen, panel, handle, dan berengsel di sisi tepi dengan interaksi tekan E yang mulus tanpa menyangkut.
- [ ] Tangga interior memiliki anak tangga 3D, void bukaan plafon, dan navigasi teleportasi lantai instan (HUD & shortcut keyboard).
- [ ] Jalur paving menghubungkan teras depan gedung ke trotoar jalan terdekat secara otomatis.
- [ ] Modal Studio CAD menyediakan 3 Mode Kreasi (Gedung, Furnitur/Interior, Paviliun/Taman) dengan pencahayaan panggung jelas dan label ukuran terbaca tajam.
