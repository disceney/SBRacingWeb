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
});
