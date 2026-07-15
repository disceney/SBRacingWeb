import Phaser from "phaser";
import {GAME_WIDTH} from "../app/constants";
import {t} from "../data/translations";
import {MenuList} from "../ui/MenuList";

/** Menu principal (§15) : Course rapide et Options actifs, le reste à venir. */
export class MenuScene extends Phaser.Scene {
	private creditsText: Phaser.GameObjects.Text | null = null;

	constructor() {
		super("menu");
	}

	create(): void {
		this.add
			.text(GAME_WIDTH / 2, 90, t("app.title"), {
				fontFamily: "monospace",
				fontSize: "44px",
				color: "#f0d048",
			})
			.setOrigin(0.5);
		this.add
			.text(GAME_WIDTH / 2, 132, t("app.subtitle"), {
				fontFamily: "monospace",
				fontSize: "13px",
				color: "#b8bec8",
			})
			.setOrigin(0.5);

		new MenuList(this, 360, 210, [
			{label: () => t("menu.quickRace"), onActivate: () => this.scene.start("setup")},
			{label: () => t("menu.options"), onActivate: () => this.scene.start("options")},
			{label: () => t("menu.controls"), onActivate: () => this.scene.start("controls")},
			{label: () => t("menu.credits"), onActivate: () => this.toggleCredits()},
		]);

		this.add
			.text(GAME_WIDTH / 2, 500, t("menu.hint"), {
				fontFamily: "monospace",
				fontSize: "12px",
				color: "#6a707c",
			})
			.setOrigin(0.5);
	}

	private toggleCredits(): void {
		if (this.creditsText) {
			this.creditsText.destroy();
			this.creditsText = null;
			return;
		}
		this.creditsText = this.add
			.text(GAME_WIDTH / 2, 430, t("credits.body"), {
				fontFamily: "monospace",
				fontSize: "12px",
				color: "#b8bec8",
				align: "center",
			})
			.setOrigin(0.5);
	}
}
