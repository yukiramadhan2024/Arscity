# Arscity

> **City builder sandbox 3D berbasis browser berfokus pada arsitektur & tata kota tropis untuk pemula.**

Arscity dirancang untuk memperkenalkan konsep arsitektur, regulasi tata ruang (KDB, KLB, GSB, KDH), dan desain iklim tropis melalui pengalaman bermain interaktif langsung (*learning through building*). Mengadaptasi prinsip arsitektur mesin simulasi sistemik (Cellular Automata Spasial, Topological Graph Routing, Architectural Data Lenses, Smart Auto-Zoning, dan Lifecycle Economics), kota terasa hidup murni lewat dinamika pencahayaan matahari astronomis Yogyakarta, bayangan real-time, lansekap vegetasi terukur, pendaran jendela interior malam hari, dan simulasi cuaca tropis **100% tanpa NPC atau kerumunan kendaraan**.

---

## Fitur Utama

- **God Eye Camera Kontrol Halus**: Kamera isometrik/perspektif bebas sudut 50° dengan pan WASD/mouse edge, orbit halus, batas anti-tembus tanah, tampak atas ortografis denah kota, dan mode inspeksi fasad objek.
- **Topological Road-Graph Pathfinding & Walkability 400m**:
  - Penelusuran rute terpendek berbasis algoritma Dijkstra pada graf jalan nyata (`RoadGraph`) dengan ruas garis lurus maupun kurva Bezier.
  - Evaluasi keterjangkauan pejalan kaki 400 meter (standar 5 menit jalan kaki Permen PU 03/2014) dari fasilitas umum (Sekolah, Masjid, Puskesmas, Balai Warga) menyusuri koridor jalan riil (bukan garis lurus semu).
  - Pendaran koridor pejalan kaki hijau lembut (`#34C759`) pada *CityScoreOverlay* dan deteksi otomatis bangunan/kavling yang terisolasi dari akses jaringan jalan.
- **Model Bangunan Terpadu (Unified Building Model)**:
  - Rumah Tipe 36/54, Villa 2 Lantai, Rumah Tradisional Joglo & Limasan, Ruko 3 Lantai, Gedung Perkantoran, Apartemen, Sekolah, Masjid, Puskesmas, Balai Warga.
  - Bangunan kustom terintegrasi penuh: footprint poligon bebas, ekstrusi lantai bertingkat, pembagian modular dinding tanpa CSG (jendela tunggal/ganda/jalusi, pintu, balkon, kanopi), dan ragam atap (pelana, limasan, joglo, perisai, dak datar).
- **Simulasi Cellular Automata Mikroklimat & Hidrologi Antar-Kavling**:
  - Difusi spasial radius 25 meter: kavling dengan KDH tinggi (>30%) dan pepohonan peneduh memancarkan efek pendinginan mikro (-1.5°C s/d -3.0°C) dan bantuan serapan air ke kavling di sekitarnya.
  - Kavling dengan KDB tinggi (>75%) dan perkerasan masif memancarkan beban panas *Urban Heat Island* (+0.8°C s/d +2.0°C) serta melimpahkan kelebihan debit air hujan (*runoff overflow*) ke jalan dan kavling tetangga.
  - Umpan balik real-time pada *InspectorPanel* memaparkan kontribusi lingkungan mikro sekitar bangunan.
- **Architectural Data Lenses & Mode Maket Putih 3D**:
  - Mode visualisasi maket studio arsitektur (*White Maquette Data Lens*): permukaan tanah dan bangunan netral dirender dengan material putih gading matte berbayangan lembut.
  - Visualisasi dinamis data tematik: Kepatuhan KDB/GSB, Panas Surya & Ventilasi, Limpasan Banjir Mikro, serta Keterjangkauan Pejalan Kaki 400m dengan palet diredam (`#34C759` Hijau Ideal, `#FF9500` Amber Peringatan, `#FF3B30` Merah Kritis).
  - Transisi instan (0 ms) kembali ke material tekstur PBR asli saat lensa dinonaktifkan.
- **Smart Auto-Zoning / Pengembangan Kawasan Otomatis**:
  - Fitur cerdas **Kembangkan Kawasan Otomatis** untuk kavling kosong berstatus zonasi aktif.
  - Menentukan tipe dan proporsi bangunan yang sesuai dengan zona, memosisikan dan merotasi bangunan tepat di belakang garis GSB Depan menghadap jalan terdekat, membatasi tapak agar tidak melanggar batas maksimum KDB, serta otomatis menanam pohon peneduh dan sumur resapan agar memenuhi KDH >= 25%.
  - Seluruh rangkaian penempatan dibungkus dalam *CompositeCommand* tunggal yang mendukung pembatalan (*Undo/Redo*) dalam satu langkah bersih.
- **Simulasi Biaya Siklus Hidup 10 Tahun (CAPEX vs OPEX Tropis)**:
  - Kalkulasi Rencana Anggaran Biaya konstruksi awal (CAPEX) disandingkan dengan estimasi biaya operasional dan konsumsi energi 10 tahun (OPEX).
  - Beban pendinginan (AC) dihitung berdasarkan efektivitas ventilasi silang, kedalaman teritisan/overstek atap, naungan pohon peneduh, serta material atap.
  - Risiko pemeliharaan kelembapan dan banjir dipengaruhi oleh rasio KDH dan ketersediaan sumur resapan.
  - Peringkat Efisiensi Bangunan Hijau (*Tropical Efficiency Grade A s/d E*) memvisualisasikan penghematan finansial riil dari desain pasif tropis.
