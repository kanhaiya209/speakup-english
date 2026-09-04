package com.speakup.backend.agents;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Every agent's output passes through this parser, and every shape below is one a language
 * model actually produces: fenced, prefaced with prose, truncated by the token budget, or an
 * apology instead of an answer. The contract is that none of them throws — an unreadable reply
 * is an empty Optional, which callers treat as "no analysis this time".
 */
class LlmJsonSupportTests {

    private final LlmJsonSupport support = new LlmJsonSupport();

    @Test
    @DisplayName("Plain JSON parses")
    void plainJson() {
        Optional<JsonNode> parsed = support.parse("{\"word\":\"commute\"}");
        assertTrue(parsed.isPresent());
        assertEquals("commute", parsed.get().get("word").asText());
    }

    @Test
    @DisplayName("A fenced code block parses — the fence is simply not a brace")
    void fencedJson() {
        String raw = """
                Here you go:
                ```json
                [{"said":"I am go","better":"I went"}]
                ```
                """;
        Optional<JsonNode> parsed = support.parseArray(raw);
        assertTrue(parsed.isPresent());
        assertEquals(1, parsed.get().size());
        assertEquals("I went", parsed.get().get(0).get("better").asText());
    }

    @Test
    @DisplayName("JSON buried in prose parses")
    void jsonInProse() {
        String raw = "Sure! I looked at the transcript. "
                + "{\"overall\": 62, \"band\": \"Steady\"} "
                + "Let me know if you want more detail.";
        Optional<JsonNode> parsed = support.parse(raw);
        assertTrue(parsed.isPresent());
        assertEquals(62, parsed.get().get("overall").asInt());
    }

    @Test
    @DisplayName("Braces inside a string do not end the value early")
    void bracesInsideStrings() {
        Optional<JsonNode> parsed = support.parse("{\"why\":\"use } and { carefully\",\"n\":1}");
        assertTrue(parsed.isPresent());
        assertEquals("use } and { carefully", parsed.get().get("why").asText());
        assertEquals(1, parsed.get().get("n").asInt());
    }

    @Test
    @DisplayName("An escaped quote inside a string does not end the string")
    void escapedQuoteInString() {
        Optional<JsonNode> parsed = support.parse("{\"example\":\"she said \\\"hello\\\" twice\"}");
        assertTrue(parsed.isPresent());
        assertEquals("she said \"hello\" twice", parsed.get().get("example").asText());
    }

    @Test
    @DisplayName("Truncated JSON is empty, not a partial object")
    void truncatedJson() {
        assertTrue(support.parse("[{\"said\":\"I am go\",\"better\":\"I w").isEmpty());
    }

    @Test
    @DisplayName("A mismatched closer is empty rather than salvaged")
    void mismatchedCloser() {
        assertTrue(support.parse("{\"a\":1]").isEmpty());
    }

    @Test
    @DisplayName("Prose with no JSON at all is empty")
    void noJsonAtAll() {
        assertTrue(support.parse("I'm sorry, I can't help with that.").isEmpty());
        assertTrue(support.parse("").isEmpty());
        assertTrue(support.parse(null).isEmpty());
    }

    @Test
    @DisplayName("An empty array is a present result — 'nothing to report' is an answer")
    void emptyArrayIsPresent() {
        Optional<JsonNode> parsed = support.parseArray("[]");
        assertTrue(parsed.isPresent());
        assertEquals(0, parsed.get().size());
    }

    @Test
    @DisplayName("An array wrapped in an object is unwrapped")
    void arrayWrappedInObject() {
        Optional<JsonNode> parsed = support.parseArray("{\"notes\": [{\"said\":\"x\"}]}");
        assertTrue(parsed.isPresent());
        assertTrue(parsed.get().isArray());
        assertEquals(1, parsed.get().size());
    }

    @Test
    @DisplayName("An object with no array inside is not an array result")
    void objectWithoutArrayIsNotAnArray() {
        assertTrue(support.parseArray("{\"count\": 3}").isEmpty());
    }

    @Test
    @DisplayName("text() returns null for missing, blank, and non-string fields")
    void textFieldReading() {
        JsonNode node = support.parse("{\"a\":\"  kept  \",\"b\":\"   \",\"c\":7,\"d\":null}")
                .orElseThrow();

        assertEquals("kept", LlmJsonSupport.text(node, "a"));
        assertNull(LlmJsonSupport.text(node, "b"));
        assertNull(LlmJsonSupport.text(node, "c"));
        assertNull(LlmJsonSupport.text(node, "d"));
        assertNull(LlmJsonSupport.text(node, "missing"));
        assertNull(LlmJsonSupport.text(null, "a"));
    }
}
