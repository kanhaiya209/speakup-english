package com.speakup.backend.models;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;

/**
 * The mode ids are a wire contract with the frontend, and the {@code learningGoal} strings are
 * a wire contract with the profile the learner filled in during onboarding. A typo in either
 * would silently drop every learner into Free Talk, which looks like the feature working.
 */
class PracticeModeTests {

    // The exact strings the profile stores, copied from the option lists in ProfileSetup.jsx.
    @Test
    @DisplayName("Every learning goal maps to its own mode")
    void everyGoalMapsToItsMode() {
        assertSame(PracticeMode.JOB_INTERVIEWS, PracticeMode.recommendedFor("Job Interviews"));
        assertSame(PracticeMode.BUSINESS_COMMUNICATION,
                PracticeMode.recommendedFor("Business Communication"));
        assertSame(PracticeMode.DAILY_CONVERSATION, PracticeMode.recommendedFor("Daily Conversation"));
        assertSame(PracticeMode.TRAVEL_TOURISM, PracticeMode.recommendedFor("Travel & Tourism"));
        assertSame(PracticeMode.ACADEMIC_ENGLISH, PracticeMode.recommendedFor("Academic English"));
        assertSame(PracticeMode.PUBLIC_SPEAKING, PracticeMode.recommendedFor("Public Speaking"));
    }

    @Test
    @DisplayName("Goal matching ignores case and surrounding space")
    void goalMatchingIsForgiving() {
        assertSame(PracticeMode.JOB_INTERVIEWS, PracticeMode.recommendedFor("job interviews"));
        assertSame(PracticeMode.PUBLIC_SPEAKING, PracticeMode.recommendedFor("  Public Speaking  "));
    }

    @Test
    @DisplayName("A missing or unknown goal recommends Free Talk")
    void unknownGoalFallsBackToFreeTalk() {
        assertSame(PracticeMode.FREE_TALK, PracticeMode.recommendedFor(null));
        assertSame(PracticeMode.FREE_TALK, PracticeMode.recommendedFor(""));
        assertSame(PracticeMode.FREE_TALK, PracticeMode.recommendedFor("   "));
        assertSame(PracticeMode.FREE_TALK, PracticeMode.recommendedFor("Competitive Debating"));
    }

    @Test
    @DisplayName("Each mode's own id round-trips back to it")
    void idsRoundTrip() {
        for (PracticeMode mode : PracticeMode.values()) {
            assertSame(mode, PracticeMode.fromId(mode.id()),
                    "id " + mode.id() + " did not round-trip");
        }
    }

    @Test
    @DisplayName("An unknown or missing id resolves to Free Talk rather than throwing")
    void unknownIdFallsBackToFreeTalk() {
        assertSame(PracticeMode.FREE_TALK, PracticeMode.fromId(null));
        assertSame(PracticeMode.FREE_TALK, PracticeMode.fromId(""));
        assertSame(PracticeMode.FREE_TALK, PracticeMode.fromId("debate-club"));
        assertSame(PracticeMode.FREE_TALK, PracticeMode.fromId("JOB_INTERVIEWS"));
    }

    @Test
    @DisplayName("There are exactly seven modes, each with the text the UI needs")
    void sevenModesAllPopulated() {
        assertEquals(7, PracticeMode.values().length);

        for (PracticeMode mode : PracticeMode.values()) {
            assertNotNull(mode.id(), mode + " has no id");
            assertFalse(mode.id().isBlank(), mode + " has a blank id");
            assertNotNull(mode.label(), mode + " has no label");
            assertFalse(mode.label().isBlank(), mode + " has a blank label");
            assertNotNull(mode.description(), mode + " has no description");
            assertFalse(mode.description().isBlank(), mode + " has a blank description");
            assertNotNull(mode.personaPrompt(), mode + " has no persona prompt");
            assertFalse(mode.personaPrompt().isBlank(), mode + " has a blank persona prompt");
        }
    }

    @Test
    @DisplayName("Every mode except Free Talk is reachable from a learning goal")
    void everyModeExceptFreeTalkHasAGoal() {
        for (PracticeMode mode : PracticeMode.values()) {
            if (mode == PracticeMode.FREE_TALK) {
                continue;
            }
            assertNotNull(mode.learningGoal(), mode + " has no learning goal to be recommended by");
            assertSame(mode, PracticeMode.recommendedFor(mode.learningGoal()),
                    mode + " is not recommended by its own goal string");
        }
    }
}
