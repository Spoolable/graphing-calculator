export interface FunctionSpec {
  minArgs: number;
  maxArgs: number;
}

const one = (): FunctionSpec => ({ minArgs: 1, maxArgs: 1 });
const two = (): FunctionSpec => ({ minArgs: 2, maxArgs: 2 });
const variadic = (): FunctionSpec => ({ minArgs: 1, maxArgs: Number.POSITIVE_INFINITY });

export const FUNCTIONS: Record<string, FunctionSpec> = {
  sin: one(),
  cos: one(),
  tan: one(),
  asin: one(),
  acos: one(),
  atan: one(),
  sinh: one(),
  cosh: one(),
  tanh: one(),
  asinh: one(),
  acosh: one(),
  atanh: one(),
  ln: one(),
  log: one(),
  log2: one(),
  log10: one(),
  sqrt: one(),
  cbrt: one(),
  exp: one(),
  abs: one(),
  floor: one(),
  ceil: one(),
  round: one(),
  sign: one(),
  atan2: two(),
  mod: two(),
  min: variadic(),
  max: variadic(),
  hypot: variadic(),
};

export const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  '\u03C0': Math.PI,
  e: Math.E,
  tau: Math.PI * 2,
  '\u03C4': Math.PI * 2,
};

export const CARTESIAN_VARS = new Set(['x']);
export const POLAR_VARS = new Set(['\u03B8', 'theta', 't']);
export const PARAMETRIC_VARS = new Set(['t']);
