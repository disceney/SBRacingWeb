import Phaser from 'phaser';

/** Écran de chargement : génère les ressources procédurales puis lance le menu. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    this.add
      .text(480, 270, 'SB RACING WEB', { fontFamily: 'monospace', fontSize: '32px' })
      .setOrigin(0.5);
  }
}
