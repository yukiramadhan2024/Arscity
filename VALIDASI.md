# Matriks Validasi Aturan, Standar Teknis, dan Koefisien (VALIDASI.md)

> PEMBERITAHUAN INTEGRITAS AKADEMIK:  
> Seluruh rujukan peraturan perundang-undangan, koefisien hidrologi, standar dimensi ruang, dan rumus fisika di bawah ini disarikan dari literatur teknis untuk tujuan simulasi edukasi.  
> Status saat ini dinyatakan BELUM DIVERIFIKASI MANUSIA sampai dilakukan peninjauan langsung oleh dosen pembimbing, ahli arsitektur, teknik sipil, atau dinas tata kota terkait.

---

## 1. Aturan Zonasi Perkotaan dan Intensitas Lahan (Building Code)

| Parameter / Aturan | Nilai Default | Rentang Dapat Diedit | Berkas Sumber Kode | Rujukan Regulasi Terkait | Status Validasi | Verifikator | Tanggal | Catatan dan Asumsi Penyederhanaan |
|---|---|---|---|---|---|---|---|---|
| KDB Zona Hunian (R) | 60% | 10% – 90% | src/zones/ZoneTypes.ts | Permen PUPR No. 29/PRT/M/2006 | Belum diverifikasi manusia | - | - | Luas dihitung dari tapak lantai dasar (Shoelace formula) |
| KLB Zona Hunian (R) | 1.5 | 0.5 – 5.0 | src/zones/ZoneTypes.ts | Pedoman Teknis Tata Ruang | Belum diverifikasi manusia | - | - | Rasio luas seluruh lantai terhadap luas kavling |
| KDH Zona Hunian (R) | 25% | 10% – 60% | src/zones/ZoneTypes.ts | Permen ATR/BPN No. 14/2021 | Belum diverifikasi manusia | - | - | Dihitung dari area hijau nyata taman dan pohon |
| GSB Depan Hunian | 3.0 m | 1.0 m – 10.0 m | src/zones/ZoneTypes.ts | Rumus Sempadan Jalan PUPR | Belum diverifikasi manusia | - | - | Jarak dinding terdepan ke tepi jalan |
| GSB Samping Hunian | 1.5 m | 0.0 m – 5.0 m | src/zones/ZoneTypes.ts | Standar Jarak Bebas Api SNI | Belum diverifikasi manusia | - | - | Syarat keselamatan kebakaran dan sirkulasi udara |
| GSB Belakang Hunian | 2.0 m | 0.0 m – 6.0 m | src/zones/ZoneTypes.ts | Syarat Ruang Terbuka Belakang | Belum diverifikasi manusia | - | - | Ruang ventilasi silang dapur dan servis |
| KDB Zona Komersial (K) | 75% | 20% – 95% | src/zones/ZoneTypes.ts | RDTR Kawasan Usaha Perdagangan | Belum diverifikasi manusia | - | - | Kepadatan tapak lebih tinggi untuk lantai dasar |
| KLB Zona Komersial (K) | 3.0 | 1.0 – 8.0 | src/zones/ZoneTypes.ts | Standar Kawasan Usaha Perkotaan | Belum diverifikasi manusia | - | - | Mengakomodasi gedung bertingkat komersial |
| KDB Ruang Terbuka Hijau | 10% | 0% – 20% | src/zones/ZoneTypes.ts | Permen PU No. 05/PRT/M/2008 | Belum diverifikasi manusia | - | - | Khusus fasilitas penunjang taman seperti pos jaga |
| KDH Ruang Terbuka Hijau | 85% | 70% – 100% | src/zones/ZoneTypes.ts | UU No. 26/2007 Penataan Ruang | Belum diverifikasi manusia | - | - | Dominan area resapan air dan tutupan vegetasi |

---

## 2. Standar Dimensi Ruang Dalam (Interior Room Standards)

