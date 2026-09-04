package com.speakup.backend.models;

import java.time.Instant;

/**
 * A single finalised turn in a voice practice conversation.
 *
 * <p>Interim speech-recognition fragments never reach the backend — only the
 * stabilised utterance the learner actually finished saying.
 *
 * @param role    "user" (the learner) or "assistant" (the AI tutor)
 * @param content the spoken text
 * @param at      when the turn was finalised
 * @param kind    "speech" for a normal turn, "greeting" for the session opener,
 *                "nudge" for an AI prompt triggered by a long silence
 */
public record ConversationMessage(
        String role,
        String content,
        Instant at,
        String kind
) {

    public static final String ROLE_USER = "user";
    public static final String ROLE_ASSISTANT = "assistant";

    public static final String KIND_SPEECH = "speech";
    public static final String KIND_GREETING = "greeting";
    public static final String KIND_NUDGE = "nudge";

    public static ConversationMessage fromLearner(String content) {
        return new ConversationMessage(ROLE_USER, content, Instant.now(), KIND_SPEECH);
    }

    public static ConversationMessage fromTutor(String content, String kind) {
        return new ConversationMessage(ROLE_ASSISTANT, content, Instant.now(), kind);
    }

    public boolean isFromLearner() {
        return ROLE_USER.equals(role);
    }
}
