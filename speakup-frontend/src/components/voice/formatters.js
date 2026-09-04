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

/**
 * Display labels for the practice mode ids stored on every saved session.
 *
 * These are the labels from the backend's `PracticeMode` enum, which owns them. They are
 * repeated here because a saved session carries only the id, and the id is not a label — the
 * ampersand in "Travel & Tourism" cannot be recovered from `travel-tourism`. Keep them in step
 * with the enum; the ids themselves are the API contract and must not be changed.
 */
const MODE_LABELS = {
  'free-talk': 'Free Talk',
  'job-interviews': 'Job Interviews',
  'business-communication': 'Business Communication',
  'daily-conversation': 'Daily Conversation',
  'travel-tourism': 'Travel & Tourism',
  'academic-english': 'Academic English',
  'public-speaking': 'Public Speaking',
}

/**
 * `job-interviews` → `Job Interviews`. An id added to the backend after this map was written
 * still reads sensibly rather than breaking the row, and a session saved before modes existed
 * returns an em dash.
 */
export function formatMode(modeId) {
  if (!modeId) return '—'
  if (MODE_LABELS[modeId]) return MODE_LABELS[modeId]
  return modeId
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
