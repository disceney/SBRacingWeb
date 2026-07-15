import {describe, expect, it} from "vitest";
import {STOCK_CAR} from "../data/cars";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {FuelSystem} from "../race/FuelSystem";
import {type PitEvents, PitSystem} from "../race/PitSystem";
import {TireSystem} from "../race/TireSystem";
import {DamageSystem} from "../race/DamageSystem";
import {Track} from "../track/Track";
import {Vehicle} from "../vehicles/Vehicle";

const track = new Track(CLASSIC_OVAL);
const DT = 1 / 60;

function makeVehicle(isPlayer: boolean): Vehicle {
	const v = new Vehicle(0, "Test", 1, 0, isPlayer, STOCK_CAR);
	v.raceState = "racing";
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
	dockRequested = false,
): PitEvents {
	v.x = x;
	v.y = y;
	v.progressS = track.progressAt(x, y);
	return pit.step(v, {dt: DT, wantPit, lapsRemaining, aiDriven: !v.isPlayer, dockRequested});
}

describe("passage aux stands", () => {
	it("joueur : entrée → emplacement → ravitaillement → sortie", () => {
		const pit = new PitSystem(track, new FuelSystem("normal", 20), new TireSystem("off", 20), new DamageSystem("off"));
		const v = makeVehicle(true);
		const box = CLASSIC_OVAL.pitBoxes[0]!;

		// Entrée dans la zone d'accès.
		stepAt(pit, v, 780, 920);
		expect(v.pitPhase).toBe("entering");
		// Passage dans la voie proprement dite.
		stepAt(pit, v, 900, 920);
		expect(v.pitPhase).toBe("toBox");
		// Arrêt dans l'emplacement : confirmation manuelle armée, le ravitaillement démarre.
		v.vLong = 0;
		v.fuel = 20;
		const events = stepAt(pit, v, box.x - 2, box.y, false, 5, true);
		expect(v.pitPhase).toBe("stopped");
		expect(events.stopped).toBe(true);
		expect(v.pitStops).toBe(1);
		// Jauge remplie progressivement (25 unités/s, §12.4).
		for (let i = 0; i < 60; i++) stepAt(pit, v, box.x - 2, box.y);
		expect(v.fuel).toBeCloseTo(20 + 25, 0);
		// Départ anticipé possible : le joueur se décroche en accélérant.
		v.controls.throttle = 1;
		stepAt(pit, v, box.x, box.y);
		expect(v.pitPhase).toBe("exiting");
		// Retour en piste.
		const exited = stepAt(pit, v, 1200, 1080);
		expect(v.pitPhase).toBe("none");
		expect(exited.exited).toBe(true);
	});

	it("IA : repart avec le plein utile pour finir la course", () => {
		// 25 tours (fraction 0,525) : autonomie de référence 13,125 tours → ≈ 7,62 unités/tour.
		const fuel = new FuelSystem("normal", 25);
		const pit = new PitSystem(track, fuel, new TireSystem("off", 20), new DamageSystem("off"));
		const v = makeVehicle(false);
		const box = CLASSIC_OVAL.pitBoxes[0]!;
		v.pitPhase = "toBox";
		v.vLong = 0;
		v.fuel = 5;

		stepAt(pit, v, box.x - 2, box.y, false, 2);
		expect(v.pitPhase).toBe("stopped");
		// Besoin ≈ (2 + 1,5) tours × 7,62 unités ≈ 26,67 : reste à l'arrêt en dessous.
		for (let i = 0; i < 40; i++) stepAt(pit, v, box.x - 2, box.y, false, 2);
		expect(v.pitPhase).toBe("stopped");
		for (let i = 0; i < 60; i++) stepAt(pit, v, box.x - 2, box.y, false, 2);
		expect(v.fuel).toBeGreaterThanOrEqual(80 / 3);
		expect(v.pitPhase).toBe("exiting");
	});

	it("IA : engage l’entrée dans la fenêtre quand un arrêt est demandé", () => {
		const pit = new PitSystem(track, new FuelSystem("normal", 20), new TireSystem("off", 20), new DamageSystem("off"));
		const v = makeVehicle(false);
		// Sur la piste, juste avant la zone d'entrée des stands.
		const c = track.centerlineAt(track.progressAt(CLASSIC_OVAL.pitEntryZone.x1, 1080) - 60);
		stepAt(pit, v, c.x, c.y, true, 6);
		expect(v.pitPhase).toBe("entering");
	});

	it("accrochage automatique : approche lente → posée exactement sur la dalle", () => {
		const pit = new PitSystem(track, new FuelSystem("normal", 20), new TireSystem("off", 20), new DamageSystem("off"));
		const v = makeVehicle(false);
		const box = CLASSIC_OVAL.pitBoxes[0]!;
		v.pitPhase = "toBox";
		// Arrive en biais, encore en mouvement, à 15 unités de la dalle.
		v.vLong = 25;
		v.heading = 0.3;
		const events = stepAt(pit, v, box.x - 15, box.y - 10);
		expect(events.stopped).toBe(true);
		expect(v.pitPhase).toBe("stopped");
		expect(v.x).toBe(box.x);
		expect(v.y).toBe(box.y);
		expect(v.heading).toBe(0);
		expect(v.speed).toBe(0);
	});

	it("joueur : sans confirmation, ne s'accroche jamais et ressort par la voie", () => {
		const pit = new PitSystem(track, new FuelSystem("normal", 20), new TireSystem("off", 20), new DamageSystem("off"));
		const v = makeVehicle(true);
		const box = CLASSIC_OVAL.pitBoxes[0]!;
		v.pitPhase = "toBox";
		v.vLong = 0;
		// Approche lente de la dalle, sans confirmation (touche E jamais pressée).
		const events = stepAt(pit, v, box.x - 2, box.y);
		expect(events.stopped).toBeUndefined();
		expect(v.pitPhase).toBe("toBox");
		// Traverse la dalle sans jamais s'arrêter : direction la sortie.
		stepAt(pit, v, box.x + 40, box.y);
		expect(v.pitPhase).toBe("exiting");
		const exited = stepAt(pit, v, 1200, 1080);
		expect(v.pitPhase).toBe("none");
		expect(exited.exited).toBe(true);
	});

	it("temps passé aux stands cumulé pendant tout le transit", () => {
		const pit = new PitSystem(track, new FuelSystem("normal", 20), new TireSystem("off", 20), new DamageSystem("off"));
		const v = makeVehicle(true);
		stepAt(pit, v, 780, 920);
		for (let i = 0; i < 60; i++) stepAt(pit, v, 900, 920);
		expect(v.pitTimeTotal).toBeGreaterThan(0.9);
	});
});
