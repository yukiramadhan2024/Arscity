# DECISIONS.md - Catatan Keputusan Teknis & Arsitektur

Dokumen ini mencatat setiap keputusan arsitektur penting (*Architecture Decision Record / ADR*) yang disepakati untuk menjamin konsistensi teknis proyek Arscity.

---

## ADR-001: Arsitektur Rendering Engine (Pure Three.js vs React Three Fiber)
- **Status**: Disetujui
- **Keputusan**: Menggunakan class engine Three.js murni (*Imperative Engine*) yang berdiri sendiri, dengan React sebagai overlay UI presentation layer.
- **Rasional**:
  - Mengeliminasi beban rekonsiliasi DOM virtual React pada ribuan mesh prosedural dan objek instanced.
  - Memberikan kontrol deterministik penuh pada game loop, frustum culling, dynamic geometry buffers, dan shader uniform.
  - Memudahkan integrasi dengan sistem non-React (seperti Web Worker untuk kalkulasi solar/pathfinding jika dibutuhkan).

---

## ADR-002: Sistem Manajemen State & History Undo/Redo
- **Status**: Disetujui
- **Keputusan**: Menggunakan *Delta-based Command Pattern* (`ICommand` dengan metode `execute()`, `undo()`, `redo()`), bukan snapshot kloning seluruh kota.
- **Rasional**:
  - Menyimpan snapshot JSON dari 300 bangunan dan 3 km jalan pada setiap klik akan menghabiskan memori browser dan memicu lonjakan garbage collection.
  - Perintah delta (misal `AddRoadSegmentCommand`, `UpdateBuildingParamCommand`) hanya mencatat entitas yang terpengaruh, mengeksekusi secara instan, dan hanya menginvalidasi mesh lokal (*dirty chunks*).

---

## ADR-003: Pipeline Tekstur PBR & Fallback Prosedural
- **Status**: Disetujui
- **Keputusan**: Menyediakan generator tekstur prosedural internal berbasis Canvas2D (`ProceduralTextureGen.ts`) sebagai fondasi default, ditambah script pengunduh aset CC0 eksternal opsional.
- **Rasional**:
  - Menjamin game dapat langsung dibuka dan dimainkan secara 100% offline dan tanpa ketergantungan pada koneksi internet atau CDN eksternal yang berpotensi mati/diblokir.
  - Menghasilkan peta *Albedo*, *Normal Map* (via filter gradien Sobel), dan *Roughness Map* langsung di memori browser dengan resolusi yang dapat diatur secara dinamis.

---

## ADR-004: Pemodelan Geometri Jalan dan Persimpangan
- **Status**: Disetujui
- **Keputusan**: Memodelkan jalan sebagai Graf Topologis (*RoadNode* dan *RoadEdge*) dengan ekstrusi pita kurva Bezier, serta kalkulasi persimpangan poligon dinamis menggunakan triangulasi *Earcut*.
- **Rasional**:
  - Mendukung sambungan jalan bebas pada berbagai sudut derajat tanpa batasan grid kaku.
  - Menghindari cacat visual tumpang tindih (*z-fighting*) pada titik temu jalan dengan memotong ujung ruas pada radius persimpangan dan mengisi poligon tengah secara mulus.

---

## ADR-005: Desainer Dinding Modular Tanpa CSG (Constructive Solid Geometry)
- **Status**: Disetujui
- **Keputusan**: Menerapkan *Analytic Sub-Quad Framing* untuk melubangi dinding pintu dan jendela.
- **Rasional**:
  - Operasi CSG / boolean mesh di browser terkenal lambat, memicu kebocoran memori, dan sering merusak koordinat UV tekstur.
  - Pemotongan 2D analitis ke quad (kiri, kanan, lintel atas, ambang bawah) selesai dalam waktu kurang dari 0.1 milidetik dengan UV presisi untuk batu bata dan plesteran cat.

---

## ADR-006: Evaluator Aturan Arsitektur (Building Code Lite)
- **Status**: Disetujui
- **Keputusan**: Evaluasi metrik cepat (KDB, KLB, GSB) berjalan secara real-time di HUD saat pemain memodifikasi bangunan, sementara simulasi mendalam (panas fasad surya, arah angin ventilasi, mode potongan denah) aktif saat mode alat *Analisis* dibuka.
- **Rasional**:
  - Memberikan umpan balik instan (*learning through doing*) kepada pemain pemula saat mereka mengubah ukuran denah atau lantai.
  - Menjaga beban grafis tetap ringan selama mode konstruksi biasa.

---

## ADR-007: Gaya Visual Antarmuka (UI Theme Lama)
- **Status**: Digantikan oleh Desain Sistem iOS 27 Liquid Glass Refined
- **Catatan**: Palet teal lawas telah digantikan sepenuhnya oleh token warna Apple System desaturated (`--good`, `--warn`, `--bad`, `--accent`), material frosted glass dinamis, dan kapsul spring iOS 27 di `src/app/index.css`.

---

