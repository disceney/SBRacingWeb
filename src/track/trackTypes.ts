// Types partagés de la modélisation du circuit.

export interface Point {
	x: number;
	y: number;
}

/** Surfaces praticables du circuit (§8.4 du cahier des charges). */
export enum Surface {
	Asphalt = "asphalt",
	PitLane = "pit",
	Kerb = "kerb",
	Grass = "grass",
}

/** Propriétés physiques d'une surface : adhérence, résistance et plafond de vitesse relatifs. */
export interface SurfaceProps {
	grip: number;
	drag: number;
	maxSpeedFactor: number;
}

export const SURFACE_PROPS: Record<Surface, SurfaceProps> = {
	[Surface.Asphalt]: {grip: 1, drag: 0, maxSpeedFactor: 1},
	[Surface.PitLane]: {grip: 1, drag: 0, maxSpeedFactor: 1},
	[Surface.Kerb]: {grip: 0.75, drag: 0.35, maxSpeedFactor: 0.7},
	[Surface.Grass]: {grip: 0.45, drag: 1.4, maxSpeedFactor: 0.4},
};

/** Point de contrôle : abscisse curviligne sur la ligne centrale (§9.3). */
export interface CheckpointData {
	id: number;
	s: number;
}

/** Emplacement de départ sur la grille. */
export interface GridSlot {
	x: number;
	y: number;
	heading: number;
}

/** Emplacement d'arrêt dans la voie des stands. */
export interface PitBox {
	x: number;
	y: number;
}

export type LineName = "inside" | "middle" | "outside";

/** Données complètes d'un circuit (format §19.1, généré par code). */
export interface TrackData {
	id: string;
	name: string;
	worldWidth: number;
	worldHeight: number;
	/** Demi-longueur du segment interne du stade (ligne centrale). */
	spineHalfLength: number;
	/** Rayon des virages sur la ligne centrale. */
	turnRadius: number;
	/** Centre du monde. */
	centerX: number;
	centerY: number;
	/** Demi-largeur de la piste. */
	trackHalfWidth: number;
	/** Largeur de la bordure au-delà de la piste. */
	kerbWidth: number;
	/** Distance du mur extérieur à la ligne centrale. */
	outerWallDistance: number;
	/** Abscisse curviligne de la ligne de départ (toujours 0). */
	startLineS: number;
	/** Position X de la ligne de départ sur la ligne droite principale. */
	startLineX: number;
	checkpoints: CheckpointData[];
	gridSlots: GridSlot[];
	pitBoxes: PitBox[];
	/** Positions des pylônes de projecteurs du circuit (cycle jour/nuit). */
	floodlights: Point[];
	/** Rectangle de la voie des stands. */
	pitLane: { x1: number; y1: number; x2: number; y2: number };
	/** Segment du mur des stands. */
	pitWall: { x1: number; x2: number; y: number };
	/** Bornes X des zones d'entrée et de sortie des stands. */
	pitEntryZone: { x1: number; x2: number };
	pitExitZone: { x1: number; x2: number };
}
