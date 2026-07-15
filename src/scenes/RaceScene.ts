import Phaser from "phaser";
import {FIXED_STEP, GAME_HEIGHT, GAME_WIDTH, MAX_CATCHUP_STEPS} from "../app/constants";
import {audio} from "../audio/AudioManager";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {t} from "../data/translations";
import {
	CAR_SPRITE_WIDTH,
	ensureCarTexture,
	ensureParticleTextures,
	ensurePitCrewTextures,
	ensureShadowTexture,
} from "../gfx/carTexture";
import {ensureLightTextures} from "../gfx/lightTexture";
import {ensureTrackTexture} from "../gfx/trackTexture";
import {loadSettings, saveSettings} from "../persistence/storage";
import {DayNightSystem} from "../race/DayNightSystem";
import {RaceController, type RaceEvent} from "../race/RaceController";
import {DEFAULT_RACE_SETTINGS, type RaceSettings} from "../race/raceTypes";
import {Track} from "../track/Track";
import {Surface} from "../track/trackTypes";
import {HUD} from "../ui/HUD";
import {TouchControls} from "../ui/TouchControls";
import {createRaceField} from "../vehicles/VehicleFactory";
import {PlayerController} from "../vehicles/PlayerController";
import {resetToTrack} from "../vehicles/VehiclePhysics";
import type {Vehicle} from "../vehicles/Vehicle";

/** Quantification des orientations de sprites : 32 pas (§16.2). */
const ORIENTATION_STEP = (Math.PI * 2) / 32;
/** Index du bouton Start/Menu, utilisé comme pause manette (§7.2). */
const GAMEPAD_START_BUTTON = 9;
/** Index du bouton A/Croix, utilisé comme confirmation manuelle d'accrochage aux stands. */
const GAMEPAD_DOCK_BUTTON = 0;
/** Profondeur du voile d'obscurité (au-dessus du monde, sous le HUD). */
const DARKNESS_DEPTH = 90;
/** Profondeur des halos lumineux, au-dessus du voile pour le percer. */
const LIGHTS_DEPTH = 91;
/** Alpha maximal du voile d'obscurité en pleine nuit (cohérent avec la pause). */
const MAX_DARKNESS_ALPHA = 0.55;

/**
 * Vue minimale et locale de l'API de vibration manette (expérimentale,
 * absente sur certains navigateurs malgré le typage DOM standard) : tout
 * y est optionnel pour un chaînage sûr, sans erreur si l'API manque.
 */
interface HapticGamepad {
	vibrationActuator?: {
		playEffect?: (type: string, params: Record<string, number>) => Promise<unknown>;
	};
}

interface CarSprites {
	body: Phaser.GameObjects.Image;
	shadow: Phaser.GameObjects.Image;
}

/** Phare avant et feu de freinage arrière d'une voiture (cycle jour/nuit). */
interface CarLights {
	beam: Phaser.GameObjects.Image;
	brake: Phaser.GameObjects.Image;
}

/**
 * Scène de course : simulation à pas fixe (60 Hz, §18.2), caméra moderne
 * suivant le joueur, rendu quantifié des orientations, particules, audio,
 * pause et transitions vers les résultats.
 */
export class RaceScene extends Phaser.Scene {
	private settings!: RaceSettings;
	private track!: Track;
	private controller!: RaceController;
	private playerInput!: PlayerController;
	private hud!: HUD;
	private touchControls: TouchControls | null = null;
	private sprites = new Map<Vehicle, CarSprites>();
	/** Cycle jour/nuit : ambiance calculée à partir de la progression du meneur (additif). */
	private readonly dayNight = new DayNightSystem();
	private darkness: Phaser.GameObjects.Rectangle | null = null;
	private floodlightGlows: Phaser.GameObjects.Image[] = [];
	private carLights = new Map<Vehicle, CarLights>();

	private accumulator = 0;
	private paused = false;
	private pauseOverlay: Phaser.GameObjects.Container | null = null;
	private centerText!: Phaser.GameObjects.Text;
	private centerTextTimer = 0;
	private collisionCooldown = 0;
	private lowFuelAlerted = false;
	private gamepadStartWasDown = false;
	private gamepadDockWasDown = false;
	private camX = 0;
	private camY = 0;

