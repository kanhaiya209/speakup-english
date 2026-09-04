package com.speakup.backend.models;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * A voice practice session as stored in the Firestore "practiceSessions" collection.
 *
 * <p>"Recording" in SpeakUp means the conversation transcript — the project has no audio
 * storage architecture, so {@code recordingKind} is always "transcript". The field exists
 * so a future audio-backed session is distinguishable from these without a migration.
 *
 * <p>{@code messages}, {@code transcript}, {@code fluency}, {@code grammarNotes} and
 * {@code vocabulary} are omitted (null, dropped from JSON) in the list endpoint, which projects
 * only the summary fields out of Firestore.
 *
 * @param mode         the {@link PracticeMode#id()} the session ran in
 * @param fluencyScore the overall fluency score on its own, stored flat at the document root so
 *                     the list projection can read it without a nested field path
 * @param fluency      the full score breakdown; only present on the record returned by
 *                     {@code POST /end}, never in the history list
 * @param grammarNotes what the Grammar Watcher caught, oldest turn first
 * @param vocabulary   words worth learning, from the Vocabulary Agent
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PracticeSession(
        String sessionId,
        String userId,
        Instant startedAt,
        Instant endedAt,
        long durationSeconds,
        int messageCount,
        int userTurnCount,
        int userWordCount,
        String status,
        String recordingKind,
        String mode,
        Integer fluencyScore,
        List<ConversationMessage> messages,
        String transcript,
        FluencyScore fluency,
        List<GrammarNote> grammarNotes,
        List<VocabularyWord> vocabulary
) {

    /** The session is open and lives in the service's active-session map. */
    public static final String STATUS_ACTIVE = "active";
    /** The session was ended and its transcript persisted. */
    public static final String STATUS_COMPLETED = "completed";
    /**
     * The session ended without the learner ever speaking, so nothing was persisted —
     * an empty transcript is not practice and would only pollute their history.
     */
    public static final String STATUS_DISCARDED = "discarded";

    public static final String RECORDING_TRANSCRIPT = "transcript";
}
