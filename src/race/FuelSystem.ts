import type {FuelLevel} from "./raceTypes";
import type {Vehicle} from "../vehicles/Vehicle";

/** Multiplicateurs des niveaux de consommation (§6.1). */
const LEVEL_MULTIPLIERS: Record<FuelLevel, number> = {
	off: 0,
	reduced: 0.6,
	normal: 1,
	high: 1.6,
};

/** Consommation de base (unités/s) et part liée à l'accélérateur, calibrées
 * pour ≈ 8 unités/tour à ≈ 21 s/tour (référence de mise à l'échelle). */
const IDLE_RATE = 0.14;
const THROTTLE_RATE = 0.3;
/** Consommation par tour à laquelle IDLE_RATE et THROTTLE_RATE sont calibrés. */
const REFERENCE_PER_LAP = 8;
/** Capacité de référence du réservoir (STOCK_CAR) pour le calcul d'autonomie. */
const REFERENCE_CAPACITY = 100;
/** Durée du fondu de puissance après la panne sèche (s). */
const POWER_FADE_DURATION = 4;
/** Débit de ravitaillement : plein complet en 4 s (§12.4). */
export const REFUEL_RATE = 25;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Part de la course couverte par un plein en niveau normal : décroît
 * légèrement avec le nombre de tours (0,55 → 0,40) pour rester dans la
 * bande ~45-55 % de la course quel que soit son nombre de tours (20 à 200),
 * tout en imposant davantage d'arrêts sur les longues courses.
 */
function autonomyFraction(raceLaps: number): number {
	return clamp(0.55 - raceLaps / 1000, 0.4, 0.55);
}

/**
 * Consommation de carburant (§12.1) : dépend de l'accélérateur, de la
 * vitesse, du niveau choisi et du nombre de tours de la course — l'autonomie
 * d'un plein en niveau normal est calibrée à ≈ 45-55 % de la course, ce qui
 * impose une fenêtre stratégique d'un ou plusieurs arrêts quelle que soit sa
 * longueur. En panne sèche, la puissance décroît progressivement avant
 * l'immobilisation.
 */
export class FuelSystem {
	private readonly multiplier: number;
	private readonly idleRate: number;
	private readonly throttleRate: number;
	/** Consommation de référence (unités/tour) en niveau normal, pour l'estimation. */
	private readonly perLap: number;

	constructor(level: FuelLevel, raceLaps: number) {
		this.multiplier = LEVEL_MULTIPLIERS[level];
		const autonomyLaps = autonomyFraction(raceLaps) * Math.max(1, raceLaps);
		this.perLap = REFERENCE_CAPACITY / autonomyLaps;
		const scale = this.perLap / REFERENCE_PER_LAP;
		this.idleRate = IDLE_RATE * scale;
		this.throttleRate = THROTTLE_RATE * scale;
	}

	get enabled(): boolean {
		return this.multiplier > 0;
	}

	step(vehicle: Vehicle, dt: number): void {
		if (!this.enabled) {
			vehicle.powerFactor = 1;
			return;
		}

		if (vehicle.fuel > 0) {
			const speedRatio = Math.min(1, Math.abs(vehicle.vLong) / vehicle.spec.maxSpeed);
			const rate =
				this.multiplier *
				(this.idleRate + this.throttleRate * vehicle.controls.throttle * (0.3 + 0.7 * speedRatio));
			vehicle.fuel = Math.max(0, vehicle.fuel - rate * dt);
			vehicle.powerFactor = 1;
			vehicle.fuelOutTime = 0;
			return;
		}

		// Panne sèche : fondu de puissance puis immobilisation définitive (§12.1).
		vehicle.fuelOutTime += dt;
		vehicle.powerFactor = Math.max(0, 1 - vehicle.fuelOutTime / POWER_FADE_DURATION);
		if (vehicle.powerFactor === 0 && vehicle.speed < 5 && vehicle.raceState === "racing") {
			vehicle.raceState = "fuelOut";
		}
	}

	/** Estimation de la consommation par tour au rythme de course, pour la stratégie IA. */
	estimateFuelPerLap(): number {
		return this.multiplier * this.perLap;
	}
}
