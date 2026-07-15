import {mphToUnits, PIT_SPEED_LIMIT_MPH} from "../app/constants";
import type {DriverProfile} from "../data/drivers";
import type {Track} from "../track/Track";
import type {RacingLine} from "../track/RacingLine";
import {Surface} from "../track/trackTypes";
import type {Vehicle} from "./Vehicle";

const PIT_CAP = mphToUnits(PIT_SPEED_LIMIT_MPH);
/** Décalages latéraux des trajectoires nommées (§11.1). */
const LINE_OFFSETS = {inside: -70, middle: 0, outside: 70} as const;
/** Demi-largeur exploitable de la piste pour les décalages IA. */
const MAX_OFFSET = 78;

/**
 * Pilote artificiel : suivi de trajectoire par poursuite d'un point cible,
 * anticipation des virages par échantillonnage de courbure, évitement et
 * dépassement par décalage latéral, conduite dans les stands et
 * récupération après incident (§11).
 */
export class AIController {
	readonly vehicle: Vehicle;
	readonly driver: DriverProfile;
	/** Demande d'arrêt aux stands au prochain passage devant l'entrée. */
	wantPit = false;
	private readonly track: Track;
	/** Décalage latéral courant (lissé) et cible. */
	private offset: number;
	private targetOffset: number;
	/** Rythme global dérivé du niveau du pilote. */
	private readonly pace: number;
	private readonly gripFactor: number;
	/**
	 * Marge de sécurité sous la limite d'adhérence en virage (§11.2) : les
	 * agressifs s'en approchent davantage, sans jamais déclencher de toupie
	 * à un rythme normal.
	 */
	private readonly spinSafety: number;
	private stuckTimer = 0;
	private reverseTimer = 0;
	/** Côté de dépassement engagé (0 = aucun) : conservé par hystérésis tant qu'il reste viable. */
	private overtakeSide: -1 | 0 | 1 = 0;
	/** Rival actuellement suivi en dépassement et durée de blocage derrière lui (urgence). */
	private blockedCarIndex = -1;
	private blockedTimer = 0;
	/** Décalage défensif courant et rival déjà traité pour l'approche en cours (§ défense). */
	private defenseOffset = 0;
	private defendedCarIndex = -1;
	/** Signe de dérive latérale propre au véhicule, réutilisé lors des erreurs occasionnelles. */
	private readonly driftSign: 1 | -1;

	constructor(vehicle: Vehicle, driver: DriverProfile, track: Track) {
		this.vehicle = vehicle;
		this.driver = driver;
		this.track = track;
		this.offset = LINE_OFFSETS[driver.preferredLine];
		this.targetOffset = this.offset;
		// Écart de rythme légèrement accentué entre pilotes faibles et forts.
		this.pace = 0.84 + driver.skill * 0.16;
		this.gripFactor = 0.9 + driver.skill * 0.12;
		this.spinSafety = 0.97 + driver.aggression * 0.02;
		this.driftSign = Math.sin(vehicle.index * 3.1) >= 0 ? 1 : -1;
	}

	/**
	 * Stratégie de stands, évaluée à chaque tour bouclé (§12.5) : arrêt si le
	 * carburant ou les pneus ne permettent pas de finir et que la marge
	 * tolérée est entamée, ou si la mécanique devient inquiétante. La marge
	 * dépend de pitRisk, ce qui étale naturellement les arrêts. Une crevaison
	 * déclenche l'arrêt immédiatement.
	 */
	onLapCompleted(
		lapsRemaining: number,
		fuelPerLap: number,
		tiresPerLap: number,
		damageEnabled = false,
	): void {
		const v = this.vehicle;
		const margin = 1.2 + (1 - this.driver.pitRisk) * 2.2;

		const needFor = (reserve: number, perLap: number): boolean => {
			if (perLap <= 0) return false;
			const lapsLeft = reserve / perLap;
			return lapsLeft < lapsRemaining + 0.3 && lapsLeft < margin;
		};

		// Seuil de dégâts toléré : les prudents rentrent plus tôt.
		const damageThreshold = 35 + (1 - this.driver.pitRisk) * 15;
		const needRepair = damageEnabled && v.health < damageThreshold;

		this.wantPit =
			v.flatTire || needRepair || needFor(v.fuel, fuelPerLap) || needFor(v.tires, tiresPerLap);
	}

