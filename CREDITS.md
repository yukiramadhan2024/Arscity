# CREDITS.md - Audit Lisensi & Atribusi Aset Arscity

Proyek **Arscity** secara ketat HANYA menggunakan perangkat lunak, pustaka kode, font, dan aset yang berlisensi bebas dan sumber terbuka (Open Source & Public Domain).

> **Statistik Lisensi**:
> - Total Komponen Berbayar: **0**
> - Total Lisensi Non-Komersial Terlarang (CC BY-NC, GPL, AGPL): **0**
> - Lisensi yang Digunakan: **MIT, ISC, Apache-2.0, CC0 1.0, SIL OFL 1.1**
> - Status Verifikasi Aset: **Terverifikasi 100% Fisik & Manifest**

---

## 1. Pustaka Perangkat Lunak (Software Libraries)

| Komponen / Library | Pengembang / Pemilik | Lisensi | URL Sumber | Kegunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Three.js** | Mr.doob & Three.js Authors | MIT | https://github.com/mrdoob/three.js | Engine visualisasi dan rendering 3D WebGL/WebGPU |
| **React** | Meta Platforms, Inc. | MIT | https://github.com/facebook/react | Komponen UI dan rendering antarmuka pengguna |
| **React DOM** | Meta Platforms, Inc. | MIT | https://github.com/facebook/react | Integrasi komponen React dengan peramban DOM |
| **Zustand** | Paul Henschel & kontributor | MIT | https://github.com/pmndrs/zustand | Manajemen state aplikasi dan tools |
| **Earcut** | Mapbox | ISC | https://github.com/mapbox/earcut | Algoritma triangulasi poligon persimpangan & denah |
| **Lucide React** | Lucide Contributors | ISC | https://github.com/lucide-icons/lucide | Ikonografi antarmuka pengguna |
| **Vitest** | Anthony Fu, Matias Capeletto & Vitest Team | MIT | https://github.com/vitest-dev/vitest | Framework unit test otomatis |
| **Vite** | Evan You & Vite Contributors | MIT | https://github.com/vitejs/vite | Bundler dan server pengembangan frontend |
| **TypeScript** | Microsoft Corporation | Apache-2.0 | https://github.com/microsoft/TypeScript | Sistem tipe statis kode aplikasi |

---

## 2. Tipografi & Font Lokal

| Nama Font | Perancang / Sumber | Lisensi | Format & Lokasi | Catatan |
| :--- | :--- | :--- | :--- | :--- |
| **Inter** (300, 400, 500, 600, 700) | Rasmus Andersson | SIL Open Font License 1.1 (OFL) | WOFF2 lokal (`public/assets/fonts/`) | 100% offline, zero external font requests |

---

## 3. Tekstur PBR Terverifikasi (CC0 & MIT)

Semua aset di bawah ini diunduh secara fisik dalam resolusi 1K ke direktori `public/assets/textures/` dan tercatat dalam `manifest.json`:

| Material | ID Aset | Lisensi | Sumber Asli | File Peta PBR Aktif |
| :--- | :--- | :--- | :--- | :--- |
| **Aspal Jalan (Asphalt Road)** | `Asphalt010` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Asphalt010) | color, normal, roughness |
| **Beton Struktural (Concrete)** | `Concrete034` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Concrete034) | color, normal, roughness |
| **Bata Merah Expose (Red Brick)** | `Bricks059` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Bricks059) | color, normal, roughness, ao |
| **Plester Dinding Halus (Plaster)** | `Plaster001` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Plaster001) | color, normal, roughness |
| **Genteng Tanah Liat (Clay Roof Tiles)** | `RoofingTiles001` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=RoofingTiles001) | color, normal, roughness |
| **Kayu Alami / Parket (Natural Wood)** | `Wood051` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Wood051) | color, normal, roughness |
| **Rumput Taman Tropis (Grass)** | `Grass001` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Grass001) | color, normal, roughness, ao |
| **Paving Block Trotoar (Paving Stones)** | `PavingStones038` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=PavingStones038) | color, normal, roughness, ao |
| **Plat Trotoar Beton (Sidewalk Slabs)** | `PavingStones067` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=PavingStones067) | color, normal, roughness, ao |
| **Tanah Subur / Resapan (Soil Ground)** | `Ground003` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Ground003) | color, normal, roughness |
| **Batu Alam Plinth (Natural Stone Rock)** | `Rock026` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Rock026) | color, normal, roughness, ao |
| **Metal Lembaran / Seng Gelap (Dark Metal/Zinc)** | `Metal028` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Metal028) | color, normal, roughness |
| **Permukaan Air Genangan / Sungai (Water Normals)** | `WaterNormals` | MIT / CC0 Equivalent | [threejs-cc0](https://github.com/mrdoob/three.js/tree/dev/examples/textures) | normal, color |
| **Kerikil Atap Datar (Roof Gravel)** | `Gravel015` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Gravel015) | color, normal, roughness |
| **Membran Kedap Air Atap Datar (Waterproof Roof Membrane)** | `Rubber001` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Rubber001) | color, normal, roughness |
| **Keramik & Granit Dinding (Wall Ceramic/Granite Tiles)** | `Tiles107` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=Tiles107) | color, normal, roughness, ao |
| **Atap Spandek Baja Gelombang (Corrugated Metal Roof)** | `CorrugatedSteel005` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=CorrugatedSteel005) | color, normal, roughness |
| **Genteng Metal Pasir Modern (Metal Roofing Tiles)** | `RoofingTiles008` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=RoofingTiles008) | color, normal, roughness |
| **Panel Aluminium Komposit Fasad (ACP Cladding)** | `MetalPlates006` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=MetalPlates006) | color, normal, roughness |
| **Plester Dinding Kasar & Stucco (Textured Exterior Plaster)** | `PaintedPlaster017` | CC0 1.0 Universal | [ambientcg](https://ambientcg.com/view?id=PaintedPlaster017) | color, normal, roughness |
| **Langit Siang Menjelang Sore (Pure Sky HDRI 1K)** | `autumn_field_puresky` | CC0 1.0 Universal | [polyhaven](https://polyhaven.com/a/autumn_field_puresky) | hdr (Poly Haven CC0) |

---

## 4. Audio Efek Prosedural (Web Audio API)

| Aset | Pengembang / Sumber | Lisensi | Implementasi | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Audio Efek Suara** | Prosedural Web Audio API | MIT | Native Web Audio Context Synthesizer | 6 efek suara prosedural murni (klik, pasang jalan, bangun gedung, demolish, shutter kamera, reward bintang misi) |

---

## 5. Audit Kepatuhan Lisensi

Audit otomatis dependensi dieksekusi pada seluruh paket `node_modules`. Tidak ada paket dengan lisensi copyleft (GPL, AGPL) atau lisensi terlarang (CC BY-NC, proprietary).
Semua lisensi memenuhi kriteria integrasi komersial dan non-komersial bebas.
