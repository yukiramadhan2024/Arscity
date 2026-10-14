import * as fs from 'fs';
import * as path from 'path';

/**
 * ============================================================================
 * ARSCITY SYSTEM AUDIT & BUG TESTER
 * Automated verification suite for architecture, assets, UI sync,
 * storage quotas, schema migration, and solar astrodynamics.
 * ============================================================================
 */

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'CONFLICT' | 'WARN';
  summary: string;
  details: string[];
  recommendation?: string;
}

const ROOT_DIR = process.cwd();
const results: TestResult[] = [];

console.log('\n=============================================================');
console.log('       ARSCITY AUDIT & BUG TESTER SUITE');
console.log('=============================================================\n');

// ----------------------------------------------------------------------------
// TEST 1: REAL TEXTURES VS PROCEDURAL GENERATOR
// ----------------------------------------------------------------------------
function testTextures(): void {
  const details: string[] = [];
  let hasFailures = false;

  const publicDir = path.join(ROOT_DIR, 'public');
  const texturesDir = path.join(publicDir, 'textures');
  const proceduralFile = path.join(ROOT_DIR, 'src', 'materials', 'ProceduralTextureGen.ts');
  const designFile = path.join(ROOT_DIR, 'DESIGN.md');
  const creditsFile = path.join(ROOT_DIR, 'CREDITS.md');

  // Check 1: Does public/textures exist?
  const publicExists = fs.existsSync(publicDir);
  const texturesExists = fs.existsSync(texturesDir);
  details.push(`Folder 'public/' ada: ${publicExists ? 'YA' : 'TIDAK (Hilang)'}`);
  details.push(`Folder 'public/textures/' ada: ${texturesExists ? 'YA' : 'TIDAK (Hilang)'}`);

  if (!texturesExists) {
    hasFailures = true;
    details.push('-> Tidak ditemukan folder aset tekstur CC0 di repository.');
  }

  // Check 2: Check ambientCG / PolyHaven files
  const cc0FilesExpected = [
    'asphalt_albedo.jpg',
    'concrete_albedo.jpg',
    'brick_albedo.jpg',
    'roof_tile_albedo.jpg',
    'wood_albedo.jpg',
    'grass_albedo.jpg'
  ];

  let downloadedCount = 0;
  if (texturesExists) {
    const existing = fs.readdirSync(texturesDir);
    cc0FilesExpected.forEach((f) => {
      if (existing.includes(f)) downloadedCount++;
    });
  }
  details.push(`File CC0 terunduh: ${downloadedCount}/${cc0FilesExpected.length}`);

  // Check 3: Check ProceduralTextureGen.ts code
  if (fs.existsSync(proceduralFile)) {
    const code = fs.readFileSync(proceduralFile, 'utf8');
    const hasProceduralCanvas = code.includes('createCanvas') && code.includes('CanvasTexture');
    const hasExternalLoader = code.includes('TextureLoader') || code.includes('ambientCG') || code.includes('fetch');
    
    details.push(`Procedural Canvas generator aktif: ${hasProceduralCanvas ? 'YA' : 'TIDAK'}`);
    details.push(`Loader eksternal CC0 ambientCG di kode: ${hasExternalLoader ? 'ADA' : 'TIDAK ADA'}`);

    if (!hasExternalLoader) {
      details.push('-> ProceduralTextureGen murni menggunakan Canvas2D sintetis tanpa mekanisme muat CC0.');
    }
  }

  // Check 4: Check DESIGN.md & CREDITS.md claims
  if (fs.existsSync(designFile)) {
    const designText = fs.readFileSync(designFile, 'utf8');
    const mentionsProceduralDefault = designText.includes('Procedural By Default') || designText.includes('prosedural');
    details.push(`DESIGN.md menetapkan procedural sebagai default: ${mentionsProceduralDefault ? 'YA' : 'TIDAK'}`);
  }

  results.push({
    id: 'TEX-001',
    name: 'Audit Pipeline Tekstur Real (CC0 ambientCG vs Prosedural Canvas)',
    category: 'Aset & Rendering',
    status: hasFailures ? 'CONFLICT' : 'PASS',
    summary: 'Bentrok antara permintaan tekstur real CC0 dengan implementasi procedural Canvas default.',
    details,
    recommendation: 'Jika tekstur real CC0 diinginkan sebagai default: sediakan script download aset ambientCG ke public/textures/ dan tambahkan loader THREE.TextureLoader dengan fallback prosedural otomatis jika offline.'
  });
}

