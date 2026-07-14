import Phaser from "phaser";
import type {Controls} from "./Vehicle";

/** Zone morte du stick gauche de la manette (§7.2). */
const STICK_DEAD_ZONE = 0.15;
/** Index standard des gâchettes analogiques (RT/R2 et LT/L2) sur un pad. */
const BUTTON_R2 = 7;
const BUTTON_L2 = 6;

/**
 * Lecture des commandes du joueur (§7.1, §7.2) : clavier (flèches, Maj/Ctrl),
 * première manette connectée (stick/croix, gâchettes) et, le cas échéant,
 * une source tactile injectée par la scène. Les trois sources sont fusionnées
 * par maximum (accélérateur, frein) et par somme bornée (direction). La
 * remise en piste (R), la pause (Échap) et le son (M) sont gérés par la
 * scène de course.
 */
export class PlayerController {
	/** Verrouillage des commandes avant le départ (§13.1). */
	locked = true;
	private readonly scene: Phaser.Scene;
	private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
	private readonly shift: Phaser.Input.Keyboard.Key;
	private readonly ctrl: Phaser.Input.Keyboard.Key;
	private touchSource: Controls | null = null;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		const keyboard = scene.input.keyboard!;
		this.cursors = keyboard.createCursorKeys();
		this.shift = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
		this.ctrl = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
	}

	/** Injecte (ou retire) la source de commandes tactiles lue par `read()`. */
	setTouchSource(source: Controls | null): void {
		this.touchSource = source;
	}

	/** Première manette connectée, exposée pour la pause et la vibration côté scène. */
	get gamepad(): Phaser.Input.Gamepad.Gamepad | null {
		return this.scene.input.gamepad?.gamepads[0] ?? null;
	}

	read(out: Controls): void {
		if (this.locked) {
			out.throttle = 0;
			out.brake = 0;
			out.steer = 0;
			return;
		}

		const keyThrottle = this.cursors.up.isDown || this.shift.isDown ? 1 : 0;
		const keyBrake = this.cursors.down.isDown || this.ctrl.isDown ? 1 : 0;
		const keySteer = (this.cursors.left.isDown ? -1 : 0) + (this.cursors.right.isDown ? 1 : 0);

		const [padThrottle, padBrake, padSteer] = this.readGamepad();

		const touch = this.touchSource;
		out.throttle = Math.max(keyThrottle, padThrottle, touch?.throttle ?? 0);
		out.brake = Math.max(keyBrake, padBrake, touch?.brake ?? 0);
		out.steer = Math.max(-1, Math.min(1, keySteer + padSteer + (touch?.steer ?? 0)));
	}

	/** Direction, accélérateur et frein lus sur la première manette connectée. */
	private readGamepad(): [throttle: number, brake: number, steer: number] {
		const pad = this.gamepad;
		if (!pad?.connected) return [0, 0, 0];

		const throttle = Math.max(pad.R2, pad.isButtonDown(BUTTON_R2) ? 1 : 0);
		const brake = Math.max(pad.L2, pad.isButtonDown(BUTTON_L2) ? 1 : 0);

		const stickX = Math.abs(pad.leftStick.x) >= STICK_DEAD_ZONE ? pad.leftStick.x : 0;
		const dpadSteer = (pad.left ? -1 : 0) + (pad.right ? 1 : 0);
		const steer = dpadSteer !== 0 ? dpadSteer : stickX;

		return [throttle, brake, steer];
	}
}
