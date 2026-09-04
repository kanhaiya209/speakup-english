package com.speakup.backend.services;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.SetOptions;
import com.google.cloud.firestore.WriteBatch;
import com.google.firebase.cloud.FirestoreClient;
import com.speakup.backend.agents.GrammarWatcherAgent;
import com.speakup.backend.common.ConversationException;
import com.speakup.backend.dto.ConversationTurnResponse;
import com.speakup.backend.models.ConversationMessage;
import com.speakup.backend.models.FluencyScore;
import com.speakup.backend.models.GrammarNote;
import com.speakup.backend.models.PracticeMode;
import com.speakup.backend.models.PracticeSession;
import com.speakup.backend.models.UserProfile;
import com.speakup.backend.models.VocabularyWord;
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
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
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
    /** Per-learner vocabulary book, deduped by word so a repeat increments instead of duplicating. */
    private static final String VOCABULARY_SUBCOLLECTION = "vocabulary";
    /** Per-learner mistake log, one document per correction, queryable without scanning sessions. */
    private static final String MISTAKES_SUBCOLLECTION = "mistakes";

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
    /**
     * How long "end" waits for the last grammar inspections. The final turn's check was
     * dispatched at most a tutor-reply ago, so this is usually already satisfied; the timeout
     * only bounds the case where Groq is slow, and missing a note costs less than a slow save.
     */
    private static final long GRAMMAR_WAIT_SECONDS = 4;
    /** Documents pulled for the history list before sorting in memory. */
    private static final int HISTORY_SCAN_LIMIT = 60;
    /** Below this, a session is too short to be worth a minute of practice credit. */
    private static final int MIN_CREDITED_SECONDS = 30;

    private final TutorChatService tutorChatService;
    private final FirebaseService firebaseService;
    private final GrammarWatcherAgent grammarWatcherAgent;
    private final SessionInsightService sessionInsightService;

    /** sessionId → session. Bounded by {@link #pruneStaleSessions()} on every start. */
    private final Map<String, LiveSession> sessions = new ConcurrentHashMap<>();

    public ConversationService(TutorChatService tutorChatService,
                               FirebaseService firebaseService,
                               GrammarWatcherAgent grammarWatcherAgent,
                               SessionInsightService sessionInsightService) {
        this.tutorChatService = tutorChatService;
        this.firebaseService = firebaseService;
        this.grammarWatcherAgent = grammarWatcherAgent;
        this.sessionInsightService = sessionInsightService;
    }

    /** A conversation in progress. Mutated only while holding {@link #turnLock}. */
    private static final class LiveSession {
        final String sessionId;
        final String userId;
        final Instant startedAt;
        final TutorChatService.LearnerContext learner;
        final PracticeMode mode;
        final List<ConversationMessage> messages = new ArrayList<>();
        final ReentrantLock turnLock = new ReentrantLock();

        /**
         * Written by the async Grammar Watcher while the tutor's reply is still being generated,
         * read on the request thread at session end — hence copy-on-write rather than the
         * {@code synchronized} discipline the message list uses.
         */
        final List<GrammarNote> grammarNotes = new CopyOnWriteArrayList<>();
        /** Learner turns dispatched to the Grammar Watcher, and the turn index it stamps notes with. */
        final AtomicInteger learnerTurns = new AtomicInteger();
        /**
         * One future per dispatched inspection, each completing with whether that utterance was
         * genuinely checked. Session end waits briefly on these: zero notes because every check
         * failed must not score the same as zero notes because the learner spoke well.
         */
        final List<CompletableFuture<Boolean>> grammarChecks = new CopyOnWriteArrayList<>();

        volatile Instant lastActivityAt;
        volatile boolean closed;
        volatile Instant closedAt;
        volatile PracticeSession finalRecord;
        int consecutiveNudges;

        LiveSession(String sessionId, String userId, TutorChatService.LearnerContext learner, PracticeMode mode) {
            this.sessionId = sessionId;
            this.userId = userId;
            this.learner = learner;
            this.mode = mode;
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
     *
     * @param modeId the practice mode the learner picked; null or unknown falls back to the
     *               mode recommended for their {@code learningGoal}
     */
    public ConversationTurnResponse start(String userId, String modeId)
            throws ExecutionException, InterruptedException {

        pruneStaleSessions();
        closeOtherSessionsOf(userId);

        UserProfile profile = firebaseService.getUserById(userId);
        PracticeMode mode = resolveMode(modeId, profile);
        TutorChatService.LearnerContext learner = TutorChatService.LearnerContext.from(profile, mode);

        // Generated before the session is registered: if Groq is down there is no
        // conversation to have, so nothing is left half-open.
        String greeting = tutorChatService.openingLine(learner);

        LiveSession session = new LiveSession(UUID.randomUUID().toString(), userId, learner, mode);
        ConversationMessage message = ConversationMessage.fromTutor(greeting, ConversationMessage.KIND_GREETING);
        session.append(message);
        sessions.put(session.sessionId, session);

        log.info("Practice session {} started for user {} in {} mode", session.sessionId, userId, mode.id());
        return ConversationTurnResponse.started(
                session.sessionId, session.startedAt, message, session.size(), mode.id(), mode.label());
    }

    /**
     * An explicit mode wins; otherwise the Mode Selector picks one from the learner's stated
     * reason for practising. Both paths end at a real mode — {@link PracticeMode#FREE_TALK} —
     * so a stale or empty client never fails to start a session.
     */
    private static PracticeMode resolveMode(String modeId, UserProfile profile) {
        if (modeId != null && !modeId.isBlank()) {
            return PracticeMode.fromId(modeId);
        }
        return PracticeMode.recommendedFor(profile != null ? profile.learningGoal() : null);
    }

    /** The mode this learner's profile suggests, for the picker's "recommended" marker. */
    public PracticeMode recommendedMode(String userId) throws ExecutionException, InterruptedException {
        UserProfile profile = firebaseService.getUserById(userId);
        return PracticeMode.recommendedFor(profile != null ? profile.learningGoal() : null);
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

            // Dispatched before the tutor call so the two Groq requests overlap: grammar analysis
            // never sits on the critical path of a spoken reply, and it cannot fail this turn —
            // GrammarWatcherAgent catches everything internally.
            int turnIndex = session.learnerTurns.incrementAndGet();
            session.grammarChecks.add(
                    grammarWatcherAgent.inspect(session.learner, utterance, turnIndex, session.grammarNotes));

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
                        "messageCount", "userTurnCount", "userWordCount", "status", "recordingKind",
                        "mode", "fluencyScore")
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

        SessionInsightService.SessionInsights insights = null;
        if (worthKeeping) {
            // Everything in here is best-effort: a broken agent produces a thinner summary,
            // never a failed /end that loses the learner's transcript.
            try {
                boolean grammarRan = awaitGrammarChecks(session);
                insights = sessionInsightService.analyse(
                        session.learner, messages, durationSeconds, session.grammarNotes, grammarRan);
            } catch (Exception ex) {
                log.warn("Could not analyse session {}: {}", session.sessionId, ex.getMessage());
            }
        }

        // Null when the session was too short to score, so the summary shows "—" rather than a
        // number the transcript cannot support.
        FluencyScore fluency = insights != null ? insights.fluency() : null;

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
                session.mode.id(),
                fluency != null ? fluency.overall() : null,
                messages,
                renderTranscript(messages),
                fluency,
                insights != null ? insights.grammarNotes() : null,
                insights != null ? insights.vocabulary() : null);

        if (worthKeeping) {
            persist(record);
            persistLearnerInsights(record);
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
        data.put("mode", record.mode());
        data.put("messages", messages);
        data.put("transcript", record.transcript());
        // Flat at the root as well as inside "fluency": recentSessions() projects individual
        // fields, and a nested field path there would be one more thing to keep in sync.
        data.put("fluencyScore", record.fluencyScore());
        data.put("fluency", toMap(record.fluency()));
        data.put("grammarNotes", grammarNotesToList(record.grammarNotes()));
        data.put("vocabulary", vocabularyToList(record.vocabulary()));

        docRef.set(data).get();
    }

    /**
     * Mirrors the session's corrections and new words into per-learner subcollections, so the
     * review features in module 3 can query them directly instead of scanning every session.
     *
     * <p>Both writes use deterministic document ids, which makes the whole thing idempotent: a
     * re-saved session overwrites its own rows rather than duplicating them.
     */
    private void persistLearnerInsights(PracticeSession record)
            throws ExecutionException, InterruptedException {

        List<GrammarNote> notes = record.grammarNotes() != null ? record.grammarNotes() : List.of();
        List<VocabularyWord> words = record.vocabulary() != null ? record.vocabulary() : List.of();
        if (notes.isEmpty() && words.isEmpty()) {
            return;
        }

        Firestore db = FirestoreClient.getFirestore();
        DocumentReference userRef = db.collection(USERS_COLLECTION).document(record.userId());
        Timestamp endedAt = toTimestamp(record.endedAt());

        // Resolve which words the learner already has before batching, so "firstSeenAt" is set
        // once and "timesSeen" counts sessions rather than resetting on every repeat.
        Map<String, DocumentReference> wordRefs = new LinkedHashMap<>();
        for (VocabularyWord word : words) {
            String slug = word.slug();
            if (slug != null) {
                wordRefs.putIfAbsent(slug, userRef.collection(VOCABULARY_SUBCOLLECTION).document(slug));
            }
        }
        Set<String> alreadyKnown = new HashSet<>();
        if (!wordRefs.isEmpty()) {
            List<DocumentSnapshot> existing =
                    db.getAll(wordRefs.values().toArray(DocumentReference[]::new)).get();
            for (DocumentSnapshot snapshot : existing) {
                if (snapshot.exists()) {
                    alreadyKnown.add(snapshot.getId());
                }
            }
        }

        WriteBatch batch = db.batch();

        for (VocabularyWord word : words) {
            String slug = word.slug();
            DocumentReference ref = slug != null ? wordRefs.get(slug) : null;
            if (ref == null) continue;

            Map<String, Object> entry = new HashMap<>();
            entry.put("word", word.word());
            entry.put("meaning", word.meaning());
            entry.put("example", word.example());
            entry.put("source", word.source());
            entry.put("lastSessionId", record.sessionId());
            entry.put("lastSeenAt", endedAt);
            entry.put("timesSeen", FieldValue.increment(1));
            if (!alreadyKnown.contains(slug)) {
                entry.put("firstSeenAt", endedAt);
            }
            batch.set(ref, entry, SetOptions.merge());
        }

        for (int i = 0; i < notes.size(); i++) {
            GrammarNote note = notes.get(i);
            String id = record.sessionId() + "-" + i;

            Map<String, Object> entry = new HashMap<>();
            entry.put("said", note.said());
            entry.put("better", note.better());
            entry.put("why", note.why());
            entry.put("type", note.type());
            entry.put("turnIndex", note.turnIndex());
            entry.put("sessionId", record.sessionId());
            entry.put("at", endedAt);
            batch.set(userRef.collection(MISTAKES_SUBCOLLECTION).document(id), entry);
        }

        batch.commit().get();
        log.debug("Mirrored {} word(s) and {} correction(s) for user {}",
                words.size(), notes.size(), record.userId());
    }

    /**
     * Waits briefly for the async grammar inspections, then reports whether any of them actually
     * ran. False means accuracy was never measured — the fluency score rescales rather than
     * crediting a perfect accuracy component nobody checked.
     */
    private static boolean awaitGrammarChecks(LiveSession session) {
        List<CompletableFuture<Boolean>> checks = List.copyOf(session.grammarChecks);
        if (checks.isEmpty()) {
            return false;
        }
        try {
            CompletableFuture.allOf(checks.toArray(CompletableFuture[]::new))
                    .get(GRAMMAR_WAIT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        } catch (Exception ex) {
            log.debug("Grammar checks for session {} did not all finish in time", session.sessionId);
        }

        for (CompletableFuture<Boolean> check : checks) {
            if (check.isDone() && !check.isCompletedExceptionally()
                    && Boolean.TRUE.equals(check.getNow(Boolean.FALSE))) {
                return true;
            }
        }
        return false;
    }

    private static Map<String, Object> toMap(FluencyScore fluency) {
        if (fluency == null) return null;
        Map<String, Object> data = new HashMap<>();
        data.put("overall", fluency.overall());
        data.put("band", fluency.band());
        data.put("participation", fluency.participation());
        data.put("turnSubstance", fluency.turnSubstance());
        data.put("flow", fluency.flow());
        data.put("accuracy", fluency.accuracy());
        data.put("range", fluency.range());
        data.put("accuracyMeasured", fluency.accuracyMeasured());
        data.put("wordsPerTurn", fluency.wordsPerTurn());
        data.put("fillerCount", fluency.fillerCount());
        return data;
    }

    private static List<Map<String, Object>> grammarNotesToList(List<GrammarNote> notes) {
        if (notes == null || notes.isEmpty()) return List.of();
        List<Map<String, Object>> list = new ArrayList<>(notes.size());
        for (GrammarNote note : notes) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("said", note.said());
            entry.put("better", note.better());
            entry.put("why", note.why());
            entry.put("type", note.type());
            entry.put("turnIndex", note.turnIndex());
            list.add(entry);
        }
        return list;
    }

    private static List<Map<String, Object>> vocabularyToList(List<VocabularyWord> words) {
        if (words == null || words.isEmpty()) return List.of();
        List<Map<String, Object>> list = new ArrayList<>(words.size());
        for (VocabularyWord word : words) {
            Map<String, Object> entry = new HashMap<>();
            entry.put("word", word.word());
            entry.put("meaning", word.meaning());
            entry.put("example", word.example());
            entry.put("source", word.source());
            list.add(entry);
        }
        return list;
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
        Long fluencyScore = document.getLong("fluencyScore");
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
                document.getString("mode"),
                // Left null for sessions saved before scoring existed, so the UI shows "—"
                // instead of implying they scored zero.
                fluencyScore != null ? fluencyScore.intValue() : null,
                null,
                null,
                null,
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
