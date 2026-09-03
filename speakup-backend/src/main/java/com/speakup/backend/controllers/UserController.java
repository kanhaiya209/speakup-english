package com.speakup.backend.controllers;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.cloud.FirestoreClient;
import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.dto.UpdateProfileRequest;
import com.speakup.backend.models.UserProfile;
import com.speakup.backend.services.FirebaseService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for user profile management.
 * All endpoints require a valid JWT in the Authorization header.
 */
@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    private static final String USERS_COLLECTION = "users";

    private final FirebaseService firebaseService;

    public UserController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    /**
     * GET /api/user/profile
     * Returns the current authenticated user's profile from Firestore.
     */
    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfile>> getProfile(HttpServletRequest httpRequest) {
        try {
            String userId = (String) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(401)
                        .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
            }

            UserProfile profile = firebaseService.getUserById(userId);
            if (profile == null) {
                return ResponseEntity.status(404)
                        .body(ApiResponse.error("User profile not found"));
            }

            return ResponseEntity.ok(ApiResponse.success("Profile retrieved", profile));

        } catch (Exception e) {
            log.error("Failed to get profile", e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to retrieve profile", e.getMessage()));
        }
    }

    /**
     * PUT /api/user/profile
     * Updates profile fields (name, nativeLanguage, englishLevel, learningGoal, dailyGoalMinutes).
     * Only updates provided fields; never overwrites userId, email, role, streak, or createdAt.
     */
    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfile>> updateProfilePut(
            @RequestBody UpdateProfileRequest request,
            HttpServletRequest httpRequest) {
        return doUpdateProfile(request, httpRequest);
    }

    /**
     * PATCH /api/user/profile
     * Same as PUT — partial update of profile fields.
     * Kept for backward compatibility with ProfileSetup.jsx.
     */
    @PatchMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfile>> updateProfile(
            @RequestBody UpdateProfileRequest request,
            HttpServletRequest httpRequest) {
        return doUpdateProfile(request, httpRequest);
    }

    /**
     * Shared update logic for both PUT and PATCH endpoints.
     */
    private ResponseEntity<ApiResponse<UserProfile>> doUpdateProfile(
            UpdateProfileRequest request,
            HttpServletRequest httpRequest) {
        try {
            String userId = (String) httpRequest.getAttribute("userId");
            if (userId == null) {
                return ResponseEntity.status(401)
                        .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
            }

            String name = request != null ? request.name() : null;
            String nativeLanguage = request != null ? request.nativeLanguage() : null;
            String englishLevel = request != null ? request.englishLevel() : null;
            String learningGoal = request != null ? request.learningGoal() : null;
            Integer dailyGoalMinutes = request != null ? request.dailyGoalMinutes() : null;

            UserProfile updatedUser = firebaseService.updateUserProfile(
                    userId,
                    name,
                    nativeLanguage,
                    englishLevel,
                    learningGoal,
                    dailyGoalMinutes);

            return ResponseEntity.ok(ApiResponse.success("Profile updated", updatedUser));

        } catch (Exception e) {
            log.error("Failed to update profile for user", e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to update profile", e.getMessage()));
        }
    }
}
