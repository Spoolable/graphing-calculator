import { type Node, walk } from './ast';
import { MathError } from './errors';
import { CONSTANTS, FUNCTIONS } from './functions';

/**
 * Collects the free user variables of an expression (things that should get
 * sliders). Parameter names (`x`, `θ`/`theta`/`t`, `t`) are excluded, as are
 * constants. Using a function name as a bare variable (e.g. `sin x`) produces
 * a friendly error instead of silently becoming a slider.
 */
export function analyzeVariables(node: Node, paramVars: ReadonlySet<string>): string[] {
  const found = new Set<string>();
  walk(node, (n) => {
    if (n.kind !== 'var') return;
    if (n.name in CONSTANTS) return;
    if (FUNCTIONS[n.name]) {
      throw new MathError(`"${n.name}" is a function — write it as ${n.name}(...)`, n.pos);
    }
    found.add(n.name);
  });
  return [...found].filter((v) => !paramVars.has(v));
}
