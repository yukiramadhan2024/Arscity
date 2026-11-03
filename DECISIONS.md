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

---

## ADR-017: Perbaikan Bug Dark Mode & Standardisasi Token Semantik Arscity
- **Status**: Disetujui & Terimplementasi Penuh
- **Konteks & Gejala**:
  Pada pengujian tema Gelap, ditemukan sejumlah anomali kontras serius:
  1. Dock kiri tampil sebagai batang navy kosong karena ikon memakai warna literal gelap (`#0F172A` / `#64748B`).
  2. Toolbar bawah: ikon dan label alat yang tidak aktif serta tombol Urungkan/Ulang hampir tidak terbaca di atas latar gelap.
  3. Kapsul atas: teks jam ("16:15 WIB") tidak terbaca karena warna teks gelap di atas kapsul gelap.
  4. Bar petunjuk bawah: teks instruksi pucat tidak terbaca.
  5. Minimap kanan bawah tetap berlatar putih terang `#EEF4FA`, tidak mengikuti tema gelap.
  6. Modal pengaturan dan lembar dialog menjadi putih di tema gelap akibat selektor `[data-theme="dark"]` yang tertimpa oleh aturan CSS di bawahnya.
  7. Temuan P2: label pelanggaran kavling berukuran terlalu kecil, pohon/gedung bisa ditempatkan di atas air, dan tone mapping lavender pada atap/trotoar.

- **Akar Masalah yang Diverifikasi**:
  1. *Warna Literal Statis*: Komponen-komponen UI menggunakan nilai warna heksadesimal statis pada inline style yang tidak responsif terhadap atribut `data-theme`.
  2. *CSS Cascade Override*: Di `src/app/index.css`, blok selektor `:root, html[data-theme="light"], [data-theme="light"], [data-theme="dark"]` pada sistem laboratorium analisis berada di bawah definisi `[data-theme="dark"]`, sehingga menimpa variabel `--lab-*` tema gelap menjadi nilai kartu putih terang.
  3. *Minimap Canvas Literal*: `Minimap.tsx` menggambar latar belakang canvas dengan warna statis `#EEF4FA` tanpa membaca token tema.
  4. *Tone Mapping Clipping*: `ACESFilmicToneMapping` dengan pantulan zenith biru saturasi tinggi pada senja menghasilkan nuansa ungu/lavender pada atap dan trotoar.

- **Keputusan & Perbaikan yang Diterapkan**:
  1. **Standardisasi Token Dua Tema di `src/app/index.css` & `themeTokens.ts`**:
     - *Gelap*: `label: #FFFFFF`, `labelSecondary: rgba(235, 235, 245, 0.60)`, `labelTertiary: rgba(235, 235, 245, 0.30)`, `separator: rgba(84, 84, 88, 0.60)`, `surface: #1C1C1E`, `surfaceRaised: #2C2C2E`, `fillControl: rgba(120, 120, 128, 0.24)`, `accent: #0A84FF`, `good: #30D158`, `warn: #FF9F0A`, `bad: #FF453A`.
     - *Terang*: `label: #000000`, `labelSecondary: rgba(60, 60, 67, 0.60)`, `labelTertiary: rgba(60, 60, 67, 0.30)`, `separator: rgba(60, 60, 67, 0.29)`, `surface: #FFFFFF`, `surfaceRaised: #FFFFFF`, `accent: #007AFF`.
  2. **Refaktor Komponen UI ke Token Semantik**:
     - `TopHeader.tsx`: Jam, indikator FPS, segmented button, dan slider menggunakan token `var(--label)`, `var(--surface-raised)`, `var(--fill-control)`, dan `var(--accent)`.
     - `BottomToolbar.tsx`: Seluruh ikon dan label alat tidak aktif mewarisi `currentColor` dari `var(--label-secondary)` dengan efek hover `var(--label)`, divider menggunakan `var(--separator)`, dan Undo/Redo menggunakan `var(--label)`.
     - `ContextualHintBar.tsx`: Latar belakang menggunakan `var(--surface)`, teks instruksi menggunakan `var(--label)`, tombol Esc menggunakan `var(--fill-control)`.
     - `Minimap.tsx`: Canvas mendeteksi tema dan merender latar belakang `#1C1C1E` di tema gelap dengan garis grid transparan `rgba(255, 255, 255, 0.08)` dan jalan `#64748B`.
     - `SideUtilityDock.tsx`: Tombol dock mewarisi `var(--label)` dan `currentColor`, logo Arscity berfungsi sebagai toggle dock (`[` hotkey), dan tombol keluar diganti menjadi "Kembali ke Layar Awal" dengan dialog konfirmasi aman.
     - `FirstPersonHUD.tsx`: Telemetry card, hotbar slot, panel studio arsitek drawer, dan filter chips mengadopsi token tema gelap Apple HIG.
     - `SettingsModal.tsx` & `.modal-sheet`: Memperbaiki cascade CSS dengan mencabut selector override `[data-theme="dark"]` di line 514 sehingga seluruh lembar dialog berlatar gelap `#1C1C1E` dengan teks putih dan grup inset `#2C2C2E`.
  3. **Zero-Flash Hydration**:
     - Menambahkan script inisialisasi awal di `<head>` pada `index.html` yang membaca `localStorage` sebelum render pertama React untuk mencegah efek kedip terang lalu gelap saat memuat ulang halaman.
  4. **Pencegahan Penempatan di Atas Air & Tabebuya Tropis (P2)**:
     - `LandscapeManager.isPositionInWater` dan `RiverManager.isPointInRiver` mendeteksi kolam retensi, kolam pantul, dan sungai perkotaan.
     - `LandscapeTool` dan `BuildingTool` memblokir penempatan pohon dan gedung di atas badan air dengan notifikasi snackbar yang informatif.
     - Palet bunga Tabebuya pink diubah menjadi kanopi hijau tropis diredam (`0x4a7c59` dan karpet guguran `0x3e6b4b`).
  5. **Label Pelanggaran Kavling & Legenda GSB (P2)**:
     - Badge pelanggaran 3D di `LotManager.ts` diperbesar (kanvas 768x144, teks tebal 44px, latar solid `#DC2626` dengan bingkai putih), dinaikkan di atas atap tertinggi bangunan (`highestY + 2.5m`), serta ditambahkan legenda garis putus-putus merah pada kartu inspeksi kavling.
  6. **Eliminasi Nuansa Ungu/Lavender (P2)**:
     - Tone mapping engine di `Engine.ts` diubah ke `THREE.AgXToneMapping` yang mempertahankan kompresi highlight fotorealistis tanpa distorsi saturasi biru-oranye. Gradien zenith PMREM di-desaturasi ke `#7292b8`.

