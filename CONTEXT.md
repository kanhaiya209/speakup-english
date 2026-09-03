cat > ~/Projects/speakup-english/CONTEXT.md << 'EOF'

# SpeakUp — Project Context for Claude

## Project

AI-powered English speaking practice platform for Indian learners.
GitHub: https://github.com/kanhaiya209/speakup-english

## Tech Stack

- Backend: Spring Boot 4.0.8, Java 25, Maven
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
- Task 6: Session persistence with JWT ✅ WORKING

### Backend Files

- pom.xml with all dependencies
- application.yml configured
- FirebaseConfig.java (uses GoogleCredentials.getApplicationDefault())
- SecurityConfig.java (CORS: 5173, 5174, 5175)
- HealthController.java (GET /api/health)
- UserProfile.java (Java Record — userId, email, name, photoUrl, nativeLanguage, englishLevel, learningGoal, dailyGoalMinutes, streak, totalMinutesPracticed, createdAt)
- ApiResponse.java (Java Record generic wrapper)
- GlobalExceptionHandler.java
- FirebaseService.java (verifyIdToken + getOrCreateUser + Firestore save)
- JwtService.java (jjwt 0.12.6, 7-day expiry, HMAC-SHA256)
- AuthController.java (POST /api/auth/google + POST /api/auth/login + POST /api/auth/register)

### Frontend Files

- firebase.js (Firebase SDK init)
- store/authSlice.js (Redux, localStorage persistence)
- store/index.js (Redux store)
- api/axiosConfig.js (Bearer token interceptor + 401 redirect)
- pages/Login.jsx (Google OAuth + Email/Password login)
- pages/Register.jsx (Email/Password registration)
- pages/Profile.jsx (name, native language, English level, learning goals, daily goal)
- pages/Home.jsx (shows Welcome, username from Redux)
- App.jsx (protected + public routes)
- main.jsx (Redux Provider)

## Remaining Module 1 Tasks ❌

- Task 4: Onboarding quiz to assess current English level
- Task 5: Role management — Learner, Admin
- Task 7: Account settings and preferences

## Next Task

Task 4: Onboarding quiz

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
- Tailwind v4 — use @import "tailwindcss" in index.css (no config file)
- Frontend .env needs VITE\_ prefix for all variables
- gcloud auth application-default login already done
- No firebase-service-account.json — using ADC instead
- Spring Boot running on 3.4.3 (auto resolved by Maven)
- start-backend.sh script exists in project root for easy startup
  EOF
