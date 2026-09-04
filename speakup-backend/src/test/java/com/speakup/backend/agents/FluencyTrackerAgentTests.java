package com.speakup.backend.agents;

import com.speakup.backend.models.FluencyScore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The fluency score is shown to a learner as a number out of 100, so its edges matter more than
 * its middle. These cover the cases that would otherwise produce a number that reads as a
 * measurement but is not one: a session too short to measure, and a session where the Grammar
 * Watcher never ran.
 */
class FluencyTrackerAgentTests {

    private final FluencyTrackerAgent agent = new FluencyTrackerAgent();

    /** 13 words, no fillers, no adjacent repeats — padding that adds length and nothing else. */
    private static final String CLEAN_TURN =
            "my brother works in Bangalore as a software engineer at a large company";

    /** Exactly 30 words: the fewest that can be scored at all. */
    private static final String THIRTY_WORDS =
            "one two three four five six seven eight nine ten "
            + "eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty "
            + "alpha beta gamma delta epsilon zeta eta theta iota kappa";

    @Test
    @DisplayName("A session with no speech is not scored at all")
    void emptySessionIsNotScored() {
        assertNull(agent.score(List.of(), 0, 0, true));
    }

    @Test
    @DisplayName("Null utterances are treated as an empty session, not a crash")
    void nullUtterancesAreNotScored() {
        assertNull(agent.score(null, 120, 0, true));
    }

    @Test
    @DisplayName("A single one-word turn is not scored — flow, accuracy and range would all be free marks")
    void oneWordTurnIsNotScored() {
        // Scoring this would award full flow (nothing to stumble over), full accuracy (nothing to
        // get wrong) and full range (one distinct word out of one), landing at 57/100 "Steady".
        assertNull(agent.score(List.of("Yes"), 60, 0, true));
    }

    @Test
    @DisplayName("The scorable threshold is exactly 30 words")
    void thresholdIsThirtyWords() {
        String twentyNine = THIRTY_WORDS.substring(0, THIRTY_WORDS.lastIndexOf(' '));

        assertNull(agent.score(List.of(twentyNine), 60, 0, true),
                "29 words should not be scored");
        assertNotNull(agent.score(List.of(THIRTY_WORDS), 60, 0, true),
                "30 words should be scored");
    }

    @Test
    @DisplayName("A zero-duration session scores on the word floor rather than dividing by zero")
    void zeroDurationUsesTheWordFloor() {
        // 30 words against the 20-word floor is full participation, even though the clock says
        // the session took no time at all.
        FluencyScore score = agent.score(List.of(THIRTY_WORDS), 0, 0, true);

        assertNotNull(score);
        assertEquals(25, score.participation());
        assertTrue(score.overall() > 0);
    }

    @Test
    @DisplayName("Unmeasured accuracy rescales over 80 instead of scoring a free 20")
    void unmeasuredAccuracyIsRescaledNotAssumedPerfect() {
        List<String> turns = List.of(
                "I went to the market yesterday and bought some vegetables for dinner",
                CLEAN_TURN,
                "We are planning a short trip to the hills during the next long weekend");

        FluencyScore measured = agent.score(turns, 180, 0, true);
        FluencyScore unmeasured = agent.score(turns, 180, 0, false);

        assertNotNull(measured);
        assertNotNull(unmeasured);
        assertTrue(measured.accuracyMeasured());
        assertFalse(unmeasured.accuracyMeasured());

        // The component itself is reported as 0 — the summary must not show a score that was
        // never computed.
        assertEquals(0, unmeasured.accuracy());

        // Everything else is identical, so the rescale is the only difference.
        assertEquals(measured.participation(), unmeasured.participation());
        assertEquals(measured.turnSubstance(), unmeasured.turnSubstance());
        assertEquals(measured.flow(), unmeasured.flow());
        assertEquals(measured.range(), unmeasured.range());

        int subtotal = measured.participation() + measured.turnSubstance()
                + measured.flow() + measured.range();
        assertEquals(Math.round(subtotal * 100.0f / 80), unmeasured.overall());
    }

    @Test
    @DisplayName("A clean transcript scores accuracy higher than a mistake-ridden one")
    void mistakesLowerAccuracy() {
        List<String> turns = List.of(
                "I went to the market yesterday and bought some vegetables for dinner",
                CLEAN_TURN,
                "We are planning a short trip to the hills during the next long weekend");

        FluencyScore clean = agent.score(turns, 120, 0, true);
        FluencyScore sloppy = agent.score(turns, 120, 6, true);

        assertNotNull(clean);
        assertNotNull(sloppy);
        assertTrue(clean.accuracy() > sloppy.accuracy());
        assertTrue(clean.overall() > sloppy.overall());
    }

