package com.speakup.backend.controllers;

import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.dto.UpdateProfileRequest;
import com.speakup.backend.services.FirebaseService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.speakup.backend.models.UserProfile;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final FirebaseService firebaseService;

    public UserController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    @PatchMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfile>> updateProfile(
            @RequestBody UpdateProfileRequest request,
            HttpServletRequest httpRequest) {
        try {
            String userId = (String) httpRequest.getAttribute("userId");

            if (userId == null) {
                return ResponseEntity.status(401)
                        .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
            }

            UserProfile updatedUser = firebaseService.updateUserProfile(
                    userId,
                    request.nativeLanguage(),
                    request.englishLevel(),
                    request.learningGoal(),
                    request.dailyGoalMinutes());

            return ResponseEntity.ok(ApiResponse.success("Profile updated", updatedUser));

        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to update profile", e.getMessage()));
        }
    }
}
