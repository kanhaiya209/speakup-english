package com.speakup.backend.dto;

/**
 * Body of the conversation endpoints that act on a session without sending speech:
 * POST /api/conversation/nudge and POST /api/conversation/end.
 */
public record SessionRequest(String sessionId) {}
