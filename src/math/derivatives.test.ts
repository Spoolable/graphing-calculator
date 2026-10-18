import { describe, expect, it } from 'vitest';
import { compile } from './compile';
import { differentiate } from './derivatives';
import { MathError } from './errors';
import { parse } from './parser';

const derivative = (src: string, variable = 'x') => {
  const ast = differentiate(parse(src), variable);
  const f = compile(ast, ['x', variable]);
  return (x: number): number => f({ x, [variable]: x });
};

const expectMatches = (
  f: (x: number) => number,
  g: (x: number) => number,
  points: number[],
): void => {
  for (const x of points) expect(f(x)).toBeCloseTo(g(x), 8);
};

describe('symbolic differentiation', () => {
  it('differentiates constants and identity', () => {
    expectMatches(derivative('5'), () => 0, [0, 1, -3]);
    expectMatches(derivative('x'), () => 1, [0, 2, -5]);
  });

  it('power rule', () => {
    expectMatches(derivative('x^3'), (x) => 3 * x * x, [-2, 0.5, 4]);
    expectMatches(derivative('x^2 + 3x + 1'), (x) => 2 * x + 3, [-4, 0, 2.5]);
    expectMatches(derivative('4sqrt(x)'), (x) => 2 / Math.sqrt(x), [1, 4, 9]);
  });

  it('reciprocal', () => {
    expectMatches(derivative('1/x'), (x) => -1 / (x * x), [0.7, 2, -3]);
  });

  it('trig and exponential', () => {
    expectMatches(derivative('sin(x)'), Math.cos, [0, 0.5, 1.3, -2]);
    expectMatches(derivative('cos(x)'), (x) => -Math.sin(x), [0, 0.5, 1.3, -2]);
    expectMatches(derivative('tan(x)'), (x) => 1 / Math.cos(x) ** 2, [-0.7, 0, 0.9]);
    expectMatches(derivative('exp(x)'), Math.exp, [-1, 0, 2]);
    expectMatches(derivative('ln(x)'), (x) => 1 / x, [0.5, 1, 10]);
    expectMatches(derivative('atan(x)'), (x) => 1 / (1 + x * x), [-3, 0, 3]);
    expectMatches(derivative('sinh(x)'), Math.cosh, [-1, 0, 1]);
  });

  it('chain rule', () => {
    expectMatches(derivative('sin(x^2)'), (x) => 2 * x * Math.cos(x * x), [-1, 0.5, 2]);
    expectMatches(derivative('exp(3x)'), (x) => 3 * Math.exp(3 * x), [-1, 0, 1]);
  });

  it('product and quotient rules', () => {
    expectMatches(derivative('x*sin(x)'), (x) => Math.sin(x) + x * Math.cos(x), [-1, 1, 3]);
    expectMatches(
      derivative('x/(x+1)'),
      (x) => 1 / ((x + 1) * (x + 1)),
      [-0.5, 0, 4],
    );
  });

  it('general power a^b', () => {
    expectMatches(derivative('x^x'), (x) => Math.pow(x, x) * (Math.log(x) + 1), [1, 2, 5]);
  });

  it('differentiates with respect to other variables', () => {
    const f = derivative('t^2', 't');
    expect(f(3)).toBeCloseTo(6, 10);
  });

  it('keeps free variables so sliders still work', () => {
    const ast = differentiate(parse('a*x^2'), 'x');
    const f = compile(ast, ['a', 'x']);
    expect(f({ a: 3, x: 2 })).toBeCloseTo(12, 10);
  });

  it('refuses unsupported derivatives', () => {
    expect(() => differentiate(parse('floor(x)'), 'x')).toThrow(MathError);
    expect(() => differentiate(parse('max(x,2)'), 'x')).toThrow(/not supported/);
  });
});
