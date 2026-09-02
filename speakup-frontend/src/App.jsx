import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './pages/Login'
import Home from './pages/Home'
import ProfileSetup from './pages/ProfileSetup'

/**
 * Check whether the user still needs to complete profile setup.
 * Returns true if nativeLanguage is null, undefined, or empty string.
 */
function needsProfileSetup(user) {
  return !user || !user.nativeLanguage
}

/**
 * ProtectedRoute — redirects to / if not authenticated.
 * If authenticated but profile incomplete → redirect to /profile-setup.
 */
function ProtectedRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) {
    return <Navigate to="/" replace />
  }
  if (needsProfileSetup(user)) {
    return <Navigate to="/profile-setup" replace />
  }
  return children
}

/**
 * ProfileRoute — accessible only when authenticated AND profile is incomplete.
 * If profile is already complete → redirect to /home.
 */
function ProfileRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) {
    return <Navigate to="/" replace />
  }
  if (!needsProfileSetup(user)) {
    return <Navigate to="/home" replace />
  }
  return children
}

/**
 * PublicRoute — redirect authenticated users away from login.
 * If profile incomplete → send to profile-setup, otherwise → home.
 */
function PublicRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (token) {
    if (needsProfileSetup(user)) {
      return <Navigate to="/profile-setup" replace />
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