package com.speakup.backend.dto;

/**
 * Body of POST /api/conversation/start. Optional in every part: an absent body, or an absent or
 * unrecognised {@code mode}, falls back to the mode recommended for the learner's
 * {@code learningGoal}.
 *
 * @param mode a {@code PracticeMode} id, e.g. {@code "job-interviews"}
 */
public record StartSessionRequest(String mode) {}
