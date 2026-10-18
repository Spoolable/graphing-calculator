import { analyzeVariables } from '../math/analyze';
import { compile, type EvalFn } from '../math/compile';
import { differentiate } from '../math/derivatives';
import { MathError } from '../math/errors';
import {
  CARTESIAN_VARS,
  PARAMETRIC_VARS,
  POLAR_VARS,
} from '../math/functions';
import { type Node } from '../math/ast';
import { parse } from '../math/parser';
import {
  DEFAULT_VIEWPORT,
  panPixels,
  type Size,
  type Viewport,
  zoomAt,
} from '../graph/viewport';
import { DEFAULT_THEME_ID, getTheme, normalizeThemeId } from '../theme/themes';
import { type PersistedState, type Slider, type TraceInfo } from './types';

export const TAU = Math.PI * 2;

const DEFAULT_SLIDER: Omit<Slider, 'name'> = { min: -10, max: 10, step: 0.01, value: 1 };

export interface ExprRecord {
  id: string;
  mode: 'cartesian' | 'polar' | 'parametric';
  color: string;
  visible: boolean;
  showDerivative: boolean;
  source: string;
  sourceX: string;
  sourceY: string;
  tMin: number;
  tMax: number;
  sliders: Slider[];
  sliderScope: Record<string, number>;
  error: { message: string; pos: number } | null;
  fn: EvalFn | null;
  dfn: EvalFn | null;
  fnX: EvalFn | null;
  fnY: EvalFn | null;
}

export interface NewExprInput {
  mode: 'cartesian' | 'polar' | 'parametric';
  source?: string;
  sourceX?: string;
  sourceY?: string;
  tMin?: number;
  tMax?: number;
}

export class Store {
  exprs: ExprRecord[] = [];
  history: string[] = [];
  viewport: Viewport = { ...DEFAULT_VIEWPORT };
  gridVisible = true;
  themeId = DEFAULT_THEME_ID;
  trace: TraceInfo | null = null;
  tracePinned = false;

  private listeners = new Set<() => void>();
  private nextId = 1;

  subscribe(fn: () => void): void {
    this.listeners.add(fn);
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }

  hydrate(saved: PersistedState | null): void {
    this.themeId = normalizeThemeId(saved?.themeId);
    if (saved && saved.expressions.length > 0) {
      const palette = getTheme(this.themeId).palette;
      this.exprs = saved.expressions.map((e, i) => {
        const rec = this.makeRecord(
          e.mode,
          e.source,
          e.sourceX,
          e.sourceY,
          e.tMin,
          e.tMax,
          e.color || palette[i % palette.length],
        );
        rec.id = e.id;
        rec.visible = e.visible;
        rec.showDerivative = e.showDerivative;
        rec.sliders = e.sliders.map((s) => ({ ...s }));
        return rec;
      });
      this.history = [...saved.history];
      this.viewport = { ...saved.viewport };
      this.gridVisible = saved.gridVisible;
      this.recompileAll();
    } else {
      this.addExpression({ mode: 'cartesian', source: 'sin(x)' });
      this.addExpression({ mode: 'cartesian', source: 'x^2/8 - 2' });
    }
    this.notify();
  }

  private makeRecord(
    mode: ExprRecord['mode'],
    source: string,
    sourceX: string,
    sourceY: string,
    tMin: number,
    tMax: number,
    color: string,
  ): ExprRecord {
    return {
      id: `expr-${this.nextId++}`,
      mode,
      color,
      visible: true,
      showDerivative: false,
      source,
      sourceX,
      sourceY,
      tMin,
      tMax,
      sliders: [],
      sliderScope: {},
      error: null,
      fn: null,
      dfn: null,
      fnX: null,
      fnY: null,
    };
  }

  addExpression(input: NewExprInput): string {
    const palette = getTheme(this.themeId).palette;
    const rec = this.makeRecord(
      input.mode,
      input.source ?? '',
      input.sourceX ?? '',
      input.sourceY ?? '',
      input.tMin ?? 0,
      input.tMax ?? TAU,
      palette[this.exprs.length % palette.length],
    );
    this.recompile(rec);
    this.exprs.push(rec);
    this.notify();
    return rec.id;
  }

  updateSource(id: string, source: string): void {
    const rec = this.byId(id);
    if (!rec) return;
    rec.source = source;
    this.recompile(rec);
    this.notify();
  }

  updateParamSources(id: string, sourceX: string, sourceY: string): void {
    const rec = this.byId(id);
    if (!rec) return;
    rec.sourceX = sourceX;
    rec.sourceY = sourceY;
    this.recompile(rec);
    this.notify();
  }

  updateTRange(id: string, tMin: number, tMax: number): void {
    const rec = this.byId(id);
    if (!rec) return;
    rec.tMin = tMin;
    rec.tMax = tMax;
    this.notify();
  }

  setVisible(id: string, visible: boolean): void {
    const rec = this.byId(id);
    if (!rec) return;
    rec.visible = visible;
    if (!visible && this.trace && this.matchesExpr(this.trace, rec)) {
      this.trace = null;
      this.tracePinned = false;
    }
    this.notify();
  }

  toggleDerivative(id: string): void {
    const rec = this.byId(id);
    if (!rec || rec.mode !== 'cartesian') return;
    rec.showDerivative = !rec.showDerivative;
    this.recompile(rec);
    this.notify();
  }

