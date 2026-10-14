# Arscity

> **City builder sandbox 3D berbasis browser berfokus pada arsitektur & tata kota tropis untuk pemula.**

Arscity dirancang untuk memperkenalkan konsep arsitektur, regulasi tata ruang (KDB, KLB, GSB, KDH), dan desain iklim tropis melalui pengalaman bermain interaktif langsung (*learning through building*). Tanpa NPC atau kerumunan, kota terasa hidup murni lewat dinamika pencahayaan matahari astronomis, bayangan real-time, lansekap vegetasi terukur, dan simulasi cuaca tropis.

---

## Fitur Utama

- **God Eye Camera Kontrol Halus**: Kamera isometrik/perspektif bebas sudut 50° dengan pan WASD/mouse edge, orbit halus, batas anti-tembus tanah, tampak atas ortografis denah kota, dan mode inspeksi fasad objek.
- **Sistem Jalan Topologis Realistis**: Jalan fleksibel (lurus & kurva Bezier) dengan pemodelan persimpangan otomatis (*Earcut polygon mesh*), trotoar, marka jalan, lampu jalan, dan pohon peneduh instanced.
- **Model Bangunan Terpadu (Unified Building Model)**:
  - Rumah Tipe 36/54, Villa 2 Lantai, Rumah Tradisional Joglo & Limasan, Ruko 3 Lantai, Apartemen, Sekolah, Masjid, Puskesmas, Balai Warga.
  - Bangunan kustom terintegrasi penuh: footprint poligon bebas, ekstrusi lantai bertingkat, pembagian modular dinding tanpa CSG (jendela tunggal/ganda/jalusi, pintu, balkon, kanopi), dan ragam atap (pelana, limasan, joglo, perisai, dak datar).
- **Building Code Nyata & Analisis Arsitektur Real-Time**:
  - Pemeriksa KDB (Koefisien Dasar Bangunan), KLB (Koefisien Lantai Bangunan), GSB (Garis Sempadan Bangunan Depan, Samping, Belakang), KDH (Koefisien Dasar Hijau) dengan notifikasi pelanggaran ramah pemula dan garis batas sempadan putus-putus.
  - Simulasi posisi matahari astronomis Yogyakarta (-7.8° LS, 110.37° BT vs meridian WIB 105° BT) dengan koreksi bujur dan *Equation of Time* (tengah hari surya riil berkisar 11:20–11:55 WIB).
  - Analisis orientasi fasad surya dan visualisasi vektor proyeksi bayangan fisik di permukaan tanah.
  - Simulasi ventilasi silang (*cross-ventilation*) dari orientasi bukaan jendela dan pintu.
  - Alat ukur digital (jarak, luas, dimensi otomatis) & mode potongan (*clipping plane*).
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
Seluruh kalkulasi kritis teruji secara otomatis: luas poligon (Shoelace), titik dalam poligon (Ray-casting), aturan KDB/KLB/KDH/GSB, waktu surya & Equation of Time, roundtrip serializer atomik, dan riwayat undo/redo.

### Menjalankan Uji Beban 300 Gedung
1. Buka aplikasi di peramban.
2. Klik tombol **FPS** pada bar navigasi atas atau buka menu **Pengaturan > Alat Uji Beban**.
3. Klik tombol **Jalankan Uji Beban 300 Gedung**.
4. Amati pembentukan 300 gedung dan 3 km jalan dengan telemetri WebGL live (FPS, draw calls, segitiga, dan buffer memori).

---

## Lisensi & Atribusi Aset

Seluruh kode sumber dilisensikan di bawah [MIT License](./LICENSE). Seluruh aset foto tekstur dan font menggunakan lisensi domain publik (CC0 1.0 Universal) atau SIL OFL 1.1. Rincian atribusi lengkap dan transparan tercantum di file [CREDITS.md](./CREDITS.md).

