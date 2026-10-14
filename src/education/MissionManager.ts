import { Engine } from '../core/engine/Engine';
import { RoadEdge } from '../roads/RoadTypes';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { LotParcel } from '../zones/ZoneTypes';
import { runoffSimulator } from '../simulation/RunoffSimulator';
import { costEstimator } from '../simulation/CostEstimator';
import { calculateSolarPosition, YOGYAKARTA_LATITUDE, YOGYAKARTA_LONGITUDE } from '../core/math/SolarPosition';

export interface MissionObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  progressText?: string;
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  level: 'Pemula' | 'Menengah' | 'Mahir' | 'Master' | 'Sandbox';
  starsRequired: [string, string, string]; // Descriptions for star 1, 2, 3
  hint: string;
  architecturalLesson: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'mission_1',
    title: 'Pondasi Lingkungan Asri',
    subtitle: 'Membangun jalan lingkungan pertama dan hunian ramah lingkungan',
    level: 'Pemula',
    starsRequired: [
      'Bangun jaringan jalan sepanjang minimal 30 meter',
      'Buat kavling hunian dan tempatkan 1 rumah (Tipe 36 atau 54)',
      'Pertahankan KDB kavling ≤ 60% tanpa pelanggaran Building Code'
    ],
    hint: 'Gunakan alat Jalan (R) untuk menghubungkan titik, lalu buat kavling dengan alat Zonasi (Z) sebelum menaruh rumah.',
    architecturalLesson: 'Rumah tinggal tropis membutuhkan sisa lahan terbuka minimal 40% untuk resapan air hujan dan sirkulasi angin segar.'
  },
  {
    id: 'mission_2',
    title: 'Harmoni Tropis Joglo & Resapan Air',
    subtitle: 'Pelestarian arsitektur vernakular Nusantara dengan resapan hijau tinggi',
    level: 'Menengah',
    starsRequired: [
      'Bangun minimal 1 unit Rumah Tradisional Joglo',
      'Pastikan kavling memiliki Koefisien Daerah Hijau (KDH) ≥ 30%',
      'KDB kavling ≤ 50% dan GSB terpenuhi dengan aman'
    ],
    hint: 'Rumah Joglo memiliki overstek lebar yang memayungi tanah. Berikan halaman yang cukup luas agar nilai KDH tetap tinggi.',
    architecturalLesson: 'Bentuk atap Joglo dengan brunjung menjulang adalah pendingin pasif terbaik yang diciptakan nenek moyang di tanah Jawa.'
  },
  {
    id: 'mission_3',
    title: 'Koridor Komersial & Pedestrian Teduh',
    subtitle: 'Merancang ruko bertingkat di tepi jalan kolektor dengan trotoar ramah pejalan kaki',
    level: 'Mahir',
    starsRequired: [
      'Bangun jalan tipe Kolektor atau Arteri (lebar ≥ 9m) sepanjang minimal 50 meter',
      'Tempatkan minimal 2 unit Ruko di zona Komersial',
      'Seluruh ruko mematuhi batas GSB aman tanpa pelanggaran'
    ],
    hint: 'Jalan Kolektor otomatis memiliki trotoar dan pohon peneduh yang menurunkan suhu mikro bagi pejalan kaki.',
    architecturalLesson: 'Kawasan perdagangan yang sukses memadukan kepadatan tinggi dengan kenyamanan pejalan kaki yang teduh dari terik khatulistiwa.'
  },
  {
    id: 'mission_4',
    title: 'Kawasan Fasilitas Publik Terpadu',
    subtitle: 'Membangun sekolah, fasilitas kesehatan, atau tempat ibadah yang terhubung',
    level: 'Master',
    starsRequired: [
      'Bangun minimal 2 fasilitas umum (Sekolah, Masjid, Puskesmas, atau Balai Warga)',
      'Hubungkan kawasan dengan Jalur Pejalan Kaki atau Jalur Sepeda',
      'Semua fasilitas bebas pelanggaran dengan rasio hijau total ≥ 25%'
    ],
    hint: 'Pilih tipe jalan Pejalan Kaki atau Sepeda di alat Jalan untuk membuat koridor aman tanpa kendaraan bermotor.',
    architecturalLesson: 'Aksesibilitas ramah anak dan lansia adalah tolak ukur peradaban tata kota yang humanis.'
  },
  {
    id: 'mission_5',
    title: 'Kavling 6 x 12 m di Gang Sempit',
    subtitle: 'Menata hunian efisien di gang 3.5 meter dengan batas sempadan ketat',
    level: 'Menengah',
    starsRequired: [
      'Bangun akses Gang Lingkungan (Alley 3.5m) sepanjang minimal 20 meter',
      'Tempatkan Rumah Tipe 36 atau 54 pada kavling gang',
      'Penuhi batas GSB depan dan pertahankan KDB kavling ≤ 60%'
    ],
    hint: 'Gunakan tipe jalan Gang Lingkungan pada alat Jalan. Pada gang sempit, perhatikan teritisan atap agar tidak menjorok ke ruang milik jalan.',
    architecturalLesson: 'Kampung kota tropis yang padat dapat tetap nyaman jika menjaga sirkulasi gang dan tidak melanggar sempadan bangunan.'
  },
  {
    id: 'mission_6',
    title: 'Hari Tanpa Bayangan (Kulminasi Utama)',
    subtitle: 'Mengamati fenomena matahari tepat di atas Yogyakarta dan evaluasi kanopi',
    level: 'Mahir',
    starsRequired: [
      'Atur tanggal simulasi ke awal Maret (hari ~60) atau pertengahan Oktober (hari ~286)',
      'Atur waktu ke tengah hari surya Yogyakarta (11:30 - 11:45 WIB)',
      'Amati sudut bayangan matahari tegak lurus (panjang bayangan hilang di bawah teritisan)'
    ],
    hint: 'Buka panel Langit/Cuaca atau slider waktu, geser jam ke sekitar 11:38 WIB saat matahari melintasi meridian lokal Yogyakarta (110.37° BT).',
    architecturalLesson: 'Saat Hari Tanpa Bayangan, radiasi matahari langsung memapar atap dengan intensitas puncak. Teritisan kanopi horizontal melindungi bukaan dinding dari silau vertikal.'
  },
  {
    id: 'mission_7',
    title: 'Kawasan Tangguh Banjir (Nol Genangan)',
    subtitle: 'Mengendalikan limpasan air hujan tropis dengan sumur resapan dan biopori',
    level: 'Mahir',
    starsRequired: [
      'Tempatkan minimal 2 Sumur Resapan dan 2 Lubang Biopori dengan alat Lansekap',
      'Pertahankan KDH kawasan ≥ 30% dengan taman berumput atau pohon peneduh',
      'Capai Skor Risiko Genangan rendah (< 30) pada simulasi limpasan air hujan'
    ],
    hint: 'Gunakan alat Lansekap (taman rumput, sumur resapan, biopori) di dekat cekungan dan cek hasilnya di panel Analisis -> Banjir.',
    architecturalLesson: 'Banjir perkotaan bukan takdir, melainkan kegagalan meresapkan air ke tanah akibat kanalisasi perkerasan kedap air.'
  },
  {
    id: 'mission_8',
    title: 'Optimalisasi Anggaran Konstruksi (RAB)',
    subtitle: 'Membangun lingkungan lengkap dengan kendali batas anggaran biaya',
    level: 'Master',
    starsRequired: [
      'Bangun minimal 3 bangunan dan jaringan jalan minimal 40 meter',
      'Kendalikan total anggaran kota di bawah batas Rp 1.500.000.000',
      'Seluruh bangunan dan kavling bebas dari pelanggaran regulasi'
    ],
    hint: 'Pilih prefab rumah efisien dan atur proporsi denah agar tidak berlebihan. Cek rincian biaya di panel Inspector.',
    architecturalLesson: 'Arsitektur yang bijak menyeimbangkan kualitas ruang, kekuatan struktur tahan gempa, dan keterjangkauan biaya pembiayaan.'
  }
];

