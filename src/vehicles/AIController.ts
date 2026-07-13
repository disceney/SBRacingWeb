import { mphToUnits, PIT_SPEED_LIMIT_MPH } from '../app/constants';
import type { DriverProfile } from '../data/drivers';
import type { Track } from '../track/Track';
import type { RacingLine } from '../track/RacingLine';
import { Surface } from '../track/trackTypes';
import type { Vehicle } from './Vehicle';

const PIT_CAP = mphToUnits(PIT_SPEED_LIMIT_MPH);
/** Décalages latéraux des trajectoires nommées (§11.1). */
const LINE_OFFSETS = { inside: -70, middle: 0, outside: 70 } as const;
/** Demi-largeur exploitable de la piste pour les décalages IA. */
const MAX_OFFSET = 78;

/**
 * Pilote artificiel : suivi de trajectoire par poursuite d'un point cible,
 * anticipation des virages par échantillonnage de courbure, évitement et
 * dépassement par décalage latéral, conduite dans les stands et
 * récupération après incident (§11).
 */
export class AIController {
  readonly vehicle: Vehicle;
  readonly driver: DriverProfile;
  private readonly track: Track;

  /** Décalage latéral courant (lissé) et cible. */
  private offset: number;
  private targetOffset: number;
  /** Rythme global dérivé du niveau du pilote. */
  private readonly pace: number;
  private readonly gripFactor: number;

  private stuckTimer = 0;
  private reverseTimer = 0;
  /** Demande d'arrêt aux stands au prochain passage devant l'entrée. */
  wantPit = false;

  constructor(vehicle: Vehicle, driver: DriverProfile, track: Track) {
    this.vehicle = vehicle;
    this.driver = driver;
    this.track = track;
    this.offset = LINE_OFFSETS[driver.preferredLine];
    this.targetOffset = this.offset;
    this.pace = 0.86 + driver.skill * 0.13;
    this.gripFactor = 0.9 + driver.skill * 0.12;
  }

  /**
   * Stratégie de stands, évaluée à chaque tour bouclé (§12.5) : arrêt si le
   * carburant ne permet pas de finir et que la marge tolérée est entamée.
   * La marge dépend de pitRisk, ce qui étale naturellement les arrêts.
   */
  onLapCompleted(lapsRemaining: number, fuelPerLap: number): void {
    if (fuelPerLap <= 0) {
      this.wantPit = false;
      return;
    }
    const v = this.vehicle;
    const lapsOfFuel = v.fuel / fuelPerLap;
    const canFinish = lapsOfFuel >= lapsRemaining + 0.3;
    const margin = 1.2 + (1 - this.driver.pitRisk) * 2.2;
    this.wantPit = !canFinish && lapsOfFuel < margin;
  }

