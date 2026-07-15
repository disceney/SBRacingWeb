import Phaser from "phaser";
import type {Track} from "../track/Track";
import {DECOR} from "./palette";

/** Générateur pseudo-aléatoire déterministe (LCG) pour les détails du décor. */
function makeRng(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 0xffffffff;
	};
}

/**
 * Dessine l'intégralité du monde (2 400 × 1 400) dans une texture canvas
 * unique : pelouse, tribunes, murs, piste, bordures, ligne d'arrivée, voie
 * des stands et décor d'infield. Renvoie la clé de texture.
 */
export function ensureTrackTexture(scene: Phaser.Scene, track: Track): string {
	const key = "track";
	if (scene.textures.exists(key)) return key;

	const d = track.data;
	const canvas = scene.textures.createCanvas(key, d.worldWidth, d.worldHeight);
	if (!canvas) return key;
	const ctx = canvas.getContext();
	ctx.imageSmoothingEnabled = false;
	const rng = makeRng(0x5b5b5b);

	const spineX1 = d.centerX - d.spineHalfLength;
	const spineX2 = d.centerX + d.spineHalfLength;
	const spineY = d.centerY;
	const r = d.turnRadius;

	/** Trace le chemin du stade à un rayon donné autour du spine. */
	const stadiumPath = (radius: number): void => {
		ctx.beginPath();
		ctx.moveTo(spineX1, spineY + radius);
		ctx.lineTo(spineX2, spineY + radius);
		ctx.arc(spineX2, spineY, radius, Math.PI / 2, -Math.PI / 2, true);
		ctx.lineTo(spineX1, spineY - radius);
		ctx.arc(spineX1, spineY, radius, -Math.PI / 2, -Math.PI * 1.5, true);
		ctx.closePath();
	};

	// — Pelouse avec bandes de tonte horizontales.
	ctx.fillStyle = DECOR.grass;
	ctx.fillRect(0, 0, d.worldWidth, d.worldHeight);
	ctx.fillStyle = DECOR.grassDark;
	for (let y = 0; y < d.worldHeight; y += 80) {
		ctx.fillRect(0, y, d.worldWidth, 40);
	}

	// — Tribunes extérieures (haut et bas) avec public.
	drawGrandstand(ctx, rng, 660, 60, 1080, 118);
	drawGrandstand(ctx, rng, 660, 1222, 1080, 118);

	// — Bordures : base blanche puis damier rouge (visibles seulement aux bords).
	ctx.lineWidth = (d.trackHalfWidth + d.kerbWidth) * 2;
	ctx.strokeStyle = DECOR.kerbWhite;
	stadiumPath(r);
	ctx.stroke();
	ctx.setLineDash([26, 26]);
	ctx.strokeStyle = DECOR.kerbRed;
	stadiumPath(r);
	ctx.stroke();
	ctx.setLineDash([]);
	// Ombre portée d'un pixel de part et d'autre de la bordure (double rangée : jonction
	// asphalte/kerb et jonction kerb/pelouse), pour un léger relief.
	ctx.lineWidth = 2;
	ctx.strokeStyle = DECOR.kerbShadow;
	stadiumPath(r - d.trackHalfWidth);
	ctx.stroke();
	stadiumPath(r + d.trackHalfWidth);
	ctx.stroke();
	stadiumPath(r - (d.trackHalfWidth + d.kerbWidth));
	ctx.stroke();
	stadiumPath(r + (d.trackHalfWidth + d.kerbWidth));
	ctx.stroke();

	// — Asphalte de la piste par-dessus.
	ctx.lineWidth = d.trackHalfWidth * 2;
	ctx.strokeStyle = DECOR.asphalt;
	stadiumPath(r);
	ctx.stroke();

	// — Joints d'asphalte : traits transversaux fins régulièrement espacés.
	drawAsphaltJoints(ctx, track);

	// — Trace de gomme suivant la trajectoire optimale réelle, plus marquée en virage.
	drawRubberTrace(ctx, rng, track);

	// — Lignes de voies en pointillés, avec quelques tirets usés plus pâles.
	ctx.lineWidth = 3;
	for (const offset of [-37, 37]) {
		drawWornDashes(ctx, rng, track, offset);
	}

	// — Mur extérieur avec panneaux publicitaires fictifs.
	ctx.lineWidth = 10;
	ctx.strokeStyle = DECOR.wallShadow;
	stadiumPath(r + d.outerWallDistance + 5);
	ctx.stroke();
	ctx.lineWidth = 8;
	ctx.strokeStyle = DECOR.wall;
	stadiumPath(r + d.outerWallDistance);
	ctx.stroke();
	drawBillboards(ctx, spineX1, spineX2, spineY - r - d.outerWallDistance - 26, true);
	drawBillboards(ctx, spineX1, spineX2, spineY + r + d.outerWallDistance + 8, false);

	// — Ligne de départ/arrivée en damier.
	const innerEdgeY = spineY + r - d.trackHalfWidth;
	const outerEdgeY = spineY + r + d.trackHalfWidth;
	for (let row = 0; row < Math.ceil((outerEdgeY - innerEdgeY) / 11); row++) {
		for (let col = 0; col < 2; col++) {
			ctx.fillStyle = (row + col) % 2 === 0 ? "#f0f0f0" : "#101014";
			ctx.fillRect(d.startLineX - 11 + col * 11, innerEdgeY + row * 11, 11, 11);
		}
	}

	// — Voie des stands : accès, chaussée, tablier des dalles, marquages, mur.
	const apronBottom = d.pitLane.y1 + 38;
	const laneLineY = d.pitLane.y2 - 20;
	ctx.fillStyle = DECOR.asphaltPit;
	ctx.fillRect(d.pitEntryZone.x1, d.pitLane.y1, d.pitEntryZone.x2 - d.pitEntryZone.x1, innerEdgeY - d.pitLane.y1);
	ctx.fillRect(d.pitExitZone.x1, d.pitLane.y1, d.pitExitZone.x2 - d.pitExitZone.x1, innerEdgeY - d.pitLane.y1);
	ctx.fillRect(d.pitLane.x1, d.pitLane.y1, d.pitLane.x2 - d.pitLane.x1, d.pitLane.y2 - d.pitLane.y1);
	// Tablier en béton devant les garages, où sont peintes les dalles d'arrêt.
	const firstBox = d.pitBoxes[0]!;
	const lastBox = d.pitBoxes[d.pitBoxes.length - 1]!;
	ctx.fillStyle = "#63636d";
	ctx.fillRect(firstBox.x - 24, d.pitLane.y1, lastBox.x - firstBox.x + 48, apronBottom - d.pitLane.y1);
	// Séparation tablier / voie de circulation.
	ctx.fillStyle = DECOR.lineWhite;
	ctx.fillRect(firstBox.x - 24, apronBottom, lastBox.x - firstBox.x + 48, 2);
	// Ligne médiane de circulation et limite de vitesse.
	ctx.setLineDash([12, 14]);
	ctx.strokeStyle = DECOR.lineYellow;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(d.pitLane.x1 + 30, laneLineY);
	ctx.lineTo(d.pitLane.x2 - 30, laneLineY);
	ctx.stroke();
	ctx.setLineDash([]);
	ctx.fillStyle = DECOR.lineWhite;
	ctx.font = "bold 14px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("55", d.pitLane.x1 + 80, d.pitLane.y2 - 8);
	ctx.fillText("55", d.pitLane.x2 - 80, d.pitLane.y2 - 8);
	// Dalles d'arrêt agrandies : sol clair, contour jaune, gros numéro peint
	// et matériel (pneus, bidon) posé dans les coins de la dalle.
	d.pitBoxes.forEach((box, i) => {
		ctx.fillStyle = "#787882";
		ctx.fillRect(box.x - 21, d.pitLane.y1 + 2, 42, 34);
		ctx.strokeStyle = DECOR.lineYellow;
		ctx.lineWidth = 2;
		ctx.strokeRect(box.x - 21, d.pitLane.y1 + 2, 42, 34);
		ctx.fillStyle = DECOR.lineYellow;
		ctx.font = "bold 14px monospace";
		ctx.fillText(String(i + 1), box.x, d.pitLane.y1 + 28);
		// Pile de pneus dans le coin supérieur droit.
		ctx.fillStyle = "#141418";
		ctx.beginPath();
		ctx.arc(box.x + 14, d.pitLane.y1 + 8, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(box.x + 14, d.pitLane.y1 + 15, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#3a3a44";
		ctx.beginPath();
		ctx.arc(box.x + 14, d.pitLane.y1 + 8, 1.5, 0, Math.PI * 2);
		ctx.fill();
		// Bidon de carburant dans le coin supérieur gauche.
		ctx.fillStyle = "#c81818";
		ctx.fillRect(box.x - 18, d.pitLane.y1 + 6, 6, 8);
		ctx.fillStyle = "#f0f0f0";
		ctx.fillRect(box.x - 16, d.pitLane.y1 + 4, 3, 2);
	});
	// Damier de la ligne au travers de la voie de circulation uniquement.
	for (let row = 0; row < Math.ceil((d.pitLane.y2 - apronBottom) / 11); row++) {
		for (let col = 0; col < 2; col++) {
			ctx.fillStyle = (row + col) % 2 === 0 ? "#f0f0f0" : "#101014";
			const rowY = apronBottom + 2 + row * 11;
			ctx.fillRect(d.startLineX - 11 + col * 11, rowY, 11, Math.min(11, d.pitLane.y2 - rowY));
		}
	}
	// Mur des stands.
	ctx.fillStyle = DECOR.wallShadow;
	ctx.fillRect(d.pitWall.x1, d.pitWall.y - 4, d.pitWall.x2 - d.pitWall.x1, 10);
	ctx.fillStyle = DECOR.wall;
	ctx.fillRect(d.pitWall.x1, d.pitWall.y - 4, d.pitWall.x2 - d.pitWall.x1, 6);

	// — Bâtiment des stands : garages alignés sur les dalles.
	drawPitBuilding(ctx, firstBox.x - 24, 818, lastBox.x - firstBox.x + 48, 58, d.pitBoxes.map((b) => b.x));

	// — Décor d'infield : camions, camping-cars, véhicules de service, arbres.
	drawInfield(ctx, rng, d.centerX, d.centerY);

	// — Pylônes de projecteurs (cycle jour/nuit), visibles de jour comme de nuit.
	for (const floodlight of d.floodlights) {
		drawFloodlight(ctx, floodlight.x, floodlight.y);
	}

	canvas.refresh();
	return key;
}

/** Point de la ligne centrale à l'abscisse s, décalé latéralement (positif = extérieur du stade). */
function offsetPoint(track: Track, s: number, offset: number): {x: number; y: number; tx: number; ty: number} {
	const c = track.centerlineAt(s);
	return {x: c.x + c.ty * -offset, y: c.y + c.tx * offset, tx: c.tx, ty: c.ty};
}

/** Joints d'asphalte : traits transversaux fins, régulièrement espacés sur tout le tour. */
function drawAsphaltJoints(ctx: CanvasRenderingContext2D, track: Track): void {
	const halfWidth = track.data.trackHalfWidth;
	ctx.lineWidth = 1;
	ctx.strokeStyle = DECOR.asphaltJoint;
	ctx.globalAlpha = 0.35;
	for (let s = 0; s < track.lapLength; s += 130) {
		const inner = offsetPoint(track, s, -halfWidth);
		const outer = offsetPoint(track, s, halfWidth);
		ctx.beginPath();
		ctx.moveTo(inner.x, inner.y);
		ctx.lineTo(outer.x, outer.y);
		ctx.stroke();
	}
	ctx.globalAlpha = 1;
}

/**
 * Trace de gomme suivant la vraie trajectoire optimale (ligne centrale décalée
 * par optimalOffsetAt), plus sombre dans les virages, complétée de courtes
 * stries de freinage semées à l'approche de chaque virage.
 */
function drawRubberTrace(ctx: CanvasRenderingContext2D, rng: () => number, track: Track): void {
	const step = 20;
	ctx.lineCap = "round";
	for (let s = 0; s < track.lapLength; s += step) {
		const sEnd = Math.min(s + step, track.lapLength);
		const p1 = offsetPoint(track, s, track.optimalOffsetAt(s));
		const p2 = offsetPoint(track, sEnd, track.optimalOffsetAt(sEnd));
		const inTurn = track.curvatureAt(s + step / 2) > 0;
		ctx.lineWidth = inTurn ? 42 : 30;
		ctx.strokeStyle = DECOR.rubber;
		ctx.globalAlpha = inTurn ? 0.34 : 0.16;
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
	}
	ctx.lineCap = "butt";

	// Stries de freinage courtes à l'approche de chaque virage (entrée large → corde).
	const straightLen = 2 * track.data.spineHalfLength;
	const arcLen = Math.PI * track.data.turnRadius;
	for (const turnStart of [straightLen, 2 * straightLen + arcLen]) {
		for (let i = 0; i < 6; i++) {
			const s = turnStart - rng() * 90;
			const offset = 60 - rng() * 80;
			const base = offsetPoint(track, s, offset);
			const len = 10 + rng() * 14;
			ctx.strokeStyle = "#101012";
			ctx.globalAlpha = 0.2 + rng() * 0.25;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(base.x, base.y);
			ctx.lineTo(base.x - base.tx * len, base.y - base.ty * len);
			ctx.stroke();
		}
	}
	ctx.globalAlpha = 1;
}

/** Tirets de voie, avec quelques segments usés (plus pâles) semés via rng. */
function drawWornDashes(ctx: CanvasRenderingContext2D, rng: () => number, track: Track, offset: number): void {
	const dashLen = 18;
	const gapLen = 22;
	ctx.strokeStyle = DECOR.lineWhite;
	let s = 0;
	while (s < track.lapLength) {
		const sEnd = Math.min(s + dashLen, track.lapLength);
		const p1 = offsetPoint(track, s, offset);
		const p2 = offsetPoint(track, sEnd, offset);
		ctx.globalAlpha = rng() < 0.22 ? 0.22 : 0.55;
		ctx.beginPath();
		ctx.moveTo(p1.x, p1.y);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
		s += dashLen + gapLen;
	}
	ctx.globalAlpha = 1;
}

/** Tribune : structure, rangées de sièges et public en pixels colorés. */
function drawGrandstand(
	ctx: CanvasRenderingContext2D,
	rng: () => number,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	ctx.fillStyle = DECOR.standSteel;
	ctx.fillRect(x, y, width, height);
	ctx.fillStyle = DECOR.roof;
	ctx.fillRect(x - 8, y - 8, width + 16, 10);
	const crowdColors = [
		"#e8e0d0",
		"#d82800",
		"#0048d8",
		"#f0c000",
		"#e858a0",
		"#101014",
		"#00a020",
		"#8020c0",
		"#f0f0f0",
	];
	for (let row = 0; row < Math.floor(height / 12) - 1; row++) {
		const rowY = y + 10 + row * 12;
		ctx.fillStyle = DECOR.standSeat;
		ctx.fillRect(x + 4, rowY, width - 8, 8);
		// Public : points colorés, plus dense et plus varié qu'une simple rangée clairsemée.
		for (let px = x + 6; px < x + width - 6; px += 5) {
			if (rng() < 0.82) {
				ctx.fillStyle = crowdColors[Math.floor(rng() * crowdColors.length)]!;
				ctx.fillRect(px, rowY + 2, 3, 4);
			}
		}
	}
}

/** Panneaux publicitaires fictifs le long des lignes droites. */
function drawBillboards(
	ctx: CanvasRenderingContext2D,
	x1: number,
	x2: number,
	y: number,
	top: boolean,
): void {
	const ads: Array<[string, string, string]> = [
		["SB RACING", "#d82800", "#ffffff"],
		["TURBO COLA", "#0048d8", "#ffe860"],
		["PIXEL OIL", "#101014", "#f0c000"],
		["WEB GP 98", "#00a020", "#ffffff"],
		["NEON TIRES", "#e858a0", "#101014"],
		["RETRO FUEL", "#20c898", "#101014"],
	];
	ctx.font = "bold 12px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	let x = x1 + 60;
	let i = 0;
	while (x + 130 < x2 - 40) {
		const ad = ads[i % ads.length]!;
		ctx.fillStyle = ad[1];
		ctx.fillRect(x, y, 130, 18);
		ctx.fillStyle = ad[2];
		ctx.fillText(ad[0], x + 65, y + 10);
		x += 170;
		i++;
	}
	void top;
}

/** Bâtiment des garages : une porte alignée sur chaque dalle d'arrêt. */
function drawPitBuilding(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	doorCenters: number[],
): void {
	ctx.fillStyle = "#9a9aa4";
	ctx.fillRect(x, y, width, height);
	ctx.fillStyle = DECOR.roof;
	ctx.fillRect(x - 6, y - 8, width + 12, 12);
	for (const doorX of doorCenters) {
		ctx.fillStyle = "#3a3a44";
		ctx.fillRect(doorX - 15, y + height - 32, 30, 30);
		// Linteau clair au-dessus de chaque porte.
		ctx.fillStyle = "#c4c4cc";
		ctx.fillRect(doorX - 15, y + height - 36, 30, 3);
	}
	ctx.fillStyle = "#e8e8e8";
	ctx.font = "bold 14px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("STANDS", x + width / 2, y + 13);
}

/** Pylône de projecteur : mât gris surmonté d'une tête à quatre lampes claires. */
function drawFloodlight(ctx: CanvasRenderingContext2D, x: number, y: number): void {
	ctx.fillStyle = DECOR.wallShadow;
	ctx.fillRect(x - 3, y, 6, 18);
	ctx.fillRect(x - 10, y - 6, 20, 6);
	const lampColors = [DECOR.kerbWhite, DECOR.lineWhite, DECOR.lineWhite, DECOR.kerbWhite];
	for (let i = 0; i < 4; i++) {
		ctx.fillStyle = lampColors[i]!;
		ctx.fillRect(x - 9 + i * 5, y - 5, 3, 3);
	}
}

/** Décor central : camions, camping-cars, véhicules de service et arbres. */
function drawInfield(
	ctx: CanvasRenderingContext2D,
	rng: () => number,
	cx: number,
	cy: number,
): void {
	// Route de service grise traversant l'infield.
	ctx.fillStyle = "#6a6a72";
	ctx.fillRect(cx - 350, cy + 60, 700, 24);

	// Rangée de camping-cars.
	for (let i = 0; i < 8; i++) {
		const x = cx - 340 + i * 90 + rng() * 18;
		const y = cy - 160 + rng() * 30;
		ctx.fillStyle = "#e8e4d8";
		ctx.fillRect(x, y, 44, 18);
		ctx.fillStyle = ["#d82800", "#0048d8", "#00a020", "#f07000"][i % 4]!;
		ctx.fillRect(x, y + 6, 44, 4);
		ctx.fillStyle = "#101014";
		ctx.fillRect(x + 6, y + 18, 7, 3);
		ctx.fillRect(x + 30, y + 18, 7, 3);
	}

	// Camions des équipes.
	for (let i = 0; i < 4; i++) {
		const x = cx - 260 + i * 140;
		const y = cy + 120;
		ctx.fillStyle = "#d8d8e0";
		ctx.fillRect(x, y, 60, 20);
		ctx.fillStyle = ["#d82800", "#0048d8", "#f0c000", "#8020c0"][i]!;
		ctx.fillRect(x, y, 60, 6);
		ctx.fillStyle = "#48485a";
		ctx.fillRect(x + 60, y + 4, 14, 16);
		ctx.fillStyle = "#101014";
		ctx.fillRect(x + 8, y + 20, 8, 3);
		ctx.fillRect(x + 44, y + 20, 8, 3);
		ctx.fillRect(x + 62, y + 20, 8, 3);
	}

	// Véhicules de service : ambulance et dépanneuse.
	ctx.fillStyle = "#f0f0f0";
	ctx.fillRect(cx + 240, cy - 40, 34, 16);
	ctx.fillStyle = "#d82800";
	ctx.fillRect(cx + 253, cy - 36, 8, 8);
	ctx.fillStyle = "#f0c000";
	ctx.fillRect(cx - 300, cy - 40, 30, 14);
	ctx.fillStyle = "#48485a";
	ctx.fillRect(cx - 274, cy - 48, 4, 12);

	// Bosquet d'arbres.
	for (let i = 0; i < 12; i++) {
		const x = cx - 420 + rng() * 120;
		const y = cy - 60 + rng() * 140;
		ctx.fillStyle = "#1e6a1e";
		ctx.beginPath();
		ctx.arc(x, y, 8 + rng() * 6, 0, Math.PI * 2);
		ctx.fill();
	}

	// Tentes d'exposants, à l'écart de la route de service.
	const tentColors: Array<[string, string]> = [
		["#e8e8e8", "#d82800"],
		["#e8e8e8", "#0048d8"],
		["#e8e8e8", "#f0c000"],
	];
	for (let i = 0; i < 3; i++) {
		const x = cx - 90 + i * 55 + rng() * 8;
		const y = cy - 200 + rng() * 10;
		const [wall, roof] = tentColors[i]!;
		drawTent(ctx, x, y, 34, 26, wall, roof);
	}

	// Second bosquet, arbres plus sombres, côté opposé.
	for (let i = 0; i < 8; i++) {
		const x = cx + 260 + rng() * 120;
		const y = cy - 40 + rng() * 140;
		ctx.fillStyle = DECOR.treeDark;
		ctx.beginPath();
		ctx.arc(x, y, 7 + rng() * 5, 0, Math.PI * 2);
		ctx.fill();
	}
}

/** Tente d'exposant : base claire et toit triangulaire coloré. */
function drawTent(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	wall: string,
	roof: string,
): void {
	ctx.fillStyle = wall;
	ctx.fillRect(x, y + height / 2, width, height / 2);
	ctx.fillStyle = roof;
	ctx.beginPath();
	ctx.moveTo(x, y + height / 2);
	ctx.lineTo(x + width / 2, y);
	ctx.lineTo(x + width, y + height / 2);
	ctx.closePath();
	ctx.fill();
}
