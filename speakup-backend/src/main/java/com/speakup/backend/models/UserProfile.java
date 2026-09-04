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
        String tutorVoice,
        boolean notificationsEnabled,
        Instant createdAt
) {

    /** The browser's built-in speech synthesiser: always available, no API cost. */
    public static final String VOICE_BROWSER = "browser";
    /** ElevenLabs via {@code /api/tts/speak}, with automatic fallback to {@link #VOICE_BROWSER}. */
    public static final String VOICE_ELEVENLABS = "elevenlabs";

    /**
     * Creates a new UserProfile with sensible defaults for a first-time user.
     */
    public static UserProfile createNew(String userId, String email, String name, String photoUrl) {
        return new UserProfile(
                userId,
                email,
                name,
                photoUrl,
                "learner",      // role default
                null,           // nativeLanguage — set during onboarding
                "beginner",     // englishLevel default
                null,           // learningGoal — set during onboarding
                15,             // dailyGoalMinutes default
                0,              // streak
                0L,             // totalMinutesPracticed
                VOICE_BROWSER,  // tutorVoice — the free voice until the learner opts in
                false,          // notificationsEnabled — opt-in, needs a browser permission
                Instant.now()
        );
    }

    /**
     * The stored preference, or {@link #VOICE_BROWSER} when it is missing or unrecognised.
     * Guards against an old document, a hand-edited value, or a future voice this build
     * does not know how to play.
     */
    public String tutorVoiceOrDefault() {
        return VOICE_ELEVENLABS.equals(tutorVoice) ? VOICE_ELEVENLABS : VOICE_BROWSER;
    }
}
