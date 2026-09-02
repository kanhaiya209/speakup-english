package com.speakup.backend.controllers;

import com.google.firebase.auth.FirebaseToken;
import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.models.UserProfile;
import com.speakup.backend.services.FirebaseService;
import com.speakup.backend.services.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Handles authentication endpoints.
 * POST /api/auth/google — exchanges a Firebase ID token for a backend JWT.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final FirebaseService firebaseService;
    private final JwtService jwtService;

    public AuthController(FirebaseService firebaseService, JwtService jwtService) {
        this.firebaseService = firebaseService;
        this.jwtService = jwtService;
    }

    /**
     * Response DTO wrapping the JWT token and user profile.
     */
    public record AuthResponse(String token, UserProfile user) {}

    /**
     * Request DTO expecting the Firebase ID token.
     */
    public record GoogleLoginRequest(String idToken) {}

    /**
     * Authenticates a user via Google OAuth / Firebase.
     *
     * Flow:
     * 1. Client signs in with Google via Firebase Auth on the frontend
     * 2. Client sends the Firebase ID token to this endpoint
     * 3. We verify the token with Firebase Admin SDK
     * 4. We get or create the user profile in Firestore
     * 5. We generate a backend JWT and return it with the profile
     *
     * @param request contains the Firebase ID token
     * @return JWT token + UserProfile wrapped in ApiResponse
     */
    @PostMapping("/google")
    public ResponseEntity<ApiResponse<AuthResponse>> googleLogin(@RequestBody GoogleLoginRequest request) {
        // Validate input
        if (request == null || request.idToken() == null || request.idToken().isBlank()) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Firebase ID token is required"));
        }

        try {
            // 1. Verify Firebase ID token
            log.debug("Verifying Firebase ID token...");
            FirebaseToken firebaseToken = firebaseService.verifyIdToken(request.idToken());
            log.info("Firebase token verified for user: {}", firebaseToken.getUid());

            // 2. Get or create user in Firestore
            UserProfile userProfile = firebaseService.getOrCreateUser(firebaseToken);

            // 3. Generate backend JWT
            String jwtToken = jwtService.generateToken(
                    userProfile.userId(),
                    userProfile.email(),
                    userProfile.name()
            );

            // 4. Return success response
            AuthResponse authResponse = new AuthResponse(jwtToken, userProfile);
            return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));

        } catch (Exception ex) {
            log.error("Google login failed", ex);
            // Re-throw to let GlobalExceptionHandler handle it with proper status codes
            throw new RuntimeException(ex);
        }
    }
}
