package com.speakup.backend.agents;

import com.fasterxml.jackson.databind.JsonNode;
import com.speakup.backend.models.ConversationMessage;
import com.speakup.backend.models.VocabularyWord;
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
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Picks the words worth remembering from a finished session.
 *
 * <p>Runs once, at session end, on the whole transcript — a per-turn version would keep
 * suggesting the same easy words and cost six times as much. The words come from what was
 * actually said: something the tutor used that the learner did not, or something the learner
 * was visibly reaching for and worked around.
 *
 * <p>Returns an empty list on any failure. The summary screen renders no vocabulary section
 * when the list is empty rather than showing a placeholder.
 */
@Component
public class VocabularyAgent {

    private static final Logger log = LoggerFactory.getLogger(VocabularyAgent.class);

    /** Six words with a meaning and an example each, plus reasoning headroom. */
    private static final int TOKEN_BUDGET = 1_400;
    private static final String REASONING_EFFORT = "low";

    private static final int MAX_WORDS = 6;
    /** How much of the transcript the model sees — the tail, where the vocabulary is richest. */
    private static final int MAX_TRANSCRIPT_CHARS = 4_000;
    /** Skip the call entirely below this: there is nothing to mine from three short answers. */
    private static final int MIN_LEARNER_WORDS = 15;

    private static final int MAX_WORD_CHARS = 40;
    private static final int MAX_MEANING_CHARS = 160;
    private static final int MAX_EXAMPLE_CHARS = 200;

    private final ChatModel chatModel;
    private final LlmJsonSupport json;

    public VocabularyAgent(ChatModel chatModel, LlmJsonSupport json) {
        this.chatModel = chatModel;
        this.json = json;
    }

    /**
     * Extracts up to {@value #MAX_WORDS} words from the session.
     *
     * @return the words, or an empty list when the session was too short or the call failed
     */
    public List<VocabularyWord> extract(TutorChatService.LearnerContext learner,
                                        List<ConversationMessage> messages) {
        try {
            if (messages == null || messages.isEmpty()) {
                return List.of();
            }
            if (learnerWordCount(messages) < MIN_LEARNER_WORDS) {
                log.debug("Vocabulary agent skipped — the learner said too little to mine");
                return List.of();
            }

            List<Message> prompt = List.of(
                    new SystemMessage(systemPrompt(learner)),
                    new UserMessage(renderTranscript(messages)));

            OpenAiChatOptions options = OpenAiChatOptions.builder()
                    .maxCompletionTokens(TOKEN_BUDGET)
                    .reasoningEffort(REASONING_EFFORT)
                    .temperature(0.3)
                    .build();

            ChatResponse response = chatModel.call(new Prompt(prompt, options));
            String raw = response != null && response.getResult() != null && response.getResult().getOutput() != null
                    ? response.getResult().getOutput().getText()
                    : null;

            JsonNode array = json.parseArray(raw).orElse(null);
            if (array == null) {
                log.debug("Vocabulary agent returned no usable JSON");
                return List.of();
            }

            List<VocabularyWord> words = new ArrayList<>(MAX_WORDS);
            Set<String> seen = new HashSet<>();
            for (JsonNode item : array) {
                if (words.size() >= MAX_WORDS) break;

                String word = clip(LlmJsonSupport.text(item, "word"), MAX_WORD_CHARS);
                String meaning = clip(LlmJsonSupport.text(item, "meaning"), MAX_MEANING_CHARS);
                if (word == null || meaning == null) continue;

                word = word.toLowerCase(Locale.ROOT);
                if (!seen.add(word)) continue;

                words.add(new VocabularyWord(
                        word,
                        meaning,
                        clip(LlmJsonSupport.text(item, "example"), MAX_EXAMPLE_CHARS),
                        normaliseSource(LlmJsonSupport.text(item, "source"))));
            }
            log.debug("Vocabulary agent produced {} word(s)", words.size());
            return List.copyOf(words);
        } catch (Exception ex) {
            log.warn("Vocabulary agent failed: {}", ex.getMessage());
            return List.of();
        }
    }

    private static String systemPrompt(TutorChatService.LearnerContext learner) {
        StringBuilder prompt = new StringBuilder(900);
        prompt.append("You read the transcript of an English speaking practice session and choose ")
                .append("the words most worth learning next.\n\n");

        if (learner != null && learner.englishLevel() != null && !learner.englishLevel().isBlank()) {
            prompt.append("The learner's level is ").append(learner.englishLevel())
                    .append(". Choose words that are one small step above what they already used — ")
                    .append("not words they clearly know, and not rare or academic words.\n");
        }
        if (learner != null && learner.learningGoal() != null && !learner.learningGoal().isBlank()) {
            prompt.append("They are practising for ").append(learner.learningGoal())
                    .append(", so prefer words they will actually need there.\n");
        }

        prompt.append("\nChoose from what is in the transcript, never from a general word list:\n")
                .append("- a word the tutor used that the learner did not, or\n")
                .append("- a word the learner was clearly reaching for and talked around.\n")
                .append("\nReply with a JSON array and nothing else. At most ").append(MAX_WORDS)
                .append(" objects, each with exactly these keys:\n")
                .append("  \"word\": the word or short phrase, lower case\n")
                .append("  \"meaning\": a plain-English definition under fifteen words, no jargon\n")
                .append("  \"example\": one natural sentence using it, about something from this conversation\n")
                .append("  \"source\": \"").append(VocabularyWord.SOURCE_TUTOR)
                .append("\" if the tutor used it, \"").append(VocabularyWord.SOURCE_REACHED_FOR)
                .append("\" if the learner was reaching for it\n")
                .append("\nIf the conversation offers nothing worth learning, reply with exactly []. ")
                .append("Fewer good words is better than six padded ones.");

        return prompt.toString();
    }

    /**
     * Renders the transcript with explicit role labels — the model has to know which side used
     * a word to answer the question at all. Truncated from the front, keeping the tail.
     */
    private static String renderTranscript(List<ConversationMessage> messages) {
        StringBuilder transcript = new StringBuilder(messages.size() * 80);
        for (ConversationMessage message : messages) {
            transcript.append(message.isFromLearner() ? "Learner: " : "Tutor: ")
                    .append(message.content())
                    .append('\n');
        }
        String text = transcript.toString().trim();
        if (text.length() <= MAX_TRANSCRIPT_CHARS) {
            return text;
        }
        String tail = text.substring(text.length() - MAX_TRANSCRIPT_CHARS);
        int firstBreak = tail.indexOf('\n');
        return firstBreak >= 0 ? tail.substring(firstBreak + 1) : tail;
    }

    private static int learnerWordCount(List<ConversationMessage> messages) {
        int words = 0;
        for (ConversationMessage message : messages) {
            if (message.isFromLearner() && message.content() != null && !message.content().isBlank()) {
                words += message.content().trim().split("\\s+").length;
            }
        }
        return words;
    }

    /** Anything the model invents in the source field collapses to the tutor default. */
    private static String normaliseSource(String source) {
        return VocabularyWord.SOURCE_REACHED_FOR.equalsIgnoreCase(source)
                ? VocabularyWord.SOURCE_REACHED_FOR
                : VocabularyWord.SOURCE_TUTOR;
    }

    private static String clip(String text, int max) {
        if (text == null) return null;
        return text.length() <= max ? text : text.substring(0, max).trim();
    }
}