// ----------------------------------------------------------------------------
// TEST 2: UI SYNCHRONIZATION & DESIGN SPECIFICATION (iOS 27 vs Docs)
// ----------------------------------------------------------------------------
function testUiSync(): void {
  const details: string[] = [];
  let hasConflict = false;

  const designFile = path.join(ROOT_DIR, 'DESIGN.md');
  const readmeFile = path.join(ROOT_DIR, 'README.md');
  const indexCssFile = path.join(ROOT_DIR, 'src', 'app', 'index.css');

  // Check 1: DESIGN.md Section 5
  if (fs.existsSync(designFile)) {
    const design = fs.readFileSync(designFile, 'utf8');
    const hasSlateGlass = design.includes('rgba(15, 23, 42, 0.75)');
    const hasTealAccent = design.includes('#06b6d4') || design.includes('Vivid Teal');
    const hasIos27 = design.includes('iOS 27') || design.includes('Liquid Glass Refined');

    details.push(`DESIGN.md masih mencatat Glassmorphic Slate (rgba 15,23,42): ${hasSlateGlass ? 'YA (Usang)' : 'TIDAK'}`);
    details.push(`DESIGN.md masih mencatat aksen Teal (#06b6d4): ${hasTealAccent ? 'YA (Usang)' : 'TIDAK'}`);
    details.push(`DESIGN.md mencatat spesifikasi iOS 27: ${hasIos27 ? 'SUDAH' : 'BELUM MASUK'}`);

    if (hasSlateGlass || hasTealAccent || !hasIos27) {
      hasConflict = true;
    }
  }

  // Check 2: README.md Emojis & Palette
  if (fs.existsSync(readmeFile)) {
    const readme = fs.readFileSync(readmeFile, 'utf8');
    // Check for emoji in markdown headings
    const headingLines = readme.split('\n').filter((l) => l.startsWith('#'));
    const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]/u;
    const headingsWithEmoji = headingLines.filter((l) => emojiRegex.test(l));

    details.push(`Judul heading di README dengan emoji: ${headingsWithEmoji.length} ditemukan (${headingsWithEmoji.map(h => h.trim()).slice(0, 3).join(', ')}...)`);
    
    const hasReadmeTeal = readme.includes('aksen teal');
    details.push(`README masih menyebut aksen teal: ${hasReadmeTeal ? 'YA (Usang)' : 'TIDAK'}`);

    if (headingsWithEmoji.length > 0 || hasReadmeTeal) {
      hasConflict = true;
    }
  }

  // Check 3: index.css iOS 27 Tokens
  if (fs.existsSync(indexCssFile)) {
    const css = fs.readFileSync(indexCssFile, 'utf8');
    const hasIos27Css = css.includes('iOS 27 (LIQUID GLASS REFINED)');
    const hasAppleAccent = css.includes('--accent: #007AFF;') || css.includes('#0A84FF');
    const hasCapsuleRadius = css.includes('--radius-capsule: 9999px;');
    const hasLightMode = css.includes('--bg-grouped: #F2F2F7;');

    details.push(`index.css menerapkan iOS 27 Liquid Glass: ${hasIos27Css ? 'YA' : 'TIDAK'}`);
    details.push(`index.css menggunakan aksen Apple Blue (#007AFF): ${hasAppleAccent ? 'YA' : 'TIDAK'}`);
    details.push(`index.css menggunakan radius konsentris/kapsul: ${hasCapsuleRadius ? 'YA' : 'TIDAK'}`);
    details.push(`index.css mode terang sebagai standar: ${hasLightMode ? 'YA' : 'TIDAK'}`);
  }

  results.push({
    id: 'UI-002',
    name: 'Sinkronisasi Spesifikasi UI (iOS 27 Liquid Glass vs Dokumen)',
    category: 'Desain & Antarmuka',
    status: hasConflict ? 'CONFLICT' : 'PASS',
    summary: 'Kode CSS sudah dimigrasi ke iOS 27 Liquid Glass, namun DESIGN.md dan README.md masih tertinggal pada spek lama (slate/teal/emoji).',
    details,
    recommendation: 'Sinkronkan Seksi 5 DESIGN.md dan README.md: hapus emoji dari judul, perbarui palet ke Apple System Blue (#007AFF) + Light Mode default, dan masukkan cetak biru iOS 27 Liquid Glass Refined.'
  });
}

