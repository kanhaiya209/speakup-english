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
- Frontend port: 5174

## Completed Tasks ✅

### Module 1 — User Authentication and Profile
- Task 1: Google OAuth login ✅ WORKING
- Task 2: Email and password login ✅ WORKING
- Task 3: Profile setup — name, native language, English level, goals ✅ WORKING
- Task 4: Onboarding quiz — 10 questions, level assessment ✅ WORKING
- Task 5: Role management — Learner, Admin ✅ WORKING
- Task 6: Session persistence with JWT ✅ WORKING
- Task 7: Account settings and preferences ✅ WORKING

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
- pages/Login.jsx
- pages/Register.jsx
- pages/ProfileSetup.jsx
- pages/Quiz.jsx (10 questions, animations, result screen)
- pages/Home.jsx (shows level, settings & admin nav buttons, logout)
- pages/Settings.jsx (profile edit, daily goal selector, danger zone logout)
- pages/AdminDashboard.jsx (analytics cards, users table, role badge)
- hooks/useQuiz.js
- App.jsx (routes: /, /profile-setup, /quiz, /home, /settings, /admin + Toaster)
- main.jsx

## Remaining Module 1 Tasks ❌
- All Module 1 tasks completed! 🎉

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
- Tailwind v4 — use @import "tailwindcss" in index.css
- gcloud auth application-default login already done
- No firebase-service-account.json — using ADC
- start-backend.sh exists in project root
