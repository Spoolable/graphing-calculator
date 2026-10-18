import type { Viewport } from '../graph/viewport';

export type ExprMode = 'cartesian' | 'polar' | 'parametric';

export interface Slider {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

export interface ExprError {
  message: string;
  pos: number;
}

export interface PersistedExpr {
  id: string;
  mode: ExprMode;
  color: string;
  visible: boolean;
  showDerivative: boolean;
  source: string;
  sourceX: string;
  sourceY: string;
  tMin: number;
  tMax: number;
  sliders: Slider[];
}

export interface PersistedState {
  expressions: PersistedExpr[];
  history: string[];
  viewport: Viewport;
  gridVisible: boolean;
}

export interface TraceInfo {
  exprId: string;
  color: string;
  rows: Array<[string, string]>;
  sx: number;
  sy: number;
}
