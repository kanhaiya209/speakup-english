package com.speakup.backend.models;

import java.util.List;

/**
 * Represents a single quiz question for the onboarding English level assessment.
 * Each question has four options and belongs to a category (grammar/vocabulary/comprehension).
 *
 * @param id            unique question identifier (1-based)
 * @param question      the question text
 * @param options       list of 4 possible answers
 * @param correctAnswer the correct answer (must be one of the options)
 * @param category      question category — grammar, vocabulary, or comprehension
 */
public record QuizQuestion(
        int id,
        String question,
        List<String> options,
        String correctAnswer,
        String category
) {}
