# SpeakUp Design System

**This file is the single source of truth for all UI in this project.**
Read it in full before writing, editing, or reviewing any `.jsx` or `.css` file.
If a request conflicts with this document, follow this document and say so.

---

## 1. Design DNA

SpeakUp's interface is modelled on the **Vercel dashboard**: pure black, flat,
monochrome, generous whitespace, near-invisible borders doing the structural work.
Linear.app and the Raycast *website* are secondary references.

The aesthetic is **restraint**. If a change makes the UI louder, it is wrong.

| Principle | Meaning in practice |
|---|---|
| Monochrome first | Black, three greys, white. Colour only for success dots and destructive actions. |
| Borders, not shadows | Depth comes from a 1px `#222222` line, never from a shadow or glow. |
| Flat surfaces | No gradients, no glass, no blur, no backdrop filters. |
| Breathing room | Space is the primary layout tool. When unsure, add space, not a border. |
| Quiet motion | 150ms colour transitions only. Nothing moves, scales, floats, or pulses. |
| Real data only | Every number on screen comes from the API or the Redux store. |

---

## 2. Tokens

Tailwind CSS v4 — **there is no `tailwind.config.js` and one must never be created.**
The theme lives in `@theme` inside `speakup-frontend/src/index.css`. That block is the
authoritative token list:

```css
@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  --color-canvas: #000000;      /* page background            */
  --color-surface: #111111;     /* cards, panels, nav         */
  --color-surface-2: #161616;   /* hover / selected surface   */

  --color-line: #222222;        /* every default border       */
  --color-line-strong: #444444; /* hover + focus border       */

  --color-fg: #ffffff;          /* headings, primary text     */
  --color-muted: #888888;       /* secondary text, labels     */
  --color-faint: #555555;       /* placeholders, disabled     */

  --color-success: #00ff88;     /* status dots ONLY           */
  --color-danger: #ff4444;      /* logout / delete ONLY       */

  --radius-card: 8px;
  --radius-control: 6px;
}
```

### Utilities these tokens generate

Use **only** these names. Never hardcode a hex value in a component, and never reach
for Tailwind's stock palette (`bg-neutral-950`, `text-slate-400`, `border-white/10`, …).

| Purpose | Utility |
|---|---|
| Page background | `bg-canvas` |
| Card / panel / nav background | `bg-surface` |
| Hover or selected surface | `bg-surface-2` |
| Default border | `border-line`, `divide-line` |
| Hover / focus border | `border-line-strong` |
| Heading & primary text | `text-fg` |
| Secondary text, labels, captions | `text-muted` |
| Placeholder, disabled, "coming soon" | `text-faint` |
| Destructive text / border | `text-danger`, `border-danger/30`, `bg-danger/10` |
| Card radius | `rounded-card` |
| Button / input / pill radius | `rounded-control` |

Two raw values are allowed because they are literal white/black, not theme colours:
`bg-white` and `text-black` on the primary button, and `ring-white/40` on focus rings.

### Adding a token

1. Add the `--color-*` / `--radius-*` line to `@theme` in `index.css`.
2. Document it in the table above.
3. Run `npm run build` and confirm the class appears in `dist/assets/*.css` —
   Tailwind v4 silently drops utilities whose token does not exist.

Never add a token for a one-off. If it is used once, it does not belong in the theme.

---

## 3. Hard rules

These are not preferences. A change that breaks one of these is rejected.
Most of them are machine-enforced — see §11 — so breaking one fails `npm run verify`.

### Banned outright

| Banned | Why |
|---|---|
| `framer-motion` — any import, anywhere | Motion budget is CSS colour transitions only |
| `BackgroundBeams`, `ShimmerButton`, `Meteors`, `SoundwaveEmblem`, `Keycap` | Legacy glow-era components; kept only for `ProfileSetup.jsx` (see §10) |
| Glow / neon: `shadow-[0_0_…]`, `blur-*`, `drop-shadow-*`, `animate-pulse` | Flat surfaces only |
| Gradients: `bg-gradient-*`, `from-*`, `via-*`, `to-*` | Monochrome only |
| Glass: `backdrop-blur-*`, `bg-*/70` translucent panels | Flat surfaces only |
| `font-mono` on body copy, labels, numbers, or headings | Inter everywhere; `<kbd>` may use it, nothing else |
| HUD labels — `01 // STREAK`, `[SYS]`, zero-padded counters | Write plain English: `Streak`, `Question 3 of 10` |
| Emoji as UI iconography (🌱 📚 🏆 ✨) | Use an inline Heroicons-style `<svg>` or no icon |
| Decorative rotation, scale, translate, or float on hover | Border and text colour change only |
| Fake, placeholder, mock, or illustrative data in shipped code | See §8 |
| `tailwind.config.js` | Tailwind v4 — theme lives in `index.css` |
| TypeScript | Project is plain JavaScript |

