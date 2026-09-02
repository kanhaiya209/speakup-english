package com.speakup.backend.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;

/**
 * Generic wrapper for all API responses.
 * Ensures consistent JSON shape across every endpoint.
 *
 * @param <T> the type of the response data payload
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        String message,
        T data,
        String error,
        Instant timestamp
) {

    /**
     * Successful response with data.
     */
    public static <T> ApiResponse<T> success(String message, T data) {
        return new ApiResponse<>(true, message, data, null, Instant.now());
    }

    /**
     * Successful response without data.
     */
    public static <T> ApiResponse<T> success(String message) {
        return new ApiResponse<>(true, message, null, null, Instant.now());
    }

    /**
     * Error response.
     */
    public static <T> ApiResponse<T> error(String message, String error) {
        return new ApiResponse<>(false, message, null, error, Instant.now());
    }

    /**
     * Error response (message only).
     */
    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(false, message, null, null, Instant.now());
    }
}
