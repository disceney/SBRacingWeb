import Phaser from 'phaser';
import type { Controls } from './Vehicle';

/**
 * Lecture du clavier (§7.1) : flèches pour la direction, flèche haut ou Maj
 * pour accélérer, flèche bas ou Ctrl pour freiner. La remise en piste (R),
 * la pause (Échap) et le son (M) sont gérés par la scène de course.
 */
export class PlayerController {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly shift: Phaser.Input.Keyboard.Key;
  private readonly ctrl: Phaser.Input.Keyboard.Key;
  /** Verrouillage des commandes avant le départ (§13.1). */
  locked = true;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.shift = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.ctrl = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
  }

  read(out: Controls): void {
    if (this.locked) {
      out.throttle = 0;
      out.brake = 0;
      out.steer = 0;
      return;
    }
    out.throttle = this.cursors.up.isDown || this.shift.isDown ? 1 : 0;
    out.brake = this.cursors.down.isDown || this.ctrl.isDown ? 1 : 0;
    out.steer = (this.cursors.left.isDown ? -1 : 0) + (this.cursors.right.isDown ? 1 : 0);
  }
}
