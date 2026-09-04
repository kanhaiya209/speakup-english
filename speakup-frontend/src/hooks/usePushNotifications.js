import { useCallback, useEffect, useRef, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import api from '../api/axiosConfig'
// The shared axios-error humaniser. It lives beside the conversation calls but is not specific
// to them, and re-implementing it here would only let the two copies drift.
import { describeApiError } from '../api/conversationApi'
import {
  registerDeviceToken,
  sendTestNotification,
  unregisterDeviceToken,
} from '../api/notificationsApi'
import { getMessagingIfSupported, messagingSwUrl, vapidKey } from '../firebase'
import { setUser } from '../store/authSlice'

/** Browser permission for this origin, or `'unsupported'` where there is no Notification API. */
function currentPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * Practice reminders through Firebase Cloud Messaging.
 *
 * Three things have to be true before a reminder can ever arrive: the browser supports push,
 * a `VITE_FIREBASE_VAPID_KEY` is configured, and the learner has granted permission. They fail
 * independently and they are reported separately, because "your browser cannot do this" and
 * "you said no" call for different words in the UI.
 *
 * The persisted preference is `notificationsEnabled` on the user profile — the daily job on the
 * backend reads it, so it is the one source of truth. `enabled` here is read from Redux rather
 * than tracked locally, and the toggle writes it through immediately: a permission prompt cannot
 * sensibly wait for a Save button.
 *
 * Returns `{ available, unsupported, needsKey, permission, enabled, busy, enable, disable,
 * sendTest }`. `available` is false until the support check resolves, so a control bound to it
 * starts disabled and never flickers into a state it cannot honour.
 */
export default function usePushNotifications() {
  const dispatch = useDispatch()
  const user = useSelector((state) => state.auth.user)
  const enabled = user?.notificationsEnabled === true

  /** null while the async support check is still running. */
  const [supported, setSupported] = useState(null)
  const [permission, setPermission] = useState(currentPermission)
  const [busy, setBusy] = useState(false)

  const tokenRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const refreshedRef = useRef(false)
  const unmountedRef = useRef(false)

  const hasKey = Boolean(vapidKey)
  const available = supported === true && hasKey

  useEffect(() => {
    unmountedRef.current = false
    let active = true
    // Never throws — it answers null where the browser cannot do push.
    getMessagingIfSupported().then((messaging) => {
      if (active) setSupported(Boolean(messaging))
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => () => {
      unmountedRef.current = true
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    },
    [],
  )

  /**
   * Shows reminders that arrive while SpeakUp is the focused tab.
   *
   * The service worker only draws a tray notification when the page is in the background, so
   * without this a foreground reminder would be silently dropped.
   */
  const listenInForeground = useCallback((messaging) => {
    if (unsubscribeRef.current) return
    unsubscribeRef.current = onMessage(messaging, (payload) => {
      const text = payload?.notification?.body || payload?.notification?.title
      if (text) toast(text)
    })
  }, [])

  /**
   * Obtains this browser's FCM token and files it against the learner.
   *
   * Resolves to null rather than throwing when push is simply not on offer. The service worker
   * is registered here rather than at start-up so a learner who never enables reminders never
   * gets one installed; `register` is idempotent for a given URL.
   */
  const obtainToken = useCallback(async () => {
    if (!hasKey || !('serviceWorker' in navigator)) return null

    const messaging = await getMessagingIfSupported()
    if (!messaging) return null

    const registration = await navigator.serviceWorker.register(messagingSwUrl())
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    })
    if (!token) return null

    tokenRef.current = token
    // The load-time refresh below has nothing left to do once this has run.
    refreshedRef.current = true
    await registerDeviceToken(token)
    listenInForeground(messaging)
    return token
  }, [hasKey, listenInForeground])

  /** Writes the preference the daily reminder job reads, and mirrors it into Redux. */
  const savePreference = useCallback(
    async (next) => {
      const response = await api.patch('/api/user/profile', { notificationsEnabled: next })
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'The preference could not be saved.')
      }
      dispatch(setUser({ ...user, ...response.data.data }))
    },
    [dispatch, user],
  )

  useEffect(() => {
    if (!available || !enabled || permission !== 'granted' || refreshedRef.current) return
    refreshedRef.current = true
    // FCM tokens rotate, so re-filing the current one on load is what keeps reminders reaching
    // this browser — and it is also what starts the foreground listener for this page.
    obtainToken().catch(() => {
      // The preference stays on and the next page load tries again. Nothing to say here: the
      // learner did not ask for anything just now.
    })
  }, [available, enabled, obtainToken, permission])

  const enable = useCallback(async () => {
    if (!available) return false

    setBusy(true)
    try {
      const granted = await Notification.requestPermission()
      if (!unmountedRef.current) setPermission(granted)
      if (granted !== 'granted') {
        toast.error('Reminders need notification permission for this site.')
        return false
      }

      const token = await obtainToken()
      if (!token) {
        toast.error('This browser would not provide a notification token.')
        return false
      }

      await savePreference(true)
      toast.success('Practice reminders are on.')
      return true
    } catch (error) {
      toast.error(describeApiError(error, 'Reminders could not be turned on.'))
      return false
    } finally {
      if (!unmountedRef.current) setBusy(false)
    }
  }, [available, obtainToken, savePreference])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      // The token goes first, so a reminder cannot land after the learner has switched off. A
      // browser with no token registered in this page's lifetime has nothing to drop, and a
      // failed removal must not stop the preference being saved — the daily job reads the
      // preference, so that write is what actually stops the reminders.
      if (tokenRef.current) {
        await unregisterDeviceToken(tokenRef.current).catch(() => {
          /* Left filed on the server; the preference below is what silences it. */
        })
        tokenRef.current = null
      }

      await savePreference(false)
      toast.success('Practice reminders are off.')
      return true
    } catch (error) {
      toast.error(describeApiError(error, 'Reminders could not be turned off.'))
      return false
    } finally {
      if (!unmountedRef.current) setBusy(false)
    }
  }, [savePreference])

  /**
   * Sends the reminder immediately, so reminders are verifiable without waiting a day.
   *
   * Resolves to the backend's `{ delivered, practisedToday }`, or null if the request failed.
   */
  const sendTest = useCallback(async () => {
    setBusy(true)
    try {
      const result = await sendTestNotification()
      if (result?.delivered > 0) {
        toast.success('Test reminder sent.')
      } else {
        toast.error('No device is registered to send to yet.')
      }
      return result
    } catch (error) {
      toast.error(describeApiError(error, 'The test reminder could not be sent.'))
      return null
    } finally {
      if (!unmountedRef.current) setBusy(false)
    }
  }, [])

  return {
    available,
    /** The browser cannot do web push at all — Safari and iOS, mostly. */
    unsupported: supported === false,
    /** Push is possible here, but no VAPID key has been configured for this build. */
    needsKey: !hasKey,
    permission,
    enabled,
    busy,
    enable,
    disable,
    sendTest,
  }
}