	update(dt: number, time: number, vehicles: Vehicle[]): void {
		const v = this.vehicle;
		const c = v.controls;
		if (!v.isRunning && v.raceState !== "finished") {
			c.throttle = 0;
			c.brake = 1;
			c.steer = 0;
			return;
		}

		// — Toupie en cours : la physique impose déjà la rotation, seul
		// l'accélérateur est coupé ; le réalignement de driveTrack (cible
		// « reversed ») reprend la main dès que le contrôle revient.
		if (v.spinning) {
			c.throttle = 0;
			c.brake = 0;
			c.steer = 0;
			return;
		}

		// — Marche arrière de dégagement après blocage prolongé.
		if (this.reverseTimer > 0) {
			this.reverseTimer -= dt;
			c.throttle = 0;
			c.brake = 1;
			c.steer = 0;
			return;
		}

		// Une crevaison ou une mécanique à l'agonie imposent l'arrêt dès le
		// prochain passage devant l'entrée des stands.
		if (v.flatTire || (v.health < 18 && v.health > 0)) this.wantPit = true;

		if (v.pitPhase !== "none") {
			this.drivePit(dt);
		} else {
			this.driveTrack(dt, time, vehicles);
		}

		// — Détection de blocage (hors arrêt volontaire au stand).
		const wantsToMove = c.throttle > 0.4;
		if (wantsToMove && v.speed < 12 && v.pitPhase !== "stopped") {
			this.stuckTimer += dt;
			if (this.stuckTimer > 2) {
				this.stuckTimer = 0;
				this.reverseTimer = 1.1;
			}
		} else {
			this.stuckTimer = 0;
		}
	}

