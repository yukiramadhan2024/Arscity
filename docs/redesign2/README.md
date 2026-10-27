# Perbaikan UI/UX Arscity Batch 2: Laporan Redesain & Dokumentasi Komparasi

Dokumen ini mendokumentasikan implementasi dan verifikasi menyeluruh untuk **Perbaikan UI/UX Arscity Batch 2**. Seluruh perubahan berfokus murni pada aspek antarmuka, ergonomi tata letak, kejelasan visual 3D, dan integritas data tanpa mengubah mekanik game, perhitungan regulasi (KDB, KLB, KDH, GSB, GSS, Runoff, Termal, Akustik), atau sistem *undo/redo*.

---

## 1. Ringkasan Eksekutif & Prinsip Desain

* **Estetika**: Apple iOS 27 Liquid Glass Refined dengan maksimal 4 permukaan kaca per layar, efek blur `20px`, dan batas kontur halus `rgba(255, 255, 255, 0.18)` / `rgba(0, 0, 0, 0.08)`.
* **Aksen Warna**: Satu aksen biru sistem konsisten (`#007AFF`) untuk status aktif dan tombol aksi primer.
* **Keterbacaan & Aksesibilitas**: Teks terbaca jelas dengan rasio kontras tinggi di atas permukaan solid/semi-solid (WCAG AA $\ge 4.5:1$).
* **Ikonografi & Tipografi**: Ikon Lucide satu keluarga dengan ketebalan stroke seragam `1.75`. Nol (0) Unicode emoji dan bebas dari dekorasi *AI slop*.
* **Kejujuran Data (Zero Fake Claims)**: Menghapus seluruh tombol media sosial mati (Google/GitHub), formulir email fiktif tanpa backend, klaim sinkronisasi awan palsu, dan alamat pengguna rekayasa (`arsitek@arscity.id`). Penyimpanan sepenuhnya transparan berbasis IndexedDB lokal.
* **100% Bahasa Indonesia**: Seluruh teks, label, satuan desimal (koma), dan keterangan arsitektur menggunakan bahasa Indonesia baku.

---

## 2. Tabel Komparasi Layar (Sebelum vs Sesudah)

