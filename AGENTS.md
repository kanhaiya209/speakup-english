# AGENTS.md — SpeakUp

Instructions for any AI coding agent working in this repository (Codex, Cursor, Copilot,
Gemini, Aider, Windsurf, or anything else). Claude Code reads
[`CLAUDE.md`](CLAUDE.md), which carries the same rules in more detail.

---

## Read the design system before any UI work

**Read [`speakup-frontend/DESIGN_SYSTEM.md`](speakup-frontend/DESIGN_SYSTEM.md) in full
before you write, edit, or review any `.jsx` or `.css` file.**

It is the single source of truth for every visual decision here — tokens, component
recipes, spacing, motion, accessibility. If a request conflicts with it, follow the
document and say so. Do not improvise a variant, do not "modernise" it, and do not copy
patterns from any file it marks as legacy.

The design is the **Vercel dashboard**: pure black, flat, monochrome, generous
whitespace, 1px `#222222` borders doing the structural work. The aesthetic is restraint.
**If your change makes the UI louder, it is wrong.**

## The short version

Never: `framer-motion` · `BackgroundBeams` / `ShimmerButton` / `Meteors` /
`SoundwaveEmblem` / `Keycap` · glow (`shadow-[0_0_…]`, `blur-*`, `drop-shadow-*`,
`animate-pulse`) · gradients · `backdrop-blur-*` · `font-mono` on normal text · HUD
labels like `01 // STREAK` · emoji icons · `hover:scale-*` and other transforms ·
hardcoded colours (`bg-[#111]`, `bg-neutral-950`, `border-white/10`) ·
**fake or placeholder data** · `tailwind.config.js` · TypeScript.

Always: colours from the `@theme` tokens in `speakup-frontend/src/index.css`
(`bg-canvas` `bg-surface` `bg-surface-2` `border-line` `border-line-strong` `text-fg`
`text-muted` `text-faint` `text-danger` `rounded-card` `rounded-control`) · an explicit
colour on every `border-*` · `cursor-pointer` on clickables · a visible
`focus-visible:ring-1 focus-visible:ring-white/40` · `aria-label` on icon-only controls ·
`transition-colors` as the entire motion budget · the §4 recipes copied verbatim.

Data: every value on screen comes from the API or `useSelector((state) => state.auth)`.
Fallbacks are `?? 0` and `|| '—'`. Unbuilt features render a disabled control plus a
muted "Coming soon".

Preserve: Firebase auth logic, all API calls, all Redux logic, `App.jsx` routing, and the
existing element `id`s (`signin-submit`, `signup-submit`, `settings-save`,
`settings-logout`, `quiz-start-journey`).

## Reference implementations

Compliant, and safe to copy from: every page and component in `src/`. The closest
reference for what you are building is usually `src/components/Navbar.jsx`,
`src/pages/Login.jsx`, `src/pages/Home.jsx`, `src/pages/Quiz.jsx`,
`src/pages/ProfileSetup.jsx`, `src/pages/Settings.jsx`, `src/pages/AdminDashboard.jsx`.

There is no longer a legacy exception. `ProfileSetup.jsx` has been redesigned, and
`src/components/ui/{shimmer-button,background-beams,meteors}.jsx` plus the `framer-motion`,
`clsx` and `tailwind-merge` dependencies are deleted. Do not re-add them — lint rejects the
imports.

## Verify before you report done

```bash
cd speakup-frontend && npm run verify
```

That is `lint` + `check:design` + `build`; all three must pass with zero errors.

- `lint` rejects banned imports (`framer-motion`, the legacy `ui/` components).
- `check:design` runs `scripts/check-design.mjs`, which scans `src/` for banned
  `className` utilities — stock palette, hex colours, gradients, glow, blur,
  `animate-pulse`, hover transforms, `font-mono`, `font-bold` — and reports file, line
  and rule. Do not add files to its `EXEMPT` list to silence a violation.
- After `build`, confirm your tokens compiled. Tailwind v4 **silently drops** a utility
  whose token does not exist — nothing warns you, the element just renders unstyled — so
  run the built-CSS token grep in §11 of the design system.

## Stack

React 19 + Vite + Tailwind CSS v4 (config-less; `@import "tailwindcss"` and `@theme` in
`src/index.css`), Redux Toolkit, React Router v6, Firebase Auth, axios, react-hot-toast.
Backend is Spring Boot 3.4.3 on Java 21, port 8080; frontend on 5173. Plain JavaScript
throughout. The frontend needs `VITE_FIREBASE_*` env vars or it renders blank black.
