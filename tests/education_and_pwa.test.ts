import { describe, it, expect } from 'vitest';
import { ARCHITECTURE_QUIZ_QUESTIONS } from '../src/education/ArchitectureQuizModal';
import fs from 'fs';
import path from 'path';

describe('Milestone T7: Bukti Edukasi, Validasi, dan PWA Offline', () => {
  it('memvalidasi integritas dataset soal kuis arsitektur', () => {
    expect(ARCHITECTURE_QUIZ_QUESTIONS.length).toBeGreaterThanOrEqual(6);

    for (const q of ARCHITECTURE_QUIZ_QUESTIONS) {
      expect(q.id).toBeDefined();
      expect(q.question.length).toBeGreaterThan(15);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.reference.length).toBeGreaterThan(5);
    }
  });

  it('memverifikasi keberadaan berkas USABILITY.md dan struktur metrik SUS', () => {
    const usabilityPath = path.resolve(__dirname, '../USABILITY.md');
    expect(fs.existsSync(usabilityPath)).toBe(true);

    const content = fs.readFileSync(usabilityPath, 'utf-8');
    expect(content).toContain('System Usability Scale');
    expect(content).toContain('SUS');
    expect(content).toContain('Time on Task');
    expect(content).toContain('Error Count');
    expect(content).toContain('P1');
    expect(content).toContain('P5');
  });

  it('memverifikasi keberadaan berkas VALIDASI.md dan tabel standar arsitektur/teknik sipil', () => {
    const validasiPath = path.resolve(__dirname, '../VALIDASI.md');
    expect(fs.existsSync(validasiPath)).toBe(true);

    const content = fs.readFileSync(validasiPath, 'utf-8');
    expect(content).toContain('KDB');
    expect(content).toContain('KLB');
    expect(content).toContain('KDH');
    expect(content).toContain('GSB');
    expect(content).toContain('SNI 03-1733');
    expect(content).toContain('Metode Rasional');
    expect(content).toContain('SNI 1726');
    expect(content).toContain('Permen PU');
  });

  it('memverifikasi keberadaan Service Worker dan skrip demo 2 menit', () => {
    const swPath = path.resolve(__dirname, '../public/sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain('addEventListener');
    expect(swContent).toContain('CACHE_NAME');
    expect(swContent).toContain('fetch');

    const demoPath = path.resolve(__dirname, '../DEMO_SCRIPT.md');
    expect(fs.existsSync(demoPath)).toBe(true);

    const demoContent = fs.readFileSync(demoPath, 'utf-8');
    expect(demoContent).toContain('00:00');
    expect(demoContent).toContain('02:00');
    expect(demoContent).toContain('Voiceover');
  });
});
