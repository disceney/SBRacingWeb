import { mphToUnits } from '../app/constants';

/** Caractéristiques d'un modèle de véhicule (§19.2), en unités monde. */
export interface CarSpec {
  id: string;
  /** Vitesse maximale (unités/s). */
  maxSpeed: number;
  /** Accélération moteur de base (unités/s²). */
  acceleration: number;
  /** Décélération de freinage (unités/s²). */
  braking: number;
  /** Vitesse angulaire maximale à basse vitesse (rad/s). */
  steeringRate: number;
  /** Accélération latérale maximale sur asphalte (unités/s²). */
  lateralGrip: number;
  /** Traînée naturelle en roue libre (unités/s²). */
  coastDrag: number;
  /** Capacité du réservoir (unités arbitraires). */
  fuelCapacity: number;
  /** Rayon de collision (unités). */
  collisionRadius: number;
}

/** Stock-car standard : calibré sur les valeurs du §8.3. */
export const STOCK_CAR: CarSpec = {
  id: 'stock-standard',
  maxSpeed: mphToUnits(180),
  // v(t) = vMax(1 − e^(−a·t/vMax)) : 0 → 100 mph en ≈ 4 s.
  acceleration: 53,
  // 180 → 60 mph en ≈ 3 s.
  braking: 58,
  steeringRate: 2.4,
  // Permet ≈ 150 mph dans les virages de rayon 380 (a = v²/R).
  lateralGrip: 130,
  coastDrag: 7,
  fuelCapacity: 100,
  collisionRadius: 14,
};
