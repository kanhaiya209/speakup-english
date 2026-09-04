package com.speakup.backend.dto;

/**
 * Request DTO for updating a user's profile.
 * All fields are optional — null means "don't update this field".
 *
 * <p>{@code tutorVoice} is {@code "browser"} or {@code "elevenlabs"}; anything else is ignored
 * rather than stored, so a stale client cannot write a value the player does not understand.
 */
public record UpdateProfileRequest(
                String name,
                String nativeLanguage,
                String englishLevel,
                String learningGoal,
                Integer dailyGoalMinutes,
                String tutorVoice,
                Boolean notificationsEnabled) {
}
