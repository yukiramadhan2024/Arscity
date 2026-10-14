import { BuildingInstance } from '../buildings/PrefabTypes';

export interface StructuralIssue {
  type: 'excessive_span' | 'irregular_plan' | 'soft_story' | 'extreme_slenderness' | 'excessive_cantilever';
  title: string;
  description: string;
  penalty: number;
  remedy: string;
  standardRef: string;
}

export interface StructuralReport {
  score: number; // 0 to 100
  rating: 'Sangat Tangguh' | 'Cukup Baik' | 'Perlu Penguatan' | 'Kritis (Rawan Runtuh)';
  issues: StructuralIssue[];
  whyExplanation: string;
  hasSoftStory: boolean;
  maxSpanM: number;
  aspectRatio: number;
  slendernessRatio: number;
  cantileverOverhangM: number;
}

export interface StructuralStandardsConfig {
  maxAllowableSpanM: number;        // default 6.0 m (SNI 2847-2019)
  maxPlanAspectRatio: number;       // default 3.0 (SNI 1726-2019)
  maxSlendernessRatio: number;      // default 4.0 (SNI 1726-2019)
  maxCantileverOverhangM: number;   // default 1.5 m (SNI 2847-2019)
}

export class StructuralChecker {
  private static instance: StructuralChecker;

  public config: StructuralStandardsConfig = {
    maxAllowableSpanM: 6.0,
    maxPlanAspectRatio: 3.0,
    maxSlendernessRatio: 4.0,
    maxCantileverOverhangM: 1.5,
  };

  public standardsSources = {
    span: 'SNI 2847-2019 (Persyaratan Beton Struktural untuk Bangunan Gedung)',
    planRegularity: 'SNI 1726-2019 (Tata Cara Perencanaan Ketahanan Gempa untuk Struktur Gedung)',
    softStory: 'SNI 1726-2019 Pasal 7.3 (Ketidakteraturan Tingkat Lunak Seismik)',
    slenderness: 'SNI 1726-2019 (Stabilitas Guling Struktur Tinggi)',
    cantilever: 'Pedoman Teknis Bangunan Tahan Gempa Kementerian PUPR',
    earthquakeHistoricalContext: 'Pelajaran Gempa Yogyakarta 27 Mei 2006 (Mw 6.3)'
  };

  public static getInstance(): StructuralChecker {
    if (!this.instance) {
      this.instance = new StructuralChecker();
    }
    return this.instance;
  }