	/** Conduite normale sur la piste. */
	private driveTrack(dt: number, time: number, vehicles: Vehicle[]): void {
		const v = this.vehicle;

		// Égaré dans la zone des stands sans intention d'arrêt (poussé lors d'un
		// évitement) : rejoindre la sortie plutôt que viser la piste à travers
		// le mur des stands.
		if (this.track.isInPitArea(v.x, v.y)) {
			const line =
				v.x >= this.track.data.pitExitZone.x1 ? this.track.pitExitLine : this.track.pitLaneLine;
			this.steerAlong(line, line.project(v.x, v.y));
			this.applySpeed(mphToUnits(PIT_SPEED_LIMIT_MPH));
			return;
		}

		const s = this.track.progressAt(v.x, v.y);
		const lookahead = clamp(v.vLong * 0.55, 45, 165);
		const sAhead = s + lookahead;

		// — Bruit d'imprécision du pilote : source commune à la direction, à la
		// dérive latérale et au lever de pied occasionnels (§ rythmes). Jamais
		// actif pour l'autopilote (consistency = 1 dans AUTOPILOT_DRIVER).
		const noiseWave = Math.sin(time * 1.7 + v.index * 2.3);
		const noise = (1 - this.driver.consistency) * 0.055 * noiseWave;
		const errorThreshold = 0.75 + this.driver.consistency * 0.25;
		const errorStrength = clamp(
			(noiseWave - errorThreshold) / Math.max(0.02, 1 - errorThreshold),
			0,
			1,
		);

		// — Évitement et dépassement.
		let speedLimit = Infinity;
		const blocker = this.findBlocker(s, vehicles);
		if (blocker) {
			this.defendedCarIndex = -1;
			if (blocker.car.index !== this.blockedCarIndex) {
				this.blockedCarIndex = blocker.car.index;
				this.blockedTimer = 0;
				this.overtakeSide = 0;
			} else {
				this.blockedTimer += dt;
			}
			const blockerOff = this.track.signedDistance(blocker.car.x, blocker.car.y);
			const stopped = blocker.car.speed < 25;

			// Marge latérale accrue en trafic dense, pour limiter les accrochages en peloton.
			const nearby = this.countNearby(s, vehicles);
			const trafficMargin = nearby >= 3 ? 6 : nearby === 2 ? 3 : 0;

			// Urgence de dépassement croissante avec le temps passé derrière le même
			// rival, modulée par l'agressivité : couloir plus étroit accepté sans
			// jamais descendre sous un plancher sûr.
			const urgency = this.driver.aggression * clamp((this.blockedTimer - 1.5) / 3, 0, 1);
			const room = (stopped ? 55 : 45) - urgency * 15;
			const clearance = 30 - urgency * 8 + trafficMargin;

			// Choix du côté offrant le plus d'espace, évalué des deux côtés puis
			// conservé tant qu'il reste viable (hystérésis anti-oscillation).
			const leftOffset = clamp(blockerOff - room, -MAX_OFFSET, MAX_OFFSET);
			const rightOffset = clamp(blockerOff + room, -MAX_OFFSET, MAX_OFFSET);
			const leftFree = this.isSlotFree(leftOffset, s, vehicles, blocker.car, clearance);
			const rightFree = this.isSlotFree(rightOffset, s, vehicles, blocker.car, clearance);
			const sideStillFree =
				this.overtakeSide === -1 ? leftFree : this.overtakeSide === 1 ? rightFree : false;
			if (!sideStillFree) {
				const preferInside = blockerOff >= 0;
				if (leftFree && rightFree) this.overtakeSide = preferInside ? -1 : 1;
				else if (leftFree) this.overtakeSide = -1;
				else if (rightFree) this.overtakeSide = 1;
				else this.overtakeSide = preferInside ? -1 : 1;
			}
			this.targetOffset = this.overtakeSide === -1 ? leftOffset : rightOffset;

			// Régulation de l'allure tant que le dépassement n'est pas engagé : lever
			// le pied progressivement si aucun couloir n'est libre, plutôt que percuter.
			const clearing = Math.abs(this.offset - blockerOff) > 30;
			if (!clearing) {
				const closeness = 1 - blocker.gap / 130;
				const patience = 0.9 + this.driver.aggression * 0.1;
				let limit = stopped
					? Math.max(60, blocker.car.speed + 40)
					: Math.max(40, blocker.car.speed * (patience + 0.06 * (1 - closeness)));
				if (!stopped && !leftFree && !rightFree) {
					limit = Math.min(limit, blocker.car.speed * (1 - 0.4 * closeness));
				}
				speedLimit = limit;
			}
		} else {
			this.blockedCarIndex = -1;
			this.blockedTimer = 0;
			this.overtakeSide = 0;

			// — Trajectoire de base : ligne optimale du circuit (extérieur en
			// entrée/sortie de virage, corde à l'apex), légèrement biaisée vers
			// la ligne préférée du pilote hors virage — en virage l'optimale
			// prime pour ne pas dégrader l'appui/la vitesse de passage.
			const curveAhead = this.track.curvatureAt(sAhead);
			const preferenceBias = curveAhead > 0 ? 0.08 : 0.35;
			const optimal = this.track.optimalOffsetAt(sAhead);
			const preferred = LINE_OFFSETS[this.driver.preferredLine];
			this.targetOffset = optimal * (1 - preferenceBias) + preferred * preferenceBias;

			// — Défense légère, jamais en dépassement ni aux stands : décale
			// modestement la ligne vers le rival proche derrière, une fois par
			// approche (hystérésis via son identité), amplitude selon l'agressivité.
			const threat = this.findRearThreat(s, vehicles);
			if (threat) {
				if (threat.car.index !== this.defendedCarIndex) {
					const amplitude = 6 + this.driver.aggression * 14;
					this.defenseOffset = clamp(
						Math.sign(threat.lateral) * amplitude,
						-MAX_OFFSET - this.targetOffset,
						MAX_OFFSET - this.targetOffset,
					);
					this.defendedCarIndex = threat.car.index;
				}
			} else {
				this.defendedCarIndex = -1;
				this.defenseOffset += clamp(-this.defenseOffset, -40 * dt, 40 * dt);
			}
			this.targetOffset = clamp(this.targetOffset + this.defenseOffset, -MAX_OFFSET, MAX_OFFSET);
		}

		// — Retour progressif vers la trajectoire (§11.2).
		this.offset += clamp(this.targetOffset - this.offset, -60 * dt, 60 * dt);

		// — Point de poursuite sur la ligne décalée, avec dérive occasionnelle
		// des pilotes peu réguliers (§ rythmes ; jamais pour l'autopilote).
		const drivingOffset = this.offset + errorStrength * this.driftSign * 6;
		const ahead = this.track.centerlineAt(sAhead);
		const targetX = ahead.x - ahead.ty * drivingOffset;
		const targetY = ahead.y + ahead.tx * drivingOffset;

		// — Cap : correction proportionnelle + bruit d'imprécision du pilote.
		const desired = Math.atan2(targetY - v.y, targetX - v.x);
		const angleErr = wrapAngle(desired - v.heading);
		// Tête-à-queue : réalignement prioritaire à vitesse réduite.
		const reversed = Math.abs(angleErr) > 2.2;
		v.controls.steer = clamp(angleErr * 2.4 + noise, -1, 1);

		// — Vitesse cible : courbure anticipée + distance de freinage (§11.2),
		// adhérence réduite par l'usure des pneus.
		const decel = v.spec.braking * 0.92;
		const gripEff = v.spec.lateralGrip * this.gripFactor * v.tireGrip;
		let target = v.spec.maxSpeed * this.pace;
		for (const d of [0, 60, 130, 210, 300, 400]) {
			const k = this.track.curvatureAt(s + lookahead * 0.4 + d);
			if (k > 0) {
				const vCorner = Math.sqrt(gripEff / k) * this.pace * this.spinSafety;
				const vHere = Math.sqrt(vCorner * vCorner + 2 * decel * d);
				target = Math.min(target, vHere);
			}
		}
		// Bref lever de pied occasionnel des pilotes peu réguliers.
		target *= 1 - errorStrength * 0.12;
		target = Math.min(target, speedLimit);
		if (reversed) target = Math.min(target, 50);
		// Herbe : ralentir et revenir en piste sans excès.
		if (v.surface === Surface.Grass || v.surface === Surface.Kerb) {
			target = Math.min(target, 120);
		}

		this.applySpeed(target);
	}

