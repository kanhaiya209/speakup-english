package com.speakup.backend.agents;

import com.speakup.backend.models.FluencyScore;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Scores a session's fluency out of 100.
 *
 * <p>Deterministic Java, no model call. Every input is counted from the transcript that was
 * actually recorded, so the same session always scores the same, the breakdown can be shown to
 * the learner without hedging, and the whole thing is unit-testable and free.
 *
 * <table>
 *   <caption>Components</caption>
 *   <tr><th>Component</th><th>Max</th><th>Basis</th></tr>
 *   <tr><td>Participation</td><td>25</td><td>words spoken against {@code minutes × 55}</td></tr>
 *   <tr><td>Turn substance</td><td>20</td><td>median words per turn</td></tr>
 *   <tr><td>Flow</td><td>20</td><td>fillers and stumbles per 100 words</td></tr>
 *   <tr><td>Accuracy</td><td>20</td><td>grammar mistakes per 100 words</td></tr>
 *   <tr><td>Range</td><td>15</td><td>distinct words as a share of words spoken</td></tr>
 * </table>
 *
 * <p>Note what is <em>not</em> here: speaking rate. The only clock available is session wall
 * time, which includes the tutor talking and the learner thinking, so words-per-minute would be
 * a guess dressed up as a measurement. Participation uses the same clock but says something the
 * clock can actually support — how much of the session the learner filled.
 */
@Component
public class FluencyTrackerAgent {

    // ─── Participation ─────────────────────────────────────────────────
    /** Words per minute of session time that counts as a fully engaged learner. */
    private static final double WORDS_PER_MINUTE_TARGET = 55.0;
    /** Floor on the target, so a ten-second session cannot score full marks on two words. */
    private static final double MIN_WORD_TARGET = 20.0;
    private static final int MAX_PARTICIPATION = 25;

    // ─── Turn substance ────────────────────────────────────────────────
    private static final int MAX_TURN_SUBSTANCE = 20;
    /** Median words per turn at or above this earns full marks. */
    private static final int SUBSTANCE_FULL_FROM = 12;
    /** Above this, answers are long enough that the tutor barely gets a turn. */
    private static final int SUBSTANCE_FULL_TO = 40;
    /** How far past {@link #SUBSTANCE_FULL_TO} the taper runs before it bottoms out. */
    private static final double SUBSTANCE_TAPER_SPAN = 150.0;
    /** The taper never removes more than this share — a talkative learner is not a problem. */
    private static final double SUBSTANCE_TAPER_MAX = 0.4;

    // ─── Flow ──────────────────────────────────────────────────────────
    private static final int MAX_FLOW = 20;
    /** Fillers per 100 words up to here are normal speech. */
    private static final double FLOW_CLEAN_RATE = 2.0;
    /** At this rate the flow score reaches zero. */
    private static final double FLOW_ZERO_RATE = 12.0;

    // ─── Accuracy ──────────────────────────────────────────────────────
    private static final int MAX_ACCURACY = 20;
    private static final double ACCURACY_CLEAN_RATE = 1.0;
    private static final double ACCURACY_ZERO_RATE = 11.0;

    // ─── Range ─────────────────────────────────────────────────────────
    private static final int MAX_RANGE = 15;
    private static final double RANGE_ZERO_TTR = 0.20;
    private static final double RANGE_FULL_TTR = 0.55;

    /** Total available when accuracy could not be measured. */
    private static final int SCALE_WITHOUT_ACCURACY =
            MAX_PARTICIPATION + MAX_TURN_SUBSTANCE + MAX_FLOW + MAX_RANGE;

    /**
     * Fewest words the learner must speak before a score means anything.
     *
     * <p>Three of the five components are rates over the learner's own words, and a rate over a
     * handful of words is not a measurement. Score a one-word "Yes" and flow, accuracy and range
     * all pay full marks — there was nothing to stumble over, nothing to get wrong, and one
     * distinct word out of one is a perfect type-token ratio — which lands at 57/100 and tells
     * the learner they are a "Steady" speaker. Roughly three ordinary sentences is where the
     * rates start describing the speaker instead of the sample size.
     */
    private static final int MIN_SCORABLE_WORDS = 30;

    /**
     * Single-word fillers. {@code like} and {@code actually} are handled separately because
     * they are ordinary words far more often than they are fillers, and marking every "I like
     * cricket" would turn this score into a lie.
     */
    private static final Set<String> FILLERS = Set.of(
            "um", "umm", "ummm", "uh", "uhh", "uhm", "er", "err", "erm",
            "hmm", "hmmm", "mm", "mmm", "ah", "aah", "basically");

