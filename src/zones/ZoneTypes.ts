import * as THREE from 'three';

export type ZoneType =
  | 'residential'
  | 'commercial'
  | 'office'
  | 'public_facility'
  | 'green_space'
  | 'mixed_use';

export interface ZoneRule {
  type: ZoneType;
  name: string;
  color: string;           // Hex color
  colorHexInt: number;
  maxKDB: number;          // Persentase maks koefisien dasar bangunan (misal 60%)
  maxKLB: number;          // Koefisien lantai bangunan maks (misal 1.5)
  minKDH: number;          // Persentase min koefisien dasar hijau (misal 20%)
  minGSB: number;          // GSB depan default (meter)
  minGSBFront: number;     // Jarak sempadan depan minimum ke as/sisi jalan (m)
  minGSBSide: number;      // Jarak sempadan samping minimum ke batas kavling (m)
  minGSBRear: number;      // Jarak sempadan belakang minimum (m)
  maxFloors: number;       // Batas tinggi lantai maksimum
  description: string;
  sources: {
    kdb: string;
    klb: string;
    kdh: string;
    gsb: string;
    height: string;
  };
}

export const BUILDING_CODE_DISCLAIMER =
  'Aturan disederhanakan untuk belajar, bukan pengganti ketentuan resmi (PBG dan RDTR daerah).';

