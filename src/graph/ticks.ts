/** A "nice" step size using the 1–2–5 rounding rule. */
export function niceStep(min: number, max: number, targetCount: number): number {
  const raw = (max - min) / Math.max(1, targetCount);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  return mag * (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10);
}

/** Tick values in [min, max] on a nice step. */
export function niceTicks(min: number, max: number, targetCount: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return [];
  const step = niceStep(min, max, targetCount);
  if (!(step > 0)) return [];
  const start = Math.ceil(min / step - 1e-9) * step;
  const ticks: number[] = [];
  for (let k = 0; k < 2000; k++) {
    const v = start + k * step;
    if (v > max + step * 1e-9) break;
    ticks.push(v === 0 ? 0 : v);
  }
  return ticks;
}

/** Formats a tick value based on the step's precision. */
export function formatTick(value: number, step: number): string {
  if (Math.abs(value) < Math.abs(step) * 1e-6) return '0';
  const absStep = Math.abs(step);
  if (absStep >= 1e6 || absStep < 1e-4) {
    return value.toExponential(3);
  }
  const decimals = Math.min(12, Math.max(0, -Math.floor(Math.log10(absStep) + 1e-9)));
  return String(parseFloat(value.toFixed(decimals)));
}
