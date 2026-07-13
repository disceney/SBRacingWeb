import Phaser from 'phaser';
import { GAME_WIDTH } from '../app/constants';
import { t } from '../data/translations';
import { CAR_COLORS } from '../gfx/palette';
import { ensureCarTexture } from '../gfx/carTexture';
import type { FuelLevel, RaceSettings } from '../race/raceTypes';
import { loadSettings, saveSettings } from '../persistence/storage';
import { MenuList } from '../ui/MenuList';

const LAP_PRESETS = [5, 10, 20, 30, 50];
const FUEL_LEVELS: FuelLevel[] = ['off', 'reduced', 'normal', 'high'];

/**
 * Écran de configuration de course (§6.1, périmètre MVP) : nombre de
 * voitures, tours (préréglages par ←/→, pas fin avec Maj), consommation,
 * collisions, livrée et numéro. Les réglages sont persistés (§20).
 */
export class SetupScene extends Phaser.Scene {
  private settings!: RaceSettings;
  private preview!: Phaser.GameObjects.Image;

  constructor() {
    super('setup');
  }

  create(): void {
    this.settings = { ...loadSettings().lastRace };

    this.add
      .text(GAME_WIDTH / 2, 60, t('setup.title'), {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#f0d048',
      })
      .setOrigin(0.5);

    new MenuList(this, 240, 130, [
      {
        label: () => `${t('setup.carCount')} : ${this.settings.carCount}`,
        onChange: (dir) => {
          // Quinze concurrents au maximum : un stand attitré chacun.
          this.settings.carCount = clamp(this.settings.carCount + dir, 2, 15);
        },
      },
      {
        label: () => `${t('setup.laps')} : ${this.settings.laps}`,
        onChange: (dir, shift) => {
          this.settings.laps = shift
            ? clamp(this.settings.laps + dir, 1, 200)
            : cyclePreset(this.settings.laps, dir);
        },
      },
      {
        label: () => `${t('setup.fuel')} : ${t(`setup.fuel.${this.settings.fuelLevel}`)}`,
        onChange: (dir) => {
          const i = FUEL_LEVELS.indexOf(this.settings.fuelLevel);
          this.settings.fuelLevel =
            FUEL_LEVELS[(i + dir + FUEL_LEVELS.length) % FUEL_LEVELS.length]!;
        },
      },
      {
        label: () => `${t('setup.tires')} : ${t(`setup.fuel.${this.settings.tireLevel}`)}`,
        onChange: (dir) => {
          const i = FUEL_LEVELS.indexOf(this.settings.tireLevel);
          this.settings.tireLevel =
            FUEL_LEVELS[(i + dir + FUEL_LEVELS.length) % FUEL_LEVELS.length]!;
        },
      },
      {
        label: () => `${t('setup.damage')} : ${t(`setup.fuel.${this.settings.damageLevel}`)}`,
        onChange: (dir) => {
          const i = FUEL_LEVELS.indexOf(this.settings.damageLevel);
          this.settings.damageLevel =
            FUEL_LEVELS[(i + dir + FUEL_LEVELS.length) % FUEL_LEVELS.length]!;
        },
      },
      {
        label: () =>
          `${t('setup.collisions')} : ${this.settings.collisions ? t('common.on') : t('common.off')}`,
        onChange: () => {
          this.settings.collisions = !this.settings.collisions;
        },
      },
      {
        label: () =>
          `${t('setup.autopilot')} : ${this.settings.autopilot ? t('common.on2') : t('common.off2')}`,
        onChange: () => {
          this.settings.autopilot = !this.settings.autopilot;
        },
      },
      {
        label: () =>
          `${t('setup.color')} : ${CAR_COLORS[this.settings.playerColorIndex]!.name}`,
        onChange: (dir) => {
          this.settings.playerColorIndex =
            (this.settings.playerColorIndex + dir + CAR_COLORS.length) % CAR_COLORS.length;
          this.updatePreview();
        },
      },
      {
        label: () => `${t('setup.number')} : ${this.settings.playerNumber}`,
        onChange: (dir) => {
          this.settings.playerNumber = clamp(this.settings.playerNumber + dir, 1, 99);
          this.updatePreview();
        },
      },
      { label: () => '', disabled: true },
      { label: () => t('setup.start'), onActivate: () => this.startRace() },
      { label: () => t('common.back'), onActivate: () => this.scene.start('menu') },
    ]);

    // Aperçu de la livrée, agrandi.
    this.preview = this.add.image(700, 220, '').setScale(3);
    this.updatePreview();

    this.add
      .text(GAME_WIDTH / 2, 505, t('setup.hint'), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6a707c',
      })
      .setOrigin(0.5);
  }

  private updatePreview(): void {
    const key = ensureCarTexture(this, this.settings.playerColorIndex, this.settings.playerNumber);
    this.preview.setTexture(key);
  }

  private startRace(): void {
    const stored = loadSettings();
    stored.lastRace = { ...this.settings };
    saveSettings(stored);
    this.scene.start('race', { settings: { ...this.settings } });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Passe au préréglage de tours suivant/précédent (valeur libre rattachée au plus proche). */
function cyclePreset(current: number, dir: -1 | 1): number {
  const index = LAP_PRESETS.findIndex((p) => p >= current);
  const nearest = index === -1 ? LAP_PRESETS.length - 1 : index;
  let next = nearest;
  if (LAP_PRESETS[nearest] === current) next = nearest + dir;
  else if (dir === -1) next = nearest - 1;
  return LAP_PRESETS[clamp(next, 0, LAP_PRESETS.length - 1)]!;
}