	/** Conduite dans la voie des stands selon la phase courante. */
	private drivePit(dt: number): void {
		const v = this.vehicle;
		const c = v.controls;
		void dt;

		if (v.pitPhase === "stopped") {
			c.throttle = 0;
			c.brake = 1;
			c.steer = 0;
			return;
		}

		let line: RacingLine;
		let target: number;
		if (v.pitPhase === "entering") {
			line = this.track.pitEntryLine;
			const d = line.project(v.x, v.y);
			const remaining = line.length - d;
			target = Math.sqrt(PIT_CAP * PIT_CAP + 2 * v.spec.braking * Math.max(0, remaining - 10));
			this.steerAlong(line, d);
		} else if (v.pitPhase === "toBox") {
			line = this.track.pitLaneLine;
			const d = line.project(v.x, v.y);
			const box = this.track.data.pitBoxes[v.pitBoxIndex]!;
			const distToStop = Math.max(0, box.x - 6 - v.x);
			target = Math.min(PIT_CAP, Math.sqrt(2 * v.spec.braking * distToStop));
			// Circulation sur la ligne de la voie, déport tardif vers la dalle.
			const laneY = this.track.data.pitLane.y2 - 20;
			const lateral = distToStop < 90 ? box.y - laneY : 0;
			this.steerAlong(line, d, lateral);
		} else {
			line = this.track.pitExitLine;
			const d = line.project(v.x, v.y);
			target = v.surface === Surface.PitLane ? PIT_CAP : v.spec.maxSpeed * this.pace;
			this.steerAlong(line, d);
		}
		this.applySpeed(target);
	}

