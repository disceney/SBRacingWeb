import type { CarSpec } from '../data/cars';
import { Surface } from '../track/trackTypes';

/** Commandes normalisées appliquées à un véhicule. */
export interface Controls {
  /** Accélérateur [0, 1]. */
  throttle: number;
  /** Frein [0, 1]. */
  brake: number;
  /** Direction [-1 (gauche), 1 (droite)]. */
  steer: number;
}

/** État de course d'un véhicule. */
export type RaceState = 'grid' | 'racing' | 'finished' | 'fuelOut' | 'wrecked';

/** Étape courante d'un passage aux stands. */
export type PitPhase = 'none' | 'entering' | 'toBox' | 'stopped' | 'exiting';

/**
 * État complet d'un véhicule : identité, cinématique 2D, carburant et
 * suivi de course. La physique est appliquée par VehiclePhysics.
 */
export class Vehicle {
  // — Identité.
  readonly index: number;
  readonly driverName: string;
  readonly raceNumber: number;
  readonly colorIndex: number;
  readonly isPlayer: boolean;
  readonly spec: CarSpec;

  // — Cinématique (unités monde, radians ; vLat positif vers la droite du pilote).
  x = 0;
  y = 0;
  heading = 0;
  vLong = 0;
  vLat = 0;

  controls: Controls = { throttle: 0, brake: 0, steer: 0 };
  surface: Surface = Surface.Asphalt;

  // — Carburant.
  fuel: number;
  /** Facteur de puissance moteur [0, 1], réduit en panne sèche. */
  powerFactor = 1;
  /** Temps écoulé depuis la panne sèche (s). */
  fuelOutTime = 0;

  // — Pneus.
  /** État du train de pneus [0 (mort), 100 (neuf)]. */
  tires = 100;
  flatTire = false;
  /** Facteur d'adhérence lié aux pneus, appliqué par la physique. */
  tireGrip = 1;

  // — Dégâts.
  /** État mécanique [0 (épave), 100 (intact)]. */
  health = 100;
  /** Facteur de dégradation des performances [0, 1], appliqué par la physique. */
  healthFactor = 1;
  /** Intensité des impacts subis pendant le pas courant (consommée par DamageSystem). */
  lastImpact = 0;
  /** Temps passé immobilisé dans l'emplacement lors de l'arrêt en cours (s). */
  pitStopElapsed = 0;

  // — Suivi de course.
  raceState: RaceState = 'grid';
  /** Tours complétés. */
  lap = 0;
  /** Abscisse curviligne courante sur la ligne centrale. */
  progressS = 0;
  /** Prochain point de contrôle attendu. */
  nextCheckpoint = 1;
  /** Distance totale parcourue (tours × longueur + progression). */
  totalDistance = 0;
  finishTime: number | null = null;
  /** Tours bouclés au moment de l'arrivée (figés, le véhicule roule encore). */
  lapsAtFinish: number | null = null;

  // — Chronométrage (s).
  currentLapStart = 0;
  lastLapTime: number | null = null;
  bestLapTime: number | null = null;
  /** Dernier tour déjà chronométré : évite les doubles comptes après un recul. */
  timedLap = 0;

  // — Stands.
  pitPhase: PitPhase = 'none';
  pitStops = 0;
  pitTimeTotal = 0;
  /** Emplacement de ravitaillement attribué. */
  pitBoxIndex = 0;

  // — Signaux transitoires pour le rendu et l'audio (réinitialisés chaque pas).
  sliding = false;
  hitWall = false;
  hitCar = false;

  constructor(
    index: number,
    driverName: string,
    raceNumber: number,
    colorIndex: number,
    isPlayer: boolean,
    spec: CarSpec,
  ) {
    this.index = index;
    this.driverName = driverName;
    this.raceNumber = raceNumber;
    this.colorIndex = colorIndex;
    this.isPlayer = isPlayer;
    this.spec = spec;
    this.fuel = spec.fuelCapacity;
  }

  /** Vitesse scalaire (unités/s). */
  get speed(): number {
    return Math.hypot(this.vLong, this.vLat);
  }

  /** Vrai si le véhicule est dans une phase de passage aux stands. */
  get inPit(): boolean {
    return this.pitPhase !== 'none';
  }

  /** Vrai si le véhicule court encore (ni arrivé, ni en panne). */
  get isRunning(): boolean {
    return this.raceState === 'racing';
  }
}
