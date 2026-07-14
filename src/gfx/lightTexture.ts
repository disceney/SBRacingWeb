import Phaser from "phaser";

// Textures procédurales des halos lumineux du cycle jour/nuit : projecteurs
// du circuit, phares des voitures et feux de freinage. Les dégradés doivent
// rester doux (contrairement aux sprites pixel-art nets) : le lissage du
// canvas n'est volontairement pas désactivé ici.

/** Halo radial des projecteurs du circuit. */
const GLOW_SIZE = 96;
/** Faisceau de phare, orienté vers +x (convention des sprites voiture). */
const BEAM_WIDTH = 120;
const BEAM_HEIGHT = 60;
/** Petit halo de feu de freinage. */
const BRAKE_SIZE = 24;

/**
 * Génère (au besoin) les trois textures de halos lumineux et les met en
 * cache par clé Phaser, à l'idiome de `carTexture.ts`.
 */
export function ensureLightTextures(scene: Phaser.Scene): void {
	ensureGlowTexture(scene);
	ensureBeamTexture(scene);
	ensureBrakeTexture(scene);
}

/** "light-glow" : halo radial blanc-chaud pour les projecteurs du circuit. */
function ensureGlowTexture(scene: Phaser.Scene): void {
	const key = "light-glow";
	if (scene.textures.exists(key)) return;
	const canvas = scene.textures.createCanvas(key, GLOW_SIZE, GLOW_SIZE);
	if (!canvas) return;
	const ctx = canvas.getContext();
	const c = GLOW_SIZE / 2;
	const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
	gradient.addColorStop(0, "rgba(255,244,214,0.95)");
	gradient.addColorStop(0.4, "rgba(255,224,160,0.5)");
	gradient.addColorStop(1, "rgba(255,224,160,0)");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, GLOW_SIZE, GLOW_SIZE);
	canvas.refresh();
}

/** "light-beam" : faisceau allongé, étroit et vif près du phare, large et estompé au loin. */
function ensureBeamTexture(scene: Phaser.Scene): void {
	const key = "light-beam";
	if (scene.textures.exists(key)) return;
	const canvas = scene.textures.createCanvas(key, BEAM_WIDTH, BEAM_HEIGHT);
	if (!canvas) return;
	const ctx = canvas.getContext();
	const gradient = ctx.createLinearGradient(0, 0, BEAM_WIDTH, 0);
	gradient.addColorStop(0, "rgba(255,248,224,0.75)");
	gradient.addColorStop(0.5, "rgba(255,240,190,0.32)");
	gradient.addColorStop(1, "rgba(255,240,190,0)");
	ctx.fillStyle = gradient;
	ctx.beginPath();
	ctx.moveTo(0, BEAM_HEIGHT * 0.4);
	ctx.lineTo(BEAM_WIDTH, 0);
	ctx.lineTo(BEAM_WIDTH, BEAM_HEIGHT);
	ctx.lineTo(0, BEAM_HEIGHT * 0.6);
	ctx.closePath();
	ctx.fill();
	canvas.refresh();
}

/** "light-brake" : petit halo rouge pour les feux de freinage. */
function ensureBrakeTexture(scene: Phaser.Scene): void {
	const key = "light-brake";
	if (scene.textures.exists(key)) return;
	const canvas = scene.textures.createCanvas(key, BRAKE_SIZE, BRAKE_SIZE);
	if (!canvas) return;
	const ctx = canvas.getContext();
	const c = BRAKE_SIZE / 2;
	const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
	gradient.addColorStop(0, "rgba(255,60,40,0.95)");
	gradient.addColorStop(0.5, "rgba(255,40,30,0.5)");
	gradient.addColorStop(1, "rgba(255,40,30,0)");
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, BRAKE_SIZE, BRAKE_SIZE);
	canvas.refresh();
}
