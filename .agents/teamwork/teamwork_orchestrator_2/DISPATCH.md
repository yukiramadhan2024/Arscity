## 2026-11-02T04:28:21Z

PROMPT ANTIGRAVITY: ARSCITY V4.0 (VERSI DIPERJELAS)
Tempel ke Agent Manager pada proyek Arscity. Kerjakan TAHAP 1 sampai TAHAP 6 berurutan. Setiap tugas punya ID, langkah, dan kriteria lulus yang bisa diuji.

====================================================
0. CARA MEMBACA PROMPT INI
====================================================
• Setiap tugas berformat ID (contoh T1.3), berisi: Berkas, Langkah, Lulus. Kerjakan sesuai ID, satu commit per ID.
• "Lulus" adalah syarat selesai yang bisa dibuktikan lewat tes, angka, atau screenshot. Tanpa bukti, tugas dianggap belum selesai.
• Jika nama berkas atau fungsi yang disebut tidak ditemukan di lokasi tertulis, cari lewat pencarian di seluruh src, pakai yang paling sesuai, dan catat di DECISIONS.md.
• Jika ada instruksi tahap yang bertentangan dengan ATURAN GLOBAL (bagian 2), ikuti aturan global dan catat konfliknya di DECISIONS.md.

====================================================
1. KONTEKS DAN TIGA TUJUAN
====================================================
Arscity adalah game 3D edukasi arsitektur dan tata kota tropis di browser (React, TypeScript, Three.js, Vite, Vitest). Versi ini punya tiga tujuan:
1. Memperbaiki 9 bug kritis visual, UI, dan performa (TAHAP 1).
2. Menambah sistem render jarak bertingkat (LOD tiga zona) dan enam logika pengalaman mode Pejalan Kaki (TAHAP 2 dan 3).
3. Menambah logika perabot berpermukaan, adaptasi kota, ekologi, dan denah 2D terinspirasi game bangun lain (TAHAP 4 dan 5).
Catatan: prompt asal menyebut 8 bug, setelah dirinci ada 9 (T1.1 sampai T1.9).

====================================================
2. ATURAN GLOBAL
====================================================
G1 Lisensi: hanya aset dan library open source atau gratis berlisensi CC0, MIT, Apache 2.0, BSD, ISC, Zlib, SIL OFL, CC BY. Tidak ada aset berbayar atau berlisensi tidak jelas. Catat tambahan di CREDITS.md.
G2 Bahasa: semua teks UI Bahasa Indonesia lewat i18n, angka berformat Indonesia (koma desimal, spasi sebelum satuan, contoh "11,96 m"). Tanpa emoji.
G3 Warna dan gaya UI: semua warna lewat token tema. DILARANG memakai !important untuk warna, dan DILARANG warna literal (hex, rgb) di komponen. Warna hanya didefinisikan di berkas token. (Alasan: warna literal sebelumnya merusak keterbacaan saat tema berganti.)
G4 Perangkat uji: laptop Intel Core i7 10750H dengan RTX 3070 Laptop (prompt asal menyebut RTX 3060, pakai GPU yang terdeteksi di Pengaturan). Target: 60 FPS stabil (frame time p95 maksimal 16,7 ms) pada preset Tinggi. Target tambahan: 100 FPS atau lebih di mode Pejalan Kaki dalam ruangan. DILARANG mengklaim angka FPS tanpa pengukuran (protokol di TAHAP 6).
G5 Ruang lingkup: hanya mengerjakan isi prompt ini. Jangan menambah fitur lain dan jangan mengubah aturan Building Code kecuali disebut.
G6 Data adalah sumber kebenaran. Visibilitas (visible) hanya mengatur tampilan, tidak boleh menghapus data, tidak boleh memengaruhi validasi penempatan, tabrakan, atau penyimpanan.
G7 Setiap tahap diakhiri: npx tsc dengan opsi noEmit (0 error), npx vitest run (semua lulus), npm run build (sukses), cek console browser tanpa error.
G8 Konstanta pendidikan (suhu, pendinginan, dan sejenisnya) adalah model sederhana. Beri label "model sederhana untuk belajar", simpan sebagai nilai yang bisa diedit, dan catat di VALIDASI.md sebagai belum diverifikasi.