### Required

- Every `border-*` utility ships with an explicit colour. Tailwind v4 defaults border
  colour to `currentColor`, so a bare `border` renders a white box.
- Every clickable element gets `cursor-pointer`; disabled ones get `cursor-not-allowed`.
- Every interactive element has a visible focus state: `focus-visible:ring-1
  focus-visible:ring-white/40 focus-visible:outline-none`, or `focus:border-line-strong`
  on inputs.
- Every icon-only control has an `aria-label`. Decorative `<svg>` gets `aria-hidden="true"`.
- Page-level containers use `mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14`.

---

## 4. Component recipes

Copy these verbatim. They are the shipped classes — do not invent variants.

### Page shell

```jsx
<div className="min-h-screen bg-canvas">
  <Navbar />
  <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
    <header className="mb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-fg">Title</h1>
      <p className="mt-2 text-sm text-muted">One line of supporting context.</p>
    </header>
    {/* sections, separated by space-y-10 */}
  </main>
</div>
```

### Card

```jsx
<div className="rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong">
```

Drop the `hover:` half for static (non-interactive) cards. Content padding is `p-5`
for stat cards, `p-6` for form sections.

### Stat card

```jsx
<div className="rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong">
  <p className="text-sm text-muted">{label}</p>
  <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">{value}</p>
  {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
</div>
```

### Buttons

```jsx
/* Primary — one per view, maximum */
"flex cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"

/* Secondary / outline — the default button */
"flex cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-transparent px-4 py-2.5 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"

/* Destructive — logout, delete */
"cursor-pointer rounded-control border border-danger/30 bg-transparent px-3.5 py-2 text-sm text-danger transition-colors hover:border-danger/60 hover:bg-danger/10"

/* Disabled / coming soon — pair with a muted "Coming soon" label beside it */
"cursor-not-allowed rounded-control bg-white px-4 py-2 text-sm font-medium text-black opacity-40"
```

### Label + input

```jsx
<label htmlFor="field-id" className="mb-1.5 block text-xs text-muted">Display name</label>
<input
  id="field-id"
  className="w-full rounded-control border border-line bg-canvas px-3 py-2.5 text-sm text-fg placeholder:text-faint transition-colors focus:border-line-strong focus:outline-none"
/>
<p className="mt-1.5 text-xs text-danger">{error}</p>
```

Inputs sit on `bg-canvas` — darker than the `bg-surface` card that contains them.

### Selectable option (radio card)

```jsx
const optionClass = (selected) =>
  `flex w-full cursor-pointer items-center justify-between gap-3 rounded-control border px-3.5 py-3 text-left transition-colors ${
    selected
      ? 'border-line-strong bg-surface-2 text-fg'
      : 'border-line bg-canvas text-muted hover:border-line-strong hover:text-fg'
  }`
```

Selection is shown by a 1.5px white dot, never a checkmark badge or coloured fill:

```jsx
<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden="true" />
```

Wrap the group in `role="radiogroup"` + `aria-label`; each button gets `role="radio"`
and `aria-checked`.

### Pill / badge

```jsx
<span className="inline-flex items-center rounded-control border border-line bg-canvas px-2 py-0.5 text-xs capitalize text-muted">
```

Use `text-fg` instead of `text-muted` to emphasise one (e.g. the `admin` role).

### Segmented tabs (Login, filter groups)

```jsx
<div className="flex gap-1 rounded-control border border-line bg-canvas p-1" role="tablist">
  <button className={`flex-1 cursor-pointer rounded-control py-2 text-sm transition-colors ${
    active ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
  }`} />
</div>
```

### Sidebar tabs (Settings)

Active state is a **white left border**, not a filled pill:

