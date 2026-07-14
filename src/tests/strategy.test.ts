import {describe, expect, it} from "vitest";
import {STOCK_CAR} from "../data/cars";
import {DRIVERS} from "../data/drivers";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {FuelSystem} from "../race/FuelSystem";
import {TireSystem} from "../race/TireSystem";
import {Track} from "../track/Track";
import {AIController} from "../vehicles/AIController";
import {Vehicle} from "../vehicles/Vehicle";

const track = new Track(CLASSIC_OVAL);

function makeAI(fuel: number): AIController {
	const v = new Vehicle(1, "IA", 2, 1, false, STOCK_CAR);
	v.raceState = "racing";
	v.fuel = fuel;
	return new AIController(v, DRIVERS[0]!, track);
}

describe("stratégie de stands de l’IA (§12.5)", () => {
	it("ne s’arrête pas quand le carburant suffit pour finir", () => {
		const ai = makeAI(100);
		ai.onLapCompleted(5, 8, 0);
		expect(ai.wantPit).toBe(false);
	});

	it("s’arrête quand la réserve devient critique", () => {
		const ai = makeAI(10);
		ai.onLapCompleted(10, 8, 0);
		expect(ai.wantPit).toBe(true);
	});

	it("jamais d’arrêt quand la consommation est désactivée", () => {
		const ai = makeAI(0);
		ai.onLapCompleted(10, 0, 0);
		expect(ai.wantPit).toBe(false);
	});

	it("la tolérance au risque étale les arrêts", () => {
		// Même carburant : le pilote prudent (pitRisk faible) s'arrête plus tôt.
		const cautious = makeAI(30);
		const daring = makeAI(30);
		// pitRisk 0,3 → marge ≈ 2,74 tours ; pitRisk 0,62 → marge ≈ 2,04 tours.
		const cautiousDriver = {...DRIVERS[0]!, pitRisk: 0.1};
		const daringDriver = {...DRIVERS[0]!, pitRisk: 0.9};
		const aiCautious = new AIController(cautious.vehicle, cautiousDriver, track);
		const aiDaring = new AIController(daring.vehicle, daringDriver, track);
		aiCautious.vehicle.fuel = 24;
		aiDaring.vehicle.fuel = 24;
		aiCautious.onLapCompleted(20, 8, 0);
		aiDaring.onLapCompleted(20, 8, 0);
		expect(aiCautious.wantPit).toBe(true);
		expect(aiDaring.wantPit).toBe(false);
	});

	it("à réserve de carburant égale, une course plus longue retarde le déclenchement de l’arrêt", () => {
		const fuelShort = new FuelSystem("normal", 20);
		const fuelLong = new FuelSystem("normal", 100);
		const aiShort = makeAI(20);
		const aiLong = makeAI(20);
		aiShort.onLapCompleted(5, fuelShort.estimateFuelPerLap(), 0);
		aiLong.onLapCompleted(5, fuelLong.estimateFuelPerLap(), 0);
		expect(aiShort.wantPit).toBe(true);
		expect(aiLong.wantPit).toBe(false);
	});

	it("à réserve de pneus égale, une course plus longue retarde aussi le déclenchement lié à l’usure", () => {
		const tiresShort = new TireSystem("normal", 20);
		const tiresLong = new TireSystem("normal", 100);
		const aiShort = makeAI(100);
		const aiLong = makeAI(100);
		aiShort.vehicle.tires = 15;
		aiLong.vehicle.tires = 15;
		aiShort.onLapCompleted(5, 0, tiresShort.estimateTiresPerLap());
		aiLong.onLapCompleted(5, 0, tiresLong.estimateTiresPerLap());
		expect(aiShort.wantPit).toBe(true);
		expect(aiLong.wantPit).toBe(false);
	});

	it("le nombre d’arrêts carburant nécessaires augmente avec la longueur de la course", () => {
		function stopsNeeded(raceLaps: number): number {
			const fuel = new FuelSystem("normal", raceLaps);
			const autonomyLaps = 100 / fuel.estimateFuelPerLap();
			return Math.max(0, Math.ceil(raceLaps / autonomyLaps) - 1);
		}
		expect(stopsNeeded(20)).toBe(1);
		expect(stopsNeeded(100)).toBeGreaterThanOrEqual(2);
	});
});
