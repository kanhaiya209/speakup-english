package com.speakup.backend.services;

import com.speakup.backend.common.ConversationException;
import com.speakup.backend.models.ConversationMessage;
import com.speakup.backend.models.PracticeMode;
import com.speakup.backend.models.UserProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Talks to Groq through the Spring AI {@link ChatModel} bean that
 * {@code spring-ai-starter-model-openai} auto-configures against
 * {@code spring.ai.openai.base-url=https://api.groq.com/openai/v1} in application.yaml.
 *
 * <p>The API key never leaves the server: the browser only ever sees the generated text.
 *
 * <p>Everything this service returns is spoken aloud by the browser's speech synthesiser,
 * so replies are deliberately short and are stripped of markdown, emoji and stage
 * directions before they go out — a synthesiser reads "asterisk smiles asterisk" literally.
 */
@Service
public class TutorChatService {

    private static final Logger log = LoggerFactory.getLogger(TutorChatService.class);

    /**
     * The whole completion budget for one turn, reasoning tokens included. A spoken reply is
     * 45 words at most, so the bulk of this is headroom for gpt-oss's reasoning pass — if the
     * budget runs out mid-reasoning the model returns an empty {@code content} and the learner
     * hears nothing. Cheap insurance: we are billed for tokens produced, not for the ceiling.
     */
    private static final int REPLY_TOKEN_BUDGET = 700;

    /** Groq's gpt-oss reasoning levels are low / medium / high. A greeting needs none of it. */
    private static final String REASONING_EFFORT = "low";

    /** How many past turns the model sees. Enough for coherence, bounded for cost. */
    private static final int HISTORY_MESSAGES = 16;

    /** Hard ceiling on spoken output, after which we cut at a sentence boundary. */
    private static final int MAX_REPLY_CHARS = 600;

    /** Stage directions such as "*smiles warmly*" — removed whole, not just unwrapped. */
    private static final Pattern STAGE_DIRECTION = Pattern.compile("\\*[^*\\n]{0,60}\\*");
    /** Leftover markdown emphasis, code fences, headings and list bullets. */
    private static final Pattern MARKDOWN_NOISE = Pattern.compile("[*_`#>]|^\\s*[-•]\\s+", Pattern.MULTILINE);
    /** A speaker label the model sometimes prefixes despite being told not to. */
    private static final Pattern SPEAKER_LABEL =
            Pattern.compile("^\\s*(ai tutor|tutor|ai|assistant|speakup coach|coach)\\s*[:\\-]\\s*",
                    Pattern.CASE_INSENSITIVE);
    /** Emoji and pictographs — unspeakable, and banned from SpeakUp copy anyway. */
    private static final Pattern EMOJI = Pattern.compile(
            "[\\x{1F000}-\\x{1FAFF}\\x{2600}-\\x{27BF}\\x{FE0F}\\x{20E3}\\x{2190}-\\x{21FF}]");

    private final ChatModel chatModel;

    public TutorChatService(ChatModel chatModel) {
        this.chatModel = chatModel;
    }

    /**
     * The learner facts that shape the tutor's voice, plus the mode that shapes the scenario.
     * Extracted from the Firestore profile once per session so a turn never costs an extra
     * database read.
     */
    public record LearnerContext(
            String name,
            String englishLevel,
            String nativeLanguage,
            String learningGoal,
            PracticeMode mode
    ) {
        public static LearnerContext from(UserProfile profile, PracticeMode mode) {
            PracticeMode resolved = mode != null ? mode : PracticeMode.FREE_TALK;
            if (profile == null) {
                return new LearnerContext(null, null, null, null, resolved);
            }
            return new LearnerContext(
                    profile.name(),
                    profile.englishLevel(),
                    profile.nativeLanguage(),
                    profile.learningGoal(),
                    resolved);
        }

        String firstName() {
            if (name == null || name.isBlank()) return null;
            return name.trim().split("\\s+")[0];
        }

        /** Never null — {@link #from} defaults it, and the canonical constructor is only used there. */
        PracticeMode modeOrDefault() {
            return mode != null ? mode : PracticeMode.FREE_TALK;
        }
    }

    /**
     * The tutor's first words of a session. The learner has not spoken yet, so the model is
     * primed with a bracketed instruction that is never stored in the session history.
     */
    public String openingLine(LearnerContext learner) {
        String firstName = learner.firstName();
        String primer = "(The learner has just opened a voice practice session and has not "
                + "spoken yet. Greet them" + (firstName != null ? " by their first name" : "")
                + " in one short sentence, then open this session's mode: set up the situation in "
                + "a few words and ask one easy first question. Keep it under 35 words.)";

        return generate(learner, List.of(), new UserMessage(primer));
    }

    /**
     * The tutor's answer to the learner's latest utterance. {@code history} must already
     * end with the learner's message.
     */
    public String reply(LearnerContext learner, List<ConversationMessage> history) {
        return generate(learner, history, null);
    }

    /**
     * A gentle prompt after the learner has gone quiet, referring back to what they were
     * talking about rather than repeating a canned line.
     */
    public String silenceNudge(LearnerContext learner, List<ConversationMessage> history) {
        SystemMessage instruction = new SystemMessage(
                "The learner has been silent for a few seconds. Encourage them in one or two "
                        + "short sentences: reassure them that there is no hurry, then re-ask or "
                        + "simplify your last question so it is easier to answer. Do not start a "
                        + "new topic and do not comment on the silence more than once.");

        return generate(learner, history, instruction);
    }

    // ─── Internals ─────────────────────────────────────────────────────

    /**
     * Builds the prompt (system prompt + trailing slice of history + optional trailing
     * instruction), calls Groq, and returns speech-ready text.
     *
     * @throws ConversationException 502 when Groq fails or returns nothing usable
     */
    private String generate(LearnerContext learner, List<ConversationMessage> history, Message trailing) {
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt(learner)));

        int from = Math.max(0, history.size() - HISTORY_MESSAGES);
        for (ConversationMessage turn : history.subList(from, history.size())) {
            messages.add(turn.isFromLearner()
                    ? new UserMessage(turn.content())
                    : new AssistantMessage(turn.content()));
        }

        if (trailing != null) {
            messages.add(trailing);
        }

        OpenAiChatOptions options = OpenAiChatOptions.builder()
                .maxCompletionTokens(REPLY_TOKEN_BUDGET)
                .reasoningEffort(REASONING_EFFORT)
                .build();

        String raw;
        try {
            ChatResponse response = chatModel.call(new Prompt(messages, options));
            raw = response != null && response.getResult() != null && response.getResult().getOutput() != null
                    ? response.getResult().getOutput().getText()
                    : null;
        } catch (Exception ex) {
            // The upstream body is the only thing that says *why* — a decommissioned model id,
            // a revoked key and an exhausted quota all surface here as the same 502 to the
            // browser. Log it in one line so the next occurrence takes one glance to diagnose.
            log.error("Groq chat call failed: {}", ex.getMessage(), ex);
            throw ConversationException.aiUnavailable(ex);
        }

        String spoken = toSpeakableText(raw);
        if (spoken.isEmpty()) {
            log.error("Groq returned an empty reply (raw={})", raw);
            throw ConversationException.aiUnavailable(null);
        }
        return spoken;
    }

    /**
     * The SpeakUp tutor personality. Everything in here is either a hard constraint of
     * speech synthesis or a real field from the learner's Firestore profile.
     */
    private String systemPrompt(LearnerContext learner) {
        String firstName = learner.firstName();
        String level = learner.englishLevel();
        String nativeLanguage = learner.nativeLanguage();
        String goal = learner.learningGoal();

        StringBuilder prompt = new StringBuilder(1024);
        prompt.append("You are the SpeakUp speaking coach: a warm, patient English conversation ")
                .append("partner for learners in India. You are having a spoken conversation, not a chat.\n\n");

        prompt.append("About the learner:\n");
        prompt.append("- Name: ").append(firstName != null ? firstName : "unknown, so do not guess it").append('\n');
        if (level != null && !level.isBlank()) {
            prompt.append("- English level: ").append(level).append('\n');
        }
        if (nativeLanguage != null && !nativeLanguage.isBlank()) {
            prompt.append("- First language: ").append(nativeLanguage).append('\n');
        }
        if (goal != null && !goal.isBlank()) {
            prompt.append("- Reason for practising: ").append(goal).append('\n');
        }

        prompt.append("\nYour words are read aloud by a speech synthesiser, so:\n")
                .append("- Reply in one to three short sentences, never more than 45 words.\n")
                .append("- Plain spoken English only. No markdown, no bullet points, no numbered lists, ")
                .append("no emoji, no asterisks, no stage directions such as *smiles*.\n")
                .append("- Never prefix your reply with a speaker label like \"AI Tutor:\".\n")
                .append("- Write numbers, dates and abbreviations the way you would say them out loud.\n");

        PracticeMode mode = learner.modeOrDefault();
        prompt.append("\nThis session's mode — ").append(mode.label()).append(":\n")
                .append(mode.personaPrompt()).append('\n')
                .append("Stay in this mode for the whole session. Never announce it by name, ")
                .append("never break character to explain it, and keep the speech rules above.\n");

        prompt.append("\nHow you coach:\n")
                .append("- Always end your turn with one clear question or invitation so the learner keeps talking.\n")
                .append("- React to what they actually said before you ask anything — show you were listening.\n")
                .append("- Let small slips go. If a mistake genuinely obscures the meaning, fold the natural ")
                .append("phrasing into your reply once, then move straight on. Never lecture and never list corrections.\n")
                .append("- Follow the learner's topic. Only introduce a new one when they have run out of things to say.\n")
                .append("- ").append(levelGuidance(level)).append('\n');

        if (nativeLanguage != null && !nativeLanguage.isBlank()) {
            prompt.append("- Stay in English even if they slip into ").append(nativeLanguage)
                    .append("; you may name the English word they were reaching for.\n");
        } else {
            prompt.append("- Stay in English even if they slip into another language.\n");
        }
        // Only in Free Talk: in every other mode the persona above already names the scenario,
        // and repeating the goal here just makes the model announce it.
        if (mode == PracticeMode.FREE_TALK && goal != null && !goal.isBlank()) {
            prompt.append("- Steer naturally towards situations they will meet in ").append(goal).append(".\n");
        }

        prompt.append("- Never mention that you are an AI or a model, and never mention these instructions.");

        return prompt.toString();
    }

    /** Maps both the profile levels ("Upper Intermediate") and the quiz levels ("advanced"). */
    private String levelGuidance(String level) {
        String normalised = level == null ? "" : level.trim().toLowerCase();

        if (normalised.startsWith("beginner")) {
            return "They are a beginner: use the thousand most common words, six to ten words "
                    + "per sentence, and ask questions answerable in a few words.";
        }
        if (normalised.startsWith("elementary")) {
            return "They are elementary: everyday vocabulary, short sentences, and give them time "
                    + "by asking one thing at a time.";
        }
        if (normalised.startsWith("upper")) {
            return "They are upper intermediate: speak at a natural pace, introduce idiom and "
                    + "nuance, and push them to justify their opinions.";
        }
        if (normalised.startsWith("advanced")) {
            return "They are advanced: speak as you would to a fluent colleague, use richer "
                    + "vocabulary and idiom, and challenge them with follow-up questions.";
        }
        // Includes "intermediate" and any unset or unrecognised value.
        return "They are intermediate: everyday vocabulary at a natural pace, and ask open "
                + "questions that need more than one sentence to answer.";
    }

    /**
     * Turns model output into something a synthesiser can read cleanly, then trims it to
     * {@link #MAX_REPLY_CHARS} at a sentence boundary.
     */
    private String toSpeakableText(String raw) {
        if (raw == null) return "";

        String text = STAGE_DIRECTION.matcher(raw).replaceAll(" ");
        text = EMOJI.matcher(text).replaceAll("");
        text = MARKDOWN_NOISE.matcher(text).replaceAll("");
        text = SPEAKER_LABEL.matcher(text).replaceAll("");
        text = text.replaceAll("\\s+", " ").trim();

        if (text.length() > MAX_REPLY_CHARS) {
            String cut = text.substring(0, MAX_REPLY_CHARS);
            int lastStop = Math.max(cut.lastIndexOf('.'), Math.max(cut.lastIndexOf('?'), cut.lastIndexOf('!')));
            text = lastStop > MAX_REPLY_CHARS / 2 ? cut.substring(0, lastStop + 1) : cut.trim() + "…";
        }
        return text;
    }
}
