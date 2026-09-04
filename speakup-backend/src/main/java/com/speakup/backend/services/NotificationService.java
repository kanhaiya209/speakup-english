package com.speakup.backend.services;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.SetOptions;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.MessagingErrorCode;
import com.google.firebase.messaging.Notification;
import com.google.firebase.messaging.WebpushConfig;
import com.google.firebase.messaging.WebpushNotification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Sends practice reminders over Firebase Cloud Messaging, and keeps the device tokens that
 * make that possible.
 *
 * <p>A learner may have several devices, so tokens live in a subcollection keyed by the token
 * itself — {@code users/{uid}/devices/{token}}. Using the token as the document id makes
 * registration idempotent: the browser re-registers on every load, and a repeat registration
 * refreshes {@code lastSeenAt} instead of creating a duplicate that would double every
 * notification.
 *
 * <p>Tokens rot. A browser that has been cleared, or a learner who revoked permission, leaves a
 * token that FCM answers with {@code UNREGISTERED}. Those are deleted on the spot, so the
 * collection cannot grow into a list of addresses that are certain to fail.
 *
 * <p>Nothing here is fatal. Every failure path logs and returns — a reminder that did not
 * arrive must never break a practice session or a settings save.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private static final String USERS_COLLECTION = "users";
    private static final String DEVICES_SUBCOLLECTION = "devices";
    /** Matches ConversationService: the streak day and "practised today" use the same clock. */
    private static final ZoneId LEARNER_ZONE = ZoneId.of("Asia/Kolkata");
    /** A reminder is pointless past this many devices; a real learner has two or three. */
    private static final int MAX_DEVICES_PER_USER = 10;
    /** One pass of the daily job looks at no more than this many learners. */
    private static final int MAX_USERS_PER_RUN = 500;

    private static final String REMINDER_TITLE = "Time to practise";
    private static final String REMINDER_BODY =
            "A few minutes of speaking keeps your streak alive. Ready when you are.";
    /**
     * Collapses reminders in the tray. Kept in step with the same tag in
     * {@code speakup-frontend/public/firebase-messaging-sw.js}, which needs it for the
     * notifications it draws itself.
     */
    private static final String REMINDER_TAG = "speakup-practice-reminder";

    /**
     * Stores or refreshes one device token for a learner.
     *
     * @return false when the token was blank or the write failed
     */
    public boolean registerToken(String userId, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            Firestore db = FirestoreClient.getFirestore();
            Map<String, Object> device = new HashMap<>();
            device.put("token", token);
            device.put("lastSeenAt", FieldValue.serverTimestamp());
            db.collection(USERS_COLLECTION).document(userId)
                    .collection(DEVICES_SUBCOLLECTION).document(token)
                    // Merge so a re-registration keeps createdAt if a future version adds one.
                    .set(device, SetOptions.merge()).get();
            log.debug("Registered a push token for user {}", userId);
            return true;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Interrupted while registering a push token for user {}", userId);
            return false;
        } catch (Exception ex) {
            log.warn("Could not register a push token for user {}: {}", userId, ex.getMessage());
            return false;
        }
    }

    /**
     * Forgets one device token. Called when the learner turns reminders off, so a device that
     * opted out stops being messaged even though other devices of theirs continue.
     */
    public boolean unregisterToken(String userId, String token) {
        if (token == null || token.isBlank()) {
            return false;
        }
        try {
            FirestoreClient.getFirestore()
                    .collection(USERS_COLLECTION).document(userId)
                    .collection(DEVICES_SUBCOLLECTION).document(token)
                    .delete().get();
            return true;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception ex) {
            log.warn("Could not remove a push token for user {}: {}", userId, ex.getMessage());
            return false;
        }
    }

    /**
     * Sends the reminder to every device of one learner, right now.
     *
     * <p>This is what {@code POST /api/notifications/test} calls: without it, the only way to
     * know the whole chain works — VAPID key, service worker, token, Admin SDK — would be to
     * wait until tomorrow morning.
     *
     * @return how many devices accepted the message; 0 means the learner has no live device
     */
    public int sendReminderTo(String userId) {
        List<String> tokens = tokensOf(userId);
        if (tokens.isEmpty()) {
            return 0;
        }

        int delivered = 0;
        for (String token : tokens) {
            if (send(userId, token)) {
                delivered++;
            }
        }
        return delivered;
    }

    /**
     * Nudges every learner who has reminders on and has not practised today.
     *
     * <p>Runs at 19:00 Asia/Kolkata — late enough that a reminder is not premature, early
     * enough that acting on it still counts for today's streak. The window matters: a reminder
     * at 23:50 would be a reminder to lose the streak.
     */
    @Scheduled(cron = "0 0 19 * * *", zone = "Asia/Kolkata")
    public void sendDailyReminders() {
        String todayKey = LocalDate.now(LEARNER_ZONE).toString();
        int considered = 0;
        int nudged = 0;

        try {
            Firestore db = FirestoreClient.getFirestore();
            QuerySnapshot snapshot = db.collection(USERS_COLLECTION)
                    .whereEqualTo("notificationsEnabled", true)
                    .limit(MAX_USERS_PER_RUN)
                    .get().get();

            for (QueryDocumentSnapshot document : snapshot.getDocuments()) {
                considered++;
                if (todayKey.equals(document.getString("lastPractisedOn"))) {
                    continue;  // Already practised — a reminder would be noise.
                }
                if (sendReminderTo(document.getId()) > 0) {
                    nudged++;
                }
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn("Daily reminder run was interrupted");
            return;
        } catch (Exception ex) {
            log.warn("Daily reminder run failed: {}", ex.getMessage());
            return;
        }

        log.info("Daily reminders: {} learners opted in, {} nudged", considered, nudged);
    }

    /**
     * Sends one message and prunes the token if FCM says the device is gone.
     *
     * <p>The payload deliberately carries no {@code webpush.fcm_options.link}: FCM requires that
     * to be an absolute HTTPS URL, and there is no correct absolute value here — the same backend
     * serves a localhost dev origin and a deployed one. The service worker's own
     * {@code notificationclick} handler opens {@code /practice} relative to whatever origin the
     * browser already has, which is right in both cases.
     *
     * @return true when FCM accepted the message
     */
    private boolean send(String userId, String token) {
        Message message = Message.builder()
                .setToken(token)
                .setNotification(Notification.builder()
                        .setTitle(REMINDER_TITLE)
                        .setBody(REMINDER_BODY)
                        .build())
                .setWebpushConfig(WebpushConfig.builder()
                        .setNotification(WebpushNotification.builder()
                                .setTitle(REMINDER_TITLE)
                                .setBody(REMINDER_BODY)
                                // One tag, so two reminders replace each other in the tray
                                // rather than stacking up while the browser was closed.
                                .setTag(REMINDER_TAG)
                                .build())
                        .build())
                .build();

        try {
            FirebaseMessaging.getInstance().send(message);
            return true;
        } catch (FirebaseMessagingException ex) {
            MessagingErrorCode code = ex.getMessagingErrorCode();
            // Only these two mean the token itself is dead. INVALID_ARGUMENT is deliberately not
            // in the list: it usually means *our* payload was malformed, and deleting a learner's
            // device because of a bug on this side is far worse than retrying tomorrow.
            if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.SENDER_ID_MISMATCH) {
                log.debug("Pruning a dead push token for user {} ({})", userId, code);
                unregisterToken(userId, token);
            } else {
                log.warn("Push to a device of user {} failed: {}", userId, code);
            }
            return false;
        } catch (Exception ex) {
            log.warn("Push to a device of user {} failed: {}", userId, ex.getMessage());
            return false;
        }
    }

    /** Every registered token for one learner, newest registrations included. */
    private List<String> tokensOf(String userId) {
        List<String> tokens = new ArrayList<>();
        try {
            QuerySnapshot snapshot = FirestoreClient.getFirestore()
                    .collection(USERS_COLLECTION).document(userId)
                    .collection(DEVICES_SUBCOLLECTION)
                    .limit(MAX_DEVICES_PER_USER)
                    .get().get();
            for (QueryDocumentSnapshot document : snapshot.getDocuments()) {
                String token = document.getString("token");
                tokens.add(token != null && !token.isBlank() ? token : document.getId());
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (Exception ex) {
            log.warn("Could not read push tokens for user {}: {}", userId, ex.getMessage());
        }
        return tokens;
    }

    /**
     * Reads the learner's own {@code lastPractisedOn}, used by the test endpoint's response so
     * the caller can see why a real reminder would or would not have been sent today.
     */
    public boolean practisedToday(String userId) {
        try {
            DocumentReference ref = FirestoreClient.getFirestore()
                    .collection(USERS_COLLECTION).document(userId);
            ApiFuture<DocumentSnapshot> future = ref.get();
            DocumentSnapshot snapshot = future.get();
            return LocalDate.now(LEARNER_ZONE).toString().equals(snapshot.getString("lastPractisedOn"));
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return false;
        } catch (ExecutionException | RuntimeException ex) {
            log.warn("Could not read practice date for user {}: {}", userId, ex.getMessage());
            return false;
        }
    }
}
