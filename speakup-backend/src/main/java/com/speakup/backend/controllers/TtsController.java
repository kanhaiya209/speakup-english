package com.speakup.backend.controllers;

import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.dto.SpeakRequest;
import com.speakup.backend.services.ElevenLabsTtsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Serves the tutor's voice as audio, so the ElevenLabs key stays on the server.
 *
 * <p>Everything here degrades softly. The browser asks for audio; if it gets anything other
 * than 200 it speaks the same line with the built-in synthesiser instead. A learner without an
 * ElevenLabs key configured never sees an error — they just get the browser voice.
 *
 * <p>Like every other controller, identity comes from the {@code userId} request attribute set
 * by {@code SecurityConfig}'s JWT filter, and a missing one is a 401.
 */
@RestController
@RequestMapping("/api/tts")
public class TtsController {

    private final ElevenLabsTtsService ttsService;

    public TtsController(ElevenLabsTtsService ttsService) {
        this.ttsService = ttsService;
    }

    /**
     * POST /api/tts/speak — body {@code { "text": "…" }}, response {@code audio/mpeg}.
     *
     * <p>503 means "not available, use browser speech": no key configured, quota exhausted, or
     * ElevenLabs unreachable. The body is JSON in that case, which is why the method is not
     * declared as producing audio only.
     */
    @PostMapping("/speak")
    public ResponseEntity<?> speak(@RequestBody(required = false) SpeakRequest request,
                                   HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        String text = request != null && request.text() != null ? request.text().trim() : "";
        if (text.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Text to speak is required"));
        }

        if (!ttsService.isConfigured()) {
            return unavailable("The natural voice is not configured on this server");
        }

        byte[] audio;
        try {
            audio = ttsService.speak(text);
        } catch (RuntimeException ex) {
            return unavailable("The natural voice is unavailable right now");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.valueOf("audio/mpeg"))
                .contentLength(audio.length)
                // The same line is never spoken twice, so there is nothing worth caching, and a
                // cached clip in a shared proxy would be one learner's speech served to another.
                .cacheControl(CacheControl.noStore())
                .body(audio);
    }

    /**
     * 503 rather than 500: this is a capability that is temporarily absent, not a bug, and the
     * frontend branches on the status code to fall back quietly.
     */
    private static ResponseEntity<Map<String, Object>> unavailable(String message) {
        return ResponseEntity.status(503).body(Map.of(
                "success", false,
                "message", message,
                "fallback", "browser"));
    }
}
