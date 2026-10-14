# Matriks Validasi Aturan, Standar Teknis, & Koefisien (VALIDASI.md)
**Proyek**: Arscity — Sandbox Edukasi Arsitektur & Tata Kota Tropis  
**Fase**: Milestone T7 (Bukti Edukasi & Validasi Rilis)  
**Tujuan**: Inventarisasi seluruh parameter aturan, standar teknis, koefisien fisika/hidrologi, dan harga satuan dalam aplikasi untuk diverifikasi oleh dosen pembimbing, mahasiswa arsitektur, teknik sipil, dan perencana wilayah & kota (PWK).  
**Pernyataan Tetap Aplikasi**: *"Aturan disederhanakan untuk belajar, bukan pengganti ketentuan resmi (PBG dan RDTR daerah)."*

---

## 1. Aturan Zonasi Perkotaan & Intensitas Lahan (*Building Code*)

| Parameter / Aturan | Nilai Default | Rentang Dapat Diedit | Berkas Sumber Kode | Rujukan Regulasi / Literatur | Status Validasi | Catatan & Asumsi Penyederhanaan |
|---|---|---|---|---|---|---|
| **KDB Zona Hunian (R)** | 60% | 10% – 90% | `src/zones/ZoneTypes.ts` | Permen PUPR No. 29/PRT/M/2006 & RDTR Kota Yogyakarta | **Terverifikasi Regulasi** | Luas dihitung dari poligon tapak terputar (*Shoelace formula*). |
| **KLB Zona Hunian (R)** | 1.5 | 0.5 – 5.0 | `src/zones/ZoneTypes.ts` | Pedoman Teknis Rencana Tata Ruang | **Terverifikasi Regulasi** | Rasio luas seluruh lantai terhadap luas kavling. |
| **KDH Zona Hunian (R)** | 25% | 10% – 60% | `src/zones/ZoneTypes.ts` | Permen ATR/BPN No. 14/2021 | **Terverifikasi Regulasi** | Dihitung dari area hijau nyata (taman rumput & kanopi pohon). Sisa lahan tanpa penanda dihitung perkerasan. |
| **GSB Depan Hunian** | 3.0 m | 1.0 m – 10.0 m | `src/zones/ZoneTypes.ts` | Permen PUPR 29/2006 ($1/2 \times \text{lebar jalan} + 1$) | **Terverifikasi Regulasi** | Jarak terpendek dinding fasad ke garis tepi jalan terdekat. |
| **GSB Samping Hunian** | 1.5 m | 0.0 m – 5.0 m | `src/zones/ZoneTypes.ts` | Ketentuan Jarak Bebas Api SNI 03-1733 | **Terverifikasi Regulasi** | Syarat pencahayaan samping dan keselamatan kebakaran antar rumah. |
| **GSB Belakang Hunian** | 2.0 m | 0.0 m – 6.0 m | `src/zones/ZoneTypes.ts` | Ketentuan Ruang Terbuka Belakang | **Terverifikasi Regulasi** | Menjamin ventilasi silang udara dapur dan area servis. |
| **KDB Zona Komersial (K)** | 75% | 20% – 95% | `src/zones/ZoneTypes.ts` | RDTR Kawasan Perdagangan & Jasa | **Terverifikasi Regulasi** | Kepadatan tapak lebih tinggi dengan lantai dasar aktif. |
| **KLB Zona Komersial (K)** | 3.0 | 1.0 – 8.0 | `src/zones/ZoneTypes.ts` | Standar Kawasan Usaha Perkotaan | **Terverifikasi Regulasi** | Memungkinkan gedung bertingkat komersial. |
| **KDB Ruang Terbuka Hijau (RTH)**| 10% | 0% – 20% | `src/zones/ZoneTypes.ts` | Permen PU No. 05/PRT/M/2008 (Pedoman RTH) | **Terverifikasi Regulasi** | Hanya untuk bangunan utilitas taman (pos jaga, gazebo). |
| **KDH Ruang Terbuka Hijau** | 85% | 70% – 100% | `src/zones/ZoneTypes.ts` | UU No. 26/2007 Penataan Ruang | **Terverifikasi Regulasi** | Dominan area resapan air dan tutupan vegetasi alami. |

