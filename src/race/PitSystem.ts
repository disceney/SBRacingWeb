import type {Track} from "../track/Track";
import type {Vehicle} from "../vehicles/Vehicle";
import {DamageSystem, REPAIR_RATE} from "./DamageSystem";
import {FuelSystem, REFUEL_RATE} from "./FuelSystem";
import {TIRE_SWAP_DURATION, TireSystem} from "./TireSystem";

/** Événements produits par une mise à jour du système de stands. */
export interface PitEvents {
	/** Le véhicule vient de s'immobiliser dans son emplacement. */
	stopped?: boolean;
	/** Le véhicule vient de quitter la voie des stands. */
	exited?: boolean;
}

/** Contexte de course nécessaire aux décisions de ravitaillement. */
export interface PitContext {
	dt: number;
	/** L'IA du véhicule souhaite s'arrêter à ce tour. */
	wantPit: boolean;
	/** Tours restant à couvrir après le tour en cours. */
	lapsRemaining: number;
	/**
	 * Véhicule conduit par une IA (adversaire ou joueur en autopilote) : les
	 * transitions suivent alors la logique IA, pas la détection de position.
	 */
	aiDriven: boolean;
}

/**
 * Machine à états des passages aux stands (§12.3, §12.4) :
 * none → entering → toBox → stopped → exiting → none.
 * Le ravitaillement est automatique à l'arrêt dans l'emplacement, avec
 * départ anticipé possible ; le temps passé en voie des stands est cumulé.
 */
export class PitSystem {
	private readonly track: Track;
	private readonly fuel: FuelSystem;
	private readonly tires: TireSystem;
	private readonly damage: DamageSystem;
	/** Fenêtre curviligne où une IA décidée à s'arrêter engage son entrée. */
	private readonly turnInFrom: number;
	private readonly turnInTo: number;

	constructor(track: Track, fuel: FuelSystem, tires: TireSystem, damage: DamageSystem) {
		this.track = track;
		this.fuel = fuel;
		this.tires = tires;
		this.damage = damage;
		const d = track.data;
		const bottomY = d.centerY + d.turnRadius;
		const entryS = track.progressAt(d.pitEntryZone.x1, bottomY);
		this.turnInFrom = entryS - 160;
		this.turnInTo = entryS + 10;
	}

	step(vehicle: Vehicle, ctx: PitContext): PitEvents {
		const events: PitEvents = {};
		const inArea = this.track.isInPitArea(vehicle.x, vehicle.y);
		const box = this.track.data.pitBoxes[vehicle.pitBoxIndex]!;

		// Temps de stands cumulé pendant le transit — pas pour une épave
		// immobilisée dans la zone.
		if (vehicle.inPit && vehicle.raceState === "racing") {
			vehicle.pitTimeTotal += ctx.dt;
		}

		switch (vehicle.pitPhase) {
			case "none": {
				// Conduite IA : engagement anticipé avant la zone d'entrée ;
				// joueur manuel : détection par position.
				if (
					ctx.aiDriven &&
					ctx.wantPit &&
					vehicle.progressS >= this.turnInFrom &&
					vehicle.progressS <= this.turnInTo
				) {
					vehicle.pitPhase = "entering";
				} else if (vehicle.isPlayer && !ctx.aiDriven && inArea) {
					vehicle.pitPhase = "entering";
				}
				break;
			}
			case "entering": {
				if (inArea && vehicle.x > this.track.data.pitEntryZone.x2) {
					vehicle.pitPhase = "toBox";
				} else if (!inArea) {
					if (vehicle.isPlayer && !ctx.aiDriven) {
						// Le joueur est ressorti vers la piste sans rejoindre la voie.
						vehicle.pitPhase = "none";
					} else {
						// IA : entrée manquée (trafic, incident). Nettement au-delà de la
						// zone d'accès, on rend la main — nouvelle tentative au tour
						// suivant (wantPit reste actif).
						const lap = this.track.lapLength;
						const past = (((vehicle.progressS - this.turnInTo) % lap) + lap) % lap;
						if (past > 230 && past < lap / 2) vehicle.pitPhase = "none";
					}
				}
				break;
			}
			case "toBox": {
				// Accrochage automatique : à l'approche lente de sa dalle, la
				// voiture y est posée proprement (fini les oscillations de freinage).
				const nearBox =
					Math.abs(vehicle.x - box.x) < 22 &&
					Math.abs(vehicle.y - box.y) < 20 &&
					vehicle.speed < 30;
				if (nearBox) {
					dockAtBox(vehicle, box.x, box.y);
					vehicle.pitPhase = "stopped";
					vehicle.pitStops += 1;
					vehicle.pitStopElapsed = 0;
					events.stopped = true;
				} else if (vehicle.x > box.x + 34) {
					// Emplacement manqué ou traversée sans arrêt : direction la sortie.
					vehicle.pitPhase = "exiting";
				}
				break;
			}
			case "stopped": {
				// Voiture accrochée à sa dalle pendant toute la durée des
				// opérations : position et vitesses verrouillées.
				dockAtBox(vehicle, box.x, box.y);
				// Ravitaillement automatique (§12.4), changement de pneus et
				// réparation en parallèle : le train neuf est posé après une durée
				// fixe, la mécanique se répare en continu ; repartir avant laisse
				// pneus usés et dégâts restants.
				vehicle.pitStopElapsed += ctx.dt;
				vehicle.fuel = Math.min(vehicle.spec.fuelCapacity, vehicle.fuel + REFUEL_RATE * ctx.dt);
				if (
					this.tires.enabled &&
					vehicle.pitStopElapsed >= TIRE_SWAP_DURATION &&
					(vehicle.tires < 100 || vehicle.flatTire)
				) {
					this.tires.swap(vehicle);
				}
				if (this.damage.enabled && vehicle.health > 0) {
					vehicle.health = Math.min(100, vehicle.health + REPAIR_RATE * ctx.dt);
				}
				if (vehicle.isPlayer && !ctx.aiDriven) {
					// Le joueur se décroche en accélérant : il rejoint la voie lui-même.
					if (vehicle.controls.throttle > 0.5) vehicle.pitPhase = "exiting";
				} else {
					// L'IA repart avec le plein utile, ses pneus neufs et une mécanique saine.
					const perLap = this.fuel.estimateFuelPerLap();
					const neededFuel =
						perLap > 0
							? Math.min(vehicle.spec.fuelCapacity, perLap * (ctx.lapsRemaining + 1.5))
							: vehicle.spec.fuelCapacity;
					const wantsTires =
						this.tires.enabled && (vehicle.flatTire || vehicle.tires < 55);
					const wantsRepair = this.damage.enabled && vehicle.health < 85;
					if (vehicle.fuel >= neededFuel && !wantsTires && !wantsRepair) {
						vehicle.pitPhase = "exiting";
					}
				}
				break;
			}
			case "exiting": {
				if (!inArea) {
					vehicle.pitPhase = "none";
					events.exited = true;
				}
				break;
			}
		}
		return events;
	}
}

/** Pose la voiture proprement sur sa dalle, à l'arrêt et dans l'axe. */
function dockAtBox(vehicle: Vehicle, x: number, y: number): void {
	vehicle.x = x;
	vehicle.y = y;
	vehicle.heading = 0;
	vehicle.vLong = 0;
	vehicle.vLat = 0;
}
