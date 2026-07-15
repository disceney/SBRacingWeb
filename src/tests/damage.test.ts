import {describe, expect, it} from "vitest";
import {STOCK_CAR} from "../data/cars";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {DRIVERS} from "../data/drivers";
import {DamageSystem} from "../race/DamageSystem";
import {FuelSystem} from "../race/FuelSystem";
import {PitSystem} from "../race/PitSystem";
import {TireSystem} from "../race/TireSystem";
import {Track} from "../track/Track";
import {AIController} from "../vehicles/AIController";
import {Vehicle} from "../vehicles/Vehicle";

const DT = 1 / 60;
const track = new Track(CLASSIC_OVAL);

function makeVehicle(isPlayer = false): Vehicle {
	const v = new Vehicle(0, "Test", 1, 0, isPlayer, STOCK_CAR);
	v.raceState = "racing";
	return v;
}

describe("dégâts mécaniques", () => {
	it("désactivés : aucun impact ne compte", () => {
		const damage = new DamageSystem("off");
		const v = makeVehicle();
		v.lastImpact = 300;
		damage.step(v);
		expect(v.health).toBe(100);
		expect(v.healthFactor).toBe(1);
		expect(damage.enabled).toBe(false);
	});

	it("les frottements légers sont ignorés, les chocs francs comptent", () => {
		const damage = new DamageSystem("normal");
		const v = makeVehicle();
		v.lastImpact = 10; // frottement de peloton
		damage.step(v);
		expect(v.health).toBe(100);
		v.lastImpact = 115; // choc franc
		damage.step(v);
		expect(v.health).toBeCloseTo(100 - 100 * 0.13, 1);
		// L'impact est consommé : le pas suivant n'inflige rien.
		damage.step(v);
		expect(v.health).toBeCloseTo(87, 1);
	});

	it("le niveau élevé amplifie les dégâts", () => {
		const normal = new DamageSystem("normal");
		const high = new DamageSystem("high");
		const a = makeVehicle();
		const b = makeVehicle();
		a.lastImpact = 100;
		b.lastImpact = 100;
		normal.step(a);
		high.step(b);
		expect(b.health).toBeLessThan(a.health);
	});

	it("casse mécanique à zéro : moteur coupé puis abandon définitif", () => {
		const damage = new DamageSystem("normal");
		const v = makeVehicle();
		v.health = 1;
		v.lastImpact = 300;
		v.vLong = 100;
		damage.step(v);
		expect(v.health).toBe(0);
		expect(v.powerFactor).toBe(0);
		expect(v.raceState).toBe("racing"); // encore en mouvement
		v.vLong = 2;
		const events = damage.step(v);
		expect(events.wrecked).toBe(true);
		expect(v.raceState).toBe("wrecked");
	});

	it("réparation aux stands : continue, départ anticipé partiel", () => {
		const pit = new PitSystem(
			track,
			new FuelSystem("off", 20),
			new TireSystem("off", 20),
			new DamageSystem("normal"),
		);
		const v = makeVehicle(true);
		const box = CLASSIC_OVAL.pitBoxes[0]!;
		v.health = 40;
		v.pitPhase = "toBox";
		v.vLong = 0;
		v.x = box.x - 2;
		v.y = box.y;
		// Confirmation manuelle armée par le joueur pour s'accrocher à sa dalle.
		pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: false, dockRequested: true});
		expect(v.pitPhase).toBe("stopped");
		// 2 s de réparation ≈ +25 %.
		for (let i = 0; i < 120; i++) {
			pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: false});
		}
		expect(v.health).toBeCloseTo(65, 0);
		// Départ anticipé en accélérant : les dégâts restants demeurent.
		v.controls.throttle = 1;
		pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: false});
		expect(v.pitPhase).toBe("exiting");
		expect(v.health).toBeLessThan(70);
	});

	it("l’IA reste au stand jusqu’à une mécanique saine", () => {
		const pit = new PitSystem(
			track,
			new FuelSystem("off", 20),
			new TireSystem("off", 20),
			new DamageSystem("normal"),
		);
		const v = makeVehicle(false);
		const box = CLASSIC_OVAL.pitBoxes[0]!;
		v.health = 30;
		v.pitPhase = "toBox";
		v.vLong = 0;
		v.x = box.x - 2;
		v.y = box.y;
		pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: true});
		// Après 2 s : toujours à l'arrêt (santé < 85).
		for (let i = 0; i < 120; i++) {
			pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: true});
		}
		expect(v.pitPhase).toBe("stopped");
		// Après ~5 s au total : réparée au-delà du seuil, elle repart.
		for (let i = 0; i < 200; i++) {
			pit.step(v, {dt: DT, wantPit: false, lapsRemaining: 2, aiDriven: true});
		}
		expect(v.health).toBeGreaterThanOrEqual(85);
		expect(v.pitPhase).toBe("exiting");
	});

	it("repairTo remonte une épave au niveau roulable, pneus et carburant intacts", () => {
		const damage = new DamageSystem("normal");
		const v = makeVehicle();
		v.health = 10;
		v.tires = 42;
		v.fuel = 7;
		damage.repairTo(v, 0.5);
		expect(v.health).toBe(50);
		expect(v.healthFactor).toBeCloseTo(0.5, 5);
		expect(v.tires).toBe(42);
		expect(v.fuel).toBe(7);
	});

	it("repairTo ne dégrade jamais une voiture déjà au-dessus du plancher", () => {
		const damage = new DamageSystem("normal");
		const v = makeVehicle();
		v.health = 80;
		damage.repairTo(v, 0.5);
		expect(v.health).toBe(80);
	});

	it("une épave immobile redevient roulable après repairTo (santé remontée au plancher)", () => {
		const damage = new DamageSystem("normal");
		const v = makeVehicle();
		v.health = 1;
		v.lastImpact = 300;
		v.vLong = 2;
		damage.step(v); // casse mécanique : santé à 0, épave immobile
		expect(v.raceState).toBe("wrecked");
		damage.repairTo(v, 0.5);
		expect(v.health).toBe(50);
		expect(v.healthFactor).toBeCloseTo(0.5, 5);
	});

	it("stratégie IA : arrêt demandé quand la mécanique devient inquiétante", () => {
		const healthy = new AIController(makeVehicle(), DRIVERS[0]!, track);
		healthy.vehicle.health = 80;
		healthy.onLapCompleted(10, 0, 0, true);
		expect(healthy.wantPit).toBe(false);

		const damaged = new AIController(makeVehicle(), DRIVERS[0]!, track);
		damaged.vehicle.health = 30;
		damaged.onLapCompleted(10, 0, 0, true);
		expect(damaged.wantPit).toBe(true);

		// Dégâts désactivés : le même état n'entraîne aucun arrêt.
		const ignored = new AIController(makeVehicle(), DRIVERS[0]!, track);
		ignored.vehicle.health = 30;
		ignored.onLapCompleted(10, 0, 0, false);
		expect(ignored.wantPit).toBe(false);
	});
});
