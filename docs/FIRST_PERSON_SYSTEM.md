# Dokumentasi Teknis Sistem First-Person (Mode Pejalan Kaki & Studio Arsitek) Arscity

> **Panduan Konteks untuk Model AI (Google Gemini)**  
> Dokumen ini dirancang sebagai referensi arsitektur, kode, kontrol, dan logika sistem *First-Person* (Mode Pejalan Kaki) dalam aplikasi **Arscity**. Gunakan dokumen ini sebagai konteks lengkap saat menganalisis, men-debug, atau memperluas fitur penjelajahan skala manusia, perabotan interior, dan interaksi bangunan.

---

## 1. Ikhtisar & Tujuan Fitur

Mode **First-Person** (*Pejalan Kaki*) dalam Arscity mengubah sudut pandang pengguna dari kamera orbit/isometrik makro kota menjadi sudut pandang orang pertama (skala manusia nyata 1:1). 

Fitur ini menyediakan pengalaman:
1. **Walkthrough Arsitektural Imersif**: Berjalan di atas tanah/trotoar dan masuk ke dalam gedung pada ketinggian mata manusia (*human eye level* 1.65 m saat berdiri, 0.45–0.50 m saat duduk).
2. **Navigasi Multi-Lantai Fisik**: Naik dan turun tangga secara berkesinambungan melalui *continuous physical StairZone* maupun elevator navigator.
3. **Studio Arsitek & Desain Interior Interaktif (In-Game Builder)**: Memasang perabot interior (sofa, meja makan, tempat tidur, rak, lampu), fasilitas publik, maupun membangun rumah/pohon langsung dari sudut pandang pejalan kaki lengkap dengan *ghost preview*, *wall snap*, *AABB overlap check*, dan sistem *Undo/Redo*.
4. **Alat Ukur & Material Arsitek**: Kuas cat material dinding/lantai (*Material Surface Painter*) dan pita laser 3D pengukur jarak presisi (*Laser Measure Tool*).
5. **Telemetri Lingkungan Mikro-Ruang (Standar SNI)**: Evaluasi *real-time* kualitas ruangan meliputi tingkat pencahayaan (Lux & SNI 03-6197), ventilasi alami (Air Changes per Hour / ACH), suhu termal (°C), dan akustik kebisingan (dBA).
6. **Interaktivitas Interior & Ergonomi**: Pintu sensor gerak (*proximity swing & sliding doors*), kursi interaktif, kipas angin plafon berputar, lampu warm 2700K, dan oklusi audio cuaca di bawah atap.

---

## 2. Peta File & Arsitektur Modul

```
src/
├── core/
│   ├── engine/
│   │   ├── FirstPersonController.ts      # Engine controller utama: fisika, input, raycasting, builder
│   │   ├── Engine.ts                     # Lifecycle kamera, game loop, switch orbit <-> first_person
│   │   └── SpringAnimator.ts             # Animasi spring wobble saat perabot dipasang
│   └── commands/
│       └── CityCommands.ts               # Command pattern (PlaceFurniture, RemoveFurniture, Paint, dll.)
├── buildings/
│   ├── FirstPersonFurnitureCatalog.ts    # Katalog perabot, eksterior, palet material & Three.js builder
│   ├── InteriorInteractiveSystem.ts      # Singleton pintu proximity, kursi duduk, fixture kipas/lampu
│   ├── InteriorMeshBuilder.ts            # Pembangun 3D partisi dinding, pintu, jendela, & stairwell
│   └── BuildingManager.ts                # Manajemen instans gedung & grup Three.js
├── ui/
│   ├── components/
│   │   ├── FirstPersonHUD.tsx            # UI overlay React: reticle, hotbar, drawer studio, telemetri
│   │   └── TopHeader.tsx                 # Tombol switch kamera Orbit vs Pejalan Kaki vs Drone
│   └── state/
│       └── useUIStore.ts                 # Zustand store untuk cameraMode, photoMode, DSLR lens
└── io/
    └── CitySerializer.ts                 # Serialisasi & deserialisasi placedFurniture dan material gedung
```

---

