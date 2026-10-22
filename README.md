# Graphing Calculator

A fast, dependency-free graphing calculator built with **TypeScript**, the **Canvas 2D API**, and **Vite**. Type an expression, get a graph — with automatic sliders, symbolic derivatives, and live coordinate tracing.

## Features

- **Three graph types** — Cartesian `y = f(x)`, polar `r = f(θ)`, and parametric `(x(t), y(t))` with an editable t-range
- **Rich math** — a hand-written lexer → parser → compiler pipeline: `+ - * / ^`, implicit multiplication (`2x`, `3sin(x)`), 28 built-in functions, constants (`pi`/`π`, `e`, `tau`/`τ`), and Unicode operators (`× ÷ −`)
- **Sliders** — every unknown letter becomes a slider (`a*x^2 + b*x + c` gives you `a`, `b`, `c`), or create **shared variables** whose slider drives every expression at once; values are draggable *or* typeable, with editable min/max ranges
- **Symbolic derivatives** — exact derivative curves via AST differentiation, drawn dashed, with slope (`y'`) shown in the trace readout
- **Smooth navigation** — cursor-centered scroll zoom, drag panning, keyboard control, and one-key view reset
- **Curve tracing** — hover to snap to any curve and read its coordinates; click to pin the reading
- **Seven themes** — Midnight, OLED Black, Solarized Dark, Synthwave, Forest, Graphite, and Paper; the grid, axes, and curve palette all adapt to the active theme
- **Desktop app** — the same UI packages as a standalone Windows `.exe` (portable, no install) or a Linux AppImage via Electron
- **Clean rendering** — at least one sample per pixel column with discontinuity detection, so asymptotes (`tan x`, `1/x`) are never bridged; HiDPI-aware
- **Adaptive axes** — 1–2–5 "nice" ticks with precision-aware labels that stay readable at any zoom
- **Auto-save** — expressions, variables, sliders, history, viewport, and theme persist in `localStorage`

## Getting started

```bash
npm install     # first time only
npm run dev     # start the dev server → http://localhost:5173
```

Other scripts:

```bash
npm test        # run the unit test suite (Vitest)
npm run build   # type-check and build for production into dist/
npm run preview # serve the production build
```

## Desktop app

The same app also runs as a native desktop application via Electron — no browser needed.

```bash
npm run app         # build and launch the desktop app locally
npm run dist:win    # package a standalone Windows executable → release/
npm run dist:linux  # package a Linux AppImage → release/
```

- **Windows** produces a single portable `.exe` — double-click to run, nothing to install.
- **Linux** produces an `.AppImage` — mark it executable (`chmod +x`) and run it.
- The binaries are unsigned, so Windows SmartScreen may warn on first launch — choose
  **More info → Run anyway**.
- Prebuilt binaries are attached to [GitHub releases](https://github.com/Spoolable/graphing-calculator/releases);
  the workflow in `.github/workflows/build-desktop.yml` rebuilds them on every version tag.

## Usage

### Adding expressions

1. Choose a graph type in the dropdown (`y = f(x)`, `r = f(θ)`, or `(x(t), y(t))`).
2. Type the expression — without `=` — and press **Enter** or **+**.
3. Each expression gets its own color, visibility checkbox, derivative toggle (Cartesian), and delete button.

### Syntax

| Category | Supported |
| --- | --- |
| Operators | `+` `-` `*` `/` `^`, parentheses, implicit multiplication (`2x`, `x(x+1)`) |
| Functions | `sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh ln log log2 log10 sqrt cbrt exp abs floor ceil round sign min max hypot mod atan2` |
| Constants | `pi` / `π`, `e`, `tau` / `τ` |
| Parameters | `x` (Cartesian), `θ` / `theta` / `t` (polar), `t` (parametric) |
| Shorthand | `×` → `*`, `÷` → `/`, `−` → `-` |

### Variables & sliders

Use the **Variables** panel to create a shared variable such as `a` with a starting value.
Its slider then drives every expression that uses it — `a*sin(x)` and `a*x` move together.
Drag the slider or type an exact number in its value box; the min/max boxes re-range it.
Names already taken by functions, constants, or graph parameters (`x`, `t`, `θ`/`theta`)
are reserved.

Any unknown name that isn't a shared variable still gets its own automatic slider — e.g.
`a*sin(b*x + c)` with no variables defined produces local sliders for `a`, `b`, and `c`.
Defining `a` in the Variables panel promotes it to a shared slider everywhere.

### Derivatives

Press the **′** button on any Cartesian expression to plot its derivative as a dashed
curve of the same color.

### Themes

Pick a theme from the dropdown in the graph toolbar — the whole UI, the grid, the axes,
and the curve palette switch instantly, and your choice is remembered. Available themes:

| Theme | Style |
| --- | --- |
| Midnight | The default deep-blue dark theme |
| OLED Black | True-black background with neon curves — great for OLED screens |
| Solarized Dark | The classic Ethan Schoonover palette |
| Synthwave | Retrowave purple with hot-pink accents |
| Forest | Deep green with bright, nature-toned curves |
| Graphite | Clean neutral light theme |
| Paper | Light graph-paper look with green grid lines |

### Navigating

| Action | How |
| --- | --- |
| Zoom | Scroll wheel (toward cursor), `+` / `−` keys, or toolbar buttons |
| Pan | Drag the graph, or arrow keys (`Shift` for fine steps) |
| Reset view | Double-click, `0` key, or the ⌂ button |
| Trace | Hover near a curve to read its coordinates; click to pin, click again to release |
| Grid | `G` key or the Grid checkbox |

## How it works

```
src/
  math/    lexer → parser → AST → validated JS closure; symbolic differentiation
  graph/   viewport transforms, 1–2–5 tick generation, adaptive sampling, renderer
  theme/   theme definitions: CSS variables, canvas colors, and curve palettes
  state/   observable app store + localStorage persistence
  ui/      sidebar (expressions, variables, sliders, history), trace overlay, input handling
```

Expressions are parsed into an AST — user input is never `eval`'d raw. The AST is
validated (function names, arity, unknown variables) and compiled into a tight JavaScript
closure for fast evaluation. Rendering samples at least once per pixel column, drawing a
vertical span per column so steep sections stay solid, and breaks polylines at non-finite
values and discontinuity jumps so asymptotes are not bridged.

The suite covers parsing, compilation, symbolic derivatives, tick formatting,
viewport math, sampling behavior, shared-variable state, and theme definitions.

## Tech

- [Vite](https://vite.dev) — dev server and bundler
- TypeScript (strict mode)
- Canvas 2D — rendering, zero UI/graphing dependencies
- [Electron](https://www.electronjs.org) + [electron-builder](https://www.electron.build) — desktop packaging (Windows `.exe`, Linux AppImage)
- [Vitest](https://vitest.dev) — unit tests
