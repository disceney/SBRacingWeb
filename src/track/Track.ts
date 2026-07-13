import type { Point, TrackData, LineName } from './trackTypes';
import { Surface } from './trackTypes';
import { RacingLine } from './RacingLine';

/** Position et tangente sur la ligne centrale. */
export interface CenterlineSample {
  x: number;
  y: number;
  tx: number;
  ty: number;
}

/** Résultat d'une correction de collision avec un mur. */
export interface WallHit {
  x: number;
  y: number;
  normalX: number;
  normalY: number;
}

/**
 * Modèle d'exécution du circuit : ligne centrale en forme de stade paramétrée
 * par l'abscisse curviligne s, surfaces analytiques, murs, trajectoires,
 * grille et stands.
 *
 * Le « spine » est le segment horizontal joignant les centres des deux
 * virages ; la ligne centrale est l'ensemble des points à distance
 * turnRadius de ce segment. s = 0 à la ligne de départ, croissant dans le
 * sens de course (+x sur la ligne droite du bas).
 */
export class Track {
  readonly data: TrackData;
  readonly lapLength: number;
  readonly lines: Record<LineName, RacingLine>;
  readonly pitEntryLine: RacingLine;
  readonly pitLaneLine: RacingLine;
  readonly pitExitLine: RacingLine;

  private readonly spineX1: number;
  private readonly spineX2: number;
  private readonly spineY: number;
  private readonly radius: number;
  private readonly straightLen: number;
  private readonly arcLen: number;
  /** Abscisse s du point (startLineX, bas) — décalage pour placer s = 0 à la ligne. */
  private readonly startOffset: number;

  constructor(data: TrackData) {
    this.data = data;
    this.spineX1 = data.centerX - data.spineHalfLength;
    this.spineX2 = data.centerX + data.spineHalfLength;
    this.spineY = data.centerY;
    this.radius = data.turnRadius;
    this.straightLen = 2 * data.spineHalfLength;
    this.arcLen = Math.PI * this.radius;
    this.lapLength = 2 * this.straightLen + 2 * this.arcLen;
    // Sur la droite du bas, s brut = x - spineX1 ; la ligne de départ décale l'origine.
    this.startOffset = data.startLineX - this.spineX1;

    this.lines = {
      inside: this.buildOffsetLine(-70),
      middle: this.buildOffsetLine(0),
      outside: this.buildOffsetLine(70),
    };

    // Ligne de circulation des stands : dans la moitié basse de la voie, à
    // l'écart des dalles d'arrêt adossées aux garages.
    const pitY = data.pitLane.y2 - 20;
    const bottomY = data.centerY + this.radius;
    // Entrée : depuis la corde intérieure en sortie de virage 4 vers la voie des stands.
    this.pitEntryLine = new RacingLine(
      [
        { x: data.pitEntryZone.x1 - 40, y: bottomY - 70 },
        { x: data.pitEntryZone.x1 + 30, y: bottomY - 95 },
        { x: data.pitEntryZone.x2, y: pitY },
      ],
      false,
    );
    this.pitLaneLine = new RacingLine(
      [
        { x: data.pitEntryZone.x2, y: pitY },
        { x: data.pitExitZone.x1, y: pitY },
      ],
      false,
    );
    // Sortie : de la voie des stands vers la corde intérieure avant le virage 1.
    this.pitExitLine = new RacingLine(
      [
        { x: data.pitExitZone.x1, y: pitY },
        { x: data.pitExitZone.x2 - 30, y: bottomY - 95 },
        { x: data.pitExitZone.x2 + 40, y: bottomY - 70 },
      ],
      false,
    );
  }

  /** Abscisse curviligne (0 ≤ s < lapLength) du point le plus proche sur la ligne centrale. */
  progressAt(x: number, y: number): number {
    let raw: number;
    if (x >= this.spineX1 && x <= this.spineX2) {
      raw = y >= this.spineY ? x - this.spineX1 : this.straightLen + this.arcLen + (this.spineX2 - x);
    } else if (x > this.spineX2) {
      // Virage droit : angle depuis le bas (0) vers le haut (π).
      const a = Math.atan2(x - this.spineX2, y - this.spineY);
      raw = this.straightLen + this.normalizeAngle(a) * this.radius;
    } else {
      // Virage gauche : angle depuis le haut (0) vers le bas (π).
      const a = Math.atan2(this.spineX1 - x, this.spineY - y);
      raw = 2 * this.straightLen + this.arcLen + this.normalizeAngle(a) * this.radius;
    }
    const s = raw - this.startOffset;
    return ((s % this.lapLength) + this.lapLength) % this.lapLength;
  }

