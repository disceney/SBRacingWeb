import type { FuelLevel } from './raceTypes';
import type { Vehicle } from '../vehicles/Vehicle';

/** Multiplicateurs des niveaux de consommation (§6.1). */
const LEVEL_MULTIPLIERS: Record<FuelLevel, number> = {
  off: 0,
  reduced: 0.6,
  normal: 1,
  high: 1.6,
};

/** Consommation de base (unités/s) et part liée à l'accélérateur. */
const IDLE_RATE = 0.14;
const THROTTLE_RATE = 0.3;
/** Durée du fondu de puissance après la panne sèche (s). */
const POWER_FADE_DURATION = 4;
/** Débit de ravitaillement : plein complet en 4 s (§12.4). */
export const REFUEL_RATE = 25;

/**
 * Consommation de carburant (§12.1) : dépend de l'accélérateur, de la
 * vitesse et du niveau choisi. En panne sèche, la puissance décroît
 * progressivement avant l'immobilisation.
 */
export class FuelSystem {
  private readonly multiplier: number;

  constructor(level: FuelLevel) {
    this.multiplier = LEVEL_MULTIPLIERS[level];
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
        (IDLE_RATE + THROTTLE_RATE * vehicle.controls.throttle * (0.3 + 0.7 * speedRatio));
      vehicle.fuel = Math.max(0, vehicle.fuel - rate * dt);
      vehicle.powerFactor = 1;
      vehicle.fuelOutTime = 0;
      return;
    }

    // Panne sèche : fondu de puissance puis immobilisation définitive (§12.1).
    vehicle.fuelOutTime += dt;
    vehicle.powerFactor = Math.max(0, 1 - vehicle.fuelOutTime / POWER_FADE_DURATION);
    if (vehicle.powerFactor === 0 && vehicle.speed < 5 && vehicle.raceState === 'racing') {
      vehicle.raceState = 'fuelOut';
    }
  }

  /** Estimation de la consommation par tour au rythme de course (≈ 21 s/tour). */
  estimateFuelPerLap(): number {
    return this.multiplier * 8;
  }
}
