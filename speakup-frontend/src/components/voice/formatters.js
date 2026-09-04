import { parseInstant } from '../../api/conversationApi'

/**
 * Shared display formatting for saved sessions. Kept out of the components so the summary
 * card and the history list cannot drift apart, and out of the component files so the
 * react-refresh boundary stays clean.
 */

/** `95` → `1m 35s`. Seconds only below a minute, so short sessions read honestly. */
export function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds ?? 0))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`
}

/** `2026-09-04T13:42:11Z` → `4 Sep, 7:12 pm`. Returns an em dash when there is no date. */
export function formatSessionDate(value) {
  const date = parseInstant(value)
  if (!date) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
