import {describe, expect, it} from "vitest";
import {mphToUnits} from "../app/constants";
import {STOCK_CAR} from "../data/cars";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {Track} from "../track/Track";
import {stepVehiclePhysics} from "../vehicles/VehiclePhysics";
import {Vehicle} from "../vehicles/Vehicle";

const DT = 1 / 60;
const track = new Track(CLASSIC_OVAL);
// Abscisse bien engagée dans le premier virage (rayon 380), loin des raccords aux lignes droites.
const TURN_S = 2 * CLASSIC_OVAL.spineHalfLength + 100;
// Recopie de la constante privée de VehiclePhysics.ts : les vitesses testées y sont très
// supérieures, l'autorité de direction y vaut toujours 1.
const STEER_AUTHORITY_SPEED = 30;

function makeVehicle(): Vehicle {
	const v = new Vehicle(0, "Test", 1, 0, false, STOCK_CAR);
	v.raceState = "racing";
	return v;
}

/** Place le véhicule sur la ligne centrale du virage, cap tangent, à la vitesse donnée. */
function placeInTurn(v: Vehicle, speed: number): void {
	const c = track.centerlineAt(TURN_S);
	v.x = c.x;
	v.y = c.y;
	v.heading = Math.atan2(c.ty, c.tx);
	v.vLong = speed;
	v.vLat = 0;
}

function wrapAngle(a: number): number {
	let r = a;
	while (r > Math.PI) r -= Math.PI * 2;
	while (r < -Math.PI) r += Math.PI * 2;
	return r;
}

/**
 * Braquage exact (formule interne de VehiclePhysics.ts) pour suivre un virage
 * de rayon donné à la vitesse courante du véhicule, sans jamais dépasser
 * l'adhérence : permet de tester un virage « propre » tenu dans la durée.
 */
function steerForRadius(v: Vehicle, radius: number): number {
	const authority = Math.min(1, Math.abs(v.vLong) / STEER_AUTHORITY_SPEED);
	const yawRateMax = (v.spec.steeringRate / (1 + Math.abs(v.vLong) / 150)) * authority;
	return Math.min(1, Math.abs(v.vLong) / radius / yawRateMax);
}

/** Conduit n pas en tenant la vitesse cible et un virage propre (rayon de l'ovale). */
function driveCleanTurn(v: Vehicle, targetSpeed: number, steps: number): void {
	for (let i = 0; i < steps; i++) {
		v.controls.steer = steerForRadius(v, CLASSIC_OVAL.turnRadius);
		const err = targetSpeed - v.vLong;
		v.controls.throttle = Math.max(0, Math.min(1, err / 10));
		v.controls.brake = Math.max(0, Math.min(1, -err / 10));
		stepVehiclePhysics(v, track, DT);
	}
}

describe("dérapage progressif et tête-à-queue", () => {
	it("virage tenu à ~150 mph : jamais de toupie", () => {
		const v = makeVehicle();
		const target = mphToUnits(150);
		placeInTurn(v, target);
		driveCleanTurn(v, target, 240); // 4 s soutenues dans le virage
		expect(v.spinning).toBe(false);
	});

	it("virage forcé à ~175 mph, accélérateur et direction au maximum : dérapage puis toupie en moins de 2 s", () => {
		const v = makeVehicle();
		placeInTurn(v, mphToUnits(175));
		v.controls.throttle = 1;
		v.controls.brake = 0;
		v.controls.steer = 1;

		let slidBeforeSpin = false;
		let spunAt = -1;
		for (let i = 0; i < 120 && spunAt < 0; i++) {
			stepVehiclePhysics(v, track, DT);
			if (v.sliding && !v.spinning) slidBeforeSpin = true;
			if (v.spinning) spunAt = i;
		}

		expect(slidBeforeSpin).toBe(true);
		expect(spunAt).toBeGreaterThanOrEqual(0);
		expect(spunAt).toBeLessThan(120);
	});

	it("récupération après la toupie : ralenti sous le seuil, le contrôle revient", () => {
		const v = makeVehicle();
		placeInTurn(v, mphToUnits(175));
		v.controls.throttle = 1;
		v.controls.brake = 0;
		v.controls.steer = 1;
		for (let i = 0; i < 120 && !v.spinning; i++) stepVehiclePhysics(v, track, DT);
		expect(v.spinning).toBe(true);

		// Lève le pied et freine pour ralentir sous le seuil de récupération.
		v.controls.throttle = 0;
		v.controls.brake = 1;
		v.controls.steer = 0;
		for (let i = 0; i < 400 && v.spinning; i++) stepVehiclePhysics(v, track, DT);
		expect(v.spinning).toBe(false);
		expect(v.spinHeat).toBe(0);

		// Le contrôle répond de nouveau : ré-accélérer redonne de l'autorité de
		// direction (nulle à l'arrêt, §8), un braquage à droite tourne alors le cap dans son sens.
		const headingBefore = v.heading;
		v.controls.throttle = 1;
		v.controls.brake = 0;
		v.controls.steer = 1;
		for (let i = 0; i < 30; i++) stepVehiclePhysics(v, track, DT);
		expect(v.spinning).toBe(false);
		expect(wrapAngle(v.heading - headingBefore)).toBeGreaterThan(0);
	});

	it("un excès bref (quelques pas) ne déclenche pas la toupie : progressivité", () => {
		const v = makeVehicle();
		placeInTurn(v, mphToUnits(175));
		v.controls.throttle = 1;
		v.controls.brake = 0;
		v.controls.steer = 1;
		for (let i = 0; i < 8; i++) stepVehiclePhysics(v, track, DT);
		expect(v.spinning).toBe(false);

		// Retour à une conduite propre : aucune toupie ne se déclenche après coup.
		driveCleanTurn(v, mphToUnits(150), 60);
		expect(v.spinning).toBe(false);
	});
});
