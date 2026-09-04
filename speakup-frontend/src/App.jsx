import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Home from './pages/Home'
import Practice from './pages/Practice'
import ProfileSetup from './pages/ProfileSetup'
import Quiz from './pages/Quiz'
import Settings from './pages/Settings'
import AdminDashboard from './pages/AdminDashboard'

function needsProfileSetup(user) {
  return !user || !user.nativeLanguage
}

function needsOnboardingQuiz(user) {
  return !user || !user.englishLevel
}

function ProtectedRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) return <Navigate to="/" replace />
  if (needsProfileSetup(user)) return <Navigate to="/profile-setup" replace />
  if (needsOnboardingQuiz(user)) return <Navigate to="/quiz" replace />
  return children
}

function AdminRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) return <Navigate to="/" replace />
  if (needsProfileSetup(user)) return <Navigate to="/profile-setup" replace />
  if (needsOnboardingQuiz(user)) return <Navigate to="/quiz" replace />
  if (!user || user.role !== 'admin') return <Navigate to="/home" replace />
  return children
}

function ProfileRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) return <Navigate to="/" replace />
  if (!needsProfileSetup(user)) {
    if (needsOnboardingQuiz(user)) return <Navigate to="/quiz" replace />
    return <Navigate to="/home" replace />
  }
  return children
}

function QuizRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (!token) return <Navigate to="/" replace />
  if (needsProfileSetup(user)) return <Navigate to="/profile-setup" replace />
  if (user && user.englishLevel) return <Navigate to="/home" replace />
  return children
}

function PublicRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth)
  if (token) {
    if (needsProfileSetup(user)) return <Navigate to="/profile-setup" replace />
    if (needsOnboardingQuiz(user)) return <Navigate to="/quiz" replace />
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
            background: '#111111',
            color: '#ffffff',
            border: '1px solid #222222',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#000000' } },
          error: { iconTheme: { primary: '#ff4444', secondary: '#000000' } },
        }}
      />
      <Routes>
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/profile-setup" element={<ProfileRoute><ProfileSetup /></ProfileRoute>} />
        <Route path="/quiz" element={<QuizRoute><Quiz /></QuizRoute>} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/practice" element={<ProtectedRoute><Practice /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App