export interface MissionProgress {
  missionId: string;
  earnedStars: number; // 0 to 3
  starCompleted: [boolean, boolean, boolean];
  isFinished: boolean;
}

export class MissionManager {
  private engine: Engine;
  public currentMissionId: string = 'mission_1';
  public progressMap: Map<string, MissionProgress> = new Map();
  public onMissionUpdated?: (progress: MissionProgress) => void;

  constructor(engine: Engine) {
    this.engine = engine;
    MISSIONS.forEach((m) => {
      this.progressMap.set(m.id, {
        missionId: m.id,
        earnedStars: 0,
        starCompleted: [false, false, false],
        isFinished: false
      });
    });
  }

  public selectMission(missionId: string): void {
    this.currentMissionId = missionId;
    this.evaluate();
  }

  public getCurrentMission(): Mission | undefined {
    return MISSIONS.find((m) => m.id === this.currentMissionId);
  }

  public getCurrentProgress(): MissionProgress {
    let p = this.progressMap.get(this.currentMissionId);
    if (!p) {
      p = {
        missionId: this.currentMissionId,
        earnedStars: 0,
        starCompleted: [false, false, false],
        isFinished: false
      };
      this.progressMap.set(this.currentMissionId, p);
    }
    return p;
  }

  public evaluate(): MissionProgress {
    const p = this.getCurrentProgress();
    const roads: RoadEdge[] = Array.from(this.engine.roadManager.graph.edges.values());
    const buildings: BuildingInstance[] = Array.from(this.engine.buildingManager.buildings.values());
    const lots: LotParcel[] = Array.from(this.engine.lotManager.lots.values());

    let totalRoadLengthM = 0;
    roads.forEach((edge: RoadEdge) => {
      totalRoadLengthM += edge.length;
    });

    const starCompleted: [boolean, boolean, boolean] = [false, false, false];

    if (this.currentMissionId === 'mission_1') {
      // Misi 1
      starCompleted[0] = totalRoadLengthM >= 30;

      const hasHouse = buildings.some((b: BuildingInstance) => b.presetKey.includes('house'));
      const hasResidentialLot = lots.some((l: LotParcel) => l.zone === 'residential');
      starCompleted[1] = hasHouse && hasResidentialLot;

      const residentialLots = lots.filter((l: LotParcel) => l.zone === 'residential');
      const compliantLot = residentialLots.some(
        (l: LotParcel) => l.metrics.kdbPercent <= 60 && l.violations.length === 0
      );
      starCompleted[2] = residentialLots.length > 0 && compliantLot;
    } else if (this.currentMissionId === 'mission_2') {
      // Misi 2
      const hasJoglo = buildings.some((b: BuildingInstance) => b.presetKey === 'joglo');
      starCompleted[0] = hasJoglo;

      const hasHighKdh = lots.some((l: LotParcel) => l.metrics.kdhPercent >= 30);
      starCompleted[1] = hasJoglo && hasHighKdh;

      const compliantJogloLot = lots.some(
        (l: LotParcel) => l.metrics.kdbPercent <= 50 && l.violations.length === 0 && l.metrics.kdhPercent >= 30
      );
      starCompleted[2] = compliantJogloLot;
    } else if (this.currentMissionId === 'mission_3') {
      // Misi 3
      const collectorRoads = roads.filter((r: RoadEdge) => r.type === 'collector' || r.type === 'arterial');
      let collectorLen = 0;
      collectorRoads.forEach((edge: RoadEdge) => {
        collectorLen += edge.length;
      });
      starCompleted[0] = collectorLen >= 50;

      const rukoCount = buildings.filter((b: BuildingInstance) => b.presetKey === 'ruko').length;
      const commercialLots = lots.filter((l: LotParcel) => l.zone === 'commercial');
      starCompleted[1] = rukoCount >= 2 && commercialLots.length >= 1;

      const compliantCommercial = commercialLots.some(
        (l: LotParcel) => l.violations.length === 0 && l.metrics.kdbPercent <= 70
      );
      starCompleted[2] = rukoCount >= 2 && compliantCommercial;
    } else if (this.currentMissionId === 'mission_4') {
      // Misi 4
      const publicBuildings = buildings.filter((b: BuildingInstance) =>
        ['school', 'masjid', 'clinic', 'community'].includes(b.presetKey)
      );
      starCompleted[0] = publicBuildings.length >= 2;

      const pedestrianRoads = roads.filter((r: RoadEdge) => r.type === 'pedestrian' || r.type === 'cycle');
      starCompleted[1] = pedestrianRoads.length >= 1 && publicBuildings.length >= 2;

      const noLotViolations = lots.length > 0 && lots.every((l: LotParcel) => l.violations.length === 0);
      starCompleted[2] = starCompleted[1] && noLotViolations;
    } else if (this.currentMissionId === 'mission_5') {
      // Misi 5: Kavling di Gang Sempit (Alley 3.5m)
      const alleyRoads = roads.filter((r: RoadEdge) => r.type === 'alley');
      let alleyLen = 0;
      alleyRoads.forEach((e) => { alleyLen += e.length; });
      starCompleted[0] = alleyLen >= 20;

      const houses = buildings.filter((b) => b.presetKey.includes('house'));
      starCompleted[1] = houses.length >= 1 && alleyRoads.length >= 1;

      const compliantHouseLot = lots.some(
        (l) => l.violations.length === 0 && l.metrics.kdbPercent <= 60 && houses.length >= 1
      );
      starCompleted[2] = compliantHouseLot;
    } else if (this.currentMissionId === 'mission_6') {
      // Misi 6: Hari Tanpa Bayangan (Kulminasi Utama)
      // Kulminasi Yogyakarta around day 60 (early March) or day 286 (mid October)
      // Sun directly overhead at solar noon (~11:38 WIB)
      const day = (this.engine as any).currentDayOfYear ?? 60;
      const hour = (this.engine as any).currentTimeOfDay ?? 12.0;

      const isEquinoxPeriod = (day >= 55 && day <= 65) || (day >= 280 && day <= 292);
      starCompleted[0] = isEquinoxPeriod;

      const isSolarNoonWib = hour >= 11.45 && hour <= 11.85; // 11:27 - 11:51 WIB
      starCompleted[1] = isSolarNoonWib;

      const coords = calculateSolarPosition(hour, day, YOGYAKARTA_LATITUDE, YOGYAKARTA_LONGITUDE);
      // Elevation close to 90 degrees (zenith) => zenith angle < 3 degrees
      const isZenith = coords.altitude >= (87 * Math.PI / 180);
      starCompleted[2] = isEquinoxPeriod && isSolarNoonWib && isZenith;
    } else if (this.currentMissionId === 'mission_7') {
      // Misi 7: Kawasan Tangguh Banjir (Nol Genangan)
      let wellCount = 0;
      let bioporeCount = 0;
      for (const item of this.engine.landscapeManager.items.values()) {
        if (item.type === 'well') wellCount++;
        else if (item.type === 'biopore') bioporeCount++;
      }
      starCompleted[0] = wellCount >= 2 && bioporeCount >= 2;

      const hasAdequateKdh = lots.length > 0 && lots.some((l) => l.metrics.kdhPercent >= 30);
      starCompleted[1] = starCompleted[0] && hasAdequateKdh;

      const runoffReport = runoffSimulator.evaluateCityRunoff(
        this.engine.terrain,
        this.engine.roadManager,
        this.engine.buildingManager,
        this.engine.landscapeManager,
        this.engine.lotManager
      );
      starCompleted[2] = starCompleted[1] && runoffReport.inundationRiskScore < 30;
    } else if (this.currentMissionId === 'mission_8') {
      // Misi 8: Optimalisasi Anggaran (RAB)
      starCompleted[0] = buildings.length >= 3 && totalRoadLengthM >= 40;

      const budget = costEstimator.estimateCityBudget(
        this.engine.buildingManager,
        this.engine.roadManager,
        this.engine.landscapeManager
      );
      const isBudgetWithinLimit = budget.totalCityCost <= 1_500_000_000 && budget.totalCityCost > 0;
      starCompleted[1] = starCompleted[0] && isBudgetWithinLimit;

      const allLotsValid = lots.length > 0 && lots.every((l) => l.violations.length === 0);
      starCompleted[2] = isBudgetWithinLimit && allLotsValid;
    }

    const earnedStars = (starCompleted[0] ? 1 : 0) + (starCompleted[1] ? 1 : 0) + (starCompleted[2] ? 1 : 0);
    p.starCompleted = starCompleted;
    p.earnedStars = earnedStars;
    p.isFinished = earnedStars === 3;

    if (this.onMissionUpdated) {
      this.onMissionUpdated(p);
    }
    return p;
  }
}
