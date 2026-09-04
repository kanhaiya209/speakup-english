package com.speakup.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.speakup.backend.models.ConversationMessage;

import java.time.Instant;

/**
 * What the browser gets back from /start, /turn and /nudge: the tutor's next spoken line
 * plus the session it belongs to.
 *
 * <p>{@code startedAt}, {@code mode} and {@code modeLabel} are only present on /start — the
 * mode is fixed for the life of a session, so repeating it on every turn would be noise.
 * {@code learnerMessage} is only present on /turn, and carries the server-normalised version of
 * what the learner said so the client renders exactly what was stored rather than its own local
 * copy.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationTurnResponse(
        String sessionId,
        Instant startedAt,
        ConversationMessage learnerMessage,
        ConversationMessage reply,
        int messageCount,
        String mode,
        String modeLabel
) {

    public static ConversationTurnResponse started(String sessionId, Instant startedAt,
                                                   ConversationMessage greeting, int messageCount,
                                                   String mode, String modeLabel) {
        return new ConversationTurnResponse(sessionId, startedAt, null, greeting, messageCount, mode, modeLabel);
    }

    public static ConversationTurnResponse turn(String sessionId, ConversationMessage learnerMessage,
                                                ConversationMessage reply, int messageCount) {
        return new ConversationTurnResponse(sessionId, null, learnerMessage, reply, messageCount, null, null);
    }

    public static ConversationTurnResponse nudge(String sessionId, ConversationMessage reply,
                                                 int messageCount) {
        return new ConversationTurnResponse(sessionId, null, null, reply, messageCount, null, null);
    }
}
