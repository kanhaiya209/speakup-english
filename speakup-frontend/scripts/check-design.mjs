#!/usr/bin/env node
/**
 * Design-system checker — enforces the rules in DESIGN_SYSTEM.md that ESLint cannot see,
 * because they live inside className strings rather than in the JS AST.
 *
 *   npm run check:design
 *
 * Exits 1 on any violation. Cross-platform: no bash, no grep.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC = join(ROOT, 'src')

/**
 * Files exempt from the class-level rules. Empty, and it should stay that way:
 * DESIGN_SYSTEM.md §10's legacy exception (`src/pages/ProfileSetup.jsx` and
 * `src/components/ui/`) is gone — the page was redesigned and the components deleted.
 * Never add a file here to make a violation pass. Fix the code.
 */
const EXEMPT = []

const RULES = [
  {
    id: 'stock-palette',
    pattern:
      /\b(?:bg|text|border|divide|ring|from|via|to)-(?:neutral|zinc|slate|gray|stone|red|green|blue|indigo|violet|purple|fuchsia|pink|rose|amber|yellow|lime|emerald|teal|cyan|sky|orange)-\d{2,3}\b/g,
    message: 'Tailwind stock palette. Use theme tokens (bg-surface, text-muted, …). §2',
  },
  {
    id: 'hardcoded-hex',
    pattern: /\b(?:bg|text|border|divide|ring|shadow|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/g,
    message: 'Hardcoded colour. Add a token to @theme or use an existing one. §2',
  },
  {
    id: 'gradient',
    pattern: /\bbg-gradient-(?:to|from|conic|radial)\b|\bbg-linear-/g,
    message: 'Gradients are banned — monochrome flat surfaces only. §3',
  },
  {
    id: 'glass',
    pattern: /\bbackdrop-(?:blur|saturate|brightness)-/g,
    message: 'Glass/blur is banned — flat surfaces only. §3',
  },
  {
    id: 'glow',
    pattern: /\bshadow-\[0_0|\bdrop-shadow-|\bshadow-(?:sm|md|lg|xl|2xl)\b/g,
    message: 'Depth comes from a 1px border-line, never a shadow or glow. §1, §3',
  },
  {
    id: 'blur',
    pattern: /(?<![\w-])blur-(?:none|xs|sm|md|lg|xl|2xl|3xl)\b/g,
    message: 'blur-* is a glow-era utility. §3',
  },
  {
    id: 'pulse',
    pattern: /\banimate-(?:pulse|bounce|ping)\b/g,
    message: 'Only animate-spin (spinners) is allowed. §7',
  },
  {
    id: 'hover-transform',
    pattern: /\bhover:(?:scale|rotate|translate|skew)-/g,
    message: 'Hover changes border and text colour only. §7',
  },
  {
    id: 'font-mono',
    pattern: /\bfont-mono\b/g,
    message: 'Inter everywhere; font-mono is allowed on <kbd> only. §3, §5',
  },
  {
    id: 'font-weight',
    pattern: /\bfont-(?:bold|extrabold|black)\b/g,
    message: 'Weights stop at font-semibold. §5',
  },
]

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(jsx?|css)$/.test(entry)) out.push(full)
  }
  return out
}

function isExempt(relPath) {
  return EXEMPT.some((prefix) => relPath === prefix || relPath.startsWith(prefix))
}

const violations = []

for (const file of walk(SRC)) {
  const relPath = relative(ROOT, file)
  if (isExempt(relPath)) continue

  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0
      let match
      while ((match = rule.pattern.exec(line)) !== null) {
        violations.push({ file: relPath, line: i + 1, found: match[0], message: rule.message })
      }
    }
  })
}

if (violations.length === 0) {
  console.log('check:design — clean. All files follow DESIGN_SYSTEM.md.')
  process.exit(0)
}

console.error(`check:design — ${violations.length} violation(s) of DESIGN_SYSTEM.md:\n`)
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  ${v.found}`)
  console.error(`      ${v.message}\n`)
}
console.error('Read speakup-frontend/DESIGN_SYSTEM.md before changing UI code.')
process.exit(1)