```jsx
`cursor-pointer border-l-2 px-3 py-2 text-left text-sm transition-colors ${
  active ? 'border-l-white text-fg' : 'border-l-line text-muted hover:border-l-line-strong hover:text-fg'
}`
```

### Table

```jsx
<section className="overflow-hidden rounded-card border border-line bg-surface">
  <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
    {/* heading + "Showing X of Y" + search + filters */}
  </div>
  <div className="overflow-x-auto">
    <table className="w-full min-w-[680px] text-left">
      <thead className="border-b border-line bg-canvas">
        <tr><th scope="col" className="px-5 py-3 text-xs font-medium text-muted">User</th></tr>
      </thead>
      <tbody className="divide-y divide-line">
        <tr className="transition-colors hover:bg-surface-2">
          <td className="px-5 py-3.5 text-sm text-muted">…</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

Cells default to `text-muted`; promote the identifying column to `text-fg`.
Missing values render as `—`, never as `null`, `0`, or an empty cell.

### Progress bar

```jsx
<div className="h-0.5 w-full bg-line">
  <div className="h-full bg-white transition-all duration-300 ease-out" style={{ width: `${percent}%` }} />
</div>
```

Track `bg-line`, fill `bg-white`. Height `h-0.5` for page-edge bars, `h-1` inside cards.

### Spinner

The only permitted animation besides colour transitions.

```jsx
<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
</svg>
```

Loading copy is one plain sentence in `text-sm text-muted` — "Loading admin data…".
Never a multi-step fake progress narration.

### Empty state

```jsx
<div className="px-5 py-16 text-center">
  <p className="text-sm text-muted">No users match this search or filter.</p>
  <button className="mt-4 …outline button…">Reset filters</button>
</div>
```

### Dropdown menu

```jsx
<div role="menu" className="absolute right-0 mt-2 w-56 rounded-card border border-line bg-surface p-1">
  <button role="menuitem" className="w-full cursor-pointer rounded-control px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg" />
  <div className="my-1 h-px bg-line" />
</div>
```

Must dismiss on outside `mousedown` **and** `Escape`.

### Keycap

```jsx
<kbd className="rounded-control border border-line bg-surface px-1.5 py-0.5 text-[10px] text-muted">A</kbd>
```

Flat, 1px border. No 3D bevel, no inset shadow, no gradient.

### Error banner

```jsx
<div className="rounded-control border border-danger/30 bg-danger/10 px-3 py-2.5" role="alert">
  <p className="text-sm text-danger">{message}</p>
</div>
```

### Avatar

```jsx
<div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-xs font-medium text-fg">
  {user?.photoUrl ? <img src={user.photoUrl} alt="" className="h-full w-full object-cover" /> : initialsOf(user?.name)}
</div>
```

Initials = first letter of up to two words, uppercased, fallback `SU`.

### Toast

Configured once, in `App.jsx`. Do not restyle per call site.

```js
style: { background: '#111111', color: '#ffffff', border: '1px solid #222222', borderRadius: '8px', fontSize: '14px' }
success: { iconTheme: { primary: '#00ff88', secondary: '#000000' } }
error:   { iconTheme: { primary: '#ff4444', secondary: '#000000' } }
```

---

## 5. Typography

Inter only, via `--font-sans`. Weights: `font-normal` and `font-medium` for body,
`font-semibold` for headings. Never `font-bold` or heavier.

| Role | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight text-fg` (`sm:text-3xl` on Home) |
| Section heading | `text-sm font-medium text-fg` or `text-base font-medium text-fg` |
| Stat value | `text-2xl font-semibold tracking-tight text-fg` |
| Body | `text-sm text-muted` |
| Label / caption | `text-xs text-muted` |
| Question prompt (Quiz) | `text-lg font-medium text-fg sm:text-xl` |

Add `tracking-tight` to headings and stat numbers, nowhere else.

---

## 6. Layout & spacing

- Page container: `mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14`.
  Auth/centred cards use `max-w-[400px]`; the Quiz uses `max-w-3xl`.
