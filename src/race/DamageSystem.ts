import type {FuelLevel} from "./raceTypes";
import type {Vehicle} from "../vehicles/Vehicle";

/** Multiplicateurs des niveaux de dégâts (mêmes paliers que la consommation). */
const LEVEL_MULTIPLIERS: Record<FuelLevel, number> = {
	off: 0,
	reduced: 0.6,
	normal: 1,
	high: 1.6,
};

/** Intensité d'impact ignorée (frottements de peloton). */
const IMPACT_THRESHOLD = 15;
/** Dégâts (%) par unité d'intensité au-delà du seuil. */
const DAMAGE_PER_IMPACT = 0.13;
/** Vitesse de réparation aux stands (%/s) : réparation totale ≈ 8 s. */
export const REPAIR_RATE = 12.5;

export interface DamageEvents {
	/** La voiture vient de casser définitivement. */
	wrecked?: boolean;
}

/**
 * Dégâts mécaniques : les chocs contre les murs et les autres voitures
 * entament l'état (100 → 0) ; vitesse de pointe, accélération et direction
 * se dégradent progressivement, et à zéro la mécanique casse — abandon
 * définitif, au même titre que la panne sèche. Réparable aux stands.
 */
export class DamageSystem {
	private readonly multiplier: number;

	constructor(level: FuelLevel) {
		this.multiplier = LEVEL_MULTIPLIERS[level];
	}

	get enabled(): boolean {
		return this.multiplier > 0;
	}

	step(vehicle: Vehicle): DamageEvents {
		const impact = vehicle.lastImpact;
		vehicle.lastImpact = 0;

		if (!this.enabled) {
			vehicle.health = 100;
			vehicle.healthFactor = 1;
			return {};
		}

		if (impact > IMPACT_THRESHOLD && vehicle.health > 0) {
			vehicle.health = Math.max(
				0,
				vehicle.health - this.multiplier * (impact - IMPACT_THRESHOLD) * DAMAGE_PER_IMPACT,
			);
		}

		vehicle.healthFactor = vehicle.health / 100;

		// — Casse mécanique : moteur coupé, puis immobilisation définitive.
		const events: DamageEvents = {};
		if (vehicle.health <= 0) {
			vehicle.powerFactor = 0;
			if (vehicle.speed < 5 && vehicle.raceState === "racing") {
				vehicle.raceState = "wrecked";
				events.wrecked = true;
			}
		}
		return events;
	}

	/**
	 * Réparation partielle (ex. réapparition après un blocage) : remonte la
	 * santé à au moins floor (fraction [0, 1] de la santé max, ~0.5 = niveau
	 * roulable) seulement si elle est pire, sans jamais dégrader une voiture
	 * plus saine. Pneus et carburant ne sont pas concernés.
	 */
	repairTo(vehicle: Vehicle, floor: number): void {
		const target = floor * 100;
		if (vehicle.health < target) {
			vehicle.health = target;
			vehicle.healthFactor = vehicle.health / 100;
		}
	}
}
