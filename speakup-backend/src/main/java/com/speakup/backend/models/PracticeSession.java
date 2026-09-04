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
 * <p>{@code messages} and {@code transcript} are omitted (null, dropped from JSON) in the
 * list endpoint, which projects only the summary fields out of Firestore.
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
        List<ConversationMessage> messages,
        String transcript
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
