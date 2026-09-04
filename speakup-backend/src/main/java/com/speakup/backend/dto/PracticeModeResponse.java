package com.speakup.backend.dto;

import com.speakup.backend.models.PracticeMode;

/**
 * One entry in GET /api/conversation/modes — enough for the picker to render a mode without
 * knowing anything about it, and nothing about the persona prompt, which stays on the server.
 *
 * @param recommended true for the single mode that matches the learner's {@code learningGoal}
 */
public record PracticeModeResponse(
        String id,
        String label,
        String description,
        boolean recommended
) {

    public static PracticeModeResponse of(PracticeMode mode, boolean recommended) {
        return new PracticeModeResponse(mode.id(), mode.label(), mode.description(), recommended);
    }
}