// ----------------------------------------------------------------------------
// TEST 3: README COMPLIANCE (PATH LOKAL, OFFLINE READY, LISENSI MIT)
// ----------------------------------------------------------------------------
function testReadmeCompliance(): void {
  const details: string[] = [];
  let hasFailures = false;

  const readmeFile = path.join(ROOT_DIR, 'README.md');
  const licenseFile = path.join(ROOT_DIR, 'LICENSE');
  const licenseMdFile = path.join(ROOT_DIR, 'LICENSE.md');
  const swFile = path.join(ROOT_DIR, 'public', 'sw.js');
  const swSrcFile = path.join(ROOT_DIR, 'src', 'sw.js');
  const indexHtml = path.join(ROOT_DIR, 'index.html');

  // Check 1: Local file path in README.md
  if (fs.existsSync(readmeFile)) {
    const readme = fs.readFileSync(readmeFile, 'utf8');
    const hasLocalCPath = readme.includes('file:///c:/') || readme.includes('file:///C:/');
    details.push(`README.md menggunakan tautan file lokal absolut (file:///c:/): ${hasLocalCPath ? 'YA (BUG: Tautan Rusak)' : 'TIDAK'}`);
    if (hasLocalCPath) {
      hasFailures = true;
      details.push('-> Tautan CREDITS.md di baris 75 harus relatif (./CREDITS.md), bukan file:///c:/Projects/...');
    }
  }

  // Check 2: LICENSE file presence
  const hasLicense = fs.existsSync(licenseFile) || fs.existsSync(licenseMdFile);
  details.push(`File berkas LICENSE / LICENSE.md di root repositori: ${hasLicense ? 'ADA' : 'TIDAK ADA (Klaim MIT tanpa berkas lisensi)'}`);
  if (!hasLicense) {
    hasFailures = true;
    details.push('-> Klaim "Semua kode di bawah lisensi MIT" mewajibkan adanya file LICENSE legal berisi teks MIT License.');
  }

  // Check 3: Service Worker for Offline-Ready claim
  const hasSwFile = fs.existsSync(swFile) || fs.existsSync(swSrcFile);
  let hasSwRegister = false;
  if (fs.existsSync(indexHtml)) {
    const html = fs.readFileSync(indexHtml, 'utf8');
    hasSwRegister = html.includes('serviceWorker.register') || html.includes('navigator.serviceWorker');
  }

  details.push(`File Service Worker (sw.js): ${hasSwFile ? 'ADA' : 'TIDAK ADA'}`);
  details.push(`Registrasi Service Worker di aplikasi: ${hasSwRegister ? 'TERDAFTAR' : 'TIDAK ADA'}`);

  if (!hasSwFile || !hasSwRegister) {
    hasFailures = true;
    details.push('-> Klaim "Offline-Ready" pada web app memerlukan Service Worker untuk caching aset dan index.html saat browser dibuka tanpa internet.');
  }

  results.push({
    id: 'DOC-003',
    name: 'Kepatuhan Repositori (Link Relatif, Berkas LICENSE, & Service Worker PWA)',
    category: 'Dokumentasi & Standar',
    status: hasFailures ? 'FAIL' : 'PASS',
    summary: 'Tautan CREDITS.md rusak di luar mesin lokal, file LICENSE tidak ada, dan klaim Offline-Ready belum didukung Service Worker.',
    details,
    recommendation: 'Ganti tautan CREDITS.md ke ./CREDITS.md, buat berkas LICENSE resmi bertuliskan lisensi MIT, dan tambahkan pwa/service-worker sederhana.'
  });
}