---

## 2. Standar Dimensi Ruang Dalam (*Interior Room Standards*)

| Elemen Ruang | Luas / Dimensi Default | Ambang Minimum | Berkas Sumber Kode | Rujukan Regulasi / Standar | Status Validasi | Catatan & Asumsi |
|---|---|---|---|---|---|---|
| **Ketebalan Dinding Partisi** | 0.15 m (15 cm) | 0.10 m – 0.25 m | `src/buildings/InteriorMeshBuilder.ts` | Standar Pasangan Dinding Bata Merah 1/2 Bata Plester Acian | **Terverifikasi Standar** | Ditampilkan dengan ketebalan fisik nyata pada potongan 3D. |
| **Tinggi Plafon Bersih** | 3.2 m (Kotor 3.5 m) | Min. 2.7 m (Permen PUPR) | `src/buildings/RoomStandards.ts` | Permen PUPR No. 29/PRT/M/2006 & SNI 03-1733-2004 | **Terverifikasi Standar** | Tinggi plafon tropis ideal 3.0–3.6 m untuk sirkulasi termal. |
| **Kamar Tidur Utama** | 12.0 m² (P3m × L4m) | Min. 9.0 m² (sisi min. 2.5m) | `src/buildings/RoomStandards.ts` | Kepmenkes No. 829/1999 & SNI 03-1733-2004 | **Terverifikasi Regulasi** | Standar kenyamanan pernapasan 2 orang dewasa. |
| **Kamar Tidur Anak** | 9.0 m² (P3m × L3m) | Min. 7.5 m² (sisi min. 2.0m) | `src/buildings/RoomStandards.ts` | SNI 03-1733-2004 (Tata Cara Perencanaan Perumahan) | **Terverifikasi Standar** | Standar hunian layak untuk 1 anak. |
| **Kamar Mandi / WC** | 3.0 m² (P2m × L1.5m) | Min. 1.8 m² (sisi min. 1.2m) | `src/buildings/RoomStandards.ts` | Standar Sanitasi Rumah Sehat PUPR | **Terverifikasi Standar** | Memuat kloset, bak/shower, dan area sirkulasi pintu buka ke dalam. |
| **Dapur (Kitchen)** | 6.0 m² (P3m × L2m) | Min. 4.0 m² (sisi min. 1.5m) | `src/buildings/RoomStandards.ts` | SNI 03-1733-2004 | **Terverifikasi Standar** | Ruang cuci, kompor, dan sirkulasi pembuangan asap. |
| **Ruang Tamu / Keluarga** | 16.0 m² | Min. 9.0 m² | `src/buildings/RoomStandards.ts` | Pedoman Rumah Sehat Sederhana | **Terverifikasi Standar** | Ruang interaksi sosial keluarga inti. |

---

## 3. Hidrologi, Limpasan Air Hujan, & Pengendalian Banjir

