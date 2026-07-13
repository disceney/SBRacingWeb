/** Niveau de consommation de carburant (§6.1). */
export type FuelLevel = 'off' | 'reduced' | 'normal' | 'high';

/** Réglages d'une course rapide (périmètre MVP du §6.1). */
export interface RaceSettings {
  /** Nombre total de voitures, joueur compris (2 à 20). */
  carCount: number;
  /** Nombre de tours (5, 10, 20, 30, 50 ou personnalisé). */
  laps: number;
  fuelLevel: FuelLevel;
  collisions: boolean;
  /** Indice de couleur du joueur dans CAR_COLORS. */
  playerColorIndex: number;
  /** Numéro de course du joueur (1 à 99). */
  playerNumber: number;
}

export const DEFAULT_RACE_SETTINGS: RaceSettings = {
  carCount: 10,
  laps: 20,
  fuelLevel: 'normal',
  collisions: true,
  playerColorIndex: 0,
  playerNumber: 7,
};

/** Statut final d'un concurrent. */
export type ResultStatus = 'finished' | 'fuelOut' | 'running';

/** Ligne de l'écran de résultats (§15). */
export interface RaceResultRow {
  position: number;
  driverName: string;
  raceNumber: number;
  isPlayer: boolean;
  lapsCompleted: number;
  totalTime: number | null;
  /** Écart au vainqueur (s), null pour le vainqueur et les non-classés. */
  gap: number | null;
  bestLap: number | null;
  pitStops: number;
  pitTime: number;
  status: ResultStatus;
}
