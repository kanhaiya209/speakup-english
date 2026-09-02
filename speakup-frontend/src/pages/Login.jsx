import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import api from '../api/axiosConfig'
import { setUser, setToken, setLoading, setError } from '../store/authSlice'

/* ────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────── */

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function firebaseErrorMessage(code) {
  const map = {
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/invalid-credential': 'Invalid email or password. Please try again.',
  }
  return map[code] || 'Something went wrong. Please try again.'
}

/* ────────────────────────────────────────────
   Eye Icons (show / hide password)
   ──────────────────────────────────────────── */

function EyeIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Spinner
   ──────────────────────────────────────────── */

function Spinner() {
  return (
    <svg
      className="animate-spin w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Login Page
   ──────────────────────────────────────────── */

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  // Tab state
  const [activeTab, setActiveTab] = useState('signin')

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [showSignInPw, setShowSignInPw] = useState(false)

  // Sign Up fields
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirm, setSignUpConfirm] = useState('')
  const [showSignUpPw, setShowSignUpPw] = useState(false)
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [banner, setBanner] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  /* ── Shared: send backend token, save to redux ── */

  const authenticateWithBackend = async (firebaseUser) => {
    const idToken = await firebaseUser.getIdToken()
    const response = await api.post('/api/auth/google', { idToken })

    if (response.data.success) {
      const { token, user } = response.data.data
      dispatch(setToken(token))
      dispatch(setUser(user))
      dispatch(setLoading(false))
      navigate('/home')
    } else {
      throw new Error(response.data.message || 'Login failed')
    }
  }

  /* ── Google OAuth ── */

  const handleGoogle = async () => {
    try {
      setIsLoading(true)
      setBanner('')
      setFieldErrors({})
      dispatch(setLoading(true))

      const result = await signInWithPopup(auth, googleProvider)
      await authenticateWithBackend(result.user)
    } catch (error) {
      console.error('Google login error:', error)
      dispatch(setLoading(false))
      dispatch(setError(error.message))
      setBanner(firebaseErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Email / Password Sign In ── */

  const handleSignIn = async (e) => {
    e.preventDefault()
    const errors = {}

    if (!signInEmail.trim()) errors.signInEmail = 'Email is required.'
    else if (!validateEmail(signInEmail)) errors.signInEmail = 'Enter a valid email.'

    if (!signInPassword) errors.signInPassword = 'Password is required.'

    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    try {
      setIsLoading(true)
      setBanner('')
      setFieldErrors({})
      dispatch(setLoading(true))

      const result = await signInWithEmailAndPassword(auth, signInEmail.trim(), signInPassword)
      await authenticateWithBackend(result.user)
    } catch (error) {
      console.error('Sign-in error:', error)
      dispatch(setLoading(false))
      dispatch(setError(error.message))
      setBanner(firebaseErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Email / Password Sign Up ── */

  const handleSignUp = async (e) => {
    e.preventDefault()
    const errors = {}

    if (!signUpName.trim()) errors.signUpName = 'Name is required.'
    if (!signUpEmail.trim()) errors.signUpEmail = 'Email is required.'
    else if (!validateEmail(signUpEmail)) errors.signUpEmail = 'Enter a valid email.'
    if (!signUpPassword) errors.signUpPassword = 'Password is required.'
    else if (signUpPassword.length < 6) errors.signUpPassword = 'At least 6 characters.'
    if (!signUpConfirm) errors.signUpConfirm = 'Confirm your password.'
    else if (signUpPassword !== signUpConfirm) errors.signUpConfirm = 'Passwords do not match.'

    if (Object.keys(errors).length) {
      setFieldErrors(errors)
      return
    }

    try {
      setIsLoading(true)
      setBanner('')
      setFieldErrors({})
      dispatch(setLoading(true))

      // 1. Create Firebase user
      const cred = await createUserWithEmailAndPassword(auth, signUpEmail.trim(), signUpPassword)

      // 2. Set display name on Firebase profile
      await updateProfile(cred.user, { displayName: signUpName.trim() })

      // 3. Now sign in via Firebase to get a fresh token, then call backend auth
      const result = await signInWithEmailAndPassword(auth, signUpEmail.trim(), signUpPassword)
      await authenticateWithBackend(result.user)
    } catch (error) {
      console.error('Sign-up error:', error)
      dispatch(setLoading(false))
      dispatch(setError(error.message))
      if (error.response) {
        setBanner(error.response.data?.message || 'Registration failed. Please try again.')
      } else {
        setBanner(firebaseErrorMessage(error.code))
      }
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Switch tab helper ── */

  const switchTab = (tab) => {
    setActiveTab(tab)
    setBanner('')
    setFieldErrors({})
  }

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* ── Ambient background effects ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* ── Floating particles ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-indigo-400/30 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* ────────────────── Card ────────────────── */}
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20">

          {/* ── Logo & Branding ── */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-1 text-pretty">
              Speak<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Up</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium tracking-wide">
              Practice English with AI
            </p>
          </div>

          {/* ── Tab Switcher ── */}
          <div className="flex rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 mb-6" role="tablist">
            <button
              role="tab"
              aria-selected={activeTab === 'signin'}
              id="tab-signin"
              aria-controls="panel-signin"
              onClick={() => switchTab('signin')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white shadow-sm shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'signup'}
              id="tab-signup"
              aria-controls="panel-signup"
              onClick={() => switchTab('signup')}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 text-white shadow-sm shadow-indigo-500/10'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* ── Error Banner ── */}
          {banner && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
              role="alert"
              aria-live="polite"
            >
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-red-300 text-sm leading-relaxed">{banner}</p>
            </div>
          )}

          {/* ═══════════ SIGN IN PANEL ═══════════ */}
          {activeTab === 'signin' && (
            <form
              id="panel-signin"
              role="tabpanel"
              aria-labelledby="tab-signin"
              onSubmit={handleSignIn}
              noValidate
              className="space-y-4"
            >
              {/* Email */}
              <div>
                <label htmlFor="signin-email" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email
                </label>
                <input
                  id="signin-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => { setSignInEmail(e.target.value); setFieldErrors((p) => ({ ...p, signInEmail: '' })) }}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-slate-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40"
                />
                {fieldErrors.signInEmail && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.signInEmail}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signin-password" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showSignInPw ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => { setSignInPassword(e.target.value); setFieldErrors((p) => ({ ...p, signInPassword: '' })) }}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-slate-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40"
                  />
                  <button
                    type="button"
                    aria-label={showSignInPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSignInPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors duration-200 cursor-pointer"
                  >
                    {showSignInPw ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.signInPassword && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.signInPassword}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="signin-submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg cursor-pointer"
              >
                {isLoading ? <><Spinner /><span>Signing in…</span></> : 'Sign In'}
              </button>
            </form>
          )}

          {/* ═══════════ SIGN UP PANEL ═══════════ */}
          {activeTab === 'signup' && (
            <form
              id="panel-signup"
              role="tabpanel"
              aria-labelledby="tab-signup"
              onSubmit={handleSignUp}
              noValidate
              className="space-y-4"
            >
              {/* Name */}
              <div>
                <label htmlFor="signup-name" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Rahul Sharma"
                  value={signUpName}
                  onChange={(e) => { setSignUpName(e.target.value); setFieldErrors((p) => ({ ...p, signUpName: '' })) }}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-slate-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40"
                />
                {fieldErrors.signUpName && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.signUpName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => { setSignUpEmail(e.target.value); setFieldErrors((p) => ({ ...p, signUpEmail: '' })) }}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-slate-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40"
                />
                {fieldErrors.signUpEmail && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.signUpEmail}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showSignUpPw ? 'text' : 'password'}
                    name="new-password"
                    autoComplete="new-password"
                    placeholder="Min. 6 characters…"
                    value={signUpPassword}
                    onChange={(e) => { setSignUpPassword(e.target.value); setFieldErrors((p) => ({ ...p, signUpPassword: '' })) }}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-slate-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40"
                  />
                  <button
                    type="button"
                    aria-label={showSignUpPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSignUpPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors duration-200 cursor-pointer"
                  >
                    {showSignUpPw ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.signUpPassword && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.signUpPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="signup-confirm" className="block text-xs font-medium text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="signup-confirm"
                    type={showSignUpConfirm ? 'text' : 'password'}
                    name="confirm-password"
                    autoComplete="new-password"
                    placeholder="Re-enter password…"
                    value={signUpConfirm}
                    onChange={(e) => { setSignUpConfirm(e.target.value); setFieldErrors((p) => ({ ...p, signUpConfirm: '' })) }}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-slate-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40"
                  />
                  <button
                    type="button"
                    aria-label={showSignUpConfirm ? 'Hide password' : 'Show password'}
                    onClick={() => setShowSignUpConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors duration-200 cursor-pointer"
                  >
                    {showSignUpConfirm ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
                </div>
                {fieldErrors.signUpConfirm && (
                  <p className="mt-1.5 text-xs text-red-400">{fieldErrors.signUpConfirm}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="signup-submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg cursor-pointer"
              >
                {isLoading ? <><Spinner /><span>Creating account…</span></> : 'Create Account'}
              </button>
            </form>
          )}

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-xs text-slate-500 font-medium">or</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* ── Google Sign In ── */}
          <button
            id="google-sign-in-button"
            type="button"
            onClick={handleGoogle}
            disabled={isLoading}
            className="w-full group relative flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-white text-slate-800 font-semibold text-sm shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg cursor-pointer"
          >
            {isLoading ? (
              <>
                <Spinner />
                <span>Connecting…</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* ── Footer ── */}
          <p className="text-center text-xs text-slate-500 leading-relaxed mt-6">
            By continuing, you agree to SpeakUp's{' '}
            <span className="text-slate-400 hover:text-indigo-400 cursor-pointer transition-colors duration-200">Terms of Service</span>
            {' '}and{' '}
            <span className="text-slate-400 hover:text-indigo-400 cursor-pointer transition-colors duration-200">Privacy Policy</span>
          </p>
        </div>

        {/* ── Bottom badge ── */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Built for Indian English Learners</span>
          </div>
        </div>
      </div>

      {/* ── Custom keyframe ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
