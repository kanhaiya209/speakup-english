package com.speakup.backend.dto;

/**
 * Body of POST /api/tts/speak — the line the tutor is about to say.
 */
public record SpeakRequest(String text) {}
