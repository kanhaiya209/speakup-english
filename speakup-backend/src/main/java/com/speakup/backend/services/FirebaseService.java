package com.speakup.backend.services;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.cloud.FirestoreClient;
import com.speakup.backend.models.UserProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Handles Firebase Authentication token verification
 * and Firestore user profile persistence.
 */
@Service
public class FirebaseService {

    private static final Logger log = LoggerFactory.getLogger(FirebaseService.class);
    private static final String USERS_COLLECTION = "users";

    /**
     * Verifies a Firebase ID token and returns the decoded token.
     *
     * @param idToken the Firebase ID token from the client
     * @return the decoded FirebaseToken containing uid, email, name, picture
     * @throws FirebaseAuthException if the token is invalid or expired
     */
    public FirebaseToken verifyIdToken(String idToken) throws FirebaseAuthException {
        return FirebaseAuth.getInstance().verifyIdToken(idToken);
    }

    /**
     * Gets an existing user from Firestore, or creates a new profile
     * if this is the user's first login.
     *
     * @param token the verified FirebaseToken
     * @return the UserProfile (existing or newly created)
     */
    public UserProfile getOrCreateUser(FirebaseToken token) throws ExecutionException, InterruptedException {
        String uid = token.getUid();
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(USERS_COLLECTION).document(uid);
        DocumentSnapshot snapshot = docRef.get().get();

        if (snapshot.exists()) {
            log.info("Existing user found: {}", uid);
            return snapshotToUserProfile(snapshot);
        }

        // First-time user — create profile
        log.info("Creating new user profile: {}", uid);
        String email = token.getEmail();
        String name = token.getName();
        String photoUrl = (String) token.getClaims().get("picture");

        UserProfile newUser = UserProfile.createNew(uid, email, name, photoUrl);
        Map<String, Object> userData = userProfileToMap(newUser);
        docRef.set(userData).get();

        log.info("User profile created in Firestore: {}", uid);
        return newUser;
    }

    /**
     * Updates an existing user's profile fields in Firestore.
     * Only non-null fields from the request are written.
     *
     * @param userId           the Firebase UID
     * @param nativeLanguage   the user's native language (nullable)
     * @param englishLevel     the user's English level (nullable)
     * @param learningGoal     the user's learning goal (nullable)
     * @param dailyGoalMinutes the user's daily goal in minutes (nullable)
     * @return the updated UserProfile
     */
    public UserProfile updateUserProfile(String userId, String nativeLanguage,
                                         String englishLevel, String learningGoal,
                                         Integer dailyGoalMinutes)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(USERS_COLLECTION).document(userId);

        Map<String, Object> updates = new HashMap<>();
        if (nativeLanguage != null) updates.put("nativeLanguage", nativeLanguage);
        if (englishLevel != null) updates.put("englishLevel", englishLevel);
        if (learningGoal != null) updates.put("learningGoal", learningGoal);
        if (dailyGoalMinutes != null) updates.put("dailyGoalMinutes", dailyGoalMinutes);

        if (!updates.isEmpty()) {
            docRef.update(updates).get();
            log.info("Updated profile for user {}: {}", userId, updates.keySet());
        }

        // Return the refreshed profile
        DocumentSnapshot snapshot = docRef.get().get();
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

        return new UserProfile(
                snapshot.getString("userId"),
                snapshot.getString("email"),
                snapshot.getString("name"),
                snapshot.getString("photoUrl"),
                snapshot.getString("nativeLanguage"),
                snapshot.getString("englishLevel"),
                snapshot.getString("learningGoal"),
                intOrDefault(snapshot, "dailyGoalMinutes", 15),
                intOrDefault(snapshot, "streak", 0),
                longOrDefault(snapshot, "totalMinutesPracticed", 0L),
                createdAt
        );
    }

    /**
     * Converts a UserProfile record to a Firestore-friendly Map.
     */
    private Map<String, Object> userProfileToMap(UserProfile user) {
        Map<String, Object> map = new HashMap<>();
        map.put("userId", user.userId());
        map.put("email", user.email());
        map.put("name", user.name());
        map.put("photoUrl", user.photoUrl());
        map.put("nativeLanguage", user.nativeLanguage());
        map.put("englishLevel", user.englishLevel());
        map.put("learningGoal", user.learningGoal());
        map.put("dailyGoalMinutes", user.dailyGoalMinutes());
        map.put("streak", user.streak());
        map.put("totalMinutesPracticed", user.totalMinutesPracticed());
        map.put("createdAt", com.google.cloud.Timestamp.ofTimeSecondsAndNanos(
                user.createdAt().getEpochSecond(),
                user.createdAt().getNano()
        ));
        return map;
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
