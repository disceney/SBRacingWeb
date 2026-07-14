import Phaser from "phaser";
import {GAME_WIDTH} from "../app/constants";
import {t, type TranslationKey} from "../data/translations";
import {MenuList} from "../ui/MenuList";

interface ControlRow {
	action: TranslationKey;
	command: TranslationKey;
}

interface ControlColumn {
	title: TranslationKey;
	x: number;
	rows: ControlRow[];
}

// — Trois colonnes clavier / manette / tactile, dans l'esprit de l'écran HELP de 1998.
const COLUMNS: ControlColumn[] = [
	{
		title: "controls.keyboard",
		x: 80,
		rows: [
			{action: "controls.action.steer", command: "controls.keyboard.steer"},
			{action: "controls.action.accelerate", command: "controls.keyboard.accelerate"},
			{action: "controls.action.brake", command: "controls.keyboard.brake"},
			{action: "controls.action.pause", command: "controls.keyboard.pause"},
			{action: "controls.action.pitReset", command: "controls.keyboard.pitReset"},
			{action: "controls.action.autopilot", command: "controls.keyboard.autopilot"},
			{action: "controls.action.mute", command: "controls.keyboard.mute"},
			{action: "controls.action.quit", command: "controls.keyboard.quit"},
			{action: "controls.action.fullscreen", command: "controls.keyboard.fullscreen"},
		],
	},
	{
		title: "controls.gamepad",
		x: 400,
		rows: [
			{action: "controls.action.steer", command: "controls.gamepad.steer"},
			{action: "controls.action.accelerate", command: "controls.gamepad.accelerate"},
			{action: "controls.action.brake", command: "controls.gamepad.brake"},
			{action: "controls.action.pause", command: "controls.gamepad.pause"},
			{action: "controls.action.confirm", command: "controls.gamepad.confirm"},
			{action: "controls.action.cancel", command: "controls.gamepad.cancel"},
		],
	},
	{
		title: "controls.touch",
		x: 690,
		rows: [
			{action: "controls.action.steer", command: "controls.touch.steer"},
			{action: "controls.action.accelerate", command: "controls.touch.accelerate"},
			{action: "controls.action.brake", command: "controls.touch.brake"},
			{action: "controls.action.pause", command: "controls.touch.pause"},
			{action: "controls.action.fullscreen", command: "controls.touch.fullscreen"},
		],
	},
];

const SECTION_TITLE_Y = 110;
const ROWS_START_Y = 140;
const LINE_HEIGHT = 22;

/** Écran des commandes : rappel clavier / manette / tactile, façon écran HELP du jeu original de 1998. */
export class ControlsScene extends Phaser.Scene {
	constructor() {
		super("controls");
	}

	create(): void {
		this.add
			.text(GAME_WIDTH / 2, 60, t("controls.title"), {
				fontFamily: "monospace",
				fontSize: "26px",
				color: "#f0d048",
			})
			.setOrigin(0.5);

		COLUMNS.forEach((column) => this.drawColumn(column));

		new MenuList(
			this,
			430,
			410,
			[{label: () => t("common.back"), onActivate: () => this.scene.start("menu")}],
			30,
			() => this.scene.start("menu"),
		);
	}

	private drawColumn(column: ControlColumn): void {
		this.add.text(column.x, SECTION_TITLE_Y, t(column.title), {
			fontFamily: "monospace",
			fontSize: "14px",
			color: "#f0d048",
		});

		column.rows.forEach((row, i) => {
			const y = ROWS_START_Y + i * LINE_HEIGHT;
			// Deux objets texte pour obtenir deux couleurs sur une même ligne (action, puis commande).
			const actionText = this.add.text(column.x, y, `${t(row.action)} — `, {
				fontFamily: "monospace",
				fontSize: "12px",
				color: "#b8bec8",
			});
			this.add.text(column.x + actionText.width, y, t(row.command), {
				fontFamily: "monospace",
				fontSize: "12px",
				color: "#e8e8e8",
			});
		});
	}
}
