import Phaser from "phaser";
import {GAME_WIDTH} from "../app/constants";
import {t} from "../data/translations";
import {formatGap, formatLapTime, formatTotalTime} from "../race/TimingSystem";
import type {RaceResultRow, RaceSettings} from "../race/raceTypes";
import {MenuList} from "../ui/MenuList";

interface ResultsData {
	results: RaceResultRow[];
	raceBest: { time: number; driverName: string } | null;
	settings: RaceSettings;
}

/** Écran de résultats (§15) : tableau complet, meilleur tour, relance. */
export class ResultsScene extends Phaser.Scene {
	private payload!: ResultsData;

	constructor() {
		super("results");
	}

	init(data: ResultsData): void {
		this.payload = data;
	}

	create(): void {
		this.add
			.text(GAME_WIDTH / 2, 34, t("results.title"), {
				fontFamily: "monospace",
				fontSize: "26px",
				color: "#f0d048",
			})
			.setOrigin(0.5);

		// — Tableau monospace aligné par colonnes.
		const header = [
			pad(t("results.position"), 4),
			pad(t("results.driver"), 13),
			pad(t("results.number"), 4),
			pad(t("results.laps"), 6),
			pad(t("results.time"), 10),
			pad(t("results.gap"), 10),
			pad(t("results.bestLap"), 10),
			pad(t("results.stops"), 7),
			pad(t("results.pitTime"), 11),
			t("results.status"),
		].join(" ");
		this.add.text(40, 70, header, {
			fontFamily: "monospace",
			fontSize: "12px",
			color: "#68c8f0",
		});

		const shown = this.payload.results.slice(0, 20);
		const winnerLaps = shown[0]?.lapsCompleted ?? 0;
		shown.forEach((row, i) => {
			// Attardé : écart exprimé en tours plutôt qu'en temps.
			const lapsDown = winnerLaps - row.lapsCompleted;
			const gapText =
				row.position === 1 ? "—" : row.gap !== null ? formatGap(row.gap) : lapsDown > 0 ? `+${lapsDown} t.` : "—";
			const line = [
				pad(String(row.position), 4),
				pad(row.driverName, 13),
				pad(`#${row.raceNumber}`, 4),
				pad(String(row.lapsCompleted), 6),
				pad(formatTotalTime(row.totalTime), 10),
				pad(gapText, 10),
				pad(formatLapTime(row.bestLap), 10),
				pad(String(row.pitStops), 7),
				pad(row.pitTime > 0 ? row.pitTime.toFixed(1) + " s" : "—", 11),
				t(`results.status.${row.status}`),
			].join(" ");
			this.add.text(40, 92 + i * 17, line, {
				fontFamily: "monospace",
				fontSize: "12px",
				color: row.isPlayer ? "#f0d048" : "#e8e8e8",
			});
		});

		// — Meilleur tour en course mis en évidence (§13.4).
		if (this.payload.raceBest) {
			this.add
				.text(
					GAME_WIDTH / 2,
					104 + shown.length * 17,
					t("results.raceBest", {
						time: formatLapTime(this.payload.raceBest.time),
						driver: this.payload.raceBest.driverName,
					}),
					{fontFamily: "monospace", fontSize: "13px", color: "#b06cf0"},
				)
				.setOrigin(0.5);
		}

		new MenuList(
			this,
			340,
			Math.min(470, 130 + shown.length * 17),
			[
				{
					label: () => t("results.restart"),
					onActivate: () => this.scene.start("race", {settings: this.payload.settings}),
				},
				{label: () => t("results.changeSettings"), onActivate: () => this.scene.start("setup")},
				{label: () => t("results.menu"), onActivate: () => this.scene.start("menu")},
			],
			24,
			() => this.scene.start("menu"),
		);
	}
}

function pad(text: string, width: number): string {
	return text.length > width ? text.slice(0, width - 1) + "…" : text.padEnd(width, " ");
}