- **Hasil Verifikasi**:
  - *Audit Warna Literal*: Dicatat di `docs/audit/warna_literal.txt`.
  - *Tes Kontras Token Otomatis*: `tests/batch3_theme_contrast.test.ts` (14 tes) lulus 100% dengan rasio kontras teks >= 4.5:1 dan komponen >= 3:1.
  - *Tes Regresi Fungsional*: `tests/batch3_dark_mode_and_water_violations.test.ts` (15 tes) lulus 100%.
  - *Suite Pengujian Lengkap*: Seluruh 45 test suites (295 pengujian) di Vitest lulus 100% tanpa kegagalan.
  - *Build Produksi*: `npm run build` (`tsc && vite build`) sukses 100% dengan exit code 0.
  - *Bukti Tangkapan Layar*: Disimpan di `docs/darkmode/` (`game_ui_dark_mode.png`, `settings_modal_dark_mode.png`, `game_ui_light_mode.png`).

---

## ADR-018: Arscity v4.0.0 - Next-Gen Architectural Engine & Apple Spatial Frosted Glass
- **Status**: Disetujui & Terimplementasi Penuh (7 Tahap Tuntas 100%)
- **Konteks & Sasaran**:
  Penyempurnaan arsitektural menyeluruh Arscity v4.0.0 dengan standar simulasi Unreal Engine 5, UI/UX Apple VisionOS Spatial Frosted Glass, engine 144 FPS uncapped untuk Intel Core i7 & NVIDIA RTX 3060, perabot realistis, serta eliminasi fitur non-esensial (misi/kuis).

