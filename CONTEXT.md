# SpeakUp — Project Context

Design rules: [`speakup-frontend/DESIGN_SYSTEM.md`](speakup-frontend/DESIGN_SYSTEM.md).
Agent instructions: [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md).

## Project
AI-powered English speaking practice platform for Indian learners.
GitHub: https://github.com/kanhaiya209/speakup-english

## Tech Stack
- Backend: Spring Boot 3.4.3, Java 21, Maven
- AI: Spring AI 1.0.0 → Groq (`openai/gpt-oss-120b`) → Gemini → OpenRouter
- Frontend: React 19 + Vite + Tailwind CSS v4
- Database: Firebase Firestore
- Auth: Firebase Auth + JWT (jjwt 0.12.6)
- Deployment: Vercel (frontend) + Railway (backend)

## Firebase
- Project ID: speakup-english-ed922
- Auth: Google OAuth + Email/Password enabled
- Firestore: asia-south1 region
- Credentials: Application Default Credentials via gcloud CLI (NO JSON file)

## Package Structure
- Backend package: com.speakup.backend
- Backend port: 8080
- Frontend port: 5173 (CORS allows 5173/5174/5175)

## Completed Tasks ✅

### Module 1 — User Authentication and Profile
- Task 1: Google OAuth login ✅ WORKING
- Task 2: Email and password login ✅ WORKING
- Task 3: Profile setup — name, native language, English level, goals ✅ WORKING
- Task 4: Onboarding quiz — 10 questions, level assessment ✅ WORKING
- Task 5: Role management — Learner, Admin ✅ WORKING
- Task 6: Session persistence with JWT ✅ WORKING
- Task 7: Account settings and preferences ✅ WORKING

### Module 2 — Voice Conversation (real-time speaking practice) ✅
Full-duplex spoken conversation with the AI tutor. No Send button: the tutor answers when
the learner stops speaking.

- **Backend owns the conversation.** `ConversationService` keeps live sessions in memory
  (one `ReentrantLock` per session), `TutorChatService` calls the already-configured Spring
  AI `ChatModel` → Groq, and only text crosses the wire. The Groq key never leaves the
  server
- **Endpoints** (`/api/conversation`): `POST /start`, `POST /turn`, `POST /nudge`,
  `POST /end`, `GET /sessions?limit=`. Identity always comes from the JWT filter's
  `userId` request attribute — never from the body. Each method 401s itself, because
  `SecurityConfig` permits all requests at the chain level
- **Firestore** collection `practiceSessions`: `sessionId`, `userId`, `startedAt`,
  `endedAt`, `durationSeconds`, `messageCount`, `userTurnCount`, `userWordCount`,
  `status` (`completed` | `discarded`), `recordingKind` (`transcript`), `messages[]`,
  `transcript`. Written once, on `end`. A session the learner never spoke in is discarded
  rather than saved. `end` also updates `users/{id}` `totalMinutesPracticed`, `streak`,
  `lastPractisedOn`, `lastPractisedAt` in a transaction
- **Recording is the transcript, not audio.** No `MediaRecorder`, no Firebase Storage
  bucket and no storage rules exist in this project, so shipping audio upload would have
  been a feature that fails without out-of-repo setup. `recordingKind` exists so audio can
  be added later without a migration
