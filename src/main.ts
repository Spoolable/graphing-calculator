import './style.css';
import { render, type RenderOutput } from './graph/renderer';
import type { Size } from './graph/viewport';
import { loadState, saveState } from './state/persistence';
import { Store } from './state/store';
import { applyTheme, getTheme, listThemes } from './theme/themes';
import { initInteractions } from './ui/interactions';
import { initSidebar } from './ui/sidebar';
import { initTraceOverlay } from './ui/trace';

function mustEl<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as unknown as T;
}

function main(): void {
  const canvas = mustEl<HTMLCanvasElement>('graph-canvas');
  const graphArea = mustEl<HTMLElement>('graph');
  const ctxOrNull = canvas.getContext('2d');
  if (!ctxOrNull) throw new Error('Canvas 2D is not supported in this browser.');
  const ctx: CanvasRenderingContext2D = ctxOrNull;

  const store = new Store();
  store.hydrate(loadState());
  applyTheme(getTheme(store.themeId));

  let size: Size = { width: 1, height: 1 };
  let dpr = 1;
  let output: RenderOutput = { cartesianSamples: new Map(), curveSamples: new Map() };
  const updateTrace = initTraceOverlay();

  function draw(): void {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    output = render(ctx, {
      viewport: store.viewport,
      size,
      gridVisible: store.gridVisible,
      theme: getTheme(store.themeId).canvas,
      exprs: store.exprs,
      trace: store.trace,
    });
    updateTrace(store.trace, store.tracePinned);
  }

  let scheduled = false;
  function requestRender(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      draw();
    });
  }

  function resize(): void {
    const rect = graphArea.getBoundingClientRect();
    size = {
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height)),
    };
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    requestRender();
  }

  let saveTimer: number | undefined;
  store.subscribe(() => {
    requestRender();
    if (saveTimer !== undefined) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => saveState(store.snapshot()), 350);
  });

  initSidebar(store);
  initInteractions({ store, canvas, getOutput: () => output, getSize: () => size, requestRender });

  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomResetBtn = document.getElementById('zoom-reset');
  const gridToggle = document.getElementById('grid-toggle') as HTMLInputElement | null;
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
  const zoomBy = (factor: number): void => store.zoomAt(size.width / 2, size.height / 2, factor, size);
  zoomInBtn?.addEventListener('click', () => zoomBy(1.3));
  zoomOutBtn?.addEventListener('click', () => zoomBy(1 / 1.3));
  zoomResetBtn?.addEventListener('click', () => store.resetViewport());
  if (gridToggle) {
    gridToggle.checked = store.gridVisible;
    gridToggle.addEventListener('change', () => store.setGridVisible(gridToggle.checked));
    store.subscribe(() => {
      if (gridToggle.checked !== store.gridVisible) gridToggle.checked = store.gridVisible;
    });
  }
  if (themeSelect) {
    for (const theme of listThemes()) {
      const opt = document.createElement('option');
      opt.value = theme.id;
      opt.textContent = theme.name;
      themeSelect.appendChild(opt);
    }
    themeSelect.value = store.themeId;
    themeSelect.addEventListener('change', () => {
      store.setTheme(themeSelect.value);
      applyTheme(getTheme(store.themeId));
    });
  }

  new ResizeObserver(resize).observe(graphArea);
  resize();
}

main();
