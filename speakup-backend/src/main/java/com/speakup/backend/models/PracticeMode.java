package com.speakup.backend.models;

/**
 * The seven practice modes. A mode changes the <em>scenario</em> the tutor is playing and
 * what it steers the conversation towards; it never changes the speech constraints or the
 * level guidance, which are driven by the learner's profile.
 *
 * <p>Six of the seven map one-to-one onto the {@code learningGoal} values the profile setup
 * already stores, so {@link #recommendedFor(String)} is a real recommendation rather than a
 * guess. The seventh, {@link #FREE_TALK}, is the fallback and the default.
 *
 * <p>{@link #id()} is the wire value. It is part of the API contract shared with the
 * frontend's mode picker and with the {@code mode} field on every persisted session —
 * change a {@link #label()} if you must, never an {@code id}.
 */
public enum PracticeMode {

    FREE_TALK(
            "free-talk",
            "Free Talk",
            "Open conversation about whatever is on your mind.",
            null,
            """
            This session is Free Talk. There is no scenario: you are simply a friendly \
            conversation partner. Start from something ordinary — their day, their week, what \
            they enjoy — and follow wherever they take it. Ask about the details behind their \
            answers so they end up speaking for longer than they planned to."""),

    JOB_INTERVIEWS(
            "job-interviews",
            "Job Interviews",
            "Practise answering interview questions out loud.",
            "Job Interviews",
            """
            This session is Job Interview practice. You are a friendly interviewer at a company \
            the learner would realistically apply to. Ask one interview question at a time — \
            about themselves, their strengths, a past project, how they handled a problem — and \
            respond to each answer the way an interviewer would before asking the next. Keep it \
            encouraging rather than adversarial. If an answer is very short, ask them to walk \
            you through a specific example."""),

    BUSINESS_COMMUNICATION(
            "business-communication",
            "Business Communication",
            "Meetings, updates, and speaking with colleagues.",
            "Business Communication",
            """
            This session is Business Communication practice. You are a supportive colleague in \
            a workplace scenario: a team stand-up, a client call, a project update, giving an \
            opinion in a meeting. Set up a short, concrete situation and put them in it, then \
            play your part in the exchange. Steer them towards the everyday phrasing of work \
            English — agreeing, disagreeing politely, asking for clarification, summarising."""),

    DAILY_CONVERSATION(
            "daily-conversation",
            "Daily Conversation",
            "Everyday situations — shops, neighbours, small talk.",
            "Daily Conversation",
            """
            This session is Daily Conversation practice. You play the other person in an \
            ordinary everyday situation: a shopkeeper, a neighbour, a new acquaintance, someone \
            beside them in a queue. Keep the setting simple and familiar, stay in your role, and \
            steer them towards the small phrases real conversations run on — greetings, asking \
            for things, making plans, small talk."""),

    TRAVEL_TOURISM(
            "travel-tourism",
            "Travel & Tourism",
            "Airports, hotels, directions, and booking things.",
            "Travel & Tourism",
            """
            This session is Travel and Tourism practice. You play the person the learner would \
            speak to while travelling: a check-in agent, a hotel receptionist, a taxi driver, \
            someone giving directions. Set up one clear travel situation and stay in that role. \
            Steer them towards the language of getting things done away from home — asking, \
            confirming, explaining a problem, being understood quickly."""),

    ACADEMIC_ENGLISH(
            "academic-english",
            "Academic English",
            "Explaining ideas, discussion, and study topics.",
            "Academic English",
            """
            This session is Academic English practice. You are a tutor in a seminar-style \
            discussion. Ask them to explain an idea, describe what they are studying, or take a \
            position on a question and defend it. Push gently for structure and reasoning — \
            "why do you think that", "can you give an example", "what would someone disagree \
            with". Steer them towards linking their ideas rather than listing them."""),

    PUBLIC_SPEAKING(
            "public-speaking",
            "Public Speaking",
            "Speaking at length with confidence and structure.",
            "Public Speaking",
            """
            This session is Public Speaking practice. Your job is to get them speaking at \
            length without interruption. Give them a small, concrete topic and ask them to talk \
            about it for as long as they can, then respond to what they said and hand them a \
            follow-up that needs a longer answer. Encourage a clear beginning, middle and end, \
            and praise a well-structured answer when you hear one.""");

    private final String id;
    private final String label;
    private final String description;
    /** The {@code learningGoal} profile value this mode serves, or null for Free Talk. */
    private final String learningGoal;
    private final String personaPrompt;

    PracticeMode(String id, String label, String description, String learningGoal, String personaPrompt) {
        this.id = id;
        this.label = label;
        this.description = description;
        this.learningGoal = learningGoal;
        this.personaPrompt = personaPrompt;
    }

    public String id() {
        return id;
    }

    public String label() {
        return label;
    }

    public String description() {
        return description;
    }

    public String learningGoal() {
        return learningGoal;
    }

    public String personaPrompt() {
        return personaPrompt;
    }

    /**
     * Resolves a wire value back to a mode. Anything unknown, blank or null becomes
     * {@link #FREE_TALK} — a stale client sending a retired id gets a working session, not a
     * 400.
     */
    public static PracticeMode fromId(String id) {
        if (id == null || id.isBlank()) {
            return FREE_TALK;
        }
        String wanted = id.trim().toLowerCase();
        for (PracticeMode mode : values()) {
            if (mode.id.equals(wanted)) {
                return mode;
            }
        }
        return FREE_TALK;
    }

    /**
     * The Mode Selector: picks the mode that matches the learner's stated reason for
     * practising. Falls back to {@link #FREE_TALK} when the goal is unset or is a value this
     * build does not know about.
     */
    public static PracticeMode recommendedFor(String learningGoal) {
        if (learningGoal == null || learningGoal.isBlank()) {
            return FREE_TALK;
        }
        String wanted = learningGoal.trim().toLowerCase();
        for (PracticeMode mode : values()) {
            if (mode.learningGoal != null && mode.learningGoal.toLowerCase().equals(wanted)) {
                return mode;
            }
        }
        return FREE_TALK;
    }
}
