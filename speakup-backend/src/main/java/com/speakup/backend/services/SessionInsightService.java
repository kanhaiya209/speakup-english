package com.speakup.backend.services;

import com.speakup.backend.agents.FluencyTrackerAgent;
import com.speakup.backend.agents.VocabularyAgent;
import com.speakup.backend.models.ConversationMessage;
import com.speakup.backend.models.FluencyScore;
import com.speakup.backend.models.GrammarNote;
import com.speakup.backend.models.VocabularyWord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Turns a finished conversation into the numbers and lists the summary screen shows.
 *
 * <p>Called from {@code ConversationService.finalise()} for sessions worth keeping, on the
 * request thread of {@code POST /api/conversation/end}. That adds one Groq round-trip (roughly
 * one to three seconds) to ending a session, which the UI already covers with its "Saving
 * session" state — and it means the summary has real data the moment it renders, instead of the
 * learner watching an empty screen fill in.
 *
 * <p>Nothing here can fail the request: a broken agent produces a thinner summary, never a 500.
 */
@Service
public class SessionInsightService {

    private static final Logger log = LoggerFactory.getLogger(SessionInsightService.class);

    /** Most corrections shown for one session. Beyond this it stops being useful feedback. */
    private static final int MAX_GRAMMAR_NOTES = 12;

    private final FluencyTrackerAgent fluencyTracker;
    private final VocabularyAgent vocabularyAgent;

    public SessionInsightService(FluencyTrackerAgent fluencyTracker, VocabularyAgent vocabularyAgent) {
        this.fluencyTracker = fluencyTracker;
        this.vocabularyAgent = vocabularyAgent;
    }

    /**
     * Everything the agents produced for one session.
     *
     * @param fluency      null when the learner spoke too little for a score to mean anything
     * @param grammarNotes oldest turn first, capped at {@value #MAX_GRAMMAR_NOTES}
     * @param vocabulary   empty when the session was too short or the agent failed
     */
    public record SessionInsights(
            FluencyScore fluency,
            List<GrammarNote> grammarNotes,
            List<VocabularyWord> vocabulary
    ) {
    }

    /**
     * @param collectedNotes  what the Grammar Watcher gathered during the session
     * @param grammarRan      true if at least one grammar inspection completed; when false, zero
     *                        notes means "not checked" and the fluency score says so rather than
     *                        silently awarding perfect accuracy
     */
    public SessionInsights analyse(TutorChatService.LearnerContext learner,
                                   List<ConversationMessage> messages,
                                   long durationSeconds,
                                   List<GrammarNote> collectedNotes,
                                   boolean grammarRan) {

        List<GrammarNote> notes = orderAndCap(collectedNotes);

        List<String> learnerUtterances = new ArrayList<>();
        for (ConversationMessage message : messages) {
            if (message.isFromLearner()) {
                learnerUtterances.add(message.content());
            }
        }

        FluencyScore fluency = fluencyTracker.score(
                learnerUtterances, durationSeconds, notes.size(), grammarRan);

        List<VocabularyWord> vocabulary = vocabularyAgent.extract(learner, messages);

        log.info("Session insights: fluency {}, {} correction(s), {} new word(s){}",
                fluency != null ? fluency.overall() + " (" + fluency.band() + ")" : "not scored",
                notes.size(), vocabulary.size(),
                grammarRan ? "" : " — accuracy unmeasured");

        return new SessionInsights(fluency, notes, vocabulary);
    }

    /** Sorted by turn so the summary reads in the order the learner spoke, then truncated. */
    private static List<GrammarNote> orderAndCap(List<GrammarNote> notes) {
        if (notes == null || notes.isEmpty()) {
            return List.of();
        }
        List<GrammarNote> ordered = new ArrayList<>(notes);
        ordered.sort(Comparator.comparingInt(GrammarNote::turnIndex));
        return ordered.size() <= MAX_GRAMMAR_NOTES
                ? List.copyOf(ordered)
                : List.copyOf(ordered.subList(0, MAX_GRAMMAR_NOTES));
    }
}
