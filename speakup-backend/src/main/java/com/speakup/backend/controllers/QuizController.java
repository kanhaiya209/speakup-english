package com.speakup.backend.controllers;

import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.models.QuizQuestion;
import com.speakup.backend.models.QuizResult;
import com.speakup.backend.services.QuizService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for the onboarding quiz.
 * All endpoints require a valid JWT in the Authorization header.
 */
@RestController
@RequestMapping("/api/quiz")
public class QuizController {

    private static final Logger log = LoggerFactory.getLogger(QuizController.class);

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    /**
     * DTO for quiz questions returned to the client.
     * Deliberately omits the correct answer to prevent cheating.
     */
    public record QuizQuestionResponse(
            int id,
            String question,
            List<String> options,
            String category
    ) {
        public static QuizQuestionResponse from(QuizQuestion q) {
            return new QuizQuestionResponse(q.id(), q.question(), q.options(), q.category());
        }
    }

    /**
     * DTO for the quiz submission request body.
     */
    public record SubmitQuizRequest(Map<String, String> answers) {}

    /**
     * GET /api/quiz/questions
     * Returns all 10 quiz questions without correct answers.
     */
    @GetMapping("/questions")
    public ResponseEntity<ApiResponse<List<QuizQuestionResponse>>> getQuestions(
            HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        List<QuizQuestionResponse> questions = quizService.getQuestions()
                .stream()
                .map(QuizQuestionResponse::from)
                .toList();

        return ResponseEntity.ok(ApiResponse.success("Quiz questions retrieved", questions));
    }

    /**
     * POST /api/quiz/submit
     * Accepts the user's answers and returns the evaluated result.
     * Body: { "answers": { "1": "selected answer", "2": "selected answer", ... } }
     */
    @PostMapping("/submit")
    public ResponseEntity<ApiResponse<QuizResult>> submitQuiz(
            @RequestBody SubmitQuizRequest request,
            HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        if (request == null || request.answers() == null || request.answers().isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Answers are required"));
        }

        try {
            QuizResult result = quizService.evaluateAnswers(userId, request.answers());
            return ResponseEntity.ok(ApiResponse.success("Quiz submitted successfully", result));
        } catch (Exception e) {
            log.error("Failed to submit quiz for user {}", userId, e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to submit quiz", e.getMessage()));
        }
    }

    /**
     * GET /api/quiz/result
     * Returns the user's existing quiz result, or 404 if not yet completed.
     */
    @GetMapping("/result")
    public ResponseEntity<ApiResponse<QuizResult>> getResult(HttpServletRequest httpRequest) {

        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        try {
            QuizResult result = quizService.getQuizResult(userId);
            if (result == null) {
                return ResponseEntity.status(404)
                        .body(ApiResponse.error("Quiz not completed yet"));
            }
            return ResponseEntity.ok(ApiResponse.success("Quiz result retrieved", result));
        } catch (Exception e) {
            log.error("Failed to get quiz result for user {}", userId, e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to retrieve quiz result", e.getMessage()));
        }
    }
}
