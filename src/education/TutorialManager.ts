export interface TutorialStep {
  stepIndex: number;
  title: string;
  instruction: string;
  toolToActivate?: string;
  uiTargetSelector?: string;
  architecturalInsight: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    stepIndex: 1,
    title: 'Langkah 1: Navigasi Kamera God-Eye',
    instruction: 'Gunakan tombol WASD atau klik tengah mouse untuk menggeser kamera. Scroll mouse untuk zoom mendekat dan menjauh.',
    architecturalInsight: 'Sudut pandang mata burung (50°) memungkinkan perencana kota melihat harmoni antara jalan, vegetasi, dan orientasi bangunan terhadap lintasan matahari.'
  },
  {
    stepIndex: 2,
    title: 'Langkah 2: Menarik Garis Jalan Pertama',
    instruction: 'Klik tombol "Jalan" (R) pada bilah alat bawah, lalu klik 2 titik di atas tanah hijau untuk membangun ruas jalan pertama.',
    toolToActivate: 'road',
    uiTargetSelector: '[data-tooltip*="Jalan"]',
    architecturalInsight: 'Jalan adalah tulang punggung sirkulasi kota. Di iklim tropis, jalan memanjang timur-barat membantu membatasi fasad gedung dari terpaan radiasi surya langsung.'
  },
  {
    stepIndex: 3,
    title: 'Langkah 3: Menentukan Kavling & Zonasi',
    instruction: 'Klik tombol "Zonasi" (Z), lalu pilih "Hunian" dan klik tombol "Buat Kavling" untuk membentuk petak tanah terencana.',
    toolToActivate: 'zone',
    uiTargetSelector: '[data-tooltip*="Zonasi"]',
    architecturalInsight: 'Zonasi mengatur batas KDB (Koefisien Dasar Bangunan) agar setiap rumah menyisakan minimal 40% area resapan air hujan alami.'
  },
  {
    stepIndex: 4,
    title: 'Langkah 4: Mendirikan Rumah Pertama',
    instruction: 'Klik tombol "Bangun" (B), pilih "Rumah Tipe 36" atau "54", lalu klik di atas kavling yang sudah dibuat.',
    toolToActivate: 'build',
    uiTargetSelector: '[data-tooltip*="Bangun"]',
    architecturalInsight: 'Rumah tipe 36 dan 54 dirancang kompak dan fungsional dengan peninggian lantai (plinth) untuk mencegah genangan air hujan masuk.'
  },
  {
    stepIndex: 5,
    title: 'Langkah 5: Memeriksa Orientasi Surya & Angin',
    instruction: 'Buka menu "Analisis" (A) pada dock bawah untuk melihat simulasi bayangan matahari Yogyakarta dan ventilasi silang.',
    toolToActivate: 'analyze',
    uiTargetSelector: '[data-tooltip*="Analisis"]',
    architecturalInsight: 'Fasad yang menghadap Utara dan Selatan menerima pencahayaan alami tanpa menyerap panas berlebih, menghemat konsumsi energi penyejuk udara.'
  },
  {
    stepIndex: 6,
    title: 'Selamat! Kota Tropismu Dimulai',
    instruction: 'Kamu telah memahami fondasi arsitektur kota. Lanjutkan merancang secara bebas atau selesaikan tantangan pada menu Misi!',
    architecturalInsight: 'Arsitektur yang baik adalah arsitektur yang merespon iklim dan memuliakan manusia penghuninya.'
  }
];
