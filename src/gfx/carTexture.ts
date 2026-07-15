import Phaser from "phaser";
import {CAR_COLORS} from "./palette";

/** Longueur du sprite voiture en pixels (vue du dessus, orienté vers +x). */
export const CAR_SPRITE_WIDTH = 44;
export const CAR_SPRITE_HEIGHT = 24;

/**
 * Génère (au besoin) la texture pixel-art d'une voiture pour une livrée et un
 * numéro donnés, et renvoie la clé de texture.
 */
export function ensureCarTexture(scene: Phaser.Scene, colorIndex: number, raceNumber: number): string {
	const key = `car-${colorIndex}-${raceNumber}`;
	if (scene.textures.exists(key)) return key;

	const color = CAR_COLORS[colorIndex % CAR_COLORS.length]!;
	// Variante de silhouette déterministe (aileron, bandes, toit) : ne modifie ni
	// l'encombrement ni la lisibilité du numéro.
	const variant = (colorIndex + raceNumber) % 3;
	const canvas = scene.textures.createCanvas(key, CAR_SPRITE_WIDTH, CAR_SPRITE_HEIGHT);
	if (!canvas) return key;
	const ctx = canvas.getContext();
	ctx.imageSmoothingEnabled = false;

	// Roues (dépassent légèrement du corps), moyeu clair au centre de chaque jante.
	ctx.fillStyle = "#101014";
	for (const wx of [5, 31]) {
		ctx.fillRect(wx, 1, 8, 4);
		ctx.fillRect(wx, 19, 8, 4);
	}
	ctx.fillStyle = "#585860";
	for (const wx of [5, 31]) {
		ctx.fillRect(wx + 3, 2, 2, 2);
		ctx.fillRect(wx + 3, 20, 2, 2);
	}

	// Carrosserie : capot vers +x, contour sombre.
	ctx.fillStyle = color.dark;
	ctx.fillRect(2, 3, 40, 18);
	ctx.fillStyle = color.base;
	ctx.fillRect(3, 4, 38, 16);
	// Reflet supérieur et ombre inférieure pour le volume.
	ctx.fillStyle = color.light;
	ctx.fillRect(4, 4, 36, 3);
	ctx.fillStyle = color.dark;
	ctx.fillRect(4, 17, 36, 3);

	// Liserés de livrée : bande de capot (A) ou double filet latéral (B).
	if (variant === 0) {
		ctx.fillStyle = color.light;
		ctx.fillRect(35, 4, 3, 16);
	} else if (variant === 1) {
		ctx.fillStyle = color.light;
		ctx.fillRect(4, 9, 36, 1);
		ctx.fillStyle = color.dark;
		ctx.fillRect(4, 11, 36, 1);
	}

	// Pare-brise avant et lunette arrière, avec appui-tête et reflet d'habitacle.
	ctx.fillStyle = "#1a2a44";
	ctx.fillRect(27, 5, 4, 14);
	ctx.fillRect(12, 5, 3, 14);
	ctx.fillStyle = "#0e1626";
	ctx.fillRect(29, 9, 2, 4);
	ctx.fillStyle = "#4a6088";
	ctx.fillRect(30, 6, 1, 2);

	// Toit : zone centrale portant le numéro, contrastée pour la variante C.
	ctx.fillStyle = variant === 2 ? color.dark : color.base;
	ctx.fillRect(15, 5, 12, 14);
	// Liseré sombre puis disque blanc pour renforcer le contraste du numéro.
	ctx.fillStyle = "#101014";
	ctx.beginPath();
	ctx.arc(21, 12, 7, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#f0f0f0";
	ctx.beginPath();
	ctx.arc(21, 12, 6, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#101014";
	ctx.font = "bold 9px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(String(raceNumber), 21, 13);

	// Aileron arrière : large (A), étroit (B) ou double becquet (C) selon la variante.
	ctx.fillStyle = "#101014";
	if (variant === 0) {
		ctx.fillRect(2, 3, 3, 18);
	} else if (variant === 1) {
		ctx.fillRect(2, 6, 1, 12);
	} else {
		ctx.fillRect(2, 4, 2, 5);
		ctx.fillRect(2, 15, 2, 5);
	}

	// Calandre avant.
	ctx.fillStyle = "#d8d8e0";
	ctx.fillRect(41, 6, 2, 12);

	// Phares avant et feux arrière.
	ctx.fillStyle = "#fff4c8";
	ctx.fillRect(39, 5, 2, 2);
	ctx.fillRect(39, 17, 2, 2);
	ctx.fillStyle = "#e02818";
	ctx.fillRect(2, 5, 1, 2);
	ctx.fillRect(2, 17, 1, 2);

	// Échappement.
	ctx.fillStyle = "#6a6a72";
	ctx.fillRect(3, 19, 2, 1);

	canvas.refresh();
	return key;
}

/** Texture d'ombre elliptique commune à toutes les voitures. */
export function ensureShadowTexture(scene: Phaser.Scene): string {
	const key = "car-shadow";
	if (scene.textures.exists(key)) return key;
	const canvas = scene.textures.createCanvas(key, CAR_SPRITE_WIDTH, CAR_SPRITE_HEIGHT);
	if (!canvas) return key;
	const ctx = canvas.getContext();
	ctx.fillStyle = "rgba(0,0,0,0.35)";
	ctx.beginPath();
	ctx.ellipse(22, 12, 21, 10, 0, 0, Math.PI * 2);
	ctx.fill();
	canvas.refresh();
	return key;
}

/** Textures des équipiers de stand et du pneu porté, visibles pendant un arrêt. */
export function ensurePitCrewTextures(scene: Phaser.Scene): void {
	if (!scene.textures.exists("p-crew")) {
		const canvas = scene.textures.createCanvas("p-crew", 7, 10);
		if (canvas) {
			const ctx = canvas.getContext();
			ctx.imageSmoothingEnabled = false;
			// Combinaison blanche, casque rouge, jambes sombres.
			ctx.fillStyle = "#e8e8e8";
			ctx.fillRect(1, 3, 5, 4);
			ctx.fillStyle = "#d82800";
			ctx.fillRect(1, 0, 5, 3);
			ctx.fillStyle = "#303038";
			ctx.fillRect(1, 7, 2, 3);
			ctx.fillRect(4, 7, 2, 3);
			canvas.refresh();
		}
	}
	if (!scene.textures.exists("p-tire")) {
		const canvas = scene.textures.createCanvas("p-tire", 9, 9);
		if (canvas) {
			const ctx = canvas.getContext();
			ctx.fillStyle = "#141418";
			ctx.beginPath();
			ctx.arc(4.5, 4.5, 4.5, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#3a3a44";
			ctx.beginPath();
			ctx.arc(4.5, 4.5, 2, 0, Math.PI * 2);
			ctx.fill();
			canvas.refresh();
		}
	}
}

/** Petites textures de particules : fumée, poussière, étincelle. */
export function ensureParticleTextures(scene: Phaser.Scene): void {
	const defs: Array<{ key: string; color: string; size: number }> = [
		{key: "p-smoke", color: "rgba(220,220,220,0.8)", size: 7},
		{key: "p-smoke-dark", color: "rgba(50,48,52,0.85)", size: 7},
		{key: "p-dust", color: "rgba(150,120,70,0.8)", size: 6},
		{key: "p-spark", color: "rgba(255,220,80,0.95)", size: 3},
	];
	for (const def of defs) {
		if (scene.textures.exists(def.key)) continue;
		const canvas = scene.textures.createCanvas(def.key, def.size, def.size);
		if (!canvas) continue;
		const ctx = canvas.getContext();
		ctx.fillStyle = def.color;
		ctx.beginPath();
		ctx.arc(def.size / 2, def.size / 2, def.size / 2, 0, Math.PI * 2);
		ctx.fill();
		canvas.refresh();
	}
}
