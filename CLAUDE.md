# SpeakUp — instructions for AI agents

AI-powered English speaking practice platform for Indian learners.
Spring Boot 3.4.3 / Java 25 backend + React 19 / Vite / Tailwind v4 frontend.

---

## STOP — read this before touching any UI

**Before you write, edit, or review any `.jsx`, `.css`, or component file, read
[`speakup-frontend/DESIGN_SYSTEM.md`](speakup-frontend/DESIGN_SYSTEM.md) in full.**

That file is the single source of truth for every visual decision in this project.
It is not a suggestion, a style guide, or a starting point — it is the specification.
If a request conflicts with it, follow the document and say so in your response.

This applies to new pages, small tweaks, bug fixes that touch markup, and reviews.
"It's only a small change" is exactly when the design drifts.

---

## The rules, restated so they are always in context

The design is the **Vercel dashboard**: pure black, flat, monochrome, quiet.
The aesthetic is restraint — **if a change makes the UI louder, it is wrong.**

### Never

- `framer-motion` anywhere (exception: `ProfileSetup.jsx`, see below)
- `BackgroundBeams`, `ShimmerButton`, `Meteors`, `SoundwaveEmblem`, `Keycap`
- Glow: `shadow-[0_0_…]`, `blur-*`, `drop-shadow-*`, `animate-pulse`
- Gradients: `bg-gradient-*`, `from-*`, `via-*`, `to-*`
- Glass: `backdrop-blur-*`, translucent panels
- `font-mono` on body copy, labels, numbers, or headings
- HUD labels (`01 // STREAK`, `[SYS]`, zero-padded counters) — write plain English
- Emoji as UI iconography — use an inline Heroicons-style `<svg>`, or no icon
- Hover transforms: `hover:scale-*`, rotate, translate, float
- Hardcoded colours: `bg-[#111]`, `bg-neutral-950`, `text-slate-400`, `border-white/10`
- **Fake, mock, placeholder, or illustrative data** — every value comes from the API
  or the Redux store
- `tailwind.config.js` — Tailwind v4, the theme lives in `src/index.css`
- TypeScript — this project is plain JavaScript

### Always

- Colour comes from tokens only. The full set, defined in `@theme` in
  `speakup-frontend/src/index.css`:

  | Token | Value | Utility | Use for |
  |---|---|---|---|
  | `--color-canvas` | `#000000` | `bg-canvas` | page background, inputs |
  | `--color-surface` | `#111111` | `bg-surface` | cards, panels, nav |
  | `--color-surface-2` | `#161616` | `bg-surface-2` | hover / selected surface |
  | `--color-line` | `#222222` | `border-line`, `divide-line` | every default border |
  | `--color-line-strong` | `#444444` | `border-line-strong` | hover / focus border |
  | `--color-fg` | `#ffffff` | `text-fg` | headings, primary text |
  | `--color-muted` | `#888888` | `text-muted` | secondary text, labels |
  | `--color-faint` | `#555555` | `text-faint` | placeholders, disabled |
  | `--color-success` | `#00ff88` | `text-success` | status dots only |
  | `--color-danger` | `#ff4444` | `text-danger` | logout / delete only |
  | `--radius-card` | `8px` | `rounded-card` | cards, panels |
  | `--radius-control` | `6px` | `rounded-control` | buttons, inputs, pills |

  `bg-white` + `text-black` on the primary button and `ring-white/40` on focus rings
  are the only permitted raw values.

- Every `border-*` ships with an explicit colour — Tailwind v4 defaults border colour
  to `currentColor`, so a bare `border` renders a white box.
- Every clickable element gets `cursor-pointer`; disabled gets `cursor-not-allowed`.
- Every interactive element gets `focus-visible:ring-1 focus-visible:ring-white/40
  focus-visible:outline-none`, or `focus:border-line-strong` on inputs.
- Every icon-only control gets an `aria-label`; decorative `<svg>` gets `aria-hidden="true"`.
- Motion budget is `transition-colors`, plus `transition-all duration-300 ease-out` on
  progress-bar width and `animate-spin` on spinners. Nothing else.
- Copy the component recipes in §4 of the design system verbatim. Do not invent variants.

### The one legacy exception

`speakup-frontend/src/pages/ProfileSetup.jsx` has not been redesigned yet. It is the
only reason `src/components/ui/{shimmer-button,background-beams,meteors}.jsx` and the
`framer-motion` dependency still exist. Do not import those components anywhere else,
and do not treat that file as a reference. Every other page and `Navbar.jsx` are
compliant — read those instead.

---

## Real data only

Read user data from `useSelector((state) => state.auth)`. Available fields:
`name`, `email`, `role` (`learner` | `admin`), `streak`, `totalMinutesPracticed`,
`englishLevel`, `dailyGoalMinutes`, `photoUrl`, `nativeLanguage`, `learningGoal`.

Numeric fallback `?? 0`, text fallback `|| '—'`. A feature that is not built yet gets a
**disabled** control plus a `text-xs text-muted` "Coming soon" — never a working-looking
fake. No sample rows, no illustrative percentages, no seeded charts.

Static option lists (languages, CEFR levels, goals) are UI copy and live in a `const`
at the top of the file. Their `value` strings are part of the API contract — change a
display label if you must, **never a `value`**.

---

## Do not break these

- All Firebase auth logic stays intact (`signInWithPopup`, email/password, `updateProfile`).
- All API calls stay intact — `/api/auth/google`, `/api/user/profile`,
  `/api/quiz/{questions,submit,result}`, `/api/admin/{users,analytics}`.
- All Redux logic stays intact — `authSlice` actions and shapes.
- `App.jsx` routing and imports stay as they are. Only page UI changes.
- Element `id`s used elsewhere stay: `signin-submit`, `signup-submit`, `settings-save`,
  `settings-logout`, `quiz-start-journey`.

---

## Verify before reporting done

```bash
cd speakup-frontend && npm run verify
```

That is `npm run lint && npm run check:design && npm run build`. All three must pass.

- **lint** — ESLint, including a `no-restricted-imports` guard that rejects
  `framer-motion` and the legacy `ui/` components outside the §10 exception.
  `react-hooks/set-state-in-effect` is active: restructure rather than disable it.
- **check:design** — `scripts/check-design.mjs` scans `src/` for banned `className`
  utilities (stock palette, hex colours, gradients, glow, blur, `animate-pulse`,
  hover transforms, `font-mono`, `font-bold`) and prints file, line, class and the rule.
- **build** — Vite. Afterwards confirm your tokens compiled: Tailwind v4 **silently
  drops** utilities whose token does not exist, so a typo'd class fails invisibly. The
  `dist/assets/*.css` grep in §11 of the design system is what catches it.

Do not add files to the checker's `EXEMPT` list or the ESLint override to make a
violation pass. Fix the code.

---

## Stack facts worth not rediscovering

- Java 25 (not 21) — works fine. Backend package `com.speakup.backend`, port 8080.
- Frontend port 5173; backend CORS allows 5173/5174/5175.
- Firebase project `speakup-english-ed922`, Firestore `asia-south1`.
- Credentials via gcloud Application Default Credentials — **no** service-account JSON.
- The frontend needs `VITE_FIREBASE_*` env vars or `getAuth()` throws at module load and
  the page renders blank black. That is a missing `.env`, not a code bug.
- `start-backend.sh` is in the project root.

More project detail in [`CONTEXT.md`](CONTEXT.md); setup steps in [`README.md`](README.md).