## 3. Skema Kontrol & Tombol Pintas (Hotkeys)

| Tombol / Aksi | Fungsi | Keterangan |
|---|---|---|
| **W, A, S, D** / Panah | Berjalan (Walk) | Kecepatan standar: `4.0 m/s`. Strafe kiri/kanan & maju/mundur sesuai yaw kamera. |
| **Shift (Tahan)** | Lari Sprint | Kecepatan lari: `7.5 m/s`. |
| **Spasi (Space)** | Lompat / Berdiri | Melompat dengan kecepatan `6.0 m/s` (jika grounded) atau berdiri jika sedang duduk. |
| **Gerakan Mouse** | Putar Sudut Pandang (Look) | Sensitivitas `0.0022 rad/px`. Pitch vertikal dikunci antara `-85°` hingga `+85°`. |
| **Klik Kiri** | Interaksi / Pasang / Kunci Kursor | Mengunci *Pointer Lock*, menaruh perabot/eksterior, mengecat dinding, atau menandai titik laser. |
| **Scroll Roda Mouse** | Rotasi Perabot / Jarak Eksterior | Rotasi perabot per 15° (`π/12`). Pada mode eksterior: mengatur jarak spawn (4m – 35m). |
| **[Tab]** atau **[B]** | Buka/Tutup Katalog Studio | Membuka drawer *frosted glass* katalog perabot, konstruksi kota, dan alat arsitek. |
| **[1] - [9]** | Hotbar Slot 1–9 | Memilih cepat perabot (di dalam gedung) atau elemen eksterior (di luar gedung). |
| **[R]** | Putar Perabot (+15°) | Memutar rotasi target penempatan searah jarum jam sebesar 15°. |
| **[G]** | Geser Perabot (*Grab / Move*) | Mengangkat perabot yang dibidik menjadi *Ghost Preview* untuk dipindahkan ke posisi baru (1 langkah Undo via `MoveFurnitureCommand`, `Esc` untuk batal). |
| **[V]** | Salin Perabot (*Clone*) | Menyalin tipe dan rotasi perabot yang dibidik ke tangan untuk langsung dipasang lagi di sebelahnya. |
| **[F]** | Duduk / Berdiri Interaktif | Duduk di kursi/sofa terdekat (`< 1.4m`) pada ketinggian ergonomis `0.45m - 0.50m`. |
| **[X]** | Hapus Perabot | Menghapus perabot yang sedang disorot oleh reticle tengah layar (*crosshair*). |
| **[C]** | Kuas Cat Material Permukaan | Mengaktifkan/menonaktifkan kuas material (*Material Surface Painter*). |
| **[M]** | Pita Laser Pengukur Jarak | Mengaktifkan/menonaktifkan alat laser 3D untuk mengukur jarak antara 2 titik. |
| **[L]** | Lampu Plafon Warm 2700K | Menyalakan/mematikan pool maksimal 2 `THREE.PointLight` (0xffecd2) pada ruangan terdekat. |
| **[P]** | Mode Foto DSLR | Membuka jendela bidik kamera DSLR (4 siku fokus sudut lensa) dan melepas *Pointer Lock*. |
| **[Esc]** | Batal Geser / Tutup / Orbit | Batal geser `[G]` -> tutup mode foto -> berdiri -> tutup drawer -> lepas tool/kursor -> kembali ke Orbit. |

---

## 4. Mekanika Fisika, Tabrakan, & Raycasting

### 4.1. Skala Manusia & Ketinggian Mata
- **Tinggi Mata Berdiri (`eyeHeight`)**: `1.65 meter` (proporsi rata-rata orang Indonesia).
- **Tinggi Mata Duduk (`seated eyeHeight`)**: `1.10 meter` (atau `seat.worldPosition.y + 0.48m`).
- **Gravitasi**: `-18.0 m/s²` dengan batas *delta time* `dt <= 0.1s`.

