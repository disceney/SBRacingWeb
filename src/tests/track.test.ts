import { describe, expect, it } from 'vitest';
import { mphToUnits, unitsToMph } from '../app/constants';
import { CLASSIC_OVAL } from '../data/tracks/classicOval';
import { Track } from '../track/Track';
import { Surface } from '../track/trackTypes';

const track = new Track(CLASSIC_OVAL);

describe('conversions de vitesse', () => {
  it('aller-retour mph ↔ unités', () => {
    expect(unitsToMph(mphToUnits(180))).toBeCloseTo(180);
    expect(mphToUnits(0)).toBe(0);
  });
});

describe('géométrie du circuit', () => {
  it('longueur de tour ≈ 4 490 unités (§9.2)', () => {
    expect(track.lapLength).toBeGreaterThan(4400);
    expect(track.lapLength).toBeLessThan(4600);
  });

  it('s = 0 sur la ligne de départ', () => {
    const bottomY = CLASSIC_OVAL.centerY + CLASSIC_OVAL.turnRadius;
    expect(track.progressAt(CLASSIC_OVAL.startLineX, bottomY)).toBeCloseTo(0, 5);
    const start = track.centerlineAt(0);
    expect(start.x).toBeCloseTo(CLASSIC_OVAL.startLineX);
    expect(start.y).toBeCloseTo(bottomY);
    // Sens de course : +x sur la ligne droite du bas.
    expect(start.tx).toBeCloseTo(1);
    expect(start.ty).toBeCloseTo(0);
  });

  it('la progression croît le long de la ligne centrale', () => {
    for (let s = 0; s < track.lapLength - 60; s += 50) {
      const here = track.centerlineAt(s);
      const there = track.centerlineAt(s + 50);
      const sHere = track.progressAt(here.x, here.y);
      const sThere = track.progressAt(there.x, there.y);
      const delta = (sThere - sHere + track.lapLength) % track.lapLength;
      expect(delta).toBeGreaterThan(30);
      expect(delta).toBeLessThan(70);
    }
  });

  it('surfaces : piste, herbe, voie des stands, bordure', () => {
    const c = track.centerlineAt(500);
    expect(track.surfaceAt(c.x, c.y)).toBe(Surface.Asphalt);
    expect(track.surfaceAt(CLASSIC_OVAL.centerX, CLASSIC_OVAL.centerY)).toBe(Surface.Grass);
    expect(track.surfaceAt(1200, 920)).toBe(Surface.PitLane);
    // Bordure : juste au-delà de la demi-largeur de piste.
    const edge = CLASSIC_OVAL.trackHalfWidth + CLASSIC_OVAL.kerbWidth / 2;
    expect(track.surfaceAt(c.x, c.y + edge)).toBe(Surface.Kerb);
  });

  it('murs : aucun contact sur la piste, correction au-delà du mur extérieur', () => {
    const c = track.centerlineAt(300);
    expect(track.collideWalls(c.x, c.y, 14)).toBeNull();
    // Point enfoncé dans le mur extérieur de la ligne droite du bas.
    const wallY = CLASSIC_OVAL.centerY + CLASSIC_OVAL.turnRadius + CLASSIC_OVAL.outerWallDistance;
    const hit = track.collideWalls(1200, wallY + 5, 14);
    expect(hit).not.toBeNull();
    expect(hit!.y).toBeLessThan(wallY);
    expect(hit!.normalY).toBeLessThan(0);
  });

  it('détection de la zone des stands', () => {
    expect(track.isInPitArea(1200, 920)).toBe(true);
    expect(track.isInPitArea(1200, 1080)).toBe(false);
  });
});
