import Phaser from "phaser";
import type {Controls} from "../vehicles/Vehicle";

/** Rayon des boutons virtuels et profondeur au-dessus de la barre HUD (§7.3). */
const BUTTON_RADIUS = 26;
const DEPTH = 110;
const COLOR_IDLE = 0x2a2e38;
const COLOR_BORDER = 0x585f6e;
const COLOR_ACTIVE = 0xf0d048;
const ALPHA_IDLE = 0.35;
const ALPHA_ACTIVE = 0.75;
const GLYPH_COLOR = "#e8e8e8";

interface TouchButtonSpec {
	x: number;
	y: number;
	glyph: string;
	fontSize: string;
}

/** Un bouton virtuel : cercle + glyphe, suit ses pointeurs actifs pour le multi-touch. */
class TouchButton {
	readonly container: Phaser.GameObjects.Container;
	/** Callback déclenché à chaque nouvelle pression (boutons pause / plein écran). */
	onPress: (() => void) | null = null;
	private readonly circle: Phaser.GameObjects.Arc;
	private readonly pointers = new Set<number>();

	constructor(scene: Phaser.Scene, spec: TouchButtonSpec) {
		this.circle = scene.add
			.circle(0, 0, BUTTON_RADIUS, COLOR_IDLE, ALPHA_IDLE)
			.setStrokeStyle(2, COLOR_BORDER, 1)
			.setInteractive();
		const label = scene.add
			.text(0, 0, spec.glyph, {fontFamily: "monospace", fontSize: spec.fontSize, color: GLYPH_COLOR})
			.setOrigin(0.5);
		this.container = scene.add
			.container(spec.x, spec.y, [this.circle, label])
			.setScrollFactor(0)
			.setDepth(DEPTH);

		this.circle.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			this.pointers.add(pointer.id);
			this.refresh();
			this.onPress?.();
		});
		const release = (pointer: Phaser.Input.Pointer): void => {
			this.pointers.delete(pointer.id);
			this.refresh();
		};
		this.circle.on("pointerup", release);
		this.circle.on("pointerupoutside", release);
	}

	/** Vrai tant qu'au moins un pointeur maintient le bouton (multi-touch). */
	get pressed(): boolean {
		return this.pointers.size > 0;
	}

	private refresh(): void {
		const color = this.pressed ? COLOR_ACTIVE : COLOR_IDLE;
		const alpha = this.pressed ? ALPHA_ACTIVE : ALPHA_IDLE;
		this.circle.setFillStyle(color, alpha);
	}

	destroy(): void {
		this.container.destroy();
	}
}

/**
 * Overlay de boutons virtuels (§7.3) : direction, accélérateur, frein, pause
 * et plein écran. Créé uniquement sur appareil tactile ; alimente
 * `PlayerController` via `state` et remonte `onPause` / `onFullscreen`.
 */
export class TouchControls {
	/** Vrai si l'appareil courant expose une entrée tactile. */
	static isTouchDevice(scene: Phaser.Scene): boolean {
		return scene.sys.game.device.input.touch;
	}

	onPause: (() => void) | null = null;
	onFullscreen: (() => void) | null = null;

	private readonly steerLeft: TouchButton;
	private readonly steerRight: TouchButton;
	private readonly brakeButton: TouchButton;
	private readonly throttleButton: TouchButton;
	private readonly pauseButton: TouchButton;
	private readonly fullscreenButton: TouchButton;

	constructor(scene: Phaser.Scene) {
		// Trois pointeurs additionnels : diriger, accélérer et freiner en même temps.
		scene.input.addPointer(3);

		this.steerLeft = new TouchButton(scene, {x: 60, y: 430, glyph: "◀", fontSize: "24px"});
		this.steerRight = new TouchButton(scene, {x: 150, y: 430, glyph: "▶", fontSize: "24px"});
		this.brakeButton = new TouchButton(scene, {x: 800, y: 430, glyph: "FREIN", fontSize: "10px"});
		this.throttleButton = new TouchButton(scene, {x: 890, y: 430, glyph: "ACCÉL", fontSize: "10px"});
		this.pauseButton = new TouchButton(scene, {x: 920, y: 30, glyph: "⏸", fontSize: "22px"});
		this.fullscreenButton = new TouchButton(scene, {x: 865, y: 30, glyph: "⛶", fontSize: "22px"});

		this.pauseButton.onPress = () => this.onPause?.();
		this.fullscreenButton.onPress = () => this.onFullscreen?.();

		scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
	}

	/** État courant agrégé des boutons de direction, frein et accélérateur. */
	get state(): Controls {
		return {
			throttle: this.throttleButton.pressed ? 1 : 0,
			brake: this.brakeButton.pressed ? 1 : 0,
			steer: (this.steerLeft.pressed ? -1 : 0) + (this.steerRight.pressed ? 1 : 0),
		};
	}

	private destroy(): void {
		this.steerLeft.destroy();
		this.steerRight.destroy();
		this.brakeButton.destroy();
		this.throttleButton.destroy();
		this.pauseButton.destroy();
		this.fullscreenButton.destroy();
	}
}
