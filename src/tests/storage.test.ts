import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSettings, saveSettings } from '../persistence/storage';
import { DEFAULT_RACE_SETTINGS } from '../race/raceTypes';

// localStorage simulé pour l'environnement node.
function stubLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });
  return store;
}

describe('sauvegarde locale des réglages (§20)', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = stubLocalStorage();
  });

  it('valeurs par défaut quand rien n’est stocké', () => {
    const settings = loadSettings();
    expect(settings.masterVolume).toBe(0.8);
    expect(settings.muted).toBe(false);
    expect(settings.lastRace).toEqual(DEFAULT_RACE_SETTINGS);
  });

  it('aller-retour complet', () => {
    const settings = loadSettings();
    settings.masterVolume = 0.5;
    settings.muted = true;
    settings.lastRace = { ...settings.lastRace, carCount: 16, laps: 50, fuelLevel: 'high' };
    saveSettings(settings);
    const reloaded = loadSettings();
    expect(reloaded).toEqual(settings);
  });

  it('contenu corrompu : retour aux valeurs par défaut', () => {
    store.set('sb-racing-web:settings', '{invalid json');
    expect(loadSettings().lastRace).toEqual(DEFAULT_RACE_SETTINGS);
  });

  it('valeurs hors bornes assainies', () => {
    store.set(
      'sb-racing-web:settings',
      JSON.stringify({
        masterVolume: 7,
        muted: 'oui',
        lastRace: { carCount: 99, laps: -3, fuelLevel: 'plasma', playerNumber: 250 },
      }),
    );
    const settings = loadSettings();
    expect(settings.masterVolume).toBe(1);
    expect(settings.muted).toBe(false);
    expect(settings.lastRace.carCount).toBe(20);
    expect(settings.lastRace.laps).toBe(1);
    expect(settings.lastRace.fuelLevel).toBe('normal');
    expect(settings.lastRace.playerNumber).toBe(99);
  });
});
