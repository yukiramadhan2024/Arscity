import { RoomType, RoomDefinition } from './InteriorTypes';

export interface RoomStandardRule {
  type: RoomType;
  displayName: string;
  minAreaM2: number;
  minDimensionM: number;
  minCeilingHeightM: number;
  source: string;
  description: string;
}

export const DEFAULT_ROOM_STANDARDS: Record<RoomType, RoomStandardRule> = {
  bedroom: {
    type: 'bedroom',
    displayName: 'Kamar Tidur',
    minAreaM2: 9.0,
    minDimensionM: 2.7,
    minCeilingHeightM: 2.6,
    source: 'SNI 03-1733-2004 & Kepmenkes 829/1999 (Persyaratan Kesehatan Rumah)',
    description: 'Ruang istirahat pribadi yang memerlukan ventilasi silang, pencahayaan alami, dan sirkulasi perabot dasar (tempat tidur, lemari).'
  },
  living_room: {
    type: 'living_room',
    displayName: 'Ruang Keluarga / Tamu',
    minAreaM2: 12.0,
    minDimensionM: 3.0,
    minCeilingHeightM: 2.8,
    source: 'SNI 03-1733-2004 Tata Cara Perencanaan Lingkungan Perumahan',
    description: 'Pusat interaksi komunal keluarga yang membutuhkan sirkulasi lapang dan ketinggian plafon optimal untuk kenyamanan termal tropis.'
  },
  kitchen: {
    type: 'kitchen',
    displayName: 'Dapur',
    minAreaM2: 4.0,
    minDimensionM: 1.8,
    minCeilingHeightM: 2.6,
    source: 'SNI 03-1733-2004 (Ilustrasi Standar Dapur Bersih Tropis)',
    description: 'Area pengolahan makanan dengan persyaratan pembuangan uap panas, sirkulasi kerja segitiga dapur (sink, kompor, kulkas).'
  },
  bathroom: {
    type: 'bathroom',
    displayName: 'Kamar Mandi / WC',
    minAreaM2: 2.25,
    minDimensionM: 1.5,
    minCeilingHeightM: 2.4,
    source: 'Permen PUPR No. 29/PRT/M/2006 (Pedoman Teknis Fasilitas Sanitasi)',
    description: 'Ruang basah dan sanitasi higienis berdimensi minimal 1.5 x 1.5 m dengan kemiringan lantai pembuangan air yang memadai.'
  },
  terrace: {
    type: 'terrace',
    displayName: 'Teras / Lanai',
    minAreaM2: 2.5,
    minDimensionM: 1.2,
    minCeilingHeightM: 2.4,
    source: 'Pedoman Teknis Ruang Terbuka Rumah Tropis (Ilustrasi)',
    description: 'Ruang transisi semi-terbuka penyerap angin sejuk dan pelindung pintu masuk dari tempias hujan tropis.'
  },
  corridor: {
    type: 'corridor',
    displayName: 'Koridor / Sirkulasi',
    minAreaM2: 1.8,
    minDimensionM: 0.9,
    minCeilingHeightM: 2.4,
    source: 'Permen PUPR No. 14/PRT/M/2017 (Standar Aksesibilitas Sirkulasi Bangunan)',
    description: 'Lorong lalu lintas penghubung antar-ruang dengan lebar bebas minimal 0.9 m untuk pergerakan leluasa.'
  },
  service_area: {
    type: 'service_area',
    displayName: 'Area Servis / Cuci Jemur',
    minAreaM2: 3.0,
    minDimensionM: 1.5,
    minCeilingHeightM: 2.4,
    source: 'Pedoman Tata Ruang Rumah Sehat Kementerian Kesehatan (Ilustrasi)',
    description: 'Area cuci, jemur, dan utilitas rumah dengan pasokan sinar matahari langsung dan sirkulasi udara luar.'
  }
};

class RoomStandardsRegistry {
  private static instance: RoomStandardsRegistry;
  public standards: Record<RoomType, RoomStandardRule>;
  public defaultWallThicknessM: number = 0.15;

  private constructor() {
    this.standards = JSON.parse(JSON.stringify(DEFAULT_ROOM_STANDARDS));
  }

  public static getInstance(): RoomStandardsRegistry {
    if (!RoomStandardsRegistry.instance) {
      RoomStandardsRegistry.instance = new RoomStandardsRegistry();
    }
    return RoomStandardsRegistry.instance;
  }

  public getStandard(type: RoomType): RoomStandardRule {
    return this.standards[type] || DEFAULT_ROOM_STANDARDS[type];
  }

  public updateStandard(type: RoomType, updates: Partial<RoomStandardRule>): void {
    if (this.standards[type]) {
      this.standards[type] = {
        ...this.standards[type],
        ...updates
      };
    }
  }

  public resetToDefaults(): void {
    this.standards = JSON.parse(JSON.stringify(DEFAULT_ROOM_STANDARDS));
  }

  public evaluateRoomCompliance(room: RoomDefinition): { isCompliant: boolean; note?: string } {
    const std = this.getStandard(room.type);
    if (!std) return { isCompliant: true };

    if (room.areaM2 < std.minAreaM2 - 0.05) {
      return {
        isCompliant: false,
        note: `Luas ${room.areaM2.toFixed(1)} m² kurang dari standar minimum ${std.minAreaM2.toFixed(1)} m² (${std.source}).`
      };
    }

    if (room.ceilingHeight < std.minCeilingHeightM - 0.05) {
      return {
        isCompliant: false,
        note: `Tinggi plafon ${room.ceilingHeight.toFixed(1)} m kurang dari standar kenyamanan ${std.minCeilingHeightM.toFixed(1)} m.`
      };
    }

    return { isCompliant: true };
  }
}

export const roomStandardsRegistry = RoomStandardsRegistry.getInstance();