    /** Two-word fillers, matched on consecutive tokens. */
    private static final List<String[]> PHRASE_FILLERS = List.of(
            new String[]{"you", "know"},
            new String[]{"i", "mean"},
            new String[]{"sort", "of"},
            new String[]{"kind", "of"});

    /** After these, "like" is a verb — "I like", "would like", "don't like". */
    private static final Set<String> LIKE_IS_A_VERB_AFTER = Set.of(
            "i", "you", "we", "they", "he", "she", "it", "would", "really",
            "also", "not", "dont", "doesnt", "didnt", "wouldnt", "who", "people");

    /** Before these, "like" is a comparison — "like this", "like my brother". */
    private static final Set<String> LIKE_IS_A_COMPARISON_BEFORE = Set.of(
            "this", "that", "these", "those", "a", "an", "the", "me", "you", "him",
            "her", "them", "us", "my", "your", "his", "their", "our", "it");

    /**
     * Scores one session.
     *
     * @param learnerUtterances every learner turn, in order, exactly as recorded
     * @param durationSeconds   session wall time
     * @param grammarMistakes   how many notes the Grammar Watcher produced
     * @param accuracyMeasured  false when the Grammar Watcher never completed a single turn, so
     *                          zero mistakes means "not checked" rather than "none"
     * @return the score, or {@code null} when the learner spoke fewer than
     *         {@link #MIN_SCORABLE_WORDS} words. A session that short has no fluency to report,
     *         and the summary omits the score rather than inventing one — {@code fluencyScore} on
     *         the session record is nullable for exactly this case.
     */
    public FluencyScore score(List<String> learnerUtterances, long durationSeconds,
                              int grammarMistakes, boolean accuracyMeasured) {

        List<List<String>> turns = tokeniseTurns(learnerUtterances);

        int totalWords = 0;
        List<Integer> wordsPerTurn = new ArrayList<>(turns.size());
        Set<String> distinct = new HashSet<>();
        int stumbles = 0;

        for (List<String> tokens : turns) {
            totalWords += tokens.size();
            wordsPerTurn.add(tokens.size());
            distinct.addAll(tokens);
            stumbles += countStumbles(tokens);
        }

        if (totalWords < MIN_SCORABLE_WORDS) {
            return null;
        }

        int median = median(wordsPerTurn);

        int participation = participationScore(totalWords, durationSeconds);
        int turnSubstance = turnSubstanceScore(median);
        int flow = flowScore(stumbles, totalWords);
        int accuracy = accuracyMeasured ? accuracyScore(grammarMistakes, totalWords) : 0;
        int range = rangeScore(distinct.size(), totalWords);

        int subtotal = participation + turnSubstance + flow + range;
        int overall = accuracyMeasured
                ? subtotal + accuracy
                : clamp((int) Math.round(subtotal * 100.0 / SCALE_WITHOUT_ACCURACY), 0, 100);

        return new FluencyScore(
                clamp(overall, 0, 100),
                FluencyScore.bandFor(clamp(overall, 0, 100)),
                participation,
                turnSubstance,
                flow,
                accuracy,
                range,
                accuracyMeasured,
                median,
                stumbles);
    }

    // ─── Components ────────────────────────────────────────────────────

    /** How much of the session the learner actually filled with their own speech. */
    private static int participationScore(int totalWords, long durationSeconds) {
        if (totalWords <= 0) return 0;
        double minutes = Math.max(0, durationSeconds) / 60.0;
        double target = Math.max(MIN_WORD_TARGET, minutes * WORDS_PER_MINUTE_TARGET);
        return (int) Math.round(MAX_PARTICIPATION * Math.min(1.0, totalWords / target));
    }

    /** Full marks for answers in the {@link #SUBSTANCE_FULL_FROM}–{@link #SUBSTANCE_FULL_TO} band. */
    private static int turnSubstanceScore(int medianWordsPerTurn) {
        if (medianWordsPerTurn <= 0) return 0;
        if (medianWordsPerTurn < SUBSTANCE_FULL_FROM) {
            return (int) Math.round(MAX_TURN_SUBSTANCE * (medianWordsPerTurn / (double) SUBSTANCE_FULL_FROM));
        }
        if (medianWordsPerTurn <= SUBSTANCE_FULL_TO) {
            return MAX_TURN_SUBSTANCE;
        }
        double over = Math.min(SUBSTANCE_TAPER_MAX,
                (medianWordsPerTurn - SUBSTANCE_FULL_TO) / SUBSTANCE_TAPER_SPAN);
        return (int) Math.round(MAX_TURN_SUBSTANCE * (1.0 - over));
    }