- Between page sections: `space-y-10`. Below a page header: `mb-10`.
- Stat grids: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`.
- Option grids: `gap-2`. Card grids: `gap-4`.
- Settings layout: `grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-12`.
- Navbar height: `h-14`, `sticky top-0 z-50 border-b border-line bg-canvas`.
- Separate a group of related rows with `divide-y divide-line border-y border-line`,
  not with individual cards.

---

## 7. Interaction & motion

The entire motion budget:

- `transition-colors` (Tailwind's default 150ms) on hover and focus.
- `transition-all duration-300 ease-out` on progress-bar width.
- `animate-spin` on the loading spinner.

Nothing else. No entrance animations, no layout animation, no stagger, no parallax,
no `animate-pulse`, no `hover:scale-*`.

Hover vocabulary — pick one, never combine three:

| Element | Hover |
|---|---|
| Card | `hover:border-line-strong` |
| Outline button | `hover:border-line-strong hover:bg-surface-2` |
| Primary button | `hover:bg-white/90` |
| Nav link / menu item | `text-muted` → `hover:text-fg` |
| Table row | `hover:bg-surface-2` |

---

## 8. Data rules

**Never put a value on screen that did not come from the API or the Redux store.**
No sample rows, no illustrative percentages, no seeded charts, no lorem ipsum.

- Read user data from `useSelector((state) => state.auth)`. Available fields:
  `name`, `email`, `role` (`learner` | `admin`), `streak`, `totalMinutesPracticed`,
  `englishLevel`, `dailyGoalMinutes`, `photoUrl`, `nativeLanguage`, `learningGoal`.
- Numeric fallback is `?? 0`; text fallback is `|| '—'`. Never invent a default.
- A feature that is not built yet renders a **disabled** control plus a
  `text-xs text-muted` "Coming soon" — not a working-looking fake.
- Static option lists (languages, CEFR levels, goals) are UI copy, not data.
  They live in a `const` array at the top of the file. Their `value` strings are part
  of the API contract — **never edit a `value`**, only its display label.
- Derived numbers are computed in a `useMemo` from fetched state, never hardcoded.

---

## 9. Accessibility

Non-negotiable, and cheap to get right:

- Semantic elements: `<header>`, `<nav>`, `<main>`, `<footer>`, `<section>`, `<table>`.
- One `<h1>` per page; headings descend without skipping levels.
- Radio groups: `role="radiogroup"` + `aria-label`; children `role="radio"` + `aria-checked`.
- Menus: `aria-haspopup="menu"`, `aria-expanded`, `role="menu"` / `role="menuitem"`.
- Filter toggles: `aria-pressed`. Sidebar tabs: `aria-current="page"`.
- Mobile nav toggle: `aria-expanded` + `aria-controls` + `aria-label`.
- Inputs: a real `<label htmlFor>`, or `aria-label` when the label is visually omitted.
- Decorative `<svg>`: `aria-hidden="true"`. Avatar `<img>`: `alt=""`.
- Errors announced with `role="alert"`.
- Focus is always visible — `focus-visible:ring-1 focus-visible:ring-white/40`.
- `#888888` on `#111111` clears AA for body text. Reserve `text-faint` (`#555555`)
  for placeholders and disabled text only — it does not pass AA for content.

---

## 10. Tailwind v4 notes & the one legacy exception

### Working with a config-less Tailwind

- There is no `tailwind.config.js`, no `postcss.config.js` content array, and no
  `@tailwind base/components/utilities`. Just `@import "tailwindcss"` plus `@theme`.
- **Border colour defaults to `currentColor` in v4.** `className="border"` renders a
  white box. Always write `border border-line`.
- **A utility whose token does not exist is silently dropped** — no warning, no error,
  the element simply renders unstyled. After touching `@theme`, run `npm run build` and
  grep `dist/assets/*.css` for the class you expect.
- `divide-line` compiles to `.divide-line>:not(:last-child){border-color:…}`. When
  grepping the built CSS for it, remember the `>` — it is not preceded by a space.
- Arbitrary values are allowed only for layout, never for colour:
  `max-w-[400px]`, `min-w-[680px]`, `lg:grid-cols-[240px_1fr]`, `text-[10px]` are fine;
  `bg-[#111]` is not — use `bg-surface`.
- Opacity modifiers on theme colours are fine (`border-danger/30`, `bg-danger/10`,
  `hover:bg-white/90`, `ring-white/40`). Translucent *panels* are not (§3).

### The `ProfileSetup.jsx` exception

`src/pages/ProfileSetup.jsx` is the **only** file still on the pre-redesign glow
design. It is the sole reason these files still exist:

```
src/components/ui/shimmer-button.jsx
src/components/ui/background-beams.jsx
src/components/ui/meteors.jsx
```

