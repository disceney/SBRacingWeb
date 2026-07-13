import type { Track } from '../track/Track';
import type { Vehicle } from '../vehicles/Vehicle';
import type { RaceField } from '../vehicles/VehicleFactory';
import { stepVehiclePhysics } from '../vehicles/VehiclePhysics';
import { resolveCarCollisions } from '../vehicles/collisions';
import { FuelSystem } from './FuelSystem';
import { PitSystem } from './PitSystem';
import { LapTracker } from './LapTracker';
import { rankVehicles } from './RankingSystem';
import type { RaceResultRow, RaceSettings } from './raceTypes';

/** Durée du compte à rebours avant le départ (s). */
const COUNTDOWN_DURATION = 3.8;
/** Délai maximal accordé aux attardés après l'arrivée du vainqueur (s). */
const FINISH_TIMEOUT = 75;

export type RacePhase = 'countdown' | 'racing' | 'finished';

/** Événements ponctuels notifiés à la scène (affichage, audio). */
export type RaceEvent =
  | { type: 'countdown'; value: number }
  | { type: 'green' }
  | { type: 'lapCompleted'; vehicle: Vehicle }
  | { type: 'lastLap'; vehicle: Vehicle }
  | { type: 'finished'; vehicle: Vehicle }
  | { type: 'raceOver' };

/**
 * Chef d'orchestre d'une course : compte à rebours, boucle de simulation
 * (IA → physique → collisions → tours → carburant → stands → classement),
 * règles d'arrivée (§13.4) et compilation des résultats.
 */
export class RaceController {
  readonly track: Track;
  readonly settings: RaceSettings;
  readonly vehicles: Vehicle[];
  readonly player: Vehicle;
  readonly fuelSystem: FuelSystem;
  readonly lapTracker: LapTracker;
  private readonly pitSystem: PitSystem;
  private readonly field: RaceField;

  phase: RacePhase = 'countdown';
  countdown = COUNTDOWN_DURATION;
  raceTime = 0;
  ranking: Vehicle[];
  /** Meilleur tour de la course (§13.2). */
  raceBestLap: { time: number; vehicle: Vehicle } | null = null;
  onEvent: ((event: RaceEvent) => void) | null = null;

  private leaderFinishTime: number | null = null;
  private lastCountdownTick = 4;

  constructor(track: Track, settings: RaceSettings, field: RaceField) {
    this.track = track;
    this.settings = settings;
    this.field = field;
    this.vehicles = field.vehicles;
    this.player = field.player;
    this.fuelSystem = new FuelSystem(settings.fuelLevel);
    this.pitSystem = new PitSystem(track, this.fuelSystem);
    this.lapTracker = new LapTracker(track);
    this.lapTracker.onLapCompleted = (vehicle) => this.handleLapCompleted(vehicle);
    this.vehicles.forEach((vehicle) => this.lapTracker.register(vehicle));
    this.ranking = rankVehicles(this.vehicles);
  }

  /** Un pas de simulation à fréquence fixe (§18.2). */
  step(dt: number): void {
    if (this.phase === 'finished') return;

    if (this.phase === 'countdown') {
      this.countdown -= dt;
      const tick = Math.ceil(this.countdown);
      if (tick < this.lastCountdownTick && tick > 0) {
        this.lastCountdownTick = tick;
        this.onEvent?.({ type: 'countdown', value: tick });
      }
      if (this.countdown <= 0) {
        this.phase = 'racing';
        this.vehicles.forEach((vehicle) => {
          vehicle.raceState = 'racing';
        });
        this.onEvent?.({ type: 'green' });
      }
      return;
    }

    this.raceTime += dt;

    for (const vehicle of this.vehicles) {
      const ai = this.field.aiControllers.get(vehicle);
      ai?.update(dt, this.raceTime, this.vehicles);
      stepVehiclePhysics(vehicle, this.track, dt);
    }

    if (this.settings.collisions) {
      resolveCarCollisions(this.vehicles, this.track);
    }

    for (const vehicle of this.vehicles) {
      this.lapTracker.update(vehicle);
      if (vehicle.raceState === 'racing') {
        this.fuelSystem.step(vehicle, dt);
      }
      const ai = this.field.aiControllers.get(vehicle);
      const lapsRemaining = Math.max(0, this.settings.laps - Math.max(0, vehicle.lap));
      const events = this.pitSystem.step(vehicle, {
        dt,
        wantPit: ai?.wantPit ?? false,
        lapsRemaining,
      });
      // La demande d'arrêt n'est levée qu'après un arrêt effectif : un
      // emplacement manqué (trafic) sera retenté au tour suivant.
      if (events.stopped && ai) {
        ai.wantPit = false;
      }
    }

    this.ranking = rankVehicles(this.vehicles);

    // — Clôture de la course : tous arrivés/arrêtés ou délai écoulé (§13.4).
    const stillRunning = this.vehicles.some((v) => v.raceState === 'racing');
    const timedOut =
      this.leaderFinishTime !== null && this.raceTime > this.leaderFinishTime + FINISH_TIMEOUT;
    if ((!stillRunning || timedOut) && this.leaderFinishTime !== null) {
      this.phase = 'finished';
      this.onEvent?.({ type: 'raceOver' });
    }
  }

