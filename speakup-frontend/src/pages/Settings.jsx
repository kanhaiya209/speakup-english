import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axiosConfig'
import { setUser, logout } from '../store/authSlice'
import { BackgroundBeams } from '../components/ui/background-beams'
import { ShimmerButton } from '../components/ui/shimmer-button'

/* ────────────────────────────────────────────
   Option Data
   ──────────────────────────────────────────── */

const LANGUAGES = [
  { value: 'Hindi', icon: '🇮🇳', sub: 'हिंदी' },
  { value: 'Bengali', icon: '🟢', sub: 'বাংলা' },
  { value: 'Tamil', icon: '🔴', sub: 'தமிழ்' },
  { value: 'Telugu', icon: '🟡', sub: 'తెలుగు' },
  { value: 'Marathi', icon: '🟠', sub: 'मराठी' },
  { value: 'Gujarati', icon: '🟤', sub: 'ગુજરાતી' },
  { value: 'Kannada', icon: '🟣', sub: 'ಕನ್ನಡ' },
  { value: 'Punjabi', icon: '🔵', sub: 'ਪੰਜਾਬੀ' },
  { value: 'Malayalam', icon: '🟢', sub: 'മലയാളം' },
  { value: 'Other', icon: '🌍', sub: 'Global' },
]

const LEVELS = [
  { value: 'Beginner', icon: '🌱', badge: 'A1 - A2', desc: 'Basic vocabulary and simple sentence formation' },
  { value: 'Elementary', icon: '📗', badge: 'A2 - B1', desc: 'Everyday conversations with minor hesitation' },
  { value: 'Intermediate', icon: '📘', badge: 'B1 - B2', desc: 'Hold fluent discussions and express opinions clearly' },
  { value: 'Upper Intermediate', icon: '📙', badge: 'B2 - C1', desc: 'High confidence, polishing nuance and professional idioms' },
  { value: 'Advanced', icon: '🏆', badge: 'C1 - C2', desc: 'Near-native articulation, executive communication' },
]

const GOALS = [
  { value: 'Job Interviews', icon: '💼', desc: 'HR & Technical rounds' },
  { value: 'Business Communication', icon: '📊', desc: 'Presentations & pitches' },
  { value: 'Daily Conversation', icon: '💬', desc: 'Casual fluencies' },
  { value: 'Travel & Tourism', icon: '✈️', desc: 'International journeys' },
  { value: 'Academic English', icon: '🎓', desc: 'IELTS & universities' },
  { value: 'Public Speaking', icon: '🎤', desc: 'Stage presence & speeches' },
]

const DAILY_GOALS = [
  { value: 10, label: '10 Mins', icon: '🔥', desc: 'Quick session', badge: 'Casual' },
  { value: 15, label: '15 Mins', icon: '💪', desc: 'Solid habit', badge: 'Popular' },
  { value: 20, label: '20 Mins', icon: '🚀', desc: 'Power learner', badge: 'Intense' },
  { value: 30, label: '30 Mins', icon: '🏅', desc: 'Total immersion', badge: 'Pro' },
]

const TABS = [
  { id: 'profile', label: 'Profile Details', icon: '👤' },
  { id: 'preferences', label: 'Learning & Level', icon: '🎯' },
  { id: 'goals', label: 'Daily Commitment', icon: '⏱' },
  { id: 'account', label: 'Account & Session', icon: '🔒' },
]

/* ────────────────────────────────────────────
   Spinner
   ──────────────────────────────────────────── */

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Settings Page (Sidebar Layout)
   ──────────────────────────────────────────── */

