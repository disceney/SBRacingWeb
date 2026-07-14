import {describe, expect, it} from "vitest";
import {STOCK_CAR} from "../data/cars";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {FuelSystem} from "../race/FuelSystem";
import {PitSystem} from "../race/PitSystem";
import {FLAT_GRIP, TireSystem} from "../race/TireSystem";
import {DamageSystem} from "../race/DamageSystem";
import {Track} from "../track/Track";
import {Vehicle} from "../vehicles/Vehicle";

const DT = 1 / 60;

function makeVehicle(isPlayer = false): Vehicle {
	const v = new Vehicle(0, "Test", 1, 0, isPlayer, STOCK_CAR);
	v.raceState = "racing";
	return v;
}

describe("usure des pneus", () => {
	it("désactivée : train intact et adhérence pleine", () => {
		const tires = new TireSystem("off");
		const v = makeVehicle();
		v.vLong = 250;
		for (let i = 0; i < 600; i++) tires.step(v, DT);
		expect(v.tires).toBe(100);
		expect(v.tireGrip).toBe(1);
		expect(tires.enabled).toBe(false);
	});

	it("l’usure progresse avec la vitesse et s’accélère en dérapage", () => {
		const tires = new TireSystem("normal", () => 1);
		const clean = makeVehicle();
		const sliding = makeVehicle();
		clean.vLong = 250;
		sliding.vLong = 250;
		sliding.sliding = true;
		for (let i = 0; i < 600; i++) {
			tires.step(clean, DT);
			tires.step(sliding, DT);
		}
		expect(clean.tires).toBeLessThan(100);
		expect(sliding.tires).toBeLessThan(clean.tires);
	});

	it("l’adhérence décroît jusqu’à −30 % à pneus morts", () => {
		const tires = new TireSystem("normal", () => 1);
		const v = makeVehicle();
		v.tires = 50;
		tires.step(v, DT);
		expect(v.tireGrip).toBeCloseTo(0.85, 2);
		v.tires = 0;
		tires.step(v, DT);
		expect(v.tireGrip).toBeCloseTo(0.7, 2);
	});

	it("équilibrage : un train dure entre 10 et 20 tours en usure normale", () => {
		const tires = new TireSystem("normal");
		const lapsPerSet = 100 / tires.estimateTiresPerLap();
		expect(lapsPerSet).toBeGreaterThan(10);
		expect(lapsPerSet).toBeLessThan(20);
	});

	it("crevaison sous 10 % d’usure : vitesse et adhérence effondrées", () => {
		// rng à 0 : la crevaison se produit dès que le risque est non nul.
		const tires = new TireSystem("normal", () => 0);
		const v = makeVehicle();
		v.tires = 5;
		v.vLong = 200;
		const events = tires.step(v, DT);
		expect(events.punctured).toBe(true);
		expect(v.flatTire).toBe(true);
		expect(v.tireGrip).toBe(FLAT_GRIP);
	});

	it("aucune crevaison au-dessus du seuil, même avec un tirage défavorable", () => {
		const tires = new TireSystem("normal", () => 0);
		const v = makeVehicle();
		v.tires = 50;
		v.vLong = 200;
		for (let i = 0; i < 600; i++) tires.step(v, DT);
		expect(v.flatTire).toBe(false);
	});

	it("le changement remet un train neuf et répare la crevaison", () => {
		const tires = new TireSystem("normal");
		const v = makeVehicle();
		v.tires = 3;
		v.flatTire = true;
		tires.swap(v);
		expect(v.tires).toBe(100);
		expect(v.flatTire).toBe(false);
		expect(v.tireGrip).toBe(1);
	});
});

describe("changement de pneus aux stands", () => {
	const track = new Track(CLASSIC_OVAL);
	const box = CLASSIC_OVAL.pitBoxes[0]!;

	function stopVehicle(pit: PitSystem, v: Vehicle): void {
		v.pitPhase = "toBox";
		v.vLong = 0;
		v.x = box.x - 2;
		v.y = box.y;
		v.progressS = track.progressAt(v.x, v.y);
		pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: !v.isPlayer});
		expect(v.pitPhase).toBe("stopped");
	}

	it("pneus neufs après 4 s d’arrêt, en parallèle du plein", () => {
		const pit = new PitSystem(track, new FuelSystem("normal"), new TireSystem("normal"), new DamageSystem("off"));
		const v = makeVehicle(false);
		v.fuel = 60;
		v.tires = 30;
		stopVehicle(pit, v);
		// Après 3 s : toujours les pneus usés.
		for (let i = 0; i < 180; i++) pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: !v.isPlayer});
		expect(v.tires).toBe(30);
		expect(v.pitPhase).toBe("stopped");
		// Après 4 s : train neuf posé, l'IA peut repartir.
		for (let i = 0; i < 70; i++) pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: !v.isPlayer});
		expect(v.tires).toBe(100);
		expect(v.pitPhase).toBe("exiting");
	});

	it("départ anticipé du joueur : les pneus restent usés", () => {
		const pit = new PitSystem(track, new FuelSystem("normal"), new TireSystem("normal"), new DamageSystem("off"));
		const v = makeVehicle(true);
		v.tires = 40;
		stopVehicle(pit, v);
		// Le joueur repart après 1 s seulement, en accélérant.
		for (let i = 0; i < 60; i++) pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: !v.isPlayer});
		v.controls.throttle = 1;
		pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: !v.isPlayer});
		expect(v.pitPhase).toBe("exiting");
		expect(v.tires).toBe(40);
	});

	it("une crevaison est réparée par l’arrêt complet", () => {
		const pit = new PitSystem(track, new FuelSystem("normal"), new TireSystem("normal"), new DamageSystem("off"));
		const v = makeVehicle(false);
		v.tires = 2;
		v.flatTire = true;
		stopVehicle(pit, v);
		for (let i = 0; i < 250; i++) pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: !v.isPlayer});
		expect(v.flatTire).toBe(false);
		expect(v.tires).toBe(100);
	});
});
