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
  },
  dining: {
    type: 'dining',
    displayName: 'Ruang Makan Keluarga',
    minAreaM2: 6.0,
    minDimensionM: 2.2,
    minCeilingHeightM: 2.6,
    source: 'SNI 03-1733-2004 (Tata Ruang Hunian Tropis)',
    description: 'Ruang makan dengan meja makan, kursi sirkulasi leluasa, dan kedekatan akses ke dapur bersih.'
  },
  retail_storefront: {
    type: 'retail_storefront',
    displayName: 'Ruang Usaha / Etalase Ruko',
    minAreaM2: 12.0,
    minDimensionM: 3.0,
    minCeilingHeightM: 3.0,
    source: 'Pedoman Teknis Bangunan Gedung Komersial & Pertokoan',
    description: 'Area niaga terbuka lantai dasar dengan meja kasir, rak pajangan produk, dan etalase kaca menghadap jalan.'
  },
  cafe_dining: {
    type: 'cafe_dining',
    displayName: 'Area Pengunjung & Bar Kafe',
    minAreaM2: 12.0,
    minDimensionM: 3.0,
    minCeilingHeightM: 2.8,
    source: 'Standar Sirkulasi Kuliner & Kafe Tropis',
    description: 'Ruang duduk pengunjung kafe dengan konter bar kopi dan meja bistro terbuka yang terang.'
  },
  office_workstation: {
    type: 'office_workstation',
    displayName: 'Ruang Kerja & Workstation',
    minAreaM2: 12.0,
    minDimensionM: 3.0,
    minCeilingHeightM: 2.8,
    source: 'SNI 6197:2011 & Pedoman Perkantoran Modern',
    description: 'Zona kerja perkantoran dengan deretan meja komputer ergonomis dan pencahayaan alami curtain wall.'
  },
  lobby_reception: {
    type: 'lobby_reception',
    displayName: 'Lobi & Resepsionis Utama',
    minAreaM2: 10.0,
    minDimensionM: 3.0,
    minCeilingHeightM: 3.2,
    source: 'Pedoman Aksesibilitas Bangunan Gedung Publik',
    description: 'Area penyambutan utama gedung dengan meja resepsionis, area tunggu tamu, dan orientasi sirkulasi vertikal.'
  },
  conference_room: {
    type: 'conference_room',
    displayName: 'Ruang Rapat / Meeting',
    minAreaM2: 10.0,
    minDimensionM: 3.0,
    minCeilingHeightM: 2.8,
    source: 'Standar Fasilitas Ruang Pertemuan Perkantoran',
    description: 'Ruang rapat tertutup dengan meja konferensi besar, kursi peserta, dan layar presentasi.'
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