	/** Oriente le véhicule le long d'une polyligne avec un décalage latéral facultatif. */
	private steerAlong(line: RacingLine, d: number, lateral = 0): void {
		const v = this.vehicle;
		const look = clamp(v.vLong * 0.5, 25, 70);
		const p = line.pointAt(d + look);
		const desired = Math.atan2(p.y + lateral - v.y, p.x - v.x);
		v.controls.steer = clamp(wrapAngle(desired - v.heading) * 2.6, -1, 1);
	}

	/** Convertit une vitesse cible en accélérateur/frein. */
	private applySpeed(target: number): void {
		const v = this.vehicle;
		const err = target - v.vLong;
		v.controls.throttle = clamp(err / 10, 0, 1);
		v.controls.brake = clamp(-err / 12, 0, 1);
	}

	/** Voiture gênante la plus proche devant, dans un couloir latéral proche. */
	private findBlocker(
		s: number,
		vehicles: Vehicle[],
	): { car: Vehicle; gap: number } | null {
		const v = this.vehicle;
		let best: { car: Vehicle; gap: number } | null = null;
		for (const other of vehicles) {
			if (other === v || other.inPit || other.raceState === "grid") continue;
			const gap = wrapDistance(other.progressS - s, this.track.lapLength);
			if (gap <= 4 || gap > 130) continue;
			const otherOff = this.track.signedDistance(other.x, other.y);
			if (Math.abs(otherOff - this.offset) > 34 && other.speed > 25) continue;
			if (!best || gap < best.gap) best = {car: other, gap};
		}
		return best;
	}

	/** Vérifie qu'aucune autre voiture n'occupe le couloir visé. */
	private isSlotFree(
		offset: number,
		s: number,
		vehicles: Vehicle[],
		ignored: Vehicle,
		minClearance = 30,
	): boolean {
		const v = this.vehicle;
		for (const other of vehicles) {
			if (other === v || other === ignored || other.inPit) continue;
			const gap = Math.abs(wrapDistance(other.progressS - s, this.track.lapLength));
			const behind = wrapDistance(s - other.progressS, this.track.lapLength);
			if (gap > 90 && behind > 40) continue;
			const otherOff = this.track.signedDistance(other.x, other.y);
			if (Math.abs(otherOff - offset) < minClearance) return false;
		}
		return true;
	}

	/** Nombre de voitures proches en distance curviligne, pour jauger la densité du trafic. */
	private countNearby(s: number, vehicles: Vehicle[]): number {
		const v = this.vehicle;
		let n = 0;
		for (const other of vehicles) {
			if (other === v || other.inPit || other.raceState === "grid") continue;
			const gap = Math.abs(wrapDistance(other.progressS - s, this.track.lapLength));
			if (gap < 70) n++;
		}
		return n;
	}

	/** Rival le plus proche derrière avec recouvrement latéral partiel (§ défense légère). */
	private findRearThreat(
		s: number,
		vehicles: Vehicle[],
	): { car: Vehicle; lateral: number } | null {
		const v = this.vehicle;
		const window = 25 + (this.driver.defense ?? 0.5) * 30;
		let best: { car: Vehicle; lateral: number; gap: number } | null = null;
		for (const other of vehicles) {
			if (other === v || other.inPit || other.raceState === "grid") continue;
			const gap = wrapDistance(s - other.progressS, this.track.lapLength);
			if (gap <= 2 || gap > window) continue;
			const otherOff = this.track.signedDistance(other.x, other.y);
			const lateral = otherOff - this.offset;
			if (Math.abs(lateral) < 8 || Math.abs(lateral) >= 34) continue;
			if (!best || gap < best.gap) best = {car: other, lateral, gap};
		}
		return best;
	}
}

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function wrapAngle(a: number): number {
	let r = a;
	while (r > Math.PI) r -= Math.PI * 2;
	while (r < -Math.PI) r += Math.PI * 2;
	return r;
}

/** Écart curviligne signé ramené dans [-lap/2, lap/2]. */
function wrapDistance(delta: number, lapLength: number): number {
	let d = ((delta % lapLength) + lapLength) % lapLength;
	if (d > lapLength / 2) d -= lapLength;
	return d;
}
