import Phaser from 'phaser';
import { FIXED_STEP, GAME_WIDTH, GAME_HEIGHT, MAX_CATCHUP_STEPS } from '../app/constants';
import { audio } from '../audio/AudioManager';
import { CLASSIC_OVAL } from '../data/tracks/classicOval';
import { t } from '../data/translations';
import {
  ensureCarTexture,
  ensureShadowTexture,
  ensureParticleTextures,
  ensurePitCrewTextures,
} from '../gfx/carTexture';
import { ensureTrackTexture } from '../gfx/trackTexture';
import { loadSettings, saveSettings } from '../persistence/storage';
import { RaceController, type RaceEvent } from '../race/RaceController';
import { DEFAULT_RACE_SETTINGS, type RaceSettings } from '../race/raceTypes';
import { Track } from '../track/Track';
import { Surface } from '../track/trackTypes';
import { HUD } from '../ui/HUD';
import { createRaceField } from '../vehicles/VehicleFactory';
import { PlayerController } from '../vehicles/PlayerController';
import { resetToTrack } from '../vehicles/VehiclePhysics';
import type { Vehicle } from '../vehicles/Vehicle';

/** Quantification des orientations de sprites : 32 pas (§16.2). */
const ORIENTATION_STEP = (Math.PI * 2) / 32;

interface CarSprites {
  body: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
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
  private sprites = new Map<Vehicle, CarSprites>();

  private accumulator = 0;
  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;
  private centerText!: Phaser.GameObjects.Text;
  private centerTextTimer = 0;
  private collisionCooldown = 0;
  private lowFuelAlerted = false;
  private camX = 0;
  private camY = 0;

  private smoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private darkSmoke!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Équipiers affichés autour des voitures immobilisées dans leur emplacement. */
  private pitCrews = new Map<Vehicle, Phaser.GameObjects.Container>();

  constructor() {
    super('race');
  }

  init(data: { settings?: RaceSettings }): void {
    this.settings = data.settings ?? { ...DEFAULT_RACE_SETTINGS };
    this.sprites = new Map();
    this.accumulator = 0;
    this.paused = false;
    this.pauseOverlay = null;
    this.centerTextTimer = 0;
    this.collisionCooldown = 0;
    this.lowFuelAlerted = false;
    this.pitCrews = new Map();
  }