export const ZONE_RULES: Record<ZoneType, ZoneRule> = {
  residential: {
    type: 'residential',
    name: 'Zona Hunian (R)',
    color: '#e07a38',
    colorHexInt: 0xe07a38,
    maxKDB: 60,
    maxKLB: 1.5,
    minKDH: 25,
    minGSB: 3.0,
    minGSBFront: 3.0,
    minGSBSide: 1.5,
    minGSBRear: 2.0,
    maxFloors: 3,
    description: 'Kawasan tempat tinggal asri dengan sirkulasi udara dan ruang resapan air yang cukup.',
    sources: {
      kdb: 'RDTR Perkotaan & Permen PUPR 29/2006 (Ilustrasi)',
      klb: 'Pedoman Standar Teknis Hunian (Ilustrasi)',
      kdh: 'Permen ATR/BPN No. 14/2021 (Ilustrasi)',
      gsb: 'Permen PUPR 29/2006 Pedoman Persyaratan Teknis Bangunan (Ilustrasi)',
      height: 'Standar Ketinggian Kawasan Permukiman (Ilustrasi)'
    }
  },
  commercial: {
    type: 'commercial',
    name: 'Zona Komersial (K)',
    color: '#0071e3',
    colorHexInt: 0x0071e3,
    maxKDB: 75,
    maxKLB: 3.0,
    minKDH: 10,
    minGSB: 4.0,
    minGSBFront: 4.0,
    minGSBSide: 1.5,
    minGSBRear: 2.0,
    maxFloors: 5,
    description: 'Kawasan perdagangan, pertokoan, dan ruko dengan akses pejalan kaki yang ramah.',
    sources: {
      kdb: 'RDTR Koridor Komersial (Ilustrasi)',
      klb: 'Pedoman Luas Lantai Komersial (Ilustrasi)',
      kdh: 'Permen ATR/BPN 14/2021 (Ilustrasi)',
      gsb: 'Permen PUPR 29/2006 (Ilustrasi)',
      height: 'Batas Ketinggian Koridor Utama (Ilustrasi)'
    }
  },
  office: {
    type: 'office',
    name: 'Zona Perkantoran (P)',
    color: '#5856d6',
    colorHexInt: 0x5856d6,
    maxKDB: 60,
    maxKLB: 4.0,
    minKDH: 15,
    minGSB: 5.0,
    minGSBFront: 5.0,
    minGSBSide: 2.5,
    minGSBRear: 3.0,
    maxFloors: 8,
    description: 'Kawasan sentra usaha dan perkantoran modern dengan area parkir dan taman teduh.',
    sources: {
      kdb: 'RDTR Pusat Bisnis (Ilustrasi)',
      klb: 'Intensitas Pemanfaatan Ruang Perkantoran (Ilustrasi)',
      kdh: 'Permen ATR/BPN 14/2021 (Ilustrasi)',
      gsb: 'Permen PUPR 29/2006 (Ilustrasi)',
      height: 'Standar Batas Tinggi Bangunan Sedang (Ilustrasi)'
    }
  },
  public_facility: {
    type: 'public_facility',
    name: 'Zona Fasilitas Umum (S)',
    color: '#ff453a',
    colorHexInt: 0xff453a,
    maxKDB: 50,
    maxKLB: 2.0,
    minKDH: 30,
    minGSB: 4.0,
    minGSBFront: 4.0,
    minGSBSide: 2.0,
    minGSBRear: 2.5,
    maxFloors: 4,
    description: 'Fasilitas sosial masyarakat (sekolah, puskesmas, balai warga, tempat ibadah).',
    sources: {
      kdb: 'SNI Fasilitas Lingkungan Perkotaan (Ilustrasi)',
      klb: 'Pedoman Bangunan Pelayanan Umum (Ilustrasi)',
      kdh: 'Permen ATR/BPN 14/2021 (Ilustrasi)',
      gsb: 'Permen PUPR 29/2006 (Ilustrasi)',
      height: 'Standar Keamanan Fasilitas Publik (Ilustrasi)'
    }
  },
  green_space: {
    type: 'green_space',
    name: 'Ruang Terbuka Hijau (RTH)',
    color: '#34c759',
    colorHexInt: 0x34c759,
    maxKDB: 10,
    maxKLB: 0.2,
    minKDH: 85,
    minGSB: 5.0,
    minGSBFront: 5.0,
    minGSBSide: 3.0,
    minGSBRear: 3.0,
    maxFloors: 1,
    description: 'Taman kota, hutan kota, dan area resapan air hujan penyejuk iklim mikro.',
    sources: {
      kdb: 'Permen ATR/BPN 14/2021 Pedoman RTH (Ilustrasi)',
      klb: 'Batas Fasilitas Pendukung Taman (Ilustrasi)',
      kdh: 'Permen PU 05/PRT/M/2008 RTH Perkotaan (Ilustrasi)',
      gsb: 'Perlindungan Sempadan Taman (Ilustrasi)',
      height: 'Gazebo & Pos Jaga Maksimal 1 Lantai (Ilustrasi)'
    }
  },
  mixed_use: {
    type: 'mixed_use',
    name: 'Zona Campuran (C)',
    color: '#bf5af2',
    colorHexInt: 0xbf5af2,
    maxKDB: 70,
    maxKLB: 2.5,
    minKDH: 15,
    minGSB: 3.5,
    minGSBFront: 3.5,
    minGSBSide: 1.5,
    minGSBRear: 2.0,
    maxFloors: 4,
    description: 'Kombinasi hunian dan usaha skala menengah yang hidup dan terintegrasi.',
    sources: {
      kdb: 'RDTR Kawasan Terpadu (Ilustrasi)',
      klb: 'Ketentuan Campuran Hunian-Usaha (Ilustrasi)',
      kdh: 'Permen ATR/BPN 14/2021 (Ilustrasi)',
      gsb: 'Permen PUPR 29/2006 (Ilustrasi)',
      height: 'Standar Ketinggian Ruko & Hunian (Ilustrasi)'
    }
  }
};

export interface BuildingCodeViolation {
  code: 'KDB' | 'KLB' | 'KDH' | 'GSB' | 'GSB_FRONT' | 'GSB_SIDE' | 'GSB_REAR' | 'GSS' | 'HEIGHT' | 'OUT_OF_BOUNDS' | 'CROSS_LOTS' | 'COLLISION';
  title: string;
  actual: number | string;
  allowed: number | string;
  message: string;
  advice: string;
}

export interface LotParcel {
  id: string;
  name: string;
  zone: ZoneType;
  position: THREE.Vector3; // Center position of lot
  width: number;           // Width along road in meters
  length: number;          // Depth in meters
  areaM2: number;          // Total lot area in m2
  containedBuildingIds: string[];

  // Evaluated Building Code Metrics
  metrics: {
    groundFootprintM2: number;
    totalFloorAreaM2: number;
    greenAreaM2: number;
    pavedAreaM2: number;
    kdbPercent: number;
    klbRatio: number;
    kdhPercent: number;
    gsbFrontActualM: number;
    gsbSideActualM: number;
    gsbRearActualM: number;
    gsbDistanceM: number;
    maxFloors: number;
  };
  violations: BuildingCodeViolation[];
}