  /** Point et tangente de la ligne centrale à l'abscisse s. */
  centerlineAt(s: number): CenterlineSample {
    let raw = (((s + this.startOffset) % this.lapLength) + this.lapLength) % this.lapLength;
    if (raw < this.straightLen) {
      return { x: this.spineX1 + raw, y: this.spineY + this.radius, tx: 1, ty: 0 };
    }
    raw -= this.straightLen;
    if (raw < this.arcLen) {
      const a = raw / this.radius;
      return {
        x: this.spineX2 + Math.sin(a) * this.radius,
        y: this.spineY + Math.cos(a) * this.radius,
        tx: Math.cos(a),
        ty: -Math.sin(a),
      };
    }
    raw -= this.arcLen;
    if (raw < this.straightLen) {
      return { x: this.spineX2 - raw, y: this.spineY - this.radius, tx: -1, ty: 0 };
    }
    raw -= this.straightLen;
    const a = raw / this.radius;
    return {
      x: this.spineX1 - Math.sin(a) * this.radius,
      y: this.spineY - Math.cos(a) * this.radius,
      tx: -Math.cos(a),
      ty: Math.sin(a),
    };
  }

  /**
   * Distance signée à la ligne centrale : positive vers l'extérieur du stade,
   * négative vers l'intérieur (pelouse centrale).
   */
  signedDistance(x: number, y: number): number {
    const cx = Math.max(this.spineX1, Math.min(this.spineX2, x));
    return Math.hypot(x - cx, y - this.spineY) - this.radius;
  }

  /** Courbure de la ligne centrale à l'abscisse s (0 en ligne droite, 1/R en virage). */
  curvatureAt(s: number): number {
    const raw = (((s + this.startOffset) % this.lapLength) + this.lapLength) % this.lapLength;
    const inFirstStraight = raw < this.straightLen;
    const inSecondStraight = raw >= this.straightLen + this.arcLen && raw < 2 * this.straightLen + this.arcLen;
    return inFirstStraight || inSecondStraight ? 0 : 1 / this.radius;
  }

  /** Surface au point (x, y), voie des stands comprise. */
  surfaceAt(x: number, y: number): Surface {
    if (this.isInPitArea(x, y)) return Surface.PitLane;
    const d = Math.abs(this.signedDistance(x, y));
    if (d <= this.data.trackHalfWidth) return Surface.Asphalt;
    if (d <= this.data.trackHalfWidth + this.data.kerbWidth) return Surface.Kerb;
    return Surface.Grass;
  }

  /** Vrai si le point est dans la voie des stands ou ses zones d'accès. */
  isInPitArea(x: number, y: number): boolean {
    const p = this.data.pitLane;
    if (x >= p.x1 && x <= p.x2 && y >= p.y1 && y <= p.y2) return true;
    // Bandes d'accès diagonales entre la piste et la voie.
    const innerEdge = this.data.centerY + this.radius - this.data.trackHalfWidth;
    const inAccessBand = y > p.y2 && y < innerEdge;
    if (
      inAccessBand &&
      ((x >= this.data.pitEntryZone.x1 && x <= this.data.pitEntryZone.x2) ||
        (x >= this.data.pitExitZone.x1 && x <= this.data.pitExitZone.x2))
    ) {
      return true;
    }
    return false;
  }

  /**
   * Corrige une position contre les murs (mur extérieur du stade et mur des
   * stands). Renvoie la position corrigée et la normale du mur touché, ou
   * null si aucun contact.
   */
  collideWalls(x: number, y: number, radius: number): WallHit | null {
    // Mur extérieur : cercle/segment de stade à distance outerWallDistance.
    const cx = Math.max(this.spineX1, Math.min(this.spineX2, x));
    const dx = x - cx;
    const dy = y - this.spineY;
    const dist = Math.hypot(dx, dy);
    const limit = this.radius + this.data.outerWallDistance - radius;
    if (dist > limit && dist > 0) {
      const nx = -dx / dist;
      const ny = -dy / dist;
      return { x: cx + (dx / dist) * limit, y: this.spineY + (dy / dist) * limit, normalX: nx, normalY: ny };
    }
    // Mur des stands : segment horizontal séparant piste et voie des stands.
    const w = this.data.pitWall;
    if (x >= w.x1 - radius && x <= w.x2 + radius && Math.abs(y - w.y) < radius + 4) {
      const side = y >= w.y ? 1 : -1;
      return { x, y: w.y + side * (radius + 4), normalX: 0, normalY: side };
    }
    return null;
  }

  /** Ligne de course décalée latéralement de offset unités (positif = extérieur). */
  private buildOffsetLine(offset: number): RacingLine {
    const points: Point[] = [];
    const step = 24;
    for (let s = 0; s < this.lapLength; s += step) {
      const c = this.centerlineAt(s);
      // La normale extérieure s'obtient en tournant la tangente de -90°.
      points.push({ x: c.x + c.ty * -offset, y: c.y + c.tx * offset });
    }
    return new RacingLine(points, true);
  }

  private normalizeAngle(a: number): number {
    return Math.max(0, Math.min(Math.PI, a));
  }
}