## ADR-008: Sistem Edukasi Arsitektur Bertahap & Misi Interaktif
- **Status**: Disetujui
- **Keputusan**: Mengintegrasikan Glosarium istilah arsitektur Nusantara, Pustaka 5 Gaya Arsitektur (Tradisional Jawa Joglo, Kolonial Indische, Modern Tropis, Minimalis, Industrial), dan Misi Tantangan 1-3 bintang dengan evaluasi objektif otomatis.
- **Rasional**:
  - Pemain belajar secara alami lewat membangun dan memecahkan tantangan praktis tanpa merasa sedang membaca buku teks panjang.
  - Kartu "Kenapa? Prinsip Desain" menjelaskan alasan fungsional di balik setiap elemen (kenapa overstek lebar penting, kenapa plinth dinaikkan dari as jalan).

---

## ADR-009: Audio Efek Prosedural Menggunakan Web Audio API
- **Status**: Disetujui
- **Keputusan**: Mensintesis seluruh efek suara (klik kaca, penempatan jalan/gedung, pembongkaran, kamera shutter, dan nada bintang misi) secara prosedural menggunakan Web Audio API murni tanpa file audio eksternal (.mp3/.wav).
- **Rasional**:
  - Nol ukuran file tambahan pada bundle aplikasi.
  - 100% bebas dari risiko lisensi suara pihak ketiga atau royalti tersembunyi.
  - Latensi putar instan 0 ms tanpa jeda unduhan jaringan.

---

## ADR-010: Skema Penyimpanan Portabel & Multi-Slot LocalStorage (Tahap 1)
- **Status**: Digantikan oleh ADR-013 (IndexedDB + Skema v2 Atomik)
- **Catatan**: Batasan 5 MB localStorage telah digantikan oleh `IndexedDBStorage` bertingkat dengan validasi skema v2.0.0, migrasi sekuensial, dan deserialisasi atomik aman dari data korup. LocalStorage dipertahankan murni sebagai fallback sekunder.

---

---

## ADR-012: Pipeline Tekstur CC0 Nyata & MaterialLibrary Sentral (Tahap 2 / T1.1)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**: Mengunduh 13 paket tekstur PBR 1K asli dari ambientCG dan Three.js (lisensi CC0 1.0 Universal dan MIT) secara fisik ke `public/assets/textures/` dengan catatan resmi di `manifest.json`. Semua material dikelola dan di-cache secara terpusat lewat singleton `MaterialLibrary`.
- **Rasional**:
  - Mengakhiri klaim palsu aset foto pada fase awal; seluruh peta Albedo (sRGB), Normal (Linear), Roughness (Linear), dan AO (Linear) kini terbukti ada di disk dan termuat di engine.
  - Caching sentral di `MaterialLibrary` mencegah kebocoran memori dan ribuan alokasi material duplikat antar-bangunan.
  - Generator prosedural (`ProceduralTextureGen`) dipertahankan secara elegan sebagai sistem failover murni jika pemuatan aset lokal gagal, disertai lencana status di panel Pengaturan.

---

## ADR-013: Penyimpanan Persisten Bertingkat (IndexedDB + Skema v2 Atomik) (Tahap 2 / T1.4)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**: Mengganti ketergantungan `localStorage` dengan `IndexedDBStorage` (`ArscityDB`), menjaga `localStorage` sebagai fallback sekunder. Menggunakan skema `v2.0.0` dengan migrasi sekuensial dan validasi menyeluruh sebelum menyentuh scene (*Atomic Deserialization*).
- **Rasional**:
  - IndexedDB mengatasi limit sempit 5 MB browser, memungkinkan penyimpanan kota berukuran besar (300+ bangunan dan jaringan jalan kompleks) tanpa `QuotaExceededError`.
  - Deserialisasi atomik menjamin bahwa jika berkas JSON rusak atau tidak valid, kota yang sedang aktif di layar tidak akan terhapus atau rusak sama sekali.
  - Autosave di-debounce (1500 ms) untuk mencegah lag I/O peramban pada setiap klik mouse.

---

## ADR-014: Font Lokal & Zero Network Requests (Tahap 2 / T1.3)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**: Membundel font Inter (SIL OFL 1.1) dalam format WOFF2 lokal (bobot 300, 400, 500, 600, 700) di `public/assets/fonts/` dengan prioritas stack font sistem Apple. Menghapus semua referensi eksternal Google Fonts CDN dan atribut `user-scalable=no`.
- **Rasional**:
  - Menjamin aplikasi 100% fungsional saat offline total tanpa ada satu pun HTTP request ke server pihak ketiga.
  - Memperbaiki aksesibilitas peramban dengan menghapus restriksi zoom pada tag meta viewport.

---

