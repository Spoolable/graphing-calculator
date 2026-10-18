import { describe, expect, it } from 'vitest';
import { sampleCartesian, sampleParametricCurve } from './sampling';
import { DEFAULT_VIEWPORT } from './viewport';

const size = { width: 600, height: 400 };

describe('sampleCartesian', () => {
  it('samples every pixel column for a continuous curve', () => {
    const res = sampleCartesian((x) => Math.sin(x), DEFAULT_VIEWPORT, size);
    expect(res.columns).toHaveLength(600);
    expect(res.columns.every((c) => c.valid)).toBe(true);
    expect(res.polylines).toHaveLength(1);
  });

  it('draws a straight line as one polyline covering the width', () => {
    const res = sampleCartesian((x) => x, DEFAULT_VIEWPORT, size);
    expect(res.polylines).toHaveLength(1);
    const pts = res.polylines[0].pts;
    expect(pts[0]).toBe(0);
    expect(pts[pts.length - 2]).toBe(599);
  });

  it('breaks at vertical asymptotes (1/x)', () => {
    const res = sampleCartesian((x) => 1 / x, DEFAULT_VIEWPORT, size);
    expect(res.polylines.length).toBeGreaterThanOrEqual(2);
  });

  it('breaks at periodic asymptotes (tan x)', () => {
    const res = sampleCartesian(Math.tan, DEFAULT_VIEWPORT, size);
    expect(res.polylines.length).toBeGreaterThanOrEqual(3);
  });

  it('handles fully undefined functions', () => {
    const res = sampleCartesian(() => NaN, DEFAULT_VIEWPORT, size);
    expect(res.columns.every((c) => !c.valid)).toBe(true);
    expect(res.polylines).toHaveLength(0);
  });
});

describe('sampleParametricCurve', () => {
  it('draws a full circle as one polyline', () => {
    const res = sampleParametricCurve(
      (t) => ({ x: Math.cos(t), y: Math.sin(t) }),
      0,
      Math.PI * 2,
      500,
      DEFAULT_VIEWPORT,
      size,
    );
    expect(res.polylines).toHaveLength(1);
    expect(res.points).toHaveLength(501);
    expect(res.points[0].wx).toBeCloseTo(1, 6);
    expect(res.points[500].wx).toBeCloseTo(1, 6);
  });

  it('breaks where the curve becomes undefined', () => {
    const res = sampleParametricCurve(
      (t) => (t <= 1 ? { x: t, y: t * t } : { x: NaN, y: NaN }),
      0,
      2,
      100,
      DEFAULT_VIEWPORT,
      size,
    );
    expect(res.polylines).toHaveLength(1);
    expect(res.points.length).toBeLessThan(101);
    expect(res.points[res.points.length - 1].wx).toBeCloseTo(1, 6);
  });
});