    @Test
    @DisplayName("Fillers are counted, and 'like' as a verb or comparison is not")
    void fillerCountingDistinguishesLike() {
        // Three real fillers: "um", the discourse "like", and "you know".
        FluencyScore withFillers = agent.score(
                List.of("um I was like going there you know because of the traffic problem",
                        CLEAN_TURN, CLEAN_TURN),
                120, 0, true);
        assertNotNull(withFillers);
        assertEquals(3, withFillers.fillerCount());

        // None of these three "like"s is a filler: verb, comparison, verb.
        FluencyScore withoutFillers = agent.score(
                List.of("I like cricket and it was like that because people like the game",
                        CLEAN_TURN, CLEAN_TURN),
                120, 0, true);
        assertNotNull(withoutFillers);
        assertEquals(0, withoutFillers.fillerCount());
    }

    @Test
    @DisplayName("An immediately repeated word counts as a stumble, including a one-letter one")
    void repeatedWordIsAStumble() {
        FluencyScore score = agent.score(
                List.of("I I went to the the station early in the morning today",
                        CLEAN_TURN, CLEAN_TURN),
                120, 0, true);

        assertNotNull(score);
        assertEquals(2, score.fillerCount(), "'I I' and 'the the' are both stumbles");
    }

    @Test
    @DisplayName("A number the tokeniser split is not a repeat — '20-20 match' is not a stumble")
    void splitNumbersAreNotRepeats() {
        FluencyScore score = agent.score(
                List.of("we watched a 20-20 match on Sunday evening with my whole family",
                        CLEAN_TURN, CLEAN_TURN),
                120, 0, true);

        assertNotNull(score);
        assertEquals(0, score.fillerCount());
    }

    @Test
    @DisplayName("Median words per turn rounds up on an even number of turns")
    void medianRoundsUpOnEvenTurnCount() {
        // Turns of 5, 7, 8 and 10 words. The two middle values average to 7.5, reported as 8.
        FluencyScore score = agent.score(List.of(
                "one two three four five",
                "six seven eight nine ten eleven twelve",
                "thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty",
                "alpha beta gamma delta epsilon zeta eta theta iota kappa"), 120, 0, true);

        assertNotNull(score);
        assertEquals(8, score.wordsPerTurn());
    }

    @Test
    @DisplayName("Blank turns are skipped rather than counted as empty turns")
    void blankTurnsAreSkipped() {
        // Two real turns of 10 and 20 words: the median is 15. Counting the blank as a third,
        // zero-word turn would make it 10 instead.
        FluencyScore score = agent.score(List.of(
                "alpha beta gamma delta epsilon zeta eta theta iota kappa",
                "   ",
                "one two three four five six seven eight nine ten "
                        + "eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty"),
                120, 0, true);

        assertNotNull(score);
        assertEquals(15, score.wordsPerTurn());
    }

    @Test
    @DisplayName("Every band boundary maps to the band it names")
    void bandBoundaries() {
        assertEquals(FluencyScore.BAND_NEEDS_PRACTICE, FluencyScore.bandFor(0));
        assertEquals(FluencyScore.BAND_NEEDS_PRACTICE, FluencyScore.bandFor(39));
        assertEquals(FluencyScore.BAND_DEVELOPING, FluencyScore.bandFor(40));
        assertEquals(FluencyScore.BAND_DEVELOPING, FluencyScore.bandFor(54));
        assertEquals(FluencyScore.BAND_STEADY, FluencyScore.bandFor(55));
        assertEquals(FluencyScore.BAND_STEADY, FluencyScore.bandFor(69));
        assertEquals(FluencyScore.BAND_CONFIDENT, FluencyScore.bandFor(70));
        assertEquals(FluencyScore.BAND_CONFIDENT, FluencyScore.bandFor(84));
        assertEquals(FluencyScore.BAND_FLUENT, FluencyScore.bandFor(85));
        assertEquals(FluencyScore.BAND_FLUENT, FluencyScore.bandFor(100));
    }

    @Test
    @DisplayName("The reported band always matches the reported score")
    void bandMatchesScore() {
        FluencyScore score = agent.score(List.of(CLEAN_TURN, CLEAN_TURN, CLEAN_TURN), 180, 1, true);
        assertNotNull(score);
        assertEquals(FluencyScore.bandFor(score.overall()), score.band());
    }

    @Test
    @DisplayName("The score never leaves 0–100, however lopsided the session")
    void scoreStaysInRange() {
        StringBuilder verbose = new StringBuilder();
        for (int i = 0; i < 500; i++) {
            verbose.append("word").append(i).append(' ');
        }
        FluencyScore score = agent.score(List.of(verbose.toString()), 1, 0, true);

        assertNotNull(score);
        assertTrue(score.overall() >= 0 && score.overall() <= 100, "got " + score.overall());
    }
}
