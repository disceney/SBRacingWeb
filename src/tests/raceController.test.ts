import {describe, expect, it} from "vitest";
import {STOCK_CAR} from "../data/cars";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {RaceController} from "../race/RaceController";
import type {RaceSettings} from "../race/raceTypes";
import {Track} from "../track/Track";
import type {LineName} from "../track/trackTypes";
import type {AIController} from "../vehicles/AIController";
import type {RaceField} from "../vehicles/VehicleFactory";
import {Vehicle} from "../vehicles/Vehicle";

const DT = 1 / 60;
const track = new Track(CLASSIC_OVAL);

/** Réglages minimaux d'une course à deux voitures, systèmes secondaires désactivés. */
function makeSettings(): RaceSettings {
	return {
		carCount: 2,
		laps: 5,
		fuelLevel: "off",
		tireLevel: "off",
		damageLevel: "off",
		autopilot: false,
		collisions: false,
		playerColorIndex: 0,
		playerNumber: 7,
	};
}

/** Positionne un véhicule sur la ligne centrale à l'abscisse curviligne s, cap tangent. */
function placeAt(v: Vehicle, s: number): void {
	const c = track.centerlineAt(s);
	v.x = c.x;
	v.y = c.y;
	v.heading = Math.atan2(c.ty, c.tx);
}

/**
 * Plateau minimal : le joueur (mené par le pilote automatique pendant la
 * formation) posté sur la ligne, et, si opponentS est fourni, un adversaire
 * immobile placé à l'abscisse donnée (aucun contrôleur IA affecté : il reste
 * où il est placé).
 */
function makeField(opponentS?: number): RaceField {
	const player = new Vehicle(0, "Joueur", 7, 0, true, STOCK_CAR);
	placeAt(player, 0);
	const vehicles: Vehicle[] = [player];
	if (opponentS !== undefined) {
		const opponent = new Vehicle(1, "Adversaire", 12, 1, false, STOCK_CAR);
		placeAt(opponent, opponentS);
		vehicles.push(opponent);
	}
	return {vehicles, aiControllers: new Map<Vehicle, AIController>(), player};
}

/** Fait avancer la simulation jusqu'au drapeau vert (ou maxSteps atteint). */
function runUntilGreen(controller: RaceController, maxSteps = 12000): void {
	for (let i = 0; i < maxSteps && controller.phase === "formation"; i++) {
		controller.step(DT);
	}
}

/** Vrai si le véhicule se trouve exactement sur l'une des trois lignes de course, à sa propre abscisse. */
function isOnRacingLine(v: Vehicle): boolean {
	const s = track.progressAt(v.x, v.y);
	const lineNames: LineName[] = ["inside", "middle", "outside"];
	return lineNames.some((name) => {
		const p = track.lines[name].pointAt(s);
		return Math.hypot(p.x - v.x, p.y - v.y) < 1;
	});
}

describe("phase de formation et drapeau vert", () => {
	it("le vert ne tombe qu'au second franchissement de la ligne par le joueur", () => {
		const field = makeField();
		const controller = new RaceController(track, makeSettings(), field);
		expect(controller.phase).toBe("formation");

		let greenEvents = 0;
		controller.onEvent = (e) => {
			if (e.type === "green") greenEvents++;
		};

		// Détection indépendante des franchissements de ligne par le joueur,
		// recalculée depuis sa seule position (sans dépendre du LapTracker privé).
		let prevS = track.progressAt(field.player.x, field.player.y);
		let crossings = 0;
		for (let i = 0; i < 12000 && controller.phase === "formation"; i++) {
			controller.step(DT);
			const s = track.progressAt(field.player.x, field.player.y);
			if (s < prevS - track.lapLength / 2) {
				crossings++;
				if (crossings === 1) {
					// Premier franchissement : le tour de formation continue.
					expect(controller.phase).toBe("formation");
				}
			}
			prevS = s;
		}

		expect(greenEvents).toBe(1);
		expect(controller.phase).toBe("racing");
		expect(crossings).toBeGreaterThanOrEqual(2);
	});
});

describe("classement et compteurs au drapeau vert", () => {
	it("une voiture encore derrière la ligne n'est pas classée devant le joueur", () => {
		const field = makeField(track.lapLength - 60);
		const opponent = field.vehicles[1]!;
		const controller = new RaceController(track, makeSettings(), field);

		let greenEvents = 0;
		controller.onEvent = (e) => {
			if (e.type === "green") greenEvents++;
		};
		runUntilGreen(controller);

		expect(greenEvents).toBe(1);
		expect(controller.phase).toBe("racing");
		// Règle du milieu de tour (L/2) : le joueur vient de franchir la ligne
		// (progressS petit) et démarre à lap 0 ; l'adversaire, encore avant la
		// ligne (progressS proche de L), reste à lap -1.
		expect(field.player.lap).toBe(0);
		expect(opponent.lap).toBe(-1);
		expect(field.player.totalDistance).toBeGreaterThan(opponent.totalDistance);
		expect(controller.positionOf(field.player)).toBeLessThan(controller.positionOf(opponent));
		// Aucun tour fantôme (sub-seconde) n'a encore été chronométré au vert.
		expect(controller.raceBestLap).toBeNull();
	});
});

describe("chien de garde anti-blocage", () => {
	it("aucune réapparition pendant la formation même immobile plus de 5 s", () => {
		const field = makeField(track.lapLength - 200);
		const opponent = field.vehicles[1]!;
		const controller = new RaceController(track, makeSettings(), field);
		expect(controller.phase).toBe("formation");

		const xBefore = opponent.x;
		const yBefore = opponent.y;
		for (let i = 0; i < Math.ceil(5.5 / DT); i++) controller.step(DT);

		expect(controller.phase).toBe("formation");
		expect(opponent.stuckTime).toBe(0);
		expect(opponent.x).toBeCloseTo(xBefore, 5);
		expect(opponent.y).toBeCloseTo(yBefore, 5);
	});

	it("une épave immobile en course est réapparue roulable après ~4,5 s", () => {
		const field = makeField();
		const controller = new RaceController(track, makeSettings(), field);
		const vehicle = field.player;
		// Simule une course déjà lancée : le passage formation → racing fait
		// l'objet de la suite précédente, pas de celle-ci.
		controller.phase = "racing";
		vehicle.raceState = "wrecked";
		vehicle.health = 0;
		vehicle.healthFactor = 0;
		vehicle.vLong = 0;
		vehicle.vLat = 0;

		const sBefore = track.progressAt(vehicle.x, vehicle.y);
		// Juste avant le délai de 4,5 s : toujours épave.
		for (let i = 0; i < 269; i++) controller.step(DT);
		expect(vehicle.raceState).toBe("wrecked");

		// Marge au-delà du seuil (arrondi flottant de l'accumulateur) : réapparue.
		for (let i = 0; i < 20; i++) controller.step(DT);
		expect(vehicle.raceState).toBe("racing");
		expect(vehicle.health).toBeGreaterThanOrEqual(50);
		expect(vehicle.speed).toBe(0);
		expect(isOnRacingLine(vehicle)).toBe(true);
		// Position curviligne inchangée : pas de triche lors de la réapparition.
		expect(track.progressAt(vehicle.x, vehicle.y)).toBeCloseTo(sBefore, 0);
	});
});
