import type { RenderOutput } from '../graph/renderer';
import type { Size } from '../graph/viewport';
import type { Store } from '../state/store';
import { pickTrace } from './trace';

export interface InteractionDeps {
  store: Store;
  canvas: HTMLCanvasElement;
  getOutput: () => RenderOutput;
  getSize: () => Size;
  requestRender: () => void;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function initInteractions(deps: InteractionDeps): void {
  const { store, canvas } = deps;

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 16;
      else if (e.deltaMode === 2) delta *= 100;
      const factor = Math.exp(clamp(-delta * 0.0015, -0.9, 0.9));
      store.zoomAt(px, py, factor, deps.getSize());
    },
    { passive: false },
  );

  let dragging = false;
  let moved = false;
  let lastX = 0;
  let lastY = 0;
  let downX = 0;
  let downY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    downX = e.clientX;
    downY = e.clientY;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (dragging) {
      if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > 3) {
        moved = true;
      }
      if (moved) {
        store.panBy(e.clientX - lastX, e.clientY - lastY, deps.getSize());
        if (store.trace) store.setTrace(null, false);
      }
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    if (store.tracePinned) return;
    const info = pickTrace(store, deps.getOutput(), px, py, deps.getSize());
    const same =
      (info === null && store.trace === null) ||
      (info !== null &&
        store.trace !== null &&
        info.exprId === store.trace.exprId &&
        info.sx === store.trace.sx &&
        info.sy === store.trace.sy);
    if (!same) store.setTrace(info, false);
  });

  const endDrag = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    if (!moved) {
      if (store.tracePinned) {
        store.setTrace(null, false);
      } else if (store.trace) {
        store.setTrace(store.trace, true);
      }
    }
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('pointerleave', () => {
    if (!dragging && !store.tracePinned && store.trace) {
      store.setTrace(null, false);
    }
  });

  canvas.addEventListener('dblclick', (e) => {
    e.preventDefault();
    store.resetViewport();
  });

  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape') target?.blur();
      return;
    }
    const size = deps.getSize();
    const cx = size.width / 2;
    const cy = size.height / 2;
    const panStep = e.shiftKey ? 15 : 60;
    switch (e.key) {
      case '+':
      case '=':
        store.zoomAt(cx, cy, 1.3, size);
        break;
      case '-':
      case '_':
        store.zoomAt(cx, cy, 1 / 1.3, size);
        break;
      case 'ArrowLeft':
        store.panBy(panStep, 0, size);
        break;
      case 'ArrowRight':
        store.panBy(-panStep, 0, size);
        break;
      case 'ArrowUp':
        store.panBy(0, panStep, size);
        break;
      case 'ArrowDown':
        store.panBy(0, -panStep, size);
        break;
      case '0':
        store.resetViewport();
        break;
      case 'g':
      case 'G':
        store.setGridVisible(!store.gridVisible);
        break;
      case 'Escape':
        if (store.trace || store.tracePinned) store.setTrace(null, false);
        break;
      default:
        return;
    }
    if (e.key.startsWith('Arrow') || e.key === '0') e.preventDefault();
  });
}
