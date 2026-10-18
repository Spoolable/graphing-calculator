import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { parse } from './parser';

const fn = (src: string, vars: string[] = ['x', 'a', 'b']) => compile(parse(src), vars);

describe('compiled evaluation', () => {
  it('produces NaN for missing scope values', () => {
    const f = fn('a + 1', ['a']);
    expect(Number.isNaN(f({}))).toBe(true);
    expect(f({ a: 1 })).toBe(2);
  });

  it('propagates division by zero as Infinity', () => {
    expect(fn('1/x')({ x: 0 })).toBe(Infinity);
  });

  it('matches JS Math for trigonometry', () => {
    const f = fn('sin(x) + cos(x)');
    for (const x of [0, 0.5, -1.3, 7]) {
      expect(f({ x })).toBeCloseTo(Math.sin(x) + Math.cos(x), 12);
    }
  });

  it('supports hyperbolic and inverse functions', () => {
    expect(fn('cosh(0)')({})).toBe(1);
    expect(fn('sinh(0)')({})).toBe(0);
    expect(fn('atan(1)')({})).toBeCloseTo(Math.PI / 4, 12);
    expect(fn('asin(1)')({})).toBeCloseTo(Math.PI / 2, 12);
    expect(fn('atanh(0)')({})).toBe(0);
  });

  it('mod follows floored division', () => {
    expect(fn('mod(a,b)', ['a', 'b'])({ a: 7, b: 3 })).toBe(1);
    expect(fn('mod(a,b)', ['a', 'b'])({ a: -7, b: 3 })).toBe(2);
  });
});
