import {STOCK_CAR} from "../data/cars";
import {DRIVERS} from "../data/drivers";
import {CAR_COLORS} from "../gfx/palette";
import type {RaceSettings} from "../race/raceTypes";
import type {Track} from "../track/Track";
import {AIController} from "./AIController";
import {Vehicle} from "./Vehicle";

export interface RaceField {
	vehicles: Vehicle[];
	/** Contrôleurs IA, indexés par véhicule (le joueur n'en a pas). */
	aiControllers: Map<Vehicle, AIController>;
	player: Vehicle;
}

/**
 * Constitue le plateau : le joueur et carCount − 1 adversaires tirés de
 * l'effectif, placés sur la grille dans un ordre aléatoire (qualification
 * absente du MVP, §6.1), chacun avec sa livrée, son numéro et son stand.
 */
export function createRaceField(settings: RaceSettings, track: Track): RaceField {
	const aiDrivers = shuffle([...DRIVERS]).slice(0, settings.carCount - 1);

	// Couleurs et numéros IA distincts de ceux du joueur.
	const freeColors = CAR_COLORS.map((_, i) => i).filter((i) => i !== settings.playerColorIndex);
	const freeNumbers = shuffle(
		Array.from({length: 98}, (_, i) => i + 1).filter((n) => n !== settings.playerNumber),
	);

	const player = new Vehicle(
		0,
		"Joueur",
		settings.playerNumber,
		settings.playerColorIndex,
		true,
		STOCK_CAR,
	);

	const vehicles: Vehicle[] = [player];
	const aiControllers = new Map<Vehicle, AIController>();
	aiDrivers.forEach((driver, i) => {
		const vehicle = new Vehicle(
			i + 1,
			driver.displayName,
			freeNumbers[i % freeNumbers.length]!,
			freeColors[i % freeColors.length]!,
			false,
			STOCK_CAR,
		);
		vehicles.push(vehicle);
		aiControllers.set(vehicle, new AIController(vehicle, driver, track));
	});

	// Grille aléatoire : attribution des emplacements et des stands.
	const gridOrder = shuffle([...vehicles]);
	gridOrder.forEach((vehicle, i) => {
		const slot = track.data.gridSlots[i]!;
		vehicle.x = slot.x;
		vehicle.y = slot.y;
		vehicle.heading = slot.heading;
		vehicle.pitBoxIndex = i;
		vehicle.raceState = "grid";
	});

	return {vehicles, aiControllers, player};
}

function shuffle<T>(items: T[]): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[items[i], items[j]] = [items[j]!, items[i]!];
	}
	return items;
}
