const MIN_SECONDS = 1 / 8000;
const MAX_SECONDS = 14400;

export function parseShutterSpeedInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const fractionMatch = /^(\d+)\s*\/\s*(\d+)$/.exec(trimmed);
  if (fractionMatch) {
    const num = Number(fractionMatch[1]);
    const den = Number(fractionMatch[2]);
    if (den === 0) return null;
    const v = num / den;
    return Number.isFinite(v) && v >= MIN_SECONDS && v <= MAX_SECONDS ? v : null;
  }

  const v = Number(trimmed);
  if (!Number.isFinite(v) || Number.isNaN(v)) return null;
  return v >= MIN_SECONDS && v <= MAX_SECONDS ? v : null;
}

export function formatShutterSpeed(seconds: number): string {
  if (seconds < 1) {
    const n = Math.round(1 / seconds);
    if (Math.abs(seconds - 1 / n) / seconds < 0.001) return `1/${n}`;
    return `${parseFloat(seconds.toPrecision(4))}s`;
  }
  return `${parseFloat(seconds.toPrecision(6))}s`;
}