// ----------------------------------------------------------------------------
// TEST 4: STORAGE QUOTA & JSON SCHEMA MIGRATION
// ----------------------------------------------------------------------------
function testStorageAndSchema(): void {
  const details: string[] = [];
  let hasPotentialBug = false;

  const localStorageFile = path.join(ROOT_DIR, 'src', 'io', 'LocalStorageManager.ts');
  const citySerializerFile = path.join(ROOT_DIR, 'src', 'io', 'CitySerializer.ts');

  // Check 1: Storage mechanism
  if (fs.existsSync(localStorageFile)) {
    const code = fs.readFileSync(localStorageFile, 'utf8');
    const usesLocalStorage = code.includes('localStorage.setItem');
    const usesIndexedDb = code.includes('indexedDB') || code.includes('idb');

    details.push(`Penyimpanan menggunakan localStorage (kuota ~5 MB): ${usesLocalStorage ? 'YA' : 'TIDAK'}`);
    details.push(`Penyimpanan menggunakan IndexedDB (kuota ratusan MB/GB): ${usesIndexedDb ? 'YA' : 'BELUM'}`);

    if (usesLocalStorage && !usesIndexedDb) {
      hasPotentialBug = true;
      details.push('-> Potensi Bug QuotaExceededError: Kota berukuran sedang/besar dengan ratusan jalan dan bangunan dapat melampaui 5 MB dan gagal disimpan.');
    }
  }

  // Check 2: Schema versioning & migration in CitySerializer
  if (fs.existsSync(citySerializerFile)) {
    const code = fs.readFileSync(citySerializerFile, 'utf8');
    const writesVersion = code.includes("version: '1.0.0'");
    const hasMigrationLogic = code.includes('migrate') || code.includes('upgrade') || code.includes('data.version <');

    details.push(`Serializer menyertakan nomor versi: ${writesVersion ? 'YA (v1.0.0)' : 'TIDAK'}`);
    details.push(`Deserializer memiliki fungsi migrasi skema JSON: ${hasMigrationLogic ? 'ADA' : 'TIDAK ADA'}`);

    if (!hasMigrationLogic) {
      hasPotentialBug = true;
      details.push('-> Potensi Bug Kompatibilitas: Deserializer langsung mengurai field tanpa pemeriksaan versi skema; simpanan lama atau berkas dengan struktur baru dapat merusak parsing Three.js.');
    }
  }

  // Check 3: Synthetic Payload Size Benchmark
  // Estimasi ukuran kota dengan 300 gedung, 150 jalan, 80 kavling
  const dummyNodes = Array.from({ length: 200 }, (_, i) => ({
    id: `node_${i}`,
    x: Math.random() * 500,
    y: 0,
    z: Math.random() * 500,
    connectedEdgeIds: [`edge_${i}`, `edge_${i + 1}`]
  }));
  const dummyEdges = Array.from({ length: 150 }, (_, i) => ({
    id: `edge_${i}`,
    startNodeId: `node_${i}`,
    endNodeId: `node_${i + 1}`,
    type: 'collector',
    controlPoints: Array.from({ length: 4 }, () => [Math.random() * 500, 0, Math.random() * 500]),
    length: 60.5
  }));
  const dummyBuildings = Array.from({ length: 300 }, (_, i) => ({
    id: `bld_${i}`,
    presetKey: 'house_36',
    name: `Rumah ${i}`,
    category: 'residential',
    position: [Math.random() * 500, 0, Math.random() * 500],
    rotationY: Math.random() * Math.PI,
    width: 8,
    length: 12,
    floorCount: 2,
    floorHeight: 3.2,
    roofType: 'gable',
    roofOverhang: 1.0,
    wallMaterial: 'brick',
    wallColor: '#ffffff',
    roofMaterial: 'clay_tile'
  }));

  const samplePayload = JSON.stringify({
    version: '1.0.0',
    cityTitle: 'Kota Megapolitan Tropis',
    timestamp: Date.now(),
    roads: { nodes: dummyNodes, edges: dummyEdges },
    buildings: dummyBuildings,
    lots: []
  });

  const payloadSizeKb = (Buffer.byteLength(samplePayload, 'utf8') / 1024).toFixed(1);
  details.push(`Simulasi payload kota 300 gedung + 150 ruas jalan: ${payloadSizeKb} KB (dalam format JSON teks)`);
  details.push(`Batas 5 MB tercapai jika riwayat kota atau data poligon kustom bertambah ~30-40 slot/autosave.`);

  results.push({
    id: 'STO-004',
    name: 'Evaluasi Kapasitas Penyimpanan (localStorage vs IndexedDB) & Migrasi Skema',
    category: 'Penyimpanan & I/O',
    status: hasPotentialBug ? 'WARN' : 'PASS',
    summary: 'localStorage rentan kehabisan kuota 5 MB pada kota besar, dan CitySerializer belum memiliki adaptor migrasi skema bertahap.',
    details,
    recommendation: 'Gunakan IndexedDB sebagai backend utama dengan fallback ke localStorage, serta terapkan fungsi migrateSchema(data) dengan nomor versi integer (1, 2, ...).'
  });
}

