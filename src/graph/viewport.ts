export interface Viewport {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

export interface Size {
  width: number;
  height: number;
}

export const DEFAULT_VIEWPORT: Viewport = { xmin: -10, xmax: 10, ymin: -10, ymax: 10 };

const MIN_SPAN = 1e-10;
const MAX_SPAN = 1e12;

export function spanX(vp: Viewport): number {
  return vp.xmax - vp.xmin;
}

export function spanY(vp: Viewport): number {
  return vp.ymax - vp.ymin;
}

export function worldToScreenX(vp: Viewport, size: Size, x: number): number {
  return ((x - vp.xmin) / spanX(vp)) * size.width;
}

export function worldToScreenY(vp: Viewport, size: Size, y: number): number {
  return size.height - ((y - vp.ymin) / spanY(vp)) * size.height;
}

export function screenToWorldX(vp: Viewport, size: Size, px: number): number {
  return vp.xmin + (px / size.width) * spanX(vp);
}

export function screenToWorldY(vp: Viewport, size: Size, py: number): number {
  return vp.ymin + ((size.height - py) / size.height) * spanY(vp);
}

/** Zooms around a screen point, keeping the world point under it stationary. */
export function zoomAt(vp: Viewport, size: Size, px: number, py: number, factor: number): Viewport {
  if (!(factor > 0) || !Number.isFinite(factor)) return vp;
  const nextXSpan = spanX(vp) / factor;
  const nextYSpan = spanY(vp) / factor;
  if (nextXSpan < MIN_SPAN || nextXSpan > MAX_SPAN) return vp;
  if (nextYSpan < MIN_SPAN || nextYSpan > MAX_SPAN) return vp;
  const wx = screenToWorldX(vp, size, px);
  const wy = screenToWorldY(vp, size, py);
  const fx = px / size.width;
  const fy = (size.height - py) / size.height;
  return {
    xmin: wx - fx * nextXSpan,
    xmax: wx + (1 - fx) * nextXSpan,
    ymin: wy - fy * nextYSpan,
    ymax: wy + (1 - fy) * nextYSpan,
  };
}

/** Pans by a pixel delta (as if the content were dragged by that amount). */
export function panPixels(vp: Viewport, size: Size, dxPx: number, dyPx: number): Viewport {
  const dx = (dxPx / size.width) * spanX(vp);
  const dy = (dyPx / size.height) * spanY(vp);
  return {
    xmin: vp.xmin - dx,
    xmax: vp.xmax - dx,
    ymin: vp.ymin + dy,
    ymax: vp.ymax + dy,
  };
}
