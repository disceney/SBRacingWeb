import type { Vehicle } from '../vehicles/Vehicle';

/**
 * Classement (§13.3) : les arrivés d'abord (par temps final), puis les
 * concurrents en piste par distance parcourue (tours + progression, l'ordre
 * des points de contrôle étant intégré à la distance validée).
 */
export function rankVehicles(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => {
    const aFinished = a.raceState === 'finished';
    const bFinished = b.raceState === 'finished';
    if (aFinished && bFinished) return (a.finishTime ?? 0) - (b.finishTime ?? 0);
    if (aFinished !== bFinished) return aFinished ? -1 : 1;
    return b.totalDistance - a.totalDistance;
  });
}

/**
 * Écart estimé (en secondes) entre un véhicule et celui qui le précède au
 * classement, à partir de l'écart de distance et de la vitesse du poursuivant.
 */
export function estimateGapSeconds(ahead: Vehicle, behind: Vehicle): number {
  if (ahead.finishTime !== null && behind.finishTime !== null) {
    return behind.finishTime - ahead.finishTime;
  }
  const distance = ahead.totalDistance - behind.totalDistance;
  return distance / Math.max(60, behind.speed);
}
