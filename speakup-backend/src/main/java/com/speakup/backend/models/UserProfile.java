package com.speakup.backend.models;

import java.time.Instant;

/**
 * Represents a user profile stored in Firestore "users" collection.
 * Uses a Java Record for immutability and conciseness.
 */
public record UserProfile(
        String userId,
        String email,
        String name,
        String photoUrl,
        String role,
        String nativeLanguage,
        String englishLevel,
        String learningGoal,
        int dailyGoalMinutes,
        int streak,
        long totalMinutesPracticed,
        Instant createdAt
) {

    /**
     * Creates a new UserProfile with sensible defaults for a first-time user.
     */
    public static UserProfile createNew(String userId, String email, String name, String photoUrl) {
        return new UserProfile(
                userId,
                email,
                name,
                photoUrl,
                "learner",   // role default
                null,        // nativeLanguage — set during onboarding
                "beginner",  // englishLevel default
                null,        // learningGoal — set during onboarding
                15,          // dailyGoalMinutes default
                0,           // streak
                0L,          // totalMinutesPracticed
                Instant.now()
        );
    }
}
