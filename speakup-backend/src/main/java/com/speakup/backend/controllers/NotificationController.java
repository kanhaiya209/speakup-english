package com.speakup.backend.controllers;

import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.dto.DeviceTokenRequest;
import com.speakup.backend.services.NotificationService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Device-token registration and a send-now endpoint for practice reminders.
 *
 * <p>Identity comes from the {@code userId} request attribute set by {@code SecurityConfig}'s
 * JWT filter, and a missing one is a 401 — a token must only ever be filed against the learner
 * who is holding it.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * POST /api/notifications/token — body {@code { "token": "…" }}.
     *
     * <p>Safe to call on every page load; the token is its own document id, so a repeat only
     * refreshes {@code lastSeenAt}.
     */
    @PostMapping("/token")
    public ResponseEntity<ApiResponse<Map<String, Object>>> registerToken(
            @RequestBody(required = false) DeviceTokenRequest request,
            HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        String token = request != null ? request.token() : null;
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("A device token is required"));
        }

        if (!notificationService.registerToken(userId, token)) {
            return ResponseEntity.status(503).body(ApiResponse.error(
                    "Could not save this device", "Reminders are unavailable right now"));
        }

        return ResponseEntity.ok(ApiResponse.success("Device registered for reminders",
                Map.of("registered", true)));
    }

    /**
     * DELETE /api/notifications/token — forgets one device.
     *
     * <p>Scoped to the one token rather than the whole learner, because turning reminders off on
     * a laptop should not silence a phone.
     */
    @DeleteMapping("/token")
    public ResponseEntity<ApiResponse<Map<String, Object>>> unregisterToken(
            @RequestBody(required = false) DeviceTokenRequest request,
            HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        String token = request != null ? request.token() : null;
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("A device token is required"));
        }

        notificationService.unregisterToken(userId, token);
        return ResponseEntity.ok(ApiResponse.success("Device removed", Map.of("registered", false)));
    }

    /**
     * POST /api/notifications/test — sends the reminder immediately to this learner's devices.
     *
     * <p>Reports the device count and today's practice state alongside the delivery count, so a
     * "nothing arrived" can be told apart from "no device registered" and from "you already
     * practised, the real job would have skipped you".
     */
    @PostMapping("/test")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendTest(HttpServletRequest httpRequest) {
        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        int delivered = notificationService.sendReminderTo(userId);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("delivered", delivered);
        body.put("practisedToday", notificationService.practisedToday(userId));

        String message = delivered > 0
                ? "Reminder sent"
                : "No registered device to send to";
        return ResponseEntity.ok(ApiResponse.success(message, body));
    }
}