| Elemen Ruang | Luas / Dimensi Default | Ambang Minimum | Berkas Sumber Kode | Rujukan Standar Terkait | Status Validasi | Verifikator | Tanggal | Catatan dan Asumsi |
|---|---|---|---|---|---|---|---|---|
| Ketebalan Dinding Partisi | 0.15 m | 0.10 m – 0.25 m | src/buildings/InteriorMeshBuilder.ts | Standar Pasangan Bata Merah | Belum diverifikasi manusia | - | - | Ditampilkan dengan ketebalan 3D pada potongan denah |
| Tinggi Plafon Bersih | 3.2 m | Min. 2.7 m | src/buildings/RoomStandards.ts | Standar Permen PUPR 29/2006 | Belum diverifikasi manusia | - | - | Standar ruang tropis untuk ventilasi silang |
| Kamar Tidur Utama | 12.0 m² | Min. 9.0 m² | src/buildings/RoomStandards.ts | Kepmenkes 829/1999 dan SNI 03-1733 | Belum diverifikasi manusia | - | - | Kebutuhan sirkulasi udara sehat 2 orang dewasa |
| Kamar Tidur Anak | 9.0 m² | Min. 7.5 m² | src/buildings/RoomStandards.ts | SNI 03-1733-2004 Perumahan | Belum diverifikasi manusia | - | - | Dimensi sisi terpendek minimal 2.0 meter |
| Kamar Mandi / WC | 3.0 m² | Min. 1.8 m² | src/buildings/RoomStandards.ts | Standar Sanitasi PUPR | Belum diverifikasi manusia | - | - | Memuat kloset, shower, dan bukaan pintu |
| Dapur | 6.0 m² | Min. 4.0 m² | src/buildings/RoomStandards.ts | SNI 03-1733-2004 | Belum diverifikasi manusia | - | - | Ruang cuci, kompor, dan ventilasi pembuangan |
| Ruang Tamu / Keluarga | 16.0 m² | Min. 9.0 m² | src/buildings/RoomStandards.ts | Pedoman Rumah Sehat Sederhana | Belum diverifikasi manusia | - | - | Ruang interaksi penghuni keluarga inti |

---

## 3. Hidrologi, Limpasan Air Hujan, dan Pengendalian Banjir

| Parameter / Koefisien | Nilai Default | Rentang Dapat Diedit | Berkas Sumber Kode | Rujukan Teori Terkait | Status Validasi | Verifikator | Tanggal | Catatan Ilmiah |
|---|---|---|---|---|---|---|---|---|
| Rumus Debit Limpasan | Q = 0.278 x C x I x A | - | src/simulation/RunoffSimulator.ts | Metode Rasional (Chow, 1988) | Belum diverifikasi manusia | - | - | Standar hidrologi drainase kawasan perkotaan |
| Intensitas Hujan Rencana | 60 mm/jam | 20 – 120 mm/jam | src/simulation/RunoffSimulator.ts | Analisis Hujan Ekstrem Wilayah | Belum diverifikasi manusia | - | - | Asumsi hujan lebat durasi 1 jam wilayah tropis |
| Koefisien Limpasan Atap | 0.90 | 0.70 – 0.95 | src/simulation/RunoffSimulator.ts | SNI 03-2453-2002 Sumur Resapan | Belum diverifikasi manusia | - | - | Permukaan genteng kedap air |
| Koefisien Limpasan Aspal | 0.85 | 0.70 – 0.95 | src/simulation/RunoffSimulator.ts | Petunjuk Desain Drainase Bina Marga | Belum diverifikasi manusia | - | - | Perkerasan kedap air jalan raya |
| Koefisien Limpasan Paving | 0.60 | 0.40 – 0.80 | src/simulation/RunoffSimulator.ts | Permen PUPR No. 12/PRT/M/2014 | Belum diverifikasi manusia | - | - | Blok beton dengan celah pasir peresap |
| Koefisien Taman Rumput | 0.20 | 0.10 – 0.40 | src/simulation/RunoffSimulator.ts | Pedoman Konservasi Air Kehutanan | Belum diverifikasi manusia | - | - | Permukaan porus dengan tutupan tanaman |
| Koefisien Tanah Terbuka | 0.15 | 0.05 – 0.35 | src/simulation/RunoffSimulator.ts | Teori Infiltrasi Permukaan | Belum diverifikasi manusia | - | - | Tanah porus alami tanpa perkerasan |
| Kapasitas Sumur Resapan | 2.5 m³/jam | 1.0 – 5.0 m³/jam | src/simulation/RunoffSimulator.ts | SNI 03-2453-2002 Sumur Resapan | Belum diverifikasi manusia | - | - | Bergantung pada jenis tanah lempung atau berpasir |
| Kapasitas Lubang Biopori | 0.20 m³/jam | 0.05 – 0.50 m³/jam | src/simulation/RunoffSimulator.ts | Literatur Lubang Resapan Biopori | Belum diverifikasi manusia | - | - | Diameter 10 cm dengan kedalaman 100 cm |

---

## 4. Struktur Bangunan dan Ketahanan Gempa

