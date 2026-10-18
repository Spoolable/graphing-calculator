export type ThemeScheme = 'dark' | 'light';

/** Colors the canvas renderer uses, tuned per theme for contrast. */
export interface CanvasTheme {
  background: string;
  grid: string;
  axis: string;
  label: string;
  /** Ring drawn around the trace marker. */
  traceRing: string;
}

export interface Theme {
  id: string;
  name: string;
  scheme: ThemeScheme;
  /** CSS custom properties applied to :root while the theme is active. */
  css: Record<string, string>;
  canvas: CanvasTheme;
  /** Curve colors handed out to newly added expressions. */
  palette: string[];
}

export const DEFAULT_THEME_ID = 'midnight';

export const THEMES: readonly Theme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    scheme: 'dark',
    css: {
      '--bg': '#0b0e13',
      '--panel': '#10151d',
      '--panel-2': '#141b25',
      '--input-bg': '#0d1219',
      '--overlay-bg': 'rgba(16, 21, 29, 0.92)',
      '--border': '#1e2836',
      '--text': '#dce5f0',
      '--text-dim': '#8b9bb0',
      '--accent': '#4f8ef7',
      '--on-accent': '#08101f',
      '--danger': '#f76f6f',
      '--danger-bg': 'rgba(247, 111, 111, 0.08)',
      '--danger-border': 'rgba(247, 111, 111, 0.35)',
    },
    canvas: {
      background: '#0b0e13',
      grid: '#18202b',
      axis: '#46586b',
      label: '#8b9bb0',
      traceRing: 'rgba(255, 255, 255, 0.9)',
    },
    palette: [
      '#4f8ef7',
      '#f771c1',
      '#4fd18b',
      '#f7b84f',
      '#a06df7',
      '#f76f4f',
      '#4fd5d5',
      '#8bd14f',
    ],
  },
  {
    id: 'oled',
    name: 'OLED Black',
    scheme: 'dark',
    css: {
      '--bg': '#000000',
      '--panel': '#0a0a0a',
      '--panel-2': '#121212',
      '--input-bg': '#0d0d0d',
      '--overlay-bg': 'rgba(10, 10, 10, 0.92)',
      '--border': '#212121',
      '--text': '#ececec',
      '--text-dim': '#909090',
      '--accent': '#00e5ff',
      '--on-accent': '#00252b',
      '--danger': '#ff5252',
      '--danger-bg': 'rgba(255, 82, 82, 0.08)',
      '--danger-border': 'rgba(255, 82, 82, 0.35)',
    },
    canvas: {
      background: '#000000',
      grid: '#171717',
      axis: '#3d3d3d',
      label: '#7d7d7d',
      traceRing: 'rgba(255, 255, 255, 0.9)',
    },
    palette: [
      '#00e5ff',
      '#ff4fa0',
      '#5dff88',
      '#ffd740',
      '#b388ff',
      '#ff6e40',
      '#64ffda',
      '#c6ff00',
    ],
  },
  {
    id: 'solarized',
    name: 'Solarized Dark',
    scheme: 'dark',
    css: {
      '--bg': '#002b36',
      '--panel': '#073642',
      '--panel-2': '#0a4150',
      '--input-bg': '#05323e',
      '--overlay-bg': 'rgba(7, 54, 66, 0.92)',
      '--border': '#14495a',
      '--text': '#fdf6e3',
      '--text-dim': '#93a1a1',
      '--accent': '#268bd2',
      '--on-accent': '#fdf6e3',
      '--danger': '#dc322f',
      '--danger-bg': 'rgba(220, 50, 47, 0.08)',
      '--danger-border': 'rgba(220, 50, 47, 0.35)',
    },
    canvas: {
      background: '#002b36',
      grid: '#0a4353',
      axis: '#586e75',
      label: '#93a1a1',
      traceRing: 'rgba(253, 246, 227, 0.9)',
    },
    palette: [
      '#268bd2',
      '#d33682',
      '#859900',
      '#b58900',
      '#6c71c4',
      '#cb4b16',
      '#2aa198',
      '#f0a868',
    ],
  },
  {
    id: 'synthwave',
    name: 'Synthwave',
    scheme: 'dark',
    css: {
      '--bg': '#150a2e',
      '--panel': '#1d0f45',
      '--panel-2': '#261557',
      '--input-bg': '#1a0c3a',
      '--overlay-bg': 'rgba(29, 15, 69, 0.92)',
      '--border': '#3a1f7a',
      '--text': '#f3e8ff',
      '--text-dim': '#b39ade',
      '--accent': '#ff3fa4',
      '--on-accent': '#33083f',
      '--danger': '#ff6b8a',
      '--danger-bg': 'rgba(255, 63, 164, 0.08)',
      '--danger-border': 'rgba(255, 63, 164, 0.35)',
    },
    canvas: {
      background: '#150a2e',
      grid: '#331868',
      axis: '#8a52e8',
      label: '#c4a5f5',
      traceRing: 'rgba(255, 255, 255, 0.9)',
    },
    palette: [
      '#ff3fa4',
      '#39d0ff',
      '#b6ff3f',
      '#ffd23f',
      '#c56bff',
      '#ff7a3f',
      '#3fffd0',
      '#7a5cff',
    ],
  },
  {
    id: 'forest',
    name: 'Forest',
    scheme: 'dark',
    css: {
      '--bg': '#0a1410',
      '--panel': '#0f1c16',
      '--panel-2': '#14251d',
      '--input-bg': '#0c1812',
      '--overlay-bg': 'rgba(15, 28, 22, 0.92)',
      '--border': '#1f362b',
      '--text': '#e2f1e9',
      '--text-dim': '#93b3a4',
      '--accent': '#4ade80',
      '--on-accent': '#052815',
      '--danger': '#fb7185',
      '--danger-bg': 'rgba(251, 113, 133, 0.08)',
      '--danger-border': 'rgba(251, 113, 133, 0.35)',
    },
    canvas: {
      background: '#0a1410',
      grid: '#152a20',
      axis: '#3f5d50',
      label: '#8fae9f',
      traceRing: 'rgba(255, 255, 255, 0.9)',
    },
    palette: [
      '#4ade80',
      '#f472b6',
      '#38bdf8',
      '#facc15',
      '#a78bfa',
      '#fb923c',
      '#2dd4bf',
      '#ef4444',
    ],
  },
  {
    id: 'graphite',
    name: 'Graphite',
    scheme: 'light',
    css: {
      '--bg': '#f5f6f8',
      '--panel': '#ffffff',
      '--panel-2': '#eceef2',
      '--input-bg': '#ffffff',
      '--overlay-bg': 'rgba(255, 255, 255, 0.92)',
      '--border': '#d7dbe2',
      '--text': '#1d2430',
      '--text-dim': '#697280',
      '--accent': '#2f6fe4',
      '--on-accent': '#ffffff',
      '--danger': '#d14343',
      '--danger-bg': 'rgba(209, 67, 67, 0.07)',
      '--danger-border': 'rgba(209, 67, 67, 0.3)',
    },
    canvas: {
      background: '#f5f6f8',
      grid: '#dfe3e9',
      axis: '#8a94a3',
      label: '#5b6472',
      traceRing: 'rgba(24, 28, 35, 0.85)',
    },
    palette: [
      '#2f6fe4',
      '#d81b7a',
      '#0f8a52',
      '#b26a00',
      '#7c3aed',
      '#d14a1a',
      '#0e7490',
      '#4d7c0f',
    ],
  },
  {
    id: 'paper',
    name: 'Paper',
    scheme: 'light',
    css: {
      '--bg': '#f2f5ef',
      '--panel': '#ffffff',
      '--panel-2': '#e9eee4',
      '--input-bg': '#ffffff',
      '--overlay-bg': 'rgba(255, 255, 255, 0.92)',
      '--border': '#d2dbcc',
      '--text': '#223028',
      '--text-dim': '#5f7065',
      '--accent': '#2f7d4f',
      '--on-accent': '#ffffff',
      '--danger': '#c0392b',
      '--danger-bg': 'rgba(192, 57, 43, 0.07)',
      '--danger-border': 'rgba(192, 57, 43, 0.3)',
    },
    canvas: {
      background: '#f2f5ef',
      grid: '#bfd0b8',
      axis: '#55685a',
      label: '#5d6f61',
      traceRing: 'rgba(26, 42, 32, 0.85)',
    },
    palette: [
      '#1d5fd0',
      '#c2185b',
      '#2e7d32',
      '#8a5a00',
      '#6a1b9a',
      '#bf360c',
      '#00695c',
      '#455a64',
    ],
  },
];

export function listThemes(): readonly Theme[] {
  return THEMES;
}

export function defaultTheme(): Theme {
  return THEMES[0];
}

/** Returns the theme with the given id, falling back to the default theme. */
export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? defaultTheme();
}

/** Validates a stored/unknown theme id, returning a usable theme id. */
export function normalizeThemeId(id: string | undefined): string {
  return id && THEMES.some((t) => t.id === id) ? id : DEFAULT_THEME_ID;
}

/** Applies a theme's CSS custom properties to the document root. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  for (const [name, value] of Object.entries(theme.css)) {
    root.style.setProperty(name, value);
  }
  root.style.colorScheme = theme.scheme;
  root.dataset['theme'] = theme.id;
}
