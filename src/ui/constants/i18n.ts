/**
 * Arscity Unified Internationalization & Terminology Dictionary (i18n.ts)
 * Standar Kebahasaan & Kosakata Bahasa Indonesia Resmi Arscity
 * 
 * Aturan Kebahasaan:
 * 1. 100% Bahasa Indonesia baku untuk ranah tata kota & arsitektur Nusantara.
 * 2. Tanpa emoji pada judul, label tombol, dan istilah teknis.
 * 3. Istilah SNI mengacu pada standar resmi Kementerian PUPR & SNI Arsitektur Tropis.
 */

export interface ToolI18n {
  id: string;
  label: string;
  hint: string;
  shortcut: string;
  description: string;
}

export const MAIN_TOOLS_I18N: Record<string, ToolI18n> = {
  select: {
    id: 'select',
    label: 'Pilih',
    hint: 'Klik objek, kavling, atau jalan untuk melihat rincian inspeksi',
    shortcut: 'V',
    description: 'Pilih dan periksa elemen kota'
  },
  road: {
    id: 'road',
    label: 'Jalan',
    hint: 'Klik titik awal lalu klik titik tujuan untuk membangun jaringan jalan',
    shortcut: 'R',
    description: 'Bangun jalan aspal dan trotoar pejalan kaki'
  },
  zone: {
    id: 'zone',
    label: 'Zona',
    hint: 'Pilih kavling untuk menetapkan peruntukan lahan (Komersial, Hunian, Publik)',
    shortcut: 'Z',
    description: 'Bagi peruntukan kawasan kota'
  },
  build: {
    id: 'build',
    label: 'Bangun',
    hint: 'Pilih model bangunan lalu klik pada kavling yang sesuai untuk mendirikan gedung',
    shortcut: 'B',
    description: 'Katalog arsitektur bangunan nusantara & modern'
  },
  nature: {
    id: 'nature',
    label: 'Lansekap',
    hint: 'Pilih vegetasi atau perabot luar ruang dan letakkan di area terbuka',
    shortcut: 'T',
    description: 'Penghijauan, taman tropis, dan perabot jalan'
  },
  terraform: {
    id: 'terraform',
    label: 'Tanah dan Air',
    hint: 'Pahat saluran air, ratakan kontur tanah, atau bangun tanggul sungai',
    shortcut: 'W',
    description: 'Bentuk topografi, sungai, dan perairan'
  },
  demolish: {
    id: 'demolish',
    label: 'Bongkar',
    hint: 'Arahkan buldoser ke gedung atau segmen jalan yang ingin dirobohkan',
    shortcut: 'X',
    description: 'Hapus dan bersihkan kavling atau infrastruktur'
  },
  analyze: {
    id: 'analyze',
    label: 'Analisis',
    hint: 'Pantau radiasi matahari, ventilasi angin, dan kesesuaian aturan bangunan',
    shortcut: 'A',
    description: 'Laboratorium simulasi termal dan mikroklimat'
  }
};

export const CAMERA_MODES_I18N = {
  orbit: {
    id: 'orbit',
    label: 'Orbit',
    detail: 'Klik kanan & seret untuk memutar • Gulir untuk jarak pandang'
  },
  first_person: {
    id: 'first_person',
    label: 'Pejalan Kaki',
    detail: 'Tombol WASD untuk melangkah • Tab untuk menu perabot interior'
  },
  cinematic_drone: {
    id: 'cinematic_drone',
    label: 'Drone',
    detail: 'Navigasi sinematik halus dari ketinggian dinamis'
  }
} as const;

export const GLOSSARY_SNI_TERMS: Record<string, { term: string; definition: string; sniStandard?: string }> = {
  KDB: {
    term: 'KDB (Koefisien Dasar Bangunan)',
    definition: 'Persentase perbandingan antara luas tapak dasar bangunan terhadap luas kavling. Berfungsi menjaga ketersediaan ruang terbuka alami di permukaan tanah.',
    sniStandard: 'SNI 03-1733-2004'
  },
  KLB: {
    term: 'KLB (Koefisien Lantai Bangunan)',
    definition: 'Angka kelipatan perbandingan antara total luas seluruh lantai bangunan terhadap luas kavling. Mengendalikan kepadatan vertikal kawasan.',
    sniStandard: 'Permen PU No. 29/PRT/M/2006'
  },
  KDH: {
    term: 'KDH (Koefisien Dasar Hijau)',
    definition: 'Persentase luas area terbuka di luar bangunan yang diperuntukkan bagi penghijauan dan resapan air alami terhadap luas kavling.',
    sniStandard: 'Permen ATR/BPN No. 14/2021'
  },
  GSB: {
    term: 'GSB (Garis Sempadan Bangunan)',
    definition: 'Batas jarak minimum terluar dinding bangunan terhadap as jalan raya atau batas tepi kavling untuk menjamin keselamatan dan sirkulasi udara.',
    sniStandard: 'UU No. 28 Tahun 2002'
  },
  RTH: {
    term: 'RTH (Ruang Terbuka Hijau)',
    definition: 'Area memanjang atau mengelompok yang pemanfaatannya bersifat terbuka, tempat tumbuh tanaman secara alami maupun budidaya.',
    sniStandard: 'UU No. 26 Tahun 2007'
  },
  ACH: {
    term: 'ACH (Air Changes per Hour)',
    definition: 'Laju pergantian volume udara dalam ruangan setiap jam untuk menjaga kesegaran dan mendinginkan suhu secara pasif (standar tropis: 4-6 ACH).',
    sniStandard: 'SNI 03-6572-2001'
  },
  Lux: {
    term: 'Lux (Iluminansi Cahaya)',
    definition: 'Satuan intensitas penerangan cahaya alami pada bidang kerja ruangan (standar ruang kerja/hunian tropis: 150-300 Lux).',
    sniStandard: 'SNI 03-6197-2020'
  }
};