| Area / Layar | Sebelum (`docs/redesign2/before/`) | Sesudah (`docs/redesign2/after/`) |
| :--- | :--- | :--- |
| **Layar Masuk (Login)** | `login_1366.png`<br>• Tombol login Google dan GitHub mati.<br>• Kolom input email palsu tanpa otentikasi riil.<br>• Angka-angka dekoratif tidak bermakna di latar belakang.<br>• Audio berputar otomatis mengganggu. | `login_1366.png`<br>• Tombol primer iOS pill **Mulai Bermain** (`#007AFF`).<br>• 4 kartu aksi jujur: Lanjutkan Kota, Perpustakaan, Panduan, Impor GeoJSON.<br>• Latar belakang isometrik bersih tanpa angka acak.<br>• Toggle audio eksplisit di pojok kanan atas (default bisu). |
| **Perpustakaan Kota (World Hub)** | `worldhub_1366.png`<br>• Judul "World Hub" bahasa Inggris.<br>• Email fiktif `arsitek@arscity.id` dan tombol keluar ganda.<br>• Label kartu berbahasa Inggris (`item / items`).<br>• Scrim gelap pekat non-glass. | `worldhub_1366.png`<br>• Judul baku **Perpustakaan Kota** ("Kota tersimpan di perangkat ini").<br>• Badge **Penyimpanan Lokal** dengan kuota kapasitas riil peramban.<br>• Menu aksi 3-titik: Buka, Ganti Nama, Duplikat, Ekspor, Hapus.<br>• Kartu folder: `{count} berkas`. Scrim Liquid Glass frosted. |
| **Dunia Utama (Main World)** | `main_1366.png` / `main_1920.png`<br>• Normal map rumput terlalu tajam/berisik (faktor 1.8).<br>• Garis sumbu silang cyan terang mengalihkan fokus.<br>• Teks tombol kamera aktif kurang kontras.<br>• Kanvas kosong tampak beku tanpa panduan. | `main_1366.png` / `main_1920.png`<br>• Tekstur rumput lembut tropis (normal 0.4, anisotropi 4x, mipmapping).<br>• Sumbu silang diredam ke slate transparan (`#64748B`, opasitas 0.25).<br>• Tombol kamera aktif pill biru solid dengan teks putih (WCAG AA 4.6:1).<br>• Kapsul halus `EmptyStateGuide` saat 0 jalan & 0 gedung. |
| **Menu Kota (Side Dock)** | `menu_kota_1366.png`<br>• Bertumpukan dengan radar Minimap pada resolusi 1366x768.<br>• Spasi antar-grup terlalu rapat.<br>• Judul kaku dan hotkey terpotong. | `menu_kota_1366.png`<br>• Batasan tinggi dinamis (`maxHeight: calc(100vh - 100px)`) dengan scroll tersembunyi.<br>• Judul Title Case **Menu Kota** berjarak 12px rapi dari logo.<br>• Spasi grup lega. Seluruh pintasan tombol (keybind) di samping simbol dihilangkan untuk tampilan minimalis bersih.<br>• Minimap dipindahkan ke pojok kanan bawah sehingga navbar kiri memiliki ruang bebas penuh tanpa potensi tumpang tindih. |
| **Laboratorium Analisis** | `analisis_1366.png`<br>• Bertabrakan dengan Side Dock saat keduanya terbuka.<br>• Tab horizontal 8 item terpotong pada layar 1366px.<br>• Tanpa tombol tutup 'X' di bar judul.<br>• Istilah teknis asing & format angka titik. | `analisis_1366.png`<br>• Otomatis melipat Side Dock ke mode ikon saat alat Analisis aktif.<br>• Tab tertata dalam grid responsif 4x2 yang kompak.<br>• Tombol tutup 'X' jelas di pojok kanan atas.<br>• Istilah arsitektur Indonesia murni & format desimal koma (`1,2 m`, `4,5°C`). |
| **Pengaturan (Settings)** | `settings_1366.png`<br>• Label menyesatkan "Ultra RTX" pada WebGL biasa.<br>• Nama renderer GPU panjang memicu *overflow* tata letak.<br>• Alat pengembang (Uji Beban, FPS) bercampur dengan opsi pemain. | `settings_1366.png`<br>• Label preset jujur: **Ultra**.<br>• Nama renderer GPU disederhanakan dengan tooltip detail.<br>• Bagian alat pengembang dipisahkan dalam akordion lipat di bagian bawah.<br>• Dukungan tema tri-mode (Terang, Gelap, Otomatis via OS preferensi). |
| **Radar Minimap** | `minimap_1366.png`<br>• Tombol "Peta Kota" membungkus teks menjadi dua baris kaku.<br>• Indikator utara hanya huruf tunggal "U".<br>• Segitiga kerucut pandangan kamera membingungkan visual. | `minimap_1366.png`<br>• Tombol dengan `whiteSpace: nowrap` satu baris utuh.<br>• Indikator arah mata angin eksplisit: **Utara**.<br>• Segitiga kerucut penglihatan dihilangkan sepenuhnya, hanya menyisakan titik fokus kamera biru iOS yang bersih.<br>• Diposisikan di **sudut kanan bawah layar** (`right: 16px, bottom: 16px`), terpisah sepenuhnya dari navbar samping kiri. |

---

## 3. Berkas Tangkapan Layar Komparasi

### Baseline Sebelum (Before)
Tersimpan di direktori `docs/redesign2/before/`:
* `login_1366.png` (Resolusi 1366x768)
* `worldhub_1366.png` (Resolusi 1366x768)
* `main_1366.png` (Resolusi 1366x768)
* `menu_kota_1366.png` (Resolusi 1366x768)
* `analisis_1366.png` (Resolusi 1366x768)
* `settings_1366.png` (Resolusi 1366x768)
* `minimap_1366.png` (Resolusi 1366x768)

### Hasil Sesudah (After)
Tersimpan di direktori `docs/redesign2/after/`:
* `login_1366.png` (Resolusi 1366x768)
* `worldhub_1366.png` (Resolusi 1366x768)
* `main_1366.png` (Resolusi 1366x768)
* `menu_kota_1366.png` (Resolusi 1366x768)
* `analisis_1366.png` (Resolusi 1366x768)
* `settings_1366.png` (Resolusi 1366x768)
* `minimap_1366.png` (Resolusi 1366x768)
* `main_1920.png` (Resolusi 1920x1080)

---

## 4. Hasil Pengujian & Verifikasi Kualitas

1. **Rangkaian Pengujian Unit & Integrasi (Vitest)**:
   * Perintah: `npm test`
   * Hasil: **40 passed (40 berkas)**, **253 passed (253 tes)**.
   * Waktu eksekusi: ~40.8 detik.
   * Tingkat kelulusan: **100%**.

2. **Pemeriksaan Tipe TypeScript**:
   * Perintah: `tsc`
   * Hasil: **0 galat**.

3. **Build Bundling Produksi (Vite)**:
   * Perintah: `npm run build`
   * Hasil: **Selesai dengan kode keluar 0**. Seluruh modul teroptimasi dengan baik.
