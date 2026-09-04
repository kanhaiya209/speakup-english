/* global firebase */

/**
 * Firebase Cloud Messaging service worker — handles practice reminders that arrive while
 * SpeakUp is closed or in a background tab.
 *
 * This file is served from the origin root, unbundled, so it cannot use `import.meta.env` or
 * ES module imports (module service workers are still Chrome-only). Two consequences:
 *
 *  - the compat SDK is pulled from the CDN with `importScripts`, pinned to the same version as
 *    the `firebase` package in package.json;
 *  - the Firebase config arrives as query parameters on the registration URL, built by
 *    `messagingSwUrl()` in src/firebase.js. That keeps `.env` the single source of truth
 *    instead of hardcoding the project's keys a second time in a file nobody edits.
 *
 * Keep the pinned version in step with package.json. A mismatch is not fatal — the worker
 * simply logs and stops, and foreground notifications still work — but background reminders
 * would go quiet.
 */

importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js')

const params = new URL(self.location.href).searchParams

const config = {
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
}

/** Where a tapped reminder should take the learner. */
const PRACTICE_PATH = '/practice'

if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config)
  const messaging = firebase.messaging()

  /**
   * The backend sends a `webpush.notification` block, so the browser draws the tray notification
   * on its own and this handler is not called for a normal reminder. It exists for the data-only
   * case, and so that a reminder still appears if that ever changes.
   */
  messaging.onBackgroundMessage((payload) => {
    const notification = payload?.notification
    if (!notification) return

    self.registration.showNotification(notification.title || 'SpeakUp', {
      body: notification.body || '',
      icon: '/favicon.svg',
      // Matches the backend's webpush tag, so a second reminder replaces the first rather
      // than stacking up in the tray.
      tag: 'speakup-practice-reminder',
      data: { link: payload?.fcmOptions?.link || PRACTICE_PATH },
    })
  })
} else {
  // Registered before the config was wired up. Say so once instead of failing silently.
  console.warn('[SpeakUp] Messaging service worker started without a Firebase config.')
}

/**
 * Focuses an open SpeakUp tab if there is one, rather than opening a duplicate.
 *
 * The reminder payload carries no link — FCM would require an absolute HTTPS URL, which the
 * backend cannot know — so the target is resolved here, against whatever origin this worker is
 * serving. That is correct on localhost and in production alike.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification?.data?.link || PRACTICE_PATH

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if (client.url.includes(link) && 'focus' in client) return client.focus()
      }
      const target = new URL(link, self.location.origin).href
      if (windows.length > 0 && 'navigate' in windows[0]) {
        return windows[0].focus().then((focused) => focused.navigate(target))
      }
      return clients.openWindow(target)
    }),
  )
})