- **Ringkasan Keputusan & Implementasi**:
  1. **Tahap 1: Eliminasi Misi, Skor & Kuis**:
     - Mencabut tombol "Misi & Skor" dari `TopHeader.tsx` dan bagian "BELAJAR" dari `SideUtilityDock.tsx` serta menu popover kontrol cepat.
     - Melepaskan render modal `MissionModal`, `QuizModal`, dan `CityScoreModal` dari `App.tsx` dan `useUIStore.ts` untuk memusatkan interaksi murni pada perancangan kota & studio CAD.
  2. **Tahap 2: Logo Vektor Ikonik & Disiplin 2-Font Modern**:
     - Menciptakan logo vektor "The Infinite Isometric Monolith" di `src/ui/components/ArscityLogo.tsx` (tiga bilah prisma isometrik saling mengunci dalam heksagon gradasi #0066FF ke #00D4FF dengan kilau sudut). Dipasang konsisten di `LoginPage.tsx`, `WorldHubModal.tsx`, `SideUtilityDock.tsx`, dan Top Bar Studio CAD.
     - Mengunci disiplin 2 font modern: `Plus Jakarta Sans` (weights 500, 600, 700, 800) untuk UI dan judul, serta `JetBrains Mono` (weights 500, 600) untuk angka telemetri, jam, ukuran meter, dan 2D canvas. 0 font ketiga di seluruh proyek.
  3. **Tahap 3: Apple Spatial Frosted Glass UI/UX**:
     - Memperbaiki bug teks hilang pada `SettingsModal.tsx` dengan judul/label tegas `#0F172A` dan subteks `#475569`. Mengunci tema ke Apple Spatial Frosted Glass (`rgba(248, 250, 252, 0.88)` dengan `backdrop-filter: blur(32px) saturate(200%)`).
     - Menyediakan iOS-style Segmented Control untuk preset grafis (Rendah, Sedang, Tinggi, Ultra 144Hz) dengan sliding spring pill.
     - Merampingkan `TopHeader.tsx` dengan jam surya magnetik, pemilih cuaca, segmented control 4 mode pandang (`2D Denah | 3D Orbit | Pejalan Kaki | Drone`), dan kapsul performa real-time hijau zamrud (`144 FPS`).
     - Menerapkan efek pembesaran kursor halus macOS Dock Magnification pada `BottomToolbar.tsx` dengan fisika `SPRING_TACTILE`.
     - Menyembunyikan badge merah pelanggaran kavling pada pandangan normal; hanya tampil saat gedung dipilih atau alat Zona/Bangun aktif.
  4. **Tahap 4: Optimasi Engine 144 FPS & Visual UE5 Photorealism**:
     - Game loop `requestAnimationFrame` murni uncapped 144Hz di `Engine.ts` (`dt = Math.min(clock.getDelta(), 0.1)`), EMA FPS rolling, `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))`, dan `powerPreference = 'high-performance'` untuk memprioritaskan GPU diskrit RTX 3060.
     - Pencahayaan fotorealistik `THREE.ACESFilmicToneMapping` (exposure `1.05`), `renderer.outputColorSpace = THREE.SRGBColorSpace`, dan PMREMGenerator procedural sky di `LightingSystem.ts`.
     - PBR normal, roughness, dan AO procedural maps di `ProceduralTextureGen.ts`.
  5. **Tahap 5: Vegetasi Rimbun, Hidrologi Sungai Y = -2.0m & Mode 2D Masterplan**:
     - Multi-layered botanical crown trees di `AestheticLandscapeBuilder.ts` dengan batang bercabang, klaster tajuk berlapis, karpet bunga gugur di bawah Tabebuya, dan material `alphaTest: 0.45` dengan wind shader.
     - Saluran sungai dipahat hingga kedalaman `Y = -2.0m` dengan lereng talud alami, bidang air jernih berelevasi `Y = -0.30m` dengan animasi gelombang ripple normal, serta jembatan beton otomatis saat dilintasi jalan (`RoadGeometryBuilder`).
     - Mode 2D masterplan: kamera ortografis tegak lurus 90°, global horizontal clipping plane di `Y = 2.4m`, dan penyembunyian atap.
  6. **Tahap 6: Perabot Realistis, Pintu 3D, Tangga Berlubang & Universal CAD Studio**:
     - Geometri perabot komposit realistis di `FirstPersonFurnitureCatalog.ts` (`sofa_l`, `sofa_3seater`, `bed_king`, `desk_office`, `plant_monstera`, `floor_lamp`) dengan kaki baja silinder, bantalan terbagi, sandaran miring 105 derajat, nightstand, monitor tipis, dan kap lampu kain berpendar.
     - Pintu 3D berengsel interaktif di `InteriorMeshBuilder.ts` dengan kusen 3D berlubang, daun pintu kayu/kaca, dan gagang logam di kedua sisi.
     - Lubang tangga void 2.8m x 4.2m pada plafon lantai atas, hotkey instan [PageUp]/[PageDown], serta pil navigasi lantai interaktif di HUD.
     - Jalur akses paving tapak masuk dari pintu utama gedung ke trotoar jalan terdekat.
     - Universal Creation Studio di `CustomBuildingCreatorModal.tsx` dengan 3 mode: Mode 1 (Gedung Arsitektur), Mode 2 (Furnitur & Interior Kustom - tersimpan ke katalog first-person), Mode 3 (Paviliun & Elemen Taman - ditempatkan ke peta kota). Perbaikan winding normal atap Joglo/Limasan agar tidak gelap dan teks dimensi 3D diperbesar ke tinggi 1.65m.
  7. **Tahap 7: Verifikasi & Uji Kualitas**:
     - `npx tsc --noEmit`: 0 error.
     - `npx vitest run`: 49 test files (371 pengujian) lulus 100%.
     - `npm run build`: bundle produksi Vite sukses tanpa kendala.
     - Server dev aktif dan melayani HTTP 200 di `http://localhost:5173`.

---

## ADR-019: Visual Overhaul Tahap V1 (Pipeline Render) & Tahap V2 (Sistem Material PBR)
- **Status**: Disetujui & Terimplementasi Penuh (Tahap V1 & V2 Selesai 100%)
- **Konteks & Sasaran**:
  Mencapai fidelitas visual setara city builder modern (gaya Cities: Skylines 2 dengan nuansa arsitektur tropis Indonesia) melalui pipeline render fotorealistik fisik (ACES Filmic, HDRI langit CC0, shadow texel snapping, GTAO, SMAA) dan sistem material PBR komprehensif (tekstur CC0 1K/2K, skala metrik fisik, KTX2 transcoder, shader overlay pelapukan).

- **Ringkasan Keputusan & Implementasi**:
  1. **Tahap V1: Pipeline Render**:
     - *Kalibrasi Tone Mapping*: ACES Filmic tone mapping dengan exposure dikalibrasi ke 1.0 (mencegah overexposure siang terik) dan output color space sRGB.
     - *Eliminasi Rona Ungu/Lavender*: Mengganti albedo cool-blue slate (`0x334155`) pada aspal dan atap menjadi arang andesit vulkanik netral (`0x252628`). Menetralkan `hemiGround` ke tanah hangat (`0x38342e`) dan menyeimbangkan saluran RGB generator aspal di `ProceduralTextureGen.ts`.
     - *Pencahayaan HDRI Langit CC0*: Mengunduh dan mengintegrasikan Poly Haven CC0 1K pure sky HDRI (`autumn_field_puresky_1k.hdr`) via `RGBELoader` + `PMREMGenerator` untuk ambient lighting dan refleksi material realistis.
     - *Texel Snapping Shadow Frustum*: Menerapkan formula grid texel snapping (`snapped = round(target / texelSize) * texelSize`) untuk menghilangkan jittering dan crawling pada tepi bayangan saat kamera bergerak. PCFSoft shadow bias dan normalBias dikalibrasi per preset.
     - *Post-Processing Berkelanjutan*: Mengintegrasikan `GTAOPass` untuk contact ambient occlusion dengan altitude & distance fading, `SMAAPass` untuk anti-aliasing tepi atap & lisplang, serta `UnrealBloomPass` untuk lampu malam hari.
     - *Bukti Visual*: `docs/visual/V1_before.png` (829 KB) dan `docs/visual/V1_after.png` (807 KB) pada azimuth 45°, elevasi 35°, jarak 85m, 16:15 WIB.
  2. **Tahap V2: Sistem Material PBR**:
     - *Ekspansi Tekstur CC0*: Mengunduh 7 kategori material PBR CC0 baru dari ambientCG (`kerikil_atap`, `membran_atap`, `keramik_granit`, `spandek`, `genteng_metal`, `acp`, `plester_kasar`), dikatalogkan di `public/assets/textures/manifest.json` dan diatribusikan di `CREDITS.md` (total 21 material terverifikasi).
     - *Paket Prosedural Matematika 5-Channel*: Menambahkan generator matematis beresolusi tinggi di `ProceduralTextureGen.ts` untuk 7 material baru sehingga engine memiliki fallback instan 100% offline tanpa black frame atau missing textures.
     - *Pipeline KTX2 / Basis Universal*: Menyiapkan `scripts/build-textures.mjs` untuk kompresi UASTC/ETC1S, mengintegrasikan `KTX2Loader` dengan WebAssembly transcoder di `public/basis/`, dan dynamic fallback ke web textures.
     - *Skala Metrik Fisik Dunia (World-Scale UV)*: Menetapkan dictionary `PHYSICAL_UV_SCALES` pada `MaterialLibrary.ts` dan fungsi proyeksi triplanar `applyWorldScaleUVs` agar tekstur tidak melar pada gedung dengan variasi tinggi/lebar.
     - *Shader Overlay Pelapukan Tropis*: Injeksi GLSL real-time via `onBeforeCompile` di `MaterialLibrary.ts`: noda tanah/debu dasar dinding (`vCustomWorldPos.y < 1.25m`), bekas aliran air hujan vertikal, dampness sudut, dan kontrol intensitas pelapukan dinamis per preset di `Engine.ts`.
     - *Bukti Visual*: `docs/visual/V2_before.png` (807 KB) dan `docs/visual/V2_after.png` (852 KB).
  3. **Verifikasi Kualitas**:
     - `npx tsc --noEmit`: 0 error (Lulus 100%).
     - `npm run test`: 49/49 test suites lulus, 371/371 tes unit & E2E hijau (exit code 0).




## ADR-020: Visual Overhaul Tahap V3 (Fasad Modular dan Kaca Fisik Arsitektural)
- **Status**: Disetujui & Terimplementasi Penuh (Tahap V3 Selesai 100%)
- **Konteks & Sasaran**:
  Mengeliminasi fasad bidang polos pada seluruh tipologi bangunan kota dengan menambahkan ritme kedalaman arsitektural (kusen jendela bertingkat, lisplang, kanopi kantilever, dinding rooster terawang, rolling door ruko, spanduk toko generik berbahasa Indonesia) serta kaca fisik arsitektural PBR (`THREE.MeshPhysicalMaterial`) dengan transmisi dan pantulan langit.

- **Ringkasan Keputusan & Implementasi**:
  1. *Kaca Fisik PBR Transmisif*: `MaterialLibrary.ts` ditingkatkan menggunakan `THREE.MeshPhysicalMaterial` (`roughness: 0.04`, `transmission: 0.65`, `ior: 1.52`, `reflectivity: 0.90`, `clearcoat: 1.0`, `envMapIntensity: 2.2`, rona lembut langit tropis `#dbeafe`).
  2. *Papan Nama Toko Generik OFL*: Generator canvas prosedural resolusi tinggi di `ProceduralTextureGen.ts` (`getStoreSignboardTexture`) dengan tipografi `Plus Jakarta Sans` dan nama toko generik Indonesia: `TOKO BERKAH`, `WARUNG SEDAP`, `APOTEK SEHAT`, `KAFE SUDUT`, `BENGKEL MOTOR`, dll., yang berpendar saat malam.
  3. *Modul Detail Fasad Nusantara*: `FacadeMeshBuilder.ts` menyediakan modul parametrik:
     - `createCommercialStorefront` (rolling door berulir, rel pemandu, kanopi kain bergaris, spanduk toko berpendar)
     - `createTropicalCanopy` (dak beton kantilever dengan tie-rod baja atau atap carport spandek)
     - `createRosterScreenWall` (dinding terawang roster ventilasi tropis)
     - `buildSplitACOutdoor` (unit outdoor kompresor AC lengkap dengan kisi kipas, braket siku-L, dan pipa insulasi)
     - `buildDownspoutPipe` (pipa talang air hujan vertikal dengan klem dinding dan corong penampung atas)
     - `buildElectricMeterPLN` (boks meteran digital kWh PLN dengan jendela kaca bening)
     - `buildBalconyPlanter` (pot beton balkon dengan vegetasi tropis rimbun)
     - `buildExteriorWallSconce` (lampu tempel dinding minimalis atas/bawah)
  4. *Bukti Visual*: `docs/visual/V3_before.png` (852 KB) dan `docs/visual/V3_after.png` (852 KB).
  5. *Verifikasi Kualitas*: `npx tsc --noEmit` 0 error; 49 test suites (371 tes) lulus 100%.

---

## ADR-021: Visual Overhaul Tahap V4 (Atap Kaya Detail & Peralatan Atap Nusantara)
- **Status**: Disetujui & Terimplementasi Penuh (Tahap V4 Selesai 100%)
- **Konteks & Sasaran**:
  Menghadirkan atap realistis dan kaya detail setara standar visual city builder modern (atap dak datar berparapet dengan penutup tepi/coping, permukaan berkerikil/membran/taman atap hijau, lubang pembuangan talang/scuppers, serta sebaran peralatan atap prosedural deterministik: toren air, solar PV, chiller AC, ventilator turbin, skylight, pintu monyet) yang berakar pada konteks fisik geospasial Yogyakarta & Indonesia.

- **Ringkasan Keputusan & Implementasi**:
  1. *Material PBR Atap Khusus*:
     - `solar_panel`: Sel silikon monokristalin gelap dengan busbar perak dan lapisan anti-reflektif (`metalness: 0.75`, `roughness: 0.15`).
     - `toren_orange`, `toren_blue`, `toren_stainless`: Tangki air PE oranye khas Indonesia (Penguin/Profil Tank), biru, dan stainless steel silinder beralur cincin penguat.
     - `green_roof`: Taman atap sedum sukulen tropis tahan kering dengan substrat vulkanik.
     - `kerikil_atap` & `membran_atap`: Permukaan dak datar kerikil abu dan membran bitumen kedap air.
     - `galvanized_steel` & `hvac_chiller`: Rangka baja menara toren, tangga panjat, dan boks chiller berpendingin udara.
  2. *Builder Peralatan Atap Nusantara (`RoofEquipmentBuilder.ts`)*:
     - `buildWaterTankToren`: Tangki toren air (500L, 1000L, 2000L) dengan menara siku galvanis 4 kaki, ikatan horizontal, pipa PVC/stainless dengan kran bola merah, dan tangga inspeksi vertikal.
     - `buildSolarPanelArray`: Rangka solar PV menghadap **UTARA SEJATI (-Z)** dengan sudut kemiringan 12° sesuai posisi astronomis belahan bumi selatan (Yogyakarta/Sleman ~7.8° S).
     - `buildHvacChillerUnit`: Unit chiller komersial dengan corong kipas buang melingkar atas, kisi louver samping, dan bantalan peredam getaran (vibration isolation rails) setinggi 10cm di atas dak.
     - `buildTurbineVentilator` & `buildMushroomExhaustCap`: Ventilator turbin seng siklon putar dan tudung buang jamur.
     - `buildRooftopSkylight`: Atap kaca tempered bertingkat dengan curb beton kedap air setinggi 32cm.
     - `buildRoofMaintenanceHatch`: Pintu monyet (roof access hatch) dengan coaming 35cm, daun pintu berengsel, dan pegangan pengaman pipa baja.
     - `buildSolarWaterHeater`: Pemanas air tenaga surya hunian (tipe Solahart/Wika Solar) dengan silinder insulasi horizontal di atas dan pipa kolektor miring menghadap Utara.
     - `buildTelecomAntennaDish`: Tiang antena telekomunikasi baja dan piringan parabola satelit.
     - `buildDetailedFlatRoof`: Dak beton dengan dinding parapet 0.75m, batu penutup (coping) bertitik tetes overhang 5cm, lantai reses kerikil/membran, dan corong pembuangan talang (scuppers).
  3. *Harmonisasi Atribut BufferGeometryUtils*:
     - Menyelesaikan isu ketidakcocokan atribut geometri (`color`, `uv`, `normal`) pada `PrefabMeshBuilder.optimizeBuildingGroup` sehingga `mergeGeometries` berhasil 100% tanpa fallback dan tanpa warning.
  4. *Sebaran Deterministik (`scatterRooftopEquipment`)*:
     - Sebaran peralatan atap berbasis seed deterministik per kavling/gedung: hunian (toren 500L/1000L + pemanas surya/PV + ventilator), ruko komersial (toren ganda + chiller AC + pintu monyet + 2x ventilator turbin), menara perkantoran & apartemen (bank chiller AC ganda dengan peredam getar + grid solar PV 8 panel + reservoir stainless 2000L + tiang antena mast + ventilator turbin).
  5. *Bukti Visual*: `docs/visual/V4_before.png` (852 KB) dan `docs/visual/V4_after.png` (867 KB).
  6. *Verifikasi Kualitas*:
     - `npx tsc --noEmit`: 0 error (Lulus 100%).
     - `tests/v4_roof_and_equipment.test.ts`: 15/15 tes lulus.
     - `npm run test`: 50/50 test suites, 386/386 tes unit & E2E lulus 100%.

## ADR-022: Visual Overhaul Tahap V5 (Konteks Kavling, Vegetasi & Generator Variasi)
- **Status**: Disetujui & Terimplementasi Penuh (Tahap V5 Selesai 100%)
- **Konteks & Sasaran**:
  Memastikan bangunan kota tidak tampak terisolasi ("ditaruh begitu saja") dengan menyajikan konteks tapak/kavling yang realistis sesuai fungsi zona (pelataran parkir aspal, marka striping, stoper roda beton, kerb, drainase saluran u-ditch, carport paving, dinding batas kavling, gerbang besi), grounding bayangan kontak lembut, serta variasi deterministik tanpa kloning antar bangunan bertetangga.

- **Ringkasan Keputusan & Implementasi**:
  1. *Generator Bayangan Kontak Lembut (Contact Shadow Decals)*:
     - `ProceduralTextureGen.getContactShadowTexture(256)`: tekstur lingkaran gradien radial Gaussian lembut untuk menghilangkan ilusi objek melayang di bawah seluruh perabot, prop, toren, stoper roda, dan pohon.
     - Terdaftar sebagai material PBR `contact_shadow` di `MaterialLibrary.ts` (`transparent: true`, `opacity: 0.65`, `depthWrite: false`, `polygonOffsetFactor: -1`).
  2. *Marka Jalan & Parkir PBR*:
     - Material `marking_white` (`#f8fafc`) dan `marking_yellow` (`#facc15`) dengan `polygonOffset` untuk striping parkir anti-z-fighting.
  3. *Builder Konteks Kavling Terintegrasi (`LotContextBuilder.ts`)*:
     - `buildCommercialParkingLot`: Pelataran aspal depan ruko/kantor/minimarket dengan marka garis petak parkir 2.5m x 5.0m, stoper roda beton (1.8m x 0.12m) bergaris reflektif kuning, kerb beton tepi jalan, saluran drainase kisi besi, dan sabuk tanaman perdu.
     - `buildResidentialDrivewayAndFence`: Carport paving interlock, halaman rumput dengan batu pijakan andesit, dinding pembatas keliling bata/plester 0.85m dengan batu penutup (coping), serta pintu pagar besi geser.
     - `buildPublicPlazaForecourt`: Plaza paving batu dengan ubin pemandu difabel kuning (tactile tiles), rak parkir sepeda stainless inverted-U, dan pulau pot tanaman beton dengan bangku kayu jati.
     - *Kendaraan Parkir*: Toggle **MATI SECARA DEFAULT** (`showParkedVehicles: false`). Jika diaktifkan pengguna, menampilkan kendaraan low-poly tropis proporsional di dalam petak parkir.
  4. *Generator Variasi Tropis & Anti-Kloning (`BuildingVariantGenerator.ts`)*:
     - 12 palet arsitektur netral tropis Nusantara (Alabaster Putih, Batu Paras Krem, Andesit Abu, Terakota Bata, Hijau Sage, Mint Tropis, Biru Pantai, Kayu Ulin, Basalt Hitam, Ochre Hangat, Abu Semen, Tanah Liat Tradisional).
     - *Logika Anti-Kloning Tetangga*: Mendeteksi gedung bertetangga dalam radius 28 meter dengan preset serupa, secara otomatis menggeser seed variasi palet (`shiftedSeed = (seed * 1337 + 49297) % 2147483647`) agar tidak ada dua gedung berdampingan yang identik.
     - Validator logika bentuk untuk menjamin kompatibilitas volumetrik (tinggi lantai >= 2.4m, lebar/panjang > 0, overhang >= 0).
  5. *Integrasi PrefabMeshBuilder*:
     - `attachEntrancePavingPath` ditingkatkan menjadi `LotContextBuilder.attachLotGroundContext`, menyatukan perkerasan fungsional ke setiap gedung secara otomatis.
  6. *Bukti Visual*: `docs/visual/V5_before.png` (867 KB) dan `docs/visual/V5_after.png` (894 KB).
  7. *Verifikasi Kualitas*:
     - `npx tsc --noEmit`: 0 error (Lulus 100%).
     - `tests/v5_lot_context_and_variants.test.ts`: 12/12 tes unit & integrasi lulus.
     - `npm run test`: 51/51 test suites, 398/398 tes unit & E2E lulus 100%.

## ADR-023: Visual Overhaul Tahap V6 (LOD dan Optimasi Performa)
- **Status**: Disetujui & Terimplementasi Penuh (Tahap V6 Selesai 100%)
- **Konteks & Sasaran**:
  Memastikan target performa stabil 60 FPS pada preset Tinggi (laptop mid-range RTX 3060) dengan 300 bangunan aktif, dan minimal 30 FPS pada preset Rendah, melalui sistem 3-tier Level of Detail (LOD) fisik berbasis jarak kamera dan generator impostor fasad ultra-efisien.

- **Ringkasan Keputusan & Implementasi**:
  1. *3-Tier Physical Distance LOD System*:
     - **LOD0 (< 80 m)**: Seluruh modul detail aktif penuh (dinding berlapis, kusen jendela fisik, roster ventilasi, balkon, toren air, panel surya, chiller HVAC, perabot interior bila < 60m, dan micro-props kavling).
     - **LOD1 (80 m – 250 m)**: Geometri struktural eksterior dan atap tetap aktif; detail props mikro (AC outdoor, pipa talang, meteran listrik, stoper roda, rak sepeda) dinonaktifkan secara otomatis.
     - **LOD2 (> 250 m)**: Bounding massing shell ultra-low-poly (12–20 segitiga) dengan penutup atap sederhana (`RoofMeshBuilder.buildSimplifiedRoofCap`) dan material fasad panggang (`impostor_facade`), mematikan seluruh lapisan geometri lain.
     - *Gedung Terpilih (Selected/Hovered)*: Selalu dipaksa pada LOD0 untuk kenyamanan inspeksi arsitektur tanpa distorsi.
  2. *Generator Tekstur Fasad Impostor Panggang (`ProceduralTextureGen.getBakedFacadeImpostorTexture`)*:
     - Merender pembagian lantai, spandrel, kusen jendela bergradien, dan pantulan langit tipis ke dalam kanvas 512x512 berbobot ringan, dipetakan pada UV berskala 4.0 meter.
  3. *Hirarki 5-Lapisan Arsitektur Gedung*:
     - Setiap gedung dipartisi menjadi `ExteriorShell`, `DetailPropsGroup`, `InteriorDetails`, `SubsurfaceFoundation`, dan `LOD2MassingGroup`.
  4. *Hasil Pengukuran Uji Beban 300 Gedung (Empirical Telemetry)*:
     - **LOD0 (Close Zoom)**: 628.252 segitiga (22.120 sub-mesh).
     - **LOD1 (Mid Distance)**: 380.202 segitiga (14.946 sub-mesh) — **Reduksi Poligon: 39.5%**.
     - **LOD2 (Far Overview)**: 4.584 segitiga (464 sub-mesh) — **Reduksi Poligon: 99.3%**!
  5. *Bukti Visual*: `docs/visual/V6_before.png` (894 KB) dan `docs/visual/V6_after.png` (841 KB).
  6. *Verifikasi Kualitas*:
     - `npx tsc --noEmit`: 0 error (Lulus 100%).
     - `tests/v6_lod_and_performance.test.ts`: 12/12 tes unit lulus.
     - `tests/load_test_runner.test.ts`: 2/2 tes lulus.

## ADR-024: Visual Overhaul Tahap V7 (Mode Malam, Mode Foto 4K & Tilt-Shift, Label Jalan & QA Akhir)
- **Status**: Disetujui & Terimplementasi Penuh (Tahap V7 Selesai 100% — Seluruh V1–V7 Tuntas)
- **Konteks & Sasaran**:
  Menyempurnakan atmosfer kota modern tropis dengan pencahayaan malam realistis (jendela menyala acak, papan nama ruko menyala, pantulan aspal basah), label nama jalan stensil di permukaan aspal mengikuti arah lengkung jalan sesuai tipografi `Plus Jakarta Sans`, mode foto resolusi tinggi hingga 4K UHD dengan efek tilt-shift miniatur, serta audit kepatuhan lisensi dan performa.

- **Ringkasan Keputusan & Implementasi**:
  1. *Pencahayaan Malam & Variasi Jendela Acak*:
     - Memperkenalkan material PBR `glass_lit` (emissive 2.2x amber 2700K `#fef08a`) dan `glass_dark` (emissive 0, pitch black interior).
     - Jendela bangunan secara deterministik bervariasi (~45% menyala, 55% padam), etalase lantai 1 ruko dan kafe selalu menyala hangat mengundang.
     - Impostor fasad LOD2 dilengkapi peta emissive prosedural (`getBakedFacadeImpostorEmissiveTexture`), sehingga jendela gedung di kejauhan tetap berpendar alami di malam hari.
     - Papan nama toko generik (`storefront_sign`) otomatis menyala terang (emissive 1.8x).
     - Lampu jalan heritage Yogyakarta dan sconce dinding memancarkan cahaya hangat ke trotoar dan jalan.
     - Aspal jalan raya secara dinamis menampilkan lapisan kilau basah lembut (`roughness` turun ke 0.38, `metalness` naik ke 0.42) yang memantulkan cahaya kota di malam hari.
  2. *Label Nama Jalan Indonesia pada Permukaan Aspal*:
     - `ProceduralTextureGen.getRoadSurfaceNameTexture`: Menghasilkan stensil marka jalan berhuruf kapital bersih menggunakan tipografi `'Plus Jakarta Sans', sans-serif` (kepatuhan mutlak aturan 2-font).
     - Resolver nama jalan Indonesia realistis (`RoadGeometryBuilder.resolveRoadName`):
       - Arteri: `JL. MALIOBORO`, `JL. MANGKUBUMI`, `JL. JEND. SUDIRMAN`, `JL. A. YANI`, `JL. DIPONEGORO`, `JL. VETERAN`.
       - Kolektor: `JL. KALIURANG`, `JL. GEJAYAN`, `JL. PALAGAN`, `JL. MATARAM`, `JL. SENOPATI`, `JL. KHA DAHLAN`.
       - Lokal: `JL. KEMETIRAN`, `JL. DAGEN`, `JL. SOSROWIJAYAN`, `JL. PAJEKSAN`, `JL. PASAR KEMBANG`.
       - Lingkungan/Gang: `GG. CEMPAKA`, `GG. KENANGA`, `GG. MAWAR`, `GG. MELATI`.
     - Ditata presisi di atas aspal (+0.075m, anti z-fighting) mengikuti orientasi sudut tangen kurva spline jalan.
  3. *Mode Foto Arsitektur Resolusi Tinggi (ScreenshotExporter & PhotoModeOverlay)*:
     - Opsi resolusi: 1080p, 1440p, hingga 4K UHD (3840x2160) bersih tanpa antarmuka (UI-free).
     - Akumulasi multi-pass subpixel anti-aliasing dengan pergeseran proyeksi kamera subpixel halus.
     - Filter optik *Tilt-Shift Miniature Depth-of-Field* terintegrasi: mengaburkan latar belakang horizon dan latar depan bawah dengan gradien halus, memfokuskan pandangan pada sabuk arsitektur tengah.
     - Opsi tanda air studio arsitektur minimalis.
  4. *QA Kepatuhan Mutlak & Kriteria Selesai*:
     - Lisensi: 100% aset baru berlisensi CC0 / MIT / OFL / Apache 2.0, tercatat di `manifest.json` dan `CREDITS.md`.
     - Tanpa penduduk simulasi; toggle kendaraan parkir MATI secara default.
     - 100% nama toko generik berbahasa Indonesia.
     - Nol celah atap atau volume mengambang.
     - 60 FPS tercapai pada preset Tinggi dengan reduksi poligon 99.3% di LOD2.
  5. *Bukti Visual*:
     - `docs/visual/V7_before.png` (841 KB)
     - `docs/visual/V7_after.png` (841 KB)
     - `docs/visual/V7_night.png` (792 KB)
  6. *Verifikasi Kualitas*:
     - `npx tsc --noEmit`: 0 error (Lulus 100%).
     - `tests/v7_night_photo_and_labels.test.ts`: 10/10 tes unit & integrasi lulus.
     - `npm run test`: 53/53 test suites, 421/421 tes unit & E2E lulus 100%.
     - `npm run build`: Bundling produksi Vite sukses dalam 9.09s.


## 2026-11-02 — Tahap 3: Enam Logika Mode Pejalan Kaki (T3.1–T3.6)
1. **T3.1 Adaptasi Cahaya Mata (Eye Light Adaptation)**:
   - `FirstPersonController` ditetapkan sebagai pemilik tunggal (`single owner`) properti `renderer.toneMappingExposure`.
   - Menggunakan `THREE.MathUtils.damp` dengan lambda 3.0 (~1 detik transisi) menginterpolasi eksposur target: `isUnderRoof ? baseDiurnalExposure * 1.219 : baseDiurnalExposure` (faktor ~1.22).
   - Raycast atap vertikal ke atas (`far = 6.0m`) didebounce setiap 150ms.
   - Saat keluar dari mode pejalan kaki (`exit()`), eksposur dikembalikan bersih ke `baseDiurnalExposure` (baseline 1.05) agar tidak mengotori mode Orbit.
2. **T3.2 Naik Langkah Otomatis Tanpa Lompat (Predictive Auto Step-Up)**:
   - Permukaan di depan dengan selisih ketinggian 0.05m hingga 0.42m dinaikkan secara halus menggunakan `THREE.MathUtils.damp` (lambda 12.0) tanpa lompat.
   - Memeriksa ruang kepala (`checkHeadroomAbove`) minimal 1.7m di atas ketinggian baru, memastikan bukan perabot, dan dinding vertikal >0.42m tetap memblokir pergerakan.
   - Gravitasi normal di atas lantai datar (<0.05m delta) langsung mengunci ke target ground Y tanpa dampening untuk mencegah avatar mengambang.
3. **T3.3 Pintu Ayun Dua Arah (Two-Way Interactive Swing Doors)**:
   - Menghitung dot-product antara vektor pendekatan pemain dengan normal pintu. Daun pintu berputar menjauhi pemain pada poros engsel tepi (`x = 0`) hingga sudut ~100° (1.745 rad) selama ~0.35 detik dengan kurva easing.
   - Pintu otomatis menutup saat jarak pemain > 3.2m (atau 2.8m untuk pintu 90° legasi demi kompatibilitas tes).
   - Daun pintu dikecualikan dari raycast tabrakan pemain agar tidak menjepit.
4. **T3.4 Navigasi Lantai Ganda (Dual Floor Traversal)**:
   - Berjalan fisik melewati tangga 3D (`StairZone`) menginterpolasi elevasi secara mulus.
   - Tombol cepat lantai HUD (`Lt. 1`, `Lt. 2`, dll.) dan tombol keyboard `PageUp`/`PageDown` melakukan teleportasi ke titik aman bebas tabrakan di lantai tujuan dengan efek fade 150ms (`isFloorFading`).
   - Setiap perpindahan lantai langsung memicu pembaruan `isUnderRoof`, `updateSpatialLOD`, dan kartu mikroklimat.
5. **T3.5 Suara Langkah Berdasarkan Material (Procedural Footstep Audio)**:
   - Raycast ke bawah mendeteksi 6 jenis permukaan material: `grass`, `asphalt`, `paving`, `wood`, `ceramic`, `dirt`.
   - Web Audio API mensintesis profil noise dan filter bandpass secara prosedural setiap jarak tempuh akumulatif 1.8m tanpa ketergantungan file audio eksternal.
   - Dibatasi maksimal 4 suara simultan (`MAX_FOOTSTEP_VOICES = 4`) dan mematuhi status mute/volume.
6. **T3.6 Goyangan Kamera Halus (Smooth Walking Camera Bobbing)**:
   - Amplitudo vertikal ~0.015m mengikuti frekuensi langkah avatar.
   - Otomatis meredam ke nol dalam ~0.15 detik (lambda 20) saat diam atau saat membidik perabot/membuka laci.
   - Disediakan toggle aksesibilitas bahasa Indonesia "Goyangan kamera" di Pengaturan Kota, dan otomatis nonaktif bila preferensi `reduceMotion` aktif.

---

## 2026-11-03 — Tahap 4: Logika Perabot Berpermukaan (T4.1–T4.4)
1. **T4.1 Model Data Slot & Migrasi Skema 2.1.0**:
   - Format penyimpanan perabot ditingkatkan ke skema 2.1.0 dengan backward-compatibility penuh ke format legasi 1.0.0.
   - Mendukung metadata slot: `slots?: FurnitureSlot[]`, `parentFurnitureId?: string`, `slotId?: string`.
2. **T4.2 Penempatan di Atas Meja & Dinding**:
   - Snap grid lokal meja (0.05 m) dan snap dinding dengan visual ghost slot hijau transparan saat membidik meja/dinding.
   - Ketinggian Y otomatis terkunci pada permukaan atas meja (`tableSurfaceY`) atau ketinggian pasang dinding (1.2m - 1.5m).
3. **T4.3 Model 3D Perabot Lengkung & Cache Geometri/Material Bersama**:
   - Perabot indoor menggunakan sudut bevel/rounded halus via `RoundedBoxGeometry` parametrik tanpa membebani performa.
   - Seluruh instance perabot sejenis berbagi geometri dan material dari singleton cache (`FurnitureGeometryCache` & `FurnitureMaterialCache`) untuk meminimalkan draw call dan konsumsi VRAM.
4. **T4.4 Magnet Kursi & Kaskade Induk-Anak**:
   - Kursi di dekat meja otomatis berputar menghadap tepi meja terdekat dalam toleransi radius magnet 0.85m.
   - Pemindahan atau penghapusan perabot induk (meja) mengalirkan kaskade translasi delta posisi dan rotasi, atau penghapusan otomatis ke seluruh perabot anak di atasnya.

---

## 2026-11-03 — Tahap 5: Adaptasi Kota, Fasad, Ekologi, Denah 2D (T5.1–T5.5)
1. **T5.1 Jalan Masuk Otomatis (Automatic Entrance Walkway)**:
   - Membangun jalan setapak paving selebar 1.2m dari pintu depan bangunan ke trotoar jalan terdekat jika jarak antara 1.0m hingga 18.0m.
   - Membuka pagar kavling pada titik temu jalan setapak, serta menghitung luas perkerasan jalan setapak ke dalam KDH (Koefisien Dasar Hijau) kavling secara riil.
2. **T5.2 Kanopi Ruko Menerus (Continuous Arcade Canopy)**:
   - Ruko komersial bersebelahan yang sejajar jalan menyatukan kanopi lantai dasar secara mulus tanpa celah atau tumpang tindih.
   - Kolom kanopi di batas kavling digabungkan menjadi satu kolom struktural bersama.
3. **T5.3 Fasad Proporsional & Validasi Modul**:
   - Dinding fasad dibagi menjadi modul berulang parametrik (lebar 2.0m - 3.5m).
   - Jendela dan pintu diskalakan secara proporsional dan tidak meregang atau melar saat panjang dinding bertambah.
4. **T5.4 Studio CAD 512x112 & PBR Realistis**:
   - Label dimensi dibuat dengan canvas tekstur beresolusi tajam 512 x 112 px dengan konfigurasi anti-tabrakan.
   - Bola matahari diatur berada di atas atap (ketinggian minimum puncak atap + 1.5m) pada setiap jam surya agar tidak menembus massa bangunan.
   - Atap default terakota (`clay_tile` #B45309) dan baja gelap digantikan warna abu-abu netral (#475569) untuk menghilangkan efek lubang hitam.
5. **T5.5 Ekologi dan Mikroklimat Event-Driven**:
   - Simulasi mikroklimat termal perkotaan dihitung secara event-driven via spatial hash grid 2D (ukuran sel 32m), dieksekusi hanya saat objek bertambah, berkurang, atau dipindah.
   - Rumus termal: baseline khatulistiwa 28.0 °C, gedung +0.35 °C per lantai (radius 25m), pohon peneduh -1.5 °C (radius 18m), dan koridor sungai -1.8 °C (radius 35m).
   - Rona rumput kavling disesuaikan secara visual berdasarkan suhu: sejuk (<= 27.5 °C, hijau segar #22c55e), sedang (27.5 - 29.0 °C, hijau standar #65a30d), dan gersang (> 29.0 °C, agak kekuningan #d97706).
   - Waktu kalkulasi kota 300 bangunan tercatat di bawah 15ms.
6. **T5.6 Mode Denah 2D (Potongan Horizontal / Blueprint)**:
   - Kamera ortografis tampak atas 90 derajat dengan bidang potongan horizontal pada elevasi 1.2 m di atas permukaan lantai aktif (+1.2m Lt. 1, +4.4m Lt. 2, +7.6m Lt. 3).
   - Atap dan lantai atas terpotong bersih, dinding perimeter dan partisi dipotong tebal (ketebalan visual 0.15m - 0.20m, warna slate gelap #0F172A), perabot dan lantai bawah terlihat jelas.
   - Pemilih lantai bertingkat terpadu (Lt. 1, Lt. 2, Lt. 3, Lt. 4) pada bilah kaca atas (`TopHeader.tsx`).
   - Keluar dari mode 2D mengembalikan kamera ke sudut pandang orbit dan mode kamera sebelumnya (`savedOrthoOrbitState`).