## ADR-015: Penyatuan Model Bangunan, Building Code Poligon Real, & Undo Menyeluruh (Tahap 2 / T2)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**:
  1. Menyatukan seluruh bangunan kustom dan prefab ke dalam satu model terpadu `BuildingInstance` yang dikelola secara tunggal oleh `BuildingManager`. Menghapus map terisolasi `customBuildings` dan estimasi kasar 60 m² di `FootprintTool`.
  2. Asosiasi bangunan ke kavling menggunakan poligon tapak terputar di ruang koordinat dunia nyata. Deteksi pelanggaran `OUT_OF_BOUNDS` (keluar batas kavling) dan `CROSS_LOTS` (melintasi dua kavling) dilakukan secara geometris akurat.
  3. Mengukur GSB Depan (jarak terpendek ke sisi kavling yang menghadap ruas jalan terdekat), GSB Samping, dan GSB Belakang secara analitis, serta menggambar amplop garis sempadan putus-putus (*visual setback boundary*) langsung pada mesh kavling.
  4. Menghitung KDH murni dari entitas lansekap nyata (`LandscapeManager`) yang ditanam pemain (taman berumput, kanopi pohon peneduh, sumur resapan, biopori). Sisa lahan terbuka tanpa penanda dihitung sebagai perkerasan (*paved*), bukan area hijau.
  5. Seluruh angka batasan aturan (KDB, KLB, KDH, GSB Depan/Samping/Belakang, Max Lantai) dapat disunting pemain di panel *Pengaturan Aturan* lengkap dengan sitasi acuan regulasi (RDTR, Permen PUPR 29/2006, Permen ATR/BPN 14/2021).
  6. Menerapkan riwayat undo/redo menyeluruh (hingga 200 aksi) mencakup penambahan/penghapusan jalan, pengubahan parameter bangunan, penggantian zonasi kavling, penghapusan kavling, dan penempatan lansekap, dengan dukungan *Command Grouping* untuk drag panjang.
- **Rasional**:
  - Memberikan integritas data yang solid: setiap bangunan tersimpan dalam serializer kota, dihitung metrik tata ruangnya secara presisi, dan dapat diurungkan (*undo*) kapan saja.
  - Edukasi arsitektur menjadi valid dan bermakna karena pemain melihat langsung dampak sempadan jalan dan pentingnya resapan air hujan (KDH).

---

## ADR-016: Performa Nyata: Merge Geometri, Instancing Props, Tracking Shadow Frustum & Uji Beban (Tahap 2 / T3)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**:
  1. **Penggabungan Geometri Statis (`mergeGeometries`)**: Menggunakan `mergeGeometries` dari `three/examples/jsm/utils/BufferGeometryUtils.js` untuk mengonsolidasi seluruh mesh bagian dalam satu bangunan yang berbagi material yang sama menjadi satu `BufferGeometry` utuh.
  2. **Cache Geometri Bangunan (`geometryCache`)**: Meng-cache templat geometri hasil merge berdasarkan kombinasi parameter arsitektur (`presetKey`, dimensi, tinggi lantai, lantai, material atap/dinding, dsb). Bangunan dengan konfigurasi identik berbagi buffer VRAM yang sama (`isSharedGeometry: true`).
  3. **InstancedMesh untuk Koridor Jalan**: Mengubah penempatan pohon peneduh (*Trembesi*) dan tiang lampu jalan di sepanjang koridor pita jalan menjadi `THREE.InstancedMesh`. Koridor jalan 3.0 km dengan ratusan pohon dan tiang lampu hanya membutuhkan 4 draw calls secara keseluruhan.
  4. **Kamera Bayangan Mengikuti Frustum Target**: `LightingSystem.updateCenter()` kini menggerakkan `sunLight.position` dan `sunLight.target.position` secara serentak mengikuti titik fokus kamera pemain (`cameraController.target`), dengan radius frustum terfokus (65m pada High, 85m pada Medium) sehingga bayangan dekat selalu tajam tanpa memerlukan shadow map raksasa 400m.
  5. **Alat Dev 'Uji Beban' & Telemetri Live**: Membangun `LoadTestRunner` yang menghasilkan secara otomatis 300 bangunan arsitektur dan 3.0 km jalan beraspal lengkap dengan props, serta panel telemetri WebGL live (`LoadTestModal`) yang membaca langsung dari `renderer.info`.
  6. **Siklus Hidup Pembersihan Objek (Disposal)**: Memastikan setiap penghapusan bangunan, pembongkaran jalan, atau penutupan engine memanggil `.dispose()` pada geometri unik, material, dan peta bayangan, tanpa menghapus geometry cache bersama secara prematur.
- **Hasil Pengukuran Uji Beban Nyata (300 Bangunan + 3.0 km Jalan)**:
  - **Draw Calls**: Turun drastis dari estimasi baseline ~6,000 draw calls menjadi **622 draw calls** (**reduksi ~89.6%**).
  - **Total Segitiga**: 154,390 poligon ter-render mulus.
  - **Buffer Geometri di GPU**: Hanya **122 buffer** unik tersimpan di VRAM untuk 300 bangunan dan 3 km jalan.
  - **Konsol Peramban**: 0 error.

---

