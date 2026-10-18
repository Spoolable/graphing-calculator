import { type Node, binary, callNode, neg, num } from './ast';
import { MathError } from './errors';

const n = num;

function isNum(node: Node, value: number): boolean {
  return node.kind === 'num' && node.value === value;
}

/** Light algebraic simplification so derivative trees stay small and fast. */
export function simplify(node: Node): Node {
  switch (node.kind) {
    case 'num':
    case 'var':
      return node;
    case 'neg': {
      const arg = simplify(node.arg);
      if (arg.kind === 'num') return n(-arg.value);
      if (arg.kind === 'neg') return arg.arg;
      return neg(arg);
    }
    case 'call':
      return { ...node, args: node.args.map(simplify) };
    case 'binary': {
      const l = simplify(node.left);
      const r = simplify(node.right);
      const op = node.op;
      if (l.kind === 'num' && r.kind === 'num') {
        const a = l.value;
        const b = r.value;
        let v: number | undefined;
        switch (op) {
          case 'add':
            v = a + b;
            break;
          case 'sub':
            v = a - b;
            break;
          case 'mul':
            v = a * b;
            break;
          case 'div':
            if (b !== 0) v = a / b;
            break;
          case 'pow':
            if (!(a === 0 && b < 0) && !(a < 0 && !Number.isInteger(b))) v = Math.pow(a, b);
            break;
        }
        if (v !== undefined && Number.isFinite(v)) return n(v);
      }
      if (op === 'add') {
        if (isNum(l, 0)) return r;
        if (isNum(r, 0)) return l;
      }
      if (op === 'sub') {
        if (isNum(r, 0)) return l;
        if (isNum(l, 0)) return neg(r);
      }
      if (op === 'mul') {
        if (isNum(l, 0) || isNum(r, 0)) return n(0);
        if (isNum(l, 1)) return r;
        if (isNum(r, 1)) return l;
      }
      if (op === 'div') {
        if (isNum(r, 1)) return l;
        if (isNum(l, 0) && r.kind === 'num' && r.value !== 0) return n(0);
      }
      if (op === 'pow') {
        if (isNum(r, 1)) return l;
        if (isNum(r, 0)) return n(1);
      }
      return binary(op, l, r);
    }
  }
}

function differentiateNode(node: Node, variable: string): Node {
  switch (node.kind) {
    case 'num':
      return n(0);
    case 'var':
      return n(node.name === variable ? 1 : 0);
    case 'neg':
      return neg(differentiateNode(node.arg, variable));
    case 'binary': {
      const l = node.left;
      const r = node.right;
      const dl = differentiateNode(l, variable);
      const dr = differentiateNode(r, variable);
      switch (node.op) {
        case 'add':
          return binary('add', dl, dr);
        case 'sub':
          return binary('sub', dl, dr);
        case 'mul':
          return binary('add', binary('mul', dl, r), binary('mul', l, dr));
        case 'div':
          return binary(
            'div',
            binary('sub', binary('mul', dl, r), binary('mul', l, dr)),
            binary('pow', r, n(2)),
          );
        case 'pow':
          if (r.kind === 'num') {
            return binary(
              'mul',
              binary('mul', n(r.value), binary('pow', l, n(r.value - 1))),
              dl,
            );
          }
          // General case: d(a^b) = a^b · (b'·ln a + b·a'/a)
          return binary(
            'mul',
            node,
            binary(
              'add',
              binary('mul', dr, callNode('ln', [l], 0)),
              binary('mul', r, binary('div', dl, l)),
            ),
          );
      }
      break;
    }
    case 'call':
      return differentiateCall(node, variable);
  }
  throw new MathError('Cannot differentiate this expression', 0);
}

function differentiateCall(
  node: Extract<Node, { kind: 'call' }>,
  variable: string,
): Node {
  const u = node.args[0];
  const du = differentiateNode(u, variable);
  const chain = (body: Node): Node => binary('mul', body, du);
  const u2 = binary('pow', u, n(2));
  switch (node.name) {
    case 'sin':
      return chain(callNode('cos', [u], node.pos));
    case 'cos':
      return chain(neg(callNode('sin', [u], node.pos)));
    case 'tan':
      return chain(binary('div', n(1), binary('pow', callNode('cos', [u], node.pos), n(2))));
    case 'asin':
      return chain(binary('div', n(1), callNode('sqrt', [binary('sub', n(1), u2)], node.pos)));
    case 'acos':
      return chain(neg(binary('div', n(1), callNode('sqrt', [binary('sub', n(1), u2)], node.pos))));
    case 'atan':
      return chain(binary('div', n(1), binary('add', n(1), u2)));
    case 'sinh':
      return chain(callNode('cosh', [u], node.pos));
    case 'cosh':
      return chain(callNode('sinh', [u], node.pos));
    case 'tanh':
      return chain(binary('sub', n(1), binary('pow', callNode('tanh', [u], node.pos), n(2))));
    case 'asinh':
      return chain(binary('div', n(1), callNode('sqrt', [binary('add', u2, n(1))], node.pos)));
    case 'acosh':
      return chain(binary('div', n(1), callNode('sqrt', [binary('sub', u2, n(1))], node.pos)));
    case 'atanh':
      return chain(binary('div', n(1), binary('sub', n(1), u2)));
    case 'ln':
      return chain(binary('div', n(1), u));
    case 'log':
    case 'log10':
      return chain(binary('div', n(1), binary('mul', u, n(Math.LN10))));
    case 'log2':
      return chain(binary('div', n(1), binary('mul', u, n(Math.LN2))));
    case 'sqrt':
      return chain(binary('div', n(1), binary('mul', n(2), callNode('sqrt', [u], node.pos))));
    case 'cbrt':
      return chain(
        binary('div', n(1), binary('mul', n(3), binary('pow', callNode('cbrt', [u], node.pos), n(2)))),
      );
    case 'exp':
      return chain(callNode('exp', [u], node.pos));
    case 'abs':
      return chain(binary('div', u, callNode('abs', [u], node.pos)));
    case 'atan2': {
      const y = node.args[0];
      const x = node.args[1];
      const dy = differentiateNode(y, variable);
      const dx = differentiateNode(x, variable);
      return binary(
        'div',
        binary('sub', binary('mul', x, dy), binary('mul', y, dx)),
        binary('add', binary('pow', x, n(2)), binary('pow', y, n(2))),
      );
    }
    default:
      throw new MathError(`The derivative of "${node.name}" is not supported`, node.pos);
  }
}

/** Symbolic differentiation with a light simplification pass. */
export function differentiate(node: Node, variable: string): Node {
  return simplify(differentiateNode(node, variable));
}