====================================================
3. KEPUTUSAN DESAIN YANG DIKUNCI UNTUK V4.0
====================================================
• Satu tema tunggal: Kaca Putih Terang. Opsi tema Gelap dan Sistem DISEMBUNYIKAN dari Pengaturan (sebelumnya rusak). Struktur token dua tema tetap dipertahankan agar tema gelap bisa dikembalikan nanti.
• Token permukaan kaca: latar rgba(255,255,255,0.92), blur 24 px, saturasi 180 persen, garis tepi #E2E8F0, bayangan satu lapis yang lembut.
• Token teks: label #0F172A, labelSecondary #475569 (kontras minimal 4,5 banding 1 di atas putih), fillControl #F1F5F9. Warna #0F172A hanya sebagai warna teks dan ikon, TIDAK sebagai latar.
• Warna aksen: satu token, #007AFF (sama dengan spek UI yang sudah dipakai). Prompt asal menyebut #0066FF untuk tombol aktif, ikuti token aksen agar konsisten.
• Font: font sistem Apple dengan fallback Inter lokal untuk teks, angka memakai tabular figures. (Prompt asal menyebut Plus Jakarta Sans dan JetBrains Mono. Jika pemilik proyek menginginkan itu, ganti SATU token font dan sertakan berkas woff2 lokal berlisensi OFL.)

====================================================
4. TAHAP 1: PERBAIKAN 9 BUG KRITIS
====================================================
T1.1 FPS jatuh ke 22 saat malam (lampu berat)
Berkas: src/core/engine/LightingSystem.ts, src/core/engine/Engine.ts, src/world/MalioboroPreset.ts
Langkah:
 1. Ukur dulu: catat FPS dan jumlah THREE.PointLight serta SpotLight aktif pada siang dan malam (18:00 sampai 05:30) sebelum perubahan.
 2. Hapus semua PointLight dan SpotLight dinamis untuk lampu jalan dan gedung.
 3. Lampu jalan dan jendela memakai material emissive bersama (cache, bukan klon per bangunan). emissiveIntensity naik halus menuju malam (sekitar 17:30 sampai 18:30) dan turun menjelang pagi (sekitar 05:00 sampai 06:00).
 4. Efek cahaya lampu jalan: sprite glow kecil ber instance atau bloom halus (hanya preset Tinggi dan Ultra).
 5. Pencahayaan utama: satu DirectionalLight (matahari siang, bulan redup malam) ditambah hemisphere ringan.
Lulus: jumlah PointLight aktif nol, FPS malam tidak lebih rendah dari siang lebih dari 10 persen, angka sebelum dan sesudah dicatat.

T1.2 Bintang tampak seperti bola debu di atas rumput
Berkas: src/core/engine/LightingSystem.ts
Langkah:
 1. Kubah bintang (starDome) mengikuti kamera: setiap frame salin posisi kamera ke kubah sebelum render. frustumCulled false.
 2. Radius kubah 4000 m hanya jika camera.far lebih dari 4500. Jika tidak, pakai 0,9 kali camera.far. Material: depthWrite false, depthTest false, renderOrder sangat rendah, fog false.
 3. Titik bintang memakai ukuran piksel tetap (sizeAttenuation false), bukan ukuran dunia.
 4. Hanya tampil malam, dengan fade berdasarkan jam game.
Lulus: dari semua ketinggian kamera dan sudut, bintang tidak pernah tampak berada di tanah atau berubah ukuran, siang tidak ada bintang.

T1.3 Tata letak Malioboro tidak rapi
Berkas: src/world/MalioboroPreset.ts
Langkah: hitung posisi jalan dan bangunan dari parameter (panjang koridor Utara Selatan, lebar jalan, lebar kavling, sempadan depan), bukan angka tempel. Bangunan memanjang teratur di kedua sisi.
Lulus: tes unit memastikan tidak ada poligon bangunan yang tumpang tindih dengan bangunan lain atau dengan jalan (toleransi 0,1 m).

