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
	const canvas = scene.textures.createCanvas(key, CAR_SPRITE_WIDTH, CAR_SPRITE_HEIGHT);
	if (!canvas) return key;
	const ctx = canvas.getContext();
	ctx.imageSmoothingEnabled = false;

	// Roues (dépassent légèrement du corps).
	ctx.fillStyle = "#101014";
	for (const wx of [5, 31]) {
		ctx.fillRect(wx, 1, 8, 4);
		ctx.fillRect(wx, 19, 8, 4);
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

	// Pare-brise avant et lunette arrière.
	ctx.fillStyle = "#1a2a44";
	ctx.fillRect(27, 5, 4, 14);
	ctx.fillRect(12, 5, 3, 14);

	// Toit : zone centrale portant le numéro.
	ctx.fillStyle = color.base;
	ctx.fillRect(15, 5, 12, 14);
	ctx.fillStyle = "#f0f0f0";
	ctx.beginPath();
	ctx.arc(21, 12, 6, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = "#101014";
	ctx.font = "bold 9px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(String(raceNumber), 21, 13);

	// Aileron arrière et calandre avant.
	ctx.fillStyle = "#101014";
	ctx.fillRect(2, 4, 2, 16);
	ctx.fillStyle = "#d8d8e0";
	ctx.fillRect(41, 6, 2, 12);

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
