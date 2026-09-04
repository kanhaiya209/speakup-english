package com.speakup.backend.services;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.firebase.cloud.FirestoreClient;
import com.speakup.backend.common.ConversationException;
import com.speakup.backend.dto.ConversationTurnResponse;
import com.speakup.backend.models.ConversationMessage;
import com.speakup.backend.models.PracticeSession;
import com.speakup.backend.models.UserProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Owns a voice practice conversation from "start" to "end".
 *
 * <p>The authoritative history lives here, in memory, keyed by a server-generated session id.
 * The browser never sends the conversation back — it sends one utterance at a time — so a
 * client cannot rewrite what it said earlier, and two tabs cannot interleave into one session.
 *
 * <p>A session is written to Firestore exactly once, when it ends: either because the learner
 * ended it, or because it went idle and {@link #pruneStaleSessions()} flushed it. The
 * {@code finalRecord} field makes a second "end" a no-op that returns the same record.
 *
 * <p>Concurrency: one {@link ReentrantLock} per session serialises turns, so a duplicate or
 * overlapping request gets a 409 instead of producing two Groq calls and two tutor replies.
 */
@Service
public class ConversationService {

    private static final Logger log = LoggerFactory.getLogger(ConversationService.class);

    private static final String SESSIONS_COLLECTION = "practiceSessions";
    private static final String USERS_COLLECTION = "users";

    /** Streaks are day-based, and SpeakUp's learners and Firestore region are both in India. */
    private static final ZoneId LEARNER_ZONE = ZoneId.of("Asia/Kolkata");

    /** Ceiling on one session, so a forgotten tab cannot grow without bound. */
    private static final int MAX_MESSAGES_PER_SESSION = 240;
    /** Longest single utterance accepted; anything longer is a runaway recogniser. */
    private static final int MAX_UTTERANCE_CHARS = 1_000;
    /** Consecutive silence nudges before the tutor simply waits. */
    private static final int MAX_CONSECUTIVE_NUDGES = 2;
    /** A session with no traffic for this long is assumed abandoned. */
    private static final Duration IDLE_TIMEOUT = Duration.ofMinutes(45);
    /** How long an ended session stays cached to keep "end" idempotent. */
    private static final Duration ENDED_GRACE = Duration.ofMinutes(5);
    /** A retry of the same utterance within this window returns the cached reply. */
    private static final Duration DUPLICATE_WINDOW = Duration.ofSeconds(20);
    /** How long "end" waits for an in-flight turn before snapshotting anyway. */
    private static final long END_LOCK_WAIT_SECONDS = 8;
    /** Documents pulled for the history list before sorting in memory. */
    private static final int HISTORY_SCAN_LIMIT = 60;
    /** Below this, a session is too short to be worth a minute of practice credit. */
    private static final int MIN_CREDITED_SECONDS = 30;

    private final TutorChatService tutorChatService;
    private final FirebaseService firebaseService;

    /** sessionId → session. Bounded by {@link #pruneStaleSessions()} on every start. */
    private final Map<String, LiveSession> sessions = new ConcurrentHashMap<>();

    public ConversationService(TutorChatService tutorChatService, FirebaseService firebaseService) {
        this.tutorChatService = tutorChatService;
        this.firebaseService = firebaseService;
    }

    /** A conversation in progress. Mutated only while holding {@link #turnLock}. */
    private static final class LiveSession {
        final String sessionId;
        final String userId;
        final Instant startedAt;
        final TutorChatService.LearnerContext learner;
        final List<ConversationMessage> messages = new ArrayList<>();
        final ReentrantLock turnLock = new ReentrantLock();

        volatile Instant lastActivityAt;
        volatile boolean closed;
        volatile Instant closedAt;
        volatile PracticeSession finalRecord;
        int consecutiveNudges;

        LiveSession(String sessionId, String userId, TutorChatService.LearnerContext learner) {
            this.sessionId = sessionId;
            this.userId = userId;
            this.learner = learner;
            this.startedAt = Instant.now();
            this.lastActivityAt = this.startedAt;
        }

        /** Defensive copy — callers iterate this outside the lock. */
        synchronized List<ConversationMessage> snapshot() {
            return List.copyOf(messages);
        }

        synchronized void append(ConversationMessage message) {
            messages.add(message);
            lastActivityAt = Instant.now();
        }

        synchronized void removeLast() {
            if (!messages.isEmpty()) {
                messages.remove(messages.size() - 1);
            }
        }

        synchronized int size() {
            return messages.size();
        }

        synchronized ConversationMessage last() {
            return messages.isEmpty() ? null : messages.get(messages.size() - 1);
        }

        synchronized ConversationMessage secondLast() {
            return messages.size() < 2 ? null : messages.get(messages.size() - 2);
        }
    }

    // ─── Lifecycle ─────────────────────────────────────────────────────

    /**
     * Opens a session and returns the tutor's opening line, which the browser speaks
     * immediately. Any earlier session belonging to this user is closed first — one learner
     * is one conversation, and the old one is flushed rather than dropped.
     */
    public ConversationTurnResponse start(String userId) throws ExecutionException, InterruptedException {
        pruneStaleSessions();
        closeOtherSessionsOf(userId);

        UserProfile profile = firebaseService.getUserById(userId);
        TutorChatService.LearnerContext learner = TutorChatService.LearnerContext.from(profile);

        // Generated before the session is registered: if Groq is down there is no
        // conversation to have, so nothing is left half-open.
        String greeting = tutorChatService.openingLine(learner);

        LiveSession session = new LiveSession(UUID.randomUUID().toString(), userId, learner);
        ConversationMessage message = ConversationMessage.fromTutor(greeting, ConversationMessage.KIND_GREETING);
        session.append(message);
        sessions.put(session.sessionId, session);

        log.info("Practice session {} started for user {}", session.sessionId, userId);
        return ConversationTurnResponse.started(session.sessionId, session.startedAt, message, session.size());
    }

    /**
     * Handles one finalised learner utterance and returns the tutor's reply.
     *
     * @throws IllegalArgumentException (400) when the utterance is empty after normalising
     * @throws ConversationException    404 unknown session, 409 overlapping turn or full
     *                                  session, 502 Groq unreachable
     */
    public ConversationTurnResponse turn(String userId, String sessionId, String rawUtterance) {
        LiveSession session = requireOwnedSession(userId, sessionId);
        String utterance = normaliseUtterance(rawUtterance);

        if (!session.turnLock.tryLock()) {
            throw ConversationException.turnInProgress();
        }
        try {
            // Re-check after acquiring: end() may have closed the session while we waited.
            if (session.closed) {
                throw ConversationException.sessionNotFound();
            }

            ConversationMessage cached = cachedReplyFor(session, utterance);
            if (cached != null) {
                log.debug("Session {} replayed a duplicate utterance", sessionId);
                return ConversationTurnResponse.turn(sessionId, session.secondLast(), cached, session.size());
            }

            if (session.size() >= MAX_MESSAGES_PER_SESSION) {
                throw ConversationException.sessionFull();
            }

            ConversationMessage learnerMessage = ConversationMessage.fromLearner(utterance);
            session.append(learnerMessage);

            ConversationMessage reply;
            try {
                reply = ConversationMessage.fromTutor(
                        tutorChatService.reply(session.learner, session.snapshot()),
                        ConversationMessage.KIND_SPEECH);
            } catch (RuntimeException ex) {
                // Roll back so a client retry does not stack duplicate learner lines.
                session.removeLast();
                throw ex;
            }

            session.append(reply);
            session.consecutiveNudges = 0;
            return ConversationTurnResponse.turn(sessionId, learnerMessage, reply, session.size());
        } finally {
            session.turnLock.unlock();
        }
    }

    /**
     * The learner has gone quiet. Produces an encouraging prompt that refers back to the
     * conversation, or refuses with 429 if the tutor has already nudged enough.
     */
    public ConversationTurnResponse nudge(String userId, String sessionId) {
        LiveSession session = requireOwnedSession(userId, sessionId);

        // A nudge is optional by nature: if a real turn is being processed, drop it.
        if (!session.turnLock.tryLock()) {
            throw ConversationException.nudgeNotNeeded();
        }
        try {
            if (session.closed) {
                throw ConversationException.sessionNotFound();
            }
            if (session.consecutiveNudges >= MAX_CONSECUTIVE_NUDGES
                    || session.size() >= MAX_MESSAGES_PER_SESSION) {
                throw ConversationException.nudgeNotNeeded();
            }

            ConversationMessage reply = ConversationMessage.fromTutor(
                    tutorChatService.silenceNudge(session.learner, session.snapshot()),
                    ConversationMessage.KIND_NUDGE);

            session.append(reply);
            session.consecutiveNudges++;
            return ConversationTurnResponse.nudge(sessionId, reply, session.size());
        } finally {
            session.turnLock.unlock();
        }
    }

    /**
     * Ends the session, persists it, and returns the saved record. Calling it twice returns
     * the first record without touching Firestore again.
     */
    public PracticeSession end(String userId, String sessionId)
            throws ExecutionException, InterruptedException {

        LiveSession session = requireOwnedSession(userId, sessionId);

        // Close first, so an in-flight turn cannot append after the snapshot and a
        // concurrent end() sees the same decision.
        synchronized (session) {
            if (session.finalRecord != null) {
                return session.finalRecord;
            }
            session.closed = true;
            session.closedAt = Instant.now();
        }

        boolean locked = false;
        try {
            locked = session.turnLock.tryLock(END_LOCK_WAIT_SECONDS, TimeUnit.SECONDS);
            if (!locked) {
                log.warn("Session {} ended while a turn was still running", sessionId);
            }
            return finalise(session);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw ex;
        } finally {
            if (locked) {
                session.turnLock.unlock();
            }
        }
    }

    /**
     * The learner's completed sessions, newest first.
     *
     * <p>Queried by equality on {@code userId} only and sorted in memory: pairing a
     * {@code where} with an {@code orderBy} would need a composite index that nothing in this
     * repository creates, and would fail at runtime instead of at deploy time.
     */
    public List<PracticeSession> recentSessions(String userId, int limit)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();
        List<QueryDocumentSnapshot> documents = db.collection(SESSIONS_COLLECTION)
                .whereEqualTo("userId", userId)
                .select("sessionId", "userId", "startedAt", "endedAt", "durationSeconds",
                        "messageCount", "userTurnCount", "userWordCount", "status", "recordingKind")
                .limit(HISTORY_SCAN_LIMIT)
                .get()
                .get()
                .getDocuments();

        List<PracticeSession> summaries = new ArrayList<>(documents.size());
        for (QueryDocumentSnapshot document : documents) {
            summaries.add(toSummary(document));
        }
        summaries.sort(Comparator.comparing(
                PracticeSession::endedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        int size = Math.min(Math.max(limit, 1), summaries.size());
        return List.copyOf(summaries.subList(0, size));
    }

    // ─── Internals ─────────────────────────────────────────────────────

    private LiveSession requireOwnedSession(String userId, String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId is required");
        }
        LiveSession session = sessions.get(sessionId);
        // Same 404 whether the id is unknown or belongs to someone else — one user must not
        // be able to probe for another user's session ids.
        if (session == null || !session.userId.equals(userId)) {
            throw ConversationException.sessionNotFound();
        }
        return session;
    }

    /**
     * Strips control characters, collapses whitespace and truncates. Speech recognition
     * output is not markup, so nothing is escaped here — it is stored as text and rendered
     * as text by React.
     */
    private String normaliseUtterance(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("message is required");
        }
        String text = raw.replaceAll("[\\p{Cntrl}&&[^\n\t]]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        if (text.isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }
        if (text.length() > MAX_UTTERANCE_CHARS) {
            text = text.substring(0, MAX_UTTERANCE_CHARS).trim();
        }
        return text;
    }

    /**
     * If the last exchange was this exact utterance answered moments ago, the client is
     * retrying a request whose response it lost. Returns that reply instead of paying for
     * a second Groq call and appending the sentence twice.
     */
    private ConversationMessage cachedReplyFor(LiveSession session, String utterance) {
        ConversationMessage last = session.last();
        ConversationMessage previous = session.secondLast();
        if (last == null || previous == null) return null;
        if (last.isFromLearner() || !previous.isFromLearner()) return null;
        if (!utterance.equalsIgnoreCase(previous.content())) return null;

        return Duration.between(previous.at(), Instant.now()).compareTo(DUPLICATE_WINDOW) <= 0
                ? last
                : null;
    }

    /** Builds the record, persists it if there is anything to save, and caches it. */
    private PracticeSession finalise(LiveSession session)
            throws ExecutionException, InterruptedException {

        synchronized (session) {
            if (session.finalRecord != null) {
                return session.finalRecord;
            }
        }

        List<ConversationMessage> messages = session.snapshot();
        Instant endedAt = session.closedAt != null ? session.closedAt : Instant.now();
        long durationSeconds = Math.max(0, Duration.between(session.startedAt, endedAt).toSeconds());

        int userTurnCount = 0;
        int userWordCount = 0;
        for (ConversationMessage message : messages) {
            if (message.isFromLearner()) {
                userTurnCount++;
                userWordCount += countWords(message.content());
            }
        }

        boolean worthKeeping = userTurnCount > 0;
        PracticeSession record = new PracticeSession(
                session.sessionId,
                session.userId,
                session.startedAt,
                endedAt,
                durationSeconds,
                messages.size(),
                userTurnCount,
                userWordCount,
                worthKeeping ? PracticeSession.STATUS_COMPLETED : PracticeSession.STATUS_DISCARDED,
                PracticeSession.RECORDING_TRANSCRIPT,
                messages,
                renderTranscript(messages));

        if (worthKeeping) {
            persist(record);
            updatePracticeStats(session.userId, durationSeconds, endedAt);
            log.info("Practice session {} saved: {} turns, {}s", record.sessionId(), userTurnCount, durationSeconds);
        } else {
            log.info("Practice session {} discarded — the learner never spoke", record.sessionId());
        }

        synchronized (session) {
            if (session.finalRecord == null) {
                session.finalRecord = record;
            }
            return session.finalRecord;
        }
    }

    /** Writes the session document, keyed by session id so a replay overwrites rather than duplicates. */
    private void persist(PracticeSession record) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(SESSIONS_COLLECTION).document(record.sessionId());

        List<Map<String, Object>> messages = new ArrayList<>(record.messages().size());
        for (ConversationMessage message : record.messages()) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("role", message.role());
            entry.put("content", message.content());
            entry.put("kind", message.kind());
            entry.put("at", toTimestamp(message.at()));
            messages.add(entry);
        }

        Map<String, Object> data = new HashMap<>();
        data.put("sessionId", record.sessionId());
        data.put("userId", record.userId());
        data.put("startedAt", toTimestamp(record.startedAt()));
        data.put("endedAt", toTimestamp(record.endedAt()));
        data.put("durationSeconds", record.durationSeconds());
        data.put("messageCount", record.messageCount());
        data.put("userTurnCount", record.userTurnCount());
        data.put("userWordCount", record.userWordCount());
        data.put("status", record.status());
        data.put("recordingKind", record.recordingKind());
        data.put("messages", messages);
        data.put("transcript", record.transcript());

        docRef.set(data).get();
    }

    /**
     * Adds the session to the learner's practice minutes and rolls their streak, in a
     * transaction so two sessions ending together cannot lose an increment.
     */
    private void updatePracticeStats(String userId, long durationSeconds, Instant endedAt)
            throws ExecutionException, InterruptedException {

        long minutes = durationSeconds < MIN_CREDITED_SECONDS ? 0 : Math.round(durationSeconds / 60.0);
        LocalDate today = endedAt.atZone(LEARNER_ZONE).toLocalDate();
        String todayKey = today.toString();

        Firestore db = FirestoreClient.getFirestore();
        DocumentReference userRef = db.collection(USERS_COLLECTION).document(userId);

        db.runTransaction(transaction -> {
            DocumentSnapshot snapshot = transaction.get(userRef).get();
            if (!snapshot.exists()) {
                log.warn("Cannot update practice stats — user {} has no profile document", userId);
                return null;
            }

            Long practised = snapshot.getLong("totalMinutesPracticed");
            Long streak = snapshot.getLong("streak");
            String lastPractisedOn = snapshot.getString("lastPractisedOn");

            int nextStreak;
            if (todayKey.equals(lastPractisedOn)) {
                nextStreak = streak != null ? streak.intValue() : 1;
            } else if (lastPractisedOn != null && today.minusDays(1).toString().equals(lastPractisedOn)) {
                nextStreak = (streak != null ? streak.intValue() : 0) + 1;
            } else {
                nextStreak = 1;
            }

            Map<String, Object> updates = new HashMap<>();
            updates.put("totalMinutesPracticed", (practised != null ? practised : 0L) + minutes);
            updates.put("streak", nextStreak);
            updates.put("lastPractisedOn", todayKey);
            updates.put("lastPractisedAt", toTimestamp(endedAt));
            transaction.update(userRef, updates);
            return null;
        }).get();
    }

    /**
     * Ends every other live session for this user. Runs on start, so opening practice in a
     * second tab cannot leave two conversations competing for the same learner.
     */
    private void closeOtherSessionsOf(String userId) {
        for (LiveSession session : sessions.values()) {
            if (!session.userId.equals(userId) || session.closed) continue;
            try {
                end(userId, session.sessionId);
            } catch (Exception ex) {
                // A stale session that will not flush must never block a new one.
                log.warn("Could not flush previous session {}: {}", session.sessionId, ex.getMessage());
            }
        }
    }

    /**
     * Flushes sessions whose browser went away without ending them and evicts records that
     * have been cached long enough. Called from {@link #start} rather than a scheduler so
     * the application needs no background thread.
     */
    private void pruneStaleSessions() {
        Instant now = Instant.now();
        for (LiveSession session : sessions.values()) {
            try {
                if (session.finalRecord != null) {
                    if (session.closedAt != null
                            && Duration.between(session.closedAt, now).compareTo(ENDED_GRACE) > 0) {
                        sessions.remove(session.sessionId, session);
                    }
                    continue;
                }
                if (Duration.between(session.lastActivityAt, now).compareTo(IDLE_TIMEOUT) > 0) {
                    log.info("Flushing idle practice session {}", session.sessionId);
                    end(session.userId, session.sessionId);
                }
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return;
            } catch (Exception ex) {
                log.warn("Could not prune session {}: {}", session.sessionId, ex.getMessage());
                sessions.remove(session.sessionId, session);
            }
        }
    }

    private PracticeSession toSummary(DocumentSnapshot document) {
        return new PracticeSession(
                document.getString("sessionId"),
                document.getString("userId"),
                toInstant(document.get("startedAt")),
                toInstant(document.get("endedAt")),
                longOrZero(document, "durationSeconds"),
                (int) longOrZero(document, "messageCount"),
                (int) longOrZero(document, "userTurnCount"),
                (int) longOrZero(document, "userWordCount"),
                document.getString("status"),
                document.getString("recordingKind"),
                null,
                null);
    }

    private static String renderTranscript(List<ConversationMessage> messages) {
        StringBuilder transcript = new StringBuilder(messages.size() * 80);
        for (ConversationMessage message : messages) {
            transcript.append(message.isFromLearner() ? "You: " : "AI Tutor: ")
                    .append(message.content())
                    .append('\n');
        }
        return transcript.toString().trim();
    }

    private static int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().toLowerCase(Locale.ROOT).split("\\s+").length;
    }

    private static Timestamp toTimestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }

    private static Instant toInstant(Object value) {
        if (value instanceof Timestamp timestamp) {
            return Instant.ofEpochSecond(timestamp.getSeconds(), timestamp.getNanos());
        }
        if (value instanceof java.util.Date date) {
            return date.toInstant();
        }
        return null;
    }

    private static long longOrZero(DocumentSnapshot document, String field) {
        Long value = document.getLong(field);
        return value != null ? value : 0L;
    }
}
