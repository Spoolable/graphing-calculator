import { describe, expect, it } from 'vitest';
import { Store } from './store';

function storeWith(...sources: string[]): Store {
  const store = new Store();
  for (const source of sources) store.addExpression({ mode: 'cartesian', source });
  return store;
}

describe('global variables', () => {
  it('replaces per-expression sliders and is shared by every expression', () => {
    const store = storeWith('a*sin(x)', 'a*x');
    expect(store.exprs[0].sliders.map((s) => s.name)).toEqual(['a']);
    expect(store.exprs[1].sliders.map((s) => s.name)).toEqual(['a']);

    expect(store.addVariable('a', 2)).toBeNull();

    for (const rec of store.exprs) {
      expect(rec.sliders).toHaveLength(0);
      expect(rec.sliderScope['a']).toBe(2);
    }
    expect(store.exprs[0].fn!({ ...store.exprs[0].sliderScope, x: 1 })).toBeCloseTo(
      2 * Math.sin(1),
    );
    expect(store.exprs[1].fn!({ ...store.exprs[1].sliderScope, x: 1 })).toBeCloseTo(2);
  });

  it('updates every expression when the value changes', () => {
    const store = storeWith('a*x', 'a + 1');
    store.addVariable('a', 1);

    store.setVariableValue('a', 4);

    expect(store.variables[0].value).toBe(4);
    expect(store.exprs[0].fn!({ ...store.exprs[0].sliderScope, x: 1 })).toBeCloseTo(4);
    expect(store.exprs[1].fn!({ ...store.exprs[1].sliderScope, x: 1 })).toBeCloseTo(5);
  });

  it('restores automatic sliders when a global variable is removed', () => {
    const store = storeWith('a*x');
    store.addVariable('a', 2);
    expect(store.exprs[0].sliders).toHaveLength(0);

    store.removeVariable('a');

    expect(store.variables).toHaveLength(0);
    expect(store.exprs[0].sliders.map((s) => s.name)).toEqual(['a']);
    expect(store.exprs[0].sliderScope['a']).toBe(1);
  });

  it('works for polar and parametric expressions', () => {
    const store = new Store();
    store.addExpression({ mode: 'polar', source: 'a*sin(\u03B8)' });
    store.addExpression({ mode: 'parametric', sourceX: 'a*cos(t)', sourceY: 'a*sin(t)' });

    store.addVariable('a', 3);

    expect(store.exprs[0].sliders).toHaveLength(0);
    expect(store.exprs[0].sliderScope['a']).toBe(3);
    expect(store.exprs[0].fn!({ ...store.exprs[0].sliderScope, '\u03B8': Math.PI / 2 })).toBeCloseTo(3);
    expect(store.exprs[1].sliders).toHaveLength(0);
    expect(store.exprs[1].fnX!({ ...store.exprs[1].sliderScope, t: 0 })).toBeCloseTo(3, 5);
    expect(store.exprs[1].fnY!({ ...store.exprs[1].sliderScope, t: 0 })).toBeCloseTo(0, 5);
  });

  it('clamps values and validates ranges', () => {
    const store = storeWith('a*x');
    store.addVariable('a', 2);

    store.setVariableRange('a', 0, 5);
    store.setVariableValue('a', 99);

    expect(store.variables[0].value).toBe(5);
    expect(store.exprs[0].sliderScope['a']).toBe(5);

    store.setVariableRange('a', 10, 5); // invalid range is ignored
    expect(store.variables[0].min).toBe(0);
    expect(store.variables[0].max).toBe(5);
  });

  it('rejects reserved, malformed, and duplicate names', () => {
    const store = new Store();

    expect(store.addVariable('x')).toMatch(/reserved/);
    expect(store.addVariable('theta')).toMatch(/reserved/);
    expect(store.addVariable('sin')).toMatch(/reserved/);
    expect(store.addVariable('pi')).toMatch(/reserved/);
    expect(store.addVariable('')).toMatch(/letter/);
    expect(store.addVariable('a b')).toMatch(/letter/);

    expect(store.addVariable('a', 1)).toBeNull();
    expect(store.addVariable('A', 2)).toMatch(/already/);
    expect(store.variables.map((v) => v.name)).toEqual(['a']);
  });

  it('hydrates shared variables from saved state', () => {
    const store = new Store();
    store.hydrate({
      expressions: [
        {
          id: 'expr-1',
          mode: 'cartesian',
          color: '#4f8ef7',
          visible: true,
          showDerivative: false,
          source: 'a*x',
          sourceX: '',
          sourceY: '',
          tMin: 0,
          tMax: Math.PI * 2,
          sliders: [],
        },
      ],
      history: [],
      viewport: { xmin: -10, xmax: 10, ymin: -10, ymax: 10 },
      gridVisible: true,
      variables: [
        { name: 'a', min: -5, max: 5, step: 0.02, value: 3 },
        { name: 'x', min: -10, max: 10, step: 0.04, value: 1 },
      ],
    });

    expect(store.variables.map((v) => v.name)).toEqual(['a']);
    expect(store.exprs[0].sliders).toHaveLength(0);
    expect(store.exprs[0].sliderScope['a']).toBe(3);
    expect(store.exprs[0].fn!({ ...store.exprs[0].sliderScope, x: 1 })).toBeCloseTo(3);
  });
});