| Parameter / Koefisien | Nilai Default | Rentang Dapat Diedit | Berkas Sumber Kode | Dasar Teori / Rujukan | Status Validasi | Catatan & Asumsi |
|---|---|---|---|---|---|---|
| **Metode Perhitungan Debit** | Metode Rasional: $Q = 0.278 \cdot C \cdot I \cdot A$ | - | `src/simulation/RunoffSimulator.ts` | Teori Hidrologi Permukaan (Chow, 1988) | **Terverifikasi Ilmiah** | Standar baku analisis drainase perkotaan Indonesia. |
| **Intensitas Hujan Rencana ($I$)** | 60 mm/jam | 20 – 120 mm/jam | `src/simulation/RunoffSimulator.ts` | Curah Hujan Harian Maksimum Yogyakarta (Periode Ulang 5 Tahun) | **Perlu Verifikasi Dosen** | Asumsi hujan lebat durasi 1 jam wilayah tropis. |
| **Koefisien Limpasan Atap ($C_{atap}$)** | 0.90 | 0.70 – 0.95 | `src/simulation/RunoffSimulator.ts` | SNI 03-2453-2002 Tata Cara Perencanaan Sumur Resapan | **Terverifikasi Standar** | Kedap air tinggi, sebagian besar air langsung melimpas. |
| **Koefisien Limpasan Aspal ($C_{aspal}$)** | 0.85 | 0.70 – 0.95 | `src/simulation/RunoffSimulator.ts` | Petunjuk Desain Drainase Jalan Bina Marga No. 008/T/BNKT/1990 | **Terverifikasi Standar** | Permukaan perkerasan kaku/lentur jalan raya. |
| **Koefisien Limpasan Paving ($C_{paving}$)** | 0.60 | 0.40 – 0.80 | `src/simulation/RunoffSimulator.ts` | Permen PUPR No. 12/PRT/M/2014 | **Terverifikasi Standar** | Blok beton dengan sela pasir peresap air. |
| **Koefisien Limpasan Taman Rumput ($C_{rumput}$)**| 0.20 | 0.10 – 0.40 | `src/simulation/RunoffSimulator.ts` | Standar Konservasi Tanah dan Air Kehutanan | **Terverifikasi Standar** | Tanah bervegetasi dengan kapasitas infiltrasi tinggi. |
| **Koefisien Limpasan Tanah Terbuka ($C_{tanah}$)**| 0.15 | 0.05 – 0.35 | `src/simulation/RunoffSimulator.ts` | Standar Infiltrasi Permukaan Terbuka | **Terverifikasi Standar** | Tanah porous tanpa perkerasan. |
| **Kapasitas Serap Sumur Resapan** | 2.5 m³/jam per unit | 1.0 – 5.0 m³/jam | `src/simulation/RunoffSimulator.ts` | SNI 03-2453-2002 (Sumur diameter 1m, kedalaman 2m tanah lempung berpasir) | **Perlu Verifikasi Dosen** | Nilai debit resapan aktual sangat dipengaruhi jenis tanah lokal. |
| **Kapasitas Serap Lubang Biopori** | 0.20 m³/jam per unit | 0.05 – 0.50 m³/jam | `src/simulation/RunoffSimulator.ts` | Riset Lubang Resapan Biopori IPB (Brata dkk.) | **Perlu Verifikasi Dosen** | Diameter 10 cm, kedalaman 100 cm dengan sampah organik. |

---

## 4. Struktur, Ketahanan Seismik, & Mitigasi Gempa

| Parameter / Heuristik | Nilai Ambang Default | Rentang Dapat Diedit | Berkas Sumber Kode | Rujukan Ilmiah / Regulasi | Status Validasi | Catatan & Asumsi |
|---|---|---|---|---|---|---|
| **Bentang Balok Maksimum Bebas Kolom** | 6.0 m | 4.0 – 10.0 m | `src/simulation/StructuralChecker.ts` | Standar SNI 2847:2019 (Persyaratan Beton Struktural Gedung) | **Terverifikasi Standar** | Bentang $> 6.0\text{ m}$ pada rumah tinggal membutuhkan balok khusus/kolom antara. |
| **Rasio Aspek Denah (Pipih / Torsi)** | 3.0 : 1 | 1.5 – 5.0 | `src/simulation/StructuralChecker.ts` | SNI 1726:2019 (Tata Cara Perencanaan Ketahanan Gempa) | **Terverifikasi Standar** | Denah dengan rasio $> 3:1$ rentan mengalami konsentrasi torsi seismik horizontal. |
| **Deteksi Tingkat Lunak (*Soft Story*)** | True jika Lt 1 terbuka & Lt $\ge 2$ dinding masif | - | `src/simulation/StructuralChecker.ts` | SNI 1726:2019 Pasal 7.3 (Ketidakteraturan Kekakuan Tingkat) | **Terverifikasi Standar** | Ruko dengan lantai 1 kaca/garasi plong dan lantai 2 dinding bata berat. |
| **Rasio Kelangsingan Bangunan ($H/W$)** | 4.0 | 2.0 – 6.0 | `src/simulation/StructuralChecker.ts` | Teori Stabilitas Bangunan Tinggi | **Terverifikasi Ilmiah** | Mencegah bahaya guling (*overturning moment*) akibat gaya lateral. |
| **Batas Kantilever Atap / Balkon** | 1.5 m | 0.8 – 2.5 m | `src/simulation/StructuralChecker.ts` | Standar Konstruksi Beton & Kayu Tropis | **Terverifikasi Standar** | Kantilever $> 1.5\text{ m}$ membutuhkan balok konsol atau kolom penyangga tepi. |
| **Konteks Edukasi Gempa Yogya 2006** | Mw 6.3 Sesar Opak | Narasi Tetap | `src/simulation/StructuralChecker.ts` | Laporan Kerusakan Gempa DIY 2006 (Puslitbang PUPR & UGM) | **Terverifikasi Sejarah** | Keruntuhan masif akibat nihilnya ring balok pengikat dinding bata. |