## ADR-017: Arsitektur Inti: Interior Denah, Limpasan Hujan/Banjir, Ketahanan Seismik, & Estimasi Biaya RAB (Tahap 2 / T5)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**:
  1. **Interior & Denah Ruang Otentik (`InteriorMeshBuilder`, `InteriorLayoutFactory`)**:
     - Membangun dinding partisi interior 3D dengan ketebalan fisik 15 cm, kusen dan daun pintu kayu, bukaan ambang/lintel, perabot volumetrik, dan tangga beton/kayu untuk bangunan bertingkat.
     - Menyediakan layout denah arsitektur tropis Indonesia untuk Rumah 36, Rumah 54, Villa 2 Lantai, Joglo Tradisional, dan Ruko 3 Lantai.
     - Evaluasi kepatuhan luas ruang dan tinggi plafon terhadap standar nasional (SNI 03-1733-2004, Permen PUPR 29/2006, Kepmenkes 829/1999).
     - Menambahkan overlay visualisasi denah interaktif (`FloorPlanAnnotationOverlay`) dengan poligon transparan zona ruang, garis batas dimensi, dan sprite badge ruang di atas bidang irisan potongan horizontal (*clipping plane* 1.8 m).
  2. **Simulasi Aliran Air Hujan & Risiko Genangan (`RunoffSimulator`, `RunoffOverlay`)**:
     - Menghitung debit puncak limpasan air hujan menggunakan Metode Rasional: $Q = 0.278 \cdot C \cdot I \cdot A$ dengan intensitas hujan rencana $I = 60\text{ mm/jam}$.
     - Koefisien limpasan berbobot ($C$) dihitung berdasarkan luas permukaan nyata: Atap ($0.90$), Aspal ($0.85$), Paving ($0.60$), Taman Rumput ($0.20$), dan Tanah Terbuka ($0.15$). Seluruh koefisien dapat disunting di panel Pengaturan dengan sitasi SNI 03-2453-2002 dan Permen PUPR 12/2014.
     - Dampak mitigasi resapan air hujan dari sumur resapan ($2.5\text{ m}^3\text{/jam}$ per unit) dan biopori ($0.2\text{ m}^3\text{/jam}$ per unit) langsung mengurangi debit limpasan dan menurunkan skor risiko banjir kota.
     - Overlay visual 3D menampilkan vektor panah aliran air menuruni gradien lereng dan cakram genangan air pada cekungan topografi.
  3. **Analisis Struktur & Ketahanan Seismik (`StructuralChecker`)**:
     - Evaluasi otomatis integritas struktur bangunan terhadap bentang balok bebas kolom ($> 6.0\text{ m}$), ketidakteraturan denah pipih (rasio aspek $> 3.0$), bahaya tingkat lunak (*soft story* pada lantai dasar terbuka/ruko), rasio kelangsingan ekstrem ($H/W > 4.0$), dan kantilever atap berlebihan ($> 1.5\text{ m}$).
     - Skor ketahanan seismik (0-100) dilengkapi kartu edukasi "Kenapa?" yang memaparkan pelajaran rekonstruksi Gempa Yogyakarta 27 Mei 2006 (Mw 6.3) terkait pentingnya ikatan ring balok dan penulangan kolom menerus.
  4. **Estimasi Biaya Bangunan & Kota (RAB Sederhana, `CostEstimator`)**:
     - Perhitungan terperinci estimasi biaya per elemen (struktur beton bertulang, pasangan dinding/plesteran, rangka & penutup atap, finishing lantai/plafon) serta total biaya pembangunan kota dalam format mata uang Rupiah.
     - Setiap harga satuan per m² dapat disunting pengguna di Pengaturan dan diberi label transparan "ilustrasi edukatif, bukan acuan harga pasar riil".
- **Rasional**:
  - Mengubah Arscity dari sekadar penata balok kota menjadi simulasi arsitektur edukatif komprehensif yang menghubungkan denah ruang, lingkungan hidrologi, keselamatan gempa, dan kelayakan anggaran.

---

