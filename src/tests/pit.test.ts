import { describe, expect, it } from 'vitest';
import { STOCK_CAR } from '../data/cars';
import { CLASSIC_OVAL } from '../data/tracks/classicOval';
import { FuelSystem } from '../race/FuelSystem';
import { PitSystem, type PitEvents } from '../race/PitSystem';
import { TireSystem } from '../race/TireSystem';
import { Track } from '../track/Track';
import { Vehicle } from '../vehicles/Vehicle';

const track = new Track(CLASSIC_OVAL);
const DT = 1 / 60;

function makeVehicle(isPlayer: boolean): Vehicle {
  const v = new Vehicle(0, 'Test', 1, 0, isPlayer, STOCK_CAR);
  v.raceState = 'racing';
  v.pitBoxIndex = 0;
  return v;
}

function stepAt(
  pit: PitSystem,
  v: Vehicle,
  x: number,
  y: number,
  wantPit = false,
  lapsRemaining = 5,
): PitEvents {
  v.x = x;
  v.y = y;
  v.progressS = track.progressAt(x, y);
  return pit.step(v, { dt: DT, wantPit, lapsRemaining });
}

describe('passage aux stands', () => {
  it('joueur : entrée → emplacement → ravitaillement → sortie', () => {
    const pit = new PitSystem(track, new FuelSystem('normal'), new TireSystem('off'));
    const v = makeVehicle(true);
    const box = CLASSIC_OVAL.pitBoxes[0]!;

    // Entrée dans la zone d'accès.
    stepAt(pit, v, 780, 920);
    expect(v.pitPhase).toBe('entering');
    // Passage dans la voie proprement dite.
    stepAt(pit, v, 900, 920);
    expect(v.pitPhase).toBe('toBox');
    // Arrêt dans l'emplacement : le ravitaillement démarre.
    v.vLong = 0;
    v.fuel = 20;
    const events = stepAt(pit, v, box.x - 2, box.y);
    expect(v.pitPhase).toBe('stopped');
    expect(events.stopped).toBe(true);
    expect(v.pitStops).toBe(1);
    // Jauge remplie progressivement (25 unités/s, §12.4).
    for (let i = 0; i < 60; i++) stepAt(pit, v, box.x - 2, box.y);
    expect(v.fuel).toBeCloseTo(20 + 25, 0);
    // Départ anticipé possible.
    v.vLong = 20;
    stepAt(pit, v, box.x + 10, box.y);
    expect(v.pitPhase).toBe('exiting');
    // Retour en piste.
    const exited = stepAt(pit, v, 1200, 1080);
    expect(v.pitPhase).toBe('none');
    expect(exited.exited).toBe(true);
  });

  it('IA : repart avec le plein utile pour finir la course', () => {
    const fuel = new FuelSystem('normal');
    const pit = new PitSystem(track, fuel, new TireSystem('off'));
    const v = makeVehicle(false);
    const box = CLASSIC_OVAL.pitBoxes[0]!;
    v.pitPhase = 'toBox';
    v.vLong = 0;
    v.fuel = 5;

    stepAt(pit, v, box.x - 2, box.y, false, 2);
    expect(v.pitPhase).toBe('stopped');
    // Besoin ≈ (2 + 1,5) tours × 8 unités = 28 : reste à l'arrêt en dessous.
    for (let i = 0; i < 40; i++) stepAt(pit, v, box.x - 2, box.y, false, 2);
    expect(v.pitPhase).toBe('stopped');
    for (let i = 0; i < 60; i++) stepAt(pit, v, box.x - 2, box.y, false, 2);
    expect(v.fuel).toBeGreaterThanOrEqual(28);
    expect(v.pitPhase).toBe('exiting');
  });

  it('IA : engage l’entrée dans la fenêtre quand un arrêt est demandé', () => {
    const pit = new PitSystem(track, new FuelSystem('normal'), new TireSystem('off'));
    const v = makeVehicle(false);
    // Sur la piste, juste avant la zone d'entrée des stands.
    const c = track.centerlineAt(track.progressAt(CLASSIC_OVAL.pitEntryZone.x1, 1080) - 60);
    stepAt(pit, v, c.x, c.y, true, 6);
    expect(v.pitPhase).toBe('entering');
  });

  it('temps passé aux stands cumulé pendant tout le transit', () => {
    const pit = new PitSystem(track, new FuelSystem('normal'), new TireSystem('off'));
    const v = makeVehicle(true);
    stepAt(pit, v, 780, 920);
    for (let i = 0; i < 60; i++) stepAt(pit, v, 900, 920);
    expect(v.pitTimeTotal).toBeGreaterThan(0.9);
  });
});