T1.4 Seragamkan seluruh antarmuka ke satu tema kaca putih terang
Berkas: TopHeader.tsx, SideUtilityDock.tsx, BottomToolbar.tsx, InspectorPanel.tsx, FirstPersonHUD.tsx, SettingsModal.tsx, WorldHubModal.tsx, Minimap, dan semua komponen UI lain.
Langkah:
 1. Cari semua warna latar gelap literal (contoh #0f172a, #18181b, rgba(15,23,42,...)) di komponen UI dan css, simpan daftarnya di docs/audit/warna_gelap.txt.
 2. Ganti dengan token permukaan kaca (bagian 3). Teks dan ikon memakai token label (ikon memakai currentColor).
 3. Sembunyikan opsi tema Gelap dan Sistem di Pengaturan.
Lulus: pencarian warna latar gelap literal di komponen UI nol hasil, tes kontras token lulus (teks minimal 4,5 banding 1, ikon minimal 3 banding 1), screenshot semua layar utama terbaca.

T1.5 TopHeader terkunci di tengah atas
Berkas: TopHeader.tsx
Langkah: position fixed, top 16 px, left 50 persen, translateX negatif 50 persen (lewat transform), width max content, lebar maksimum layar dikurangi 32 px. Pada layar sempit, pindahkan kontrol sekunder ke menu "Lainnya" agar tidak meluap. z index di atas panel samping.
Lulus: bar tetap di tengah dan terlihat penuh saat panel kiri dan kanan terbuka, di 1366 x 768 dan 1920 x 1080.

T1.6 Tombol "Cerah" dan dua tombol bulat di sebelah kanan terlihat kosong
Berkas: TopHeader.tsx
Langkah: tombol memakai token fillControl sebagai latar dan token label sebagai warna teks dan ikon (currentColor). Tanpa !important.
Lulus: teks "Cerah" dan ikon dua tombol bulat terlihat jelas, kontras lulus.

T1.7 Teks preset grafis "Rendah", "Sedang", "Tinggi" hilang
Berkas: SettingsModal.tsx
Langkah: tombol tidak aktif memakai teks token label dengan bobot 600. Tombol aktif memakai latar token aksen dengan teks putih.
Lulus: semua label preset terbaca, termasuk preset teratas.

T1.8 Mode Foto Arsitektur: tombol ganda
Berkas: FirstPersonHUD.tsx
Langkah: hapus tombol kapsul putih duplikat "Ambil Foto PNG". Satukan pilihan lensa (24 mm, 35 mm, 50 mm, 85 mm), tombol Ambil Foto PNG, dan tombol Keluar dalam satu bar kaca.
Lulus: hanya ada satu bar bawah, tidak ada tombol yang menumpuk.

T1.9 Menu titik tiga "Ganti Nama" terpotong di Daftar Kota Tersimpan
Berkas: WorldHubModal.tsx
Langkah: menu popover otomatis memilih arah (default ke bawah, berbalik ke atas bila ruang bawah kurang dari tinggi menu), dengan batas agar tidak melewati tepi modal.
Lulus: menu tidak pernah terpotong, termasuk di jendela rendah dan pada baris terakhir daftar.

====================================================
5. TAHAP 2: RENDER JARAK BERTINGKAT (3 ZONA LOD)
====================================================
Berkas: src/buildings/BuildingManager.ts, src/world/LandscapeManager.ts, src/core/engine/FirstPersonController.ts
T2.1 Fungsi updateSpatialLOD(cameraPosition, isFirstPerson, currentIndoorBuildingId)
 • Dijalankan tiap 120 ms atau saat kamera berpindah lebih dari 1,5 m, bukan tiap frame.
 • Jarak dihitung ke tepi terdekat footprint atau bounding box bangunan, bukan ke titik tengah (gedung besar punya titik tengah yang jauh).
T2.2 Tiga zona dengan histeresis di KEDUA batas:
 • Zona 0 dekat: masuk saat jarak di bawah 24 m, keluar saat di atas 27 m. Tampilkan penuh: grup InteriorDetails, placedFurniture, kusen jendela 3D, seluruh dedaunan pohon. Kaca jendela memakai material "kacaDekat" (opacity 0,32).
 • Zona 1 menengah: dari 27 m sampai 65 m, dengan histeresis (masuk saat di atas 68 m ke zona 2, kembali saat di bawah 62 m). Sembunyikan placedFurniture dan perabot dalam ruangan. Kaca memakai material "kacaJauh" (opacity 0,88, roughness 0,1) agar gedung tidak kopong. Pohon: tampilkan batang utama dan gugus kanopi utama, sembunyikan ranting mikro.
 • Zona 2 jauh: di atas 65 m. Sembunyikan InteriorDetails, kusen kecil, pagar balkon detail, kerb kecil. Tampilkan massa dinding, atap, jalan, siluet pohon.
 • Kaca: dua material bersama (kacaDekat dan kacaJauh), ganti referensi material per kelompok jendela, JANGAN mengklon material.
T2.3 Fokus ruang saat pemain di dalam gedung (currentIndoorBuildingId bukan null):
 • Gedung itu sendiri selalu zona 0 (apa pun jaraknya).
 • Sembunyikan InteriorDetails dan placedFurniture SEMUA gedung lain, dan prop lansekap kecil yang berjarak lebih dari 35 m dari gedung tersebut.
 • Saat pemain keluar, kembalikan visibilitas pada pembaruan berikutnya.
T2.4 Raycaster Three.js TIDAK memeriksa properti visible. Objek tersembunyi tetap bisa disorot atau diklik. Gunakan layer atau filter manual agar objek tersembunyi tidak bisa menjadi sasaran hover, hapus, duduk, atau penempatan.
T2.5 Pembekuan matriks objek statis:
 • Mesh gedung dan pohon yang tidak dianimasikan: matrixAutoUpdate false. Setelah posisi diatur panggil updateMatrix lalu updateMatrixWorld(true).
 • Aktifkan kembali (atau panggil pembaruan matriks) saat objek dipindah, dibangun ulang, atau diedit (Studio CAD, geser perabot). Jangan membekukan objek beranimasi seperti daun pintu.
T2.6 Alat dev: overlay (mode pengembang saja) menampilkan jumlah objek per zona.
Lulus TAHAP 2:
 • Tes unit dengan kamera tiruan: penetapan zona benar, tidak ada kedip saat jarak berayun di dalam pita histeresis, fokus ruang menyembunyikan gedung lain, data perabot tidak berubah oleh perubahan visibilitas, raycaster tidak mengenai objek tersembunyi.
 • Pengukuran sebelum dan sesudah di Malioboro dan Uji Beban: draw call dan FPS tercatat.

====================================================
6. TAHAP 3: ENAM LOGIKA PENGALAMAN MODE PEJALAN KAKI
====================================================
Berkas utama: src/core/engine/FirstPersonController.ts, src/buildings/InteriorInteractiveSystem.ts, src/audio/ProceduralAudio.ts, FirstPersonHUD.tsx
T3.1 Adaptasi cahaya mata
 • Satu modul pemilik eksposur (hindari dua tempat mengatur toneMappingExposure). Gunakan THREE.MathUtils.damp dengan lambda sekitar 3 (peralihan sekitar 1 detik).
 • Luar ruangan 1,05, di bawah atap (isUnderRoof benar) naik ke 1,28. Terapkan sebagai faktor terhadap eksposur dasar jam game (faktor dalam ruangan sekitar 1,22) agar tidak bentrok dengan kalibrasi siang dan malam.
 • isUnderRoof: raycast ke atas dari kepala mengenai atap atau langit langit dalam 6 m, dengan debounce 150 ms. Mode Orbit tidak terpengaruh.
 Lulus: berjalan masuk dan keluar ruangan mengubah kecerahan halus tanpa kedip.
T3.2 Naik langkah otomatis tanpa lompat
 • Saat bergerak maju dan permukaan di depan lebih tinggi 0,05 m sampai 0,42 m, naikkan Y pemain dengan damp (lambda sekitar 12).
 • Syarat: ruang kepala di atas ketinggian baru minimal 1,7 m, bukan permukaan perabot, bukan dinding (bidang vertikal yang lebih tinggi dari 0,42 m tetap menghalang).
 Lulus: tes unit untuk trotoar, plinth 0,35 m, anak tangga, dan dinding setinggi 0,6 m (harus menghalang).
T3.3 Pintu ayun dua arah
 • Saat pemain kurang dari 2,2 m dari pintu, hitung dot product vektor pemain ke pintu terhadap normal pintu. Daun pintu membuka MENJAUHI pemain pada poros engsel tepinya (sekitar 100 derajat, sekitar 0,35 detik dengan easing). Menutup saat pemain lebih dari 3,2 m.
 • Daun pintu tidak menghalangi pemain (kecualikan dari tabrakan), tetapi tetap tidak menembus wajah pemain.
 Lulus: tes dari kedua sisi pintu, daun selalu membuka menjauh.
T3.4 Naik lantai (dua cara)
 • Berjalan fisik melewati tangga 3D (StairZone).
 • Tombol cepat Lt. 1, Lt. 2, dan seterusnya serta PageUp dan PageDown: teleportasi ke titik aman di lantai tujuan (di dekat ujung tangga atau titik bebas terdekat, bukan di dalam perabot atau dinding), dengan fade 150 ms. Hanya lantai yang ada di gedung itu.
 • Setelah pindah lantai, perbarui isUnderRoof, LOD, dan kartu mikroklimat.
 Lulus: tes pindah lantai pada gedung 1, 2, 3 lantai, posisi tujuan tidak menabrak apa pun.
T3.5 Suara langkah berdasarkan material
 • Deteksi material di bawah kaki (raycast ke bawah, baca penanda jenis permukaan: rumput, aspal, paving atau beton, kayu, keramik atau marmer, tanah).
 • Bunyi langkah per jarak tempuh 1,8 m dengan profil bunyi berbeda per material (kebisingan tersaring, dibuat prosedural). Maksimal 4 suara bersamaan.
 • AudioContext dilanjutkan setelah interaksi pertama pengguna, patuhi pengaturan suara dan bisukan.
 Lulus: tes unit pemetaan material ke profil bunyi, dan uji manual mendengar perbedaan pada rumput, aspal, dan lantai dalam.
T3.6 Goyangan kamera halus
 • Amplitudo vertikal sekitar 0,015 m mengikuti ritme langkah, berhenti dalam sekitar 0,15 detik saat diam atau saat membidik perabot.
 • Nonaktif otomatis bila pengaturan Kurangi Animasi aktif. Ada toggle "Goyangan kamera".
 Lulus: goyangan tidak muncul saat diam, bisa dimatikan, dan mengikuti Kurangi Animasi.

====================================================
7. TAHAP 4: PERABOT BERPERMUKAAN DAN MAGNET KURSI
====================================================
Berkas: src/core/engine/FirstPersonController.ts, src/buildings/FirstPersonFurnitureCatalog.ts, src/core/commands/CityCommands.ts, src/io/CitySerializer.ts
T4.1 Model data
 • Setiap perabot punya slot: 'floor', 'tabletop', atau 'wall', dan parentId opsional (untuk benda di atas meja). Berkas simpanan lama tanpa slot dimigrasi ke 'floor' (naikkan versi skema dan tambah tes migrasi).
 • Katalog menyatakan slot yang diizinkan per jenis dan menandai permukaan atas pada meja kerja, meja makan, dan konter.
T4.2 Tabletop dan wall
 • 'tabletop' (monitor PC, mesin kopi atau kasir, lampu meja, pot kecil): diletakkan di permukaan atas perabot induk yang dibidik, dengan snap pada grid lokal dan tidak keluar dari tepi meja.
 • 'wall' (lukisan, lampu dinding, papan tanda): menempel pada dinding vertikal (normal hampir horizontal) pada ketinggian 0,8 m sampai 2,2 m, rata dengan dinding.
 • Ghost dan teks petunjuk menyebut slot yang dibutuhkan bila bidikan tidak valid.
T4.3 Model 3D membulat
 • Gunakan geometri silinder, kapsul, dan bantalan bersudut halus (bevel) untuk sofa, kursi, dan meja, bukan kotak balok. Geometri dan material dibagi bersama (cache). Anggaran sekitar 600 segitiga per item.
T4.4 Magnet kursi dan relasi induk anak
 • Saat kursi diletakkan kurang dari 1,3 m dari meja, putar otomatis menghadap pusat meja dan snap pada jarak duduk sekitar 0,45 m dari tepi meja. Tahan Alt untuk menonaktifkan magnet. Jangan memakai hotkey yang sudah dipakai, cek konflik dan perbarui daftar hotkey.
 • Geser (tombol G) dan hapus (tombol X) pada meja ikut menggeser atau menghapus semua anak. Urungkan dan ulangi memulihkan induk dan seluruh anak sebagai satu perintah.
 Lulus TAHAP 4: tes otomatis untuk menaruh benda di meja, menggeser meja, menghapus meja, urungkan, simpan dan muat, orientasi kursi, dan migrasi simpanan lama. Perabot tetap selalu muncul dari data (aturan G6).

====================================================
8. TAHAP 5: ADAPTASI KOTA, FASAD, EKOLOGI, DENAH 2D
====================================================
T5.1 Jalan masuk otomatis (BuildingManager.ts)
 • Bangunan dalam jarak 1 m sampai 18 m dari jalan raya: buat jalan setapak batu (lebar sekitar 1,2 m, material paving CC0) dari pintu depan ke tepi trotoar terdekat, dan buka celah gerbang di garis kavling di depannya.
 • Jalan setapak dihitung sebagai perkerasan pada KDH. Dibangkitkan ulang saat bangunan dipindah, diedit, atau dihapus (dapat diurungkan). Hasil deterministik sehingga tidak perlu disimpan, cukup dibangkitkan saat muat.
 • Jika terhalang bangunan atau kavling lain, lewati dan beri catatan.
T5.2 Arkade ruko
 • Dua ruko berdampingan kurang dari 1,5 m: gabungkan kanopi teras lantai 1 menjadi selasar arkade terpadu dengan kolom di sambungan. Dibangkitkan ulang saat salah satu bergerak. Kanopi tidak menambah luas lantai (KDB dan KLB tidak berubah) dan tidak boleh melewati batas kavling tanpa peringatan.
T5.3 Fasad proporsional (CustomBuildingMeshBuilder.ts)
 • Jumlah modul sisi dinding n sama dengan maksimum 1 dan lantai dari (panjang dibagi 3,0). Lebar modul sama dengan panjang dibagi n, sisa dibagi rata. Tiap modul memuat jendela dan tiang kolom proporsional, jendela tidak diregang.
 • Terintegrasi dengan validator logika bentuk (jendela tidak tumpang tindih dan tidak terlalu dekat sudut).
 Lulus: tes untuk panjang 6 m, 9 m, 12 m (2, 3, 4 modul) dan panjang 2 m (1 modul).
T5.4 Studio CAD (CustomBuildingCreatorModal.tsx)
 • Sprite label dimensi 3D memakai kanvas 512 x 112 piksel, teks rata tengah, memperhitungkan devicePixelRatio, anti tabrakan. Teks utuh tidak terpotong ("+11,96 m (Puncak Atap)", "Panjang: 12,0 m").
 • Bola matahari kuning dinaikkan ke atas titik tertinggi atap plus 1,5 m sehingga tidak menancap.
 • Warna atap bawaan: Terakota #B45309 atau Baja #475569 sebagai tint pada tekstur atap, tidak lagi hitam pekat.
T5.5 Ekologi event driven (ThermalComfortEngine.ts, Engine.ts)
 • Hitung hanya saat objek ditambah, dihapus, atau dipindah (bukan tiap frame), memakai indeks spasial. Pengaruh bangunan: naik 0,35 derajat Celsius per lantai. Pohon: turun 1,5 derajat. Sungai: turun 1,8 derajat. Radius pengaruh dan semua konstanta bisa diedit (aturan G8).
 • Rona rumput kavling mengikuti hasil: hijau segar bila sejuk, agak kekuningan bila gersang tanpa pohon. Terapkan lewat atribut per kavling atau warna vertex, bukan per frame.
 Lulus: tes unit untuk perubahan suhu saat menambah dan menghapus objek, dan waktu hitung tetap kecil pada 300 bangunan.
T5.6 Denah 2D (TopHeader dan Engine.ts)
 • Tombol "2D Denah": kamera ortografis tampak atas dan bidang potong horizontal pada 1,2 m di atas permukaan lantai aktif (bukan Y absolut, bisa diatur 1,0 m sampai 1,5 m) agar berlaku di semua lantai. Atap dan lantai atas tersingkap, dinding terpotong tampak sebagai penampang tebal, perabot lantai terlihat, dimensi dan label ruang muncul.
 • Pemilih lantai untuk bangunan bertingkat. Keluar dari mode mengembalikan kamera ke posisi dan mode sebelumnya.
 Lulus: denah terbaca tajam pada gedung 1 sampai 3 lantai, tanpa objek terpotong aneh.

====================================================
9. TAHAP 6: VERIFIKASI
====================================================
T6.1 Jalankan npx tsc dengan opsi noEmit, npx vitest run, npm run build. Semua harus bersih. Tambahkan tes baru untuk updateSpatialLOD dan semua tugas yang disebut punya tes.
T6.2 Protokol pengukuran FPS (jalankan sebelum dan sesudah):
 • Skenario: Uji Beban 300 bangunan dan preset Malioboro. Rekam 60 detik pada siang dan malam untuk: mode Orbit, Pejalan Kaki di luar, Pejalan Kaki di dalam gedung.
 • Catat FPS rata rata, frame time p50 dan p95, draw call, jumlah segitiga dari renderer.info, dan jumlah PointLight aktif.
 • Laporkan apa adanya. Jika target belum tercapai, jelaskan penyebab dan langkah berikutnya, jangan mengarang angka.
T6.3 Inspeksi browser di http://localhost:5173 pada 1920 x 1080 dan 1366 x 768 dengan screenshot bukti di docs/v4:
 • Antarmuka seragam kaca putih terang, tombol Cerah dan dua tombol bulat terlihat, teks preset grafis terbaca, TopHeader tetap di tengah.
 • Bintang tidak tampak sebagai bola debu di tanah.
 • Studio CAD: label tidak terpotong, atap tidak hitam.
 • Mode Pejalan Kaki: berjalan mendekat dan menjauh dari gedung, LOD berpindah halus tanpa kedip, masuk dan keluar ruangan mengubah eksposur halus, pintu membuka menjauh, naik langkah otomatis, pindah lantai, suara langkah berbeda.
 • Mode Foto hanya punya satu bar bawah. Menu Ganti Nama tidak terpotong.
 • Denah 2D menampilkan penampang tajam.
 • Indikator FPS dinyalakan lewat mode pengembang saat pengukuran (secara default tersembunyi dari pemain).

====================================================
10. LAPORAN AKHIR DAN KRITERIA SELESAI
====================================================
Buat docs/V4_REPORT.md berisi tabel: ID tugas, status (selesai, sebagian, ditunda), bukti (path screenshot atau nama tes), catatan. Tambahkan angka sebelum dan sesudah dari T6.2, daftar berkas yang berubah, keputusan di DECISIONS.md, dan risiko yang tersisa.
Selesai jika:
• Semua ID berstatus selesai atau punya alasan tertulis untuk status sebagian atau ditunda.
• tsc 0 error, semua tes lulus, build sukses, console bersih.
• Tidak ada PointLight dinamis, bintang benar, antarmuka satu tema terbaca, tidak ada warna literal di komponen.
• LOD tiga zona dan fokus ruang bekerja tanpa kedip dan tanpa mengubah data.
• Angka FPS dilaporkan dari pengukuran nyata.



## 2026-11-02T07:23:19Z
The user has instructed to resume execution ("lanjutkan"). Please resume working from task T1.5 through Tahap 6 sequentially as specified. Keep up the one-commit-per-task discipline, running tests and tsc. Please also check your worker subagent status, revive or re-spawn as necessary following the server restart, and proceed with active execution.

## 2026-11-02T07:49:31Z
User instructed: "lanjutkan". Tahap 1 has achieved 100% commit completion (T1.1 through T1.9 committed) with 0 tsc errors and 58 passing test suites (443 tests). Please complete Tahap 1 signoff and orchestrate Tahap 2 (3-zone distance LOD T2.1-T2.6) through Tahap 6 sequentially with full verification and commit discipline.

## 2026-11-02T08:28:17Z
User requested: "pause". Please enter a safe paused state: ensure your worker safely saves/commits in-flight work, checkpoint progress.md, BRIEFING.md, and DISPATCH.md, cancel background timers, and pause further task execution until the user's "lanjutkan" command. Confirm when checkpointing is complete.

## 2026-11-02T11:52:44Z
User instructed: "lanjutkan". The server has restarted and Vite dev server is verified on port 5173. Tasks T2.1 through T2.4 are already completed and committed (latest commit: d174e3d). Please revive worker teamwork_worker_tahap2_1 and proceed immediately with T2.5 (static mesh matrix freezing) and T2.6 (developer LOD telemetry overlay), complete Tahap 2 verification gating, and continue sequentially through Tahap 3 to Tahap 6 as specified in ORIGINAL_REQUEST.md. Maintain the 1-commit-per-task discipline, running tests and tsc.
