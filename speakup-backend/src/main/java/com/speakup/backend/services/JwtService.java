package com.speakup.backend.services;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

/**
 * Generates and validates JWT tokens using jjwt 0.12.6.
 * Tokens are signed with HMAC-SHA256 and expire after 7 days.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final long TOKEN_EXPIRY_DAYS = 7;

    private final SecretKey signingKey;

    public JwtService(@Value("${app.jwt-secret}") String jwtSecret) {
        // Derive a SecretKey from the configured secret string
        this.signingKey = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a JWT token for the given user.
     *
     * @param userId the Firebase UID to set as the subject
     * @param email  the user's email to include as a claim
     * @param name   the user's display name to include as a claim
     * @return a signed JWT string
     */
    public String generateToken(String userId, String email, String name) {
        Instant now = Instant.now();
        Instant expiry = now.plus(TOKEN_EXPIRY_DAYS, ChronoUnit.DAYS);

        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("name", name)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .signWith(signingKey)
                .compact();
    }

    /**
     * Validates the token and extracts all claims.
     *
     * @param token the JWT string to validate
     * @return the parsed Claims
     * @throws JwtException if the token is invalid, expired, or tampered with
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extracts the user ID (subject) from a token.
     *
     * @param token the JWT string
     * @return the user ID
     */
    public String getUserIdFromToken(String token) {
        return validateToken(token).getSubject();
    }

    /**
     * Checks whether a token is valid (not expired, properly signed).
     *
     * @param token the JWT string
     * @return true if valid, false otherwise
     */
    public boolean isTokenValid(String token) {
        try {
            validateToken(token);
            return true;
        } catch (JwtException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }
}
