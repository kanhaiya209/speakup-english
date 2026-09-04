import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { describeApiError, fetchRecentSessions } from '../../api/conversationApi'
import { historyReceived } from '../../store/voiceSlice'
import { formatDuration, formatSessionDate } from './formatters'

/** How many saved sessions the list shows. */
const HISTORY_LIMIT = 5

/**
 * The learner's own saved sessions, read from `GET /api/conversation/sessions`. The backend
 * scopes the query to the authenticated user, so there is nothing here to filter client-side.
 *
 * Fetched once per mount and then kept in Redux, so ending a session updates the list without
 * another round trip.
 */
export default function RecentSessions() {
  const dispatch = useDispatch()
  const { history, historyLoaded } = useSelector((state) => state.voice)

  const [loading, setLoading] = useState(!historyLoaded)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (historyLoaded) return undefined

    let cancelled = false
    fetchRecentSessions(HISTORY_LIMIT)
      .then((sessions) => {
        if (cancelled) return
        dispatch(historyReceived(sessions || []))
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(describeApiError(requestError, 'Your practice history could not be loaded.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dispatch, historyLoaded])

  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-sm text-fg">Recent sessions</h2>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Loading
        </div>
      )}

      {error && !loading && (
        <div className="mt-4 rounded-control border border-danger/30 bg-danger/10 px-3 py-2.5" role="alert">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <p className="mt-4 text-sm text-muted">
          Nothing yet. Your practice sessions are saved here once you finish one.
        </p>
      )}

      {history.length > 0 && (
        <ul className="mt-4 divide-y divide-line">
          {history.map((entry) => (
            <li key={entry.sessionId} className="flex items-baseline justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <span className="text-sm text-fg">{formatSessionDate(entry.endedAt)}</span>
              <span className="text-xs text-muted">
                {formatDuration(entry.durationSeconds)} · {entry.userTurnCount ?? 0}{' '}
                {entry.userTurnCount === 1 ? 'turn' : 'turns'} · {entry.userWordCount ?? 0} words
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
