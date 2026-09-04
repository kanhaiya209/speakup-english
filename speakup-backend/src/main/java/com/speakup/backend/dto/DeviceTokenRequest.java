package com.speakup.backend.dto;

/**
 * Body of the {@code /api/notifications/token} endpoints — one Firebase Cloud Messaging
 * registration token, which identifies one browser on one device.
 */
public record DeviceTokenRequest(String token) {}
