import { worldToScreenX, worldToScreenY, type Size } from '../graph/viewport';
import type { RenderOutput } from '../graph/renderer';
import type { Store } from '../state/store';
import type { TraceInfo } from '../state/types';

const TRACE_RADIUS = 40;

export function formatNum(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e6 || abs < 1e-4) return value.toExponential(4);
  return String(parseFloat(value.toFixed(6)));
}

function numericDerivative(
  fn: (scope: Record<string, number>) => number,
  sliderScope: Record<string, number>,
  x: number,
): number {
  const scope = { ...sliderScope };
  const h = Math.max(1e-7, Math.abs(x) * 1e-7);
  scope['x'] = x + h;
  const f1 = fn(scope);
  scope['x'] = x - h;
  const f0 = fn(scope);
  return (f1 - f0) / (2 * h);
}

/** Finds the nearest plottable curve point to a screen position. */
export function pickTrace(
  store: Store,
  output: RenderOutput,
  px: number,
  py: number,
  size: Size,
): TraceInfo | null {
  let best: TraceInfo | null = null;
  let bestDist = TRACE_RADIUS;

  for (const rec of store.exprs) {
    if (!rec.visible) continue;

    if (rec.mode === 'cartesian') {
      const columns = output.cartesianSamples.get(rec.id);
      if (!columns || columns.length === 0) continue;
      const idx = Math.max(0, Math.min(columns.length - 1, Math.floor(px)));
      const col = columns[idx];
      if (!col || !col.valid) continue;
      const sx = worldToScreenX(store.viewport, size, col.wx);
      const sy = worldToScreenY(store.viewport, size, col.wy);
      const dist = Math.abs(sy - py);
      if (dist >= bestDist) continue;
      bestDist = dist;
      const rows: Array<[string, string]> = [
        ['x', formatNum(col.wx)],
        ['y', formatNum(col.wy)],
      ];
      if (rec.fn) {
        const slope = numericDerivative(rec.fn, rec.sliderScope, col.wx);
        if (Number.isFinite(slope)) rows.push(["y'", formatNum(slope)]);
      }
      best = { exprId: rec.id, color: rec.color, rows, sx, sy };
    } else {
      const points = output.curveSamples.get(rec.id);
      if (!points) continue;
      for (const pt of points) {
        const dist = Math.hypot(pt.sx - px, pt.sy - py);
        if (dist >= bestDist) continue;
        bestDist = dist;
        const rows: Array<[string, string]> =
          rec.mode === 'polar'
            ? [
                ['r', formatNum(Math.hypot(pt.wx, pt.wy))],
                ['\u03B8', formatNum(pt.t)],
              ]
            : [
                ['t', formatNum(pt.t)],
                ['x', formatNum(pt.wx)],
                ['y', formatNum(pt.wy)],
              ];
        best = { exprId: rec.id, color: rec.color, rows, sx: pt.sx, sy: pt.sy };
      }
    }
  }
  return best;
}

export function initTraceOverlay(): (info: TraceInfo | null, pinned: boolean) => void {
  const el = document.getElementById('trace-overlay');
  if (!el) return () => undefined;
  return (info, pinned) => {
    if (!info) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = '';

    const swatch = document.createElement('span');
    swatch.className = 'trace-swatch';
    swatch.style.background = info.color;
    el.appendChild(swatch);

    const rowsWrap = document.createElement('div');
    rowsWrap.className = 'trace-rows';
    for (const [label, value] of info.rows) {
      const line = document.createElement('div');
      const key = document.createElement('span');
      key.className = 'trace-key';
      key.textContent = `${label} =`;
      const val = document.createElement('span');
      val.className = 'trace-val';
      val.textContent = value;
      line.append(key, val);
      rowsWrap.appendChild(line);
    }
    el.appendChild(rowsWrap);

    if (pinned) {
      const pin = document.createElement('div');
      pin.className = 'trace-pinned';
      pin.textContent = 'pinned — click graph to release';
      el.appendChild(pin);
    }
  };
}
