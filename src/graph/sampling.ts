import { type Size, type Viewport, screenToWorldX, worldToScreenX, worldToScreenY } from './viewport';

export interface ColumnSample {
  px: number;
  wx: number;
  wy: number;
  top: number;
  bottom: number;
  valid: boolean;
}

export interface Polyline {
  /** Flat [x0, y0, x1, y1, ...] in screen pixels. */
  pts: number[];
}

export interface CartesianSamples {
  columns: ColumnSample[];
  polylines: Polyline[];
}

export interface CurvePoint {
  wx: number;
  wy: number;
  sx: number;
  sy: number;
  t: number;
}

export interface CurveSamples {
  polylines: Polyline[];
  points: CurvePoint[];
}

/**
 * Samples a Cartesian function at least once per pixel column. Each column
 * draws a vertical span (min→max of its samples), which keeps steep sections
 * solid. Columns that straddle a discontinuity (huge span crossing zero, as
 * in tan(x) or 1/x) are dropped so asymptotes are not bridged.
 */
export function sampleCartesian(
  f: (x: number) => number,
  vp: Viewport,
  size: Size,
): CartesianSamples {
  const width = Math.max(1, Math.floor(size.width));
  const height = size.height;
  const columns: ColumnSample[] = [];
  for (let px = 0; px < width; px++) {
    const wxA = screenToWorldX(vp, size, px);
    const wxB = screenToWorldX(vp, size, px + 1);
    const wxM = (wxA + wxB) / 2;
    const yA = f(wxA);
    const yM = f(wxM);
    const finite: number[] = [];
    if (Number.isFinite(yA)) finite.push(yA);
    if (Number.isFinite(yM)) finite.push(yM);
    if (finite.length === 0) {
      columns.push({ px, wx: wxM, wy: NaN, top: 0, bottom: 0, valid: false });
      continue;
    }
    let lo = finite[0];
    let hi = finite[0];
    for (const v of finite) {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const top = worldToScreenY(vp, size, hi);
    const bottom = worldToScreenY(vp, size, lo);
    const straddlesZero = lo < 0 && hi > 0;
    if (straddlesZero && bottom - top > height * 3) {
      columns.push({ px, wx: wxM, wy: NaN, top, bottom, valid: false });
      continue;
    }
    columns.push({ px, wx: wxM, wy: Number.isFinite(yM) ? yM : finite[0], top, bottom, valid: true });
  }
  return { columns, polylines: linkColumns(columns, height) };
}

function linkColumns(columns: ColumnSample[], height: number): Polyline[] {
  const polylines: Polyline[] = [];
  let current: number[] | null = null;
  let prevMid: number | null = null;
  for (const col of columns) {
    if (!col.valid) {
      if (current) {
        polylines.push({ pts: current });
        current = null;
      }
      prevMid = null;
      continue;
    }
    const mid = (col.top + col.bottom) / 2;
    if (current && prevMid !== null && Math.abs(mid - prevMid) <= height) {
      current.push(col.px, col.top, col.px, col.bottom);
    } else {
      if (current) polylines.push({ pts: current });
      current = [col.px, col.top, col.px, col.bottom];
    }
    prevMid = mid;
  }
  if (current) polylines.push({ pts: current });
  return polylines;
}

/**
 * Samples a parametric curve x(t), y(t). Breaks the polyline on non-finite
 * points and on screen-space jumps larger than 4× the canvas height.
 */
export function sampleParametricCurve(
  pointAt: (t: number) => { x: number; y: number },
  tMin: number,
  tMax: number,
  count: number,
  vp: Viewport,
  size: Size,
): CurveSamples {
  const points: CurvePoint[] = [];
  const polylines: Polyline[] = [];
  let current: number[] | null = null;
  let prevSx: number | null = null;
  let prevSy: number | null = null;
  const height = size.height;
  for (let i = 0; i <= count; i++) {
    const t = tMin + ((tMax - tMin) * i) / count;
    const p = pointAt(t);
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      if (current) {
        polylines.push({ pts: current });
        current = null;
      }
      prevSx = null;
      prevSy = null;
      continue;
    }
    const sx = worldToScreenX(vp, size, p.x);
    const sy = worldToScreenY(vp, size, p.y);
    points.push({ wx: p.x, wy: p.y, sx, sy, t });
    const far =
      prevSx !== null && prevSy !== null && Math.hypot(sx - prevSx, sy - prevSy) > height * 4;
    if (current && !far) {
      current.push(sx, sy);
    } else {
      if (current) polylines.push({ pts: current });
      current = [sx, sy];
    }
    prevSx = sx;
    prevSy = sy;
  }
  if (current) polylines.push({ pts: current });
  return { polylines, points };
}
