package com.speakup.backend.dto;

/**
 * Body of POST /api/conversation/turn — one finalised learner utterance.
 *
 * <p>There is deliberately no {@code userId} and no {@code conversationHistory}: identity
 * comes from the JWT, and the server holds the authoritative history for the session, so a
 * client cannot rewrite the conversation it is being graded on.
 */
public record ConversationTurnRequest(String sessionId, String message) {}
