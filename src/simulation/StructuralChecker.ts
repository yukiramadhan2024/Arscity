import * as THREE from 'three';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { proceduralAudio } from '../audio/ProceduralAudio';

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

    // 1. Beam Span Check (Traditional Saka Guru in Joglo & Modular frames subdivide span across 3x3 column grids)
    const isTimberModular = bld.presetKey === 'joglo' || bld.presetKey === 'rumah_modular' || (bld as any).type === 'joglo';
    const effectiveSpan = isTimberModular ? maxDim / 3.0 : maxDim;
    if (effectiveSpan > this.config.maxAllowableSpanM) {
      const penalty = Math.min(30, Math.round((effectiveSpan - this.config.maxAllowableSpanM) * 5));
      score -= penalty;
      issues.push({
        type: 'excessive_span',
        title: `Bentang Balok Melebihi Batas (${effectiveSpan.toFixed(1)} m > ${this.config.maxAllowableSpanM} m)`,
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
      maxSpanM: maxDim,
      aspectRatio: Math.round(aspectRatio * 10) / 10,
      slendernessRatio: Math.round(slendernessRatio * 10) / 10,
      cantileverOverhangM: overhang
    };
  }

  private isSimulatingShake: boolean = false;

  public isShaking(): boolean {
    return this.isSimulatingShake;
  }

  public stopEarthquakeShakeTest(): void {
    this.isSimulatingShake = false;
    proceduralAudio.stopEarthquakeRumble();
  }

  /**
   * 15-Second Earthquake Mw 6.3 Shake Test Simulation.
   * Simulates seismic tremor dynamics (P-wave onset, S-wave strong motion peak, coda attenuation),
   * applying camera jitter, procedural sub-bass ground rumble, and dynamic horizontal shear oscillation to buildings,
   * with pulsating alert red crack highlights on structurally vulnerable entities while Joglo & Modular homes remain stable.
   */
  public triggerEarthquakeShakeTest(
    engine: any,
    onComplete?: (reportSummary: { totalVulnerableCount: number }) => void
  ): void {
    if (this.isSimulatingShake || !engine) return;
    this.isSimulatingShake = true;

    // Start procedural low-frequency earthquake rumble sound
    proceduralAudio.playEarthquakeRumble(15);

    const buildingManager = engine.buildingManager;
    const camera = engine.cameraController?.activeCamera || engine.cameraController?.camera;

    // Track vulnerable buildings and store original transforms
    const initialBuildingTransforms = new Map<
      string,
      { posX: number; rotZ: number; group: THREE.Group; isVulnerable: boolean }
    >();
    const alertHighlights: THREE.BoxHelper[] = [];

    let vulnerableCount = 0;
    let bldIndex = 0;

    for (const [id, bld] of buildingManager.buildings.entries()) {
      const grp = buildingManager.buildingGroups?.get(id);
      if (!grp) continue;

      const report = this.evaluateBuilding(bld);
      // Joglo (traditional interlocking timber) and Rumah Modular remain structurally resilient & stable
      const isJogloOrModular = bld.presetKey === 'joglo' || bld.presetKey === 'rumah_modular' || (bld as any).type === 'joglo' || (bld as any).type === 'rumah_modular';
      const isVulnerable = !isJogloOrModular && (report.score < 75 || report.hasSoftStory || report.aspectRatio > 2.8);

      if (isVulnerable) {
        vulnerableCount++;
        // Add red crack/stress alert highlight box helper
        const helper = new THREE.BoxHelper(grp, 0xff3b30);
        (helper.material as THREE.Material).transparent = true;
        (helper.material as THREE.Material).opacity = 0.9;
        engine.scene.add(helper);
        alertHighlights.push(helper);
      }

      initialBuildingTransforms.set(id, {
        posX: grp.position.x,
        rotZ: grp.rotation.z,
        group: grp,
        isVulnerable
      });
      bldIndex++;
    }

    const startTime = performance.now();
    const durationMs = 15000; // 15 seconds real-time Mw 6.3 seismic simulation
    const origCamPos = camera ? camera.position.clone() : new THREE.Vector3();

    const animateShake = (now: number) => {
      const elapsedMs = now - startTime;
      const elapsedSec = elapsedMs / 1000;

      if (elapsedMs >= durationMs || !this.isSimulatingShake) {
        // Stop audio rumble
        proceduralAudio.stopEarthquakeRumble();

        // Reset and restore all positions
        for (const record of initialBuildingTransforms.values()) {
          record.group.position.x = record.posX;
          record.group.rotation.z = record.rotZ;
        }

        // Dispose temporary alert highlights
        for (const h of alertHighlights) {
          engine.scene.remove(h);
          h.geometry.dispose();
          (h.material as THREE.Material).dispose();
        }
        alertHighlights.length = 0;

        if (camera) {
          camera.position.copy(origCamPos);
        }

        this.isSimulatingShake = false;
        if (onComplete) {
          onComplete({ totalVulnerableCount: vulnerableCount });
        }
        return;
      }

      // Seismic envelope E(t):
      // P-wave buildup (0 -> 2.5s)
      // S-wave peak & strong motion (2.5s -> 10.5s)
      // Coda attenuation (10.5s -> 15.0s)
      let envelope = 1.0;
      if (elapsedSec < 2.5) {
        envelope = elapsedSec / 2.5;
      } else if (elapsedSec > 10.5) {
        envelope = Math.max(0, (15.0 - elapsedSec) / 4.5);
      }

      // 1. Camera seismic ground micro-vibrations
      if (camera) {
        const jitterX = Math.sin(elapsedSec * 32) * 0.25 * envelope;
        const jitterY = Math.cos(elapsedSec * 26) * 0.15 * envelope;
        camera.position.set(
          origCamPos.x + jitterX,
          origCamPos.y + jitterY,
          origCamPos.z + (jitterX * 0.5)
        );
      }

      // 2. Building shear oscillations & dynamic deformation
      let idx = 0;
      for (const record of initialBuildingTransforms.values()) {
        if (record.isVulnerable) {
          // Sharp swaying for soft-story or torsion-prone buildings
          const shearRot = Math.sin(elapsedSec * 16 + idx) * 0.05 * envelope;
          const shearShift = Math.sin(elapsedSec * 14 + idx) * 0.28 * envelope;
          record.group.rotation.z = record.rotZ + shearRot;
          record.group.position.x = record.posX + shearShift;
        } else {
          // Stable buildings (Joglo, Modular, symmetric low-rise) have minimal, elastic response
          const rigidShift = Math.sin(elapsedSec * 10 + idx) * 0.02 * envelope;
          record.group.position.x = record.posX + rigidShift;
          record.group.rotation.z = record.rotZ;
        }
        idx++;
      }

      // 3. Pulse alert highlights
      const pulseOpacity = 0.4 + 0.5 * Math.abs(Math.sin(elapsedSec * 8));
      for (const h of alertHighlights) {
        (h.material as THREE.Material).opacity = pulseOpacity;
        h.update();
      }

      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(animateShake);
      } else {
        setTimeout(() => animateShake(performance.now()), 16);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(animateShake);
    } else {
      setTimeout(() => animateShake(performance.now()), 16);
    }
  }
}

export const structuralChecker = StructuralChecker.getInstance();

