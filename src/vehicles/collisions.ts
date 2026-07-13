import type { Track } from '../track/Track';
import type { Vehicle } from './Vehicle';

const RESTITUTION = 0.25;

/**
 * Résolution des collisions voiture contre voiture par paires de cercles :
 * correction des chevauchements à parts égales puis échange d'impulsion le
 * long de la normale (masses identiques). Aucun véhicule ne reste bloqué :
 * la séparation est toujours appliquée (§8.5). Les véhicules présents dans
 * la zone des stands sont ignorés : l'espace y est trop étroit pour que des
 * contacts restent équitables, et aucun embouteillage ne doit s'y former.
 */
export function resolveCarCollisions(vehicles: Vehicle[], track: Track): void {
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const a = vehicles[i]!;
      const b = vehicles[j]!;
      if (track.isInPitArea(a.x, a.y) || track.isInPitArea(b.x, b.y)) continue;
      const minDist = a.spec.collisionRadius + b.spec.collisionRadius;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist2 = dx * dx + dy * dy;
      if (dist2 >= minDist * minDist || dist2 === 0) continue;

      const dist = Math.sqrt(dist2);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      // Séparation symétrique des chevauchements.
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      // Vitesses monde.
      const va = worldVelocity(a);
      const vb = worldVelocity(b);
      const relN = (vb.x - va.x) * nx + (vb.y - va.y) * ny;
      if (relN < 0) {
        // Impulsion normale (masses égales) avec restitution modérée.
        const impulse = (-(1 + RESTITUTION) * relN) / 2;
        applyImpulse(a, -nx * impulse, -ny * impulse);
        applyImpulse(b, nx * impulse, ny * impulse);
        // Perturbation de cap proportionnelle au choc, orientée selon le côté touché (§8.2).
        const kick = Math.min(0.1, impulse * 0.0012);
        a.heading += lateralSide(a, nx, ny) * kick;
        b.heading += lateralSide(b, -nx, -ny) * kick;
        a.hitCar = true;
        b.hitCar = true;
      }
    }
  }
}

/** Signe du côté (gauche/droite du pilote) d'où provient le contact. */
function lateralSide(v: Vehicle, nx: number, ny: number): number {
  const cross = Math.cos(v.heading) * ny - Math.sin(v.heading) * nx;
  return cross >= 0 ? -1 : 1;
}

function worldVelocity(v: Vehicle): { x: number; y: number } {
  const cos = Math.cos(v.heading);
  const sin = Math.sin(v.heading);
  return { x: cos * v.vLong - sin * v.vLat, y: sin * v.vLong + cos * v.vLat };
}

function applyImpulse(v: Vehicle, ix: number, iy: number): void {
  const cos = Math.cos(v.heading);
  const sin = Math.sin(v.heading);
  v.vLong += ix * cos + iy * sin;
  v.vLat += -ix * sin + iy * cos;
}
