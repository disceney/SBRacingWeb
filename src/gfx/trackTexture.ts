import Phaser from 'phaser';
import type { Track } from '../track/Track';
import { DECOR } from './palette';

/** Générateur pseudo-aléatoire déterministe (LCG) pour les détails du décor. */
function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Dessine l'intégralité du monde (2 400 × 1 400) dans une texture canvas
 * unique : pelouse, tribunes, murs, piste, bordures, ligne d'arrivée, voie
 * des stands et décor d'infield. Renvoie la clé de texture.
 */
export function ensureTrackTexture(scene: Phaser.Scene, track: Track): string {
  const key = 'track';
  if (scene.textures.exists(key)) return key;

  const d = track.data;
  const canvas = scene.textures.createCanvas(key, d.worldWidth, d.worldHeight);
  if (!canvas) return key;
  const ctx = canvas.getContext();
  ctx.imageSmoothingEnabled = false;
  const rng = makeRng(0x5b5b5b);

  const spineX1 = d.centerX - d.spineHalfLength;
  const spineX2 = d.centerX + d.spineHalfLength;
  const spineY = d.centerY;
  const r = d.turnRadius;

  /** Trace le chemin du stade à un rayon donné autour du spine. */
  const stadiumPath = (radius: number): void => {
    ctx.beginPath();
    ctx.moveTo(spineX1, spineY + radius);
    ctx.lineTo(spineX2, spineY + radius);
    ctx.arc(spineX2, spineY, radius, Math.PI / 2, -Math.PI / 2, true);
    ctx.lineTo(spineX1, spineY - radius);
    ctx.arc(spineX1, spineY, radius, -Math.PI / 2, -Math.PI * 1.5, true);
    ctx.closePath();
  };

  // — Pelouse avec bandes de tonte horizontales.
  ctx.fillStyle = DECOR.grass;
  ctx.fillRect(0, 0, d.worldWidth, d.worldHeight);
  ctx.fillStyle = DECOR.grassDark;
  for (let y = 0; y < d.worldHeight; y += 80) {
    ctx.fillRect(0, y, d.worldWidth, 40);
  }

  // — Tribunes extérieures (haut et bas) avec public.
  drawGrandstand(ctx, rng, 660, 60, 1080, 118);
  drawGrandstand(ctx, rng, 660, 1222, 1080, 118);

  // — Bordures : base blanche puis damier rouge (visibles seulement aux bords).
  ctx.lineWidth = (d.trackHalfWidth + d.kerbWidth) * 2;
  ctx.strokeStyle = DECOR.kerbWhite;
  stadiumPath(r);
  ctx.stroke();
  ctx.setLineDash([26, 26]);
  ctx.strokeStyle = DECOR.kerbRed;
  stadiumPath(r);
  ctx.stroke();
  ctx.setLineDash([]);

  // — Asphalte de la piste par-dessus, avec trace de gomme centrale.
  ctx.lineWidth = d.trackHalfWidth * 2;
  ctx.strokeStyle = DECOR.asphalt;
  stadiumPath(r);
  ctx.stroke();
  ctx.lineWidth = 90;
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  stadiumPath(r);
  ctx.stroke();

  // — Lignes de voies en pointillés.
  ctx.lineWidth = 3;
  ctx.setLineDash([18, 22]);
  ctx.strokeStyle = 'rgba(232,232,232,0.55)';
  for (const offset of [-37, 37]) {
    stadiumPath(r + offset);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // — Mur extérieur avec panneaux publicitaires fictifs.
  ctx.lineWidth = 10;
  ctx.strokeStyle = DECOR.wallShadow;
  stadiumPath(r + d.outerWallDistance + 5);
  ctx.stroke();
  ctx.lineWidth = 8;
  ctx.strokeStyle = DECOR.wall;
  stadiumPath(r + d.outerWallDistance);
  ctx.stroke();
  drawBillboards(ctx, spineX1, spineX2, spineY - r - d.outerWallDistance - 26, true);
  drawBillboards(ctx, spineX1, spineX2, spineY + r + d.outerWallDistance + 8, false);

  // — Ligne de départ/arrivée en damier.
  const innerEdgeY = spineY + r - d.trackHalfWidth;
  const outerEdgeY = spineY + r + d.trackHalfWidth;
  for (let row = 0; row < Math.ceil((outerEdgeY - innerEdgeY) / 11); row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#f0f0f0' : '#101014';
      ctx.fillRect(d.startLineX - 11 + col * 11, innerEdgeY + row * 11, 11, 11);
    }
  }

  // — Voie des stands : accès, chaussée, marquages, mur et emplacements.
  ctx.fillStyle = DECOR.asphaltPit;
  ctx.fillRect(d.pitEntryZone.x1, d.pitLane.y1, d.pitEntryZone.x2 - d.pitEntryZone.x1, innerEdgeY - d.pitLane.y1);
  ctx.fillRect(d.pitExitZone.x1, d.pitLane.y1, d.pitExitZone.x2 - d.pitExitZone.x1, innerEdgeY - d.pitLane.y1);
  ctx.fillRect(d.pitLane.x1, d.pitLane.y1, d.pitLane.x2 - d.pitLane.x1, d.pitLane.y2 - d.pitLane.y1);
  // Ligne médiane et limite de vitesse.
  ctx.setLineDash([12, 14]);
  ctx.strokeStyle = DECOR.lineYellow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d.pitLane.x1 + 30, (d.pitLane.y1 + d.pitLane.y2) / 2 + 12);
  ctx.lineTo(d.pitLane.x2 - 30, (d.pitLane.y1 + d.pitLane.y2) / 2 + 12);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = DECOR.lineWhite;
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('55', d.pitLane.x1 + 90, d.pitLane.y2 - 16);
  ctx.fillText('55', d.pitLane.x2 - 90, d.pitLane.y2 - 16);
  // Damier de la ligne au travers de la voie des stands.
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#f0f0f0' : '#101014';
      ctx.fillRect(d.startLineX - 11 + col * 11, d.pitLane.y1 + row * 11, 11, Math.min(11, d.pitLane.y2 - (d.pitLane.y1 + row * 11)));
    }
  }
  // Mur des stands.
  ctx.fillStyle = DECOR.wallShadow;
  ctx.fillRect(d.pitWall.x1, d.pitWall.y - 4, d.pitWall.x2 - d.pitWall.x1, 10);
  ctx.fillStyle = DECOR.wall;
  ctx.fillRect(d.pitWall.x1, d.pitWall.y - 4, d.pitWall.x2 - d.pitWall.x1, 6);
  // Emplacements de ravitaillement numérotés.
  ctx.strokeStyle = DECOR.lineYellow;
  ctx.lineWidth = 2;
  ctx.font = 'bold 9px monospace';
  d.pitBoxes.forEach((box, i) => {
    ctx.strokeRect(box.x - 13, d.pitLane.y1 + 5, 26, 26);
    ctx.fillStyle = DECOR.lineYellow;
    ctx.fillText(String(i + 1), box.x, d.pitLane.y1 + 2);
  });

  // — Bâtiment des stands (garages) au-dessus de la voie.
  drawPitBuilding(ctx, 880, 820, 740, 56);

  // — Décor d'infield : camions, camping-cars, véhicules de service, arbres.
  drawInfield(ctx, rng, d.centerX, d.centerY);

  canvas.refresh();
  return key;
}

