import type {GridSlot, PitBox, Point, TrackData} from "../../track/trackTypes";

// « Classic Oval » : ovale de type stock-car conforme aux dimensions du §9.2.
// Monde 2400 × 1400, piste large de 220 unités, tour d'environ 4 490 unités.
// Le sens de course est antihoraire à l'écran : +x sur la ligne droite du bas.

const CENTER_X = 1200;
const CENTER_Y = 700;
const SPINE_HALF_LENGTH = 525;
const TURN_RADIUS = 380;
const TRACK_HALF_WIDTH = 110;
/** Distance du mur extérieur à la ligne centrale (piste + bordure + marge). */
const OUTER_WALL_DISTANCE = TRACK_HALF_WIDTH + 22;

const START_LINE_X = 1180;
const BOTTOM_Y = CENTER_Y + TURN_RADIUS;

/** Grille à deux files derrière la ligne de départ (espacement 65 × 55, §9.2). */
function buildGridSlots(): GridSlot[] {
	const slots: GridSlot[] = [];
	for (let i = 0; i < 20; i++) {
		const row = Math.floor(i / 2);
		const file = i % 2;
		slots.push({
			x: START_LINE_X - 50 - row * 65,
			y: BOTTOM_Y - 27.5 + file * 55,
			heading: 0,
		});
	}
	return slots;
}

/**
 * Emplacements de ravitaillement : vingt dalles attitrées (une par
 * concurrent, vingt voitures au maximum), adossées aux garages sur le
 * tablier situé au-dessus de la voie de circulation des stands.
 */
function buildPitBoxes(): PitBox[] {
	const boxes: PitBox[] = [];
	for (let i = 0; i < 20; i++) {
		boxes.push({x: 880 + i * 46, y: 897});
	}
	return boxes;
}

/**
 * Pylônes de projecteurs répartis autour du circuit (cycle jour/nuit) :
 * quatre aux coins extérieurs des virages (hors piste, près des murs),
 * quatre le long des lignes droites côté tribunes et un au-dessus de la
 * voie des stands.
 */
function buildFloodlights(): Point[] {
	const spineX1 = CENTER_X - SPINE_HALF_LENGTH;
	const spineX2 = CENTER_X + SPINE_HALF_LENGTH;
	// Rayon des coins des virages : au-delà du mur extérieur, avec une marge.
	const cornerRadius = TURN_RADIUS + OUTER_WALL_DISTANCE + 40;
	const diag = cornerRadius * Math.SQRT1_2;
	// Ordonnée des lignes droites, juste devant les tribunes (au-delà du mur).
	const straightY = CENTER_Y - TURN_RADIUS - OUTER_WALL_DISTANCE - 25;
	return [
		// Coins extérieurs des deux virages.
		{x: spineX2 + diag, y: CENTER_Y - diag},
		{x: spineX2 + diag, y: CENTER_Y + diag},
		{x: spineX1 - diag, y: CENTER_Y - diag},
		{x: spineX1 - diag, y: CENTER_Y + diag},
		// Lignes droites, côté tribunes (haut puis bas).
		{x: spineX1 + 225, y: straightY},
		{x: spineX2 - 225, y: straightY},
		{x: spineX1 + 225, y: 2 * CENTER_Y - straightY},
		{x: spineX2 - 225, y: 2 * CENTER_Y - straightY},
		// Au-dessus de la zone des stands.
		{x: CENTER_X, y: 770},
	];
}

const LAP_LENGTH = 2 * (2 * SPINE_HALF_LENGTH) + 2 * Math.PI * TURN_RADIUS;

export const CLASSIC_OVAL: TrackData = {
	id: "classic-oval",
	name: "Classic Oval",
	worldWidth: 2400,
	worldHeight: 1400,
	spineHalfLength: SPINE_HALF_LENGTH,
	turnRadius: TURN_RADIUS,
	centerX: CENTER_X,
	centerY: CENTER_Y,
	trackHalfWidth: TRACK_HALF_WIDTH,
	kerbWidth: 10,
	outerWallDistance: OUTER_WALL_DISTANCE,
	startLineS: 0,
	startLineX: START_LINE_X,
	// Quatre points de contrôle : ligne + trois intermédiaires (§9.3).
	checkpoints: [
		{id: 0, s: 0},
		{id: 1, s: LAP_LENGTH * 0.25},
		{id: 2, s: LAP_LENGTH * 0.5},
		{id: 3, s: LAP_LENGTH * 0.75},
	],
	gridSlots: buildGridSlots(),
	pitBoxes: buildPitBoxes(),
	floodlights: buildFloodlights(),
	// Voie des stands parallèle à la ligne droite principale, côté intérieur :
	// tablier des dalles d'arrêt (y 878-916) puis voie de circulation (y 916-955).
	// La rangée de vingt dalles (880 à 1754) impose l'élargissement du mur et
	// de la zone de sortie ; l'entrée reste inchangée en amont des dalles.
	pitLane: {x1: 700, y1: 878, x2: 1930, y2: 955},
	pitWall: {x1: 860, x2: 1770, y: 962},
	pitEntryZone: {x1: 700, x2: 860},
	pitExitZone: {x1: 1770, x2: 1930},
};
