export interface WhyPrinciple {
  id: string;
  targetType: 'lot' | 'road' | 'building' | 'solar' | 'ventilation' | 'roof';
  question: string;
  explanation: string;
  architecturalRule: string;
  practicalTip: string;
}

export const WHY_PRINCIPLES: Record<string, WhyPrinciple> = {
  // Lot & Zoning
  kdb_principle: {
    id: 'kdb_principle',
    targetType: 'lot',
    question: 'Kenapa Koefisien Dasar Bangunan (KDB) dibatasi 60%?',
    explanation: 'Di daerah tropis dengan curah hujan tinggi seperti Indonesia, tanah butuh area terbuka untuk meresapkan air ke dalam akuifer tanah. Jika 100% tanah ditutup beton, air hujan akan meluap ke saluran jalan dan memicu banjir genangan.',
    architecturalRule: 'Peraturan Zonasi: KDB Hunian Maksimal 60%, KDH Minimal 20%.',
    practicalTip: 'Sisakan halaman depan dan belakang rumah sebagai taman hijau resapan.'
  },
  gsb_principle: {
    id: 'gsb_principle',
    targetType: 'lot',
    question: 'Kenapa dinding bangunan harus mundur dari jalan (GSB)?',
    explanation: 'Garis Sempadan Bangunan (GSB) memastikan ada jarak pandang yang aman bagi pengendara di persimpangan, memungkinkan angin dan cahaya matahari masuk ke koridor jalan, serta memberi ruang privasi dari kebisingan jalan.',
    architecturalRule: 'Standar Teknis: GSB = 1/2 Lebar Jalan + 1 meter.',
    practicalTip: 'Manfaatkan area GSB sebagai pekarangan hijau, carport, atau teras depan peneduh.'
  },

  // Building Elements
  overhang_principle: {
    id: 'overhang_principle',
    targetType: 'roof',
    question: 'Kenapa atap tropis membutuhkan teritisan (overstek) yang lebar?',
    explanation: 'Teritisan lebar (1.0 - 1.5 meter) berfungsi ganda sebagai payung peneduh: mencegah radiasi panas matahari mengenai dinding kaca secara langsung dan melindungi jendela dari tampias air hujan deras disertai angin kencang.',
    architecturalRule: 'Prinsip Desain Pasif: Teritisan efektif minimal 1.0 m dari bidang dinding luar.',
    practicalTip: 'Pilih tipe atap Pelana atau Joglo dengan kemiringan tajam dan overstek lebar.'
  },
  plinth_principle: {
    id: 'plinth_principle',
    targetType: 'building',
    question: 'Kenapa lantai dasar rumah (plinth) ditinggikan 30-50 cm dari jalan?',
    explanation: 'Peninggian lantai dasar melindungi bagian dalam rumah dari luapan air drainase saat hujan lebat, memutus kelembapan rembesan tanah (kapilaritas), dan memberikan hierarki ruang transisi yang anggun antara jalan publik dan ruang privat.',
    architecturalRule: 'Standar Hunian Sehat: Elevasi lantai dasar +30 s.d +60 cm di atas as jalan.',
    practicalTip: 'Rancang 2-3 anak tangga di pintu masuk untuk transisi ergonomis.'
  },
  solar_orientation_principle: {
    id: 'solar_orientation_principle',
    targetType: 'solar',
    question: 'Kenapa sumbu panjang bangunan sebaiknya menghadap Utara-Selatan?',
    explanation: 'Matahari terbit di timur dan tenggelam di barat menghasilkan sudut elevasi rendah yang menyinari dinding secara tegak lurus dan sangat menyengat. Dengan menghadapkan bukaan utama ke Utara atau Selatan, rumah mendapat cahaya alami terang benderang (daylighting) tanpa kepanasan.',
    architecturalRule: 'Orientasi Surya Tropis: Fasad Timur & Barat seminimal mungkin dari jendela besar.',
    practicalTip: 'Beri kisi-kisi kayu/aluminium (sun-shading louver) jika jendela terpaksa menghadap Barat.'
  },
  cross_ventilation_principle: {
    id: 'cross_ventilation_principle',
    targetType: 'ventilation',
    question: 'Kenapa jendela harus saling berhadapan (ventilasi silang)?',
    explanation: 'Udara hanya dapat mengalir jika ada perbedaan tekanan: udara masuk lewat sisi tekanan tinggi (windward) dan keluar lewat sisi tekanan rendah (leeward). Satu jendela saja hanya memutar udara di tepi tanpa mendinginkan ruangan.',
    architecturalRule: 'Aero-dinamika Tropis: Luas bukaan ventilasi minimal 10-15% dari luas lantai.',
    practicalTip: 'Pastikan ada bukaan di dua sisi dinding berbeda atau pasang jalusi angin di atas kusen.'
  },

  // Roads & Streetscapes
  sidewalk_shade_principle: {
    id: 'sidewalk_shade_principle',
    targetType: 'road',
    question: 'Kenapa trotoar wajib memiliki pohon peneduh?',
    explanation: 'Di kota-kota khatulistiwa, trotoar terbuka tanpa naungan bisa mencapai suhu permukaan 45°C di siang hari, membuat warga enggan berjalan kaki. Pohon peneduh menurunkan suhu mikro hingga 3-5°C melalui efek transpirasi dan keteduhan tajuk daun.',
    architecturalRule: 'Perancangan Koridor Jalan: Jarak tanam pohon peneduh tiap 6-8 meter di trotoar.',
    practicalTip: 'Pilih profil jalan Kolektor atau Arteri yang sudah dilengkapi trotoar dan pohon otomatis.'
  }
};

export const getWhyPrincipleForContext = (context: {
  hasLotViolations?: boolean;
  isBuildingSelected?: boolean;
  isRoadSelected?: boolean;
  isAnalysisMode?: boolean;
  roofType?: string;
}): WhyPrinciple => {
  if (context.hasLotViolations) {
    return WHY_PRINCIPLES.kdb_principle;
  }
  if (context.roofType && (context.roofType === 'joglo' || context.roofType === 'pelana')) {
    return WHY_PRINCIPLES.overhang_principle;
  }
  if (context.isBuildingSelected) {
    return WHY_PRINCIPLES.plinth_principle;
  }
  if (context.isRoadSelected) {
    return WHY_PRINCIPLES.sidewalk_shade_principle;
  }
  if (context.isAnalysisMode) {
    return WHY_PRINCIPLES.solar_orientation_principle;
  }
  return WHY_PRINCIPLES.kdb_principle;
};
