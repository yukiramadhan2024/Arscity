import { RoofType, WallMaterialType } from '../buildings/PrefabTypes';

export interface ArchitecturalStyle {
  id: string;
  name: string;
  originEra: string;
  badge: string;
  description: string;
  historicalContext: string;
  signatureFeatures: string[];
  recommendedRoof: RoofType;
  recommendedMaterial: WallMaterialType;
  wallColorHex: string;
  roofColorHex: string;
  suggestedPrefabId: string;
}

export const ARCHITECTURAL_STYLES: ArchitecturalStyle[] = [
  {
    id: 'jawa-tradisional',
    name: 'Tradisional Jawa (Joglo & Limasan)',
    originEra: 'Abad ke-14 - Sekarang',
    badge: 'WARISAN NUSANTARA',
    description: 'Arsitektur vernakular adiluhung Jawa yang menyatu sempurna dengan iklim tropis lembap melalui atap bertingkat tajam dan struktur soko guru kayu jati.',
    historicalContext: 'Berevolusi berabad-abad di tanah Jawa untuk merespon gempa bumi melalui konstruksi tumpangsari pasak kayu fleksibel, serta sirkulasi hawa panas alami yang keluar melalui puncak atap brunjung tinggi.',
    signatureFeatures: [
      'Atap Joglo bertingkat tajam dengan teritisan lebar bebas tampias',
      'Struktur pilar kayu ekspos dan gebyok berukir',
      'Plinth (umpak batu) kokoh penahan rembesan tanah',
      'Pendapa terbuka tanpa dinding untuk ventilasi maksimal'
    ],
    recommendedRoof: 'joglo',
    recommendedMaterial: 'wood',
    wallColorHex: '#d97706',
    roofColorHex: '#b45309',
    suggestedPrefabId: 'joglo'
  },
  {
    id: 'kolonial-indische',
    name: 'Kolonial Indische (Hindia Belanda)',
    originEra: 'Akhir Abad ke-19 - 1940-an',
    badge: 'AKULTURASI KLASIK',
    description: 'Perkawinan antara estetika neo-klasik Eropa dengan kearifan lokal iklim tropis Hindia Belanda.',
    historicalContext: 'Para arsitek Belanda (seperti Maclaine Pont dan Thomas Karsten) menyadari bangunan gaya Eropa tertutup tidak cocok di Nusantara, sehingga melahirkan gaya Indische dengan langit-langit setinggi 4-5 meter, beranda depan luas, dan jendela krepyak jalusi ganda.',
    signatureFeatures: [
      'Plafon sangat tinggi (3.5 - 4.5m) menciptakan efek corong udara panas (stack effect)',
      'Jendela krepyak jalusi kayu ganda yang memasukkan angin tanpa silau',
      'Serambi depan (voorgalerij) dan serambi belakang luas',
      'Dinding bata tebal berlapis plester kapur putih peredam panas'
    ],
    recommendedRoof: 'hip',
    recommendedMaterial: 'plaster',
    wallColorHex: '#f8fafc',
    roofColorHex: '#b91c1c',
    suggestedPrefabId: 'school'
  },
  {
    id: 'modern-tropis',
    name: 'Modern Tropis Kontemporer',
    originEra: '1980-an - Sekarang',
    badge: 'DESAIN BERKELANJUTAN',
    description: 'Gaya arsitektur masa kini yang memadukan garis geometris bersih dengan teknologi fasad pasif penangkal iklim tropis.',
    historicalContext: 'Merespon pemanasan global dan krisis energi, arsitektur modern tropis meminimalisir konsumsi listrik pendingin ruangan melalui secondary skin, void tengah berventilasi, dan integrasi taman hijau dalam ruangan.',
    signatureFeatures: [
      'Bukaan jendela kaca besar yang dipayungi kisi-kisi penangkal surya (louver)',
      'Taman teras (inner courtyard) yang mengalirkan angin silang ke setiap kamar',
      'Kombinasi material alami: batu alam andesit, kayu ulin, dan plester halus',
      'Overstek dak beton tipis yang presisi dan fungsional'
    ],
    recommendedRoof: 'hip',
    recommendedMaterial: 'concrete',
    wallColorHex: '#e2e8f0',
    roofColorHex: '#334155',
    suggestedPrefabId: 'house_2story'
  },
  {
    id: 'minimalis-tropis',
    name: 'Minimalis Tropis Efisien',
    originEra: '2000-an - Sekarang',
    badge: 'FUNGSIONAL & PADAT',
    description: 'Pendekatan "less is more" yang disesuaikan untuk lahan perkotaan kompak di Indonesia dengan pemanfaatan ruang yang maksimal.',
    historicalContext: 'Lahir dari kebutuhan perumahan urban modern (seperti Rumah Tipe 36 dan 54) yang memerlukan biaya konstruksi efisien namun tetap sehat dengan sirkulasi cahaya dan udara optimal.',
    signatureFeatures: [
      'Bentuk massa kubus geometris tegas tanpa ornamen berlebih',
      'Warna monokromatik netral (putih, abu-abu semen, aksen kayu)',
      'Denah terbuka (open plan) menyatukan ruang keluarga dan dapur',
      'Atap miring satu sisi (shed roof) atau dak beton efisien'
    ],
    recommendedRoof: 'gable',
    recommendedMaterial: 'plaster',
    wallColorHex: '#f1f5f9',
    roofColorHex: '#475569',
    suggestedPrefabId: 'house_54'
  },
  {
    id: 'industrial-tropis',
    name: 'Industrial Tropis Urban',
    originEra: '2015-an - Sekarang',
    badge: 'EKSPOS & KARAKTER',
    description: 'Estetika material ekspos yang jujur dipadukan dengan penghijauan vertikal melimpah untuk kafe, ruko modern, dan co-working space.',
    historicalContext: 'Populer di kota-kota kreatif Indonesia seperti Yogyakarta, Bandung, dan Jakarta, mereduksi biaya finishing cat dengan menampilkan keindahan tekstur asli bata merah bakar dan beton semen ekspos.',
    signatureFeatures: [
      'Dinding bata merah ekspos dan unpolished concrete',
      'Rangka baja profil hitam dan kawat ram tanaman rambat (green facade)',
      'Bukaan ventilasi besar dan exhaust alami tinggi',
      'Konsep semi-outdoor yang fleksibel dan hemat energi'
    ],
    recommendedRoof: 'flat',
    recommendedMaterial: 'brick',
    wallColorHex: '#9a3412',
    roofColorHex: '#1e293b',
    suggestedPrefabId: 'ruko'
  }
];
