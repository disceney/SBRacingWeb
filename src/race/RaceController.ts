import {AUTOPILOT_DRIVER} from "../data/drivers";
import type {Track} from "../track/Track";
import type {LineName} from "../track/trackTypes";
import {AIController} from "../vehicles/AIController";
import type {Vehicle} from "../vehicles/Vehicle";
import type {RaceField} from "../vehicles/VehicleFactory";
import {stepVehiclePhysics} from "../vehicles/VehiclePhysics";
import {resolveCarCollisions} from "../vehicles/collisions";
import {DamageSystem} from "./DamageSystem";
import {FuelSystem} from "./FuelSystem";
import {PitSystem} from "./PitSystem";
import {TireSystem} from "./TireSystem";
import {LapTracker} from "./LapTracker";
import {rankVehicles} from "./RankingSystem";
import type {RacePhase, RaceResultRow, RaceSettings} from "./raceTypes";

/** Délai maximal accordé aux attardés après l'arrivée du vainqueur (s). */
const FINISH_TIMEOUT = 75;
/** Vitesse en-deçà de laquelle un véhicule en course est jugé à l'arrêt (unités/s). */
const STUCK_SPEED_THRESHOLD = 15;
/** Immobilisation cumulée déclenchant la réapparition automatique (s). */
const STUCK_RESPAWN_DELAY = 4.5;
/** Santé plancher restaurée à la réapparition (niveau roulable). */
const STUCK_REPAIR_FLOOR = 0.5;
/**
 * Plafond de vitesse du tour de formation (départ lancé, §13.1), en fraction
 * de la vitesse de pointe du véhicule : bride uniformément tout le peloton
 * pour interdire les dépassements sans logique de trafic dédiée.
 */
const FORMATION_SPEED_RATIO = 0.48;

/** Événements ponctuels notifiés à la scène (affichage, audio). */
export type RaceEvent =
	| { type: "countdown"; value: number }
	| { type: "green" }
	| { type: "lapCompleted"; vehicle: Vehicle }
	| { type: "lastLap"; vehicle: Vehicle }
	| { type: "finished"; vehicle: Vehicle }
	| { type: "puncture"; vehicle: Vehicle }
	| { type: "wrecked"; vehicle: Vehicle }
	| { type: "raceOver" };

/**
 * Chef d'orchestre d'une course : tour de formation, boucle de simulation
 * (IA → physique → collisions → tours → carburant → stands → classement),
 * règles d'arrivée (§13.4) et compilation des résultats.
 */
export class RaceController {
	readonly track: Track;
	readonly settings: RaceSettings;
	readonly vehicles: Vehicle[];
	readonly player: Vehicle;
	readonly fuelSystem: FuelSystem;
	readonly tireSystem: TireSystem;
	readonly damageSystem: DamageSystem;
	/** Recréé au drapeau vert (§13.1) : le tour de formation ne compte dans aucun tour. */
	private lapTracker: LapTracker;
	phase: RacePhase = "formation";
	raceTime = 0;
	/** Conduite automatique du joueur (basculable en course avec la touche A). */
	autopilotEnabled = false;
	ranking: Vehicle[];
	/** Meilleur tour de la course (§13.2). */
	raceBestLap: { time: number; vehicle: Vehicle } | null = null;
	onEvent: ((event: RaceEvent) => void) | null = null;
	private readonly pitSystem: PitSystem;
	private readonly field: RaceField;
	/** Pilote artificiel de la voiture du joueur, actif en formation et quand autopilotEnabled. */
	private readonly playerAI: AIController;
	private leaderFinishTime: number | null = null;
	/** Confirmation manuelle d'accrochage armée par le joueur (touche E, manette, tactile). */
	private playerDockRequested = false;

	constructor(track: Track, settings: RaceSettings, field: RaceField) {
		this.track = track;
		this.settings = settings;
		this.field = field;
		this.vehicles = field.vehicles;
		this.player = field.player;
		this.fuelSystem = new FuelSystem(settings.fuelLevel, settings.laps);
		this.tireSystem = new TireSystem(settings.tireLevel, settings.laps);
		this.damageSystem = new DamageSystem(settings.damageLevel);
		this.pitSystem = new PitSystem(track, this.fuelSystem, this.tireSystem, this.damageSystem);
		this.lapTracker = new LapTracker(track);
		this.lapTracker.onLapCompleted = (vehicle) => this.handleLapCompleted(vehicle);
		this.vehicles.forEach((vehicle) => {
			this.lapTracker.register(vehicle);
			// Départ lancé (§13.1) : le peloton roule dès le tour de formation.
			vehicle.raceState = "racing";
		});
		this.ranking = rankVehicles(this.vehicles);
		this.playerAI = new AIController(this.player, AUTOPILOT_DRIVER, track);
		this.autopilotEnabled = settings.autopilot;
	}

