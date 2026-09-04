package com.speakup.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.speakup.backend.models.ConversationMessage;

import java.time.Instant;

/**
 * What the browser gets back from /start, /turn and /nudge: the tutor's next spoken line
 * plus the session it belongs to.
 *
 * <p>{@code startedAt} is only present on /start. {@code learnerMessage} is only present on
 * /turn, and carries the server-normalised version of what the learner said so the client
 * renders exactly what was stored rather than its own local copy.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ConversationTurnResponse(
        String sessionId,
        Instant startedAt,
        ConversationMessage learnerMessage,
        ConversationMessage reply,
        int messageCount
) {

    public static ConversationTurnResponse started(String sessionId, Instant startedAt,
                                                   ConversationMessage greeting, int messageCount) {
        return new ConversationTurnResponse(sessionId, startedAt, null, greeting, messageCount);
    }

    public static ConversationTurnResponse turn(String sessionId, ConversationMessage learnerMessage,
                                                ConversationMessage reply, int messageCount) {
        return new ConversationTurnResponse(sessionId, null, learnerMessage, reply, messageCount);
    }

    public static ConversationTurnResponse nudge(String sessionId, ConversationMessage reply,
                                                 int messageCount) {
        return new ConversationTurnResponse(sessionId, null, null, reply, messageCount);
    }
}
