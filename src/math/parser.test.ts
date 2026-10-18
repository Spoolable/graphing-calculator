import { describe, expect, it } from 'vitest';
import { analyzeVariables } from './analyze';
import { compile } from './compile';
import { MathError } from './errors';
import { CARTESIAN_VARS } from './functions';
import { parse } from './parser';

const ev = (src: string, scope: Record<string, number> = {}): number =>
  compile(parse(src), Object.keys(scope))(scope);

describe('operator precedence and associativity', () => {
  it('respects precedence', () => {
    expect(ev('2+3*4')).toBe(14);
    expect(ev('2*3+4')).toBe(10);
    expect(ev('(2+3)*4')).toBe(20);
    expect(ev('20/5/2')).toBe(2);
  });

  it('treats ^ as right-associative', () => {
    expect(ev('2^3^2')).toBe(512);
    expect(ev('(2^3)^2')).toBe(64);
  });

  it('handles unary minus with powers', () => {
    expect(ev('-2^2')).toBe(-4);
    expect(ev('(-2)^2')).toBe(4);
    expect(ev('2^-2')).toBe(0.25);
    expect(ev('--5')).toBe(5);
  });
});

describe('implicit multiplication', () => {
  it('multiplies adjacent factors', () => {
    expect(ev('2x', { x: 3 })).toBe(6);
    expect(ev('2(x+1)', { x: 1 })).toBe(4);
    expect(ev('x(x+1)', { x: 2 })).toBe(6);
    expect(ev('x y', { x: 2, y: 3 })).toBe(6);
    expect(ev('3sin(0)')).toBe(0);
  });

  it('binds implicit multiplication tighter than addition', () => {
    expect(ev('2x+1', { x: 3 })).toBe(7);
  });

  it('binds implicit multiplication at power precedence', () => {
    expect(ev('2x^2', { x: 3 })).toBe(18);
  });
});

describe('numbers and constants', () => {
  it('parses decimal and exponent forms', () => {
    expect(ev('2.5')).toBe(2.5);
    expect(ev('.5')).toBe(0.5);
    expect(ev('2.')).toBe(2);
    expect(ev('2.5e3')).toBe(2500);
    expect(ev('1e-2')).toBe(0.01);
  });

  it('leaves 2e as 2·e (Euler)', () => {
    expect(ev('2e')).toBeCloseTo(2 * Math.E, 12);
  });

  it('knows constants', () => {
    expect(ev('pi')).toBe(Math.PI);
    expect(ev('\u03C0')).toBe(Math.PI);
    expect(ev('tau')).toBe(2 * Math.PI);
    expect(ev('e')).toBe(Math.E);
    expect(ev('2pi')).toBeCloseTo(2 * Math.PI, 12);
    expect(ev('sin(pi/2)')).toBeCloseTo(1, 12);
  });
});

describe('functions', () => {
  it('evaluates built-ins', () => {
    expect(ev('sqrt(16)')).toBe(4);
    expect(ev('cbrt(27)')).toBe(3);
    expect(ev('ln(e)')).toBe(1);
    expect(ev('log(1000)')).toBe(3);
    expect(ev('log2(8)')).toBe(3);
    expect(ev('max(2,7)')).toBe(7);
    expect(ev('min(2,7,1)')).toBe(1);
    expect(ev('hypot(3,4)')).toBe(5);
    expect(ev('mod(-7,3)')).toBe(2);
    expect(ev('atan2(1,1)')).toBeCloseTo(Math.PI / 4, 12);
    expect(ev('abs(-3)')).toBe(3);
    expect(ev('round(2.6)')).toBe(3);
    expect(ev('floor(2.9)')).toBe(2);
    expect(ev('ceil(2.1)')).toBe(3);
    expect(ev('sign(-2)')).toBe(-1);
  });

  it('supports unicode multiplication and division signs', () => {
    expect(ev('3\u00D74')).toBe(12);
    expect(ev('8\u00F72')).toBe(4);
    expect(ev('5\u22122')).toBe(3);
  });
});

describe('errors', () => {
  it('rejects incomplete input', () => {
    expect(() => parse('2+')).toThrow(MathError);
    expect(() => parse('')).toThrow(MathError);
    expect(() => parse('(2')).toThrow(MathError);
  });

  it('reports missing parentheses', () => {
    expect(() => parse('(2+3')).toThrow(/Expected "\)"/);
  });

  it('reports bad characters and "="', () => {
    expect(() => parse('2 @ 3')).toThrow(MathError);
    expect(() => parse('y = x')).toThrow(/no "=" needed/);
  });

  it('reports unknown names at compile time', () => {
    // foo(2) parses as foo*(2), so foo is just an unknown variable
    expect(() => compile(parse('foo(2)'), [])).toThrow(/Unknown variable "foo"/);
    expect(() => compile(parse('a*x'), [])).toThrow(/Unknown variable "a"/);
    compile(parse('a*x'), ['a', 'x'])({ a: 2, x: 3 });
  });

  it('checks arity', () => {
    expect(() => compile(parse('sin(1,2)'))).toThrow(/takes 1 argument, got 2/);
    expect(() => parse('sqrt()')).toThrow(/at least one argument/);
  });

  it('turns "sin x" into a helpful error', () => {
    expect(() => analyzeVariables(parse('sin x'), CARTESIAN_VARS)).toThrow(/is a function/);
  });
});