    private static int flowScore(int stumbles, int totalWords) {
        if (totalWords <= 0) return 0;
        double rate = stumbles * 100.0 / totalWords;
        double kept = (FLOW_ZERO_RATE - rate) / (FLOW_ZERO_RATE - FLOW_CLEAN_RATE);
        return (int) Math.round(MAX_FLOW * clamp01(kept));
    }

    private static int accuracyScore(int mistakes, int totalWords) {
        if (totalWords <= 0) return 0;
        double rate = Math.max(0, mistakes) * 100.0 / totalWords;
        double kept = (ACCURACY_ZERO_RATE - rate) / (ACCURACY_ZERO_RATE - ACCURACY_CLEAN_RATE);
        return (int) Math.round(MAX_ACCURACY * clamp01(kept));
    }

    private static int rangeScore(int distinctWords, int totalWords) {
        if (totalWords <= 0) return 0;
        double ttr = distinctWords / (double) totalWords;
        double kept = (ttr - RANGE_ZERO_TTR) / (RANGE_FULL_TTR - RANGE_ZERO_TTR);
        return (int) Math.round(MAX_RANGE * clamp01(kept));
    }

    // ─── Counting ──────────────────────────────────────────────────────

    /**
     * Splits each utterance into lower-cased word tokens. Apostrophes are dropped rather than
     * split on, so "don't" stays one token and matches {@link #LIKE_IS_A_VERB_AFTER}.
     */
    private static List<List<String>> tokeniseTurns(List<String> utterances) {
        if (utterances == null) return List.of();

        List<List<String>> turns = new ArrayList<>(utterances.size());
        for (String utterance : utterances) {
            if (utterance == null || utterance.isBlank()) continue;
            String cleaned = utterance.toLowerCase(Locale.ROOT)
                    .replaceAll("['’]", "")
                    .replaceAll("[^a-z0-9]+", " ")
                    .trim();
            if (cleaned.isEmpty()) continue;
            turns.add(Arrays.asList(cleaned.split("\\s+")));
        }
        return turns;
    }

    /** Fillers plus immediately repeated words ("I I went", "the the bus"). */
    private static int countStumbles(List<String> tokens) {
        int count = 0;
        for (int i = 0; i < tokens.size(); i++) {
            String token = tokens.get(i);
            String previous = i > 0 ? tokens.get(i - 1) : null;
            String next = i + 1 < tokens.size() ? tokens.get(i + 1) : null;

            if (FILLERS.contains(token)) {
                count++;
                continue;
            }
            if (token.equals("like") && isFillerLike(previous, next)) {
                count++;
                continue;
            }
            if (next != null && token.equals(next) && hasLetter(token)) {
                count++;
                continue;
            }
            for (String[] phrase : PHRASE_FILLERS) {
                if (token.equals(phrase[0]) && phrase[1].equals(next)) {
                    count++;
                    break;
                }
            }
        }
        return count;
    }

    /**
     * "like" is only counted when it is neither the verb ("I like tea") nor a comparison
     * ("like this"). What is left is the discourse filler — "it was, like, very far".
     */
    private static boolean isFillerLike(String previous, String next) {
        if (previous != null && LIKE_IS_A_VERB_AFTER.contains(previous)) return false;
        if (next != null && LIKE_IS_A_COMPARISON_BEFORE.contains(next)) return false;
        return true;
    }

    /**
     * Repeats are only counted for words. "I I went" is a stumble; the "20 20" the tokeniser
     * makes of a "20-20 match" is not.
     */
    private static boolean hasLetter(String token) {
        for (int i = 0; i < token.length(); i++) {
            if (Character.isLetter(token.charAt(i))) {
                return true;
            }
        }
        return false;
    }

    /** Median, rounding up on an even count so a two-turn session is not halved unfairly. */
    private static int median(List<Integer> values) {
        if (values.isEmpty()) return 0;
        List<Integer> sorted = new ArrayList<>(values);
        sorted.sort(Integer::compareTo);
        int middle = sorted.size() / 2;
        if (sorted.size() % 2 == 1) {
            return sorted.get(middle);
        }
        return (int) Math.round((sorted.get(middle - 1) + sorted.get(middle)) / 2.0);
    }

    private static double clamp01(double value) {
        return Math.max(0.0, Math.min(1.0, value));
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
