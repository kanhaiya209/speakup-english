package com.speakup.backend.dto;

/**
 * Request DTO for updating a user's profile.
 * All fields are optional — null means "don't update this field".
 */
public record UpdateProfileRequest(
                String name,
                String nativeLanguage,
                String englishLevel,
                String learningGoal,
                Integer dailyGoalMinutes) {
}