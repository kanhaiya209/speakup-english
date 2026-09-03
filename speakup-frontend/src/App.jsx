import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Home from './pages/Home'
import ProfileSetup from './pages/ProfileSetup'
import Quiz from './pages/Quiz'
import Settings from './pages/Settings'
import AdminDashboard from './pages/AdminDashboard'

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
 * AdminRoute — same as ProtectedRoute but also checks role === "admin".
 * Non-admin users are redirected to /home.
 */
function AdminRoute({ children }) {
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
  if (!user || user.role !== 'admin') {
    return <Navigate to="/home" replace />
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
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#e2e8f0',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
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
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App