package com.speakup.backend.common;

import org.springframework.http.HttpStatus;

/**
 * A conversation failure that already knows which HTTP status the client should see.
 * Handled centrally in {@link GlobalExceptionHandler}, so services can throw it from
 * anywhere without every caller repeating the mapping.
 */
public class ConversationException extends RuntimeException {

    private final HttpStatus status;

    public ConversationException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public ConversationException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }

    /** The session id is unknown, already evicted, or belongs to another user. */
    public static ConversationException sessionNotFound() {
        return new ConversationException(HttpStatus.NOT_FOUND,
                "This practice session is no longer active. Start a new one.");
    }

    /** A turn for this session is already being processed — the client sent a duplicate. */
    public static ConversationException turnInProgress() {
        return new ConversationException(HttpStatus.CONFLICT,
                "Still working on your previous sentence.");
    }

    /** The session has hit its message cap — a new session is needed to keep going. */
    public static ConversationException sessionFull() {
        return new ConversationException(HttpStatus.CONFLICT,
                "This practice session is full. End it and start a new one to keep going.");
    }

    /**
     * A silence nudge was requested when the tutor has already nudged as often as it should.
     * The client treats this as "do nothing" rather than as an error worth showing.
     */
    public static ConversationException nudgeNotNeeded() {
        return new ConversationException(HttpStatus.TOO_MANY_REQUESTS,
                "The tutor is already waiting for you.");
    }

    /** Groq (or the network to it) failed. */
    public static ConversationException aiUnavailable(Throwable cause) {
        return new ConversationException(HttpStatus.BAD_GATEWAY,
                "The AI tutor is unreachable right now. Please try again.", cause);
    }
}
