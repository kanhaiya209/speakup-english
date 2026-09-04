import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/**
 * The VAPID key that signs push subscriptions. Without it there is no way to obtain a token,
 * so the reminders UI renders disabled rather than offering a control that cannot work.
 */
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

/**
 * Cloud Messaging, or null where the browser cannot do it.
 *
 * Called lazily rather than at module load, because `getMessaging` throws outright on Safari
 * and iOS and in any context without a service worker — and this module is imported by the
 * auth path, which every page needs. `isSupported()` is async, so this is too.
 *
 * @returns {Promise<import('firebase/messaging').Messaging | null>}
 */
export async function getMessagingIfSupported() {
  try {
    if (!(await isSupported())) return null;
    return getMessaging(app);
  } catch {
    // No service worker, an insecure origin, or a browser that reports support and then fails.
    return null;
  }
}

/** The config the messaging service worker needs, passed to it as query parameters. */
export function messagingSwUrl() {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey || '',
    projectId: firebaseConfig.projectId || '',
    messagingSenderId: firebaseConfig.messagingSenderId || '',
    appId: firebaseConfig.appId || '',
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

export { app, auth, db, googleProvider };
