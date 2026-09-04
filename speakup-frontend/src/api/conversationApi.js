import api from './axiosConfig'

/**
 * The voice conversation endpoints. Every call goes through the shared axios instance, so
 * the JWT is attached and a 401 clears the session exactly as it does elsewhere.
 *
 * The Groq key lives only on the backend — the browser sends text and receives text.
 */

function unwrap(response) {
  const body = response.data
  if (!body || body.success !== true) {
    throw new Error(body?.message || 'The request failed.')
  }
  return body.data
}

/** Opens a session. Resolves to { sessionId, startedAt, reply, messageCount }. */
export function startConversation() {
  return api.post('/api/conversation/start').then(unwrap)
}

/** Sends one finalised utterance. Resolves to { learnerMessage, reply, messageCount }. */
export function sendUtterance(sessionId, message) {
  return api.post('/api/conversation/turn', { sessionId, message }).then(unwrap)
}

/** Asks the tutor to prompt a learner who has gone quiet. 429 means "no nudge needed". */
export function requestNudge(sessionId) {
  return api.post('/api/conversation/nudge', { sessionId }).then(unwrap)
}

/** Ends the session and saves the transcript. Idempotent on the backend. */
export function endConversation(sessionId) {
  return api.post('/api/conversation/end', { sessionId }).then(unwrap)
}

/** The learner's own saved sessions, newest first. */
export function fetchRecentSessions(limit = 5) {
  return api.get('/api/conversation/sessions', { params: { limit } }).then(unwrap)
}

/**
 * Ends the session from a page that is going away.
 *
 * `sendBeacon` cannot carry an Authorization header, so this uses `fetch` with
 * `keepalive`, which the browser is allowed to finish after the document unloads. Failure
 * is ignored: the backend also flushes idle sessions on its own.
 */
export function endConversationOnUnload(sessionId) {
  if (!sessionId) return

  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const token = localStorage.getItem('speakup_token')
  if (!token) return

  try {
    fetch(`${baseUrl}/api/conversation/end`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {})
  } catch {
    /* Nothing useful to do while the page is unloading. */
  }
}

/**
 * Reads a timestamp the backend sent for a `java.time.Instant`.
 *
 * Spring Boot serialises it as an ISO-8601 string, which is what arrives in practice. A
 * numeric value would be epoch *seconds* rather than milliseconds, so it is handled
 * separately instead of being fed to `new Date` and landing in 1970.
 *
 * Returns `null` for anything unparseable, so callers can simply hide the field.
 */
export function parseInstant(value) {
  if (value == null) return null
  if (typeof value === 'number') return new Date(value * 1000)
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Turns an axios failure into a sentence worth showing a learner, using the backend's own
 * message when it sent one.
 */
export function describeApiError(error, fallback) {
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.code === 'ERR_NETWORK') return 'You appear to be offline. Check your connection and try again.'
  return fallback
}
