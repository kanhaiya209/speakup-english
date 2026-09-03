# speakup-frontend — read before you edit anything here

**[`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) in this directory is the single source of truth
for all UI. Read it in full before writing, editing, or reviewing any `.jsx` or `.css`
file.** If a request conflicts with it, follow the document and say so.

The design is the Vercel dashboard: pure black, flat, monochrome, quiet. Colour comes
only from the `@theme` tokens in `src/index.css`. No `framer-motion`, no glow, no
gradients, no glass, no `font-mono`, no emoji icons, no hover transforms, no fake data.

`src/pages/ProfileSetup.jsx` and `src/components/ui/**` are the one documented legacy
exception (§10) — not a reference, and not a place to add code.

Before reporting UI work done:

```bash
npm run verify
```

That is `lint` (banned imports) + `check:design` (banned classes) + `build`. All three
must pass. Full checklist in §11 of the design system.