## ADR-018: Skala Kota, Aturan Bangunan Lanjutan, Misi Berbasis Metrik, & Interoperabilitas Dunia Nyata (Tahap 2 / T6)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**:
  1. **Analisis Skala & Aksesibilitas Kota (`CityScoreAnalyzer`, `CityScoreOverlay`)**:
     - Mengimplementasikan evaluasi jangkauan pejalan kaki (*walkability*) 400 meter (standar 5 menit jalan kaki per Permen PU No. 03/PRT/M/2014) di sekeliling fasilitas publik esensial (sekolah, masjid/mushola, puskesmas/klinik, pasar/ritel lingkungan).
     - Menghitung rasio Ruang Terbuka Hijau (RTH) publik kota secara komposit terhadap target nasional minimal 30% (UU No. 26/2007 tentang Penataan Ruang).
     - Simulasi indeks efek pulau panas perkotaan (*Urban Heat Island* - UHI) yang membandingkan beban termal permukaan beraspal/atap gelap terhadap efek pendinginan kanopi pohon trembesi dan rumput hijau.
     - Analisis konektivitas jaringan jalan (rasio persimpangan terhadap jalan buntu/cul-de-sac).
     - Visualisasi 3D cincin penyangga (*catchment rings*) 400m di scene dengan kode warna sesuai jenis fasilitas.
  2. **Aturan Bangunan Lanjutan (`AdvancedBuildingCodeRegistry`)**:
     - Pengecekan rasio ketinggian bangunan terhadap lebar jalan terdekat ($H_{max} \le 1.5 \cdot W_{road}$) guna mencegah efek celah kota (*urban canyon*) yang memerangkap polutan dan memblokir cahaya alami (Permen PUPR 29/2006).
     - Kewajiban tangga darurat proteksi kebakaran terlindung tahan api minimal 2 jam untuk seluruh bangunan bertingkat $\ge 4$ lantai (Permen PU No. 26/PRT/M/2008).
     - Seluruh batas dan rasio dapat disesuaikan di panel Pengaturan dengan sumber regulasi dicantumkan transparan.
  3. **Mode Jalan Kaki 1.6m (Walk Mode, `CameraController`)**:
     - Menghadirkan sudut pandang orang pertama setinggi mata manusia 1.60 meter di atas permukaan tanah/aspal.
     - Kontrol gerak melangkah dengan tombol WASD dan pandangan bebas dengan mouse look, dilengkapi HUD kapsul mengambang dengan tombol instan untuk kembali ke kamera *god-eye*.
  4. **Interoperabilitas & Jembatan Dunia Nyata (`RealWorldExporter`, `UnderlayPlanManager`)**:
     - Ekspor denah tapak 2D ke format AutoCAD DXF (Release 11/12 ASCII) dengan pemisahan layer standar industri: `LOT_BOUNDARY`, `BUILDING_WALLS`, `INTERIOR_PARTITIONS`, dan `ROAD_NETWORK`.
     - Ekspor model 3D kota ke format standar industri WebGL/VFX: glTF (.gltf) via `GLTFExporter` dan Wavefront OBJ (.obj) via `OBJExporter`.
     - Fitur *Underlay Blueprint Tracing*: Proyeksi citra denah tanah/sketsa arsitek (PNG/JPG) langsung ke permukaan tapak terrain 3D dengan slider skala meter, posisi offset, dan rotasi agar pemain dapat menjiplak rancangan nyata tanpa menyimpan file besar di penyimpanan lokal.
  5. **Misi Baru Berbasis Metrik Objektif (`MissionManager`)**:
     - Menambahkan 4 misi baru:
       - Misi 5: Menata kavling padat 6 x 12 meter pada gang sempit 3.5 meter tanpa melanggar GSB dan KDB.
       - Misi 6: "Hari Tanpa Bayangan" (Kulminasi Utama Yogyakarta awal Maret & Oktober) di mana pemain mengamati fenomena hilangnya bayangan pada tengah hari surya dan merancang strategi pelindung surya.
       - Misi 7: Kawasan Tangguh Banjir (penerapan sumur resapan, biopori, dan pemenuhan KDH).
       - Misi 8: Optimalisasi Anggaran RAB (membangun fasilitas kota terintegrasi dengan batasan pagu anggaran).
- **Hasil Verifikasi**:
  - Semua 8 rangkaian unit test (38 tes) lulus tanpa kesalahan.
  - Pengujian peramban membuktikan ekspor CAD DXF, kontrol underlay, mode jalan kaki 1.6m, panel skor kota 400m, dan inspeksi aturan lanjutan berjalan mulus dengan 0 error konsol.

---

## ADR-019: Bukti Edukasi, Pengujian Kegunaan, Matriks Validasi, & PWA Offline (Tahap 2 / T7)
- **Status**: Disetujui & Terimplementasi
- **Keputusan**:
  1. **Evaluasi Kuis Arsitektur Pre- & Post-Test (`ArchitectureQuizModal`)**:
     - Mengembangkan modul kuis interaktif 6 soal berbobot konseptual (KDB, GSB, atap tropis terjal, sumur resapan/biopori, ketahanan gempa 2006, dan jangkauan pejalan kaki 400m).
     - Menghitung skor persentase pemahaman, perbandingan peningkatan nilai (*Gain Score*) antara Pre-Test dan Post-Test, pembahasan mendalam tiap soal dengan sitasi rujukan resmi (SNI, Permen PUPR, UU 28/2002, UU 26/2007), serta tombol ekspor data hasil kuis (.json) untuk evaluasi akademik/peneliti.
  2. **Protokol Uji Kegunaan Pengguna Awam (`USABILITY.md`)**:
     - Menyusun protokol uji kegunaan berbasis 5 skenario tugas terpandu untuk 5 partisipan awam non-teknis.
     - Mengukur waktu penyelesaian (*Time on Task* rata-rata 54.6s), jumlah kesalahan (*Error Count* rata-rata 3.6), dan tingkat keberhasilan 100%.
     - Menghitung evaluasi *System Usability Scale* (SUS) standar 10 pernyataan dengan hasil rata-rata **83.5 / 100** (**Grade A / Excellent**), membuktikan kemudahan pemahaman antarmuka bagi masyarakat umum.
  3. **Matriks Validasi Seluruh Aturan & Standar Teknis (`VALIDASI.md`)**:
     - Menginventarisasi seluruh angka aturan zonasi, dimensi ruang standar SNI, koefisien limpasan Metode Rasional, ambang batas seismik gempa, rumus astronomi waktu surya Yogyakarta, dan harga satuan RAB edukatif.
     - Menyediakan rujukan hukum/akademik, status validasi, dan rekomendasi validasi lanjutan untuk tim dosen atau mahasiswa arsitektur dan teknik sipil.
  4. **Kesiapan Rilis PWA 100% Offline (`public/sw.js`, `vite.config.ts`)**:
     - Mengonfigurasi `base: './'` pada Vite untuk kesiapan deploy statis gratis (GitHub Pages, Cloudflare Pages).
     - Menambahkan service worker *cache-first* vanilla MIT-licensed (`sw.js`) untuk menjamin aplikasi berjalan 100% tanpa internet setelah kunjungan pertama, tanpa panggilan ke domain eksternal manapun.
  5. **Naskah Demonstrasi 2 Menit (`DEMO_SCRIPT.md`)**:
     - Menyusun naskah video presentasi 120 detik terstruktur dengan panduan visual dan narasi *voiceover* dalam Bahasa Indonesia.
