package com.speakup.backend.services;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;
import com.speakup.backend.models.UserProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.ExecutionException;

/**
 * Service for admin-level operations: listing users, analytics, etc.
 */
@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);
    private static final String USERS_COLLECTION = "users";

    /**
     * Gets all user profiles from the "users" Firestore collection.
     *
     * @return list of all UserProfile records
     */
    public List<UserProfile> getAllUsers() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> future = db.collection(USERS_COLLECTION).get();
        List<QueryDocumentSnapshot> documents = future.get().getDocuments();

        List<UserProfile> users = new ArrayList<>();
        for (QueryDocumentSnapshot doc : documents) {
            users.add(snapshotToUserProfile(doc));
        }

        log.info("Fetched {} users for admin dashboard", users.size());
        return users;
    }

    /**
     * Gets the total number of registered users.
     *
     * @return total user count
     */
    public int getTotalUsers() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        ApiFuture<QuerySnapshot> future = db.collection(USERS_COLLECTION).get();
        int count = future.get().size();
        log.info("Total users: {}", count);
        return count;
    }

    /**
     * Gets the number of daily active users.
     * A user is considered active today if their "lastActiveDate" field
     * matches today's date (IST timezone).
     *
     * @return count of daily active users
     */
    public int getDailyActiveUsers() throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        String today = LocalDate.now(ZoneId.of("Asia/Kolkata")).toString();

        ApiFuture<QuerySnapshot> future = db.collection(USERS_COLLECTION)
                .whereEqualTo("lastActiveDate", today)
                .get();

        int count = future.get().size();
        log.info("Daily active users ({}): {}", today, count);
        return count;
    }

    /**
     * Gets a single user profile by ID.
     *
     * @param userId the Firebase UID
     * @return the UserProfile, or null if not found
     */
    public UserProfile getUserById(String userId) throws ExecutionException, InterruptedException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentSnapshot snapshot = db.collection(USERS_COLLECTION).document(userId).get().get();
        if (!snapshot.exists()) {
            return null;
        }
        return snapshotToUserProfile(snapshot);
    }

    /**
     * Converts a Firestore document snapshot to a UserProfile record.
     */
    private UserProfile snapshotToUserProfile(DocumentSnapshot snapshot) {
        Instant createdAt = null;
        Object createdAtValue = snapshot.get("createdAt");
        if (createdAtValue instanceof com.google.cloud.Timestamp ts) {
            createdAt = Instant.ofEpochSecond(ts.getSeconds(), ts.getNanos());
        } else if (createdAtValue instanceof Date date) {
            createdAt = date.toInstant();
        }

        String role = snapshot.getString("role");
        if (role == null || role.isBlank()) {
            role = "learner";
        }

        return new UserProfile(
                snapshot.getString("userId"),
                snapshot.getString("email"),
                snapshot.getString("name"),
                snapshot.getString("photoUrl"),
                role,
                snapshot.getString("nativeLanguage"),
                snapshot.getString("englishLevel"),
                snapshot.getString("learningGoal"),
                intOrDefault(snapshot, "dailyGoalMinutes", 15),
                intOrDefault(snapshot, "streak", 0),
                longOrDefault(snapshot, "totalMinutesPracticed", 0L),
                createdAt
        );
    }

    private int intOrDefault(DocumentSnapshot snapshot, String field, int defaultValue) {
        Long value = snapshot.getLong(field);
        return value != null ? value.intValue() : defaultValue;
    }

    private long longOrDefault(DocumentSnapshot snapshot, String field, long defaultValue) {
        Long value = snapshot.getLong(field);
        return value != null ? value : defaultValue;
    }
}
