import Phaser from "phaser";
import {audio} from "../audio/AudioManager";

/** Entrée d'un menu navigable au clavier, à la manette et au doigt. */
export interface MenuItem {
	/** Libellé courant (recalculé à chaque rafraîchissement). */
	label: () => string;
	/** Validation par Entrée, bouton A/Croix ou tap. */
	onActivate?: () => void;
	/** Modification par ←/→, croix/stick ou tap moitié gauche/droite (dir = ±1) ; shift indique un pas fin. */
	onChange?: (dir: -1 | 1, shift: boolean) => void;
	disabled?: boolean;
}

/** Zone morte du stick gauche pour la navigation dans les menus. */
const PAD_STICK_DEAD_ZONE = 0.5;
/** Délai avant la première répétition d'une direction maintenue à la manette (ms). */
const PAD_REPEAT_INITIAL_DELAY = 350;
/** Délai entre deux répétitions tant que la direction reste maintenue (ms). */
const PAD_REPEAT_DELAY = 160;
/** Index standard des boutons A/Croix et B/Rond sur un pad. */
const PAD_BUTTON_A = 0;
const PAD_BUTTON_B = 1;
/** Largeur de la zone tactile d'une entrée, indépendante de la largeur de son libellé. */
const HIT_AREA_WIDTH = 520;

/** État de répétition d'un axe directionnel (haut/bas ou gauche/droite) à la manette. */
interface AxisState {
	dir: -1 | 0 | 1;
	timer: number;
}

/**
 * Liste de menu rétro : navigation ↑/↓, modification ←/→, validation Entrée
 * (clavier) ; croix/stick, bouton A/Croix et bouton B/Rond (manette) ; tap
 * pour sélectionner/activer ou modifier (tactile/souris). L'élément
 * sélectionné est précédé d'un chevron et surligné.
 */
export class MenuList {
	private readonly scene: Phaser.Scene;
	private readonly items: MenuItem[];
	private readonly texts: Phaser.GameObjects.Text[];
	private readonly onBack?: () => void;
	private index = 0;
	private readonly keyHandler: (event: KeyboardEvent) => void;
	private readonly gamepadUpdateHandler: (time: number, delta: number) => void;
	private readonly padVertical: AxisState = {dir: 0, timer: 0};
	private readonly padHorizontal: AxisState = {dir: 0, timer: 0};
	// Initialisés à true : exige un relâchement observé avant d'armer le front montant (état
	// matériel partagé entre scènes, sinon un bouton maintenu depuis la scène précédente
	// déclenche aussitôt une action à l'entrée de la nouvelle scène).
	private padAWasDown = true;
	private padBWasDown = true;

	constructor(
		scene: Phaser.Scene,
		x: number,
		y: number,
		items: MenuItem[],
		lineHeight = 30,
		onBack?: () => void,
	) {
		this.scene = scene;
		this.items = items;
		this.onBack = onBack;
		this.texts = items.map((_, i) => {
			const text = scene.add.text(x, y + i * lineHeight, "", {
				fontFamily: "monospace",
				fontSize: "18px",
				color: "#e8e8e8",
			});
			text.setInteractive({
				hitArea: new Phaser.Geom.Rectangle(0, 0, HIT_AREA_WIDTH, lineHeight),
				hitAreaCallback: Phaser.Geom.Rectangle.Contains,
				useHandCursor: true,
			});
			text.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointer(i, pointer));
			return text;
		});
		// Premier élément activable sélectionné d'office.
		while (this.items[this.index]?.disabled && this.index < items.length - 1) this.index++;

		this.keyHandler = (event) => this.handleKey(event);
		scene.input.keyboard!.on("keydown", this.keyHandler);

		// Sondage manette par trame (croix/stick, boutons A/B) ; garde le plugin absent.
		this.gamepadUpdateHandler = (_time, delta) => this.pollGamepad(delta);
		scene.events.on(Phaser.Scenes.Events.UPDATE, this.gamepadUpdateHandler);

		scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			scene.input.keyboard?.off("keydown", this.keyHandler);
			scene.events.off(Phaser.Scenes.Events.UPDATE, this.gamepadUpdateHandler);
			this.texts.forEach((text) => text.off("pointerdown"));
		});
		this.refresh();
	}

	refresh(): void {
		this.items.forEach((item, i) => {
			const selected = i === this.index;
			const text = this.texts[i]!;
			text.setText(`${selected ? "▶ " : "  "}${item.label()}`);
			text.setColor(item.disabled ? "#6a707c" : selected ? "#f0d048" : "#e8e8e8");
		});
	}

	private handleKey(event: KeyboardEvent): void {
		switch (event.key) {
			case "ArrowUp":
				this.move(-1);
				break;
			case "ArrowDown":
				this.move(1);
				break;
			case "ArrowLeft":
				this.change(-1, event.shiftKey);
				break;
			case "ArrowRight":
				this.change(1, event.shiftKey);
				break;
			case "Enter":
				audio.unlock();
				this.items[this.index]?.onActivate?.();
				audio.playMenuBlip();
				break;
		}
	}

	/** Sondage manette par trame : croix/stick pour naviguer/modifier, A pour valider, B pour revenir. */
	private pollGamepad(delta: number): void {
		const pad = this.scene.input.gamepad?.gamepads[0];
		if (!pad?.connected) return;

		const dpadV: -1 | 0 | 1 = pad.up ? -1 : pad.down ? 1 : 0;
		const vDir: -1 | 0 | 1 = dpadV !== 0 ? dpadV : this.axisDir(pad.leftStick.y);
		this.stepAxis(vDir, this.padVertical, delta, (dir) => this.move(dir));

		const dpadH: -1 | 0 | 1 = pad.left ? -1 : pad.right ? 1 : 0;
		const hDir: -1 | 0 | 1 = dpadH !== 0 ? dpadH : this.axisDir(pad.leftStick.x);
		this.stepAxis(hDir, this.padHorizontal, delta, (dir) => this.change(dir, false));

		const aDown = pad.isButtonDown(PAD_BUTTON_A);
		if (aDown && !this.padAWasDown) {
			audio.unlock();
			this.items[this.index]?.onActivate?.();
			audio.playMenuBlip();
		}
		this.padAWasDown = aDown;

		const bDown = pad.isButtonDown(PAD_BUTTON_B);
		if (bDown && !this.padBWasDown) this.onBack?.();
		this.padBWasDown = bDown;
	}

	/** Direction d'un axe analogique au-delà de la zone morte, sinon neutre. */
	private axisDir(value: number): -1 | 0 | 1 {
		if (value <= -PAD_STICK_DEAD_ZONE) return -1;
		if (value >= PAD_STICK_DEAD_ZONE) return 1;
		return 0;
	}

	/** Déclenche `trigger` au front montant d'une direction puis en répétition tant qu'elle est maintenue. */
	private stepAxis(
		dir: -1 | 0 | 1,
		state: AxisState,
		delta: number,
		trigger: (dir: -1 | 1) => void,
	): void {
		if (dir === 0) {
			state.dir = 0;
			return;
		}
		if (dir !== state.dir) {
			// Front montant : déclenchement immédiat puis délai initial avant répétition.
			state.dir = dir;
			state.timer = PAD_REPEAT_INITIAL_DELAY;
			trigger(dir);
			return;
		}
		state.timer -= delta;
		if (state.timer <= 0) {
			state.timer = PAD_REPEAT_DELAY;
			trigger(dir);
		}
	}

	/** Tap sur une entrée : sélection puis activation, ou modification selon la moitié touchée. */
	private handlePointer(i: number, pointer: Phaser.Input.Pointer): void {
		const item = this.items[i];
		if (!item || item.disabled) return;

		if (item.onChange) {
			this.select(i);
			const text = this.texts[i]!;
			this.change(pointer.x < text.x + text.width / 2 ? -1 : 1, false);
		} else if (item.onActivate) {
			this.select(i);
			audio.unlock();
			item.onActivate();
			audio.playMenuBlip();
		}
	}

	private select(i: number): void {
		if (i !== this.index) {
			this.index = i;
			this.refresh();
		}
	}

	private move(dir: number): void {
		let next = this.index;
		for (let i = 0; i < this.items.length; i++) {
			next = (next + dir + this.items.length) % this.items.length;
			if (!this.items[next]?.disabled) break;
		}
		if (next !== this.index) {
			this.index = next;
			audio.unlock();
			audio.playMenuBlip();
			this.refresh();
		}
	}

	private change(dir: -1 | 1, shift: boolean): void {
		const item = this.items[this.index];
		if (item?.onChange && !item.disabled) {
			audio.unlock();
			item.onChange(dir, shift);
			audio.playMenuBlip();
			this.refresh();
		}
	}
}
