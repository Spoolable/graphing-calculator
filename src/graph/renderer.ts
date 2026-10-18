import type { EvalFn } from '../math/compile';
import type { ExprMode, TraceInfo } from '../state/types';
import {
  type ColumnSample,
  type CurvePoint,
  sampleCartesian,
  sampleParametricCurve,
  type Polyline,
} from './sampling';
import { formatTick, niceStep, niceTicks } from './ticks';
import { type Size, type Viewport, worldToScreenX, worldToScreenY } from './viewport';

export interface PlottableExpr {
  id: string;
  color: string;
  mode: ExprMode;
  visible: boolean;
  showDerivative: boolean;
  sliderScope: Record<string, number>;
  fn: EvalFn | null;
  dfn: EvalFn | null;
  fnX: EvalFn | null;
  fnY: EvalFn | null;
  tMin: number;
  tMax: number;
}

export interface Scene {
  viewport: Viewport;
  size: Size;
  gridVisible: boolean;
  exprs: PlottableExpr[];
  trace: TraceInfo | null;
}

export interface RenderOutput {
  cartesianSamples: Map<string, ColumnSample[]>;
  curveSamples: Map<string, CurvePoint[]>;
}

const BACKGROUND = '#0b0e13';
const GRID_COLOR = '#18202b';
const AXIS_COLOR = '#46586b';
const LABEL_COLOR = '#8b9bb0';
const FONT = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const CURVE_WIDTH = 2;
const TAU = Math.PI * 2;

export function render(ctx: CanvasRenderingContext2D, scene: Scene): RenderOutput {
  const { viewport: vp, size } = scene;
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, size.width, size.height);

  drawGridAndAxes(ctx, scene);

  const out: RenderOutput = { cartesianSamples: new Map(), curveSamples: new Map() };
  const paramCount = Math.min(20000, Math.max(600, Math.floor(size.width * 3)));

  for (const expr of scene.exprs) {
    if (!expr.visible) continue;
    if (expr.mode === 'cartesian' && expr.fn) {
      const scope = { ...expr.sliderScope };
      const f = (x: number): number => {
        scope['x'] = x;
        return expr.fn!(scope);
      };
      const samples = sampleCartesian(f, vp, size);
      out.cartesianSamples.set(expr.id, samples.columns);
      strokePolylines(ctx, samples.polylines, expr.color, CURVE_WIDTH, []);
      if (expr.showDerivative && expr.dfn) {
        const g = (x: number): number => {
          scope['x'] = x;
          return expr.dfn!(scope);
        };
        const dSamples = sampleCartesian(g, vp, size);
        out.cartesianSamples.set(`${expr.id}:d`, dSamples.columns);
        strokePolylines(ctx, dSamples.polylines, expr.color, 1.5, [6, 5]);
      }
    } else if (expr.mode === 'polar' && expr.fn) {
      const scope = { ...expr.sliderScope };
      const pointAt = (theta: number): { x: number; y: number } => {
        scope['\u03B8'] = theta;
        scope['theta'] = theta;
        scope['t'] = theta;
        const r = expr.fn!(scope);
        return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
      };
      const samples = sampleParametricCurve(pointAt, 0, TAU, paramCount, vp, size);
      out.curveSamples.set(expr.id, samples.points);
      strokePolylines(ctx, samples.polylines, expr.color, CURVE_WIDTH, []);
    } else if (expr.mode === 'parametric' && expr.fnX && expr.fnY) {
      const scope = { ...expr.sliderScope };
      const pointAt = (t: number): { x: number; y: number } => {
        scope['t'] = t;
        return { x: expr.fnX!(scope), y: expr.fnY!(scope) };
      };
      const samples = sampleParametricCurve(pointAt, expr.tMin, expr.tMax, paramCount, vp, size);
      out.curveSamples.set(expr.id, samples.points);
      strokePolylines(ctx, samples.polylines, expr.color, CURVE_WIDTH, []);
    }
  }

  if (scene.trace) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(scene.trace.sx, scene.trace.sy, 4.5, 0, TAU);
    ctx.fillStyle = scene.trace.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.stroke();
    ctx.restore();
  }

  return out;
}

function strokePolylines(
  ctx: CanvasRenderingContext2D,
  polylines: Polyline[],
  color: string,
  width: number,
  dash: number[],
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dash);
  for (const pl of polylines) {
    if (pl.pts.length < 4) continue;
    ctx.beginPath();
    ctx.moveTo(pl.pts[0], pl.pts[1]);
    for (let i = 2; i < pl.pts.length; i += 2) {
      ctx.lineTo(pl.pts[i], pl.pts[i + 1]);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawGridAndAxes(ctx: CanvasRenderingContext2D, scene: Scene): void {
  const { viewport: vp, size, gridVisible } = scene;
  const xTicks = niceTicks(vp.xmin, vp.xmax, Math.max(3, Math.floor(size.width / 90)));
  const yTicks = niceTicks(vp.ymin, vp.ymax, Math.max(3, Math.floor(size.height / 60)));
  const xStep = niceStep(vp.xmin, vp.xmax, Math.max(3, Math.floor(size.width / 90)));
  const yStep = niceStep(vp.ymin, vp.ymax, Math.max(3, Math.floor(size.height / 60)));

  if (gridVisible) {
    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const t of xTicks) {
      const sx = Math.round(worldToScreenX(vp, size, t)) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, size.height);
    }
    for (const t of yTicks) {
      const sy = Math.round(worldToScreenY(vp, size, t)) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(size.width, sy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Axes
  ctx.save();
  ctx.strokeStyle = AXIS_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const axisY = worldToScreenY(vp, size, 0);
  if (axisY >= -0.5 && axisY <= size.height + 0.5) {
    const y = Math.round(axisY) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(size.width, y);
  }
  const axisX = worldToScreenX(vp, size, 0);
  if (axisX >= -0.5 && axisX <= size.width + 0.5) {
    const x = Math.round(axisX) + 0.5;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size.height);
  }
  ctx.stroke();
  ctx.restore();

  // Labels
  ctx.save();
  ctx.fillStyle = LABEL_COLOR;
  ctx.font = FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const t of yTicks) {
    const sy = worldToScreenY(vp, size, t);
    if (sy < 10 || sy > size.height - 10) continue;
    ctx.fillText(formatTick(t, yStep), 6, sy);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  for (const t of xTicks) {
    const sx = worldToScreenX(vp, size, t);
    if (sx < 20 || sx > size.width - 20) continue;
    ctx.fillText(formatTick(t, xStep), sx, size.height - 6);
  }
  ctx.restore();
}
