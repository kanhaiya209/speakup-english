package com.speakup.backend.models;

import java.time.Instant;
import java.util.Map;

/**
 * Stores the result of a user's onboarding quiz.
 * Saved to Firestore "quizResults" collection with document ID = userId.
 *
 * @param userId          the Firebase UID of the user
 * @param totalQuestions   total number of questions in the quiz
 * @param correctAnswers   number of correct answers
 * @param score            percentage score (0-100)
 * @param assessedLevel    determined level — beginner, intermediate, or advanced
 * @param completedAt      timestamp when the quiz was completed
 * @param categoryScores   per-category percentage scores (e.g. {"grammar": 75, "vocabulary": 66})
 */
public record QuizResult(
        String userId,
        int totalQuestions,
        int correctAnswers,
        int score,
        String assessedLevel,
        Instant completedAt,
        Map<String, Integer> categoryScores
) {}
