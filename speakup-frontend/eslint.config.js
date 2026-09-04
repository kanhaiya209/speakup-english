import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * Design-system guard. See DESIGN_SYSTEM.md §3 (hard rules).
 * Glob patterns, not exact paths, so a deeper relative import cannot slip through.
 * Banned everywhere, with no exceptions: `framer-motion` is uninstalled and the three
 * legacy `ui/` components are deleted, but the patterns stay so re-adding one fails lint.
 */
const bannedDesignImports = [
  {
    group: ['framer-motion', 'framer-motion/*', 'motion', 'motion/*'],
    message:
      'framer-motion is banned — see DESIGN_SYSTEM.md §3. The motion budget is transition-colors, plus transition-all on progress bars and animate-spin on spinners.',
  },
  {
    group: ['**/ui/shimmer-button', '**/ui/shimmer-button.jsx'],
    message: 'ShimmerButton is legacy — see DESIGN_SYSTEM.md §10. Use the button recipes in §4.',
  },
  {
    group: ['**/ui/background-beams', '**/ui/background-beams.jsx'],
    message: 'BackgroundBeams is legacy — see DESIGN_SYSTEM.md §10. Backgrounds are flat bg-canvas.',
  },
  {
    group: ['**/ui/meteors', '**/ui/meteors.jsx'],
    message: 'Meteors is legacy — see DESIGN_SYSTEM.md §10. No decorative animation.',
  },
]

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-imports': ['error', { patterns: bannedDesignImports }],
    },
  },
  {
    /**
     * The Cloud Messaging service worker. Declares the worker globals it genuinely runs with
     * (`self`, `clients`, `importScripts`) rather than silencing the undefined-variable rule —
     * no rule is relaxed here, only the environment corrected.
     */
    files: ['public/firebase-messaging-sw.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },
])