// ----------------------------------------------------------------------------
// TEST 5: SOLAR POSITION ACCURACY (YOGYAKARTA vs MERIDIAN WIB & EOT)
// ----------------------------------------------------------------------------
function testSolarAstrodynamics(): void {
  const details: string[] = [];
  let hasBug = false;

  const solarFile = path.join(ROOT_DIR, 'src', 'core/math/SolarPosition.ts');

  // Constants
  const YOGYAKARTA_LAT = -7.8;
  const YOGYAKARTA_LON = 110.37;
  const WIB_MERIDIAN = 105.0; // UTC+7 -> 7 * 15 deg

  // Difference in longitude
  const deltaLon = YOGYAKARTA_LON - WIB_MERIDIAN; // +5.37 degrees
  const lonCorrectionMin = deltaLon * 4; // 4 minutes per degree = +21.48 minutes
  const lonCorrectionHour = lonCorrectionMin / 60; // ~0.358 hours

  details.push(`Bujur Yogyakarta: ${YOGYAKARTA_LON}° BT`);
  details.push(`Meridian Acuan WIB (UTC+7): ${WIB_MERIDIAN}° BT`);
  details.push(`Selisih Bujur: +${deltaLon.toFixed(2)}°`);
  details.push(`Koreksi Waktu Bujur Murni: +${lonCorrectionMin.toFixed(2)} menit (+21 menit 29 detik)`);

  // Equation of Time (EoT) calculation
  // Spencer / Woolfe approximation:
  // B = 360/365 * (dayOfYear - 81) in degrees
  function calculateEoT(dayOfYear: number): number {
    const B = ((360 / 365) * (dayOfYear - 81) * Math.PI) / 180;
    // EoT in minutes
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }

  const day172EoT = calculateEoT(172); // June solstice
  const day305EoT = calculateEoT(305); // Early November (max positive EoT)
  const day42EoT = calculateEoT(42);   // Early February (max negative EoT)

  details.push(`Equation of Time pada hari ke-172 (21 Juni): ${day172EoT.toFixed(2)} menit`);
  details.push(`Equation of Time pada hari ke-305 (1 Nov): ${day305EoT.toFixed(2)} menit`);
  details.push(`Equation of Time pada hari ke-42 (11 Feb): ${day42EoT.toFixed(2)} menit`);

  // Total discrepancy at Day 172
  const totalOffsetDay172Min = lonCorrectionMin + day172EoT;
  const totalOffsetDay305Min = lonCorrectionMin + day305EoT;

  details.push(`Total selisih waktu matahari hakiki pada 21 Juni: +${totalOffsetDay172Min.toFixed(2)} menit`);
  details.push(`Total selisih waktu matahari hakiki pada 1 November: +${totalOffsetDay305Min.toFixed(2)} menit`);

  // True Solar Noon in Yogyakarta
  // When Local Solar Time is 12:00, clock time in WIB is:
  // WIB = 12.0 - (totalOffsetMin / 60)
  const solarNoonWibDay172 = 12.0 - totalOffsetDay172Min / 60;
  const solarNoonHour172 = Math.floor(solarNoonWibDay172);
  const solarNoonMin172 = Math.floor((solarNoonWibDay172 - solarNoonHour172) * 60);
  const solarNoonSec172 = Math.round(((solarNoonWibDay172 - solarNoonHour172) * 60 - solarNoonMin172) * 60);

  details.push(
    `-> Waktu Siang Surya Sebenarnya (Solar Noon) di Yogyakarta pada 21 Juni: ${solarNoonHour172}:${solarNoonMin172.toString().padStart(2, '0')}:${solarNoonSec172.toString().padStart(2, '0')} WIB (Bukan 12:00 WIB!)`
  );

  // Check current SolarPosition.ts code
  if (fs.existsSync(solarFile)) {
    const code = fs.readFileSync(solarFile, 'utf8');
    const definesLon = code.includes('YOGYAKARTA_LONGITUDE');
    const usesLonInCalc = code.includes('longitude') || code.includes('YOGYAKARTA_LONGITUDE *') || code.includes('105');
    const hasEoT = code.includes('EquationOfTime') || code.includes('equationOfTime') || code.includes('9.87') || code.includes('eot');
    const naiveHourAngle = code.includes('(hour - 12) * 15');

    details.push(`Konstanta YOGYAKARTA_LONGITUDE didefinisikan: ${definesLon ? 'YA' : 'TIDAK'}`);
    details.push(`Koreksi bujur dipakai dalam rumus kalkulasi: ${usesLonInCalc ? 'DIPAKAI' : 'TIDAK DIGUNAKAN (Dead code)'}`);
    details.push(`Rumus Equation of Time (EoT): ${hasEoT ? 'ADA' : 'TIDAK ADA'}`);
    details.push(`Rumus sudut waktu (hour angle) masih naif (hour - 12) * 15: ${naiveHourAngle ? 'YA (BUG)' : 'TIDAK'}`);

    if (!usesLonInCalc || !hasEoT || naiveHourAngle) {
      hasBug = true;
      details.push(
        `-> Dampak Bug: Pada pukul 12:00 WIB, engine mengira matahari tepat di puncak (Hour Angle = 0°), padahal di langit Yogyakarta matahari sudah bergeser condong ke Barat sebesar ~5.0° - 9.4°! Bayangan gedung meleset sejauh 20 sampai 38 menit!`
      );
    }
  }

  results.push({
    id: 'SOL-005',
    name: 'Akurasi Posisi Matahari & Bayangan (Bujur 110,37° BT vs Meridian WIB 105° + EoT)',
    category: 'Matematika & Simulasi Iklim',
    status: hasBug ? 'FAIL' : 'PASS',
    summary: `Jam bayangan meleset sekitar 20 sampai 38 menit karena mengabaikan selisih bujur (+21,48 menit) dan Equation of Time.`,
    details,
    recommendation: 'Perbarui calculateSolarPosition() untuk menghitung Local Solar Time = WIB + (Longitude - 105)*4/60 + EoT/60 sehingga solar noon tepat di ~11:38-11:40 WIB.'
  });
}