	/** Un pas de simulation à fréquence fixe (§18.2). */
	step(dt: number): void {
		if (this.phase === "finished") return;

		this.raceTime += dt;

		for (const vehicle of this.vehicles) {
			this.controllerFor(vehicle)?.update(dt, this.raceTime, this.vehicles);
			// Tour de formation (§13.1) : throttle bridé au-delà du plafond, en
			// file par ordre de grille — le bridage uniforme suffit à interdire
			// les dépassements, sans logique de trafic dédiée.
			if (this.phase === "formation") {
				const formationCap = vehicle.spec.maxSpeed * FORMATION_SPEED_RATIO;
				if (vehicle.speed > formationCap) vehicle.controls.throttle = 0;
			}
			stepVehiclePhysics(vehicle, this.track, dt);
		}

		if (this.settings.collisions) {
			resolveCarCollisions(this.vehicles, this.track);
		}

		for (const vehicle of this.vehicles) {
			this.lapTracker.update(vehicle);
			if (vehicle.raceState === "racing") {
				this.fuelSystem.step(vehicle, dt);
				const tireEvents = this.tireSystem.step(vehicle, dt);
				if (tireEvents.punctured) {
					this.onEvent?.({type: "puncture", vehicle});
				}
				const damageEvents = this.damageSystem.step(vehicle);
				if (damageEvents.wrecked) {
					this.onEvent?.({type: "wrecked", vehicle});
				}
			} else {
				// Les impacts hors course ne s'accumulent pas.
				vehicle.lastImpact = 0;
			}
			const ai = this.controllerFor(vehicle);
			const lapsRemaining = Math.max(0, this.settings.laps - Math.max(0, vehicle.lap));
			const wasInToBox = vehicle === this.player && vehicle.pitPhase === "toBox";
			const events = this.pitSystem.step(vehicle, {
				dt,
				wantPit: ai?.wantPit ?? false,
				lapsRemaining,
				aiDriven: ai !== undefined,
				dockRequested: this.playerDockRequested,
			});
			// La demande armée ne vaut que pour un seul passage en 'toBox' : elle
			// retombe dès que le joueur en sort (accrochage réussi ou dalle manquée).
			if (wasInToBox && vehicle.pitPhase !== "toBox") {
				this.playerDockRequested = false;
			}
			// La demande d'arrêt n'est levée qu'après un arrêt effectif : un
			// emplacement manqué (trafic) sera retenté au tour suivant.
			if (events.stopped && ai) {
				ai.wantPit = false;
			}

			this.updateStuckWatchdog(vehicle, dt);
		}

		this.ranking = rankVehicles(this.vehicles);

		// — Clôture de la course : tous arrivés/arrêtés ou délai écoulé (§13.4).
		const stillRunning = this.vehicles.some((v) => v.raceState === "racing");
		const timedOut =
			this.leaderFinishTime !== null && this.raceTime > this.leaderFinishTime + FINISH_TIMEOUT;
		if ((!stillRunning || timedOut) && this.leaderFinishTime !== null) {
			this.phase = "finished";
			this.onEvent?.({type: "raceOver"});
		}
	}

	/** Position (1-indexée) d'un véhicule au classement courant. */
	positionOf(vehicle: Vehicle): number {
		return this.ranking.indexOf(vehicle) + 1;
	}

	/**
	 * Arme la confirmation manuelle d'accrochage du joueur (touche E, manette
	 * A/Croix ou bouton tactile). Sans effet hors de l'invite (fenêtre inactive,
	 * déjà armée, ou joueur en autopilote).
	 */
	requestPlayerDock(): void {
		if (this.playerDockPromptActive()) this.playerDockRequested = true;
	}

	/**
	 * Vrai si l'invite de confirmation manuelle doit être affichée au joueur :
	 * fenêtre d'approche de sa dalle active, pas déjà armée, hors autopilote
	 * (où l'accrochage reste automatique).
	 */
	playerDockPromptActive(): boolean {
		return (
			!this.autopilotEnabled &&
			!this.playerDockRequested &&
			this.pitSystem.isDockPromptActive(this.player)
		);
	}

	/** Résultats finaux (§15), figés à l'appel. */
	buildResults(): RaceResultRow[] {
		const winner = this.ranking[0] ?? null;
		return this.ranking.map((vehicle, i) => ({
			position: i + 1,
			driverName: vehicle.driverName,
			raceNumber: vehicle.raceNumber,
			isPlayer: vehicle.isPlayer,
			lapsCompleted: Math.max(0, vehicle.lapsAtFinish ?? vehicle.lap),
			totalTime: vehicle.finishTime,
			// Écart en temps uniquement dans le même tour que le vainqueur ; les
			// attardés sont signalés par leur nombre de tours.
			gap:
				vehicle.finishTime !== null &&
				winner?.finishTime != null &&
				vehicle !== winner &&
				(vehicle.lapsAtFinish ?? vehicle.lap) >= (winner.lapsAtFinish ?? winner.lap)
					? vehicle.finishTime - winner.finishTime
					: null,
			bestLap: vehicle.bestLapTime,
			pitStops: vehicle.pitStops,
			pitTime: vehicle.pitTimeTotal,
			status:
				vehicle.raceState === "finished"
					? "finished"
					: vehicle.raceState === "fuelOut"
						? "fuelOut"
						: vehicle.raceState === "wrecked"
							? "wrecked"
							: "running",
		}));
	}

