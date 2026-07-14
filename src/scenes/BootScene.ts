import Phaser from "phaser";
import {GAME_HEIGHT, GAME_WIDTH} from "../app/constants";
import {audio} from "../audio/AudioManager";
import {CLASSIC_OVAL} from "../data/tracks/classicOval";
import {t} from "../data/translations";
import {ensureParticleTextures, ensureShadowTexture} from "../gfx/carTexture";
import {ensureTrackTexture} from "../gfx/trackTexture";
import {loadSettings} from "../persistence/storage";
import {Track} from "../track/Track";

/**
 * Écran de chargement : génère toutes les ressources procédurales (circuit,
 * ombres, particules), applique les réglages audio persistés puis ouvre le
 * menu. Le premier geste utilisateur déverrouille le contexte audio.
 */
export class BootScene extends Phaser.Scene {
	constructor() {
		super("boot");
	}

	create(): void {
		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, t("app.title"), {
				fontFamily: "monospace",
				fontSize: "40px",
				color: "#f0d048",
			})
			.setOrigin(0.5);
		this.add
			.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 14, "Chargement…", {
				fontFamily: "monospace",
				fontSize: "14px",
				color: "#b8bec8",
			})
			.setOrigin(0.5);

		const settings = loadSettings();
		audio.setVolume(settings.masterVolume);
		audio.setMuted(settings.muted);

		// Déverrouillage audio au premier geste (contrainte des navigateurs).
		this.input.keyboard!.once("keydown", () => audio.unlock());
		this.input.once("pointerdown", () => audio.unlock());

		// Génération différée d'un tick pour laisser l'écran s'afficher.
		this.time.delayedCall(30, () => {
			const track = new Track(CLASSIC_OVAL);
			ensureTrackTexture(this, track);
			ensureShadowTexture(this);
			ensureParticleTextures(this);
			this.scene.start("menu");
		});
	}
}