/** Tribune : structure, rangées de sièges et public en pixels colorés. */
function drawGrandstand(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.fillStyle = DECOR.standSteel;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = DECOR.roof;
  ctx.fillRect(x - 8, y - 8, width + 16, 10);
  const crowdColors = ['#e8e0d0', '#d82800', '#0048d8', '#f0c000', '#e858a0', '#101014', '#00a020'];
  for (let row = 0; row < Math.floor(height / 12) - 1; row++) {
    const rowY = y + 10 + row * 12;
    ctx.fillStyle = DECOR.standSeat;
    ctx.fillRect(x + 4, rowY, width - 8, 8);
    // Public : points colorés clairsemés.
    for (let px = x + 6; px < x + width - 6; px += 5) {
      if (rng() < 0.72) {
        ctx.fillStyle = crowdColors[Math.floor(rng() * crowdColors.length)]!;
        ctx.fillRect(px, rowY + 2, 3, 4);
      }
    }
  }
}

/** Panneaux publicitaires fictifs le long des lignes droites. */
function drawBillboards(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  top: boolean,
): void {
  const ads: Array<[string, string, string]> = [
    ['SB RACING', '#d82800', '#ffffff'],
    ['TURBO COLA', '#0048d8', '#ffe860'],
    ['PIXEL OIL', '#101014', '#f0c000'],
    ['WEB GP 98', '#00a020', '#ffffff'],
  ];
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let x = x1 + 60;
  let i = 0;
  while (x + 130 < x2 - 40) {
    const ad = ads[i % ads.length]!;
    ctx.fillStyle = ad[1];
    ctx.fillRect(x, y, 130, 18);
    ctx.fillStyle = ad[2];
    ctx.fillText(ad[0], x + 65, y + 10);
    x += 170;
    i++;
  }
  void top;
}