	/**
	 * Contrôleur IA effectif d'un véhicule : adversaire, ou joueur pendant le
	 * tour de formation (§13.1, indépendamment de l'état du toggle) ou en
	 * autopilote volontaire une fois la course lancée.
	 */
	private controllerFor(vehicle: Vehicle): AIController | undefined {
		const ai = this.field.aiControllers.get(vehicle);
		if (ai) return ai;
		const playerDriven = this.phase === "formation" || this.autopilotEnabled;
		return vehicle.isPlayer && playerDriven ? this.playerAI : undefined;
	}

	/**
	 * Chien de garde anti-carambolage : un véhicule en course ou en épave
	 * (hors stands), durablement en-dessous du seuil de vitesse, est réapparu
	 * automatiquement. Le compteur se réarme dès que la voiture roule
	 * au-dessus du seuil. Jamais pendant le tour de formation (§13.1) : les
	 * voitures partent immobiles sur la grille, ce qui ne doit jamais être lu
	 * comme un blocage.
	 */
	private updateStuckWatchdog(vehicle: Vehicle, dt: number): void {
		const eligible =
			this.phase === "racing" &&
			(vehicle.raceState === "racing" || vehicle.raceState === "wrecked") &&
			vehicle.pitPhase === "none";
		if (!eligible || vehicle.speed >= STUCK_SPEED_THRESHOLD) {
			vehicle.stuckTime = 0;
			return;
		}
		vehicle.stuckTime += dt;
		if (vehicle.stuckTime >= STUCK_RESPAWN_DELAY) {
			this.respawnStuckVehicle(vehicle);
			vehicle.stuckTime = 0;
		}
	}

	/**
	 * Réapparition d'un véhicule bloqué : repositionnement sur la ligne la
	 * moins encombrée localement (inside/middle/outside) à la même progression
	 * curviligne (pas de triche), cap aligné sur le sens de course, vitesses
	 * et toupie remises à zéro, mécanique remontée au niveau roulable si elle
	 * était pire. Une épave (mécanique cassée, moteur coupé) redevient
	 * roulable : l'état de course revient à 'racing' et le moteur est rétabli.
	 */
	private respawnStuckVehicle(vehicle: Vehicle): void {
		const s = this.track.lines.middle.project(vehicle.x, vehicle.y);
		const lineNames: LineName[] = ["inside", "middle", "outside"];
		let bestLine: LineName = "middle";
		let bestClearance = -Infinity;
		for (const name of lineNames) {
			const candidate = this.track.lines[name].pointAt(s);
			const clearance = this.clearanceAt(candidate.x, candidate.y, vehicle);
			if (clearance > bestClearance) {
				bestClearance = clearance;
				bestLine = name;
			}
		}

		const point = this.track.lines[bestLine].pointAt(s);
		const tangent = this.track.centerlineAt(s);
		vehicle.x = point.x;
		vehicle.y = point.y;
		vehicle.heading = Math.atan2(tangent.ty, tangent.tx);
		vehicle.vLong = 0;
		vehicle.vLat = 0;
		vehicle.spinning = false;
		vehicle.spinHeat = 0;
		this.damageSystem.repairTo(vehicle, STUCK_REPAIR_FLOOR);
		if (vehicle.raceState === "wrecked") {
			// Épave réapparue : redevient une voiture roulante à part entière.
			vehicle.raceState = "racing";
			vehicle.powerFactor = 1;
		}
	}

	/** Distance au véhicule le plus proche de (x, y), soi-même exclu (dégagement local). */
	private clearanceAt(x: number, y: number, self: Vehicle): number {
		let best = Infinity;
		for (const other of this.vehicles) {
			if (other === self) continue;
			const d = Math.hypot(other.x - x, other.y - y);
			if (d < best) best = d;
		}
		return best;
	}

