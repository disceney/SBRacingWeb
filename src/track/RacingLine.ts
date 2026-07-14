import type {Point} from "./trackTypes";

/**
 * Polyligne paramétrée par la distance cumulée, avec projection d'un point
 * quelconque et échantillonnage à une distance donnée (bouclage facultatif).
 */
export class RacingLine {
	readonly points: Point[];
	readonly cumulative: number[];
	readonly length: number;
	readonly closed: boolean;

	constructor(points: Point[], closed: boolean) {
		if (points.length < 2) {
			throw new Error("RacingLine requires at least two points");
		}
		this.points = points;
		this.closed = closed;
		this.cumulative = [0];
		let total = 0;
		for (let i = 1; i < points.length; i++) {
			total += distance(points[i - 1]!, points[i]!);
			this.cumulative.push(total);
		}
		if (closed) {
			total += distance(points[points.length - 1]!, points[0]!);
		}
		this.length = total;
	}

	/** Point situé à la distance d le long de la ligne (enroulée si fermée). */
	pointAt(d: number): Point {
		const dist = this.closed
			? ((d % this.length) + this.length) % this.length
			: Math.max(0, Math.min(this.length, d));
		// Recherche du segment contenant la distance demandée.
		const i = this.findSegment(dist);
		const start = this.cumulative[i]!;
		const a = this.points[i]!;
		const b = this.points[(i + 1) % this.points.length]!;
		const segLen = distance(a, b);
		const t = segLen > 0 ? (dist - start) / segLen : 0;
		return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
	}

	/** Distance cumulée du point de la ligne le plus proche de (x, y). */
	project(x: number, y: number): number {
		let best = 0;
		let bestDist = Infinity;
		const count = this.closed ? this.points.length : this.points.length - 1;
		for (let i = 0; i < count; i++) {
			const a = this.points[i]!;
			const b = this.points[(i + 1) % this.points.length]!;
			const abx = b.x - a.x;
			const aby = b.y - a.y;
			const len2 = abx * abx + aby * aby;
			const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * abx + (y - a.y) * aby) / len2)) : 0;
			const px = a.x + abx * t;
			const py = a.y + aby * t;
			const d2 = (x - px) * (x - px) + (y - py) * (y - py);
			if (d2 < bestDist) {
				bestDist = d2;
				best = this.cumulative[i]! + Math.sqrt(len2) * t;
			}
		}
		return best;
	}

	/** Distance euclidienne entre (x, y) et la ligne. */
	distanceTo(x: number, y: number): number {
		const d = this.project(x, y);
		const p = this.pointAt(d);
		return Math.hypot(x - p.x, y - p.y);
	}

	private findSegment(dist: number): number {
		let lo = 0;
		let hi = this.cumulative.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (this.cumulative[mid]! <= dist) lo = mid;
			else hi = mid - 1;
		}
		// Sur une ligne fermée, le dernier point enchaîne sur le premier.
		if (!this.closed && lo >= this.points.length - 1) lo = this.points.length - 2;
		return lo;
	}
}

function distance(a: Point, b: Point): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}
