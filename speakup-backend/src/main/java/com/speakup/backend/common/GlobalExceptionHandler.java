package com.speakup.backend.common;

import com.google.firebase.auth.FirebaseAuthException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler that ensures every error response
 * uses the ApiResponse wrapper with proper HTTP status codes.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Firebase authentication failures (invalid token, expired token, etc.)
     */
    @ExceptionHandler(FirebaseAuthException.class)
    public ResponseEntity<ApiResponse<Void>> handleFirebaseAuthException(FirebaseAuthException ex) {
        log.warn("Firebase auth error: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("Authentication failed", ex.getMessage()));
    }

    /**
     * Voice conversation failures, which already carry the status the client should see
     * (404 unknown session, 409 overlapping turn, 429 unnecessary nudge, 502 AI unreachable).
     */
    @ExceptionHandler(ConversationException.class)
    public ResponseEntity<ApiResponse<Void>> handleConversationException(ConversationException ex) {
        log.warn("Conversation error [{}]: {}", ex.status().value(), ex.getMessage());
        return ResponseEntity
                .status(ex.status())
                .body(ApiResponse.error(ex.getMessage()));
    }

    /**
     * Bad request — missing or invalid parameters.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Bad request", ex.getMessage()));
    }

    /**
     * Catch-all for unexpected exceptions.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unexpected error", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Internal server error", ex.getMessage()));
    }
}