  /** Position (1-indexée) d'un véhicule au classement courant. */
  positionOf(vehicle: Vehicle): number {
    return this.ranking.indexOf(vehicle) + 1;
  }

  /** Résultats finaux (§15), figés à l'appel. */
  buildResults(): RaceResultRow[] {
    const winner = this.ranking[0] ?? null;
    return this.ranking.map((vehicle, i) => ({
      position: i + 1,
      driverName: vehicle.driverName,
      raceNumber: vehicle.raceNumber,
      isPlayer: vehicle.isPlayer,
      lapsCompleted: Math.max(0, vehicle.lapsAtFinish ?? vehicle.lap),
      totalTime: vehicle.finishTime,
      // Écart en temps uniquement dans le même tour que le vainqueur ; les
      // attardés sont signalés par leur nombre de tours.
      gap:
        vehicle.finishTime !== null &&
        winner?.finishTime != null &&
        vehicle !== winner &&
        (vehicle.lapsAtFinish ?? vehicle.lap) >= (winner.lapsAtFinish ?? winner.lap)
          ? vehicle.finishTime - winner.finishTime
          : null,
      bestLap: vehicle.bestLapTime,
      pitStops: vehicle.pitStops,
      pitTime: vehicle.pitTimeTotal,
      status:
        vehicle.raceState === 'finished'
          ? 'finished'
          : vehicle.raceState === 'fuelOut'
            ? 'fuelOut'
            : 'running',
    }));
  }

  private handleLapCompleted(vehicle: Vehicle): void {
    if (this.phase !== 'racing') return;

    // Un re-franchissement après un recul (anti-triche) ne produit ni chrono
    // ni annonce : seul un tour jamais atteint est chronométré.
    const isNewLap = vehicle.lap > vehicle.timedLap;
    vehicle.timedLap = Math.max(vehicle.timedLap, vehicle.lap);

    if (isNewLap && vehicle.lap >= 1) {
      const lapTime = this.raceTime - vehicle.currentLapStart;
      vehicle.lastLapTime = lapTime;
      if (vehicle.bestLapTime === null || lapTime < vehicle.bestLapTime) {
        vehicle.bestLapTime = lapTime;
      }
      if (this.raceBestLap === null || lapTime < this.raceBestLap.time) {
        this.raceBestLap = { time: lapTime, vehicle };
      }
    }
    vehicle.currentLapStart = this.raceTime;

    if (isNewLap) this.onEvent?.({ type: 'lapCompleted', vehicle });

    // — Règles d'arrivée : le vainqueur boucle le dernier tour, les autres
    // terminent le tour en cours (§13.4).
    const finished =
      vehicle.raceState === 'racing' &&
      (vehicle.lap >= this.settings.laps || this.leaderFinishTime !== null);
    if (finished) {
      vehicle.raceState = 'finished';
      vehicle.finishTime = this.raceTime;
      vehicle.lapsAtFinish = vehicle.lap;
      if (this.leaderFinishTime === null) this.leaderFinishTime = this.raceTime;
      this.onEvent?.({ type: 'finished', vehicle });
      return;
    }

    // — Annonce du dernier tour et stratégie de stands de l'IA.
    if (vehicle.raceState === 'racing') {
      if (isNewLap && vehicle.lap === this.settings.laps - 1) {
        this.onEvent?.({ type: 'lastLap', vehicle });
      }
      const ai = this.field.aiControllers.get(vehicle);
      ai?.onLapCompleted(this.settings.laps - vehicle.lap, this.fuelSystem.estimateFuelPerLap());
    }
  }
}
