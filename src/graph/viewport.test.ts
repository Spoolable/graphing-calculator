import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIEWPORT,
  panPixels,
  screenToWorldX,
  screenToWorldY,
  spanX,
  spanY,
  worldToScreenX,
  worldToScreenY,
  zoomAt,
} from './viewport';

const size = { width: 800, height: 600 };

describe('world/screen roundtrips', () => {
  it('roundtrips x and y', () => {
    const vp = { xmin: -3, xmax: 7, ymin: -2.5, ymax: 4 };
    for (const px of [0, 123, 400, 799]) {
      expect(screenToWorldX(vp, size, worldToScreenX(vp, size, px))).toBeCloseTo(px, 9);
    }
    for (const y of [-2.5, 0, 1.234, 4]) {
      const sy = worldToScreenY(vp, size, y);
      expect(screenToWorldY(vp, size, sy)).toBeCloseTo(y, 9);
    }
  });

  it('places corners where expected', () => {
    expect(worldToScreenX(DEFAULT_VIEWPORT, size, -10)).toBeCloseTo(0, 9);
    expect(worldToScreenX(DEFAULT_VIEWPORT, size, 10)).toBeCloseTo(800, 9);
    expect(worldToScreenY(DEFAULT_VIEWPORT, size, 10)).toBeCloseTo(0, 9);
    expect(worldToScreenY(DEFAULT_VIEWPORT, size, -10)).toBeCloseTo(600, 9);
  });
});

describe('zoomAt', () => {
  it('keeps the world point under the cursor stationary', () => {
    const vp = { xmin: -7, xmax: 13, ymin: -3, ymax: 11 };
    const px = 137;
    const py = 89;
    const wx = screenToWorldX(vp, size, px);
    const wy = screenToWorldY(vp, size, py);
    const zoomed = zoomAt(vp, size, px, py, 2.5);
    expect(screenToWorldX(zoomed, size, px)).toBeCloseTo(wx, 9);
    expect(screenToWorldY(zoomed, size, py)).toBeCloseTo(wy, 9);
    expect(spanX(zoomed)).toBeCloseTo(spanX(vp) / 2.5, 9);
    expect(spanY(zoomed)).toBeCloseTo(spanY(vp) / 2.5, 9);
  });

  it('refuses to zoom past sane limits', () => {
    let vp = { ...DEFAULT_VIEWPORT };
    for (let i = 0; i < 200; i++) vp = zoomAt(vp, size, 400, 300, 1e6);
    expect(spanX(vp)).toBeGreaterThanOrEqual(1e-10);
    expect(Number.isFinite(spanX(vp))).toBe(true);
    for (let i = 0; i < 200; i++) vp = zoomAt(vp, size, 400, 300, 1e-6);
    expect(spanX(vp)).toBeLessThanOrEqual(1e12);
    expect(Number.isFinite(spanX(vp))).toBe(true);
  });
});

describe('panPixels', () => {
  it('shifts the viewport opposite to the drag', () => {
    const vp = { ...DEFAULT_VIEWPORT };
    const panned = panPixels(vp, size, 80, 60); // half width, tenth of height scale
    expect(panned.xmin).toBeCloseTo(vp.xmin - 2, 9); // 80px = 2 world units
    expect(panned.ymin).toBeCloseTo(vp.ymin + 2, 9); // 60px = 2 world units
    expect(spanX(panned)).toBeCloseTo(spanX(vp), 9);
    expect(spanY(panned)).toBeCloseTo(spanY(vp), 9);
  });
});