- **Browser side**: `hooks/useSpeechRecognition.js` (Web Speech API, `resultIndex`
  iteration so phrases are never duplicated, self-restart on Chrome's spontaneous `onend`),
  `hooks/useSpeechSynthesis.js` (sentence chunking, epoch-based cancellation, watchdog for
  Chrome's missing `onend`), `hooks/useVoiceConversation.js` (the state machine)
- **Timing knobs** all live in `src/config/voice.js`: `SPEECH_END_DELAY_MS` 1300,
  `SILENCE_PROMPT_MS` 8000, `RECOGNITION_RESTART_DELAY_MS` 250, `SPEECH_LANG` `en-IN`
- **The microphone is never open while the tutor speaks** — the Web Speech API has no echo
  cancellation, so it would transcribe the tutor and reply to itself
- Verified: `npm run verify` clean (lint + check:design + build), tokens present in
  `dist/assets/*.css`, backend `mvn compile` clean, Spring context starts, all five routes
  answer 401 without a JWT

### Module 3 — Fluency Scoring & Multi-Agent Session Insights ✅
Multi-agent real-time and post-session analysis pipeline for speaking practice.
- **FluencyTrackerAgent**: Evaluates 5 dimensions (Participation, Substance, Flow, Accuracy, Range)
  producing a 0–100 score and qualitative bands (`Needs Practice`, `Developing`, `Steady`, `Confident`, `Fluent`).
- **GrammarWatcherAgent**: Asynchronously inspects learner utterances during conversation turns in
  the background (`@Async`) without blocking tutor response generation.
- **VocabularyAgent**: Extracts high-value vocabulary words with definitions and usage examples
  from the conversation transcript post-session using Groq LLM.
- **SessionInsightService**: Coordinates agents at `POST /api/conversation/end` to assemble insights
  and persist them to Firestore.
- **Frontend SessionSummary**: Monochrome Vercel-style summary displaying fluency score, metrics breakdown,
  grammar corrections with inline explanations, and vocabulary cards.

### Module 4 — Practice Modes ✅
Targeted conversation practice across real-world situations:
- 7 modes supported: `free-talk`, `job-interviews`, `business-communication`, `daily-conversation`,
  `travel-tourism`, `academic-english`, `public-speaking`.
- Backend persona customization in `TutorChatService` based on selected mode.
- `ModePicker.jsx` frontend component to switch practice modes with recommended badges based on user goals.
- Endpoints: `GET /api/conversation/modes`, `POST /api/conversation/start` with mode payload.

### Module 5 — Natural TTS & Push Reminders ✅
- **ElevenLabs TTS**: `POST /api/tts/speak` streams high-quality natural tutor speech audio (`audio/mpeg`)
  with automatic fallback to Web Speech Synthesis API via `useTutorVoice.js` if key or quota is unavailable.
- **Push Reminders**: `NotificationController` + `NotificationService` handles device token registration
  (`POST/DELETE /api/notifications/token`) with `firebase-messaging-sw.js` for daily speaking practice reminders.

### UI/UX Redesign (Vercel Dashboard Aesthetic) ✅
**Design rules live in `speakup-frontend/DESIGN_SYSTEM.md` — read it before any UI work.**
Root `CLAUDE.md` and `AGENTS.md` point every AI agent at it.

- Design vibe: Vercel dashboard — pure black `#000000`, flat, monochrome, generous
  whitespace, 1px `#222222` borders instead of shadows. Linear.app and the Raycast
  *website* are secondary references. The earlier glowing/neon Raycast-terminal look was
  removed in this redesign
- `index.css`: all design tokens in a Tailwind v4 `@theme` block — `canvas`, `surface`,
  `surface-2`, `line`, `line-strong`, `fg`, `muted`, `faint`, `success`, `danger`,
  `radius-card` 8px, `radius-control` 6px. Inter via `--font-sans`. No keyframes
- `components/Navbar.jsx`: new shared `h-14` sticky nav — links, avatar dropdown
  (`role="menu"`, outside-click + Escape dismissal), mobile hamburger, admin link when
  `user.role === 'admin'`
- `Login.jsx`: centred `max-w-[400px]` card, segmented Sign in / Sign up tabs, white
  primary button, outlined Google button. All Firebase auth logic unchanged
- `Home.jsx`: time-based greeting, four stat cards wired to real Redux fields, quick
  actions row with a disabled "Start Practicing" + "Coming soon"
- `Quiz.jsx`: framer-motion removed. Plain `Question N of M` header, 0.5px progress bar,
  flat keycap options, `A`–`D` / `1`–`4` keyboard shortcuts kept, single-spinner loading
  screen, result screen with score card and breakdown bars
- `Settings.jsx`: `240px` sidebar with white-left-border active tabs, four sections
  (Profile, Preferences, Commitment, Account). `PUT /api/user/profile` payload unchanged
- `AdminDashboard.jsx`: four stat cards from `/api/admin/analytics`, search + filter
  toggles, users table with `divide-y divide-line` rows and an empty state
- `ProfileSetup.jsx`: redesigned to this system — a Quiz-style header with a single
  `h-0.5` progress bar, one card, radio rows using the §4 selectable-option recipe with the
  1.5px white dot for selection. framer-motion, ShimmerButton, BackgroundBeams, the emoji
  icons, the `STEP 01` HUD label and the "Popular"/"Recommended" badges (which implied usage
  data we do not have) are all gone. All four `value` sets and the `PATCH /api/user/profile`
  payload are unchanged
- With that, the §10 legacy exception no longer exists: `src/components/ui/*` is deleted,
  `framer-motion` / `clsx` / `tailwind-merge` are uninstalled, `check-design.mjs`'s `EXEMPT`
  is empty and `eslint.config.js` has no import override. The banned-import patterns stay,
  so re-adding any of it fails lint
- Verified: `npm run lint` clean, `npm run build` passing, tokens confirmed present in
  `dist/assets/*.css`


### Backend Files
- pom.xml
- application.yml
- FirebaseConfig.java (ADC credentials)
- SecurityConfig.java (inline JWT filter + CORS 5173/5174/5175)
- AsyncConfig.java (thread pool executor for async agent tasks)
- HealthController.java
- UserProfile.java (Java Record, includes role)
- ApiResponse.java (Java Record)
- GlobalExceptionHandler.java
- FirebaseService.java (verifyIdToken, getOrCreateUser, updateUserProfile, getUserById)
- JwtService.java (jjwt 0.12.6)
- AuthController.java (Google + Email login + Register)
- UserController.java (GET /api/user/profile, PUT/PATCH /api/user/profile)
- AdminController.java (GET /api/admin/users, /api/admin/analytics, /api/admin/users/{userId})
- AdminService.java (getAllUsers, getTotalUsers, getDailyActiveUsers, getUserById)
- QuizQuestion.java (Java Record)
- QuizResult.java (Java Record)
- QuizService.java (10 questions, scoring, Firestore save)
- QuizController.java (GET /questions, POST /submit, GET /result)
- ConversationController.java (POST /start, /turn, /nudge, /end · GET /sessions, /modes)
- ConversationService.java (live sessions, per-session lock, Firestore save, streak/minutes)
- TutorChatService.java (SpeakUp tutor persona, Groq via Spring AI ChatModel, TTS-safe text)
- NotificationController.java & NotificationService.java (FCM token management & reminders)
- TtsController.java & ElevenLabsTtsService.java (streaming natural voice speech)
- SessionInsightService.java (multi-agent analysis orchestration)
- agents/FluencyTrackerAgent.java · agents/GrammarWatcherAgent.java · agents/VocabularyAgent.java · agents/LlmJsonSupport.java
- ConversationMessage.java · PracticeSession.java · FluencyScore.java · GrammarNote.java · VocabularyWord.java · PracticeMode.java
- ConversationTurnRequest.java · ConversationTurnResponse.java · SessionRequest.java · StartSessionRequest.java · PracticeModeResponse.java · SpeakRequest.java · DeviceTokenRequest.java
- ConversationException.java (404 / 409 / 429 / 502, mapped in GlobalExceptionHandler)

### Frontend Files
- firebase.js
- public/firebase-messaging-sw.js (service worker for web push notifications)
- store/authSlice.js (onboardingCompleted field added)
- store/voiceSlice.js (last saved session + recent-session list, reset on auth/logout)
- store/index.js
- api/axiosConfig.js
- api/conversationApi.js (conversation endpoints, modes, keepalive end-on-unload, parseInstant)
- api/notificationsApi.js (device token registration and test notifications)
- config/voice.js (all voice timing constants, VOICE_STATE, browser feature detection)
- hooks/useSpeechRecognition.js · hooks/useSpeechSynthesis.js · hooks/useVoiceConversation.js · hooks/useTutorVoice.js · hooks/usePushNotifications.js
- components/voice/VoiceConversation.jsx (pre-flight → mode select → live → summary)
- components/voice/VoiceStatus.jsx · VoiceControls.jsx · ConversationTranscript.jsx · ModePicker.jsx
- components/voice/SessionSummary.jsx · RecentSessions.jsx · formatters.js
- components/Navbar.jsx (shared sticky nav, avatar dropdown, mobile menu)
- pages/Login.jsx (centred card, segmented tabs, white primary + outlined Google button)
- pages/Register.jsx
- pages/ProfileSetup.jsx (4-step wizard: language, level, goal, daily minutes)
- pages/Quiz.jsx (plain progress bar, flat keycap options, A–D / 1–4 shortcuts, result screen)
- pages/Home.jsx (greeting, four real stat cards, quick actions — "Start Practicing" routes to /practice)
- pages/Practice.jsx (voice conversation + mode picker + recent sessions)
- pages/Settings.jsx (240px sidebar, four sections, clean form controls)
- pages/AdminDashboard.jsx (four analytics stat cards, search + filters, users table)
- hooks/useQuiz.js
- App.jsx (routes: /, /profile-setup, /quiz, /home, /practice, /settings, /admin + Toaster)
- index.css (Tailwind v4 @import "tailwindcss" + @theme design tokens, no keyframes)
- main.jsx
- DESIGN_SYSTEM.md (**the UI source of truth — read before any design work**)

## Next Task
Module 6 — Production Deployment & Polish
- Set up Railway environment variables for backend (including `ELEVENLABS_API_KEY`)
- Configure Vercel production build for frontend
- Add privacy notice for speech recognition in browser settings

Open items carried over from Module 2:
- Voice practice needs Chrome or Edge. Firefox exposes no `SpeechRecognition`, and the page
  says so instead of offering a dead button
- Audio is not recorded, only the transcript (see Module 2 above for why)
- `speech_recognition` in Chrome sends audio to Google's servers — that is how the Web
  Speech API works and it should be stated in a privacy note before launch

## How to Run
### Backend
cd ~/Projects/speakup-english/speakup-backend
export $(cat .env | xargs)
mvn spring-boot:run

### Frontend
cd ~/Projects/speakup-english/speakup-frontend
npm run dev

## Important Notes
- **UI work: read `speakup-frontend/DESIGN_SYSTEM.md` first — it is the single source of
  truth. Root `CLAUDE.md` (Claude Code) and `AGENTS.md` (other agents) enforce this.**
- **The Groq model id is a moving target.** `spring.ai.openai.chat.options.model` is
  `openai/gpt-oss-120b`. It replaced `llama-3.3-70b-versatile`, which Groq decommissioned for
  free and developer tier keys on 2026-08-16 (now enterprise-only) — every conversation
  request failed with a 502 "The AI tutor is unreachable right now" until the id was changed.
  Check https://console.groq.com/docs/deprecations before blaming the code. gpt-oss returns
  reasoning in a separate `reasoning` field, never in `content`, but it spends part of the
  completion budget on it, hence `max-completion-tokens: 1024` and `reasoning-effort: low`
- **Groq OpenAI base-url in Spring AI 1.0.0 is `https://api.groq.com/openai` (without trailing `/v1`).**
  Spring AI's `OpenAiApi` appends `/v1/chat/completions` internally, so having `/v1` in the base-url
  produces `/openai/v1/v1/chat/completions` and returns an HTTP 404 unknown URL error.
- Java 21 — `<java.version>21</java.version>` in pom.xml, and `java -version` reports
  Temurin 21.0.12.1. (Earlier notes here claimed Java 25; that was wrong.)
- Tailwind v4 — use @import "tailwindcss" in index.css (NO tailwind config file)
- Tailwind v4 silently drops utilities whose `@theme` token is missing — verify against
  `dist/assets/*.css` after any token change
- Plain JavaScript only (NO TypeScript)
- Frontend libraries installed: react-hot-toast only. framer-motion, clsx and
  tailwind-merge were removed with the ProfileSetup redesign — do not reinstall them
- Frontend needs `VITE_FIREBASE_*` in `.env` or `getAuth()` throws and the page is blank
- gcloud auth application-default login already done
- No firebase-service-account.json — using ADC
- start-backend.sh exists in project root