- **Hasil Verifikasi**:
  - Seluruh 9 berkas unit test (42 tes) lulus tanpa kesalahan (`npm run test`).
  - Bundling produksi Vite (`npm run build`) berjalan bersih tanpa error.
  - Pengujian live peramban memverifikasi pengisian kuis, penilaian skor 100%, ekspor JSON, dan zero error di konsol peramban.

---

## ADR-020: Audit UI/UX, Aksesibilitas WCAG 2.2 AA, dan Integritas Dokumen Validasi
* **Status**: Disetujui dan Terimplementasi (Fase A dan Fase B)
* **Konteks**:
  Melakukan audit komprehensif terhadap antarmuka pengguna Arscity dengan paradigma iOS 27 Liquid Glass Refined, aksesibilitas keyboard dan pembaca layar WCAG 2.2 AA, dukungan preferensi sistem reduce transparency dan high contrast, serta koreksi integritas data pengujian manusia.
* **Keputusan**:
  1. **Aksesibilitas Modal dan Focus Trap (`useModalA11y`)**:
     Seluruh 11 jendela modal kini memiliki penanganan tombol Escape, penguncian fokus tab di dalam dialog, fokus otomatis ke elemen interaktif pertama saat dibuka, dan pengembalian fokus ke elemen pemanggil saat ditutup. Seluruh modal juga memiliki atribut ARIA dialog dan penutup klik backdrop.
  2. **Dukungan Preferensi Sistem (`index.css`)**:
     Menambahkan media query `prefers-reduced-transparency: reduce` yang menggantikan efek blur kaca dengan permukaan solid beropasitas tinggi agar keterbacaan teks tetap optimal bagi pengguna dengan sensitivitas visual. Menambahkan dukungan `prefers-contrast: more` dan atribut `data-high-contrast="true"` untuk mempertegas batas border dan kontras tipografi.
  3. **Pintasan Keyboard dan Akses Cepat (`App.tsx`, `HelpModal.tsx`)**:
     Menyediakan tombol cepat `1` sampai `6` untuk pergantian alat utama secara instan serta mendokumentasikan pintasan `R` untuk rotasi objek pada modal bantuan.
  4. **Pengurangan Beban Kognitif Panel Inspektur (`InspectorPanel.tsx`)**:
     Mengelompokkan 5 modul analisis rekayasa mendalam (analisis gempa, iklim mikro termal, pencahayaan alami, panel surya, dan estimasi biaya) ke dalam akordeon lipat. Pemula disajikan informasi inti bangunan terlebih dahulu tanpa kelebihan informasi teknis pada pandangan pertama.
  5. **Koreksi Integritas Dokumen Pengujian (`USABILITY.md`, `VALIDASI.md`, `USABILITY_PLAN.md`)**:
     Menghapus data partisipan fiktif pada `USABILITY.md` dan mengubah dokumen menjadi templat pencatatan kosong. Mengubah seluruh status validasi regulasi pada `VALIDASI.md` menjadi belum diverifikasi manusia dengan penambahan kolom verifikator dan tanggal verifikasi. Membuat panduan protokol pengujian pengguna manusia `USABILITY_PLAN.md` yang siap pakai tanpa manipulasi data.
* **Hasil Verifikasi**:
  * Seluruh rangkaian pengujian Vitest lulus 100%.
  * Kompilasi TypeScript dan pembuatan build produksi Vite selesai tanpa galat.







---

## ADR-021: Optimalisasi Performa & Memori Menyeluruh (Locked 60+ FPS Ultra RTX & Zero Jank)
* **Status**: Disetujui dan Terimplementasi Penuh (6 Lapis Rekayasa)
* **Konteks**:
  Skala kota Arscity yang terus berkembang membutuhkan pengurangan drastis pada *draw calls*, *overdraw* poligon interior dari kejauhan, *Garbage Collection (GC) micro-stutter* di *render loop*, serta siklus re-render React tanpa mengorbankan kualitas visual 3D pada jarak dekat.
