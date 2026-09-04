package com.speakup.backend.agents;

import com.fasterxml.jackson.databind.JsonNode;
import com.speakup.backend.models.GrammarNote;
import com.speakup.backend.services.TutorChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

/**
 * Watches what the learner says and records the grammar slips — silently.
 *
 * <p>{@link #inspect} is {@code @Async}, and {@code ConversationService} fires it the moment
 * the learner's message is appended, before it asks the tutor for a reply. The two Groq calls
 * are therefore genuinely in flight at the same time, and grammar analysis can never delay a
 * spoken response or fail one: everything here is caught and logged.
 *
 * <p>Notes land in a sink list the caller owns (a {@code CopyOnWriteArrayList} on the live
 * session), which is what makes the fire-and-forget shape safe — this class holds no state
 * between calls and never touches the session itself.
 */
@Component
public class GrammarWatcherAgent {

    private static final Logger log = LoggerFactory.getLogger(GrammarWatcherAgent.class);

    /** Small budget: the reply is at most three short JSON objects, plus reasoning headroom. */
    private static final int TOKEN_BUDGET = 600;
    private static final String REASONING_EFFORT = "low";

    /** Below this, an utterance is an acknowledgement ("yes", "I think so") with nothing to mark. */
    private static final int MIN_WORDS = 4;
    /** Never surface more than this from one turn — the summary is a nudge, not a red-pen exercise. */
    private static final int MAX_NOTES_PER_TURN = 3;
    /** Cap on stored text, so a confused model cannot write an essay into the session record. */
    private static final int MAX_FIELD_CHARS = 200;

    private final ChatModel chatModel;
    private final LlmJsonSupport json;

    public GrammarWatcherAgent(ChatModel chatModel, LlmJsonSupport json) {
        this.chatModel = chatModel;
        this.json = json;
    }

    /**
     * Analyses one learner utterance and appends any notes to {@code sink}.
     *
     * <p>Throws nothing. A failure here means the session simply has fewer notes; the learner is
     * never told, and the fluency score records that accuracy went unmeasured rather than
     * assuming it was perfect.
     *
     * @param turnIndex the learner's turn number, 1-based, so the summary can order notes
     * @param sink      thread-safe list owned by the caller
     * @return a future completing with true when this utterance was genuinely checked — false
     *         when it was too short to check or the call failed. The caller needs that
     *         distinction: "no mistakes found" and "never looked" must not score the same.
     */
    @Async
    public CompletableFuture<Boolean> inspect(TutorChatService.LearnerContext learner, String utterance,
                                              int turnIndex, List<GrammarNote> sink) {
        try {
            if (utterance == null || countWords(utterance) < MIN_WORDS) {
                return CompletableFuture.completedFuture(false);
            }

            List<Message> messages = List.of(
                    new SystemMessage(systemPrompt(learner)),
                    new UserMessage(utterance));

            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .maxCompletionTokens(TOKEN_BUDGET)
                    .reasoningEffort(REASONING_EFFORT)
                    // Deterministic: the same sentence should be marked the same way twice.
                    .temperature(0.2)
                    .build();

            ChatResponse response = chatModel.call(new Prompt(messages, options));
            String raw = response != null && response.getResult() != null && response.getResult().getOutput() != null
                    ? response.getResult().getOutput().getText()
                    : null;

            JsonNode array = json.parseArray(raw).orElse(null);
            if (array == null) {
                log.debug("Grammar watcher returned no usable JSON for turn {}", turnIndex);
                return CompletableFuture.completedFuture(false);
            }

            int added = 0;
            for (JsonNode item : array) {
                if (added >= MAX_NOTES_PER_TURN) break;

                String said = clip(LlmJsonSupport.text(item, "said"));
                String better = clip(LlmJsonSupport.text(item, "better"));
                if (said == null || better == null) continue;
                // A "correction" identical to the original is the model padding its answer.
                if (said.equalsIgnoreCase(better)) continue;

                sink.add(new GrammarNote(
                        said,
                        better,
                        clip(LlmJsonSupport.text(item, "why")),
                        clip(LlmJsonSupport.text(item, "type")),
                        turnIndex));
                added++;
            }
            if (added > 0) {
                log.debug("Grammar watcher recorded {} note(s) on turn {}", added, turnIndex);
            }
            // An empty array is a real result: this sentence was checked and was clean.
            return CompletableFuture.completedFuture(true);
        } catch (Exception ex) {
            // Deliberately swallowed. The milestone requires this to be invisible to the learner.
            log.warn("Grammar watcher failed on turn {}: {}", turnIndex, ex.getMessage());
            return CompletableFuture.completedFuture(false);
        }
    }

    private static String systemPrompt(TutorChatService.LearnerContext learner) {
        StringBuilder prompt = new StringBuilder(900);
        prompt.append("You check one sentence of spoken English from a learner in India and report ")
                .append("only real grammar mistakes.\n\n");

        if (learner != null && learner.englishLevel() != null && !learner.englishLevel().isBlank()) {
            prompt.append("The speaker's level is ").append(learner.englishLevel())
                    .append(". Mark what would hold them back at that level, not everything possible.\n");
        }
        if (learner != null && learner.nativeLanguage() != null && !learner.nativeLanguage().isBlank()) {
            prompt.append("Their first language is ").append(learner.nativeLanguage())
                    .append(", so expect the usual interference patterns.\n");
        }

        prompt.append("\nThis text came from speech recognition, so:\n")
                .append("- Ignore all punctuation and capitalisation. Never comment on them.\n")
                .append("- Ignore anything that looks like a mis-heard word rather than a mistake.\n")
                .append("- Ignore fillers, false starts and repeated words.\n")
                .append("- Indian English usage that is standard in India is not a mistake.\n")
                .append("\nMark only: verb tense and form, subject-verb agreement, articles, ")
                .append("prepositions, plurals, pronouns, and word order.\n")
                .append("\nReply with a JSON array and nothing else. At most ")
                .append(MAX_NOTES_PER_TURN).append(" objects, each with exactly these keys:\n")
                .append("  \"said\": the learner's own words containing the mistake, quoted exactly\n")
                .append("  \"better\": the same words said correctly, changing as little as possible\n")
                .append("  \"why\": one short plain sentence, under fifteen words, no grammar jargon\n")
                .append("  \"type\": one of tense, agreement, article, preposition, plural, pronoun, word order\n")
                .append("\nIf the sentence is fine, reply with exactly []. Never invent a mistake to fill the array.");

        return prompt.toString();
    }

    private static String clip(String text) {
        if (text == null) return null;
        return text.length() <= MAX_FIELD_CHARS ? text : text.substring(0, MAX_FIELD_CHARS).trim();
    }

    private static int countWords(String text) {
        if (text == null || text.isBlank()) return 0;
        return text.trim().toLowerCase(Locale.ROOT).split("\\s+").length;
    }
}
