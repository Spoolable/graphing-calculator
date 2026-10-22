import type { ExprRecord, Store } from '../state/store';
import type { Slider } from '../state/types';
import { formatNum } from './trace';

const PARAM_PLACEHOLDER = { x: 'cos(t)', y: 'sin(t)' };

export function initSidebar(store: Store): void {
  const listEl = mustEl<HTMLElement>('expr-list');
  const form = mustEl<HTMLFormElement>('add-form');
  const modeSelect = mustEl<HTMLSelectElement>('mode-select');
  const input = mustEl<HTMLInputElement>('expr-input');
  const paramRow = mustEl<HTMLElement>('param-row');
  const paramX = mustEl<HTMLInputElement>('param-x');
  const paramY = mustEl<HTMLInputElement>('param-y');
  const tMinInput = mustEl<HTMLInputElement>('t-min');
  const tMaxInput = mustEl<HTMLInputElement>('t-max');
  const historyList = mustEl<HTMLUListElement>('history-list');

  const rows = new Map<string, HTMLElement>();

  function syncRows(): void {
    const seen = new Set<string>();
    for (const rec of store.exprs) {
      seen.add(rec.id);
      let row = rows.get(rec.id);
      if (!row) {
        row = buildRow(rec);
        rows.set(rec.id, row);
        listEl.appendChild(row);
      }
      updateRow(row, rec);
    }
    for (const [id, row] of rows) {
      if (!seen.has(id)) {
        row.remove();
        rows.delete(id);
      }
    }
  }

  function buildRow(rec: ExprRecord): HTMLElement {
    const row = document.createElement('div');
    row.className = 'expr-row';
    row.dataset['exprId'] = rec.id;
    row.innerHTML = `
      <div class="expr-main">
        <input type="checkbox" class="vis-check" title="Show or hide" />
        <span class="swatch"></span>
        <span class="expr-prefix"></span>
        <div class="expr-inputs">
          <input type="text" class="src-input" spellcheck="false" autocomplete="off" />
          <div class="param-inputs" hidden>
            <input type="text" class="src-x" spellcheck="false" autocomplete="off" placeholder="${PARAM_PLACEHOLDER.x}" />
            <input type="text" class="src-y" spellcheck="false" autocomplete="off" placeholder="${PARAM_PLACEHOLDER.y}" />
          </div>
        </div>
        <button type="button" class="icon-btn deriv-btn" title="Show derivative (dashed)">&#x2032;</button>
        <button type="button" class="icon-btn del-btn" title="Remove expression">&times;</button>
      </div>
      <pre class="expr-error" hidden></pre>
      <div class="sliders"></div>`;

    const visCheck = row.querySelector<HTMLInputElement>('.vis-check')!;
    const swatch = row.querySelector<HTMLElement>('.swatch')!;
    const srcInput = row.querySelector<HTMLInputElement>('.src-input')!;
    const srcX = row.querySelector<HTMLInputElement>('.src-x')!;
    const srcY = row.querySelector<HTMLInputElement>('.src-y')!;
    const derivBtn = row.querySelector<HTMLButtonElement>('.deriv-btn')!;
    const delBtn = row.querySelector<HTMLButtonElement>('.del-btn')!;

    visCheck.addEventListener('change', () => store.setVisible(rec.id, visCheck.checked));
    srcInput.addEventListener('input', () => store.updateSource(rec.id, srcInput.value));
    srcX.addEventListener('input', () => store.updateParamSources(rec.id, srcX.value, srcY.value));
    srcY.addEventListener('input', () => store.updateParamSources(rec.id, srcX.value, srcY.value));
    derivBtn.addEventListener('click', () => store.toggleDerivative(rec.id));
    delBtn.addEventListener('click', () => store.removeExpression(rec.id));
    swatch.style.background = rec.color;
    return row;
  }

  function updateRow(row: HTMLElement, rec: ExprRecord): void {
    const visCheck = row.querySelector<HTMLInputElement>('.vis-check');
    if (visCheck && visCheck.checked !== rec.visible) visCheck.checked = rec.visible;

    const swatch = row.querySelector<HTMLElement>('.swatch');
    if (swatch) swatch.style.background = rec.color;

    const prefix = row.querySelector<HTMLElement>('.expr-prefix');
    if (prefix) {
      prefix.textContent = rec.mode === 'cartesian' ? 'y =' : rec.mode === 'polar' ? 'r =' : '(x,y)=';
    }

    const isParam = rec.mode === 'parametric';
    const paramInputs = row.querySelector<HTMLElement>('.param-inputs');
    if (paramInputs) paramInputs.hidden = !isParam;
    const single = row.querySelector<HTMLInputElement>('.src-input');
    if (single) {
      single.hidden = isParam;
      if (document.activeElement !== single && single.value !== rec.source) {
        single.value = rec.source;
      }
    }
    if (isParam) {
      const sx = row.querySelector<HTMLInputElement>('.src-x');
      const sy = row.querySelector<HTMLInputElement>('.src-y');
      if (sx && document.activeElement !== sx && sx.value !== rec.sourceX) sx.value = rec.sourceX;
      if (sy && document.activeElement !== sy && sy.value !== rec.sourceY) sy.value = rec.sourceY;
    }

    const derivBtn = row.querySelector<HTMLButtonElement>('.deriv-btn');
    if (derivBtn) {
      derivBtn.hidden = rec.mode !== 'cartesian';
      derivBtn.classList.toggle('active', rec.showDerivative);
    }

    const errEl = row.querySelector<HTMLElement>('.expr-error');
    if (errEl) {
      if (rec.error) {
        errEl.hidden = false;
        if (isParam) {
          errEl.textContent = rec.error.message;
        } else {
          const pad = ' '.repeat(Math.max(0, Math.min(rec.source.length, rec.error.pos)));
          errEl.textContent = `${rec.error.message}\n${pad}^`;
        }
      } else {
        errEl.hidden = true;
        errEl.textContent = '';
      }
    }

    syncSliders(row, rec);
  }

  function syncSliders(row: HTMLElement, rec: ExprRecord): void {
    const wrap = row.querySelector<HTMLElement>('.sliders');
    if (!wrap) return;
    const names = rec.sliders.map((s) => s.name).join(' ');
    if (wrap.dataset['names'] !== names) {
      wrap.dataset['names'] = names;
      wrap.textContent = '';
      for (const s of rec.sliders) wrap.appendChild(buildSlider(rec.id, s));
      return;
    }
    for (const s of rec.sliders) {
      const sliderRow = Array.from(wrap.children).find(
        (el) => (el as HTMLElement).dataset['name'] === s.name,
      ) as HTMLElement | undefined;
      if (!sliderRow) continue;
      const range = sliderRow.querySelector<HTMLInputElement>('input[type="range"]');
      const outEl = sliderRow.querySelector<HTMLElement>('output');
      const minInput = sliderRow.querySelector<HTMLInputElement>('.slider-min');
      const maxInput = sliderRow.querySelector<HTMLInputElement>('.slider-max');
      if (range && document.activeElement !== range) range.value = String(s.value);
      if (outEl) outEl.textContent = formatNum(s.value);
      if (minInput && document.activeElement !== minInput) minInput.value = String(s.min);
      if (maxInput && document.activeElement !== maxInput) maxInput.value = String(s.max);
    }
  }

  function buildSlider(exprId: string, s: Slider): HTMLElement {
    const el = document.createElement('div');
    el.className = 'slider';
    el.dataset['name'] = s.name;

    const label = document.createElement('span');
    label.className = 'slider-name';
    label.textContent = `${s.name} =`;

    const range = document.createElement('input');
    range.type = 'range';
    range.min = String(s.min);
    range.max = String(s.max);
    range.step = String(s.step);
    range.value = String(s.value);

    const outEl = document.createElement('output');
    outEl.textContent = formatNum(s.value);

    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.className = 'slider-min';
    minInput.step = 'any';
    minInput.value = String(s.min);
    minInput.title = 'Slider minimum';

    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.className = 'slider-max';
    maxInput.step = 'any';
    maxInput.value = String(s.max);
    maxInput.title = 'Slider maximum';

    range.addEventListener('input', () => {
      store.setSliderValue(exprId, s.name, parseFloat(range.value));
    });
    minInput.addEventListener('change', () => {
      const v = parseFloat(minInput.value);
      if (Number.isFinite(v)) store.setSliderRange(exprId, s.name, v, parseFloat(maxInput.value));
    });
    maxInput.addEventListener('change', () => {
      const v = parseFloat(maxInput.value);
      if (Number.isFinite(v)) store.setSliderRange(exprId, s.name, parseFloat(minInput.value), v);
    });

    el.append(label, range, outEl, minInput, maxInput);
    return el;
  }

  function syncHistory(): void {
    historyList.textContent = '';
    if (store.history.length === 0) {
      const li = document.createElement('li');
      li.className = 'history-empty';
      li.textContent = 'Nothing yet — add an expression above.';
      historyList.appendChild(li);
      return;
    }
    for (const text of store.history) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = text;
      btn.title = 'Load into the input';
      btn.addEventListener('click', () => {
        if (modeSelect.value === 'parametric') {
          const parts = text.split(',');
          paramX.value = (parts[0] ?? '').trim();
          paramY.value = (parts[1] ?? '').trim();
          paramX.focus();
        } else {
          input.value = text;
          input.focus();
          input.select();
        }
      });
      li.appendChild(btn);
      historyList.appendChild(li);
    }
  }

  function syncMode(): void {
    const mode = modeSelect.value;
    form.dataset['mode'] = mode;
    paramRow.hidden = mode !== 'parametric';
    input.placeholder = mode === 'polar' ? '1 + sin(\u03B8)' : 'sin(x) + 2';
  }

  function flashInvalid(): void {
    paramRow.classList.add('invalid');
    window.setTimeout(() => paramRow.classList.remove('invalid'), 900);
  }

  const numOr = (text: string, fallback: number): number => {
    const v = parseFloat(text);
    return Number.isFinite(v) ? v : fallback;
  };

  modeSelect.addEventListener('change', syncMode);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const mode = modeSelect.value;
    if (mode === 'parametric') {
      const sx = paramX.value.trim();
      const sy = paramY.value.trim();
      if (!sx || !sy) {
        flashInvalid();
        (sx ? paramX : paramY).focus();
        return;
      }
      store.addExpression({
        mode: 'parametric',
        sourceX: sx,
        sourceY: sy,
        tMin: numOr(tMinInput.value, 0),
        tMax: numOr(tMaxInput.value, Math.PI * 2),
      });
      store.pushHistory(`${sx}, ${sy}`);
      paramX.value = '';
      paramY.value = '';
      paramX.focus();
      return;
    }
    const src = input.value.trim();
    if (!src) {
      input.focus();
      return;
    }
    store.addExpression({ mode: mode as 'cartesian' | 'polar', source: src });
    store.pushHistory(src);
    input.value = '';
    input.focus();
  });

  store.subscribe(() => {
    syncRows();
    syncHistory();
  });
  syncMode();
  syncRows();
  syncHistory();
}

function mustEl<T extends Element>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el as unknown as T;
}
