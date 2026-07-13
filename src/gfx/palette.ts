// Palette vive façon shareware Windows fin des années 1990.

export interface CarColor {
  /** Nom affiché (clé de traduction non nécessaire : nom propre de couleur). */
  name: string;
  base: string;
  dark: string;
  light: string;
}

/** Vingt livrées originales bien distinctes. */
export const CAR_COLORS: CarColor[] = [
  { name: 'Rouge', base: '#d82800', dark: '#901b00', light: '#ff6a3c' },
  { name: 'Bleu', base: '#0048d8', dark: '#002f90', light: '#4c8cff' },
  { name: 'Jaune', base: '#f0c000', dark: '#a08000', light: '#ffe860' },
  { name: 'Vert', base: '#00a020', dark: '#006414', light: '#50e070' },
  { name: 'Orange', base: '#f07000', dark: '#a04a00', light: '#ffb050' },
  { name: 'Violet', base: '#8020c0', dark: '#541480', light: '#b868f0' },
  { name: 'Cyan', base: '#00a8b0', dark: '#006c72', light: '#58e0e8' },
  { name: 'Rose', base: '#e858a0', dark: '#9c3a6a', light: '#ff9cc8' },
  { name: 'Blanc', base: '#e8e8e8', dark: '#9a9a9a', light: '#ffffff' },
  { name: 'Noir', base: '#303038', dark: '#181820', light: '#585864' },
  { name: 'Marron', base: '#8a5024', dark: '#5a3416', light: '#c08048' },
  { name: 'Turquoise', base: '#20c898', dark: '#148264', light: '#68f0c4' },
  { name: 'Bordeaux', base: '#901838', dark: '#5c0f24', light: '#c85070' },
  { name: 'Marine', base: '#203070', dark: '#141e48', light: '#4858a0' },
  { name: 'Olive', base: '#788020', dark: '#4c5214', light: '#a8b050' },
  { name: 'Corail', base: '#f85848', dark: '#a83a30', light: '#ff9488' },
  { name: 'Lavande', base: '#9088e0', dark: '#5c5694', light: '#c0baff' },
  { name: 'Or', base: '#c09828', dark: '#80661a', light: '#e8c860' },
  { name: 'Argent', base: '#a8b0b8', dark: '#70767c', light: '#d8dee4' },
  { name: 'Lime', base: '#88d800', dark: '#5a9000', light: '#c0ff40' },
];

/** Couleurs du décor. */
export const DECOR = {
  grass: '#2f8f2f',
  grassDark: '#2a812a',
  asphalt: '#5a5a62',
  asphaltPit: '#50505a',
  kerbRed: '#d82800',
  kerbWhite: '#f0f0f0',
  wall: '#c8c8d0',
  wallShadow: '#8a8a94',
  lineWhite: '#e8e8e8',
  lineYellow: '#e8c800',
  standSteel: '#787888',
  standSeat: '#4a4a58',
  roof: '#b03028',
} as const;
