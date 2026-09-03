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

/* ── Shared control styles ── */

const labelClass = 'mb-1.5 block text-xs text-muted'

const inputClass =
  'w-full rounded-control border border-line bg-canvas px-3 py-2.5 text-sm text-fg placeholder:text-faint transition-colors focus:border-line-strong focus:outline-none'

const primaryButtonClass =
  'flex w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50'

const outlineButtonClass =
  'flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-control border border-line bg-transparent px-4 py-2.5 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50'

const errorTextClass = 'mt-1.5 text-xs text-danger'

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

function EyeSlashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function PasswordToggle({ visible, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted transition-colors hover:text-fg"
    >
      {visible ? <EyeSlashIcon /> : <EyeIcon />}
    </button>
  )
}

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('signin')
  const [signInEmail, setSignInEmail] = useState('')
  const [signInPassword, setSignInPassword] = useState('')
  const [showSignInPw, setShowSignInPw] = useState(false)
  const [signUpName, setSignUpName] = useState('')
  const [signUpEmail, setSignUpEmail] = useState('')
  const [signUpPassword, setSignUpPassword] = useState('')
  const [signUpConfirm, setSignUpConfirm] = useState('')
  const [showSignUpPw, setShowSignUpPw] = useState(false)
  const [showSignUpConfirm, setShowSignUpConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [banner, setBanner] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

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

  const handleGoogle = async () => {
    try {
      setIsLoading(true)
      setBanner('')
      setFieldErrors({})
      dispatch(setLoading(true))
      const result = await signInWithPopup(auth, googleProvider)
      await authenticateWithBackend(result.user)
    } catch (error) {
      dispatch(setLoading(false))
      dispatch(setError(error.message))
      setBanner(firebaseErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!signInEmail.trim()) errors.signInEmail = 'Email is required.'
    else if (!validateEmail(signInEmail)) errors.signInEmail = 'Enter a valid email.'
    if (!signInPassword) errors.signInPassword = 'Password is required.'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    try {
      setIsLoading(true)
      setBanner('')
      setFieldErrors({})
      dispatch(setLoading(true))
      const result = await signInWithEmailAndPassword(auth, signInEmail.trim(), signInPassword)
      await authenticateWithBackend(result.user)
    } catch (error) {
      dispatch(setLoading(false))
      dispatch(setError(error.message))
      setBanner(firebaseErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

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
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    try {
      setIsLoading(true)
      setBanner('')
      setFieldErrors({})
      dispatch(setLoading(true))
      const cred = await createUserWithEmailAndPassword(auth, signUpEmail.trim(), signUpPassword)
      await updateProfile(cred.user, { displayName: signUpName.trim() })
      const result = await signInWithEmailAndPassword(auth, signUpEmail.trim(), signUpPassword)
      await authenticateWithBackend(result.user)
    } catch (error) {
      dispatch(setLoading(false))
      dispatch(setError(error.message))
      setBanner(error.response?.data?.message || firebaseErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

  const switchTab = (tab) => {
    setActiveTab(tab)
    setBanner('')
    setFieldErrors({})
  }

  const tabClass = (tab) =>
    `flex-1 cursor-pointer rounded-control py-2 text-sm transition-colors ${
      activeTab === tab ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
    }`

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">SpeakUp</h1>
          <p className="mt-1.5 text-sm text-muted">Practice English speaking with AI</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-control border border-line bg-canvas p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signin'}
              onClick={() => switchTab('signin')}
              className={tabClass('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'signup'}
              onClick={() => switchTab('signup')}
              className={tabClass('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Error banner */}
          {banner && (
            <div className="mb-5 rounded-control border border-danger/30 bg-danger/10 px-3 py-2.5" role="alert">
              <p className="text-sm text-danger">{banner}</p>
            </div>
          )}

          {/* Sign In */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} noValidate className="space-y-4">
              <div>
                <label htmlFor="signin-email" className={labelClass}>Email</label>
                <input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={signInEmail}
                  onChange={(e) => { setSignInEmail(e.target.value); setFieldErrors(p => ({ ...p, signInEmail: '' })) }}
                  className={inputClass}
                />
                {fieldErrors.signInEmail && <p className={errorTextClass}>{fieldErrors.signInEmail}</p>}
              </div>

              <div>
                <label htmlFor="signin-password" className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showSignInPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => { setSignInPassword(e.target.value); setFieldErrors(p => ({ ...p, signInPassword: '' })) }}
                    className={`${inputClass} pr-11`}
                  />
                  <PasswordToggle
                    visible={showSignInPw}
                    onToggle={() => setShowSignInPw(v => !v)}
                    label={showSignInPw ? 'Hide password' : 'Show password'}
                  />
                </div>
                {fieldErrors.signInPassword && <p className={errorTextClass}>{fieldErrors.signInPassword}</p>}
              </div>

              <button type="submit" id="signin-submit" disabled={isLoading} className={primaryButtonClass}>
                {isLoading ? <><Spinner /><span>Signing in…</span></> : 'Sign In'}
              </button>
            </form>
          )}

          {/* Sign Up */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} noValidate className="space-y-4">
              <div>
                <label htmlFor="signup-name" className={labelClass}>Full name</label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={signUpName}
                  onChange={(e) => { setSignUpName(e.target.value); setFieldErrors(p => ({ ...p, signUpName: '' })) }}
                  className={inputClass}
                />
                {fieldErrors.signUpName && <p className={errorTextClass}>{fieldErrors.signUpName}</p>}
              </div>

              <div>
                <label htmlFor="signup-email" className={labelClass}>Email</label>
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={(e) => { setSignUpEmail(e.target.value); setFieldErrors(p => ({ ...p, signUpEmail: '' })) }}
                  className={inputClass}
                />
                {fieldErrors.signUpEmail && <p className={errorTextClass}>{fieldErrors.signUpEmail}</p>}
              </div>

              <div>
                <label htmlFor="signup-password" className={labelClass}>Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showSignUpPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    value={signUpPassword}
                    onChange={(e) => { setSignUpPassword(e.target.value); setFieldErrors(p => ({ ...p, signUpPassword: '' })) }}
                    className={`${inputClass} pr-11`}
                  />
                  <PasswordToggle
                    visible={showSignUpPw}
                    onToggle={() => setShowSignUpPw(v => !v)}
                    label={showSignUpPw ? 'Hide password' : 'Show password'}
                  />
                </div>
                {fieldErrors.signUpPassword && <p className={errorTextClass}>{fieldErrors.signUpPassword}</p>}
              </div>

              <div>
                <label htmlFor="signup-confirm" className={labelClass}>Confirm password</label>
                <div className="relative">
                  <input
                    id="signup-confirm"
                    type={showSignUpConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={signUpConfirm}
                    onChange={(e) => { setSignUpConfirm(e.target.value); setFieldErrors(p => ({ ...p, signUpConfirm: '' })) }}
                    className={`${inputClass} pr-11`}
                  />
                  <PasswordToggle
                    visible={showSignUpConfirm}
                    onToggle={() => setShowSignUpConfirm(v => !v)}
                    label={showSignUpConfirm ? 'Hide password' : 'Show password'}
                  />
                </div>
                {fieldErrors.signUpConfirm && <p className={errorTextClass}>{fieldErrors.signUpConfirm}</p>}
              </div>

              <button type="submit" id="signup-submit" disabled={isLoading} className={primaryButtonClass}>
                {isLoading ? <><Spinner /><span>Creating account…</span></> : 'Create Account'}
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-muted">or</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          {/* Google */}
          <button type="button" onClick={handleGoogle} disabled={isLoading} className={outlineButtonClass}>
            {isLoading ? <><Spinner /><span>Connecting…</span></> : (
              <>
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          By continuing, you agree to SpeakUp&apos;s Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}

