import {DEFAULT_RACE_SETTINGS, type RaceSettings} from "../race/raceTypes";

/** Réglages persistés localement (§20) : volumes et dernière configuration. */
export interface StoredSettings {
	masterVolume: number;
	muted: boolean;
	lastRace: RaceSettings;
}

const STORAGE_KEY = "sb-racing-web:settings";

const DEFAULTS: StoredSettings = {
	masterVolume: 0.8,
	muted: false,
	lastRace: DEFAULT_RACE_SETTINGS,
};

/** Charge les réglages, en revenant aux valeurs par défaut si absents ou corrompus. */
export function loadSettings(): StoredSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return structuredClone(DEFAULTS);
		const parsed = JSON.parse(raw) as Partial<StoredSettings>;
		return {
			masterVolume: clamp01(numberOr(parsed.masterVolume, DEFAULTS.masterVolume)),
			muted: parsed.muted === true,
			lastRace: sanitizeRace(parsed.lastRace),
		};
	} catch {
		return structuredClone(DEFAULTS);
	}
}

export function saveSettings(settings: StoredSettings): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// Stockage indisponible (navigation privée…) : réglages non persistés.
	}
}

function sanitizeRace(race: Partial<RaceSettings> | undefined): RaceSettings {
	const d = DEFAULT_RACE_SETTINGS;
	if (!race) return {...d};
	const level = (value: unknown, fallback: RaceSettings["fuelLevel"]): RaceSettings["fuelLevel"] =>
		["off", "reduced", "normal", "high"].includes(value as string)
			? (value as RaceSettings["fuelLevel"])
			: fallback;
	return {
		carCount: clampInt(numberOr(race.carCount, d.carCount), 2, 15),
		laps: clampInt(numberOr(race.laps, d.laps), 1, 200),
		fuelLevel: level(race.fuelLevel, d.fuelLevel),
		tireLevel: level(race.tireLevel, d.tireLevel),
		damageLevel: level(race.damageLevel, d.damageLevel),
		autopilot: race.autopilot === true,
		collisions: race.collisions !== false,
		playerColorIndex: clampInt(numberOr(race.playerColorIndex, d.playerColorIndex), 0, 19),
		playerNumber: clampInt(numberOr(race.playerNumber, d.playerNumber), 1, 99),
	};
}

function numberOr(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

function clampInt(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, Math.round(value)));
}
