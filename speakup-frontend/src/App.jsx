import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './pages/Login'
import Home from './pages/Home'
import ProfileSetup from './pages/ProfileSetup'
import Quiz from './pages/Quiz'

/**
 * Check whether the user still needs to complete profile setup.
 * Returns true if nativeLanguage is null, undefined, or empty string.
 */
function needsProfileSetup(user) {
  return !user || !user.nativeLanguage
}

/**
 * Check whether the user still needs to complete the onboarding quiz.
 * Returns true if onboardingCompleted is falsy on the user object.
 */
function needsOnboardingQuiz(user) {
  return !user || !user.onboardingCompleted
}

/**
 * ProtectedRoute — redirects to / if not authenticated.
 * If authenticated but profile incomplete → redirect to /profile-setup.
 * If profile complete but quiz not done → redirect to /quiz.
 */
function ProtectedRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) {
    return <Navigate to="/" replace />
  }
  if (needsProfileSetup(user)) {
    return <Navigate to="/profile-setup" replace />
  }
  if (needsOnboardingQuiz(user)) {
    return <Navigate to="/quiz" replace />
  }
  return children
}

/**
 * ProfileRoute — accessible only when authenticated AND profile is incomplete.
 * If profile is already complete → redirect to /quiz or /home.
 */
function ProfileRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) {
    return <Navigate to="/" replace />
  }
  if (!needsProfileSetup(user)) {
    // Profile done — check quiz next
    if (needsOnboardingQuiz(user)) {
      return <Navigate to="/quiz" replace />
    }
    return <Navigate to="/home" replace />
  }
  return children
}

/**
 * QuizRoute — accessible only when authenticated, profile done, but quiz not done.
 * If quiz already completed → redirect to /home.
 */
function QuizRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) {
    return <Navigate to="/" replace />
  }
  if (needsProfileSetup(user)) {
    return <Navigate to="/profile-setup" replace />
  }
  // If onboarding is already completed, go to home
  if (user && user.onboardingCompleted) {
    return <Navigate to="/home" replace />
  }
  return children
}

/**
 * PublicRoute — redirect authenticated users away from login.
 * If profile incomplete → send to profile-setup.
 * If quiz not done → send to quiz.
 * Otherwise → home.
 */
function PublicRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (token) {
    if (needsProfileSetup(user)) {
      return <Navigate to="/profile-setup" replace />
    }
    if (needsOnboardingQuiz(user)) {
      return <Navigate to="/quiz" replace />
    }
    return <Navigate to="/home" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/profile-setup"
          element={
            <ProfileRoute>
              <ProfileSetup />
            </ProfileRoute>
          }
        />
        <Route
          path="/quiz"
          element={
            <QuizRoute>
              <Quiz />
            </QuizRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App