### 4.2. Deteksi Permukaan Tanah & Plinth Gedung (`calculateGroundHeight`)
1. **Raycasting ke Bawah (`downRaycaster`)**: Memeriksa permukaan horizontal dengan `face.normal.y > 0.6`.
2. **Elevasi Plinth**: Mendeteksi jika pemain berdiri di atas plinth/selasar gedung (`plinthHeight` biasanya `0.35m`).
3. **Penyelarasan Tangga Fisik (`StairZone`)**: Jika pemain berada di dalam tapak tangga gedung multi-lantai, ketinggian `Y` dihitung secara kontinu berdasarkan posisi lokal Z pemain:
   $$t = \text{clamp}\left(\frac{\text{localZ} - \text{zStart}}{\text{zEnd} - \text{zStart}}, 0.0, 1.0\right)$$
   $$\text{elevation} = \text{bld.position.y} + \text{baseFloorY} + t \times \text{floorHeight}$$
   Ketika $t \ge 0.98$, lantai pemain otomatis beralih ke lantai atas berikutnya.

### 4.3. Deteksi Tabrakan Dinding (`testWallCollision`)
- Pemain memiliki radius fisik **`0.20 meter`**.
- Tabrakan dicek menggunakan raycaster horizontal pada dua ketinggian tubuh:
  - **Tinggi Pinggang**: `position.y - 0.75m`
  - **Tinggi Dada**: `position.y - 0.35m`
- **Pengecualian Khusus (Walk-Through)**: Raycaster mengabaikan objek pintu (*door leaves*), portal kusen (*portal casings*), dan perabot yang sudah ditempatkan agar pemain tidak macet saat melintasi pintu atau lorong sempit.
- **Wall Sliding**: Jika gerakan gabungan $(dx, dz)$ menabrak dinding, sistem mencoba memecah vektor gerakan ke sumbu $(dx, 0)$ atau $(0, dz)$ sehingga pemain meluncur mulus di sepanjang dinding.

### 4.4. Oklusi Cuaca & Deteksi Berada di Bawah Atap (`checkIfUnderRoof`)
- Menggunakan `upRaycaster` yang menembak lurus ke atas (`+Y`, jarak maks 30m).
- Jika terdeteksi atap atau lantai di atas pemain, `isUnderRoof` bernilai `true`.
- Nilai ini diteruskan ke `SpatialAudioSystem` untuk meredam (*low-pass filter*) suara hujan/badai saat pemain berteduh.

---

## 5. Logika Penempatan Builder & Studio Arsitek

### 5.1. Penentuan Posisi Dalam vs Luar Ruangan (`isPositionInsideInnerWalls`)
Pemain diklasifikasikan berada **di dalam gedung** jika koordinat $(X, Z)$ berada dalam batas dinding dalam gedung dengan *wallInset* = `0.12m`. Sistem mendukung bentuk poligon bebas (*footprint polygon*) maupun bounding box persegi panjang.

### 5.2. Penempatan Furnitur Interior (Tab 1)
- **Target Raycast**: Membidik permukaan lantai gedung (`face.normal.y > 0.7`).
- **Wall Snapping Otomatis**: Jika kursor berjarak `< 0.6m` dari salah satu dinding dalam, perabot otomatis menempel (*snap*) ke dinding dan orientasinya diputar menghadap ke tengah ruangan.
- **Overlap Prevention (AABB Check)**: Mencegah perabot bertumpukan di lantai yang sama menggunakan uji kotak pembatas 2D:
  $$\text{candidateMinX} < \text{otherMaxX} \land \text{candidateMaxX} > \text{otherMinX} \land \dots$$
  Jika terhalang, reticle menampilkan badge merah *"Area terhalang oleh perabot lain"*.
- **Ghost Preview**: Ditampilkan secara *real-time* di dunia 3D dengan warna biru (valid) atau merah transparan (tidak valid).
- **Animasi Spring**: Saat perabot berhasil ditaruh, `springAnimator.triggerPlacementSpring` memberikan efek goyang elastis halus (*placement wobble*) pada model gedung.

### 5.3. Penempatan Eksterior & Konstruksi Kota (Tab 2)
- Raycasting menembak permukaan tanah/terain (jarak 1.5m – 60m).
- **Validasi Jalan Raya**: Memanggil `roadManager.isPointOnRoadAsphalt(x, z, 1.2)`. Jika titik berada di atas aspal jalan raya, penempatan dibatalkan dengan peringatan *"Lokasi terhalang jalan raya"*.