	/**
	 * Bascule du tour de formation à la course lancée (§13.1) : déclenchée par
	 * le franchissement de la ligne par le JOUEUR (réutilise la détection de
	 * progression du LapTracker). Rend le contrôle au joueur (sauf autopilote
	 * volontairement actif via `controllerFor`), republie l'annonce de départ
	 * existante et remet à zéro tours et chronos — le tour de formation ne
	 * compte ni dans les tours ni dans les temps, y compris pour les
	 * adversaires. Recrée LapTracker plutôt que d'exposer une API de reset.
	 */
	private startRace(): void {
		this.phase = "racing";
		this.raceTime = 0;
		this.raceBestLap = null;
		this.leaderFinishTime = null;
		this.lapTracker = new LapTracker(this.track);
		this.lapTracker.onLapCompleted = (v) => this.handleLapCompleted(v);
		for (const v of this.vehicles) {
			this.lapTracker.register(v);
			// Normalisation post-formation : register() place tout le monde à
			// lap = -1 à la position COURANTE, ce qui préserverait déjà l'ordre
			// curviligne réel entre voitures, mais pénaliserait chaque voiture
			// d'un tour entier (elle devrait alors refranchir la ligne pour
			// atteindre lap = 0). Règle du milieu de tour (L/2, L = lapLength) :
			// une voiture déjà passée la ligne (progressS < L/2, cas du joueur
			// qui vient de la franchir) démarre directement à lap = 0, tandis
			// qu'une voiture encore avant la ligne (progressS ≥ L/2, proche de
			// L) reste à lap = -1 en attendant son propre franchissement réel —
			// exactement comme register() le fait pour la grille de formation.
			// totalDistance = lap·L + progressS préserve ainsi l'ordre curviligne
			// réel du peloton (une voiture derrière la ligne obtient une
			// distance négative, donc un classement derrière le joueur) et
			// chaque voiture court exactement settings.laps tours effectifs
			// depuis sa position au vert. Le franchissement réel qui fera passer
			// lap de -1 à 0 réarme aussi currentLapStart (cf. handleLapCompleted)
			// : aucun chrono de tour parasite n'est donc démarré depuis le vert
			// pour les voitures encore avant la ligne.
			v.lap = v.progressS < this.track.lapLength / 2 ? 0 : -1;
			v.totalDistance = v.lap * this.track.lapLength + v.progressS;
			v.currentLapStart = 0;
			v.lastLapTime = null;
			v.bestLapTime = null;
			v.timedLap = 0;
			v.finishTime = null;
			v.lapsAtFinish = null;
			v.stuckTime = 0;
		}
		this.onEvent?.({type: "green"});
	}

	private handleLapCompleted(vehicle: Vehicle): void {
		if (this.phase === "formation") {
			// Tour de formation réel (§13.1) : le premier franchissement est
			// quasi immédiat (la grille est postée juste derrière la ligne) et
			// n'atteste d'aucune formation ; seul le second (le joueur a alors
			// parcouru un tour complet depuis le lancement) déclenche le vert.
			if (vehicle.isPlayer && vehicle.lap >= 1) this.startRace();
			return;
		}
		if (this.phase !== "racing") return;

		// Un re-franchissement après un recul (anti-triche) ne produit ni chrono
		// ni annonce : seul un tour jamais atteint est chronométré.
		const isNewLap = vehicle.lap > vehicle.timedLap;
		vehicle.timedLap = Math.max(vehicle.timedLap, vehicle.lap);

		if (isNewLap && vehicle.lap >= 1) {
			const lapTime = this.raceTime - vehicle.currentLapStart;
			vehicle.lastLapTime = lapTime;
			if (vehicle.bestLapTime === null || lapTime < vehicle.bestLapTime) {
				vehicle.bestLapTime = lapTime;
			}
			if (this.raceBestLap === null || lapTime < this.raceBestLap.time) {
				this.raceBestLap = {time: lapTime, vehicle};
			}
		}
		vehicle.currentLapStart = this.raceTime;

		if (isNewLap) this.onEvent?.({type: "lapCompleted", vehicle});

		// — Règles d'arrivée : le vainqueur boucle le dernier tour, les autres
		// terminent le tour en cours (§13.4).
		const finished =
			vehicle.raceState === "racing" &&
			(vehicle.lap >= this.settings.laps || this.leaderFinishTime !== null);
		if (finished) {
			vehicle.raceState = "finished";
			vehicle.finishTime = this.raceTime;
			vehicle.lapsAtFinish = vehicle.lap;
			if (this.leaderFinishTime === null) this.leaderFinishTime = this.raceTime;
			this.onEvent?.({type: "finished", vehicle});
			return;
		}

		// — Annonce du dernier tour et stratégie de stands de l'IA.
		if (vehicle.raceState === "racing") {
			if (isNewLap && vehicle.lap === this.settings.laps - 1) {
				this.onEvent?.({type: "lastLap", vehicle});
			}
			this.controllerFor(vehicle)?.onLapCompleted(
				this.settings.laps - vehicle.lap,
				this.fuelSystem.estimateFuelPerLap(),
				this.tireSystem.estimateTiresPerLap(),
				this.damageSystem.enabled,
			);
		}
	}
}
