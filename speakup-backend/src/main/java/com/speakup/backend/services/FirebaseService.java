package com.speakup.backend.services;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.cloud.FirestoreClient;
import com.speakup.backend.dto.UpdateProfileRequest;
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
     * <p>Takes the request record rather than a positional parameter list: with five nullable
     * strings among the fields, a transposed argument would compile and silently write the
     * wrong column.
     *
     * @param userId  the Firebase UID
     * @param request the fields to change; nulls are left untouched
     * @return the updated UserProfile
     */
    public UserProfile updateUserProfile(String userId, UpdateProfileRequest request)
            throws ExecutionException, InterruptedException {

        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection(USERS_COLLECTION).document(userId);

        Map<String, Object> updates = new HashMap<>();
        if (request != null) {
            if (request.name() != null) updates.put("name", request.name());
            if (request.nativeLanguage() != null) updates.put("nativeLanguage", request.nativeLanguage());
            if (request.englishLevel() != null) updates.put("englishLevel", request.englishLevel());
            if (request.learningGoal() != null) updates.put("learningGoal", request.learningGoal());
            if (request.dailyGoalMinutes() != null) updates.put("dailyGoalMinutes", request.dailyGoalMinutes());
            if (request.notificationsEnabled() != null) {
                updates.put("notificationsEnabled", request.notificationsEnabled());
            }
            // Only the two voices this build can actually play are storable. An unknown value is
            // dropped rather than saved, so a stale client cannot leave the tutor mute.
            String voice = request.tutorVoice();
            if (UserProfile.VOICE_BROWSER.equals(voice) || UserProfile.VOICE_ELEVENLABS.equals(voice)) {
                updates.put("tutorVoice", voice);
            }
        }

        if (!updates.isEmpty()) {
            docRef.update(updates).get();
            log.info("Updated profile for user {}: {}", userId, updates.keySet());
        }

        // Return the refreshed profile
        DocumentSnapshot snapshot = docRef.get().get();
        return snapshotToUserProfile(snapshot);
    }

    /**
     * Gets a user profile by ID from Firestore.
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
                snapshot.getString("tutorVoice"),
                Boolean.TRUE.equals(snapshot.getBoolean("notificationsEnabled")),
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
        map.put("role", user.role());
        map.put("nativeLanguage", user.nativeLanguage());
        map.put("englishLevel", user.englishLevel());
        map.put("learningGoal", user.learningGoal());
        map.put("dailyGoalMinutes", user.dailyGoalMinutes());
        map.put("streak", user.streak());
        map.put("totalMinutesPracticed", user.totalMinutesPracticed());
        map.put("tutorVoice", user.tutorVoiceOrDefault());
        map.put("notificationsEnabled", user.notificationsEnabled());
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
