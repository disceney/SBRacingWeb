/** Formatage des durées de course : "1:23.456" ou "23.456". */
export function formatLapTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--.---';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  const restStr = rest.toFixed(3).padStart(6, '0');
  return minutes > 0 ? `${minutes}:${restStr}` : restStr;
}

/** Formatage d'un temps total long : "12:34.567". */
export function formatTotalTime(seconds: number | null): string {
  return formatLapTime(seconds);
}

/** Formatage d'un écart : "+3.412" ou "+1:02.345". */
export function formatGap(seconds: number | null): string {
  if (seconds === null) return '—';
  return `+${formatLapTime(seconds)}`;
}
