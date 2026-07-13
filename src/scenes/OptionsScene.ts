import Phaser from 'phaser';
import { GAME_WIDTH } from '../app/constants';
import { audio } from '../audio/AudioManager';
import { t } from '../data/translations';
import { loadSettings, saveSettings, type StoredSettings } from '../persistence/storage';
import { MenuList } from '../ui/MenuList';

/** Écran des options : volume général et coupure du son, persistés (§20). */
export class OptionsScene extends Phaser.Scene {
  private settings!: StoredSettings;

  constructor() {
    super('options');
  }

  create(): void {
    this.settings = loadSettings();

    this.add
      .text(GAME_WIDTH / 2, 90, t('options.title'), {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#f0d048',
      })
      .setOrigin(0.5);

    new MenuList(this, 320, 200, [
      {
        label: () => `${t('options.volume')} : ${Math.round(this.settings.masterVolume * 100)} %`,
        onChange: (dir) => {
          this.settings.masterVolume = Math.max(
            0,
            Math.min(1, this.settings.masterVolume + dir * 0.1),
          );
          this.apply();
        },
      },
      {
        label: () =>
          `${t('options.mute')} : ${this.settings.muted ? t('options.mute.on') : t('options.mute.off')}`,
        onChange: () => {
          this.settings.muted = !this.settings.muted;
          this.apply();
        },
      },
      { label: () => '', disabled: true },
      { label: () => t('common.back'), onActivate: () => this.scene.start('menu') },
    ]);
  }

  private apply(): void {
    audio.setVolume(this.settings.masterVolume);
    audio.setMuted(this.settings.muted);
    saveSettings(this.settings);
  }
}