### 5.4. Alat Ukur Pita Laser 3D (`activeTool === 'laser_measure'`)
1. **Titik 1**: Klik pertama menyimpan koordinat `Vector3` titik awal.
2. **Titik 2**: Klik kedua menyimpan koordinat titik akhir, menghitung jarak Euclidean ($\Delta = \sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2}$ meter).
3. **Visualisasi**: Merender garis biru 3D (`THREE.Line`) dan *billboard sprite* 2D di titik tengah yang menampilkan kapsul ukuran bersih berfont `Space Mono` tanpa emoji (misal: `4.25 m`).

### 5.5. Kuas Cat Permukaan (`activeTool === 'material_painter'`)
Membidik permukaan lantai atau dinding gedung. Ketika diklik, sistem mengeksekusi `PaintSurfaceCommand` yang memperbarui material atau warna pada `buildingInstance` dan menyimpannya ke riwayat *undo/redo*.

---

## 6. Sistem Interior Interaktif (`InteriorInteractiveSystem`)

Modul ini adalah *singleton* yang menangani animasi dan logika interaktif di dalam interior bangunan:

### 6.1. Pintu Proksimitas Cerdas (*Dynamic Proximity Doors*)
- **Ambang Jarak Buka/Tutup**:
  - Jarak horizontal $< 2.2\text{ m}$ dan vertikal $< 2.2\text{ m}$ $\rightarrow$ target pembukaan = `1.0` (Buka).
  - Jarak horizontal $> 2.8\text{ m}$ $\rightarrow$ target pembukaan = `0.0` (Tutup).
- **Interpolasi Halus**: Menggunakan `THREE.MathUtils.damp(currentRatio, targetRatio, 9.0, dt)`.
- **Tipologi Pintu**:
  - **Swing Door**: Pintu berayun rotasi pada sumbu engsel $Y$ (misal pada Rumah Joglo atau Rumah Tinggal).
  - **Sliding Door**: Daun pintu kiri dan kanan bergeser saling menjauh pada sumbu horizontal $X$ (misal pada Gedung Kantor Kaca).
- **Audio Prosedural**: Memainkan `playDoorOpen()` dan `playDoorClose()` saat rasio melintasi ambang batas `0.15`.

### 6.2. Kursi Ergonomis (*Interactive Seating*)
- Mengidentifikasi kursi atau sofa dalam radius $< 1.4\text{ m}$.
- Ketika tombol `[F]` ditekan:
  - Pemain berpindah ke posisi kursi.
  - Tinggi mata disesuaikan ke `worldPosition.y + 0.48m`.
  - Pemain dapat berdiri kembali cukup dengan menekan tombol gerak (`W/A/S/D`) atau `[Spasi]`.

### 6.3. Kipas Plafon & Lampu Otomatis
- Kipas angin plafon tropis berakselerasi berputar (`fanSpeed = 6.5 rad/s`) ketika pemain memasuki ruangan dan melambat berhenti ketika pemain keluar.

---

## 7. Telemetri Lingkungan Mikro-Ruang (Standar SNI)

Saat berada di dalam gedung, HUD menampilkan telemetri ruangan *real-time* berdasarkan posisi pemain di dalam poligon ruangan (`RoomDefinition`):

```typescript
export interface MicroRoomMetrics {
  roomId: string;
  roomName: string;
  floorLabel: string;
  areaM2: number;
  lux: number;
  sniLuxStatus: 'Optimum (SNI)' | 'Cukup' | 'Kurang Cahaya' | 'Terlalu Terang';
  ach: number;
  temperatureC: number;
  noiseDba: number;
  interiorVariantName: string;
}
```

1. **Pencahayaan (Lux)**:
   - Dihitung dari faktor cahaya alami (*daylight factor* $0.016 - 0.025$) ditambah lampu plafon (+320 Lux jika menyala).
   - Klasifikasi SNI 03-6197:
     - `< 120 Lux`: Kurang Cahaya (Lampu perlu dinyalakan).
     - `150 - 350 Lux`: **Optimum (SNI)** untuk ruang tinggal & kerja.
     - `> 500 Lux`: Terlalu Terang / Silau.