// ----------------------------------------------------------------------------
// RUN ALL TESTS AND PRINT REPORT
// ----------------------------------------------------------------------------
testTextures();
testUiSync();
testReadmeCompliance();
testStorageAndSchema();
testSolarAstrodynamics();

let totalPass = 0;
let totalFail = 0;
let totalConflict = 0;
let totalWarn = 0;

results.forEach((r, idx) => {
  if (r.status === 'PASS') totalPass++;
  else if (r.status === 'FAIL') totalFail++;
  else if (r.status === 'CONFLICT') totalConflict++;
  else if (r.status === 'WARN') totalWarn++;

  const statusBadge =
    r.status === 'PASS'
      ? '\x1b[32m[ PASS ]\x1b[0m'
      : r.status === 'FAIL'
      ? '\x1b[31m[ FAIL ]\x1b[0m'
      : r.status === 'CONFLICT'
      ? '\x1b[35m[ BENTROK ]\x1b[0m'
      : '\x1b[33m[ POTENSI BUG ]\x1b[0m';

  console.log(`\n${idx + 1}. ${statusBadge} ${r.id}: ${r.name}`);
  console.log(`   Kategori : ${r.category}`);
  console.log(`   Ringkasan: ${r.summary}`);
  console.log(`   Rincian Temuan:`);
  r.details.forEach((d) => console.log(`     • ${d}`));
  if (r.recommendation) {
    console.log(`   Rekomendasi Tindakan:`);
    console.log(`     ↳ ${r.recommendation}`);
  }
});

console.log('\n=============================================================');
console.log('                 RINGKASAN AUDIT SISTEM');
console.log('=============================================================');
console.log(`Total Pengujian : ${results.length}`);
console.log(`Lolos (PASS)    : ${totalPass}`);
console.log(`Gagal (FAIL)    : ${totalFail}`);
console.log(`Bentrok (SPEC)  : ${totalConflict}`);
console.log(`Peringatan/Bug  : ${totalWarn}`);
console.log('=============================================================\n');

if (totalFail > 0 || totalConflict > 0 || totalWarn > 0) {
  console.log('\x1b[33mSTATUS AKHIR: Ditemukan bentrok spesifikasi dan potensi bug aktif yang perlu ditangani.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32mSTATUS AKHIR: Seluruh pengujian lolos sempurna.\x1b[0m\n');
  process.exit(0);
}
