import { type Node } from './ast';
import { MathError } from './errors';
import { CONSTANTS, FUNCTIONS } from './functions';

export type EvalFn = (scope: Record<string, number>) => number;

function emit(node: Node, vars: Set<string>): string {
  switch (node.kind) {
    case 'num':
      return `(${node.value})`;
    case 'var': {
      const c = CONSTANTS[node.name];
      if (c !== undefined) return `(${c})`;
      if (!vars.has(node.name)) {
        throw new MathError(`Unknown variable "${node.name}"`, node.pos);
      }
      return `(V[${JSON.stringify(node.name)}])`;
    }
    case 'neg':
      return `(-(${emit(node.arg, vars)}))`;
    case 'binary': {
      const l = emit(node.left, vars);
      const r = emit(node.right, vars);
      switch (node.op) {
        case 'add':
          return `((${l})+(${r}))`;
        case 'sub':
          return `((${l})-(${r}))`;
        case 'mul':
          return `((${l})*(${r}))`;
        case 'div':
          return `((${l})/(${r}))`;
        case 'pow':
          return `Math.pow(${l},${r})`;
      }
      break;
    }
    case 'call': {
      const spec = FUNCTIONS[node.name];
      if (!spec) throw new MathError(`Unknown function "${node.name}"`, node.pos);
      const n = node.args.length;
      if (n < spec.minArgs || n > spec.maxArgs) {
        const want =
          spec.maxArgs === Number.POSITIVE_INFINITY
            ? `at least ${spec.minArgs}`
            : spec.minArgs === spec.maxArgs
              ? `${spec.minArgs}`
              : `${spec.minArgs} or ${spec.maxArgs}`;
        throw new MathError(`"${node.name}" takes ${want} argument${spec.maxArgs === 1 ? '' : 's'}, got ${n}`, node.pos);
      }
      const args = node.args.map((a) => emit(a, vars));
      if (node.name === 'mod') {
        const [a, b] = args;
        return `(((${a})-(${b})*Math.floor((${a})/(${b}))))`;
      }
      const mathName = node.name === 'ln' ? 'log' : node.name === 'log' ? 'log10' : node.name;
      return `Math.${mathName}(${args.join(',')})`;
    }
  }
  throw new MathError('Invalid expression', 0);
}

export function compile(node: Node, variables: Iterable<string> = []): EvalFn {
  const vars = new Set(variables);
  const body = emit(node, vars);
  let inner: (V: Record<string, number>) => number;
  try {
    inner = new Function('V', `return (${body});`) as (V: Record<string, number>) => number;
  } catch {
    throw new MathError('Expression could not be compiled', 0);
  }
  return (scope) => inner(scope);
}
