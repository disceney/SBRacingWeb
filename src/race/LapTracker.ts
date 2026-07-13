import type { Track } from '../track/Track';
import type { Vehicle } from '../vehicles/Vehicle';

/** Tolérance latérale au-delà de la piste pour valider un point de contrôle. */
const CHECKPOINT_TOLERANCE = 45;

/**
 * Comptage des tours par points de contrôle ordonnés (§9.3) : chaque
 * franchissement doit se faire vers l'avant, à proximité de la piste (ou
 * dans la voie des stands), dans l'ordre imposé. Les franchissements en
 * marche arrière régressent l'attente, ce qui interdit les tours frauduleux.
 */
export class LapTracker {
  private readonly track: Track;
  /** Appelé quand un véhicule boucle un tour (franchissement avant de la ligne). */
  onLapCompleted: ((vehicle: Vehicle) => void) | null = null;

  constructor(track: Track) {
    this.track = track;
  }

  /** Initialise l'état de suivi d'un véhicule placé sur la grille. */
  register(vehicle: Vehicle): void {
    vehicle.progressS = this.track.progressAt(vehicle.x, vehicle.y);
    vehicle.lap = -1;
    vehicle.nextCheckpoint = 0;
    vehicle.totalDistance = this.rankingDistance(vehicle);
  }

  update(vehicle: Vehicle): void {
    const prevS = vehicle.progressS;
    const s = this.track.progressAt(vehicle.x, vehicle.y);
    vehicle.progressS = s;

    const lap = this.track.lapLength;
    let delta = s - prevS;
    if (delta > lap / 2) delta -= lap;
    if (delta < -lap / 2) delta += lap;
    // Saut de projection aberrant (traversée de l'infield) : ignoré.
    if (Math.abs(delta) > lap / 8) {
      vehicle.totalDistance = this.rankingDistance(vehicle);
      return;
    }

    const checkpoints = this.track.data.checkpoints;
    if (delta > 0) {
      // Franchissement avant du point de contrôle attendu.
      const cp = checkpoints[vehicle.nextCheckpoint]!;
      if (crossedForward(prevS, s, cp.s, lap) && this.nearTrack(vehicle)) {
        if (vehicle.nextCheckpoint === 0) {
          vehicle.lap += 1;
          this.onLapCompleted?.(vehicle);
        }
        vehicle.nextCheckpoint = (vehicle.nextCheckpoint + 1) % checkpoints.length;
      }
    } else if (delta < 0) {
      // Franchissement arrière : on régresse l'attente (anti-triche).
      const prevIndex = (vehicle.nextCheckpoint + checkpoints.length - 1) % checkpoints.length;
      const cp = checkpoints[prevIndex]!;
      if (crossedForward(s, prevS, cp.s, lap)) {
        if (prevIndex === 0) {
          vehicle.lap -= 1;
        }
        vehicle.nextCheckpoint = prevIndex;
      }
    }

    vehicle.totalDistance = this.rankingDistance(vehicle);
  }

  /** Distance de classement : tours bouclés + progression courante (§13.3). */
  private rankingDistance(vehicle: Vehicle): number {
    return vehicle.lap * this.track.lapLength + vehicle.progressS;
  }

  /** Le véhicule est-il assez près de la piste (ou aux stands) pour valider ? */
  private nearTrack(vehicle: Vehicle): boolean {
    if (this.track.isInPitArea(vehicle.x, vehicle.y)) return true;
    const d = Math.abs(this.track.signedDistance(vehicle.x, vehicle.y));
    return d <= this.track.data.trackHalfWidth + CHECKPOINT_TOLERANCE;
  }
}

/** Vrai si l'intervalle orienté [from, to] (modulo lap) contient cpS. */
function crossedForward(from: number, to: number, cpS: number, lap: number): boolean {
  const travelled = ((to - from) % lap + lap) % lap;
  const toCp = ((cpS - from) % lap + lap) % lap;
  return toCp > 0 && toCp <= travelled;
}
