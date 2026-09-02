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

## Completed Tasks
### Backend
- pom.xml with all dependencies
- application.yml configured
- FirebaseConfig.java (uses GoogleCredentials.getApplicationDefault())
- SecurityConfig.java (CORS: 5173, 5174, 5175)
- HealthController.java (GET /api/health)
- UserProfile.java (Java Record)
- ApiResponse.java (Java Record generic wrapper)
- GlobalExceptionHandler.java
- FirebaseService.java (verifyIdToken + getOrCreateUser)
- JwtService.java (jjwt 0.12.6, 7-day expiry)
- AuthController.java (POST /api/auth/google)

### Frontend
- firebase.js
- store/authSlice.js (Redux, localStorage persistence)
- store/index.js
- api/axiosConfig.js (Bearer token interceptor)
- pages/Login.jsx (Google OAuth)
- pages/Home.jsx (shows user name from Redux)
- App.jsx (protected + public routes)
- main.jsx (Redux Provider)

## Completed Milestones
- Module 1 Task 1: Google OAuth login ✅ WORKING

## Next Tasks (Module 1)
- Task 2: Email and password login
- Task 3: Profile setup (name, native language, English level, goals)
- Task 4: Onboarding quiz
- Task 5: Role management (Learner, Admin)
- Task 7: Account settings

## How to Run
### Backend
cd ~/Projects/speakup-english/speakup-backend
export $(cat .env | xargs)
mvn spring-boot:run

### Frontend
cd ~/Projects/speakup-english/speakup-frontend
npm run dev

## Important Notes
- Java 25 is installed (not 21, but works fine)
- Tailwind v4 — use @import "tailwindcss" in index.css (no config file)
- Frontend .env needs VITE_ prefix for all variables
- gcloud auth application-default login already done
- No firebase-service-account.json — using ADC instead