---

## 5. Astronomi Surya, Iklim Tropis, & Posisi Matahari

| Parameter | Nilai Tetap / Rumus | Berkas Sumber Kode | Rujukan Astronomi | Status Validasi | Catatan Ilmiah |
|---|---|---|---|---|---|
| **Koordinat Lintang Yogyakarta** | -7.80° LS (-7.8°) | `src/core/math/SolarPosition.ts` | Koordinat Geografis DIY (WGS 84) | **Terverifikasi Nyata** | Pusat kota Yogyakarta. |
| **Koordinat Bujur Yogyakarta** | 110.37° BT | `src/core/math/SolarPosition.ts` | Koordinat Geografis DIY (WGS 84) | **Terverifikasi Nyata** | Terletak di timur meridian pusat WIB (105° BT). |
| **Koreksi Bujur ke Waktu Surya** | $+21.48$ menit | `src/core/math/SolarPosition.ts` | Rumus Astronomi Bola: $4\text{ menit/derajat} \times (110.37 - 105.0)$ | **Terverifikasi Ilmiah** | Menyebabkan tengah hari surya tiba lebih awal dari jam 12:00 WIB. |
| **Equation of Time (EoT)** | Rumus Spencer (1971): $\Delta t = 9.87 \sin(2B) - 7.53 \cos(B) - 1.5 \sin(B)$ | `src/core/math/SolarPosition.ts` | National Oceanic and Atmospheric Administration (NOAA) | **Terverifikasi Ilmiah** | Menghitung eksentrisitas orbit dan kemiringan sumbu bumi sepanjang tahun. |
| **Rentang Tengah Hari Surya (WIB)** | 11:20 WIB – 11:55 WIB | `src/core/math/SolarPosition.ts` | Kalender Matahari Tahunan DIY | **Terverifikasi Ilmiah (Lulus Tes Unit)** | Rata-rata tengah hari surya Yogyakarta adalah pukul 11:38 WIB. |
| **Hari Tanpa Bayangan (Kulminasi)** | Awal Maret (Hari ~60-65) & Oktober (Hari ~280-285) | `src/education/MissionManager.ts` | Badan Meteorologi, Klimatologi, dan Geofisika (BMKG) | **Terverifikasi Nyata** | Deklinasi matahari melintasi -7.8° LS dua kali setahun. |

---

## 6. Perencanaan Kota, Aksesibilitas, & Skala Lingkungan

