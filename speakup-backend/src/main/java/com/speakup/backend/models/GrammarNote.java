package com.speakup.backend.models;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * One grammar slip the Grammar Watcher caught, and the natural way to say it.
 *
 * <p>Never shown to the learner mid-conversation — the tutor stays encouraging and these are
 * collected silently, then presented together on the post-session summary.
 *
 * @param said      the learner's own words, quoted back so the correction has context
 * @param better    the same thing said naturally
 * @param why       a one-line plain-English explanation
 * @param type      a short category: tense, article, preposition, plural, word order, …
 * @param turnIndex which learner turn this came from, 1-based
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record GrammarNote(
        String said,
        String better,
        String why,
        String type,
        int turnIndex
) {
}
