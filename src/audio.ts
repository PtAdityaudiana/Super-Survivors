export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private lastHitTime = 0;
  private lastXpTime = 0;
  private lastShieldBlockTime = 0;

  constructor() {
    try {
      const saved = localStorage.getItem('super-survivors-muted');
      if (saved === '1') this.muted = true;
    } catch {
      // ignore storage failure
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('super-survivors-muted', this.muted ? '1' : '0');
    } catch {
      // ignore storage failure
    }
    return this.muted;
  }

  public unlock(): void {
    try {
      const ctx = this.ensureContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume();
      }
    } catch {
      // ignore audio unlock failure
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freqStart, now);
      if (freqEnd !== freqStart) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, freqEnd),
          now + duration,
        );
      }

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.01);
    } catch {
      // ignore Web Audio glitches
    }
  }

  public playWhip(): void {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;

      // Short filtered noise burst + downward square snap
      const dur = 0.09;
      const sampleCount = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < sampleCount; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.Q.value = 1.5;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.09, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();

      this.playTone(360, 110, 0.08, 'square', 0.055);
    } catch {
      // ignore
    }
  }

  public playWand(): void {
    this.playTone(860, 340, 0.09, 'triangle', 0.06);
  }

  public playHit(): void {
    const now = performance.now();
    if (now - this.lastHitTime < 80) return; // max ~12/sec
    this.lastHitTime = now;
    this.playTone(170, 70, 0.05, 'square', 0.045);
  }

  public playXp(combo: number): void {
    const now = performance.now();
    if (now - this.lastXpTime < 35) return;
    this.lastXpTime = now;
    const clampedCombo = Math.min(10, combo);
    const baseFreq = 620 + clampedCombo * 48;
    this.playTone(baseFreq, baseFreq * 1.18, 0.06, 'triangle', 0.055);
  }

  public playLevelUp(): void {
    const notes = [330, 392, 494, 659];
    notes.forEach((n, idx) => {
      this.playTone(n, n, 0.13, 'square', 0.065, idx * 0.075);
    });
  }

  public playHurt(): void {
    this.playTone(150, 58, 0.16, 'sawtooth', 0.085);
  }

  public playHeal(): void {
    this.playTone(440, 660, 0.1, 'triangle', 0.065, 0);
    this.playTone(660, 880, 0.12, 'triangle', 0.065, 0.08);
  }

  public playBuff(): void {
    this.playTone(523, 659, 0.09, 'triangle', 0.065, 0);
    this.playTone(659, 987, 0.13, 'square', 0.05, 0.07);
  }

  public playShield(): void {
    this.playTone(392, 587, 0.12, 'triangle', 0.065, 0);
    this.playTone(784, 1046, 0.16, 'square', 0.045, 0.06);
  }

  public playShieldBlock(): void {
    const now = performance.now();
    if (now - this.lastShieldBlockTime < 220) return;
    this.lastShieldBlockTime = now;
    this.playTone(920, 640, 0.07, 'square', 0.045);
  }

  public playChest(): void {
    const notes = [392, 494, 587, 784, 988];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.03, 0.13, 'square', 0.06, idx * 0.065);
    });
  }

  public playBossSpawn(): void {
    this.playTone(110, 82, 0.45, 'sawtooth', 0.09, 0);
    this.playTone(146, 110, 0.5, 'square', 0.06, 0.08);
  }

  public playGameOver(): void {
    const notes = [330, 262, 196];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 0.92, 0.24, 'square', 0.075, idx * 0.18);
    });
  }
}
