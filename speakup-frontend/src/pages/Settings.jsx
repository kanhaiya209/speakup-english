import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axiosConfig'
import { setUser, logout } from '../store/authSlice'

/* ────────────────────────────────────────────
   Option Data
   ──────────────────────────────────────────── */

const LANGUAGES = [
  { value: 'Hindi', icon: '🇮🇳' },
  { value: 'Bengali', icon: '🟢' },
  { value: 'Tamil', icon: '🔴' },
  { value: 'Telugu', icon: '🟡' },
  { value: 'Marathi', icon: '🟠' },
  { value: 'Gujarati', icon: '🟤' },
  { value: 'Kannada', icon: '🟣' },
  { value: 'Punjabi', icon: '🔵' },
  { value: 'Malayalam', icon: '🟢' },
  { value: 'Other', icon: '🌍' },
]

const LEVELS = [
  { value: 'Beginner', icon: '🌱', desc: 'I know very basic words' },
  { value: 'Elementary', icon: '📗', desc: 'I can speak simple sentences' },
  { value: 'Intermediate', icon: '📘', desc: 'I can hold basic conversations' },
  { value: 'Upper Intermediate', icon: '📙', desc: 'I speak well but make mistakes' },
  { value: 'Advanced', icon: '🏆', desc: 'I speak fluently with minor errors' },
]

const GOALS = [
  { value: 'Job Interviews', icon: '💼' },
  { value: 'Business Communication', icon: '📊' },
  { value: 'Daily Conversation', icon: '💬' },
  { value: 'Travel & Tourism', icon: '✈️' },
  { value: 'Academic English', icon: '🎓' },
  { value: 'Public Speaking', icon: '🎤' },
]

const DAILY_GOALS = [
  { value: 10, label: '10 min', icon: '🔥', desc: 'Quick session' },
  { value: 15, label: '15 min', icon: '💪', desc: 'Solid habit' },
  { value: 20, label: '20 min', icon: '🚀', desc: 'Power learner' },
  { value: 30, label: '30 min', icon: '🏅', desc: 'All in' },
]

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
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Settings Page
   ──────────────────────────────────────────── */

export default function Settings() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  // Form fields — pre-filled from Redux store
  const [name, setName] = useState('')
  const [nativeLanguage, setNativeLanguage] = useState('')
  const [englishLevel, setEnglishLevel] = useState('')
  const [learningGoal, setLearningGoal] = useState('')
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(15)
  const [isSaving, setIsSaving] = useState(false)

  // Pre-fill from Redux user
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setNativeLanguage(user.nativeLanguage || '')
      setEnglishLevel(user.englishLevel || '')
      setLearningGoal(user.learningGoal || '')
      setDailyGoalMinutes(user.dailyGoalMinutes || 15)
    }
  }, [user])

  /* ── Save profile ── */

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    try {
      setIsSaving(true)
      const response = await api.put('/api/user/profile', {
        name: name.trim(),
        nativeLanguage,
        englishLevel,
        learningGoal,
        dailyGoalMinutes,
      })

      if (response.data.success) {
        // Update Redux store with the returned user data
        const updatedUser = { ...user, ...response.data.data }
        dispatch(setUser(updatedUser))
        toast.success('Settings saved successfully!')
      } else {
        throw new Error(response.data.message || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Settings save error:', error)
      toast.error(error.response?.data?.message || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  /* ── Logout ── */

  const handleLogout = () => {
    dispatch(logout())
    navigate('/', { replace: true })
    toast.success('Logged out successfully')
  }

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
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

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200 cursor-pointer"
              aria-label="Back to home"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-slate-400 text-sm">Manage your account & preferences</p>
            </div>
          </div>
        </div>

        {/* ═══════════ PROFILE INFO ═══════════ */}
        <section className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Profile Information</h2>
              <p className="text-slate-500 text-xs">Update your personal details</p>
            </div>
          </div>

          {/* Name */}
          <div className="mb-5">
            <label htmlFor="settings-name" className="block text-xs font-medium text-slate-400 mb-1.5">
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder-slate-500 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40"
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Email
            </label>
            <div className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-500 text-sm">
              {user?.email || '—'}
              <span className="ml-2 text-xs text-slate-600">(cannot be changed)</span>
            </div>
          </div>

          {/* Native Language */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Native Language
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setNativeLanguage(lang.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                    nativeLanguage === lang.value
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-sm shadow-indigo-500/10'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:border-white/[0.10]'
                  }`}
                >
                  <span>{lang.icon}</span>
                  <span>{lang.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* English Level */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-400 mb-2">
              English Level
            </label>
            <div className="space-y-2">
              {LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setEnglishLevel(level.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    englishLevel === level.value
                      ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]'
                  }`}
                >
                  <span className="text-xl">{level.icon}</span>
                  <div>
                    <span className={`block text-sm font-semibold ${englishLevel === level.value ? 'text-white' : 'text-slate-200'}`}>
                      {level.value}
                    </span>
                    <span className={`block text-xs ${englishLevel === level.value ? 'text-slate-300' : 'text-slate-500'}`}>
                      {level.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Learning Goal */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Learning Goal
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setLearningGoal(goal.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                    learningGoal === goal.value
                      ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-sm shadow-indigo-500/10'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-400 hover:bg-white/[0.06] hover:border-white/[0.10]'
                  }`}
                >
                  <span>{goal.icon}</span>
                  <span className="text-xs sm:text-sm">{goal.value}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ DAILY GOAL ═══════════ */}
        <section className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Daily Practice Goal</h2>
              <p className="text-slate-500 text-xs">How much time do you want to practice daily?</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DAILY_GOALS.map((goal) => {
              const isSelected = dailyGoalMinutes === goal.value
              return (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setDailyGoalMinutes(goal.value)}
                  className={`relative flex flex-col items-center gap-2 px-4 py-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/10'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                  <span className="text-2xl">{goal.icon}</span>
                  <span className={`text-lg font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                    {goal.label}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-amber-300/80' : 'text-slate-500'}`}>
                    {goal.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ═══════════ SAVE BUTTON ═══════════ */}
        <button
          type="button"
          id="settings-save"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg cursor-pointer mb-6"
        >
          {isSaving ? <><Spinner /><span>Saving…</span></> : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              <span>Save Changes</span>
            </>
          )}
        </button>

        {/* ═══════════ DANGER ZONE ═══════════ */}
        <section className="backdrop-blur-xl bg-red-500/[0.03] border border-red-500/[0.12] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-300">Danger Zone</h2>
              <p className="text-red-400/60 text-xs">Irreversible actions</p>
            </div>
          </div>

          <button
            type="button"
            id="settings-logout"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            <span>Logout</span>
          </button>
        </section>

        {/* ── Bottom spacer ── */}
        <div className="h-8" />
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
