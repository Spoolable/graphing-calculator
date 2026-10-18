import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, THEMES, getTheme, listThemes, normalizeThemeId } from './themes';

const HEX6 = /^#[0-9a-f]{6}$/i;
const CANVAS_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\))$/i;

describe('theme registry', () => {
  it('contains the default theme and lists all themes', () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(5);
    expect(THEMES.some((t) => t.id === DEFAULT_THEME_ID)).toBe(true);
    expect(listThemes()).toBe(THEMES);
  });

  it('has unique ids and non-empty names', () => {
    const ids = new Set<string>();
    for (const theme of THEMES) {
      expect(theme.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(theme.name.length).toBeGreaterThan(0);
      expect(ids.has(theme.id)).toBe(false);
      ids.add(theme.id);
    }
  });

  it('uses only valid schemes', () => {
    for (const theme of THEMES) {
      expect(['dark', 'light']).toContain(theme.scheme);
    }
  });

  it('defines the same CSS variables in every theme', () => {
    const expected = Object.keys(getTheme(DEFAULT_THEME_ID).css).sort();
    for (const theme of THEMES) {
      expect(Object.keys(theme.css).sort()).toEqual(expected);
    }
  });

  it('has non-empty CSS values', () => {
    for (const theme of THEMES) {
      for (const [name, value] of Object.entries(theme.css)) {
        expect(value, `${theme.id} ${name}`).toBeTruthy();
        expect(typeof value).toBe('string');
      }
    }
  });

  it('has parseable canvas colors', () => {
    for (const theme of THEMES) {
      for (const [name, value] of Object.entries(theme.canvas)) {
        expect(value, `${theme.id} canvas.${name}`).toMatch(CANVAS_COLOR);
      }
    }
  });

  it('has palettes of distinct hex colors', () => {
    for (const theme of THEMES) {
      expect(theme.palette.length).toBeGreaterThanOrEqual(6);
      for (const color of theme.palette) {
        expect(color, `${theme.id} palette`).toMatch(HEX6);
      }
      expect(new Set(theme.palette).size).toBe(theme.palette.length);
    }
  });
});

describe('getTheme', () => {
  it('returns the theme for a known id', () => {
    for (const theme of THEMES) {
      expect(getTheme(theme.id)).toBe(theme);
    }
  });

  it('falls back to the default theme for unknown ids', () => {
    expect(getTheme('nope').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme('').id).toBe(DEFAULT_THEME_ID);
  });
});

describe('normalizeThemeId', () => {
  it('keeps valid ids', () => {
    for (const theme of THEMES) {
      expect(normalizeThemeId(theme.id)).toBe(theme.id);
    }
  });

  it('replaces missing or unknown ids with the default', () => {
    expect(normalizeThemeId(undefined)).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId('')).toBe(DEFAULT_THEME_ID);
    expect(normalizeThemeId('does-not-exist')).toBe(DEFAULT_THEME_ID);
  });
});


