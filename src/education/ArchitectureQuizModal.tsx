import React, { useState, useEffect } from 'react';
import { useUIStore } from '../ui/state/useUIStore';
import {
  HelpCircle,
  X,
  CheckCircle2,
  XCircle,
  Download,
  RotateCcw,
  Award,
  ChevronRight,
  FileText,
  BarChart3
} from 'lucide-react';

export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  reference: string;
}

export const ARCHITECTURE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    category: 'Zonasi & Tata Ruang',
    question: 'Jika sebuah kavling memiliki luas 200 m² dengan batas Koefisien Dasar Bangunan (KDB) 60%, berapakah luas tapak lantai dasar maksimum yang boleh dibangun?',
    options: ['80 m²', '120 m²', '150 m²', '200 m²'],
    correctIndex: 1,
    explanation: 'KDB 60% dari luas kavling 200 m² adalah 0.60 × 200 = 120 m². Sisa lahan 80 m² (40%) harus disisakan sebagai ruang terbuka resapan air (KDH).',
    reference: 'Permen PUPR No. 29/PRT/M/2006'
  },
  {
    id: 'q2',
    category: 'Garis Sempadan (GSB)',
    question: 'Mengapa Garis Sempadan Bangunan (GSB) depan diukur dari as atau tepi jalan terdekat?',
    options: [
      'Hanya untuk memperindah tampak fasad depan',
      'Untuk menjamin ruang pelebaran jalan, sirkulasi udara, jarak pandang keselamatan lalu lintas, dan jalur evakuasi',
      'Untuk menentukan batas kepemilikan sertifikat tanah',
      'Agar kendaraan pemilik rumah tidak terlihat dari jalan'
    ],
    correctIndex: 1,
    explanation: 'GSB depan berfungsi menjaga jarak aman bangunan dari koridor transportasi publik, memastikan cahaya alami masuk, dan mengantisipasi pelebaran jalan di masa depan.',
    reference: 'UU No. 28/2002 tentang Bangunan Gedung'
  },
  {
    id: 'q3',
    category: 'Arsitektur Tropis & Iklim',
    question: 'Mengapa rumah tradisional Jawa (seperti atap Joglo dan Limasan) memiliki kemiringan atap terjal (> 30°)?',
    options: [
      'Agar menghemat pemakaian kayu reng dan usuk',
      'Untuk mempercepat aliran air hujan deras tropis dan menciptakan rongga plafon tinggi sebagai pendingin pasif alami',
      'Sebagai tempat penyimpanan hasil panen di loteng',
      'Mengikuti tren arsitektur Eropa abad ke-19'
    ],
    correctIndex: 1,
    explanation: 'Curah hujan tropis Indonesia sangat tinggi. Atap berkemiringan tajam mengalirkan air hujan deras secara cepat mencegah kebocoran, sedangkan volume rongga atap yang luas memungkinkan udara panas naik (efek cerobong alami).',
    reference: 'Prinsip Arsitektur Tropis Lembap & SNI 03-1733-2004'
  },
  {
    id: 'q4',
    category: 'Hidrologi & Mitigasi Banjir',
    question: 'Bagaimana peran sumur resapan dan lubang biopori dalam sistem drainase perkotaan?',
    options: [
      'Mengalirkan seluruh air hujan secepat-cepatnya ke saluran got jalan raya',
      'Menampung dan meresapkan limpasan air hujan langsung ke dalam akuifer tanah lokal untuk mengurangi beban drainase dan mencegah banjir',
      'Sebagai tempat pembuangan limbah air kotor deterjen rumah tangga',
      'Hanya sebagai syarat administratif perizinan tanpa fungsi hidrologis'
    ],
    correctIndex: 1,
    explanation: 'Metode zero delta Q mengharuskan limpasan air tambahan akibat pembangunan gedung diresapkan kembali ke tanah melalui sumur resapan (kapasitas ~2.5 m³/jam) dan biopori.',
    reference: 'SNI 03-2453-2002 Tata Cara Perencanaan Sumur Resapan Air Hujan'
  },
  {
    id: 'q5',
    category: 'Struktur & Ketahanan Gempa',
    question: 'Berdasarkan evaluasi dampak Gempa Yogyakarta 27 Mei 2006 (Mw 6.3), apa penyebab utama runtuhnya sebagian besar rumah tinggal bertembok?',
    options: [
      'Penggunaan genteng tanah liat yang terlalu tebal',
      'Ketiadaan ikatan ring balok di atas dinding bata dan penulangan sambungan kolom-balok yang tidak menerus',
      'Fondasi yang dibuat terlalu dalam',
      'Cat dinding yang tidak kedap air'
    ],
    correctIndex: 1,
    explanation: 'Sebagian besar rumah warga yang roboh tidak memiliki kolom praktis dan ring balok beton bertulang yang mengunci dinding bata secara monolit sebagai satu kesatuan struktural tahan gempa.',
    reference: 'Laporan Rekonstruksi Pasca-Gempa DIY-Jateng 2006 & SNI 1726:2019'
  },
  {
    id: 'q6',
    category: 'Perencanaan Kota & Walkability',
    question: 'Mengapa radius 400 meter (5 menit jalan kaki) menjadi acuan standar perencanaan jangkauan fasilitas publik lingkungan?',
    options: [
      'Jarak maksimal yang bisa dicapai oleh mobil pemadam kebakaran',
      'Batas jarak nyaman berjalan kaki bagi manusia (pedestrian comfort threshold) sebelum memutuskan naik kendaraan bermotor',
      'Jarak pancar sinyal radio komunikasi darurat',
      'Batas luas satu kecamatan administratif'
    ],
    correctIndex: 1,
    explanation: 'Radius 400 meter setara dengan jalan kaki santai 5 menit pada kecepatan rata-rata 4.8 km/jam, mendorong mobilitas aktif dan mengurangi ketergantungan kendaraan bermotor serta polusi emisi karbon.',
    reference: 'Permen PU No. 03/PRT/M/2014 Pedoman Perencanaan Jalur Pejalan Kaki'
  }
];

