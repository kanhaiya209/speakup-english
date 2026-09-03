# SpeakUp — Project Context for Claude

## Project
AI-powered English speaking practice platform for Indian learners.
GitHub: https://github.com/kanhaiya209/speakup-english

## Tech Stack
- Backend: Spring Boot 3.4.3, Java 25, Maven
- AI: Spring AI 1.0.0 → Groq (primary) → Gemini → OpenRouter
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

### UI/UX Redesign (Raycast Aesthetic) ✅
- Design vibe: Raycast style — dark (`bg-neutral-950`), sharp, glowing, premium
- `shimmer-button.jsx`: Fixed stacking context, dual-layer neon aura (`blur-md opacity-80`), continuous 360° border beam, container queries
- `background-beams.jsx`: Aceternity UI radial beams and ambient glows
- `meteors.jsx`: Meteor rain effect on Home page
- `Login.jsx`: Background beams, ShimmerButton on Sign In and Sign Up tabs
- `Home.jsx`: Meteors animation, streak, minutes, and level summary cards
- `ProfileSetup.jsx`: 4-step wizard with `framer-motion` (`AnimatePresence`), glowing segmented progress tracker, localized script tags, ShimmerButton
- `Quiz.jsx`: Immersive full screen, keycap answer cards (`[A]`, `[B]`, `[C]`, `[D]`), keyboard shortcuts (`A`/`B`/`C`/`D` or `1`/`2`/`3`/`4`), glowing progress HUD, multi-phase AI analysis screen, celebration result screen
- `Settings.jsx`: Two-column sidebar layout, user profile card, tabbed navigation (`Profile`, `Preferences`, `Commitment`, `Account`), clean dark form inputs, sticky ShimmerButton save bar
- `AdminDashboard.jsx`: Executive command center with live status, 4 telemetry stat cards (Total Users, DAU, Assessed Fluency, Streaks), real-time search & filter pills, users directory table

### Backend Files
- pom.xml
- application.yml
- FirebaseConfig.java (ADC credentials)
- SecurityConfig.java (inline JWT filter + CORS 5173/5174/5175)
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

### Frontend Files
- firebase.js
- store/authSlice.js (onboardingCompleted field added)
- store/index.js
- api/axiosConfig.js
- components/ui/background-beams.jsx (Aceternity UI ambient background beams)
- components/ui/shimmer-button.jsx (glowing animated shimmer button)
- components/ui/meteors.jsx (meteor rain animation)
- pages/Login.jsx (BackgroundBeams, ShimmerButton)
- pages/Register.jsx
- pages/ProfileSetup.jsx (4-step wizard, framer-motion, glowing cards)
- pages/Quiz.jsx (immersive full screen, keycap answer cards, keyboard shortcuts, progress HUD, result screen)
- pages/Home.jsx (Meteors effect, stats cards, level summary, navigation)
- pages/Settings.jsx (two-column sidebar layout, tabbed navigation, clean form controls)
- pages/AdminDashboard.jsx (executive stat cards, search & filter controls, users table)
- hooks/useQuiz.js
- App.jsx (routes: /, /profile-setup, /quiz, /home, /settings, /admin + Toaster)
- index.css (Tailwind v4 @import "tailwindcss", shimmer & meteor keyframes)
- main.jsx

## Next Task
Module 2 — AI Practice / Real-time Conversation

## How to Run
### Backend
cd ~/Projects/speakup-english/speakup-backend
export $(cat .env | xargs)
mvn spring-boot:run

### Frontend
cd ~/Projects/speakup-english/speakup-frontend
npm run dev

## Important Notes
- Java 25 installed (not 21, works fine)
- Tailwind v4 — use @import "tailwindcss" in index.css (NO tailwind config file)
- Plain JavaScript only (NO TypeScript)
- Frontend libraries installed: framer-motion, clsx, tailwind-merge, react-hot-toast
- gcloud auth application-default login already done
- No firebase-service-account.json — using ADC
- start-backend.sh exists in project root
