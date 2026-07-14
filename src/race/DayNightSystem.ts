// Cycle jour/nuit : ambiance lumineuse dérivée de la progression du meneur.

/** Phases successives d'une course, du départ de jour au retour du jour. */
export type DayNightPhase = "day" | "dusk" | "night" | "dawn";

/** Ambiance lumineuse instantanée renvoyée par le système. */
export interface DayNightState {
	phase: DayNightPhase;
	/** Obscurité de 0 (plein jour) à 1 (nuit noire). */
	darkness: number;
	/** Vrai dès que l'obscurité justifie l'allumage des phares et projecteurs. */
	lightsOn: boolean;
}

/** Bornes de progression (fraction du meneur, 0 à 1) délimitant chaque phase. */
const DUSK_START = 0.2;
const NIGHT_START = 0.4;
const DAWN_START = 0.75;
/** Seuil d'obscurité au-delà duquel les lumières s'allument. */
const LIGHTS_ON_THRESHOLD = 0.25;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Lissage cubique d'une fraction déjà bornée à [0, 1] (transition douce). */
function smoothstep(t: number): number {
	return t * t * (3 - 2 * t);
}

/**
 * Calcule la phase, l'obscurité et l'état des lumières à partir de la
 * fraction de course accomplie par le meneur (0 = départ, 1 = arrivée).
 * Classe pure, sans dépendance à Phaser, entièrement testable.
 */
export class DayNightSystem {
	/** Variante pratique : dérive la fraction depuis le tour du meneur et le nombre de tours. */
	compute(leaderLap: number, totalLaps: number): DayNightState {
		const fraction = totalLaps > 0 ? leaderLap / totalLaps : 0;
		return this.computeFraction(fraction);
	}

	/** Calcule directement à partir d'une fraction de course (déjà connue ou pour les tests). */
	computeFraction(fraction: number): DayNightState {
		const f = clamp(fraction, 0, 1);

		if (f < DUSK_START) {
			return {phase: "day", darkness: 0, lightsOn: false};
		}
		if (f < NIGHT_START) {
			const darkness = smoothstep((f - DUSK_START) / (NIGHT_START - DUSK_START));
			return {phase: "dusk", darkness, lightsOn: darkness > LIGHTS_ON_THRESHOLD};
		}
		if (f < DAWN_START) {
			return {phase: "night", darkness: 1, lightsOn: true};
		}
		const darkness = 1 - smoothstep((f - DAWN_START) / (1 - DAWN_START));
		return {phase: "dawn", darkness, lightsOn: darkness > LIGHTS_ON_THRESHOLD};
	}
}