Rules for that exception:

- Do **not** import those three components into any other file.
- Do **not** copy patterns out of `ProfileSetup.jsx` — it is not a reference.
- `shimmer-button.jsx` keeps its keyframes locally, in a React 19 hoisted
  `<style href="shimmer-button-keyframes" precedence="default">`. Keyframes must never
  go back into `index.css`.
- When `ProfileSetup.jsx` is eventually redesigned to this system, delete all three
  `ui/` components and `framer-motion` in the same change.

Every other page — `Login`, `Home`, `Quiz`, `Settings`, `AdminDashboard` — and
`components/Navbar.jsx` are already fully compliant. Use them as the reference.

---

## 11. Checklist before you call UI work done

One command runs all three gates:

```bash
cd speakup-frontend && npm run verify
```

That is `npm run lint && npm run check:design && npm run build`.

**`npm run lint`** — ESLint, with a `no-restricted-imports` guard that rejects
`framer-motion` and the three legacy `ui/` components outside the §10 exception.
`react-hooks/set-state-in-effect` is also active: restructure rather than disable it, and
if you must disable it, keep the reason in the comment.

**`npm run check:design`** — `scripts/check-design.mjs` scans every `.js`, `.jsx` and
`.css` file under `src/` for the class-level rules ESLint cannot see, because they live
inside `className` strings rather than in the AST:

| Rule | Catches |
|---|---|
| `stock-palette` | `bg-neutral-950`, `text-slate-400`, any numbered Tailwind colour |
| `hardcoded-hex` | `bg-[#111111]`, `border-[#222]` |
| `gradient` | `bg-gradient-*`, `bg-linear-*` |
| `glass` | `backdrop-blur-*`, `backdrop-saturate-*` |
| `glow` | `shadow-[0_0…]`, `drop-shadow-*`, `shadow-lg` |
| `blur` | `blur-md` and friends |
| `pulse` | `animate-pulse`, `animate-bounce`, `animate-ping` |
| `hover-transform` | `hover:scale-*`, `hover:rotate-*`, `hover:translate-*` |
| `font-mono` | `font-mono` anywhere |
| `font-weight` | `font-bold`, `font-extrabold`, `font-black` |

It exits 1 with the file, line, offending class and the section that forbids it.
`src/pages/ProfileSetup.jsx` and `src/components/ui/**` are exempt — **do not add files
to that list** (`EXEMPT` at the top of the script).

**`npm run build`** — Vite. Then confirm the tokens you used actually compiled, because
Tailwind v4 drops unknown ones silently:

```bash
cd speakup-frontend && grep -oE "\.(bg|text|border|divide|rounded)-(canvas|surface|surface-2|line|line-strong|fg|muted|faint|danger|success|card|control)" dist/assets/*.css | sort -u
```

Finally, check by eye: is the change *quieter* than what it replaced? If it is louder,
brighter, or busier, it does not ship. No script can check that one.

---

## 12. If this document is wrong

It is the source of truth, so it gets fixed rather than ignored. To change a rule:

1. Change `index.css` and the affected components in the same commit.
2. Update the relevant section here, including any recipe you altered.
3. Update the enforcement to match — `eslint.config.js` for imports,
   `scripts/check-design.mjs` for class-level rules. A rule that only exists in prose
   drifts; a rule that only exists in a script is undocumented.
4. Note the change in `CONTEXT.md` so the project history stays accurate.

Never leave a component, this file, and the checker disagreeing. If you cannot follow a
rule for a specific reason, say so explicitly in your response and explain why — do not
quietly deviate, and do not add yourself to the exemption list.

---

## 13. Where these rules are written down

| File | Role |
|---|---|
| `speakup-frontend/DESIGN_SYSTEM.md` | This document — the specification |
| `CLAUDE.md` (repo root) | Auto-loaded by Claude Code every session; points here |
| `AGENTS.md` (repo root) | Same, for every other AI coding agent |
| `speakup-frontend/CLAUDE.md` | Loaded when an agent works inside the frontend |
| `speakup-frontend/eslint.config.js` | Enforces the banned imports |
| `speakup-frontend/scripts/check-design.mjs` | Enforces the banned classes |
| `CONTEXT.md` (repo root) | Project history and state; defers to this file on design |

If you are an AI agent reading this: you have found the specification. Follow it.
