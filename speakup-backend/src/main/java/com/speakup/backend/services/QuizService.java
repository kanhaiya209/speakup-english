package com.speakup.backend.services;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.speakup.backend.models.QuizQuestion;
import com.speakup.backend.models.QuizResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutionException;

/**
 * Handles onboarding quiz logic:
 * - Provides hardcoded quiz questions
 * - Evaluates user answers, calculates scores
 * - Persists results to Firestore and updates user profile
 */
@Service
public class QuizService {

    private static final Logger log = LoggerFactory.getLogger(QuizService.class);
    private static final String QUIZ_RESULTS_COLLECTION = "quizResults";
    private static final String USERS_COLLECTION = "users";

    /** The 10 hardcoded quiz questions covering grammar, vocabulary, and comprehension. */
    private final List<QuizQuestion> questions;

    public QuizService() {
        this.questions = buildQuestions();
    }

    /**
     * Returns all 10 quiz questions.
     */
    public List<QuizQuestion> getQuestions() {
        return questions;
    }

    /**
     * Evaluates the user's answers, calculates the score and level,
     * saves the result to Firestore, and updates the user's profile.
     *
     * @param userId  the Firebase UID
     * @param answers map of questionId (as String) → selected answer
     * @return the computed QuizResult
     */
    public QuizResult evaluateAnswers(String userId, Map<String, String> answers)
            throws ExecutionException, InterruptedException {

        // Build a lookup: questionId → QuizQuestion
        Map<Integer, QuizQuestion> questionMap = new HashMap<>();
        for (QuizQuestion q : questions) {
            questionMap.put(q.id(), q);
        }

        int totalCorrect = 0;

        // Track per-category: correct count and total count
        Map<String, int[]> categoryStats = new LinkedHashMap<>();
        categoryStats.put("grammar", new int[]{0, 0});
        categoryStats.put("vocabulary", new int[]{0, 0});
        categoryStats.put("comprehension", new int[]{0, 0});

        for (QuizQuestion q : questions) {
            String category = q.category();
            int[] stats = categoryStats.get(category);
            stats[1]++; // increment total for this category

            String userAnswer = answers.get(String.valueOf(q.id()));
            if (userAnswer != null && userAnswer.equals(q.correctAnswer())) {
                totalCorrect++;
                stats[0]++; // increment correct for this category
            }
        }

        int totalQuestions = questions.size();
        int score = (int) Math.round((double) totalCorrect / totalQuestions * 100);

        // Determine assessed level
        String assessedLevel;
        if (score <= 40) {
            assessedLevel = "beginner";
        } else if (score <= 70) {
            assessedLevel = "intermediate";
        } else {
            assessedLevel = "advanced";
        }

        // Calculate per-category percentage scores
        Map<String, Integer> categoryScores = new LinkedHashMap<>();
        for (Map.Entry<String, int[]> entry : categoryStats.entrySet()) {
            int[] stats = entry.getValue();
            int catScore = stats[1] > 0
                    ? (int) Math.round((double) stats[0] / stats[1] * 100)
                    : 0;
            categoryScores.put(entry.getKey(), catScore);
        }

        Instant completedAt = Instant.now();
        QuizResult result = new QuizResult(
                userId, totalQuestions, totalCorrect, score,
                assessedLevel, completedAt, categoryScores
        );

        // Persist to Firestore
        saveQuizResult(result);
        updateUserProfile(userId, assessedLevel);

        log.info("Quiz completed for user {}: score={}%, level={}", userId, score, assessedLevel);
        return result;
    }

    /**
     * Retrieves an existing quiz result for the given user, or null if not found.
     */
    public QuizResult getQuizResult(String userId) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentSnapshot snapshot = db.collection(QUIZ_RESULTS_COLLECTION)
                .document(userId)
                .get()
                .get();

        if (!snapshot.exists()) {
            return null;
        }

        // Parse Firestore document back into QuizResult
        Instant completedAt = null;
        Object completedAtValue = snapshot.get("completedAt");
        if (completedAtValue instanceof Timestamp ts) {
            completedAt = Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos());
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> rawCategoryScores = (Map<String, Object>) snapshot.get("categoryScores");
        Map<String, Integer> categoryScores = new LinkedHashMap<>();
        if (rawCategoryScores != null) {
            for (Map.Entry<String, Object> entry : rawCategoryScores.entrySet()) {
                categoryScores.put(entry.getKey(), ((Number) entry.getValue()).intValue());
            }
        }

