/**
 * Son de moteur continu entièrement synthétisé : deux oscillateurs (dent de
 * scie + carré une octave plus bas) filtrés en passe-bas, dont la hauteur et
 * le volume suivent le régime (§17.2).
 */
export class EngineSound {
	private readonly osc1: OscillatorNode;
	private readonly osc2: OscillatorNode;
	private readonly filter: BiquadFilterNode;
	private readonly gain: GainNode;
	private started = false;

	constructor(ctx: AudioContext, destination: AudioNode) {
		this.osc1 = ctx.createOscillator();
		this.osc1.type = "sawtooth";
		this.osc2 = ctx.createOscillator();
		this.osc2.type = "square";
		this.filter = ctx.createBiquadFilter();
		this.filter.type = "lowpass";
		this.filter.frequency.value = 900;
		this.gain = ctx.createGain();
		this.gain.gain.value = 0;
		this.osc1.connect(this.filter);
		this.osc2.connect(this.filter);
		this.filter.connect(this.gain);
		this.gain.connect(destination);
	}

	start(): void {
		if (this.started) return;
		this.started = true;
		this.osc1.start();
		this.osc2.start();
	}

	/** Met à jour régime [0, 1] et charge moteur [0, 1]. */
	update(ctx: AudioContext, rpm: number, load: number): void {
		if (!this.started) return;
		const t = ctx.currentTime;
		const freq = 52 + rpm * 165;
		this.osc1.frequency.setTargetAtTime(freq, t, 0.03);
		this.osc2.frequency.setTargetAtTime(freq / 2, t, 0.03);
		this.filter.frequency.setTargetAtTime(500 + rpm * 1400 + load * 500, t, 0.05);
		this.gain.gain.setTargetAtTime(0.1 + rpm * 0.1 + load * 0.06, t, 0.05);
	}

	setSilent(ctx: AudioContext): void {
		this.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
	}
}
