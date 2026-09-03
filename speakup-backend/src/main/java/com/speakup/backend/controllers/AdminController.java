package com.speakup.backend.controllers;

import com.speakup.backend.common.ApiResponse;
import com.speakup.backend.models.UserProfile;
import com.speakup.backend.services.AdminService;
import com.speakup.backend.services.FirebaseService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for admin-only endpoints.
 * Role check: reads userId from JWT, fetches user from Firestore, verifies role == "admin".
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final AdminService adminService;
    private final FirebaseService firebaseService;

    public AdminController(AdminService adminService, FirebaseService firebaseService) {
        this.adminService = adminService;
        this.firebaseService = firebaseService;
    }

    /**
     * Response DTO for analytics data.
     */
    public record AnalyticsResponse(int totalUsers, int dailyActiveUsers) {}

    /**
     * GET /api/admin/users
     * Returns all registered users. Admin only.
     */
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserProfile>>> getAllUsers(HttpServletRequest httpRequest) {
        try {
            ResponseEntity<ApiResponse<List<UserProfile>>> authCheck = verifyAdmin(httpRequest);
            if (authCheck != null) return authCheck;

            List<UserProfile> users = adminService.getAllUsers();
            return ResponseEntity.ok(ApiResponse.success("Users retrieved", users));

        } catch (Exception e) {
            log.error("Failed to fetch all users", e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to retrieve users", e.getMessage()));
        }
    }

    /**
     * GET /api/admin/analytics
     * Returns analytics: totalUsers, dailyActiveUsers. Admin only.
     */
    @GetMapping("/analytics")
    public ResponseEntity<ApiResponse<AnalyticsResponse>> getAnalytics(HttpServletRequest httpRequest) {
        try {
            ResponseEntity<ApiResponse<AnalyticsResponse>> authCheck = verifyAdmin(httpRequest);
            if (authCheck != null) return authCheck;

            int totalUsers = adminService.getTotalUsers();
            int dailyActiveUsers = adminService.getDailyActiveUsers();

            AnalyticsResponse analytics = new AnalyticsResponse(totalUsers, dailyActiveUsers);
            return ResponseEntity.ok(ApiResponse.success("Analytics retrieved", analytics));

        } catch (Exception e) {
            log.error("Failed to fetch analytics", e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to retrieve analytics", e.getMessage()));
        }
    }

    /**
     * GET /api/admin/users/{userId}
     * Returns a single user profile. Admin only.
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<UserProfile>> getUserById(
            @PathVariable String userId,
            HttpServletRequest httpRequest) {
        try {
            ResponseEntity<ApiResponse<UserProfile>> authCheck = verifyAdmin(httpRequest);
            if (authCheck != null) return authCheck;

            UserProfile user = adminService.getUserById(userId);
            if (user == null) {
                return ResponseEntity.status(404)
                        .body(ApiResponse.error("User not found"));
            }

            return ResponseEntity.ok(ApiResponse.success("User retrieved", user));

        } catch (Exception e) {
            log.error("Failed to fetch user {}", userId, e);
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to retrieve user", e.getMessage()));
        }
    }

    /**
     * Verifies that the requesting user is an admin.
     * Reads userId from the JWT (set by JwtAuthFilter), fetches user from Firestore,
     * and checks role == "admin".
     *
     * @return null if admin (proceed), or an error ResponseEntity if not authorized
     */
    @SuppressWarnings("unchecked")
    private <T> ResponseEntity<ApiResponse<T>> verifyAdmin(HttpServletRequest httpRequest) throws Exception {
        String userId = (String) httpRequest.getAttribute("userId");
        if (userId == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "No authentication token provided"));
        }

        UserProfile currentUser = firebaseService.getUserById(userId);
        if (currentUser == null) {
            return ResponseEntity.status(401)
                    .body(ApiResponse.error("Unauthorized", "User not found"));
        }

        if (!"admin".equals(currentUser.role())) {
            log.warn("Non-admin user {} attempted admin access", userId);
            return ResponseEntity.status(403)
                    .body(ApiResponse.error("Forbidden", "Admin access required"));
        }

        return null; // authorized
    }
}
