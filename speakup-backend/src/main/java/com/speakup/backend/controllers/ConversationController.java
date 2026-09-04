package com.speakup.backend.controllers;

import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.dto.ConversationTurnRequest;
import com.speakup.backend.dto.ConversationTurnResponse;
import com.speakup.backend.dto.PracticeModeResponse;
import com.speakup.backend.dto.SessionRequest;
import com.speakup.backend.dto.StartSessionRequest;
import com.speakup.backend.models.PracticeMode;
import com.speakup.backend.models.PracticeSession;
import com.speakup.backend.services.ConversationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * REST controller for the voice practice conversation.
 *
 * <p>Every endpoint takes the learner's identity from the {@code userId} request attribute
 * that {@code SecurityConfig}'s JWT filter sets — never from the request body. Because
 * {@code SecurityConfig} permits all requests at the filter-chain level, each method checks
 * for that attribute itself and answers 401 when it is missing.
 *
 * <p>The Groq API key stays on this side of the wire: the browser receives generated text
 * and nothing else.
 *
 * <p>Failures are mapped centrally in {@code GlobalExceptionHandler} — 400 for an invalid
 * payload, 404 for a session that is not the caller's, 409 for an overlapping turn, 429 for
 * an unnecessary nudge, 502 when Groq is unreachable.
 */
@RestController
@RequestMapping("/api/conversation")
public class ConversationController {

    private static final int DEFAULT_HISTORY_LIMIT = 10;
    private static final int MAX_HISTORY_LIMIT = 50;

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    /**
     * POST /api/conversation/start — opens a session and returns the tutor's opening line.
     * Body is optional: {@code { "mode": "job-interviews" }}. Without it the mode recommended
     * for the learner's goal is used.
     */
    @PostMapping("/start")
    public ResponseEntity<ApiResponse<ConversationTurnResponse>> start(
            @RequestBody(required = false) StartSessionRequest request,
            HttpServletRequest httpRequest) throws ExecutionException, InterruptedException {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return unauthorized();
        }

        ConversationTurnResponse response =
                conversationService.start(userId, request != null ? request.mode() : null);
        return ResponseEntity.ok(ApiResponse.success("Practice session started", response));
    }

    /**
     * GET /api/conversation/modes — the seven practice modes, with the one matching the caller's
     * learning goal flagged as recommended.
     *
     * <p>Served from here rather than duplicated as a frontend constant: the persona prompt
     * behind each mode lives on the server, and the ids are an API contract shared with every
     * saved session.
     */
    @GetMapping("/modes")
    public ResponseEntity<ApiResponse<List<PracticeModeResponse>>> modes(HttpServletRequest httpRequest)
            throws ExecutionException, InterruptedException {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return unauthorized();
        }

        PracticeMode recommended = conversationService.recommendedMode(userId);
        List<PracticeModeResponse> modes = Arrays.stream(PracticeMode.values())
                .map(mode -> PracticeModeResponse.of(mode, mode == recommended))
                .toList();
        return ResponseEntity.ok(ApiResponse.success("Practice modes retrieved", modes));
    }

    /**
     * POST /api/conversation/turn — submits one finalised utterance and returns the reply.
     * Body: {@code { "sessionId": "…", "message": "…" }}
     */
    @PostMapping("/turn")
    public ResponseEntity<ApiResponse<ConversationTurnResponse>> turn(
            @RequestBody(required = false) ConversationTurnRequest request,
            HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return unauthorized();
        }
        if (request == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("A message is required"));
        }

        ConversationTurnResponse response =
                conversationService.turn(userId, request.sessionId(), request.message());
        return ResponseEntity.ok(ApiResponse.success("Tutor replied", response));
    }

    /**
     * POST /api/conversation/nudge — the learner has been silent, so the tutor encourages them.
     * Body: {@code { "sessionId": "…" }}
     */
    @PostMapping("/nudge")
    public ResponseEntity<ApiResponse<ConversationTurnResponse>> nudge(
            @RequestBody(required = false) SessionRequest request,
            HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return unauthorized();
        }
        if (request == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("A sessionId is required"));
        }

        ConversationTurnResponse response = conversationService.nudge(userId, request.sessionId());
        return ResponseEntity.ok(ApiResponse.success("Tutor prompted the learner", response));
    }

    /**
     * POST /api/conversation/end — ends the session and saves the transcript. Idempotent:
     * calling it twice returns the same saved record without a second write.
     * Body: {@code { "sessionId": "…" }}
     */
    @PostMapping("/end")
    public ResponseEntity<ApiResponse<PracticeSession>> end(
            @RequestBody(required = false) SessionRequest request,
            HttpServletRequest httpRequest) throws ExecutionException, InterruptedException {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return unauthorized();
        }
        if (request == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("A sessionId is required"));
        }

        PracticeSession session = conversationService.end(userId, request.sessionId());
        return ResponseEntity.ok(ApiResponse.success("Practice session saved", session));
    }

    /**
     * GET /api/conversation/sessions — the caller's own completed sessions, newest first.
     * Summaries only; transcripts are not returned in bulk.
     */
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<PracticeSession>>> sessions(
            @RequestParam(name = "limit", required = false) Integer limit,
            HttpServletRequest httpRequest) throws ExecutionException, InterruptedException {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return unauthorized();
        }

        int requested = limit != null ? Math.min(Math.max(limit, 1), MAX_HISTORY_LIMIT) : DEFAULT_HISTORY_LIMIT;
        List<PracticeSession> sessions = conversationService.recentSessions(userId, requested);
        return ResponseEntity.ok(ApiResponse.success("Practice sessions retrieved", sessions));
    }

    private static <T> ResponseEntity<ApiResponse<T>> unauthorized() {
        return ResponseEntity.status(401)
                .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
    }
}