  update(dt: number, time: number, vehicles: Vehicle[]): void {
    const v = this.vehicle;
    const c = v.controls;
    if (!v.isRunning && v.raceState !== 'finished') {
      c.throttle = 0;
      c.brake = 1;
      c.steer = 0;
      return;
    }

    // — Marche arrière de dégagement après blocage prolongé.
    if (this.reverseTimer > 0) {
      this.reverseTimer -= dt;
      c.throttle = 0;
      c.brake = 1;
      c.steer = 0;
      return;
    }

    if (v.pitPhase !== 'none') {
      this.drivePit(dt);
    } else {
      this.driveTrack(dt, time, vehicles);
    }

    // — Détection de blocage (hors arrêt volontaire au stand).
    const wantsToMove = c.throttle > 0.4;
    if (wantsToMove && v.speed < 12 && v.pitPhase !== 'stopped') {
      this.stuckTimer += dt;
      if (this.stuckTimer > 2) {
        this.stuckTimer = 0;
        this.reverseTimer = 1.1;
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  /** Conduite normale sur la piste. */
  private driveTrack(dt: number, time: number, vehicles: Vehicle[]): void {
    const v = this.vehicle;

    // Égaré dans la zone des stands sans intention d'arrêt (poussé lors d'un
    // évitement) : rejoindre la sortie plutôt que viser la piste à travers
    // le mur des stands.
    if (this.track.isInPitArea(v.x, v.y)) {
      const line =
        v.x >= this.track.data.pitExitZone.x1 ? this.track.pitExitLine : this.track.pitLaneLine;
      this.steerAlong(line, line.project(v.x, v.y));
      this.applySpeed(mphToUnits(PIT_SPEED_LIMIT_MPH));
      return;
    }

    const s = this.track.progressAt(v.x, v.y);

    // — Évitement et dépassement.
    let speedLimit = Infinity;
    const blocker = this.findBlocker(s, vehicles);
    if (blocker) {
      const blockerOff = this.track.signedDistance(blocker.car.x, blocker.car.y);
      const stopped = blocker.car.speed < 25;
      // Choix du côté offrant le plus d'espace, biaisé vers l'intérieur.
      const room = stopped ? 55 : 45;
      let side = blockerOff > this.offset ? -1 : 1;
      if (Math.abs(blockerOff - this.offset) < 8) side = blockerOff >= 0 ? -1 : 1;
      const candidate = clamp(blockerOff + side * room, -MAX_OFFSET, MAX_OFFSET);
      const alternative = clamp(blockerOff - side * room, -MAX_OFFSET, MAX_OFFSET);
      this.targetOffset = this.isSlotFree(candidate, s, vehicles, blocker.car)
        ? candidate
        : alternative;
      // Régulation de l'allure tant que le dépassement n'est pas engagé.
      const clearing = Math.abs(this.offset - blockerOff) > 30;
      if (!clearing) {
        const closeness = 1 - blocker.gap / 130;
        const patience = 0.9 + this.driver.aggression * 0.1;
        speedLimit = stopped
          ? Math.max(60, blocker.car.speed + 40)
          : Math.max(40, blocker.car.speed * (patience + 0.06 * (1 - closeness)));
      }
    } else {
      this.targetOffset = LINE_OFFSETS[this.driver.preferredLine];
    }

    // — Retour progressif vers la trajectoire (§11.2).
    this.offset += clamp(this.targetOffset - this.offset, -60 * dt, 60 * dt);

    // — Point de poursuite sur la ligne décalée.
    const lookahead = clamp(v.vLong * 0.55, 45, 165);
    const ahead = this.track.centerlineAt(s + lookahead);
    const targetX = ahead.x - ahead.ty * this.offset;
    const targetY = ahead.y + ahead.tx * this.offset;

    // — Cap : correction proportionnelle + bruit d'imprécision du pilote.
    const desired = Math.atan2(targetY - v.y, targetX - v.x);
    const angleErr = wrapAngle(desired - v.heading);
    const noise = (1 - this.driver.consistency) * 0.055 * Math.sin(time * 1.7 + v.index * 2.3);
    // Tête-à-queue : réalignement prioritaire à vitesse réduite.
    const reversed = Math.abs(angleErr) > 2.2;
    v.controls.steer = clamp(angleErr * 2.4 + noise, -1, 1);

    // — Vitesse cible : courbure anticipée + distance de freinage (§11.2).
    const decel = v.spec.braking * 0.92;
    const gripEff = v.spec.lateralGrip * this.gripFactor;
    let target = v.spec.maxSpeed * this.pace;
    for (const d of [0, 60, 130, 210, 300, 400]) {
      const k = this.track.curvatureAt(s + lookahead * 0.4 + d);
      if (k > 0) {
        const vCorner = Math.sqrt(gripEff / k) * this.pace;
        const vHere = Math.sqrt(vCorner * vCorner + 2 * decel * d);
        target = Math.min(target, vHere);
      }
    }
    target = Math.min(target, speedLimit);
    if (reversed) target = Math.min(target, 50);
    // Herbe : ralentir et revenir en piste sans excès.
    if (v.surface === Surface.Grass || v.surface === Surface.Kerb) {
      target = Math.min(target, 120);
    }

    this.applySpeed(target);
  }

  /** Conduite dans la voie des stands selon la phase courante. */
  private drivePit(dt: number): void {
    const v = this.vehicle;
    const c = v.controls;
    void dt;

    if (v.pitPhase === 'stopped') {
      c.throttle = 0;
      c.brake = 1;
      c.steer = 0;
      return;
    }

    let line: RacingLine;
    let target: number;
    if (v.pitPhase === 'entering') {
      line = this.track.pitEntryLine;
      const d = line.project(v.x, v.y);
      const remaining = line.length - d;
      target = Math.sqrt(PIT_CAP * PIT_CAP + 2 * v.spec.braking * Math.max(0, remaining - 10));
      this.steerAlong(line, d);
    } else if (v.pitPhase === 'toBox') {
      line = this.track.pitLaneLine;
      const d = line.project(v.x, v.y);
      const box = this.track.data.pitBoxes[v.pitBoxIndex]!;
      const distToStop = Math.max(0, box.x - 6 - v.x);
      target = Math.min(PIT_CAP, Math.sqrt(2 * v.spec.braking * distToStop));
      // Circulation sur la ligne de la voie, déport tardif vers la dalle.
      const laneY = this.track.data.pitLane.y2 - 20;
      const lateral = distToStop < 90 ? box.y - laneY : 0;
      this.steerAlong(line, d, lateral);
    } else {
      line = this.track.pitExitLine;
      const d = line.project(v.x, v.y);
      target = v.surface === Surface.PitLane ? PIT_CAP : v.spec.maxSpeed * this.pace;
      this.steerAlong(line, d);
    }
    this.applySpeed(target);
  }

  /** Oriente le véhicule le long d'une polyligne avec un décalage latéral facultatif. */
  private steerAlong(line: RacingLine, d: number, lateral = 0): void {
    const v = this.vehicle;
    const look = clamp(v.vLong * 0.5, 25, 70);
    const p = line.pointAt(d + look);
    const desired = Math.atan2(p.y + lateral - v.y, p.x - v.x);
    v.controls.steer = clamp(wrapAngle(desired - v.heading) * 2.6, -1, 1);
  }

  /** Convertit une vitesse cible en accélérateur/frein. */
  private applySpeed(target: number): void {
    const v = this.vehicle;
    const err = target - v.vLong;
    v.controls.throttle = clamp(err / 10, 0, 1);
    v.controls.brake = clamp(-err / 12, 0, 1);
  }

  /** Voiture gênante la plus proche devant, dans un couloir latéral proche. */
  private findBlocker(
    s: number,
    vehicles: Vehicle[],
  ): { car: Vehicle; gap: number } | null {
    const v = this.vehicle;
    let best: { car: Vehicle; gap: number } | null = null;
    for (const other of vehicles) {
      if (other === v || other.inPit || other.raceState === 'grid') continue;
      const gap = wrapDistance(other.progressS - s, this.track.lapLength);
      if (gap <= 4 || gap > 130) continue;
      const otherOff = this.track.signedDistance(other.x, other.y);
      if (Math.abs(otherOff - this.offset) > 34 && other.speed > 25) continue;
      if (!best || gap < best.gap) best = { car: other, gap };
    }
    return best;
  }

  /** Vérifie qu'aucune autre voiture n'occupe le couloir visé. */
  private isSlotFree(offset: number, s: number, vehicles: Vehicle[], ignored: Vehicle): boolean {
    const v = this.vehicle;
    for (const other of vehicles) {
      if (other === v || other === ignored || other.inPit) continue;
      const gap = Math.abs(wrapDistance(other.progressS - s, this.track.lapLength));
      const behind = wrapDistance(s - other.progressS, this.track.lapLength);
      if (gap > 90 && behind > 40) continue;
      const otherOff = this.track.signedDistance(other.x, other.y);
      if (Math.abs(otherOff - offset) < 30) return false;
    }
    return true;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapAngle(a: number): number {
  let r = a;
  while (r > Math.PI) r -= Math.PI * 2;
  while (r < -Math.PI) r += Math.PI * 2;
  return r;
}

/** Écart curviligne signé ramené dans [-lap/2, lap/2]. */
function wrapDistance(delta: number, lapLength: number): number {
  let d = ((delta % lapLength) + lapLength) % lapLength;
  if (d > lapLength / 2) d -= lapLength;
  return d;
}
