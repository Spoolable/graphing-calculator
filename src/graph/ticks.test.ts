import { describe, expect, it } from 'vitest';
import { formatTick, niceStep, niceTicks } from './ticks';

describe('niceTicks', () => {
  it('produces 1–2–5 ticks covering the range', () => {
    const ticks = niceTicks(-10, 10, 8);
    expect(ticks[0]).toBeCloseTo(-10, 9);
    expect(ticks[ticks.length - 1]).toBeCloseTo(10, 9);
    for (const t of ticks) expect(t % 2).toBeCloseTo(0, 9);
  });

  it('uses fractional steps for small ranges', () => {
    const ticks = niceTicks(0, 1, 5);
    expect(ticks).toContain(0);
    expect(ticks[1]).toBeCloseTo(0.2, 9);
    expect(ticks[ticks.length - 1]).toBeCloseTo(1, 9);
  });

  it('handles tiny ranges around non-round numbers', () => {
    const ticks = niceTicks(0.999, 1.001, 8);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.some((t) => Math.abs(t - 1) < 1e-9)).toBe(true);
  });

  it('handles huge ranges', () => {
    const ticks = niceTicks(0, 1e9, 8);
    expect(ticks).toContain(0);
    expect(ticks).toContain(1e9);
  });

  it('returns nothing for degenerate ranges', () => {
    expect(niceTicks(5, 5, 8)).toEqual([]);
    expect(niceTicks(10, -10, 8)).toEqual([]);
    expect(niceTicks(NaN, 10, 8)).toEqual([]);
  });
});

describe('niceStep', () => {
  it('rounds to 1, 2, 5 or 10 times a power of ten', () => {
    expect(niceStep(0, 10, 10)).toBe(1);
    expect(niceStep(0, 100, 10)).toBe(10);
    expect(niceStep(0, 1, 5)).toBe(0.2);
  });
});

describe('formatTick', () => {
  it('avoids floating point noise', () => {
    expect(formatTick(0.30000000000000004, 0.1)).toBe('0.3');
    expect(formatTick(10, 2)).toBe('10');
    expect(formatTick(-4.5, 0.5)).toBe('-4.5');
    expect(formatTick(0.2, 0.2)).toBe('0.2');
    expect(formatTick(5000, 1000)).toBe('5000');
  });

  it('renders zero and very small/large steps readably', () => {
    expect(formatTick(0, 2)).toBe('0');
    expect(formatTick(1e-5, 1e-5)).toContain('e-5');
    expect(formatTick(2e7, 1e7)).toContain('e+7');
  });
});