export interface QuizRecord {
  type: 'pre_test' | 'post_test';
  timestamp: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: {
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
  }[];
}

interface ArchitectureQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureQuizModal: React.FC<ArchitectureQuizModalProps> = ({ isOpen, onClose }) => {
  const [testType, setTestType] = useState<'pre_test' | 'post_test'>('pre_test');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [history, setHistory] = useState<QuizRecord[]>([]);

  // Load saved quiz history from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('arscity_quiz_history');
      if (raw) {
        setHistory(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Gagal memuat riwayat kuis:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentQ = ARCHITECTURE_QUIZ_QUESTIONS[currentStep];
  const totalQ = ARCHITECTURE_QUIZ_QUESTIONS.length;

  const handleSelectOption = (idx: number) => {
    if (isSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: idx }));
  };

  const handleNext = () => {
    if (currentStep < totalQ - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmitQuiz = () => {
    let score = 0;
    const answers = ARCHITECTURE_QUIZ_QUESTIONS.map(q => {
      const chosen = selectedAnswers[q.id] ?? -1;
      const isCorrect = chosen === q.correctIndex;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        selectedOption: chosen,
        isCorrect
      };
    });

    const record: QuizRecord = {
      type: testType,
      timestamp: new Date().toISOString(),
      score,
      totalQuestions: totalQ,
      percentage: Math.round((score / totalQ) * 100),
      answers
    };

    const nextHistory = [...history, record];
    setHistory(nextHistory);
    try {
      localStorage.setItem('arscity_quiz_history', JSON.stringify(nextHistory));
    } catch (e) {
      console.warn('Gagal menyimpan riwayat kuis:', e);
    }

    setIsSubmitted(true);
  };

  const handleReset = (type: 'pre_test' | 'post_test') => {
    setTestType(type);
    setSelectedAnswers({});
    setCurrentStep(0);
    setIsSubmitted(false);
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `arscity_evaluasi_kuis_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const preTestRecord = history.filter(h => h.type === 'pre_test').slice(-1)[0];
  const postTestRecord = history.filter(h => h.type === 'post_test').slice(-1)[0];

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '580px',
          maxWidth: '92vw',
          maxHeight: '88vh'
        }}
      >
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label)' }}>
                Evaluasi Pembelajaran Arsitektur & Tata Ruang
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Uji Pemahaman Arsitektur Tropis, Building Code, & Mitigasi Gempa/Banjir
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup Kuis">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-sheet-body">
          {/* Mode Switcher */}
          {!isSubmitted && (
            <div className="segmented-control" style={{ width: '100%', marginBottom: '14px' }}>
              <button
                onClick={() => handleReset('pre_test')}
                className={`segmented-item ${testType === 'pre_test' ? 'active' : ''}`}
                style={{ flex: 1, padding: '6px' }}
              >
                Kuis Awal (Pre-Test)
              </button>
              <button
                onClick={() => handleReset('post_test')}
                className={`segmented-item ${testType === 'post_test' ? 'active' : ''}`}
                style={{ flex: 1, padding: '6px' }}
              >
                Kuis Akhir (Post-Test)
              </button>
            </div>
          )}

          {/* Comparative Pre vs Post Score Card if available */}
          {(preTestRecord || postTestRecord) && (
            <div className="inset-group" style={{ marginBottom: '14px' }}>
              <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Peningkatan Belajar (Gain Score)</span>
                </div>
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                  <span>
                    Pre-Test: <strong className="tabular-nums">{preTestRecord ? `${preTestRecord.score}/${preTestRecord.totalQuestions}` : '-'}</strong>
                  </span>
                  <span>
                    Post-Test: <strong className="tabular-nums" style={{ color: 'var(--good)' }}>{postTestRecord ? `${postTestRecord.score}/${postTestRecord.totalQuestions}` : '-'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {!isSubmitted ? (
            /* Question Card */
            <div className="inset-group">
              <div className="inset-row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--separator)' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase' }}>
                  {currentQ.category}
                </span>
                <span className="tabular-nums" style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Soal {currentStep + 1} dari {totalQ}
                </span>
              </div>

              <div style={{ padding: '14px', fontSize: '13px', lineHeight: 1.5, fontWeight: 500, color: 'var(--label)' }}>
                {currentQ.question}
              </div>

              {/* Options */}
              <div style={{ padding: '0 14px 14px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = selectedAnswers[currentQ.id] === oIdx;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectOption(oIdx)}
                      className="interactive"
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-control)',
                        border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--separator)',
                        backgroundColor: isSelected ? 'var(--fill-control-active)' : 'var(--fill-control)',
                        textAlign: 'left',
                        fontSize: '12px',
                        lineHeight: 1.4,
                        color: 'var(--label)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: isSelected ? '5px solid var(--accent)' : '1.5px solid var(--label-tertiary)',
                          backgroundColor: 'var(--surface)',
                          flexShrink: 0
                        }}
                      />
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="inset-row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--separator)' }}>
                <button
                  onClick={handlePrev}
                  disabled={currentStep === 0}
                  className="ios-btn"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Sebelumnya
                </button>

                {currentStep < totalQ - 1 ? (
                  <button
                    onClick={handleNext}
                    className="ios-btn ios-btn-primary"
                    style={{ fontSize: '12px', padding: '6px 16px' }}
                  >
                    Selanjutnya
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(selectedAnswers).length < totalQ}
                    className="ios-btn ios-btn-primary"
                    style={{ fontSize: '12px', padding: '6px 18px', backgroundColor: 'var(--good)' }}
                  >
                    Kirim & Periksa Jawaban
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Result and Review View */
            <div>
              <div
                className="inset-group"
                style={{
                  textAlign: 'center',
                  padding: '18px',
                  marginBottom: '16px',
                  backgroundColor: 'var(--fill-control)'
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--label-secondary)', marginBottom: '4px' }}>
                  HASIL EVALUASI {testType === 'pre_test' ? 'PRE-TEST' : 'POST-TEST'}
                </div>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color: (history.slice(-1)[0]?.percentage ?? 0) >= 70 ? 'var(--good)' : 'var(--warn)'
                  }}
                >
                  {history.slice(-1)[0]?.score} / {totalQ}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                  Skor Akhir: {history.slice(-1)[0]?.percentage}%
                </div>
              </div>

              {/* Review Answers List */}
              <div className="inset-header">PEMBAHASAN SOAL & RUJUKAN RESMI</div>
              <div className="inset-group">
                {ARCHITECTURE_QUIZ_QUESTIONS.map((q, idx) => {
                  const userAns = selectedAnswers[q.id];
                  const isCorrect = userAns === q.correctIndex;

                  return (
                    <div
                      key={q.id}
                      style={{
                        padding: '12px 14px',
                        borderBottom: idx < totalQ - 1 ? '1px solid var(--separator)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                        {isCorrect ? (
                          <CheckCircle2 size={16} style={{ color: 'var(--good)', flexShrink: 0, marginTop: '2px' }} />
                        ) : (
                          <XCircle size={16} style={{ color: 'var(--bad)', flexShrink: 0, marginTop: '2px' }} />
                        )}
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)' }}>
                          {idx + 1}. {q.question}
                        </div>
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--label-secondary)', paddingLeft: '24px', marginBottom: '4px' }}>
                        Jawaban Anda: <strong>{q.options[userAns] || 'Tidak dijawab'}</strong>
                        {!isCorrect && (
                          <span style={{ color: 'var(--good)', marginLeft: '6px' }}>
                            (Benar: {q.options[q.correctIndex]})
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11px', color: 'var(--label)', paddingLeft: '24px', lineHeight: 1.4 }}>
                        {q.explanation}
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--accent)', paddingLeft: '24px', marginTop: '4px' }}>
                        Rujukan: {q.reference}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
                <button
                  onClick={() => handleReset(testType === 'pre_test' ? 'post_test' : 'pre_test')}
                  className="ios-btn"
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  <RotateCcw size={14} strokeWidth={1.75} />
                  <span>Ulangi / Ganti Kuis</span>
                </button>

                <button
                  onClick={handleExportJSON}
                  className="ios-btn ios-btn-primary"
                  style={{ fontSize: '12px', padding: '6px 16px' }}
                >
                  <Download size={14} strokeWidth={1.75} />
                  <span>Ekspor Data Kuis (.json)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
