import type {LineName} from "../track/trackTypes";

/** Profil d'un pilote IA (§11.3 / §19.3). Noms entièrement fictifs. */
export interface DriverProfile {
	id: string;
	displayName: string;
	/** Rythme pur [0, 1]. */
	skill: number;
	/** Propension à attaquer en dépassement [0, 1]. */
	aggression: number;
	/** Régularité : réduit les erreurs de pilotage [0, 1]. */
	consistency: number;
	/** Tolérance au risque de panne : marge de carburant conservée [0, 1]. */
	pitRisk: number;
	preferredLine: LineName;
	/** Propension à défendre sa ligne face à un rival proche derrière [0, 1]. */
	defense?: number;
}

/** Profil utilisé par l'autopilote du joueur : régulier, ni timide ni brutal, jamais fautif. */
export const AUTOPILOT_DRIVER: DriverProfile = {
	id: "autopilot",
	displayName: "Autopilote",
	skill: 0.8,
	aggression: 0.5,
	consistency: 1,
	pitRisk: 0.4,
	preferredLine: "middle",
	defense: 0.78,
};

/** Effectif de vingt pilotes : les dix-neuf adversaires ci-dessous courent tous. */
export const DRIVERS: DriverProfile[] = [
	{id: "driver-01", displayName: "B. Steele", skill: 0.97, aggression: 0.72, consistency: 0.94, pitRisk: 0.4, preferredLine: "inside", defense: 0.88},
	{id: "driver-02", displayName: "R. Vance", skill: 0.91, aggression: 0.82, consistency: 0.85, pitRisk: 0.62, preferredLine: "middle", defense: 0.86},
	{id: "driver-03", displayName: "J. Colton", skill: 0.88, aggression: 0.55, consistency: 0.9, pitRisk: 0.3, preferredLine: "inside", defense: 0.79},
	{id: "driver-04", displayName: "M. Harker", skill: 0.86, aggression: 0.75, consistency: 0.78, pitRisk: 0.55, preferredLine: "outside", defense: 0.8},
	{id: "driver-05", displayName: "T. Brandt", skill: 0.84, aggression: 0.6, consistency: 0.84, pitRisk: 0.45, preferredLine: "middle", defense: 0.77},
	{id: "driver-06", displayName: "L. Mercer", skill: 0.82, aggression: 0.68, consistency: 0.8, pitRisk: 0.5, preferredLine: "inside", defense: 0.77},
	{id: "driver-07", displayName: "R. Turner", skill: 0.8, aggression: 0.58, consistency: 0.8, pitRisk: 0.35, preferredLine: "middle", defense: 0.73},
	{id: "driver-08", displayName: "D. Calloway", skill: 0.78, aggression: 0.72, consistency: 0.74, pitRisk: 0.6, preferredLine: "outside", defense: 0.75},
	{id: "driver-09", displayName: "S. Whitmore", skill: 0.76, aggression: 0.5, consistency: 0.82, pitRisk: 0.4, preferredLine: "middle", defense: 0.7},
	{id: "driver-10", displayName: "K. Draper", skill: 0.74, aggression: 0.64, consistency: 0.7, pitRisk: 0.52, preferredLine: "inside", defense: 0.7},
	{id: "driver-11", displayName: "G. Falk", skill: 0.72, aggression: 0.56, consistency: 0.76, pitRisk: 0.48, preferredLine: "outside", defense: 0.69},
	{id: "driver-12", displayName: "P. Ridley", skill: 0.7, aggression: 0.46, consistency: 0.78, pitRisk: 0.36, preferredLine: "middle", defense: 0.66},
	{id: "driver-13", displayName: "C. Boone", skill: 0.68, aggression: 0.66, consistency: 0.66, pitRisk: 0.58, preferredLine: "inside", defense: 0.67},
	{id: "driver-14", displayName: "A. Sterling", skill: 0.66, aggression: 0.44, consistency: 0.74, pitRisk: 0.42, preferredLine: "outside", defense: 0.62},
	{id: "driver-15", displayName: "H. Granger", skill: 0.64, aggression: 0.52, consistency: 0.68, pitRisk: 0.5, preferredLine: "middle", defense: 0.62},
	{id: "driver-16", displayName: "W. Doyle", skill: 0.62, aggression: 0.48, consistency: 0.64, pitRisk: 0.44, preferredLine: "inside", defense: 0.59},
	{id: "driver-17", displayName: "N. Ashford", skill: 0.6, aggression: 0.4, consistency: 0.7, pitRisk: 0.38, preferredLine: "outside", defense: 0.58},
	{id: "driver-18", displayName: "E. Marlowe", skill: 0.58, aggression: 0.42, consistency: 0.62, pitRisk: 0.46, preferredLine: "middle", defense: 0.55},
	{id: "driver-19", displayName: "V. Crane", skill: 0.52, aggression: 0.33, consistency: 0.57, pitRisk: 0.34, preferredLine: "outside", defense: 0.48},
];