/** Bâtiment des garages au-dessus de la voie des stands. */
function drawPitBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  ctx.fillStyle = '#9a9aa4';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = DECOR.roof;
  ctx.fillRect(x - 6, y - 8, width + 12, 12);
  ctx.fillStyle = '#3a3a44';
  for (let doorX = x + 12; doorX + 20 < x + width; doorX += 34) {
    ctx.fillRect(doorX, y + height - 34, 20, 30);
  }
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STANDS', x + width / 2, y + 12);
}

/** Décor central : camions, camping-cars, véhicules de service et arbres. */
function drawInfield(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  cx: number,
  cy: number,
): void {
  // Route de service grise traversant l'infield.
  ctx.fillStyle = '#6a6a72';
  ctx.fillRect(cx - 350, cy + 60, 700, 24);

  // Rangée de camping-cars.
  for (let i = 0; i < 8; i++) {
    const x = cx - 340 + i * 90 + rng() * 18;
    const y = cy - 160 + rng() * 30;
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(x, y, 44, 18);
    ctx.fillStyle = ['#d82800', '#0048d8', '#00a020', '#f07000'][i % 4]!;
    ctx.fillRect(x, y + 6, 44, 4);
    ctx.fillStyle = '#101014';
    ctx.fillRect(x + 6, y + 18, 7, 3);
    ctx.fillRect(x + 30, y + 18, 7, 3);
  }

  // Camions des équipes.
  for (let i = 0; i < 4; i++) {
    const x = cx - 260 + i * 140;
    const y = cy + 120;
    ctx.fillStyle = '#d8d8e0';
    ctx.fillRect(x, y, 60, 20);
    ctx.fillStyle = ['#d82800', '#0048d8', '#f0c000', '#8020c0'][i]!;
    ctx.fillRect(x, y, 60, 6);
    ctx.fillStyle = '#48485a';
    ctx.fillRect(x + 60, y + 4, 14, 16);
    ctx.fillStyle = '#101014';
    ctx.fillRect(x + 8, y + 20, 8, 3);
    ctx.fillRect(x + 44, y + 20, 8, 3);
    ctx.fillRect(x + 62, y + 20, 8, 3);
  }

  // Véhicules de service : ambulance et dépanneuse.
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(cx + 240, cy - 40, 34, 16);
  ctx.fillStyle = '#d82800';
  ctx.fillRect(cx + 253, cy - 36, 8, 8);
  ctx.fillStyle = '#f0c000';
  ctx.fillRect(cx - 300, cy - 40, 30, 14);
  ctx.fillStyle = '#48485a';
  ctx.fillRect(cx - 274, cy - 48, 4, 12);

  // Bosquet d'arbres.
  for (let i = 0; i < 12; i++) {
    const x = cx - 420 + rng() * 120;
    const y = cy - 60 + rng() * 140;
    ctx.fillStyle = '#1e6a1e';
    ctx.beginPath();
    ctx.arc(x, y, 8 + rng() * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}
