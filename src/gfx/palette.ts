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
	{name: "Rouge", base: "#D82800", dark: "#901B00", light: "#FF6A3C"},
	{name: "Bleu", base: "#0048D8", dark: "#002F90", light: "#4C8CFF"},
	{name: "Jaune", base: "#F0C000", dark: "#A08000", light: "#FFE860"},
	{name: "Vert", base: "#00A020", dark: "#006414", light: "#50E070"},
	{name: "Orange", base: "#F07000", dark: "#A04A00", light: "#FFB050"},
	{name: "Violet", base: "#8020C0", dark: "#541480", light: "#B868F0"},
	{name: "Cyan", base: "#00A8B0", dark: "#006C72", light: "#58E0E8"},
	{name: "Rose", base: "#E858A0", dark: "#9C3A6A", light: "#FF9CC8"},
	{name: "Blanc", base: "#E8E8E8", dark: "#9A9A9A", light: "#FFFFFF"},
	{name: "Noir", base: "#303038", dark: "#181820", light: "#585864"},
	{name: "Marron", base: "#8A5024", dark: "#5A3416", light: "#C08048"},
	{name: "Turquoise", base: "#20C898", dark: "#148264", light: "#68F0C4"},
	{name: "Bordeaux", base: "#901838", dark: "#5C0F24", light: "#C85070"},
	{name: "Marine", base: "#203070", dark: "#141E48", light: "#4858A0"},
	{name: "Olive", base: "#788020", dark: "#4C5214", light: "#A8B050"},
	{name: "Corail", base: "#F85848", dark: "#A83A30", light: "#FF9488"},
	{name: "Lavande", base: "#9088E0", dark: "#5C5694", light: "#C0BAFF"},
	{name: "Or", base: "#C09828", dark: "#80661A", light: "#E8C860"},
	{name: "Argent", base: "#A8B0B8", dark: "#70767C", light: "#D8DEE4"},
	{name: "Lime", base: "#88D800", dark: "#5A9000", light: "#C0FF40"},
];

/** Couleurs du décor. */
export const DECOR = {
	grass: "#2F8F2F",
	grassDark: "#2A812A",
	asphalt: "#5A5A62",
	asphaltPit: "#50505A",
	kerbRed: "#D82800",
	kerbWhite: "#F0F0F0",
	wall: "#C8C8D0",
	wallShadow: "#8A8A94",
	lineWhite: "#E8E8E8",
	lineYellow: "#E8C800",
	standSteel: "#787888",
	standSeat: "#4A4A58",
	roof: "#B03028",
} as const;
