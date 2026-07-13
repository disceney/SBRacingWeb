import { beforeEach, describe, expect, it } from 'vitest';
import { STOCK_CAR } from '../data/cars';
import { CLASSIC_OVAL } from '../data/tracks/classicOval';
import { LapTracker } from '../race/LapTracker';
import { Track } from '../track/Track';
import { Vehicle } from '../vehicles/Vehicle';

const track = new Track(CLASSIC_OVAL);

function makeVehicle(): Vehicle {
  const v = new Vehicle(0, 'Test', 1, 0, true, STOCK_CAR);
  const slot = CLASSIC_OVAL.gridSlots[0]!;
  v.x = slot.x;
  v.y = slot.y;
  return v;
}

/** Déplace le véhicule sur la ligne centrale à l'abscisse donnée puis met à jour. */
function moveTo(tracker: LapTracker, v: Vehicle, s: number): void {
  const c = track.centerlineAt(s);
  v.x = c.x;
  v.y = c.y;
  tracker.update(v);
}

describe('comptage des tours', () => {
  let tracker: LapTracker;
  let vehicle: Vehicle;
  let laps: number;

  beforeEach(() => {
    tracker = new LapTracker(track);
    vehicle = makeVehicle();
    laps = 0;
    tracker.onLapCompleted = () => {
      laps++;
    };
    tracker.register(vehicle);
  });

  it('initialisation sur la grille : tour -1, ligne attendue', () => {
    expect(vehicle.lap).toBe(-1);
    expect(vehicle.nextCheckpoint).toBe(0);
  });

  it('un tour complet passe tous les points de contrôle et incrémente', () => {
    const s0 = track.progressAt(vehicle.x, vehicle.y);
    // Franchit la ligne (lap -1 → 0) puis boucle un tour entier (0 → 1).
    for (let i = 1; i <= Math.ceil((track.lapLength + 120) / 30); i++) {
      moveTo(tracker, vehicle, s0 + i * 30);
    }
    expect(vehicle.lap).toBe(1);
    expect(laps).toBe(2);
  });

  it('anti-triche : un aller-retour sur la ligne ne compte qu’une fois', () => {
    moveTo(tracker, vehicle, track.lapLength - 30);
    moveTo(tracker, vehicle, 15); // franchissement avant → tour 0
    expect(vehicle.lap).toBe(0);
    moveTo(tracker, vehicle, track.lapLength - 30); // marche arrière → tour -1
    expect(vehicle.lap).toBe(-1);
    moveTo(tracker, vehicle, 15); // re-franchissement → tour 0, pas 1
    expect(vehicle.lap).toBe(0);
  });

  it('couper par l’infield ne valide pas les points de contrôle', () => {
    moveTo(tracker, vehicle, track.lapLength - 30);
    moveTo(tracker, vehicle, 15); // tour 0 engagé
    const before = vehicle.lap;
    // Traversée du centre du monde (pelouse) : projections instables ignorées.
    vehicle.x = CLASSIC_OVAL.centerX;
    vehicle.y = CLASSIC_OVAL.centerY;
    tracker.update(vehicle);
    vehicle.x = CLASSIC_OVAL.centerX - 400;
    vehicle.y = CLASSIC_OVAL.centerY;
    tracker.update(vehicle);
    // Retour sur la piste juste avant la ligne : aucun tour gagné.
    moveTo(tracker, vehicle, track.lapLength - 60);
    moveTo(tracker, vehicle, 15);
    expect(vehicle.lap).toBe(before);
  });

  it('la distance de classement suit tours et progression', () => {
    moveTo(tracker, vehicle, track.lapLength - 30);
    moveTo(tracker, vehicle, 15);
    moveTo(tracker, vehicle, 300);
    expect(vehicle.totalDistance).toBeCloseTo(300, 0);
  });
});
