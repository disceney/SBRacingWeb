// Constantes globales du jeu : résolution logique, conversions d'unités et physique de référence.

/** Résolution logique interne (16:9), mise à l'échelle par Phaser. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Conversion vitesse : 1 mph = 1,45 unité monde par seconde (calibré pour un tour ≈ 21 s). */
export const UNITS_PER_MPH = 1.45;

export const mphToUnits = (mph: number): number => mph * UNITS_PER_MPH;
export const unitsToMph = (units: number): number => units / UNITS_PER_MPH;

/** Pas de simulation fixe (60 Hz). */
export const FIXED_STEP = 1 / 60;
/** Nombre maximal d'étapes de rattrapage par trame. */
export const MAX_CATCHUP_STEPS = 5;

/** Vitesses de référence du cahier des charges (§8.3). */
export const MAX_SPEED_MPH = 180;
export const PIT_SPEED_LIMIT_MPH = 55;