  create(): void {
    this.track = new Track(CLASSIC_OVAL);
    ensureTrackTexture(this, this.track);
    ensureShadowTexture(this);
    ensureParticleTextures(this);
    ensurePitCrewTextures(this);
    this.add.image(0, 0, 'track').setOrigin(0, 0);

    const field = createRaceField(this.settings, this.track);
    this.controller = new RaceController(this.track, this.settings, field);
    this.controller.onEvent = (event) => this.handleRaceEvent(event);

    // — Sprites : ombre puis carrosserie pour chaque voiture.
    for (const vehicle of this.controller.vehicles) {
      const key = ensureCarTexture(this, vehicle.colorIndex, vehicle.raceNumber);
      const shadow = this.add.image(vehicle.x + 2, vehicle.y + 3, 'car-shadow').setDepth(4);
      const body = this.add.image(vehicle.x, vehicle.y, key).setDepth(5);
      this.sprites.set(vehicle, { body, shadow });
    }

    // — Particules : fumée de dérapage et poussière sur l'herbe (§16.4).
    this.smoke = this.add.particles(0, 0, 'p-smoke', {
      lifespan: 500,
      alpha: { start: 0.7, end: 0 },
      scale: { start: 1, end: 2 },
      speed: { min: 5, max: 25 },
      frequency: -1,
    });
    this.smoke.setDepth(6);
    this.dust = this.add.particles(0, 0, 'p-dust', {
      lifespan: 400,
      alpha: { start: 0.8, end: 0 },
      scale: { start: 1, end: 1.8 },
      speed: { min: 10, max: 40 },
      frequency: -1,
    });
    this.dust.setDepth(6);
    this.darkSmoke = this.add.particles(0, 0, 'p-smoke-dark', {
      lifespan: 700,
      alpha: { start: 0.8, end: 0 },
      scale: { start: 0.8, end: 2.2 },
      speed: { min: 4, max: 18 },
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
      alpha: { from: 1, to: 0.4 },
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

    // — Texte central (compte à rebours, messages).
    this.centerText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, '', {
        fontFamily: 'monospace',
        fontSize: '56px',
        color: '#f0d048',
        stroke: '#101014',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120);

    // — Touches spéciales : pause, remise en piste, son, abandon.
    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-ESC', () => this.togglePause());
    keyboard.on('keydown-R', () => {
      if (!this.paused && this.controller.player.isRunning) {
        resetToTrack(this.controller.player, this.track);
      }
    });
    keyboard.on('keydown-M', () => {
      const muted = audio.toggleMuted();
      const stored = loadSettings();
      stored.muted = muted;
      saveSettings(stored);
    });
    keyboard.on('keydown-Q', () => {
      if (this.paused) this.endRace();
    });
    keyboard.on('keydown-A', () => {
      if (!this.paused && this.controller.phase !== 'finished') {
        this.controller.autopilotEnabled = !this.controller.autopilotEnabled;
        audio.playMenuBlip();
      }
    });

    audio.unlock();
    audio.startEngine();
    this.showCenterText('3', 0.9);

    // Accès de debug en développement (autopilote de test, inspection).
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__race = this.controller;
    }
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.paused) {
      // — Boucle à pas fixe avec rattrapage plafonné (§18.2).
      this.accumulator += Math.min(deltaMs / 1000, 0.25);
      let steps = 0;
      while (this.accumulator >= FIXED_STEP && steps < MAX_CATCHUP_STEPS) {
        this.playerInput.locked = this.controller.phase === 'countdown';
        // En autopilote, l'IA du joueur écrit les commandes à sa place.
        if (
          !this.controller.autopilotEnabled &&
          (this.controller.player.isRunning || this.controller.player.raceState === 'finished')
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
        if (this.centerTextTimer <= 0) this.centerText.setText('');
      }
    }

    // Le rendu reste actif même en pause : l'écran reflète l'état réel.
    this.renderVehicles();
    this.updateCamera(deltaMs / 1000);
    this.hud.update(_time);
  }

  /** Positionne sprites et ombres, orientation quantifiée sur 32 pas. */
  private renderVehicles(): void {
    for (const [vehicle, sprites] of this.sprites) {
      const rotation = Math.round(vehicle.heading / ORIENTATION_STEP) * ORIENTATION_STEP;
      sprites.body.setPosition(vehicle.x, vehicle.y).setRotation(rotation);
      sprites.shadow.setPosition(vehicle.x + 2, vehicle.y + 3).setRotation(rotation);
      // Les véhicules hors course restent visibles (obstacles).
      sprites.body.setAlpha(vehicle.raceState === 'fuelOut' ? 0.85 : 1);
      this.updatePitCrew(vehicle);
    }
  }

  /** Fait apparaître les équipiers autour d'une voiture arrêtée à son stand. */
  private updatePitCrew(vehicle: Vehicle): void {
    const stopped = vehicle.pitPhase === 'stopped';
    const existing = this.pitCrews.get(vehicle);
    if (stopped && !existing) {
      const box = this.track.data.pitBoxes[vehicle.pitBoxIndex]!;
      const crew = this.add.container(box.x, box.y).setDepth(7);
      crew.add([
        // Ravitailleur à l'arrière de la voiture (côté aileron).
        this.add.image(-28, 2, 'p-crew'),
        // Changeurs de pneus à l'avant et à l'arrière, pneu en main.
        this.add.image(-13, -15, 'p-crew'),
        this.add.image(-7, -15, 'p-tire'),
        this.add.image(13, 14, 'p-crew'),
        this.add.image(19, 14, 'p-tire'),
      ]);
      this.pitCrews.set(vehicle, crew);
    } else if (!stopped && existing) {
      existing.destroy();
      this.pitCrews.delete(vehicle);
    }
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
    audio.setRefueling(player.pitPhase === 'stopped');

    // — Collisions (avec anti-rafale).
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    if (this.collisionCooldown === 0) {
      if (player.hitWall) {
        audio.playCollision(Math.min(1, player.speed / 200));
        this.collisionCooldown = 0.25;
      } else if (player.hitCar) {
        audio.playCollision(Math.min(0.6, player.speed / 260));
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
        vehicle.raceState !== 'finished' &&
        Math.random() < 0.35
      ) {
        this.darkSmoke.emitParticleAt(vehicle.x, vehicle.y);
      }
    }
  }

  private handleRaceEvent(event: RaceEvent): void {
    switch (event.type) {
      case 'countdown':
        this.showCenterText(String(event.value), 0.9);
        audio.playCountdown(false);
        break;
      case 'green':
        this.showCenterText(t('race.go'), 1.2);
        audio.playCountdown(true);
        break;
      case 'lastLap':
        if (event.vehicle.isPlayer) {
          this.showCenterText(t('hud.warning.lastLap'), 2);
          audio.playLastLap();
        }
        break;
      case 'finished':
        if (event.vehicle.isPlayer) {
          this.showCenterText(t('hud.finished'), 3);
          audio.playFinish();
        }
        break;
      case 'puncture':
        if (event.vehicle.isPlayer) {
          this.showCenterText(t('hud.warning.flatTire'), 2.5);
          audio.playPuncture();
        }
        break;
      case 'wrecked':
        if (event.vehicle.isPlayer) {
          this.showCenterText(t('hud.warning.wrecked'), 3);
          audio.playCollision(1);
        }
        break;
      case 'raceOver':
        this.time.delayedCall(2200, () => this.endRace());
        break;
      case 'lapCompleted':
        break;
    }
  }

  private togglePause(): void {
    if (this.controller.phase === 'finished') return;
    this.paused = !this.paused;
    if (this.paused) {
      audio.stopEngine();
      audio.setSkid(false);
      audio.setGrass(false);
      audio.setRefueling(false);
      const overlay = this.add.container(0, 0).setScrollFactor(0).setDepth(150);
      const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setOrigin(0);
      const title = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, t('race.paused'), {
          fontFamily: 'monospace',
          fontSize: '42px',
          color: '#f0d048',
        })
        .setOrigin(0.5);
      const hint = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, t('race.pauseHint'), {
          fontFamily: 'monospace',
          fontSize: '14px',
          color: '#b8bec8',
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
    this.scene.start('results', {
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