	private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
	private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
	private darkSmoke!: Phaser.GameObjects.Particles.ParticleEmitter;
	/** Équipiers affichés autour des voitures immobilisées dans leur emplacement. */
	private pitCrews = new Map<Vehicle, Phaser.GameObjects.Container>();

	constructor() {
		super("race");
	}

	init(data: { settings?: RaceSettings }): void {
		this.settings = data.settings ?? {...DEFAULT_RACE_SETTINGS};
		this.sprites = new Map();
		this.accumulator = 0;
		this.paused = false;
		this.pauseOverlay = null;
		this.centerTextTimer = 0;
		this.collisionCooldown = 0;
		this.lowFuelAlerted = false;
		this.gamepadStartWasDown = false;
		this.gamepadDockWasDown = false;
		this.touchControls = null;
		this.pitCrews = new Map();
		this.darkness = null;
		this.floodlightGlows = [];
		this.carLights = new Map();
	}

	create(): void {
		this.track = new Track(CLASSIC_OVAL);
		ensureTrackTexture(this, this.track);
		ensureShadowTexture(this);
		ensureParticleTextures(this);
		ensurePitCrewTextures(this);
		ensureLightTextures(this);
		this.add.image(0, 0, "track").setOrigin(0, 0);

		const field = createRaceField(this.settings, this.track);
		this.controller = new RaceController(this.track, this.settings, field);
		this.controller.onEvent = (event) => this.handleRaceEvent(event);

		// — Sprites : ombre, carrosserie, phare et feu de freinage pour chaque voiture.
		for (const vehicle of this.controller.vehicles) {
			const key = ensureCarTexture(this, vehicle.colorIndex, vehicle.raceNumber);
			const shadow = this.add.image(vehicle.x + 2, vehicle.y + 3, "car-shadow").setDepth(4);
			const body = this.add.image(vehicle.x, vehicle.y, key).setDepth(5);
			this.sprites.set(vehicle, {body, shadow});

			// Phare (origine à la source, s'étend vers l'avant) et feu de freinage,
			// invisibles de jour (alpha 0), révélés par updateDayNight à la tombée de la nuit.
			const beam = this.add
				.image(vehicle.x, vehicle.y, "light-beam")
				.setOrigin(0, 0.5)
				.setBlendMode(Phaser.BlendModes.ADD)
				.setDepth(LIGHTS_DEPTH)
				.setAlpha(0);
			const brake = this.add
				.image(vehicle.x, vehicle.y, "light-brake")
				.setBlendMode(Phaser.BlendModes.ADD)
				.setDepth(LIGHTS_DEPTH)
				.setAlpha(0);
			this.carLights.set(vehicle, {beam, brake});
		}

		// — Voile d'obscurité plein écran (cycle jour/nuit), sous le HUD et les overlays.
		this.darkness = this.add
			.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
			.setOrigin(0)
			.setScrollFactor(0)
			.setDepth(DARKNESS_DEPTH);

		// — Halos des projecteurs du circuit : glow sur le pylône + flaque au sol,
		// invisibles de jour, révélés par updateDayNight.
		for (const light of this.track.data.floodlights) {
			const glow = this.add
				.image(light.x, light.y, "light-glow")
				.setBlendMode(Phaser.BlendModes.ADD)
				.setDepth(LIGHTS_DEPTH)
				.setScale(2.8)
				.setAlpha(0);
			const pool = this.add
				.image(light.x, light.y + 26, "light-glow")
				.setBlendMode(Phaser.BlendModes.ADD)
				.setDepth(LIGHTS_DEPTH)
				.setScale(3.6, 1.6)
				.setAlpha(0);
			this.floodlightGlows.push(glow, pool);
		}

		// — Particules : fumée de dérapage et poussière sur l'herbe (§16.4).
		this.smoke = this.add.particles(0, 0, "p-smoke", {
			lifespan: 500,
			alpha: {start: 0.7, end: 0},
			scale: {start: 1, end: 2},
			speed: {min: 5, max: 25},
			frequency: -1,
		});
		this.smoke.setDepth(6);
		this.dust = this.add.particles(0, 0, "p-dust", {
			lifespan: 400,
			alpha: {start: 0.8, end: 0},
			scale: {start: 1, end: 1.8},
			speed: {min: 10, max: 40},
			frequency: -1,
		});
		this.dust.setDepth(6);
		this.darkSmoke = this.add.particles(0, 0, "p-smoke-dark", {
			lifespan: 700,
			alpha: {start: 0.8, end: 0},
			scale: {start: 0.8, end: 2.2},
			speed: {min: 4, max: 18},
			frequency: -1,
		});
		this.darkSmoke.setDepth(6);

		// — Surbrillance pulsante de la dalle attitrée du joueur (cyan pour
		// contraster avec les contours jaunes des dalles).
		const playerBox = this.track.data.pitBoxes[this.controller.player.pitBoxIndex]!;
		const highlight = this.add
			.rectangle(playerBox.x, playerBox.y, 46, 38, 0x40e0ff, 0.22)
			.setStrokeStyle(3, 0x40e0ff, 1)
			.setDepth(3);
		this.tweens.add({
			targets: highlight,
			alpha: {from: 1, to: 0.4},
			duration: 550,
			yoyo: true,
			repeat: -1,
		});

		// — Caméra moderne : suivi lissé avec anticipation (§10.2).
		const cam = this.cameras.main;
		cam.setBounds(0, 0, this.track.data.worldWidth, this.track.data.worldHeight);
		this.camX = this.controller.player.x;
		this.camY = this.controller.player.y;
		cam.centerOn(this.camX, this.camY);

		this.playerInput = new PlayerController(this);
		this.hud = new HUD(this, this.controller);

		// — Boutons virtuels : uniquement sur appareil tactile (§7.3).
		if (TouchControls.isTouchDevice(this)) {
			const touch = new TouchControls(this);
			touch.onPause = () => this.togglePause();
			touch.onFullscreen = () => this.scale.toggleFullscreen();
			touch.onDock = () => this.controller.requestPlayerDock();
			this.touchControls = touch;
		}

		// — Texte central (compte à rebours, messages).
		this.centerText = this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, "", {
				fontFamily: "monospace",
				fontSize: "56px",
				color: "#f0d048",
				stroke: "#101014",
				strokeThickness: 6,
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(120);

		// — Touches spéciales : pause, remise en piste, son, abandon.
		const keyboard = this.input.keyboard!;
		keyboard.on("keydown-ESC", () => this.togglePause());
		keyboard.on("keydown-R", () => {
			if (!this.paused && this.controller.player.isRunning) {
				resetToTrack(this.controller.player, this.track);
			}
		});
		keyboard.on("keydown-M", () => {
			const muted = audio.toggleMuted();
			const stored = loadSettings();
			stored.muted = muted;
			saveSettings(stored);
		});
		keyboard.on("keydown-Q", () => {
			if (this.paused) this.endRace();
		});
		keyboard.on("keydown-A", () => {
			if (!this.paused && this.controller.phase !== "finished") {
				this.controller.autopilotEnabled = !this.controller.autopilotEnabled;
				audio.playMenuBlip();
			}
		});
		keyboard.on("keydown-E", () => {
			if (!this.paused) this.controller.requestPlayerDock();
		});

		audio.unlock();
		audio.startEngine();
		// Départ lancé (§13.1) : affichée sans minuterie, elle reste visible
		// jusqu'au drapeau vert qui la remplace via showCenterText.
		this.centerText.setText(t("race.formationLap"));

		// Accès de debug en développement (autopilote de test, inspection).
		if (import.meta.env.DEV) {
			(window as unknown as Record<string, unknown>).__race = this.controller;
		}
	}

	override update(_time: number, deltaMs: number): void {
		// Pause manette (Start, front montant) : agit aussi bien pour pausser que reprendre.
		this.updateGamepadPause();
		// Confirmation manuelle d'accrochage aux stands (A/Croix, front montant).
		this.updateGamepadDock();

		if (!this.paused) {
			this.playerInput.setTouchSource(this.touchControls?.state ?? null);
			// — Boucle à pas fixe avec rattrapage plafonné (§18.2).
			this.accumulator += Math.min(deltaMs / 1000, 0.25);
			let steps = 0;
			while (this.accumulator >= FIXED_STEP && steps < MAX_CATCHUP_STEPS) {
				this.playerInput.locked = this.controller.phase === "formation";
				// Pendant la formation ou en autopilote, l'IA du joueur écrit les
				// commandes à sa place (§13.1).
				if (
					this.controller.phase !== "formation" &&
					!this.controller.autopilotEnabled &&
					(this.controller.player.isRunning || this.controller.player.raceState === "finished")
				) {
					this.playerInput.read(this.controller.player.controls);
				}
				this.controller.step(FIXED_STEP);
				this.accumulator -= FIXED_STEP;
				steps++;
			}
			if (steps === MAX_CATCHUP_STEPS) this.accumulator = 0;

			this.updateAudioAndEffects(deltaMs / 1000);

			if (this.centerTextTimer > 0) {
				this.centerTextTimer -= deltaMs / 1000;
				if (this.centerTextTimer <= 0) this.centerText.setText("");
			}
		}

		// Le rendu reste actif même en pause : l'écran reflète l'état réel.
		this.renderVehicles();
		const dayNightFraction = this.updateDayNight();
		this.updateCamera(deltaMs / 1000);
		this.hud.update(_time, this.controller.playerDockPromptActive(), dayNightFraction);
		this.touchControls?.setDockButtonVisible(this.controller.playerDockPromptActive());
	}

	/** Bouton Start/Menu de la première manette : bascule la pause sur front montant. */
	private updateGamepadPause(): void {
		const down = this.playerInput.gamepad?.isButtonDown(GAMEPAD_START_BUTTON) ?? false;
		if (down && !this.gamepadStartWasDown) this.togglePause();
		this.gamepadStartWasDown = down;
	}

	/** Bouton A/Croix de la première manette : confirme l'accrochage manuel sur front montant. */
	private updateGamepadDock(): void {
		const down = this.playerInput.gamepad?.isButtonDown(GAMEPAD_DOCK_BUTTON) ?? false;
		if (down && !this.gamepadDockWasDown && !this.paused) this.controller.requestPlayerDock();
		this.gamepadDockWasDown = down;
	}

	/** Vibration proportionnelle à la vitesse sur choc (§7.2) ; API non standard, sans risque. */
	private vibrateCollision(speed: number): void {
		const pad = this.playerInput.gamepad;
		if (!pad) return;
		const rawPad = navigator.getGamepads()[pad.index] as unknown as HapticGamepad | null | undefined;
		const magnitude = Math.min(1, speed / 200);
		void rawPad?.vibrationActuator?.playEffect?.("dual-rumble", {
			duration: 200,
			strongMagnitude: magnitude,
			weakMagnitude: magnitude,
		});
	}

	/** Positionne sprites et ombres, orientation quantifiée sur 32 pas. */
	private renderVehicles(): void {
		for (const [vehicle, sprites] of this.sprites) {
			const rotation = Math.round(vehicle.heading / ORIENTATION_STEP) * ORIENTATION_STEP;
			sprites.body.setPosition(vehicle.x, vehicle.y).setRotation(rotation);
			sprites.shadow.setPosition(vehicle.x + 2, vehicle.y + 3).setRotation(rotation);
			// Les véhicules hors course restent visibles (obstacles).
			sprites.body.setAlpha(vehicle.raceState === "fuelOut" ? 0.85 : 1);
			this.updatePitCrew(vehicle);
		}
	}

	/** Fait apparaître les équipiers autour d'une voiture arrêtée à son stand. */
	private updatePitCrew(vehicle: Vehicle): void {
		const stopped = vehicle.pitPhase === "stopped";
		const existing = this.pitCrews.get(vehicle);
		if (stopped && !existing) {
			const box = this.track.data.pitBoxes[vehicle.pitBoxIndex]!;
			const crew = this.add.container(box.x, box.y).setDepth(7);
			crew.add([
				// Ravitailleur à l'arrière de la voiture (côté aileron).
				this.add.image(-28, 2, "p-crew"),
				// Changeurs de pneus à l'avant et à l'arrière, pneu en main.
				this.add.image(-13, -15, "p-crew"),
				this.add.image(-7, -15, "p-tire"),
				this.add.image(13, 14, "p-crew"),
				this.add.image(19, 14, "p-tire"),
			]);
			this.pitCrews.set(vehicle, crew);
		} else if (!stopped && existing) {
			existing.destroy();
			this.pitCrews.delete(vehicle);
		}
	}

	/**
	 * Applique le cycle jour/nuit : obscurité proportionnelle à la progression
	 * du meneur, projecteurs du circuit, phares et feux de freinage des
	 * voitures en course. Aucune allocation : tous les objets sont réutilisés.
	 * Renvoie la fraction de progression utilisée, pour que le HUD affiche
	 * l'horloge fictive et la phase sans la recalculer différemment.
	 */
	private updateDayNight(): number {
		const leader = this.controller.ranking[0];
		const fraction = leader ? leader.lap / this.settings.laps : 0;
		const state = this.dayNight.computeFraction(fraction);

		this.darkness?.setAlpha(state.darkness * MAX_DARKNESS_ALPHA);

		const lightAlpha = state.lightsOn ? state.darkness : 0;
		for (const glow of this.floodlightGlows) glow.setAlpha(lightAlpha);

		const halfLength = CAR_SPRITE_WIDTH / 2;
		for (const [vehicle, lights] of this.carLights) {
			if (vehicle.raceState === "wrecked") {
				lights.beam.setAlpha(0);
				lights.brake.setAlpha(0);
				continue;
			}
			const rotation = Math.round(vehicle.heading / ORIENTATION_STEP) * ORIENTATION_STEP;
			const cos = Math.cos(rotation);
			const sin = Math.sin(rotation);
			lights.beam
				.setPosition(vehicle.x + cos * halfLength, vehicle.y + sin * halfLength)
				.setRotation(rotation)
				.setAlpha(lightAlpha);
			lights.brake
				.setPosition(vehicle.x - cos * halfLength, vehicle.y - sin * halfLength)
				.setAlpha(vehicle.controls.brake > 0 ? lightAlpha : 0);
		}

		return fraction;
	}

	/** Caméra lissée avec légère anticipation dans la direction du joueur. */
	private updateCamera(dt: number): void {
		const player = this.controller.player;
		const lookahead = Math.min(90, Math.abs(player.vLong) * 0.35);
		const targetX = player.x + Math.cos(player.heading) * lookahead;
		const targetY = player.y + Math.sin(player.heading) * lookahead;
		const blend = Math.min(1, dt * 4.5);
		this.camX += (targetX - this.camX) * blend;
		this.camY += (targetY - this.camY) * blend;
		this.cameras.main.centerOn(Math.round(this.camX), Math.round(this.camY));
	}

	private updateAudioAndEffects(dt: number): void {
		const player = this.controller.player;

		// — Moteur : régime lié à la vitesse, charge à l'accélérateur.
		const rpm = Math.min(1, Math.abs(player.vLong) / player.spec.maxSpeed);
		audio.updateEngine(rpm, player.controls.throttle * player.powerFactor);

		// — Nappes continues.
		audio.setSkid(player.sliding && player.speed > 40);
		audio.setGrass(player.surface === Surface.Grass && player.speed > 20);
		audio.setRefueling(player.pitPhase === "stopped");

		// — Collisions (avec anti-rafale).
		this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
		if (this.collisionCooldown === 0) {
			if (player.hitWall) {
				audio.playCollision(Math.min(1, player.speed / 200));
				this.vibrateCollision(player.speed);
				this.collisionCooldown = 0.25;
			} else if (player.hitCar) {
				audio.playCollision(Math.min(0.6, player.speed / 260));
				this.vibrateCollision(player.speed);
				this.collisionCooldown = 0.25;
			}
		}

		// — Alerte sonore de carburant critique (§12.1).
		const ratio = player.fuel / player.spec.fuelCapacity;
		if (this.controller.fuelSystem.enabled && ratio < 0.05 && !this.lowFuelAlerted) {
			audio.playLowFuelAlert();
			this.lowFuelAlerted = true;
		}
		if (ratio >= 0.05) this.lowFuelAlerted = false;

		// — Particules : dérapage, poussière et fumée noire des voitures abîmées.
		for (const vehicle of this.controller.vehicles) {
			if (vehicle.sliding && vehicle.speed > 50) {
				this.smoke.emitParticleAt(vehicle.x, vehicle.y);
			}
			if (vehicle.surface === Surface.Grass && vehicle.speed > 30) {
				this.dust.emitParticleAt(vehicle.x, vehicle.y);
			}
			if (
				this.controller.damageSystem.enabled &&
				vehicle.health < 30 &&
				vehicle.raceState !== "finished" &&
				Math.random() < 0.35
			) {
				this.darkSmoke.emitParticleAt(vehicle.x, vehicle.y);
			}
		}
	}

	private handleRaceEvent(event: RaceEvent): void {
		switch (event.type) {
			case "countdown":
				this.showCenterText(String(event.value), 0.9);
				audio.playCountdown(false);
				break;
			case "green":
				this.showCenterText(t("race.go"), 1.2);
				audio.playCountdown(true);
				break;
			case "lastLap":
				if (event.vehicle.isPlayer) {
					this.showCenterText(t("hud.warning.lastLap"), 2);
					audio.playLastLap();
				}
				break;
			case "finished":
				if (event.vehicle.isPlayer) {
					this.showCenterText(t("hud.finished"), 3);
					audio.playFinish();
				}
				break;
			case "puncture":
				if (event.vehicle.isPlayer) {
					this.showCenterText(t("hud.warning.flatTire"), 2.5);
					audio.playPuncture();
				}
				break;
			case "wrecked":
				if (event.vehicle.isPlayer) {
					this.showCenterText(t("hud.warning.wrecked"), 3);
					audio.playCollision(1);
				}
				break;
			case "raceOver":
				this.time.delayedCall(2200, () => this.endRace());
				break;
			case "lapCompleted":
				break;
		}
	}

	private togglePause(): void {
		if (this.controller.phase === "finished") return;
		this.paused = !this.paused;
		if (this.paused) {
			audio.stopEngine();
			audio.setSkid(false);
			audio.setGrass(false);
			audio.setRefueling(false);
			const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(150);
			const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);
			const title = this.add
				.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, t("race.paused"), {
					fontFamily: "monospace",
					fontSize: "42px",
					color: "#f0d048",
				})
				.setOrigin(0.5);
			const hint = this.add
				.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, t("race.pauseHint"), {
					fontFamily: "monospace",
					fontSize: "14px",
					color: "#b8bec8",
				})
				.setOrigin(0.5);
			overlay.add([bg, title, hint]);
			this.pauseOverlay = overlay;
		} else {
			audio.startEngine();
			this.pauseOverlay?.destroy();
			this.pauseOverlay = null;
		}
	}

	/** Bascule vers l'écran de résultats (fin de course ou abandon). */
	private endRace(): void {
		audio.stopEngine();
		audio.setSkid(false);
		audio.setGrass(false);
		audio.setRefueling(false);
		this.scene.start("results", {
			results: this.controller.buildResults(),
			raceBest: this.controller.raceBestLap
				? {
					time: this.controller.raceBestLap.time,
					driverName: this.controller.raceBestLap.vehicle.driverName,
				}
				: null,
			settings: this.settings,
		});
	}

	private showCenterText(text: string, duration: number): void {
		this.centerText.setText(text);
		this.centerTextTimer = duration;
	}
}