export default function Settings() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [activeTab, setActiveTab] = useState('profile')
  const [name, setName] = useState(user?.name || '')
  const [nativeLanguage, setNativeLanguage] = useState(user?.nativeLanguage || '')
  const [englishLevel, setEnglishLevel] = useState(user?.englishLevel || '')
  const [learningGoal, setLearningGoal] = useState(user?.learningGoal || '')
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(user?.dailyGoalMinutes || 15)
  const [isSaving, setIsSaving] = useState(false)

  // Pre-fill from Redux user if it loads after mount
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      toast.error('Display Name cannot be empty')
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
        const updatedUser = { ...user, ...response.data.data }
        dispatch(setUser(updatedUser))
        toast.success('Settings updated successfully!')
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

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SU'

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* ── Background Beams ── */}
      <BackgroundBeams />

      {/* ── Ambient Radial Halos ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 right-1/4 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Header Row ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Back to home"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Account Settings</h1>
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-mono text-neutral-400">
                  Preferences
                </span>
              </div>
              <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                Manage your personal information, fluency benchmarks, and practice schedule
              </p>
            </div>
          </div>

          {/* Quick Save in Header on Desktop */}
          <div className="hidden sm:block">
            <ShimmerButton
              id="settings-save-header"
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 text-xs font-semibold disabled:opacity-50"
              background="rgba(79, 70, 229, 1)"
              borderRadius="10px"
            >
              {isSaving ? (
                <>
                  <Spinner />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  <span>Save Changes</span>
                </>
              )}
            </ShimmerButton>
          </div>
        </header>

        {/* ── Main Layout (Sidebar + Content) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ═══════════ LEFT SIDEBAR ═══════════ */}
          <aside className="lg:col-span-4 space-y-4">
            {/* User Profile Summary Card */}
            <div className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-base font-bold shadow-lg shadow-indigo-500/25 shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate">
                    {user?.name || 'SpeakUp Learner'}
                  </h3>
                  <p className="text-xs text-neutral-400 truncate">
                    {user?.email || '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="block text-[10px] font-mono uppercase text-neutral-500">Fluency</span>
                  <span className="text-xs font-bold text-indigo-400 capitalize">
                    {user?.englishLevel || 'Evaluating'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <span className="block text-[10px] font-mono uppercase text-neutral-500">Streak</span>
                  <span className="text-xs font-bold text-amber-400">
                    🔥 {user?.streak || 0} Days
                  </span>
                </div>
              </div>
            </div>

            {/* Tab Navigation Menu */}
            <nav className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-2 shadow-xl space-y-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-500/15 text-white border border-indigo-500/30 shadow-sm'
                        : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* ═══════════ RIGHT CONTENT PANEL ═══════════ */}
          <main className="lg:col-span-8 space-y-6">
            {/* TAB 1: Profile Details */}
            {activeTab === 'profile' && (
              <section className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Personal Information</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Your identity across practice sessions and certificates</p>
                </div>

                {/* Display Name */}
                <div>
                  <label htmlFor="settings-name" className="block text-xs font-medium text-neutral-300 mb-2">
                    Display Name
                  </label>
                  <input
                    id="settings-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 rounded-xl bg-neutral-950/80 border border-white/[0.08] text-white text-sm placeholder-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:border-indigo-500/40 transition-colors"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2">
                    Registered Email
                  </label>
                  <div className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-neutral-950/40 border border-white/[0.04] text-neutral-400 text-sm">
                    <span className="truncate">{user?.email || '—'}</span>
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-mono text-neutral-500 bg-white/[0.04] px-2 py-0.5 rounded">
                      <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Verified
                    </span>
                  </div>
                </div>

                {/* Native Language */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2.5">
                    Native Language (Phonics Adaptation)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LANGUAGES.map((lang) => {
                      const isSelected = nativeLanguage === lang.value
                      return (
                        <button
                          key={lang.value}
                          type="button"
                          onClick={() => setNativeLanguage(lang.value)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-500/15 border-indigo-500/60 text-white ring-1 ring-indigo-500/40 shadow-sm'
                              : 'bg-neutral-950/50 border-white/[0.06] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{lang.icon}</span>
                            <div>
                              <span className="block text-xs font-semibold">{lang.value}</span>
                              <span className="block text-[10px] text-neutral-500">{lang.sub}</span>
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* TAB 2: Learning & Level */}
            {activeTab === 'preferences' && (
              <section className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Learning Preferences</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Adjust your current fluency tier and primary practice scenarios</p>
                </div>

                {/* English Level */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2.5">
                    English Proficiency Level
                  </label>
                  <div className="space-y-2.5">
                    {LEVELS.map((level) => {
                      const isSelected = englishLevel === level.value
                      return (
                        <button
                          key={level.value}
                          type="button"
                          onClick={() => setEnglishLevel(level.value)}
                          className={`w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500/40'
                              : 'bg-neutral-950/50 border-white/[0.06] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-lg shrink-0">
                            {level.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                {level.value}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-neutral-400">
                                {level.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                              {level.desc}
                            </p>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Primary Learning Goal */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-2.5">
                    Primary Practice Objective
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {GOALS.map((goal) => {
                      const isSelected = learningGoal === goal.value
                      return (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => setLearningGoal(goal.value)}
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-500/15 border-indigo-500/60 ring-1 ring-indigo-500/40 text-white'
                              : 'bg-neutral-950/50 border-white/[0.06] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]'
                          }`}
                        >
                          <span className="text-xl">{goal.icon}</span>
                          <div className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold truncate">{goal.value}</span>
                            <span className="block text-[10px] text-neutral-500 truncate">{goal.desc}</span>
                          </div>
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>
            )}

            {/* TAB 3: Daily Commitment */}
            {activeTab === 'goals' && (
              <section className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Daily Practice Commitment</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Micro-learning habit schedule for optimal speaking retention</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DAILY_GOALS.map((goal) => {
                    const isSelected = dailyGoalMinutes === goal.value
                    return (
                      <button
                        key={goal.value}
                        type="button"
                        onClick={() => setDailyGoalMinutes(goal.value)}
                        className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                            : 'bg-neutral-950/50 border-white/[0.06] hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-xl">
                            {goal.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                                {goal.label}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-400">
                                {goal.badge}
                              </span>
                            </div>
                            <span className="text-xs text-neutral-500">
                              {goal.desc}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-neutral-950" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* TAB 4: Account & Danger Zone */}
            {activeTab === 'account' && (
              <section className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Account & Session</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">Manage session access and authentication controls</p>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-semibold text-white">Platform Role</span>
                    <span className="block text-[11px] text-neutral-400 mt-0.5">Assigned account authorization level</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono text-xs font-semibold">
                    {user?.role === 'admin' ? '👑 Admin' : '📚 Learner'}
                  </span>
                </div>

                {/* Danger Card */}
                <div className="p-5 rounded-xl bg-red-500/[0.04] border border-red-500/20 space-y-3">
                  <div>
                    <span className="block text-xs font-bold text-red-400 uppercase tracking-wide">Danger Zone</span>
                    <span className="block text-xs text-neutral-400 mt-1">
                      Logging out terminates your current active session token on this browser.
                    </span>
                  </div>

                  <button
                    type="button"
                    id="settings-logout"
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-xs hover:bg-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    <span>Sign Out of Account</span>
                  </button>
                </div>
              </section>
            )}

            {/* Bottom Save Action Bar */}
            <div className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <span className="text-xs text-neutral-400 hidden sm:inline">
                Preferences are synced automatically across your AI sessions
              </span>
              <ShimmerButton
                id="settings-save"
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 text-xs font-semibold disabled:opacity-50"
                background="rgba(79, 70, 229, 1)"
                borderRadius="12px"
              >
                {isSaving ? (
                  <>
                    <Spinner />
                    <span>Saving Changes…</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <span>Save All Changes</span>
                  </>
                )}
              </ShimmerButton>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
