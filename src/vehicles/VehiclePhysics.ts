import { mphToUnits, PIT_SPEED_LIMIT_MPH } from '../app/constants';
import { FLAT_SPEED_FACTOR } from '../race/TireSystem';
import { SURFACE_PROPS, Surface } from '../track/trackTypes';
import type { Track } from '../track/Track';
import type { Vehicle } from './Vehicle';

const PIT_SPEED_CAP = mphToUnits(PIT_SPEED_LIMIT_MPH);
/** Vitesse maximale en marche arrière. */
const REVERSE_SPEED_CAP = mphToUnits(-25);
/** En dessous de cette vitesse, la direction perd son autorité (pas de rotation à l'arrêt). */
const STEER_AUTHORITY_SPEED = 30;
/** Restitution des rebonds contre les murs. */
const WALL_RESTITUTION = 0.35;

/**
 * Physique arcade déterministe : intégration à pas fixe de la vitesse
 * longitudinale/latérale, direction limitée par l'adhérence (sous-virage et
 * glisse), effets de surface et rebonds contre les murs (§8).
 */
export function stepVehiclePhysics(vehicle: Vehicle, track: Track, dt: number): void {
  const spec = vehicle.spec;
  const c = vehicle.controls;

  vehicle.surface = track.surfaceAt(vehicle.x, vehicle.y);
  const props = SURFACE_PROPS[vehicle.surface];
  vehicle.sliding = false;
  vehicle.hitWall = false;

  // — Plafond de vitesse : surface, limite des stands et pneu crevé.
  let speedCap = spec.maxSpeed * props.maxSpeedFactor;
  if (vehicle.surface === Surface.PitLane) {
    speedCap = Math.min(speedCap, PIT_SPEED_CAP);
  }
  if (vehicle.flatTire) {
    speedCap = Math.min(speedCap, spec.maxSpeed * FLAT_SPEED_FACTOR);
  }
  // Dégâts : la vitesse de pointe se dégrade avec l'état mécanique.
  speedCap = Math.min(speedCap, spec.maxSpeed * (0.55 + 0.45 * vehicle.healthFactor));

  // — Accélération moteur (courbe en 1 − v/vMax) modulée par le carburant.
  if (c.throttle > 0 && vehicle.vLong < speedCap) {
    const curve = Math.max(0, 1 - vehicle.vLong / spec.maxSpeed);
    const damageFactor = 0.5 + 0.5 * vehicle.healthFactor;
    vehicle.vLong += spec.acceleration * curve * c.throttle * vehicle.powerFactor * damageFactor * dt;
  }

  // — Freinage ; à l'arrêt, le frein enclenche une marche arrière lente.
  if (c.brake > 0) {
    if (vehicle.vLong > 1) {
      vehicle.vLong = Math.max(0, vehicle.vLong - spec.braking * c.brake * dt);
    } else if (vehicle.vLong <= 1 && vehicle.powerFactor > 0) {
      vehicle.vLong = Math.max(REVERSE_SPEED_CAP, vehicle.vLong - spec.acceleration * 0.4 * c.brake * dt);
    }
  }

  // — Traînées : roue libre, résistance de surface, excès au-delà du plafond.
  // La résistance de surface croît avec la vitesse : un départ arrêté reste
  // possible sur l'herbe (sinon un véhicule immobilisé y serait condamné).
  const dragSpeedFactor = Math.min(1, Math.abs(vehicle.vLong) / 50);
  const drag = spec.coastDrag + 40 * props.drag * dragSpeedFactor;
  if (vehicle.vLong > 0) {
    vehicle.vLong = Math.max(0, vehicle.vLong - drag * dt);
  } else if (vehicle.vLong < 0) {
    vehicle.vLong = Math.min(0, vehicle.vLong + drag * dt);
  }
  if (vehicle.vLong > speedCap) {
    vehicle.vLong = Math.max(speedCap, vehicle.vLong - 120 * dt);
  }

  // — Direction limitée par l'adhérence : le surplus part en glisse latérale.
  const authority = Math.min(1, Math.abs(vehicle.vLong) / STEER_AUTHORITY_SPEED);
  const steerDamage = 0.7 + 0.3 * vehicle.healthFactor;
  const yawRateMax =
    (spec.steeringRate / (1 + Math.abs(vehicle.vLong) / 150)) * authority * steerDamage;
  const wantedYaw = c.steer * yawRateMax * Math.sign(vehicle.vLong || 1);
  const gripLimit = spec.lateralGrip * props.grip * vehicle.tireGrip;
  const requiredLat = Math.abs(vehicle.vLong * wantedYaw);
  let yaw = wantedYaw;
  if (requiredLat > gripLimit && Math.abs(vehicle.vLong) > 1) {
    // Sous-virage : rotation plafonnée, l'excédent alimente la glisse et frotte.
    yaw = (Math.sign(wantedYaw) * gripLimit) / Math.abs(vehicle.vLong);
    const excess = requiredLat - gripLimit;
    vehicle.vLat += Math.sign(wantedYaw) * excess * 0.55 * dt;
    vehicle.vLong = Math.max(0, vehicle.vLong - excess * 0.2 * dt);
    vehicle.sliding = true;
  }
  vehicle.heading += yaw * dt;

  // — Légère dérive à haute vitesse en virage, même sous la limite d'adhérence.
  if (Math.abs(yaw) > 0.01 && vehicle.vLong > spec.maxSpeed * 0.6) {
    vehicle.vLat += Math.sign(yaw) * vehicle.vLong * 0.045 * dt;
  }

  // — Amortissement de la glisse par l'adhérence (plus lent sur l'herbe).
  vehicle.vLat *= Math.exp(-4.5 * props.grip * dt);
  if (Math.abs(vehicle.vLat) > 8) vehicle.sliding = true;

  // — Intégration de la position.
  const cos = Math.cos(vehicle.heading);
  const sin = Math.sin(vehicle.heading);
  vehicle.x += (cos * vehicle.vLong - sin * vehicle.vLat) * dt;
  vehicle.y += (sin * vehicle.vLong + cos * vehicle.vLat) * dt;

  // — Collision avec les murs : repositionnement et rebond modéré.
  const hit = track.collideWalls(vehicle.x, vehicle.y, spec.collisionRadius);
  if (hit) {
    vehicle.x = hit.x;
    vehicle.y = hit.y;
    const vx = cos * vehicle.vLong - sin * vehicle.vLat;
    const vy = sin * vehicle.vLong + cos * vehicle.vLat;
    const dot = vx * hit.normalX + vy * hit.normalY;
    if (dot < 0) {
      // Réflexion de la composante normale, amortissement du tangentiel.
      const rvx = (vx - (1 + WALL_RESTITUTION) * dot * hit.normalX) * 0.82;
      const rvy = (vy - (1 + WALL_RESTITUTION) * dot * hit.normalY) * 0.82;
      vehicle.vLong = rvx * cos + rvy * sin;
      vehicle.vLat = -rvx * sin + rvy * cos;
      vehicle.hitWall = true;
      // Intensité du choc contre le mur : vitesse normale absorbée.
      vehicle.lastImpact += -dot;
    }
  }
}

/** Replace le véhicule sur la piste au même point de progression (touche R). */
export function resetToTrack(vehicle: Vehicle, track: Track): void {
  const s = track.progressAt(vehicle.x, vehicle.y);
  const c = track.centerlineAt(s);
  vehicle.x = c.x;
  vehicle.y = c.y;
  vehicle.heading = Math.atan2(c.ty, c.tx);
  vehicle.vLong = 0;
  vehicle.vLat = 0;
}
