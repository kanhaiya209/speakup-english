package com.speakup.backend.models;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Locale;

/**
 * A word worth adding to the learner's vocabulary after a session.
 *
 * @param word    the word or short phrase, lower-cased
 * @param meaning a plain-English definition, short enough to read at a glance
 * @param example one natural sentence using it, ideally tied to what was discussed
 * @param source  {@link #SOURCE_TUTOR} when the tutor used it and the learner did not,
 *                {@link #SOURCE_REACHED_FOR} when the learner was visibly groping for it
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record VocabularyWord(
        String word,
        String meaning,
        String example,
        String source
) {

    public static final String SOURCE_TUTOR = "tutor";
    public static final String SOURCE_REACHED_FOR = "reached-for";

    /**
     * Firestore document id for this word under {@code users/{uid}/vocabulary}. Lower-cased and
     * stripped to letters, digits and single hyphens so the same word from two sessions lands on
     * the same document and increments {@code timesSeen} instead of duplicating.
     *
     * @return the slug, or null when the word contains nothing usable as an id
     */
    public String slug() {
        if (word == null) return null;
        String slug = word.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+)|(-+$)", "");
        return slug.isEmpty() ? null : slug;
    }
}