        return new QuizResult(
                snapshot.getString("userId"),
                intOrDefault(snapshot, "totalQuestions", 0),
                intOrDefault(snapshot, "correctAnswers", 0),
                intOrDefault(snapshot, "score", 0),
                snapshot.getString("assessedLevel"),
                completedAt,
                categoryScores
        );
    }

    // ─── Private Helpers ───────────────────────────────────────────────

    /**
     * Saves the QuizResult to Firestore "quizResults" collection,
     * keyed by userId.
     */
    private void saveQuizResult(QuizResult result) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(QUIZ_RESULTS_COLLECTION).document(result.userId());

        Map<String, Object> data = new HashMap<>();
        data.put("userId", result.userId());
        data.put("totalQuestions", result.totalQuestions());
        data.put("correctAnswers", result.correctAnswers());
        data.put("score", result.score());
        data.put("assessedLevel", result.assessedLevel());
        data.put("completedAt", Timestamp.ofTimeSecondsAndNanos(
                result.completedAt().getEpochSecond(),
                result.completedAt().getNano()
        ));
        data.put("categoryScores", result.categoryScores());

        docRef.set(data).get();
        log.info("Quiz result saved for user: {}", result.userId());
    }

    /**
     * Updates the user's englishLevel and sets onboardingCompleted = true
     * in the Firestore "users" collection.
     */
    private void updateUserProfile(String userId, String assessedLevel)
            throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(USERS_COLLECTION).document(userId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("englishLevel", assessedLevel);
        updates.put("onboardingCompleted", true);

        docRef.update(updates).get();
        log.info("Updated user {} englishLevel={}, onboardingCompleted=true", userId, assessedLevel);
    }

    private int intOrDefault(DocumentSnapshot snapshot, String field, int defaultValue) {
        Long value = snapshot.getLong(field);
        return value != null ? value.intValue() : defaultValue;
    }

    /**
     * Builds the 10 hardcoded quiz questions.
     */
    private static List<QuizQuestion> buildQuestions() {
        return List.of(
                // Grammar (4 questions)
                new QuizQuestion(1,
                        "Which sentence is correct?",
                        List.of("She don't like coffee",
                                "She doesn't likes coffee",
                                "She doesn't like coffee",
                                "She not like coffee"),
                        "She doesn't like coffee",
                        "grammar"),

                new QuizQuestion(2,
                        "I ___ to the market yesterday.",
                        List.of("go", "goes", "went", "going"),
                        "went",
                        "grammar"),

                new QuizQuestion(3,
                        "They have been waiting ___ two hours.",
                        List.of("since", "for", "from", "during"),
                        "for",
                        "grammar"),

                new QuizQuestion(4,
                        "Which is the correct question form?",
                        List.of("Where you are going?",
                                "Where are you going?",
                                "Where going you are?",
                                "You are going where?"),
                        "Where are you going?",
                        "grammar"),

                // Vocabulary (3 questions)
                new QuizQuestion(5,
                        "What does 'eloquent' mean?",
                        List.of("Speaking very well",
                                "Being very quiet",
                                "Writing slowly",
                                "Listening carefully"),
                        "Speaking very well",
                        "vocabulary"),

                new QuizQuestion(6,
                        "Choose the correct synonym for 'happy':",
                        List.of("Sad", "Angry", "Joyful", "Tired"),
                        "Joyful",
                        "vocabulary"),

                new QuizQuestion(7,
                        "What does 'procrastinate' mean?",
                        List.of("To work very hard",
                                "To delay doing something",
                                "To finish quickly",
                                "To ask for help"),
                        "To delay doing something",
                        "vocabulary"),

                // Comprehension (3 questions)
                new QuizQuestion(8,
                        "Read: 'Despite the heavy rain, the match continued.' What does 'despite' mean here?",
                        List.of("Because of",
                                "Even though there was",
                                "After the",
                                "Before the"),
                        "Even though there was",
                        "comprehension"),

                new QuizQuestion(9,
                        "If someone is 'under the weather', they are:",
                        List.of("Standing in rain",
                                "Feeling sick",
                                "Very happy",
                                "Working outside"),
                        "Feeling sick",
                        "comprehension"),

                new QuizQuestion(10,
                        "Complete: 'The more you practice, ___'",
                        List.of("the better you get",
                                "you get better",
                                "getting better",
                                "better you get"),
                        "the better you get",
                        "comprehension")
        );
    }
}