  setSliderValue(id: string, name: string, value: number): void {
    const rec = this.byId(id);
    if (!rec || !Number.isFinite(value)) return;
    const slider = rec.sliders.find((s) => s.name === name);
    if (!slider) return;
    slider.value = Math.min(slider.max, Math.max(slider.min, value));
    rec.sliderScope[name] = slider.value;
    this.notify();
  }

  setSliderRange(id: string, name: string, min: number, max: number): void {
    const rec = this.byId(id);
    if (!rec || !Number.isFinite(min) || !Number.isFinite(max) || min >= max) return;
    const slider = rec.sliders.find((s) => s.name === name);
    if (!slider) return;
    slider.min = min;
    slider.max = max;
    slider.step = (max - min) / 500;
    slider.value = Math.min(max, Math.max(min, slider.value));
    rec.sliderScope[name] = slider.value;
    this.notify();
  }

  removeExpression(id: string): void {
    const index = this.exprs.findIndex((e) => e.id === id);
    if (index === -1) return;
    this.exprs.splice(index, 1);
    this.notify();
  }

  pushHistory(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.history = [trimmed, ...this.history.filter((h) => h !== trimmed)].slice(0, 60);
    this.notify();
  }

  setViewport(vp: Viewport): void {
    this.viewport = vp;
    this.notify();
  }

  zoomAt(px: number, py: number, factor: number, size: Size): void {
    this.setViewport(zoomAt(this.viewport, size, px, py, factor));
  }

  panBy(dxPx: number, dyPx: number, size: Size): void {
    this.setViewport(panPixels(this.viewport, size, dxPx, dyPx));
  }

  resetViewport(): void {
    this.setViewport({ ...DEFAULT_VIEWPORT });
  }

  setGridVisible(visible: boolean): void {
    this.gridVisible = visible;
    this.notify();
  }

  setTheme(id: string): void {
    const theme = getTheme(id);
    if (theme.id === this.themeId) return;
    this.themeId = theme.id;
    this.notify();
  }

  setTrace(info: TraceInfo | null, pinned: boolean): void {
    this.trace = info;
    this.tracePinned = pinned;
    this.notify();
  }

  snapshot(): PersistedState {
    return {
      expressions: this.exprs.map((e) => ({
        id: e.id,
        mode: e.mode,
        color: e.color,
        visible: e.visible,
        showDerivative: e.showDerivative,
        source: e.source,
        sourceX: e.sourceX,
        sourceY: e.sourceY,
        tMin: e.tMin,
        tMax: e.tMax,
        sliders: e.sliders.map((s) => ({ ...s })),
      })),
      history: [...this.history],
      viewport: { ...this.viewport },
      gridVisible: this.gridVisible,
      themeId: this.themeId,
    };
  }

  private byId(id: string): ExprRecord | null {
    return this.exprs.find((e) => e.id === id) ?? null;
  }

  private matchesExpr(info: TraceInfo, rec: ExprRecord): boolean {
    return info.exprId === rec.id;
  }

  private recompileAll(): void {
    for (const rec of this.exprs) this.recompile(rec);
  }

  private recompile(rec: ExprRecord): void {
    rec.fn = null;
    rec.dfn = null;
    rec.fnX = null;
    rec.fnY = null;
    rec.error = null;
    try {
      if (rec.mode === 'parametric') {
        const ax = parseSource(rec.sourceX, 'x(t)');
        const ay = parseSource(rec.sourceY, 'y(t)');
        const vars = unique([
          ...analyzeVariables(ax, PARAMETRIC_VARS),
          ...analyzeVariables(ay, PARAMETRIC_VARS),
        ]);
        const allowed = new Set([...vars, 't']);
        rec.fnX = compile(ax, allowed);
        rec.fnY = compile(ay, allowed);
        rec.sliders = reconcileSliders(rec.sliders, vars);
      } else {
        const label = rec.mode === 'polar' ? 'r = f(\u03B8)' : 'y = f(x)';
        const ast = parseSource(rec.source, label);
        const paramVars = rec.mode === 'polar' ? POLAR_VARS : CARTESIAN_VARS;
        const vars = analyzeVariables(ast, paramVars);
        const extra = rec.mode === 'polar' ? ['\u03B8', 'theta', 't'] : ['x'];
        const allowed = new Set([...vars, ...extra]);
        rec.fn = compile(ast, allowed);
        rec.sliders = reconcileSliders(rec.sliders, vars);
        if (rec.mode === 'cartesian' && rec.showDerivative) {
          rec.dfn = compile(differentiate(ast, 'x'), allowed);
        }
      }
      rec.sliderScope = scopeFrom(rec.sliders);
    } catch (e) {
      if (e instanceof MathError) {
        rec.error = { message: e.message, pos: e.pos };
      } else {
        rec.error = { message: e instanceof Error ? e.message : String(e), pos: 0 };
      }
      rec.sliders = [];
      rec.sliderScope = {};
    }
  }
}

function parseSource(source: string, label: string): Node {
  if (source.trim() === '') {
    throw new MathError(`Enter an expression for ${label}`, 0);
  }
  return parse(source);
}

function unique(names: string[]): string[] {
  return [...new Set(names)];
}

function reconcileSliders(existing: Slider[], vars: string[]): Slider[] {
  return vars.map((name) => {
    const prev = existing.find((s) => s.name === name);
    return prev ? { ...prev } : { name, ...DEFAULT_SLIDER };
  });
}

function scopeFrom(sliders: Slider[]): Record<string, number> {
  const scope: Record<string, number> = {};
  for (const s of sliders) scope[s.name] = s.value;
  return scope;
}
