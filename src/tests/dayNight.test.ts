import {describe, expect, it} from "vitest";
import {DayNightSystem} from "../race/DayNightSystem";

const system = new DayNightSystem();

describe("cycle jour/nuit", () => {
	it("phases correctes aux bornes de progression du meneur", () => {
		expect(system.computeFraction(0).phase).toBe("day");
		expect(system.computeFraction(0.3).phase).toBe("dusk");
		expect(system.computeFraction(0.5).phase).toBe("night");
		expect(system.computeFraction(0.9).phase).toBe("dawn");
		expect(system.computeFraction(1).phase).toBe("dawn");
	});

	it("obscurité nulle en plein jour et maximale en pleine nuit", () => {
		expect(system.computeFraction(0).darkness).toBe(0);
		expect(system.computeFraction(0.1).darkness).toBe(0);
		expect(system.computeFraction(0.4).darkness).toBe(1);
		expect(system.computeFraction(0.6).darkness).toBe(1);
	});

	it("obscurité strictement croissante pendant le crépuscule", () => {
		const samples = [0.2, 0.25, 0.3, 0.35, 0.4].map((f) => system.computeFraction(f).darkness);
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i]).toBeGreaterThan(samples[i - 1]!);
		}
		expect(samples[0]).toBe(0);
		expect(samples[samples.length - 1]).toBe(1);
	});

	it("obscurité strictement décroissante pendant l'aube", () => {
		const samples = [0.75, 0.82, 0.88, 0.94, 1].map((f) => system.computeFraction(f).darkness);
		for (let i = 1; i < samples.length; i++) {
			expect(samples[i]).toBeLessThan(samples[i - 1]!);
		}
		expect(samples[0]).toBe(1);
		expect(samples[samples.length - 1]).toBe(0);
	});

	it("les lumières s'allument seulement une fois l'obscurité suffisante", () => {
		expect(system.computeFraction(0.1).lightsOn).toBe(false);
		expect(system.computeFraction(0.2).lightsOn).toBe(false);
		expect(system.computeFraction(0.5).lightsOn).toBe(true);
		expect(system.computeFraction(0.99).lightsOn).toBe(false);
	});

	it("les fractions hors bornes sont ramenées à [0, 1]", () => {
		expect(system.computeFraction(-5)).toEqual(system.computeFraction(0));
		expect(system.computeFraction(5)).toEqual(system.computeFraction(1));
	});

	it("compute() dérive la fraction du tour du meneur et du total de tours", () => {
		expect(system.compute(0, 20).phase).toBe("day");
		expect(system.compute(10, 20).phase).toBe("night");
		expect(system.compute(20, 20).phase).toBe("dawn");
		expect(system.compute(0, 0).phase).toBe("day");
	});

	it("l'horloge fictive tombe sur des heures plausibles aux seuils de phase", () => {
		expect(system.formatTimeOfDay(0)).toBe("14:00");
		expect(system.formatTimeOfDay(0.2)).toBe("17:12");
		expect(system.formatTimeOfDay(0.4)).toBe("20:24");
		expect(system.formatTimeOfDay(0.75)).toBe("02:00");
		expect(system.formatTimeOfDay(1)).toBe("06:00");
	});

	it("timeOfDayAt() renvoie des heures et minutes zéro-paddées au format", () => {
		expect(system.timeOfDayAt(0)).toEqual({hours: 14, minutes: 0});
		expect(system.formatTimeOfDay(0)).toMatch(/^\d{2}:\d{2}$/);
		expect(system.formatTimeOfDay(0.75)).toMatch(/^\d{2}:\d{2}$/);
	});

	it("l'heure fictive avance de façon monotone avec la progression", () => {
		const fractions = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1];
		const totalMinutes = fractions.map((f) => {
			const {hours, minutes} = system.timeOfDayAt(f);
			// Ramène chaque heure fictive à une échelle continue (14 h → 30 h) pour comparer.
			const absoluteHours = hours < 14 ? hours + 24 : hours;
			return absoluteHours * 60 + minutes;
		});
		for (let i = 1; i < totalMinutes.length; i++) {
			expect(totalMinutes[i]).toBeGreaterThanOrEqual(totalMinutes[i - 1]!);
		}
	});

	it("les fractions hors bornes sont ramenées à [0, 1] pour l'horloge", () => {
		expect(system.formatTimeOfDay(-5)).toBe(system.formatTimeOfDay(0));
		expect(system.formatTimeOfDay(5)).toBe(system.formatTimeOfDay(1));
	});
});