| Parameter / Heuristik | Nilai Default | Rentang Dapat Diedit | Berkas Sumber Kode | Rujukan Standar Terkait | Status Validasi | Verifikator | Tanggal | Catatan Ketahanan |
|---|---|---|---|---|---|---|---|---|
| Bentang Maksimum Bebas Kolom | 6.0 m | 4.0 – 10.0 m | src/simulation/StructuralChecker.ts | SNI 2847:2019 Beton Struktural | Belum diverifikasi manusia | - | - | Bentang lebih dari 6m butuh balok girder khusus |
| Rasio Aspek Denah Bangunan | 3.0 : 1 | 1.5 – 5.0 | src/simulation/StructuralChecker.ts | SNI 1726:2019 Ketahanan Gempa | Belum diverifikasi manusia | - | - | Mencegah torsi puntir horizontal seismik |
| Deteksi Tingkat Lunak | Aktif jika Lt 1 terbuka | - | src/simulation/StructuralChecker.ts | SNI 1726:2019 Pasal 7.3 | Belum diverifikasi manusia | - | - | Mencegah keruntuhan lantai dasar lemah |
| Rasio Kelangsingan (H/W) | 4.0 | 2.0 – 6.0 | src/simulation/StructuralChecker.ts | Teori Stabilitas Bangunan | Belum diverifikasi manusia | - | - | Mencegah momen guling akibat gempa |
| Batas Panjang Kantilever | 1.5 m | 0.8 – 2.5 m | src/simulation/StructuralChecker.ts | Standar Konstruksi Bangunan | Belum diverifikasi manusia | - | - | Kantilever panjang wajib kolom penopang |

---

## 5. Astronomi Surya dan Iklim Tropis

| Parameter | Nilai Tetap / Rumus | Berkas Sumber Kode | Rujukan Terkait | Status Validasi | Verifikator | Tanggal | Catatan |
|---|---|---|---|---|---|---|---|
| Lintang Yogyakarta | -7.80° LS | src/core/math/SolarPosition.ts | Koordinat Geografis DIY WGS84 | Belum diverifikasi manusia | - | - | Posisi lintang pusat kota |
| Bujur Yogyakarta | 110.37° BT | src/core/math/SolarPosition.ts | Koordinat Geografis DIY WGS84 | Belum diverifikasi manusia | - | - | Posisi bujur timur |
| Koreksi Bujur ke Surya | +21.48 menit | src/core/math/SolarPosition.ts | Rumus Astronomi Bola | Belum diverifikasi manusia | - | - | Tengah hari surya tiba sekitar 11:38 WIB |
| Persamaan Waktu (EoT) | Rumus Spencer (1971) | src/core/math/SolarPosition.ts | Literatur Astronomi NOAA | Belum diverifikasi manusia | - | - | Menghitung eksentrisitas orbit bumi |

---

## 6. Perencanaan Kota dan Skala Lingkungan

| Parameter | Nilai Default | Rentang Dapat Diedit | Berkas Sumber Kode | Rujukan Regulasi | Status Validasi | Verifikator | Tanggal | Catatan |
|---|---|---|---|---|---|---|---|
| Radius Akses Pejalan Kaki | 400 m | 200 m – 1000 m | src/analysis/CityScoreAnalyzer.ts | Permen PU No. 03/PRT/M/2014 | Belum diverifikasi manusia | - | - | Jarak tempuh 5 menit pejalan kaki |
| Target Rasio RTH Kota | 30% | 10% – 50% | src/analysis/CityScoreAnalyzer.ts | UU No. 26/2007 Penataan Ruang | Belum diverifikasi manusia | - | - | 20% RTH publik dan 10% RTH privat |
| Batas Tinggi terhadap Jalan | H maks <= 1.5 x Lebar Jalan | Rasio 1.0 – 3.0 | src/zones/AdvancedBuildingCode.ts | Permen PUPR No. 29/PRT/M/2006 | Belum diverifikasi manusia | - | - | Mencegah efek lorong perkotaan |
| Tangga Darurat Kebakaran | Gedung >= 4 Lantai | 3 – 8 Lantai | src/zones/AdvancedBuildingCode.ts | Permen PU No. 26/PRT/M/2008 | Belum diverifikasi manusia | - | - | Syarat proteksi kebakaran gedung bertingkat |
| Kemiringan Ramp Difabel | 8.0% (1 : 12) | 5.0% – 15.0% | src/zones/AdvancedBuildingCode.ts | Permen PUPR No. 14/PRT/M/2017 | Belum diverifikasi manusia | - | - | Kemiringan aman mandiri kursi roda |

---

## 7. Rencana Tindak Lanjut Verifikasi Ahli

Pihak akademik atau praktisi yang ingin memvalidasi parameter di atas dapat mengisi kolom Verifikator dan Tanggal setelah melakukan pengecekan langsung terhadap dokumen resmi SNI dan Peraturan Menteri terkait.