- **Atmosfer Kota Hidup Tanpa NPC (Night Glow & Solar Physics)**:
  - Simulasi posisi matahari astronomis Yogyakarta (-7.8° LS, 110.37° BT vs meridian WIB 105° BT) dengan koreksi bujur dan *Equation of Time* (tengah hari surya riil berkisar 11:20–11:55 WIB).
  - Pendaran otomatis cahaya jendela interior (`emissive` hangat 2700K `#FFE4B5`) dan lampu jalan saat simulasi waktu memasuki senja hingga fajar (17:45–05:30 WIB), menghadirkan pemandangan kota malam (*blue hour*) yang estetis tanpa membutuhkan karakter NPC.
- **Antarmuka iOS 27 Liquid Glass Refined**:
  - Material kaca tembus pandang (*frosted glass blur*), komponen kapsul super-elips, dan transisi spring dinamis.
  - Palet warna sistem diredam (*desaturated Apple system tokens*): `--good` (#34C759), `--warn` (#FF9500), `--bad` (#FF3B30), dan `--accent` (#007AFF).
  - Dock toolbar bawah, panel inspektor di sisi kanan, pengendali waktu & cuaca di kanan atas, serta minimap interaktif.
- **Performa Nyata & Uji Beban Terverifikasi**:
  - Penggabungan geometri statis per material (*BufferGeometry merge*) dan *Geometry Cache* terbagi.
  - *InstancedMesh* untuk seluruh pohon koridor jalan dan tiang penerangan (hanya 4 draw call untuk 3 km jalan).
  - Kamera bayangan adaptif yang mengikuti titik fokus pemain secara tajam tanpa memerlukan shadow map 400m yang kabur.
  - Alat dev **Uji Beban**: menghasilkan 300 bangunan dan 3.0 km jalan secara otomatis dengan telemetri WebGL live (622 draw call, 154k segitiga, 60 FPS pada preset High).
- **Penyimpanan Tahan Banting & 100% Offline**:
  - Penyimpanan persisten IndexedDB (`ArscityDB`) dengan skema v2.0.0, migrasi sekuensial, dan deserialisasi atomik anti-korupsi data (localStorage sebagai fallback).
  - Font Inter (SIL OFL) dibundel lokal dalam format WOFF2; nol request ke domain eksternal.
  - 13 paket tekstur PBR 1K asli berlisensi CC0 dari ambientCG & Three.js terdaftar di `manifest.json`.
  - Riwayat Undo/Redo menyeluruh (hingga 200 riwayat) berbasis *Delta Command Pattern* dan command grouping.

---

## Tech Stack

- **Runtime & Build**: [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Render Engine 3D**: [Three.js](https://threejs.org/) (MIT)
- **Pengujian Otomatis**: [Vitest](https://vitest.dev/) (MIT)
- **UI Framework & State**: [React](https://react.dev/) + [Zustand](https://github.com/pmndrs/zustand)
- **Penyimpanan**: IndexedDB API murni dengan fallback localStorage
- **Komputasi Geometri**: [earcut](https://github.com/mapbox/earcut) (ISC) untuk triangulasi poligon
- **Ikonografi**: [Lucide React](https://lucide.dev/) (ISC)
- **Tipografi**: Inter WOFF2 lokal (SIL Open Font License 1.1)

---

## Panduan Memulai Cepat

### Prasyarat
- Node.js versi 18 atau lebih tinggi
- Browser modern (Chrome, Edge, Firefox, Safari) dengan dukungan WebGL 2.0

### Instalasi & Menjalankan Server Dev
```bash
# Pasang dependensi
npm install

# Jalankan server pengembangan lokal
npm run dev
```
Buka URL lokal yang muncul (biasanya `http://localhost:5173`) di peramban Anda.

### Menjalankan Pengujian Otomatis (Unit Tests)
```bash
# Menjalankan seluruh unit test (Vitest)
npm run test
```
Seluruh kalkulasi kritis teruji secara otomatis:
- Kalkulasi luas poligon (Shoelace) dan titik dalam poligon (Ray-casting)
- Aturan KDB/KLB/KDH/GSB regulasi Indonesia
- Waktu surya astronomis & Equation of Time Yogyakarta
- Algoritma shortest-path Dijkstra & Walkability 400m (`RoadGraph`)
- Pengembangan zona otomatis patuh regulasi (`AutoZoningService`)
- Estimasi biaya siklus hidup 10 tahun CAPEX vs OPEX (`CostEstimator`)
- Difusi mikroklimat & hidrologi cellular automata (`ThermalVentilationAnalyzer`, `RunoffSimulator`)
- Roundtrip serializer atomik dan riwayat undo/redo

### Menjalankan Uji Beban 300 Gedung
1. Buka aplikasi di peramban.
2. Klik tombol **FPS** pada bar navigasi atas atau buka menu **Pengaturan > Alat Uji Beban**.
3. Klik tombol **Jalankan Uji Beban 300 Gedung**.
4. Amati pembentukan 300 gedung dan 3 km jalan dengan telemetri WebGL live (FPS, draw calls, segitiga, dan buffer memori).

---

## Lisensi & Atribusi Aset

Seluruh kode sumber dilisensikan di bawah [MIT License](./LICENSE). Seluruh aset foto tekstur dan font menggunakan lisensi domain publik (CC0 1.0 Universal) atau SIL OFL 1.1 yang tercatat pada katalog terbuka [manifest.json](./public/assets/textures/manifest.json).
