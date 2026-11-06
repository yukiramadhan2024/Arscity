export type FootstepMaterial = 'grass' | 'asphalt' | 'paving' | 'wood' | 'ceramic' | 'dirt';

export class ProceduralAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.5;
  private activeFootstepVoiceCount: number = 0;
  public static readonly MAX_FOOTSTEP_VOICES: number = 4;
  /** Major Pentatonic Scale (C5, D5, E5, G5, A5, C6) for Miniopolis-style musical feedback */
  public static readonly PENTATONIC_SCALE_HZ: readonly number[] = [
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    880.00, // A5
    1046.50 // C6
  ];

  public toggleMute(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled && this.isRainPlaying) {
      this.stopRainAmbience();
    }
    return !this.enabled;
  }

  public setMuted(muted: boolean): void {
    this.enabled = !muted;
    if (!this.enabled && this.isRainPlaying) {
      this.stopRainAmbience();
    }
  }

  public isMuted(): boolean {
    return !this.enabled;
  }

  private initContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playClick(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.15 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  public playPlaceRoad(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  public playPlaceBuilding(): void {
    this.playPlacementChord();
  }

  /**
   * Warm two-note harmonic placement chord (C5 + G5) synthesized when
   * building, sub-part customization, or road construction finishes.
   */
  public playPlacementChord(): number[] {
    const chordHz = [523.25, 783.99];
    const ctx = this.initContext();
    if (!ctx) return chordHz;

    chordHz.forEach((freq, i) => {
      if (!ctx) return;
      const startAt = ctx.currentTime + i * 0.028;

      const osc = ctx.createOscillator();
      const bodyOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startAt);

      bodyOsc.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(freq * 0.5, startAt);

      const bodyGain = ctx.createGain();
      bodyGain.gain.setValueAtTime(0.08 * this.volume, startAt);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.28);

      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.linearRampToValueAtTime(0.22 * this.volume, startAt + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.32);

      osc.connect(gain);
      bodyOsc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      gain.connect(ctx.destination);

      osc.start(startAt);
      osc.stop(startAt + 0.33);
      bodyOsc.start(startAt);
      bodyOsc.stop(startAt + 0.29);
    });

    return chordHz;
  }

  /**
   * Miniopolis-style Musical Scale Step Sound:
   * Synthesizes a clean acoustic marimba / kalimba tone along the major pentatonic
   * scale (C5, D5, E5, G5, A5, C6) for every 1m resize or +1/-1 floor step.
   * Returns the fundamental frequency (Hz) played.
   */
  public playScaleStepSound(stepIndex: number): number {
    const scale = ProceduralAudio.PENTATONIC_SCALE_HZ;
    const safeStep = Number.isFinite(stepIndex) ? Math.round(stepIndex) : 0;
    const noteIdx = ((safeStep % scale.length) + scale.length) % scale.length;
    const octaveOffset = Math.max(-1, Math.min(1, Math.floor(safeStep / scale.length)));
    const freq = Number((scale[noteIdx] * Math.pow(2, octaveOffset * 0.5 > 0.5 ? 1 : octaveOffset < 0 ? -0.5 : 0)).toFixed(2));
    // Keep pure C5..C6 frequencies exact for steps 0..5
    const exactFreq = safeStep >= 0 && safeStep < scale.length ? scale[safeStep] : freq;

    const ctx = this.initContext();
    if (!ctx) return exactFreq;

    const now = ctx.currentTime;

    // 1. Fundamental resonant marimba/kalimba bar (pure sine with fast 4ms mallet attack)
    const fundOsc = ctx.createOscillator();
    const fundGain = ctx.createGain();
    fundOsc.type = 'sine';
    fundOsc.frequency.setValueAtTime(exactFreq, now);
    fundOsc.frequency.exponentialRampToValueAtTime(exactFreq * 0.996, now + 0.22);

    fundGain.gain.setValueAtTime(0.001, now);
    fundGain.gain.linearRampToValueAtTime(0.24 * this.volume, now + 0.004);
    fundGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    fundOsc.connect(fundGain);
    fundGain.connect(ctx.destination);
    fundOsc.start(now);
    fundOsc.stop(now + 0.23);

    // 2. Kalimba tine / rosewood 3rd-4th harmonic transient ping
    const overtoneOsc = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtoneOsc.type = 'triangle';
    overtoneOsc.frequency.setValueAtTime(exactFreq * 3.0, now);

    overtoneGain.gain.setValueAtTime(0.001, now);
    overtoneGain.gain.linearRampToValueAtTime(0.09 * this.volume, now + 0.002);
    overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    overtoneOsc.connect(overtoneGain);
    overtoneGain.connect(ctx.destination);
    overtoneOsc.start(now);
    overtoneOsc.stop(now + 0.05);

    return exactFreq;
  }

  public playDemolish(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    // Filtered noise burst
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
    noise.stop(ctx.currentTime + 0.15);
  }

  public playCameraSnap(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    // Double shutter click
    [0, 0.06].forEach((timeOffset) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, ctx.currentTime + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + timeOffset + 0.03);

      gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + timeOffset);
      osc.stop(ctx.currentTime + timeOffset + 0.03);
    });
  }

  public playStarChime(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    // Arpeggiated chime
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(0.25 * this.volume, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.4);
    });
  }

  /**
   * Procedural snap click: Crisp high-frequency micro-click (12ms)
   * used when locking to 1m grid or 15-degree rotation angles.
   */
  public playSnapTick(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.012);

    gain.gain.setValueAtTime(0.18 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.012);
  }

  /**
   * Procedural gizmo harmonic chime:
   * Musical marimba/glass chime pitch-shifted based on floor height or overhang width.
   */
  public playGizmoHarmonic(level: number = 1): void {
    const ctx = this.initContext();
    if (!ctx) return;

    // Pentatonic scale frequencies [C5, D5, E5, G5, A5, C6, D6, E6]
    const scale = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
    const index = Math.max(0, Math.min(scale.length - 1, Math.round(level) % scale.length));
    const freq = scale[index];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);
  }

  // --- Ambient Tropical Rain Synthesis ---
  private rainNoiseNode: AudioNode | null = null;
  private rainGainNode: GainNode | null = null;
  private isRainPlaying: boolean = false;

  public startRainAmbience(isHeavy: boolean = false): void {
    if (this.isRainPlaying) return;
    const ctx = this.initContext();
    if (!ctx) return;

    // Generate 2 seconds of pink/white noise buffer for looping
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.11;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    // Tropical rain lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isHeavy ? 1800 : 900, ctx.currentTime);

    const gain = ctx.createGain();
    const targetGain = (isHeavy ? 0.22 : 0.12) * this.volume;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.2);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start();
    this.rainNoiseNode = noiseSource;
    this.rainGainNode = gain;
    this.isRainPlaying = true;
  }

  public stopRainAmbience(): void {
    if (!this.isRainPlaying || !this.ctx || !this.rainGainNode) {
      this.isRainPlaying = false;
      return;
    }

    try {
      const ct = this.ctx.currentTime;
      this.rainGainNode.gain.linearRampToValueAtTime(0.001, ct + 0.8);
      setTimeout(() => {
        if (this.rainNoiseNode && 'stop' in this.rainNoiseNode) {
          (this.rainNoiseNode as AudioScheduledSourceNode).stop();
          this.rainNoiseNode.disconnect();
        }
        this.rainNoiseNode = null;
        this.rainGainNode = null;
        this.isRainPlaying = false;
      }, 850);
    } catch {
      this.isRainPlaying = false;
    }
  }

  // Earthquake Rumble Synthesizer
  private earthquakeOsc: OscillatorNode | null = null;
  private earthquakeGain: GainNode | null = null;
  private isEarthquakePlaying: boolean = false;

  public playEarthquakeRumble(durationSec: number = 15): void {
    if (this.isEarthquakePlaying) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Deep seismic low rumble (38Hz sub-bass with 85Hz lowpass)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(36, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(48, ctx.currentTime + durationSec * 0.5);
      osc.frequency.linearRampToValueAtTime(32, ctx.currentTime + durationSec);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(80, ctx.currentTime);

      const peakGain = 0.45 * this.volume;
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + 1.5);
      gain.gain.linearRampToValueAtTime(peakGain * 0.7, ctx.currentTime + durationSec - 2.0);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationSec);

      this.earthquakeOsc = osc;
      this.earthquakeGain = gain;
      this.isEarthquakePlaying = true;

      setTimeout(() => {
        this.stopEarthquakeRumble();
      }, durationSec * 1000);
    } catch {
      this.isEarthquakePlaying = false;
    }
  }

  public stopEarthquakeRumble(): void {
    if (!this.isEarthquakePlaying) return;
    try {
      if (this.earthquakeOsc) {
        this.earthquakeOsc.stop();
        this.earthquakeOsc.disconnect();
      }
      if (this.earthquakeGain) {
        this.earthquakeGain.disconnect();
      }
    } catch {}
    this.earthquakeOsc = null;
    this.earthquakeGain = null;
    this.isEarthquakePlaying = false;
  }

  /**
   * Procedural sound for door opening (hinge creak or sliding whoosh)
   */
  public playDoorOpen(type: 'swing' | 'sliding'): void {
    const ctx = this.initContext();
    if (!ctx) return;

    if (type === 'swing') {
      // Gentle wooden hinge creak (modulated sine + high harmonic)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.18);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.04 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08 * this.volume, ctx.currentTime + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Modern smooth sliding door whoosh (filtered noise)
      const bufferSize = Math.floor(ctx.sampleRate * 0.28);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(850, ctx.currentTime + 0.28);
      filter.Q.value = 3.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06 * this.volume, ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.28);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
    }
  }

  /**
   * Procedural sound for door closing (soft latch click)
   */
  public playDoorClose(type: 'swing' | 'sliding'): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(type === 'swing' ? 220 : 380, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.09 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  /**
   * Procedural sound for sitting down (soft fabric cushion compression)
   */
  public playSitDown(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  }

  /**
   * Procedural sound for standing up (soft rustle)
   */
  public playStandUp(): void {
    const ctx = this.initContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(85, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.07 * this.volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  }

  /**
   * Apple Taptic Engine Simulation
   * Pure Web Audio API low-frequency sine waves (65Hz–140Hz) with ultra-short
   * exponential envelopes (6ms–12ms) that emulate Apple's linear resonant actuator (LRA).
   * Also triggers physical hardware vibration (navigator.vibrate) if available on mobile/tablet.
   */
  public playTaptic(type: 'light' | 'medium' | 'selection' | 'boundary' = 'light'): void {
    // 1. Mobile haptic motor trigger
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        const vibDuration = type === 'boundary' ? 8 : type === 'medium' ? 6 : type === 'selection' ? 3 : 5;
        navigator.vibrate(vibDuration);
      } catch {}
    }

    // 2. Synthesized acoustic physical tap
    const ctx = this.initContext();
    if (!ctx) return;

    let baseFreq: number;
    let endFreq: number;
    let durationSec: number;
    let amplitude: number;

    switch (type) {
      case 'selection':
        // Crisp high-resolution tick (135Hz -> 100Hz in 6ms)
        baseFreq = 135;
        endFreq = 95;
        durationSec = 0.006;
        amplitude = 0.10;
        break;
      case 'light':
        // Gentle tactile button compression (115Hz -> 75Hz in 8ms)
        baseFreq = 115;
        endFreq = 75;
        durationSec = 0.008;
        amplitude = 0.14;
        break;
      case 'medium':
        // Solid toggle / sheet action (90Hz -> 55Hz in 10ms)
        baseFreq = 90;
        endFreq = 55;
        durationSec = 0.010;
        amplitude = 0.20;
        break;
      case 'boundary':
        // Deep rubber-band limit bump (68Hz -> 38Hz in 12ms)
        baseFreq = 68;
        endFreq = 38;
        durationSec = 0.012;
        amplitude = 0.26;
        break;
    }

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), ctx.currentTime + durationSec);

      gain.gain.setValueAtTime(amplitude * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + durationSec);
    } catch {}
  }

  /**
   * T3.5: Surface material footstep procedural audio with Web Audio API.
   * Synthesizes distinct filtered noise profiles per material:
   * 'grass', 'asphalt', 'paving', 'wood', 'ceramic', 'dirt'.
   * Limits concurrent voices to maximum 4.
   */
  public playFootstep(material: FootstepMaterial = 'paving'): void {
    if (!this.enabled || this.volume <= 0) return;
    if (this.activeFootstepVoiceCount >= ProceduralAudio.MAX_FOOTSTEP_VOICES) {
      return;
    }

    const ctx = this.initContext();
    if (!ctx) return;

    this.activeFootstepVoiceCount++;
    const releaseVoice = () => {
      this.activeFootstepVoiceCount = Math.max(0, this.activeFootstepVoiceCount - 1);
    };

    try {
      const now = ctx.currentTime;
      let duration = 0.05;

      switch (material) {
        case 'grass': {
          // Soft filtered noise rustle
          duration = 0.06;
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1800, now);
          filter.Q.setValueAtTime(1.2, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.12 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + duration);
          noise.onended = releaseVoice;
          break;
        }

        case 'asphalt': {
          // Coarse granular pavement thud
          duration = 0.05;
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(600, now);
          filter.Q.setValueAtTime(1.8, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.18 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + duration);
          noise.onended = releaseVoice;
          break;
        }

        case 'paving': {
          // Crisp solid stone impact
          duration = 0.045;
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1100, now);
          filter.Q.setValueAtTime(2.2, now);

          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + duration);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.22 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          osc.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + duration);
          osc.start(now);
          osc.stop(now + duration);
          noise.onended = releaseVoice;
          break;
        }

        case 'wood': {
          // Hollow resonant wooden knock
          duration = 0.06;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(210, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + duration);

          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(380, now);
          filter.Q.setValueAtTime(3.5, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.20 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          osc.connect(gain);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + duration);
          noise.start(now);
          noise.stop(now + duration);
          osc.onended = releaseVoice;
          break;
        }

        case 'ceramic': {
          // Sharp high-frequency hard click (tile/marble)
          duration = 0.035;
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2800, now);
          filter.Q.setValueAtTime(3.0, now);

          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + duration);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.22 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          osc.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + duration);
          osc.start(now);
          osc.stop(now + duration);
          noise.onended = releaseVoice;
          break;
        }

        case 'dirt':
        default: {
          // Low dull crunch / earth impact
          duration = 0.055;
          const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(350, now);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.18 * this.volume, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(now);
          noise.stop(now + duration);
          noise.onended = releaseVoice;
          break;
        }
      }
    } catch {
      releaseVoice();
    }
  }

  public getActiveFootstepVoiceCount(): number {
    return this.activeFootstepVoiceCount;
  }
}

export const proceduralAudio = new ProceduralAudio();
