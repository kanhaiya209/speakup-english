package com.speakup.backend.models;

/**
 * The fluency score for one session, with the components it was built from.
 *
 * <p>Every number here is counted from the real transcript by
 * {@code FluencyTrackerAgent} — there is no model call and no estimate, so the same session
 * always scores the same and the breakdown can be shown to the learner honestly.
 *
 * @param overall          0–100, the sum of the components (rescaled when accuracy is unmeasured)
 * @param band             the human label for {@code overall}, see {@link #bandFor(int)}
 * @param participation    0–25, how much the learner spoke for the time they were in the session
 * @param turnSubstance    0–20, how much they said per turn
 * @param flow             0–20, penalised by fillers and immediate repetition
 * @param accuracy         0–20, from the grammar mistake rate; 0 when {@code accuracyMeasured} is false
 * @param range            0–15, distinct words as a share of words spoken
 * @param accuracyMeasured false when the Grammar Watcher never ran, in which case {@code overall}
 *                         is rescaled over the other 80 points rather than crediting a
 *                         perfect accuracy score nobody checked
 * @param wordsPerTurn     the learner's median words per turn, the raw figure behind {@code turnSubstance}
 * @param fillerCount      how many fillers and immediate repetitions were counted
 */
public record FluencyScore(
        int overall,
        String band,
        int participation,
        int turnSubstance,
        int flow,
        int accuracy,
        int range,
        boolean accuracyMeasured,
        int wordsPerTurn,
        int fillerCount
) {

    public static final String BAND_NEEDS_PRACTICE = "Needs practice";
    public static final String BAND_DEVELOPING = "Developing";
    public static final String BAND_STEADY = "Steady";
    public static final String BAND_CONFIDENT = "Confident";
    public static final String BAND_FLUENT = "Fluent";

    /** The band boundaries, in one place so the summary screen and the score never disagree. */
    public static String bandFor(int overall) {
        if (overall >= 85) return BAND_FLUENT;
        if (overall >= 70) return BAND_CONFIDENT;
        if (overall >= 55) return BAND_STEADY;
        if (overall >= 40) return BAND_DEVELOPING;
        return BAND_NEEDS_PRACTICE;
    }
}