2. **Ventilasi (Air Changes per Hour / ACH)**:
   - Mengukur pergantian udara per jam (misal 6.4 ACH untuk ruang tamu, 12.5 ACH untuk teras terbuka).
3. **Kenyamanan Termal**: Suhu ruang terhitung (~27.5°C).
4. **Tingkat Kebisingan (Akustik dBA)**: Mengukur transmisi kebisingan jalan ke dalam ruangan (~41 dBA indoor, terisolasi dinding bata/kaca).

---

## 8. Mode Foto DSLR & Sudut Pandang Sinematik

Di dalam HUD First-Person, pengguna dapat mengaktifkan **DSLR Photo Mode**:
- **Pilihan Lensa Kamera**:
  - `24mm` (Ultra-Wide): Field of View 84°, ideal untuk interior sempit atau fasad gedung penuh.
  - `50mm` (Standar Human Eye): Field of View 47°, perspektif alami mata manusia tanpa distorsi optik.
  - `85mm` (Telephoto / Portrait): Field of View 28°, kompresi latar belakang untuk detail ornamen dan furnitur.
- **Grid Rule of Thirds**: Tampilan garis panduan komposisi fotografi 3x3.
- **Perekam Video (REC)**: Indikator perekaman video sinematik dengan timer durasi.

---

## 9. Pola Perintah (Command Pattern) & Serialisasi Data

Semua aksi penambahan dan modifikasi pada First-Person terintegrasi dengan arsitektur **Command Pattern** (`src/core/commands/CityCommands.ts`) sehingga mendukung **Undo (`Ctrl+Z`)** dan **Redo (`Ctrl+Y`)**:

- `PlaceFurnitureCommand(engine, buildingId, furnitureData)`
- `RemoveFurnitureCommand(engine, buildingId, furnitureData)`
- `AutoFurnishRoomCommand(engine, buildingId)`
- `PaintSurfaceCommand(engine, buildingId, surfaceType, materialId)`
- `AddBuildingCommand(engine, buildingInstance)`
- `AddLandscapeItemCommand(engine, landscapeItem)`

### Struktur Data Furnitur Tersimpan (`PlacedFurnitureData`):
```typescript
export interface PlacedFurnitureData {
  id: string;               // ID unik: fur_<timestamp>_<random>
  type: string;             // Tipe katalog: misal 'sofa_l', 'bed_king'
  name: string;             // Nama label display
  position: [number, number, number]; // Koordinat lokal [x, y, z] terhadap gedung
  rotationY: number;        // Rotasi lokal perabot dalam radian
  floorIndex: number;       // Lantai tempat perabot berada (1, 2, 3...)
}
```
Data ini secara otomatis disimpan ke dalam file proyek JSON via `CitySerializer.ts` di bawah properti `building.userData.placedFurniture`.

---

## 10. Panduan Developer: Menambahkan Fitur Baru

### Menambahkan Item Furnitur Baru ke Katalog
1. Buka `src/buildings/FirstPersonFurnitureCatalog.ts`.
2. Tambahkan metadata item ke dalam array `FIRST_PERSON_FURNITURE_CATALOG`:
   ```typescript
   {
     id: 'meja_kerja_baru',
     name: 'Meja Kerja Minimalis',
     category: 'office',
     description: 'Meja kerja kayu jati dengan rak buku samping',
     width: 1.4,
     depth: 0.7,
     height: 0.75,
     seatHeight: 0.45,
     isSeat: false
   }
   ```
3. Tambahkan prosedur pembuatan mesh 3D di `FirstPersonFurnitureBuilder.buildFurniture(type)` pada blok `switch (type)`:
   ```typescript
   case 'meja_kerja_baru': {
     const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.7), woodMat);
     top.position.set(0, 0.725, 0);
     group.add(top);
     // Tambahkan kaki meja & detail lainnya...
     break;
   }
   ```
4. Perabot baru otomatis muncul di *Studio Drawer* pada Tab 1 kategori yang bersangkutan.

