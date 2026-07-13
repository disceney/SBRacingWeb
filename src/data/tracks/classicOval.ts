import type { TrackData, GridSlot, PitBox } from '../../track/trackTypes';

// « Classic Oval » : ovale de type stock-car conforme aux dimensions du §9.2.
// Monde 2400 × 1400, piste large de 220 unités, tour d'environ 4 490 unités.
// Le sens de course est antihoraire à l'écran : +x sur la ligne droite du bas.

const CENTER_X = 1200;
const CENTER_Y = 700;
const SPINE_HALF_LENGTH = 525;
const TURN_RADIUS = 380;
const TRACK_HALF_WIDTH = 110;

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
 * Emplacements de ravitaillement : dalles adossées aux garages, sur le
 * tablier situé au-dessus de la voie de circulation des stands.
 */
function buildPitBoxes(): PitBox[] {
  const boxes: PitBox[] = [];
  for (let i = 0; i < 20; i++) {
    boxes.push({ x: 900 + i * 38, y: 897 });
  }
  return boxes;
}

const LAP_LENGTH = 2 * (2 * SPINE_HALF_LENGTH) + 2 * Math.PI * TURN_RADIUS;

export const CLASSIC_OVAL: TrackData = {
  id: 'classic-oval',
  name: 'Classic Oval',
  worldWidth: 2400,
  worldHeight: 1400,
  spineHalfLength: SPINE_HALF_LENGTH,
  turnRadius: TURN_RADIUS,
  centerX: CENTER_X,
  centerY: CENTER_Y,
  trackHalfWidth: TRACK_HALF_WIDTH,
  kerbWidth: 10,
  outerWallDistance: TRACK_HALF_WIDTH + 22,
  startLineS: 0,
  startLineX: START_LINE_X,
  // Quatre points de contrôle : ligne + trois intermédiaires (§9.3).
  checkpoints: [
    { id: 0, s: 0 },
    { id: 1, s: LAP_LENGTH * 0.25 },
    { id: 2, s: LAP_LENGTH * 0.5 },
    { id: 3, s: LAP_LENGTH * 0.75 },
  ],
  gridSlots: buildGridSlots(),
  pitBoxes: buildPitBoxes(),
  // Voie des stands parallèle à la ligne droite principale, côté intérieur :
  // tablier des dalles d'arrêt (y 878-916) puis voie de circulation (y 916-955).
  pitLane: { x1: 700, y1: 878, x2: 1700, y2: 955 },
  pitWall: { x1: 860, x2: 1540, y: 962 },
  pitEntryZone: { x1: 700, x2: 860 },
  pitExitZone: { x1: 1540, x2: 1700 },
};
