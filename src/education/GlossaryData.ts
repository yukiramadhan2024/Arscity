export interface GlossaryEntry {
  id: string;
  term: string;
  abbreviation?: string;
  category: 'Regulasi & Tata Kota' | 'Elemen Arsitektur' | 'Kenyamanan & Iklim Tropis' | 'Gambar Kerja';
  definition: string;
  formula?: string;
  tropicalContext: string;
  illustrationType: 'kdb' | 'klb' | 'kdh' | 'gsb' | 'overhang' | 'ventilation' | 'plinth' | 'solar' | 'facade' | 'section' | 'plan' | 'scale';
}

export const GLOSSARY_DATA: GlossaryEntry[] = [
  {
    id: 'kdb',
    term: 'Koefisien Dasar Bangunan',
    abbreviation: 'KDB',
    category: 'Regulasi & Tata Kota',
    definition: 'Persentase maksimum luas lantai dasar bangunan yang boleh menutupi luas kavling atau lahan.',
    formula: 'KDB = (Luas Lantai Dasar / Luas Lahan) × 100%',
    tropicalContext: 'Di iklim tropis dengan curah hujan tinggi, KDB dibatasi (biasanya 50-60%) agar sisa lahan dapat menyerap air hujan dan mencegah banjir lingkungan.',
    illustrationType: 'kdb'
  },
  {
    id: 'klb',
    term: 'Koefisien Lantai Bangunan',
    abbreviation: 'KLB',
    category: 'Regulasi & Tata Kota',
    definition: 'Angka kelipatan yang menentukan total luas seluruh lantai bangunan yang diizinkan dibangun di atas sebidang tanah.',
    formula: 'KLB = Total Luas Seluruh Lantai / Luas Lahan',
    tropicalContext: 'KLB mengontrol kepadatan kota dan kapasitas jalan di sekitarnya agar tidak terjadi beban infrastruktur berlebih.',
    illustrationType: 'klb'
  },
  {
    id: 'kdh',
    term: 'Koefisien Daerah Hijau',
    abbreviation: 'KDH',
    category: 'Regulasi & Tata Kota',
    definition: 'Persentase minimum ruang terbuka di luar bangunan yang diperuntukkan bagi penghijauan dan resapan air alami.',
    formula: 'KDH = (Luas Ruang Terbuka Hijau / Luas Lahan) × 100%',
    tropicalContext: 'Wajib minimal 20-30% di kawasan perumahan Indonesia untuk menjaga kesejukan mikro dan menurunkan efek pulau panas (urban heat island).',
    illustrationType: 'kdh'
  },
  {
    id: 'gsb',
    term: 'Garis Sempadan Bangunan',
    abbreviation: 'GSB',
    category: 'Regulasi & Tata Kota',
    definition: 'Batas jarak terdepan dinding terluar bangunan terhadap batas jalan atau kavling.',
    formula: 'Standar umum: GSB = 1/2 Lebar Ruas Jalan + 1 meter',
    tropicalContext: 'GSB memberikan jarak aman untuk pencahayaan alami, sirkulasi udara jalan, privasi penghuni, dan pelebaran jalan masa depan.',
    illustrationType: 'gsb'
  },
  {
    id: 'gsj',
    term: 'Garis Sempadan Jalan',
    abbreviation: 'GSJ',
    category: 'Regulasi & Tata Kota',
    definition: 'Garis batas terdepan pagar pekarangan yang membatasi kavling tanah dengan bahu jalan atau trotoar.',
    tropicalContext: 'Memastikan jaringan utilitas perkotaan (drainase air hujan, pipa, dan kabel bawah tanah) dapat ditempatkan di luar pagar rumah.',
    illustrationType: 'gsb'
  },
  {
    id: 'rth',
    term: 'Ruang Terbuka Hijau',
    abbreviation: 'RTH',
    category: 'Regulasi & Tata Kota',
    definition: 'Area memanjang/jalur atau mengelompok yang penggunaannya bersifat terbuka dan ditumbuhi tanaman hijau secara alami maupun terencana.',
    tropicalContext: 'Undang-Undang mensyaratkan 30% dari wilayah kota dialokasikan sebagai RTH (20% publik, 10% privat).',
    illustrationType: 'kdh'
  },
  {
    id: 'fasad',
    term: 'Fasad Bangunan (Façade)',
    category: 'Elemen Arsitektur',
    definition: 'Sisi luar atau tampak depan dan samping dari suatu bangunan yang mengekspresikan karakter arsitektural dan berinteraksi langsung dengan iklim.',
    tropicalContext: 'Fasad tropis memerlukan kisi-kisi penangkal surya (sun shading / secondary skin) pada orientasi timur dan barat untuk mereduksi radiasi termal.',
    illustrationType: 'facade'
  },
  {
    id: 'denah',
    term: 'Denah (Floor Plan)',
    category: 'Gambar Kerja',
    definition: 'Gambar tampak atas bangunan yang dipotong secara horizontal setinggi ±1 meter dari permukaan lantai untuk memperlihatkan tata letak ruang, dinding, pintu, dan jendela.',
    tropicalContext: 'Denah tropis yang baik mengutamakan denah terbuka (open plan) dan ketebalan massa bangunan yang ramping agar angin leluasa melintas.',
    illustrationType: 'plan'
  },
  {
    id: 'tampak',
    term: 'Tampak (Elevation)',
    category: 'Gambar Kerja',
    definition: 'Gambar proyeksi ortografis dua dimensi dari sisi luar bangunan (Depan, Belakang, Kiri, Kanan) tanpa efek perspektif.',
    tropicalContext: 'Menunjukkan proporsi tinggi lantai, bentuk atap pelana/limasan, posisi teritisan, dan bukaan ventilasi terhadap skala manusia.',
    illustrationType: 'facade'
  },
  {
    id: 'potongan',
    term: 'Potongan (Section)',
    category: 'Gambar Kerja',
    definition: 'Gambar irisan vertikal bangunan untuk memperlihatkan struktur pondasi, ruang dalam, plafon tinggi, struktur kuda-kuda atap, dan sirkulasi udara vertikal (stack effect).',
    tropicalContext: 'Plafon tinggi (3.5 - 4.5 meter) pada potongan tropis membantu mengalirkan udara panas naik ke atas dan keluar melalui ventilasi atap.',
    illustrationType: 'section'
  },
  {
    id: 'orientasi',
    term: 'Orientasi Surya',
    category: 'Kenyamanan & Iklim Tropis',
    definition: 'Arah hadap sumbu memanjang bangunan terhadap pergerakan semu matahari dari timur ke barat.',
    tropicalContext: 'Di Indonesia (termasuk Yogyakarta pada 7.8° LS), orientasi terbaik adalah membentang timur-barat dengan bukaan utama menghadap Utara atau Selatan agar terhindar dari panas terik langsung.',
    illustrationType: 'solar'
  },
  {
    id: 'ventilasi-silang',
    term: 'Ventilasi Silang (Cross Ventilation)',
    category: 'Kenyamanan & Iklim Tropis',
    definition: 'Sistem pertukaran udara alami di mana udara masuk melalui bukaan di satu sisi dan keluar melalui bukaan di sisi berlawanan atau tegak lurus akibat perbedaan tekanan angin.',
    tropicalContext: 'Sangat vital di iklim tropis lembap untuk mempercepat penguapan keringat pada kulit sehingga ruangan terasa sejuk tanpa ketergantungan AC.',
    illustrationType: 'ventilation'
  },
  {
    id: 'teritis',
    term: 'Teritisan / Overstek (Overhang)',
    category: 'Elemen Arsitektur',
    definition: 'Bagian atap yang menjorok keluar melebihi bidang dinding luar bangunan tanpa tiang penyangga tambahan.',
    tropicalContext: 'Lebar overstek minimal 1.0 - 1.5 meter sangat krusial di Indonesia untuk memayungi dinding dari panas surya dan mencegah tampias air hujan deras masuk melalui jendela.',
    illustrationType: 'overhang'
  },
  {
    id: 'dak',
    term: 'Dak Beton Datar',
    category: 'Elemen Arsitektur',
    definition: 'Konstruksi lantai atau atap beton bertulang horizontal.',
    tropicalContext: 'Dak datar di iklim tropis wajib memiliki kemiringan minimal 1-2% ke arah talang serta lapisan kedap air (waterproofing) agar tidak timbul genangan air dan lumut.',
    illustrationType: 'section'
  },
  {
    id: 'plinth',
    term: 'Plinth / Peninggian Lantai',
    category: 'Elemen Arsitektur',
    definition: 'Peninggian lantai dasar bangunan setinggi 30 hingga 60 cm di atas permukaan tanah atau jalan di sekitarnya.',
    tropicalContext: 'Melindungi interior rumah dari luapan air hujan permukaan jalan, kelembapan tanah naik (capillary rise), dan memberi kesan bangunan yang kokoh.',
    illustrationType: 'plinth'
  },
  {
    id: 'skala',
    term: 'Skala Manusia (Human Scale)',
    category: 'Elemen Arsitektur',
    definition: 'Proporsi ukuran elemen arsitektur (tinggi pintu 2.1m, lebar tangga, tinggi dinding 3m) yang dirancang sesuai dengan dimensi tubuh dan jangkauan manusia.',
    tropicalContext: 'Membuat ruang terasa akrab, nyaman secara psikologis, dan fungsional saat digunakan oleh penghuni.',
    illustrationType: 'scale'
  }
];
