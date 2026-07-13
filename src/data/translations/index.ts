import { fr, type TranslationKey } from './fr';

/**
 * Traduction d'une clé avec interpolation `{nom}`. Le MVP ne livre que le
 * français ; l'anglais se branchera ici en 1.0 (§25).
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  let text: string = fr[key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export type { TranslationKey };
