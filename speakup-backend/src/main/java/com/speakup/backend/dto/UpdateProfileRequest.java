package com.speakup.backend.dto;

public record UpdateProfileRequest(
        String nativeLanguage,
        String englishLevel,
        String learningGoal,
        Integer dailyGoalMinutes) {
}