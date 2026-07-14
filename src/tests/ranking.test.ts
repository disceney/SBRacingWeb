import {describe, expect, it} from "vitest";
import {STOCK_CAR} from "../data/cars";
import {estimateGapSeconds, rankVehicles} from "../race/RankingSystem";
import {formatGap, formatLapTime} from "../race/TimingSystem";
import {Vehicle} from "../vehicles/Vehicle";

function makeVehicle(index: number): Vehicle {
	const v = new Vehicle(index, `P${index}`, index + 1, index, false, STOCK_CAR);
	v.raceState = "racing";
	return v;
}

describe("classement (§13.3)", () => {
	it("trie par distance parcourue en course", () => {
		const a = makeVehicle(0);
		const b = makeVehicle(1);
		const c = makeVehicle(2);
		a.totalDistance = 9000;
		b.totalDistance = 12000;
		c.totalDistance = 3000;
		expect(rankVehicles([a, b, c]).map((v) => v.index)).toEqual([1, 0, 2]);
	});

	it("les arrivés précèdent, classés par temps final", () => {
		const a = makeVehicle(0);
		const b = makeVehicle(1);
		const c = makeVehicle(2);
		a.totalDistance = 99000;
		b.raceState = "finished";
		b.finishTime = 300;
		c.raceState = "finished";
		c.finishTime = 290;
		expect(rankVehicles([a, b, c]).map((v) => v.index)).toEqual([2, 1, 0]);
	});

	it("un attardé arrêté plus tôt ne devance pas une voiture ayant plus de tours", () => {
		const fast = makeVehicle(0);
		const lapped = makeVehicle(1);
		fast.raceState = "finished";
		fast.lap = 19;
		fast.finishTime = 435;
		lapped.raceState = "finished";
		lapped.lap = 18;
		lapped.finishTime = 428; // arrêté dès le passage du vainqueur
		expect(rankVehicles([lapped, fast])[0]).toBe(fast);
		expect(rankVehicles([lapped, fast])[1]).toBe(lapped);
	});

	it("écart : temps exacts après l’arrivée, estimation sinon", () => {
		const a = makeVehicle(0);
		const b = makeVehicle(1);
		a.raceState = "finished";
		a.finishTime = 100;
		b.raceState = "finished";
		b.finishTime = 103.5;
		expect(estimateGapSeconds(a, b)).toBeCloseTo(3.5);

		const c = makeVehicle(2);
		const d = makeVehicle(3);
		c.totalDistance = 1000;
		d.totalDistance = 800;
		d.vLong = 200;
		expect(estimateGapSeconds(c, d)).toBeCloseTo(1);
	});
});

describe("formatage des temps (§13.2)", () => {
	it("meilleur tour et écarts", () => {
		expect(formatLapTime(83.4567)).toBe("1:23.457");
		expect(formatLapTime(23.4)).toBe("23.400");
		expect(formatLapTime(null)).toBe("--:--.---");
		expect(formatGap(3.412)).toBe("+3.412");
		expect(formatGap(null)).toBe("—");
	});
});
