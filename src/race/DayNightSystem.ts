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

/**
 * Horloge fictive de la course : mapping LINÉAIRE progression → heure, calé
 * sur un départ à 14 h et une arrivée à 6 h le lendemain (16 h fictives
 * réparties sur progress 0→1). Avec ce mapping, les seuils de phase tombent
 * sur des heures plausibles : dusk (0.2) → 17:12, night (0.4) → 20:24,
 * dawn (0.75) → 02:00.
 */
const CLOCK_START_HOUR = 14;
const CLOCK_DURATION_HOURS = 16;
const MINUTES_PER_DAY = 24 * 60;

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

	/** Convertit une fraction de course en heure fictive (mapping linéaire, voir plus haut). */
	timeOfDayAt(progress: number): {hours: number; minutes: number} {
		const f = clamp(progress, 0, 1);
		const totalMinutes = CLOCK_START_HOUR * 60 + f * CLOCK_DURATION_HOURS * 60;
		const minutesOfDay = Math.round(totalMinutes) % MINUTES_PER_DAY;
		return {hours: Math.floor(minutesOfDay / 60), minutes: minutesOfDay % 60};
	}

	/** Heure fictive formatée « HH:MM » (zéro-paddée) à partir d'une fraction de course. */
	formatTimeOfDay(progress: number): string {
		const {hours, minutes} = this.timeOfDayAt(progress);
		return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
	}
}
