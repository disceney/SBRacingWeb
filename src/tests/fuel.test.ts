import {describe, expect, it} from "vitest";
import {STOCK_CAR} from "../data/cars";
import {FuelSystem} from "../race/FuelSystem";
import {Vehicle} from "../vehicles/Vehicle";

function makeRacingVehicle(): Vehicle {
	const v = new Vehicle(0, "Test", 1, 0, true, STOCK_CAR);
	v.raceState = "racing";
	return v;
}

describe("consommation de carburant", () => {
	it("consommation désactivée : jauge intacte", () => {
		const fuel = new FuelSystem("off", 20);
		const v = makeRacingVehicle();
		v.controls.throttle = 1;
		v.vLong = 200;
		for (let i = 0; i < 600; i++) fuel.step(v, 1 / 60);
		expect(v.fuel).toBe(STOCK_CAR.fuelCapacity);
		expect(fuel.enabled).toBe(false);
	});

	it("la consommation croît avec l’accélérateur", () => {
		const fuel = new FuelSystem("normal", 20);
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

	it("équilibrage §12.2 : sur une course de 20 tours, l’autonomie normale avoisine 10 tours", () => {
		const fuel = new FuelSystem("normal", 20);
		const perLap = fuel.estimateFuelPerLap();
		const lapsOnTank = STOCK_CAR.fuelCapacity / perLap;
		expect(lapsOnTank).toBeGreaterThan(9);
		expect(lapsOnTank).toBeLessThan(11);
	});

	it("panne sèche : fondu de puissance puis immobilisation (§12.1)", () => {
		const fuel = new FuelSystem("high", 20);
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
		expect(v.raceState).toBe("fuelOut");
	});

	it("autonomie proportionnelle : sur 100 tours l’estimation par tour avoisine 100/45", () => {
		const fuel = new FuelSystem("normal", 100);
		expect(fuel.estimateFuelPerLap()).toBeCloseTo(100 / 45, 2);
	});

	it("les niveaux reduced et high restent des multiplicateurs de l’estimation", () => {
		const normal = new FuelSystem("normal", 20);
		const reduced = new FuelSystem("reduced", 20);
		const high = new FuelSystem("high", 20);
		expect(reduced.estimateFuelPerLap()).toBeCloseTo(normal.estimateFuelPerLap() * 0.6, 5);
		expect(high.estimateFuelPerLap()).toBeCloseTo(normal.estimateFuelPerLap() * 1.6, 5);
	});

	it("l’autonomie carburant reste dans la bande 40-55 % de la course, quel que soit son nombre de tours", () => {
		for (const raceLaps of [20, 50, 100, 200]) {
			const fuel = new FuelSystem("normal", raceLaps);
			const fraction = 100 / (fuel.estimateFuelPerLap() * raceLaps);
			expect(fraction).toBeGreaterThanOrEqual(0.4);
			expect(fraction).toBeLessThanOrEqual(0.55);
		}
	});
});
