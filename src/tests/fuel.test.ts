import { describe, expect, it } from 'vitest';
import { STOCK_CAR } from '../data/cars';
import { FuelSystem } from '../race/FuelSystem';
import { Vehicle } from '../vehicles/Vehicle';

function makeRacingVehicle(): Vehicle {
  const v = new Vehicle(0, 'Test', 1, 0, true, STOCK_CAR);
  v.raceState = 'racing';
  return v;
}

describe('consommation de carburant', () => {
  it('consommation désactivée : jauge intacte', () => {
    const fuel = new FuelSystem('off');
    const v = makeRacingVehicle();
    v.controls.throttle = 1;
    v.vLong = 200;
    for (let i = 0; i < 600; i++) fuel.step(v, 1 / 60);
    expect(v.fuel).toBe(STOCK_CAR.fuelCapacity);
    expect(fuel.enabled).toBe(false);
  });

  it('la consommation croît avec l’accélérateur', () => {
    const fuel = new FuelSystem('normal');
    const idle = makeRacingVehicle();
    const flat = makeRacingVehicle();
    flat.controls.throttle = 1;
    flat.vLong = 250;
    for (let i = 0; i < 600; i++) {
      fuel.step(idle, 1 / 60);
      fuel.step(flat, 1 / 60);
    }
    expect(flat.fuel).toBeLessThan(idle.fuel);
    expect(idle.fuel).toBeLessThan(STOCK_CAR.fuelCapacity);
  });

  it('équilibrage §12.2 : 10 tours passent, 20 tours imposent un arrêt', () => {
    const fuel = new FuelSystem('normal');
    const perLap = fuel.estimateFuelPerLap();
    const lapsOnTank = STOCK_CAR.fuelCapacity / perLap;
    expect(lapsOnTank).toBeGreaterThan(10);
    expect(lapsOnTank).toBeLessThan(20);
  });

  it('panne sèche : fondu de puissance puis immobilisation (§12.1)', () => {
    const fuel = new FuelSystem('high');
    const v = makeRacingVehicle();
    v.fuel = 0;
    v.vLong = 3;
    let sawPartialPower = false;
    for (let i = 0; i < 360; i++) {
      fuel.step(v, 1 / 60);
      if (v.powerFactor > 0 && v.powerFactor < 1) sawPartialPower = true;
    }
    expect(sawPartialPower).toBe(true);
    expect(v.powerFactor).toBe(0);
    expect(v.raceState).toBe('fuelOut');
  });
});