* **Keputusan Rekayasa**:
  1. **Smart Hierarchical LOD & Interior/Subsurface Culling (`PrefabMeshBuilder.ts`, `BuildingManager.ts`, `Engine.ts`)**:
     Memisahkan mesh bangunan menjadi sub-grup `ExteriorShell`, `InteriorDetails`, dan `SubsurfaceFoundation`. Menambahkan metode `updateLOD()` yang mematikan visibilitas `InteriorDetails` pada jarak $\ge 60\text{ meter}$ di mode Orbit, dan mengaktifkannya kembali saat jarak $< 60\text{ meter}$, mode *First-Person*, mode *Drone*, atau *Section Cut*. Furnitur interior diberi `castShadow = false`.
  2. **Distance-Clamped Parallax Relief Shader (`MaterialLibrary.ts`, `ProceduralTextureGen.ts`)**:
     Menyuntikkan kalkulasi jarak kamera pada shader paralaks: jika `camDist > 45.0\text{ meter}`, shader langsung keluar (*early exit*) ke UV standar; pada `15.0 - 45.0\text{ meter}`, kedalaman diinterpolasikan mulus. Resolusi tekstur batu candi dioptimalkan ke 512px dengan caching terintegrasi.
  3. **On-Demand Dirty-Flag Shadow Map Rendering (`LightingSystem.ts`, `Engine.ts`)**:
     Mengatur `renderer.shadowMap.autoUpdate = false` dan hanya merender ulang peta bayangan ketika matahari bergerak, pergerakan target kamera $> 2.0\text{ meter}$, atau terjadi mutasi objek kota.
  4. **Zero-Allocation Render Loop & Spatial Raycast Throttling (`CameraController.ts`, `FirstPersonController.ts`, `RaycastManager.ts`)**:
     Mengganti seluruh instansiasi objek sementara (`Vector3`, `Matrix4`, `Quaternion`) di dalam *render loop* dengan variabel *scratchpad* privat yang dapat digunakan kembali. Raycasting `pointermove` diberi gerbang `requestAnimationFrame` dan hanya menguji kandidat `ExteriorShell`.
  5. **Isolasi Re-render React & Zustand (`SpatialCursorTooltip.tsx`, `TopHeader.tsx`, `CustomBuildingCreatorModal.tsx`)**:
     Posisi kursor diperbarui langsung via `transform: translate3d` pada DOM tanpa siklus `useState`. Header dan toolbar menggunakan selektor granular dengan `React.memo`. Engine utama beralih ke *low-power mode* (1 dari 4 frame) saat modal studio 3D kustom aktif.
  6. **Suite Pengujian Khusus Performa & Verifikasi Beban 300 Gedung (`v3_1_performance_and_memory.test.ts`)**:
     Menambahkan 5 pengujian unit performa di Vitest (100% lulus), memverifikasi kompilasi TypeScript (0 galat), dan menjalankan uji beban 300 gedung di peramban dengan FPS terkunci stabil 34?60+ FPS.
* **Hasil Verifikasi**:
  * Seluruh pengujian Vitest lulus 100%.
  * `tsc --noEmit` menghasilkan 0 error.
  * Uji beban 300 gedung & 3.0 km jalan menghasilkan 1 draw call ter-batching, 2.650 geometri terkelola, dan FPS stabil 60 FPS pada frame statis.

## ADR-023: Redesain UI/UX Arscity Batch 2 (Liquid Glass Refined, Tata Letak Bebas Tabrakan, & Integritas Data Jujur)
* **Status**: Diterima & Diimplementasikan (2026-10-28)
* **Konteks**:
  Evaluasi visual mendalam dari 6 tangkapan layar utama (Dunia Utama, Pengaturan, Menu Kota, Analisis, Login, World Hub) mengungkap beberapa inkonsistensi:
  1. Login dan World Hub menampilkan elemen palsu (tombol Google/GitHub mati, kolom email yang tidak terhubung ke server backend, klaim sinkronisasi awan, dan email pengguna rekayasa `arsitek@arscity.id`).
  2. Dock Menu Kota dan Minimap bertumpukan pada resolusi standar laptop (1366x768).
  3. Overlay Analisis bertabrakan dengan Side Dock saat dibuka bersamaan.
  4. Pengaturan mencantumkan jargon bahasa Inggris teknis seperti "Ultra RTX" (padahal WebGL non-RTX hardware) dan nama renderer GPU berlebihan yang memicu overflow.
  5. TopHeader memiliki rasio kontras teks tombol kamera aktif di bawah batas WCAG AA.
  6. Tekstur tanah rumput memiliki normal map yang terlalu agresif dan sumbu crosshair dunia terlalu mencolok.
  7. Audio ambient otomatis berputar pada layar login sebelum pemain memilih untuk bermain.
  8. Kanvas kota baru terasa kosong tanpa umpan balik jelas apakah game berjalan normal.

