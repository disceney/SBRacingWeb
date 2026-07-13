import type { Track } from '../track/Track';
import type { Vehicle } from '../vehicles/Vehicle';
import { DamageSystem, REPAIR_RATE } from './DamageSystem';
import { FuelSystem, REFUEL_RATE } from './FuelSystem';
import { TireSystem, TIRE_SWAP_DURATION } from './TireSystem';

/** Événements produits par une mise à jour du système de stands. */
export interface PitEvents {
  /** Le véhicule vient de s'immobiliser dans son emplacement. */
  stopped?: boolean;
  /** Le véhicule vient de quitter la voie des stands. */
  exited?: boolean;
}

/** Contexte de course nécessaire aux décisions de ravitaillement. */
export interface PitContext {
  dt: number;
  /** L'IA du véhicule souhaite s'arrêter à ce tour. */
  wantPit: boolean;
  /** Tours restant à couvrir après le tour en cours. */
  lapsRemaining: number;
  /**
   * Véhicule conduit par une IA (adversaire ou joueur en autopilote) : les
   * transitions suivent alors la logique IA, pas la détection de position.
   */
  aiDriven: boolean;
}

/**
 * Machine à états des passages aux stands (§12.3, §12.4) :
 * none → entering → toBox → stopped → exiting → none.
 * Le ravitaillement est automatique à l'arrêt dans l'emplacement, avec
 * départ anticipé possible ; le temps passé en voie des stands est cumulé.
 */
export class PitSystem {
  private readonly track: Track;
  private readonly fuel: FuelSystem;
  private readonly tires: TireSystem;
  private readonly damage: DamageSystem;
  /** Fenêtre curviligne où une IA décidée à s'arrêter engage son entrée. */
  private readonly turnInFrom: number;
  private readonly turnInTo: number;

  constructor(track: Track, fuel: FuelSystem, tires: TireSystem, damage: DamageSystem) {
    this.track = track;
    this.fuel = fuel;
    this.tires = tires;
    this.damage = damage;
    const d = track.data;
    const bottomY = d.centerY + d.turnRadius;
    const entryS = track.progressAt(d.pitEntryZone.x1, bottomY);
    this.turnInFrom = entryS - 160;
    this.turnInTo = entryS + 10;
  }

  step(vehicle: Vehicle, ctx: PitContext): PitEvents {
    const events: PitEvents = {};
    const inArea = this.track.isInPitArea(vehicle.x, vehicle.y);
    const box = this.track.data.pitBoxes[vehicle.pitBoxIndex]!;

    if (vehicle.inPit) {
      vehicle.pitTimeTotal += ctx.dt;
    }

    switch (vehicle.pitPhase) {
      case 'none': {
        // Conduite IA : engagement anticipé avant la zone d'entrée ;
        // joueur manuel : détection par position.
        if (
          ctx.aiDriven &&
          ctx.wantPit &&
          vehicle.progressS >= this.turnInFrom &&
          vehicle.progressS <= this.turnInTo
        ) {
          vehicle.pitPhase = 'entering';
        } else if (vehicle.isPlayer && !ctx.aiDriven && inArea) {
          vehicle.pitPhase = 'entering';
        }
        break;
      }
      case 'entering': {
        if (inArea && vehicle.x > this.track.data.pitEntryZone.x2) {
          vehicle.pitPhase = 'toBox';
        } else if (!inArea && vehicle.isPlayer && !ctx.aiDriven) {
          // Le joueur est ressorti vers la piste sans rejoindre la voie.
          vehicle.pitPhase = 'none';
        }
        break;
      }
      case 'toBox': {
        // L'arrêt exige d'être sur la dalle (tolérance latérale incluse).
        const atBox =
          Math.abs(vehicle.x - box.x) < 18 && Math.abs(vehicle.y - box.y) < 15 && vehicle.speed < 2;
        if (atBox) {
          vehicle.pitPhase = 'stopped';
          vehicle.pitStops += 1;
          vehicle.pitStopElapsed = 0;
          events.stopped = true;
        } else if (vehicle.x > box.x + 30) {
          // Emplacement manqué ou traversée sans arrêt : direction la sortie.
          vehicle.pitPhase = 'exiting';
        }
        break;
      }
      case 'stopped': {
        // Ravitaillement automatique (§12.4), changement de pneus et
        // réparation en parallèle : le train neuf est posé après une durée
        // fixe, la mécanique se répare en continu ; repartir avant laisse
        // pneus usés et dégâts restants.
        vehicle.pitStopElapsed += ctx.dt;
        vehicle.fuel = Math.min(vehicle.spec.fuelCapacity, vehicle.fuel + REFUEL_RATE * ctx.dt);
        if (
          this.tires.enabled &&
          vehicle.pitStopElapsed >= TIRE_SWAP_DURATION &&
          (vehicle.tires < 100 || vehicle.flatTire)
        ) {
          this.tires.swap(vehicle);
        }
        if (this.damage.enabled && vehicle.health > 0) {
          vehicle.health = Math.min(100, vehicle.health + REPAIR_RATE * ctx.dt);
        }
        if (vehicle.isPlayer && !ctx.aiDriven) {
          // Le joueur repart quand il le décide.
          if (vehicle.speed > 8) vehicle.pitPhase = 'exiting';
        } else {
          // L'IA repart avec le plein utile, ses pneus neufs et une mécanique saine.
          const perLap = this.fuel.estimateFuelPerLap();
          const neededFuel =
            perLap > 0
              ? Math.min(vehicle.spec.fuelCapacity, perLap * (ctx.lapsRemaining + 1.5))
              : vehicle.spec.fuelCapacity;
          const wantsTires =
            this.tires.enabled && (vehicle.flatTire || vehicle.tires < 55);
          const wantsRepair = this.damage.enabled && vehicle.health < 85;
          if (vehicle.fuel >= neededFuel && !wantsTires && !wantsRepair) {
            vehicle.pitPhase = 'exiting';
          }
        }
        break;
      }
      case 'exiting': {
        if (!inArea) {
          vehicle.pitPhase = 'none';
          events.exited = true;
        }
        break;
      }
    }
    return events;
  }
}
