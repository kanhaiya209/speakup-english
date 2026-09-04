package com.speakup.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Turns on {@code @Async} and {@code @Scheduled}.
 *
 * <p>No executor bean is declared on purpose: {@code spring.threads.virtual.enabled=true} in
 * application.yaml makes Spring Boot back {@code @Async} with a virtual-thread executor, which
 * is exactly right for the analysis agents — they are almost entirely blocked on an HTTP call
 * to Groq, so a platform-thread pool would only add a queue and a ceiling.
 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {
}