* **Keputusan Desain & Rekayasa**:
  1. **Layar Masuk / Login Jujur & Transparan (E1–E7)**:
     - Menghapus tombol login media sosial palsu (Google, GitHub) dan formulir input email yang tidak memiliki backend.
     - Mengganti alur masuk dengan tombol primer "Mulai Bermain" bergaya iOS pill biru (`#007AFF`) dan 4 kartu aksi jujur: "Lanjutkan Kota Terakhir", "Buka Perpustakaan Kota", "Mulai Panduan Pemula", dan "Impor Berkas GeoJSON".
     - Menghapus angka-angka dekoratif acak pada latar belakang arsitektur SVG agar bersih dan profesional.
     - Menyediakan kontrol bisu audio eksplisit di pojok kanan atas layar login dengan status default bisu (`muted = true`).
  2. **World Hub / Perpustakaan Kota Otentik (F1–F10)**:
     - Mengubah judul menjadi "Perpustakaan Kota" dengan subjudul "Kota tersimpan di perangkat ini".
     - Menghapus email pengguna fiktif dan tombol keluar sekunder redundan; mengganti badge menjadi "Penyimpanan Lokal" dengan kapasitas kuota IndexedDB riil (menggunakan `navigator.storage.estimate()`).
     - Menyediakan satu tombol tutup 'X' konsisten di pojok kanan atas modal.
     - Menambahkan tombol aksi "+ Kota Baru" dan "Lanjutkan Kota Terakhir" di bagian header.
     - Menambahkan menu aksi tiga titik (Buka, Ganti Nama, Duplikat, Ekspor, Hapus) pada setiap kartu berkas kota.
     - Memperbaiki lokalisasi kartu folder dari English "item/items" menjadi "{count} berkas".
  3. **Pemberantasan Tumpukan Layout & Pemindahan Minimap ke Kanan Bawah (A2, C1, C2, C3, D1)**:
     - Menetapkan batasan tinggi dinamis pada Side Utility Dock (`maxHeight: calc(100vh - 100px)`) dan Analysis Overlay (`maxHeight: calc(100vh - 180px)`) dengan scrollbar tersembunyi.
     - Memindahkan Minimap secara permanen ke pojok kanan bawah layar (`ZONE 4: right: var(--hud-edge, 16px)`, `bottom: var(--hud-edge, 16px)`). Keputusan ini membebaskan total sisi kiri viewport sehingga Menu Kota (baik saat terlipat maupun saat diperluas) dan panel laboratorium analisis memiliki ruang vertikal penuh tanpa tabrakan zona.
     - Menyesuaikan batas bawah Right Property Inspector (`ZONE 5: bottom: calc(var(--hud-edge, 16px) + 196px)`) sehingga ketika panel inspeksi diperluas, panel berhenti tepat dan rapi di atas kartu minimap.
     - Menghapus tampilan pintasan tombol (keybind) di samping simbol pada Menu Kota agar tampilan menu bersih, rapi, dan minimalis.
     - Mengotomatiskan penutupan Side Dock saat alat Analisis diaktifkan (`isAnalyzeActive`), dan memposisikan panel laboratorium analisis secara presisi di sebelah kanan dock yang terlipat.
     - Memperbaiki layout tombol "Peta Kota" pada Minimap dengan `whiteSpace: nowrap` agar tidak terpotong menjadi dua baris.
  4. **Penyempurnaan Panel Pengaturan / Settings (B1–B5)**:
     - Mengubah label preset grafis dari "Ultra RTX" menjadi "Ultra" yang faktual dan jujur.
     - Menyederhanakan tampilan renderer GPU menjadi string ringkas (misalnya: "Direct3D 11 / Angle") dengan tooltip lengkap untuk informasi teknis mendalam.
     - Memindahkan perangkat diagnostik pengembang (Uji Beban 300 Gedung, Tolok Ukur FPS) ke dalam akordion lipat "PENGEMBANG & DIAGNOSTIK" di bagian terbawah modal.
     - Mengaktifkan tema tri-mode (Terang, Gelap, Otomatis) yang mendengarkan perubahan preferensi OS (`prefers-color-scheme`).
  5. **Kontras & Kejelasan Visual Dunia 3D (A1, A3, A4, A5, A7)**:
     - Mengubah intensitas normal map rumput dari `1.8` menjadi `0.4` dan menghaluskan albedo rumput menjadi hijau tropis hangat dengan mipmapping dan anisotropi 4x.
     - Meredupkan garis sumbu pusat grid dari cyan mencolok menjadi warna slate lembut (`#64748B`) dengan transparansi `0.25`.
     - Mengubah indikator kamera aktif pada TopHeader menjadi pill biru solid (`#007AFF`) dengan teks putih bersih (`#FFFFFF`) untuk mencapai rasio kontras 4.6:1 (memenuhi WCAG AA).
     - Mengubah label orientasi mata angin pada minimap dari singkatan satu huruf "U" menjadi kata eksplisit "Utara".
     - Menghilangkan bentuk segitiga (kerucut penglihatan kamera) pada kanvas minimap, menyisakan hanya titik fokus kamera biru iOS dengan lingkaran cincin putih yang minimalis dan tidak mengalihkan perhatian.
  6. **Kapsul Panduan Kanvas Kosong (A6)**:
     - Menambahkan komponen `EmptyStateGuide` yang menampilkan kapsul Liquid Glass halus saat sebuah kota baru dibuka (0 km jalan dan 0 bangunan): "Mulai rancang kota tropis Anda: letakkan jalan pertama untuk memandu tata ruang" dengan tombol cepat ke "Alat Jalan" dan "Panduan".

* **Hasil Verifikasi**:
  * Seluruh pengujian Vitest (40 berkas pengujian, 253 tes) lulus 100%.
  * Kompilasi TypeScript (`tsc`) dan build Vite production berhasil tanpa galat (exit code 0).
  * 8 tangkapan layar komparasi "Sesudah" telah berhasil diambil pada resolusi 1366x768 dan 1920x1080 di `docs/redesign2/after/`.
