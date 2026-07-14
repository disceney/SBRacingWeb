import {Surface} from "../track/trackTypes";
import type {FuelLevel} from "./raceTypes";
import type {Vehicle} from "../vehicles/Vehicle";

/** Multiplicateurs des niveaux d'usure (alignés sur ceux de la consommation). */
const LEVEL_MULTIPLIERS: Record<FuelLevel, number> = {
	off: 0,
	reduced: 0.6,
	normal: 1,
	high: 1.6,
};

/** Usure de base (%/s) à pleine vitesse, calibrée pour ≈ 6,7 %/tour à
 * ≈ 21 s/tour (référence de mise à l'échelle). */
const BASE_WEAR_RATE = 0.32;
/** Usure par tour à laquelle BASE_WEAR_RATE est calibré. */
const REFERENCE_PER_LAP = 6.7;
/** Fenêtre pneus légèrement plus large que la fenêtre carburant. */
const TIRE_WINDOW_FACTOR = 1.1;
/** Perte d'adhérence maximale à pneus morts. */
const MAX_GRIP_LOSS = 0.3;
/** Sous ce niveau d'usure, le risque de crevaison apparaît. */
const PUNCTURE_THRESHOLD = 10;
/** Probabilité de crevaison par seconde à 0 % d'usure. */
const MAX_PUNCTURE_RATE = 0.015;
/** Adhérence et vitesse maximale relatives avec un pneu crevé. */
export const FLAT_GRIP = 0.45;
export const FLAT_SPEED_FACTOR = 0.4;
/** Durée d'un changement de pneus à l'arrêt (s), en parallèle du plein. */
export const TIRE_SWAP_DURATION = 4;

export interface TireEvents {
	/** Une crevaison vient de se produire. */
	punctured?: boolean;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Part de la course couverte par un train neuf en usure normale : décroît
 * légèrement avec le nombre de tours (0,55 → 0,40), comme pour le
 * carburant, afin de garder une autonomie proportionnelle à la longueur de
 * la course.
 */
function autonomyFraction(raceLaps: number): number {
	return clamp(0.55 - raceLaps / 1000, 0.4, 0.55);
}

/**
 * Usure des pneus : progresse avec la distance, accélérée par les dérapages
 * et les passages hors piste ; l'adhérence décroît jusqu'à −30 %, et sous
 * 10 % d'usure un risque de crevaison croissant immobilise presque la
 * voiture jusqu'au changement aux stands. La vitesse d'usure est calibrée
 * pour que l'autonomie d'un train reste proportionnelle au nombre de tours
 * de la course.
 */
export class TireSystem {
	private readonly multiplier: number;
	private readonly rng: () => number;
	private readonly wearRate: number;
	/** Usure de référence (%/tour) en niveau normal, pour l'estimation. */
	private readonly perLap: number;

	constructor(level: FuelLevel, raceLaps: number, rng: () => number = Math.random) {
		this.multiplier = LEVEL_MULTIPLIERS[level];
		this.rng = rng;
		const autonomyLaps =
			autonomyFraction(raceLaps) * TIRE_WINDOW_FACTOR * Math.max(1, raceLaps);
		this.perLap = 100 / autonomyLaps;
		this.wearRate = BASE_WEAR_RATE * (this.perLap / REFERENCE_PER_LAP);
	}

	get enabled(): boolean {
		return this.multiplier > 0;
	}

	step(vehicle: Vehicle, dt: number): TireEvents {
		if (!this.enabled) {
			vehicle.tires = 100;
			vehicle.flatTire = false;
			vehicle.tireGrip = 1;
			return {};
		}

		if (vehicle.tires > 0) {
			const speedRatio = Math.min(1, vehicle.speed / vehicle.spec.maxSpeed);
			const slideFactor = vehicle.sliding ? 2.5 : 1;
			const surfaceFactor =
				vehicle.surface === Surface.Grass || vehicle.surface === Surface.Kerb ? 1.8 : 1;
			vehicle.tires = Math.max(
				0,
				vehicle.tires - this.multiplier * this.wearRate * speedRatio * slideFactor * surfaceFactor * dt,
			);
		}

		// — Crevaison : risque croissant sous le seuil, tant que le pneu tient.
		const events: TireEvents = {};
		if (!vehicle.flatTire && vehicle.tires < PUNCTURE_THRESHOLD) {
			const rate = ((PUNCTURE_THRESHOLD - vehicle.tires) / PUNCTURE_THRESHOLD) * MAX_PUNCTURE_RATE;
			if (this.rng() < rate * dt) {
				vehicle.flatTire = true;
				events.punctured = true;
			}
		}

		vehicle.tireGrip = vehicle.flatTire
			? FLAT_GRIP
			: 1 - MAX_GRIP_LOSS * (1 - vehicle.tires / 100);
		return events;
	}

	/** Pneus neufs (changement effectué aux stands). */
	swap(vehicle: Vehicle): void {
		vehicle.tires = 100;
		vehicle.flatTire = false;
		vehicle.tireGrip = 1;
	}

	/** Estimation de l'usure par tour au rythme de course, pour la stratégie IA. */
	estimateTiresPerLap(): number {
		return this.multiplier * this.perLap;
	}
}