| Parameter | Nilai Default | Rentang Dapat Diedit | Berkas Sumber Kode | Rujukan Regulasi | Status Validasi | Catatan & Asumsi |
|---|---|---|---|---|---|---|
| **Radius Akses Pejalan Kaki (Walkability)** | 400 m | 200 m – 1,000 m | `src/analysis/CityScoreAnalyzer.ts` | Permen PU No. 03/PRT/M/2014 (Pedoman Perencanaan Jalur Pejalan Kaki) | **Terverifikasi Regulasi** | Standar jarak jangkau 5 menit jalan kaki ke fasilitas publik lingkungan. |
| **Target Rasio RTH Kota** | 30% | 10% – 50% | `src/analysis/CityScoreAnalyzer.ts` | UU No. 26/2007 Pasal 29 Ayat 2 (Proporsi RTH Kota Minimal 30%) | **Terverifikasi Regulasi** | Terdiri dari 20% RTH publik dan 10% RTH privat. |
| **Batas Tinggi terhadap Lebar Jalan** | $H_{max} \le 1.5 \times W_{jalan}$ | Rasio 1.0 – 3.0 | `src/zones/AdvancedBuildingCode.ts` | Permen PUPR No. 29/PRT/M/2006 (Pencegahan Efek Urban Canyon) | **Terverifikasi Regulasi** | Mencegah pembayangan total koridor jalan dan perangkap polutan udara. |
| **Ambang Tangga Darurat Kebakaran** | Gedung $\ge 4$ Lantai | 3 – 8 Lantai | `src/zones/AdvancedBuildingCode.ts` | Permen PU No. 26/PRT/M/2008 (Sistem Proteksi Kebakaran Gedung) | **Terverifikasi Regulasi** | Wajib dilengkapi tangga terlindung tahan api minimal 2 jam. |
| **Kemiringan Maksimum Ramp Difabel** | 8.0% (1 : 12) | 5.0% – 15.0% | `src/zones/AdvancedBuildingCode.ts` | Permen PUPR No. 14/PRT/M/2017 (Aksesibilitas Penyandang Disabilitas) | **Terverifikasi Regulasi** | Kemiringan aman mandiri kursi roda tanpa pendamping. |

---

## 7. Estimasi Biaya Bangunan (RAB Edukatif)

| Elemen Pembangunan | Harga Satuan Default | Satuan | Berkas Sumber Kode | Label Transparansi | Status Validasi |
|---|---|---|---|---|---|
| **Struktur Beton & Pondasi** | Rp 1,500,000 | per m² total lantai | `src/simulation/CostEstimator.ts` | *"Ilustrasi edukatif, bukan acuan harga pasar riil"* | **Ilustrasi Edukatif (Dapat Diedit)** |
| **Pasangan Dinding & Plesteran** | Rp 750,000 | per m² total lantai | `src/simulation/CostEstimator.ts` | *"Ilustrasi edukatif, bukan acuan harga pasar riil"* | **Ilustrasi Edukatif (Dapat Diedit)** |
| **Rangka & Penutup Atap** | Rp 600,000 | per m² luas tapak | `src/simulation/CostEstimator.ts` | *"Ilustrasi edukatif, bukan acuan harga pasar riil"* | **Ilustrasi Edukatif (Dapat Diedit)** |
| **Pekerjaan Finishing & Utilitas** | Rp 650,000 | per m² total lantai | `src/simulation/CostEstimator.ts` | *"Ilustrasi edukatif, bukan acuan harga pasar riil"* | **Ilustrasi Edukatif (Dapat Diedit)** |
| **Konstruksi Jalan Aspal** | Rp 450,000 | per m² permukaan jalan | `src/simulation/CostEstimator.ts` | *"Ilustrasi edukatif, bukan acuan harga pasar riil"* | **Ilustrasi Edukatif (Dapat Diedit)** |
| **Pekerjaan Taman & Lansekap** | Rp 120,000 | per m² ruang terbuka hijau | `src/simulation/CostEstimator.ts` | *"Ilustrasi edukatif, bukan acuan harga pasar riil"* | **Ilustrasi Edukatif (Dapat Diedit)** |

---

## 8. Rekomendasi Validasi Lapangan untuk Tim Akademik
1. **Verifikasi Koefisien Resapan Tanah DIY**: Mahasiswa Teknik Sipil/Geoteknik disarankan menguji laju perkolasi tanah di kawasan lereng Merapi (utara) vs tanah lempung Bantul (selatan) untuk memberikan rentang nilai presisi pada `RunoffSimulator`.
2. **Kesesuaian Fasad Joglo & Limasan**: Mahasiswa Arsitektur Tropis disarankan meninjau proporsi tritisan (*overhang*) 1.2–1.8 m pada atap Joglo terhadap sudut datang radiasi matahari khatulistiwa.
3. **Penyempurnaan Indeks UHI**: Peneliti perkotaan dapat memvalidasi data suhu satelit Landsat 8 TIRS Kota Yogyakarta terhadap rumus komposit beban panas di `CityScoreAnalyzer`.
