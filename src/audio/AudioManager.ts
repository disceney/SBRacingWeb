import { EngineSound } from './EngineSound';

/** Nombre maximal d'effets ponctuels simultanés (§17.2). */
const MAX_CONCURRENT_ONESHOTS = 6;

/**
 * Gestionnaire audio global fondé sur la Web Audio API : tout est synthétisé
 * (aucun fichier). Gère le moteur du joueur, les nappes de dérapage/herbe,
 * les effets ponctuels, le volume général, la coupure (touche M) et la
 * reprise après changement d'onglet (§17).
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: EngineSound | null = null;
  private skidGain: GainNode | null = null;
  private grassGain: GainNode | null = null;
  private refuelGain: GainNode | null = null;
  private oneshots = 0;

  private volume = 0.8;
  private mutedFlag = false;

  get muted(): boolean {
    return this.mutedFlag;
  }

  /** Initialise le contexte (à appeler après un geste utilisateur). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.connect(this.ctx.destination);
    this.applyVolume();

    // Reprise correcte après un changement d'onglet (§17.2).
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  setMuted(muted: boolean): void {
    this.mutedFlag = muted;
    this.applyVolume();
  }

  toggleMuted(): boolean {
    this.setMuted(!this.mutedFlag);
    return this.mutedFlag;
  }

  // — Moteur du joueur.

  startEngine(): void {
    if (!this.ctx || !this.master) return;
    if (!this.engine) this.engine = new EngineSound(this.ctx, this.master);
    this.engine.start();
  }

  updateEngine(rpm: number, load: number): void {
    if (this.ctx && this.engine) this.engine.update(this.ctx, rpm, load);
  }

  stopEngine(): void {
    if (this.ctx && this.engine) this.engine.setSilent(this.ctx);
  }

  // — Nappes continues : dérapage et roulage sur l'herbe.

  setSkid(active: boolean): void {
    this.skidGain = this.ensureNoiseLoop(this.skidGain, 'bandpass', 1400, 0.5);
    this.setLoopLevel(this.skidGain, active ? 0.16 : 0);
  }

  setGrass(active: boolean): void {
    this.grassGain = this.ensureNoiseLoop(this.grassGain, 'lowpass', 220, 1);
    this.setLoopLevel(this.grassGain, active ? 0.2 : 0);
  }

  setRefueling(active: boolean): void {
    this.refuelGain = this.ensureNoiseLoop(this.refuelGain, 'lowpass', 500, 2);
    this.setLoopLevel(this.refuelGain, active ? 0.12 : 0);
  }

  // — Effets ponctuels.

  /** Collision : légère ou forte selon l'intensité [0, 1]. */
  playCollision(intensity: number): void {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    // Choc sourd : sinusoïde descendante.
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + intensity * 80, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    const gain = this.oneshotGain(0.25 + intensity * 0.3, 0.22);
    if (!gain) return;
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.25);
    // Fracas : bruit court filtré.
    this.noiseBurst(2000 - intensity * 1200, 0.12 + intensity * 0.12, 0.2 + intensity * 0.25);
  }

  /** Bip de compte à rebours (aigu pour le départ). */
  playCountdown(isGo: boolean): void {
    this.beep(isGo ? 880 : 440, isGo ? 0.5 : 0.18, 0.3);
  }

  playMenuBlip(): void {
    this.beep(660, 0.05, 0.15);
  }

  /** Deux notes montantes : annonce du dernier tour. */
  playLastLap(): void {
    this.beep(523, 0.12, 0.25);
    this.beep(784, 0.2, 0.25, 0.14);
  }

  /** Petite fanfare d'arrivée. */
  playFinish(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => this.beep(freq, 0.16, 0.28, i * 0.14));
  }

  playLowFuelAlert(): void {
    this.beep(330, 0.25, 0.3);
  }

  /** Crevaison : détonation sourde suivie d'un sifflement d'air. */
  playPuncture(): void {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
    const gain = this.oneshotGain(0.5, 0.18);
    if (gain) {
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.2);
    }
    this.noiseBurst(3200, 0.45, 0.18);
  }

  // — Aides internes.

  private ready(): boolean {
    return this.ctx !== null && this.master !== null;
  }

  private applyVolume(): void {
    if (this.ctx && this.master) {
      const level = this.mutedFlag ? 0 : this.volume;
      this.master.gain.setTargetAtTime(level, this.ctx.currentTime, 0.02);
    }
  }

  private beep(freq: number, duration: number, level: number, delay = 0): void {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = freq;
    const gain = this.oneshotGain(level, duration, delay);
    if (!gain) return;
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  /** Gain enveloppé (attaque brève, extinction) comptant dans la limite d'effets. */
  private oneshotGain(level: number, duration: number, delay = 0): GainNode | null {
    if (!this.ready() || this.oneshots >= MAX_CONCURRENT_ONESHOTS) return null;
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(level, t + 0.01);
    gain.gain.setTargetAtTime(0, t + duration, 0.05);
    gain.connect(this.master!);
    this.oneshots++;
    setTimeout(() => {
      this.oneshots = Math.max(0, this.oneshots - 1);
      gain.disconnect();
    }, (delay + duration + 0.4) * 1000);
    return gain;
  }

  private noiseBurst(cutoff: number, duration: number, level: number): void {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.oneshotGain(level, duration);
    if (!gain) return;
    source.connect(filter);
    filter.connect(gain);
    source.start();
    source.stop(ctx.currentTime + duration + 0.1);
  }

  /** Boucle de bruit filtré dont seul le niveau varie (nappe continue). */
  private ensureNoiseLoop(
    existing: GainNode | null,
    type: BiquadFilterType,
    frequency: number,
    q: number,
  ): GainNode | null {
    if (existing || !this.ready()) return existing;
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer();
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master!);
    source.start();
    return gain;
  }

  private setLoopLevel(gain: GainNode | null, level: number): void {
    if (gain && this.ctx) gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.06);
  }

  private cachedNoise: AudioBuffer | null = null;

  private noiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    if (this.cachedNoise) return this.cachedNoise;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.cachedNoise = buffer;
    return buffer;
  }
}

/** Instance globale unique. */
export const audio = new AudioManager();