  /**
   * Evaluates structural integrity, seismic vulnerability, and compliance for a building instance.
   */
  public evaluateBuilding(bld: BuildingInstance): StructuralReport {
    const issues: StructuralIssue[] = [];
    let score = 100;

    const w = bld.width;
    const l = bld.length;
    const minDim = Math.min(w, l);
    const maxDim = Math.max(w, l);
    const totalHeight = bld.floorCount * (bld.floorHeight || 3.2) + 2.5;

    // 1. Beam Span Check
    const maxSpan = Math.max(w, l);
    if (maxSpan > this.config.maxAllowableSpanM) {
      const penalty = Math.min(30, Math.round((maxSpan - this.config.maxAllowableSpanM) * 5));
      score -= penalty;
      issues.push({
        type: 'excessive_span',
        title: `Bentang Balok Melebihi Batas (${maxSpan.toFixed(1)} m > ${this.config.maxAllowableSpanM} m)`,
        description: 'Bentang balok bebas kolom yang terlalu panjang memicu defleksi lentur berlebih dan konsentrasi retak geser saat terjadi guncangan gempa.',
        penalty,
        remedy: 'Tambahkan grid kolom antara atau perbesar dimensi balok induk beton bertulang.',
        standardRef: this.standardsSources.span
      });
    }

    // 2. Irregular / Elongated Plan Check (Torsi Seismik)
    const aspectRatio = maxDim / (minDim || 1);
    if (aspectRatio > this.config.maxPlanAspectRatio) {
      const penalty = 20;
      score -= penalty;
      issues.push({
        type: 'irregular_plan',
        title: `Denah Terlalu Pipih / Asimetris (Rasio ${aspectRatio.toFixed(1)}:1)`,
        description: 'Bentuk denah yang terlampau memanjang memicu torsi seismik horizontal tak berimbang yang memelintir sendi plastis kolom di sudut bangunan.',
        penalty,
        remedy: 'Gunakan dilatasi (expansion/seismic joint) membagi massa menjadi modul mendekati persegi (rasio < 1:2.5).',
        standardRef: this.standardsSources.planRegularity
      });
    }

    // 3. Soft Story (Tingkat Lunak di Lantai Dasar)
    // Multi-story buildings where ground floor is open retail/garage while upper floors have heavier masonry
    const isSoftStoryPreset = bld.presetKey === 'ruko_3fl' || (bld.floorCount >= 3 && bld.presetKey === 'office_tower');
    if (isSoftStoryPreset) {
      const penalty = 25;
      score -= penalty;
      issues.push({
        type: 'soft_story',
        title: 'Potensi Keruntuhan Tingkat Lunak (Soft Story Effect)',
        description: 'Lantai dasar terbuka lebar tanpa dinding pengisi menciptakan ketimpangan kekakuan lateral drastis dibanding lantai atas. Kolom lantai dasar memikul deformasi geser ekstrem saat gempa.',
        penalty,
        remedy: 'Tambahkan portal bresing baja penahan gempa (bracing) atau dinding geser beton (shear wall) di lantai dasar.',
        standardRef: this.standardsSources.softStory
      });
    }

    // 4. Extreme Slenderness Ratio (Tinggi vs Lebar)
    const slendernessRatio = totalHeight / (minDim || 1);
    if (slendernessRatio > this.config.maxSlendernessRatio) {
      const penalty = 20;
      score -= penalty;
      issues.push({
        type: 'extreme_slenderness',
        title: `Rasio Kelangsingan Berisiko Guling (${slendernessRatio.toFixed(1)}:1)`,
        description: 'Bangunan tinggi dengan tapak sempit menghasilkan momen guling lateral besar terhadap pondasi saat gempa bumi.',
        penalty,
        remedy: 'Perlebar dasar tapak pondasi atau integrasikan core lift sentral beton bertulang masif.',
        standardRef: this.standardsSources.slenderness
      });
    }

    // 5. Excessive Cantilever Overhang
    const overhang = bld.roofOverhang || 1.2;
    if (overhang > this.config.maxCantileverOverhangM) {
      const penalty = 15;
      score -= penalty;
      issues.push({
        type: 'excessive_cantilever',
        title: `Kantilever Teritisan Berlebih (${overhang.toFixed(1)} m > ${this.config.maxCantileverOverhangM} m)`,
        description: 'Kantilever teritisan atap tanpa konsol penyangga rawan patah lelah akibat beban angin kencang dan gaya inersia vertikal gempa.',
        penalty,
        remedy: 'Berikan kolom konsol penyangga atau kurangi teritisan menjadi maks 1.5 m.',
        standardRef: this.standardsSources.cantilever
      });
    }

    score = Math.max(10, Math.min(100, score));

    let rating: StructuralReport['rating'];
    if (score >= 90) rating = 'Sangat Tangguh';
    else if (score >= 75) rating = 'Cukup Baik';
    else if (score >= 50) rating = 'Perlu Penguatan';
    else rating = 'Kritis (Rawan Runtuh)';

    const whyExplanation =
      'Berdasarkan dokumentasi Gempa Yogyakarta 27 Mei 2006 (Mw 6.3), lebih dari 150.000 bangunan luluh lantak bukan karena kekencangan gempa semata, melainkan karena kegagalan ikatan sambungan kolom-balok (detail penulangan tanpa kait 135°) dan fenomena soft story. Struktur dengan denah simetris dan ikatan ring balok utuh terbukti mampu melindungi keselamatan penghuni.';

    return {
      score,
      rating,
      issues,
      whyExplanation,
      hasSoftStory: isSoftStoryPreset,
      maxSpanM: maxSpan,
      aspectRatio: Math.round(aspectRatio * 10) / 10,
      slendernessRatio: Math.round(slendernessRatio * 10) / 10,
      cantileverOverhangM: overhang
    };
  }
}

export const structuralChecker = StructuralChecker.getInstance();
