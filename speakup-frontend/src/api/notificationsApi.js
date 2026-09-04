import api from './axiosConfig'

/**
 * Practice-reminder endpoints. The FCM device token is registered against the signed-in
 * learner server-side — the browser never chooses whose reminders it receives.
 *
 * Every call goes through the shared axios instance, so the JWT is attached and a 401 clears
 * the session exactly as it does elsewhere.
 */

function unwrap(response) {
  const body = response.data
  if (!body || body.success !== true) {
    throw new Error(body?.message || 'The request failed.')
  }
  return body.data
}

/**
 * Files this browser's FCM token so reminders can reach it.
 *
 * Safe to call whenever a token is obtained: the token is its own document id on the backend,
 * so a repeat call refreshes `lastSeenAt` rather than adding a duplicate device.
 */
export function registerDeviceToken(token) {
  return api.post('/api/notifications/token', { token }).then(unwrap)
}

/**
 * Forgets this browser's token, leaving the learner's other devices alone.
 *
 * A DELETE with a body needs axios's `{ data }` form — the second positional argument is the
 * config object, not the payload.
 */
export function unregisterDeviceToken(token) {
  return api.delete('/api/notifications/token', { data: { token } }).then(unwrap)
}

/**
 * Sends the reminder to this learner's devices right now.
 *
 * Resolves to { delivered, practisedToday } so the UI can tell "nothing arrived" apart from
 * "no device is registered" and from "you have already practised, so the daily job would have
 * skipped you".
 */
export function sendTestNotification() {
  return api.post('/api/notifications/test').then(unwrap)
}
