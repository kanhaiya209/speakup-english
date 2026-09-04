package com.speakup.backend.agents;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * The one place every agent parses model output.
 *
 * <p>The agents ask Groq for JSON in the prompt rather than through OpenAI's
 * {@code response_format} parameter: Groq rejects options it does not support for a given
 * model, which would fail the whole call instead of degrading to a slightly messier reply.
 * The cost of that choice is that output arrives wrapped in fences, prefaced with "Here is
 * the JSON:", or truncated when the token budget runs out — so parsing has to be tolerant.
 *
 * <p>Anything that cannot be read becomes {@link Optional#empty()}. Callers treat that as
 * "no analysis this time", never as an error worth showing the learner.
 */
@Component
public class LlmJsonSupport {

    private static final Logger log = LoggerFactory.getLogger(LlmJsonSupport.class);

    /** Guards against a runaway reply being walked character by character. */
    private static final int MAX_SCAN_CHARS = 20_000;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Extracts the first complete JSON object or array in {@code raw} and parses it.
     *
     * @return the parsed node, or empty when {@code raw} holds no balanced JSON value
     */
    public Optional<JsonNode> parse(String raw) {
        String candidate = firstJsonValue(raw);
        if (candidate == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(objectMapper.readTree(candidate));
        } catch (Exception ex) {
            log.debug("Agent reply was not valid JSON: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Parses and unwraps to an array. Accepts both a bare array and the common
     * {@code {"items": [...]}} / {@code {"notes": [...]}} shape models drift into, so a
     * cosmetic difference does not throw away a good analysis.
     */
    public Optional<JsonNode> parseArray(String raw) {
        return parse(raw).map(node -> {
            if (node.isArray()) {
                return node;
            }
            if (node.isObject()) {
                for (JsonNode child : node) {
                    if (child.isArray()) {
                        return child;
                    }
                }
            }
            return null;
        }).filter(node -> node != null && node.isArray());
    }

    /**
     * Walks {@code raw} once, tracking string and escape state, and returns the substring of
     * the first balanced {@code {…}} or {@code […]}. Fences need no special handling: a
     * ``` run simply is not an opening brace, so the scan steps over it.
     */
    private static String firstJsonValue(String raw) {
        if (raw == null) return null;

        int limit = Math.min(raw.length(), MAX_SCAN_CHARS);
        int start = -1;
        char closer = 0;
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;

        for (int i = 0; i < limit; i++) {
            char c = raw.charAt(i);

            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }

            if (c == '"' && start >= 0) {
                inString = true;
                continue;
            }

            if (start < 0) {
                if (c == '{' || c == '[') {
                    start = i;
                    closer = c == '{' ? '}' : ']';
                    depth = 1;
                }
                continue;
            }

            if (c == '{' || c == '[') {
                depth++;
            } else if (c == '}' || c == ']') {
                depth--;
                if (depth == 0) {
                    // Only a matching closer completes the value; a mismatched one means the
                    // reply is malformed and there is nothing worth salvaging.
                    return c == closer ? raw.substring(start, i + 1) : null;
                }
            }
        }
        // Ran off the end: the reply was truncated mid-value.
        return null;
    }

    /** Reads a trimmed string field, or null when it is missing, blank or not a string. */
    public static String text(JsonNode node, String field) {
        if (node == null) return null;
        JsonNode value = node.get(field);
        if (value == null || !value.isTextual()) return null;
        String text = value.asText().trim();
        return text.isEmpty() ? null : text;
    }
}
