import { DEFAULT_VIEWPORT, type Viewport } from '../graph/viewport';
import type { ExprMode, PersistedExpr, PersistedState, Slider } from './types';

const STORAGE_KEY = 'graphing-calculator-v1';
const MODES = new Set<ExprMode>(['cartesian', 'polar', 'parametric']);

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitize(JSON.parse(raw));
  } catch {
    return null;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asNum(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function asStr(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function asBool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function sanitize(data: unknown): PersistedState | null {
  if (!isRecord(data)) return null;
  const exprsRaw = data['expressions'];
  if (!Array.isArray(exprsRaw)) return null;

  const expressions: PersistedExpr[] = [];
  let index = 0;
  for (const item of exprsRaw) {
    if (!isRecord(item)) continue;
    const mode = asStr(item['mode']);
    if (!MODES.has(mode as ExprMode)) continue;
    const sliders: Slider[] = [];
    const slidersRaw = item['sliders'];
    if (Array.isArray(slidersRaw)) {
      for (const s of slidersRaw) {
        if (!isRecord(s)) continue;
        const name = asStr(s['name']);
        if (!name) continue;
        const min = asNum(s['min'], -10);
        const max = asNum(s['max'], 10);
        sliders.push({
          name,
          min,
          max,
          step: asNum(s['step'], 0.01),
          value: asNum(s['value'], 1),
        });
      }
    }
    expressions.push({
      id: asStr(item['id']) || `expr-${index}-${Date.now()}`,
      mode: mode as ExprMode,
      color: asStr(item['color']),
      visible: asBool(item['visible'], true),
      showDerivative: asBool(item['showDerivative'], false),
      source: asStr(item['source']),
      sourceX: asStr(item['sourceX']),
      sourceY: asStr(item['sourceY']),
      tMin: asNum(item['tMin'], 0),
      tMax: asNum(item['tMax'], Math.PI * 2),
      sliders,
    });
    index++;
  }

  let viewport: Viewport = { ...DEFAULT_VIEWPORT };
  const vpRaw = data['viewport'];
  if (isRecord(vpRaw)) {
    const candidate: Viewport = {
      xmin: asNum(vpRaw['xmin'], viewport.xmin),
      xmax: asNum(vpRaw['xmax'], viewport.xmax),
      ymin: asNum(vpRaw['ymin'], viewport.ymin),
      ymax: asNum(vpRaw['ymax'], viewport.ymax),
    };
    if (candidate.xmax > candidate.xmin && candidate.ymax > candidate.ymin) {
      viewport = candidate;
    }
  }

  const history = Array.isArray(data['history'])
    ? data['history'].filter((h): h is string => typeof h === 'string').slice(0, 60)
    : [];

  const variables: Slider[] = [];
  const varsRaw = data['variables'];
  if (Array.isArray(varsRaw)) {
    for (const v of varsRaw) {
      if (!isRecord(v)) continue;
      const name = asStr(v['name']).trim().toLowerCase();
      if (!name || variables.some((existing) => existing.name === name)) continue;
      const min = asNum(v['min'], -10);
      const max = asNum(v['max'], 10);
      if (!(max > min)) continue;
      const value = Math.min(max, Math.max(min, asNum(v['value'], 1)));
      variables.push({
        name,
        min,
        max,
        step: asNum(v['step'], (max - min) / 500),
        value,
      });
    }
  }

  return {
    expressions,
    history,
    viewport,
    gridVisible: asBool(data['gridVisible'], true),
    themeId: asStr(data['themeId']),
    variables,
  };
}
