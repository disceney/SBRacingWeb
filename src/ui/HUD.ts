import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, unitsToMph } from '../app/constants';
import { audio } from '../audio/AudioManager';
import { t } from '../data/translations';
import { formatLapTime } from '../race/TimingSystem';
import type { RaceController } from '../race/RaceController';
import type { Vehicle } from '../vehicles/Vehicle';

const BAR_HEIGHT = 80;
const BAR_TOP = GAME_HEIGHT - BAR_HEIGHT;

const FONT = { fontFamily: 'monospace', fontSize: '13px', color: '#e8e8e8' };
const FONT_SMALL = { fontFamily: 'monospace', fontSize: '11px', color: '#b8bec8' };

/**
 * Barre d'information inférieure (§14) : position, tours, vitesse, jauge de
 * carburant avec états d'alerte, chronos, concurrents proches, état des
 * stands et avertissements. Fixée à l'écran, style sobre fin des années 90.
 */
export class HUD {
  private readonly controller: RaceController;

  private readonly fuelBar: Phaser.GameObjects.Graphics;
  private readonly posText: Phaser.GameObjects.Text;
  private readonly lapText: Phaser.GameObjects.Text;
  private readonly lapsDownText: Phaser.GameObjects.Text;
  private readonly speedText: Phaser.GameObjects.Text;
  private readonly timeTexts: Phaser.GameObjects.Text[];
  private readonly standingTexts: Phaser.GameObjects.Text[];
  private readonly statusText: Phaser.GameObjects.Text;
  private readonly warningText: Phaser.GameObjects.Text;
  private readonly muteText: Phaser.GameObjects.Text;
  private readonly autopilotText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, controller: RaceController) {
    this.controller = controller;

    // — Fond de barre avec liseré supérieur.
    const bg = scene.add.graphics().setScrollFactor(0).setDepth(100);
    bg.fillStyle(0x14161c, 0.94);
    bg.fillRect(0, BAR_TOP, GAME_WIDTH, BAR_HEIGHT);
    bg.fillStyle(0x3a4150, 1);
    bg.fillRect(0, BAR_TOP, GAME_WIDTH, 2);

    const make = (x: number, y: number, style = FONT): Phaser.GameObjects.Text =>
      scene.add.text(x, BAR_TOP + y, '', style).setScrollFactor(0).setDepth(101);

    // Colonne 1 : position et tours.
    this.posText = make(10, 10);
    this.lapText = make(10, 30);
    this.lapsDownText = make(10, 50, { ...FONT_SMALL, color: '#e8a838' });

    // Colonne 2 : vitesse.
    this.speedText = make(130, 14, { fontFamily: 'monospace', fontSize: '26px', color: '#e8e8e8' });
    make(134, 46, FONT_SMALL).setText(t('hud.speedUnit'));

    // Colonne 3 : jauges de carburant, de pneus et d'état mécanique.
    make(250, 6, FONT_SMALL).setText(t('hud.fuel'));
    make(250, 30, FONT_SMALL).setText(t('hud.tires'));
    make(250, 54, FONT_SMALL).setText(t('hud.damage'));
    this.fuelBar = scene.add.graphics().setScrollFactor(0).setDepth(101);

    // Colonne 4 : chronos.
    this.timeTexts = [make(420, 8, FONT_SMALL), make(420, 30, FONT_SMALL), make(420, 52, FONT_SMALL)];

    // Colonne 5 : concurrents proches au classement.
    this.standingTexts = Array.from({ length: 5 }, (_, i) => make(620, 6 + i * 14, FONT_SMALL));

    // Colonne 6 : stands et avertissements.
    this.statusText = make(810, 10, { ...FONT_SMALL, color: '#68c8f0' });
    this.warningText = make(810, 34, { ...FONT, color: '#f05840' });
    this.muteText = scene.add
      .text(GAME_WIDTH - 8, 6, t('race.muted'), { ...FONT_SMALL, color: '#e8a838' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(101);
    this.autopilotText = scene.add
      .text(8, 6, `▣ ${t('hud.autopilot')}`, { ...FONT_SMALL, color: '#f0d048' })
      .setScrollFactor(0)
      .setDepth(101);
  }

  update(timeMs: number): void {
    const c = this.controller;
    const player = c.player;
    const displayLap = Math.min(c.settings.laps, Math.max(1, player.lap + 1));

    this.posText.setText(`${t('hud.position')} ${c.positionOf(player)}/${c.vehicles.length}`);
    this.lapText.setText(`${t('hud.lap')} ${displayLap}/${c.settings.laps}`);

    // Retard en tours sur le meneur.
    const leader = c.ranking[0]!;
    const lapsDown = Math.max(0, leader.lap - player.lap - (leader === player ? 0 : 0));
    this.lapsDownText.setText(
      leader !== player && lapsDown > 0 ? t('hud.lapsDown', { n: lapsDown }) : '',
    );

    this.speedText.setText(String(Math.round(unitsToMph(Math.abs(player.vLong)))).padStart(3, ' '));

    this.drawFuel(player, timeMs);
    this.drawTimes(player);
    this.drawStandings();
    this.drawStatus(player, timeMs);
    this.muteText.setVisible(audio.muted);
    this.autopilotText.setVisible(c.autopilotEnabled);
  }

  /** Jauges essence, pneus et état : avertissement < 20 %, clignotement < 10 %. */
  private drawFuel(player: Vehicle, timeMs: number): void {
    const g = this.fuelBar;
    g.clear();
    this.drawGauge(g, BAR_TOP + 5, player.fuel / player.spec.fuelCapacity, timeMs, false);
    this.drawGauge(g, BAR_TOP + 29, player.tires / 100, timeMs, player.flatTire);
    this.drawGauge(g, BAR_TOP + 53, player.health / 100, timeMs, false);
  }

  private drawGauge(
    g: Phaser.GameObjects.Graphics,
    y: number,
    ratio: number,
    timeMs: number,
    flat: boolean,
  ): void {
    const x = 312;
    const width = 78;
    g.fillStyle(0x2a2e38, 1);
    g.fillRect(x, y, width, 11);
    const blink = (flat || ratio < 0.1) && Math.floor(timeMs / 250) % 2 === 0;
    if (!blink) {
      const color = flat ? 0xf05840 : ratio > 0.2 ? 0x38c848 : ratio > 0.1 ? 0xe8a838 : 0xf05840;
      g.fillStyle(color, 1);
      g.fillRect(x + 2, y + 2, Math.max(0, (width - 4) * (flat ? 1 : ratio)), 7);
    }
    g.lineStyle(1, 0x585f6e, 1);
    g.strokeRect(x, y, width, 11);
    // Repère des 20 %.
    g.lineStyle(1, 0x8890a0, 1);
    g.lineBetween(x + 2 + (width - 4) * 0.2, y, x + 2 + (width - 4) * 0.2, y + 11);
  }

  private drawTimes(player: Vehicle): void {
    const current =
      player.raceState === 'racing' && player.lap >= 0
        ? this.controller.raceTime - player.currentLapStart
        : null;
    this.timeTexts[0]!.setText(`${t('hud.timeCurrent')}  ${formatLapTime(current)}`);
    this.timeTexts[1]!.setText(`${t('hud.timeLast')}   ${formatLapTime(player.lastLapTime)}`);
    this.timeTexts[2]!.setText(`${t('hud.timeBest')}  ${formatLapTime(player.bestLapTime)}`);
  }

  /** Cinq lignes : le podium immédiat autour du joueur (§14). */
  private drawStandings(): void {
    const ranking = this.controller.ranking;
    const playerIndex = ranking.indexOf(this.controller.player);
    // Fenêtre de cinq positions contenant le joueur.
    const start = Math.max(0, Math.min(playerIndex - 2, ranking.length - 5));
    for (let i = 0; i < this.standingTexts.length; i++) {
      const text = this.standingTexts[i]!;
      const vehicle = ranking[start + i];
      if (!vehicle) {
        text.setText('');
        continue;
      }
      const marker = vehicle.isPlayer ? '▶' : ' ';
      text.setText(
        `${marker}${String(start + i + 1).padStart(2, ' ')} #${String(vehicle.raceNumber).padEnd(2, ' ')} ${vehicle.driverName}`,
      );
      text.setColor(vehicle.isPlayer ? '#f0d048' : '#b8bec8');
    }
  }

  private drawStatus(player: Vehicle, timeMs: number): void {
    // — État des stands.
    switch (player.pitPhase) {
      case 'entering':
        this.statusText.setText(t('hud.pit.entering'));
        break;
      case 'toBox':
        this.statusText.setText(t('hud.pit.toBox', { n: player.pitBoxIndex + 1 }));
        break;
      case 'stopped':
        this.statusText.setText(t('hud.pit.stopped'));
        break;
      case 'exiting':
        this.statusText.setText(t('hud.pit.exiting'));
        break;
      default:
        this.statusText.setText(player.raceState === 'finished' ? t('hud.finished') : '');
    }

    // — Avertissements carburant, pneus et dégâts : la criticité prime.
    const fuelRatio = player.fuel / player.spec.fuelCapacity;
    const fuelOn = this.controller.fuelSystem.enabled;
    const tiresOn = this.controller.tireSystem.enabled;
    const damageOn = this.controller.damageSystem.enabled;
    const blinkOn = Math.floor(timeMs / 300) % 2 === 0;
    if (player.raceState === 'wrecked') {
      this.warningText.setText(t('hud.warning.wrecked'));
    } else if (player.raceState === 'fuelOut' || (fuelRatio === 0 && fuelOn)) {
      this.warningText.setText(t('hud.warning.fuelOut'));
    } else if (tiresOn && player.flatTire) {
      this.warningText.setText(blinkOn ? t('hud.warning.flatTire') : '');
    } else if (fuelOn && fuelRatio < 0.05) {
      this.warningText.setText(blinkOn ? t('hud.warning.criticalFuel') : '');
    } else if (damageOn && player.health < 20) {
      this.warningText.setText(blinkOn ? t('hud.warning.criticalDamage') : '');
    } else if (tiresOn && player.tires < 10) {
      this.warningText.setText(blinkOn ? t('hud.warning.criticalTires') : '');
    } else if (fuelOn && fuelRatio < 0.2) {
      this.warningText.setText(t('hud.warning.lowFuel'));
    } else if (damageOn && player.health < 40) {
      this.warningText.setText(t('hud.warning.lowDamage'));
    } else if (tiresOn && player.tires < 20) {
      this.warningText.setText(t('hud.warning.lowTires'));
    } else {
      this.warningText.setText('');
    }
  }
}
