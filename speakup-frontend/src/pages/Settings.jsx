import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axiosConfig'
import { TUTOR_VOICE } from '../config/voice'
import usePushNotifications from '../hooks/usePushNotifications'
import { setUser, logout } from '../store/authSlice'
import Navbar from '../components/Navbar'

/* ── Option data (values match the API payload exactly) ── */

const LANGUAGES = [
  { value: 'Hindi', native: 'हिंदी' },
  { value: 'Bengali', native: 'বাংলা' },
  { value: 'Tamil', native: 'தமிழ்' },
  { value: 'Telugu', native: 'తెలుగు' },
  { value: 'Marathi', native: 'मराठी' },
  { value: 'Gujarati', native: 'ગુજરાતી' },
  { value: 'Kannada', native: 'ಕನ್ನಡ' },
  { value: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { value: 'Malayalam', native: 'മലയാളം' },
  { value: 'Other', native: '' },
]

const LEVELS = [
  { value: 'Beginner', cefr: 'A1–A2', desc: 'Basic vocabulary and simple sentences' },
  { value: 'Elementary', cefr: 'A2–B1', desc: 'Everyday conversation with some hesitation' },
  { value: 'Intermediate', cefr: 'B1–B2', desc: 'Fluent discussion and clear opinions' },
  { value: 'Upper Intermediate', cefr: 'B2–C1', desc: 'Confident, working on nuance and idiom' },
  { value: 'Advanced', cefr: 'C1–C2', desc: 'Near-native articulation' },
]

const GOALS = [
  { value: 'Job Interviews', desc: 'HR and technical rounds' },
  { value: 'Business Communication', desc: 'Presentations and pitches' },
  { value: 'Daily Conversation', desc: 'Casual fluency' },
  { value: 'Travel & Tourism', desc: 'Travelling abroad' },
  { value: 'Academic English', desc: 'IELTS and university' },
  { value: 'Public Speaking', desc: 'Stage presence and speeches' },
]

const DAILY_GOALS = [
  { value: 10, label: '10 mins', desc: 'Quick session' },
  { value: 15, label: '15 mins', desc: 'Steady habit' },
  { value: 20, label: '20 mins', desc: 'Power learner' },
  { value: 30, label: '30 mins', desc: 'Full immersion' },
]

const VOICE_OPTIONS = [
  {
    value: TUTOR_VOICE.BROWSER,
    label: 'Browser voice',
    desc: 'Built into your device. Works offline and starts instantly.',
  },
  {
    value: TUTOR_VOICE.NATURAL,
    label: 'Natural voice',
    desc: 'A warmer, more human tutor. Takes a moment longer to speak.',
  },
]

const TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'preferences', label: 'Learning' },
  { id: 'goals', label: 'Daily goal' },
  { id: 'voice', label: 'Voice & reminders' },
  { id: 'account', label: 'Account' },
]

/* ── Shared styles ── */

const sectionClass = 'rounded-card border border-line bg-surface p-6'

const inputClass =
  'w-full rounded-control border border-line bg-canvas px-3 py-2.5 text-sm text-fg placeholder:text-faint transition-colors focus:border-line-strong focus:outline-none'

const optionClass = (selected) =>
  `flex w-full cursor-pointer items-center justify-between gap-3 rounded-control border px-3.5 py-3 text-left transition-colors ${
    selected
      ? 'border-line-strong bg-surface-2 text-fg'
      : 'border-line bg-canvas text-muted hover:border-line-strong hover:text-fg'
  }`

const secondaryButtonClass =
  'flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-transparent px-4 py-2.5 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * The one sentence under "Practice reminders".
 *
 * The three ways this can be unavailable need different words: "your browser cannot do it",
 * "this build has no key" and "you said no" are not the same problem, and only the last one is
 * the learner's to fix.
 */
function reminderHint({ unsupported, needsKey, permission, enabled }) {
  if (unsupported) return 'This browser cannot receive push notifications.'
  if (needsKey) return 'Reminders are not configured for this deployment yet.'
  if (permission === 'denied') {
    return 'Notifications are blocked for this site. Allow them in your browser settings to turn reminders on.'
  }
  if (enabled) return 'One reminder a day, on the days you have not practised yet.'
  return 'Get one reminder a day when you have not practised yet.'
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function SelectedDot({ visible }) {
  if (!visible) return null
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden="true" />
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-base font-medium text-fg">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  )
}

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
  const [tutorVoice, setTutorVoice] = useState(user?.tutorVoice || TUTOR_VOICE.BROWSER)
  const [isSaving, setIsSaving] = useState(false)

  // Reminders are switched on the spot rather than on Save: a browser permission prompt and a
  // device-token registration cannot sensibly wait for a button on the other side of the page.
  const reminders = usePushNotifications()

  // Pre-fill from Redux user if it loads after mount
  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(user.name || '')
      setNativeLanguage(user.nativeLanguage || '')
      setEnglishLevel(user.englishLevel || '')
      setLearningGoal(user.learningGoal || '')
      setDailyGoalMinutes(user.dailyGoalMinutes || 15)
      setTutorVoice(user.tutorVoice || TUTOR_VOICE.BROWSER)
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
        tutorVoice,
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
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">Settings</h1>
          <p className="mt-2 text-sm text-muted">
            Manage your profile, learning preferences, and daily practice commitment.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr] lg:gap-12">
          {/* ── Sidebar ── */}
          <aside>
            <div className="mb-6 rounded-card border border-line bg-surface p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-canvas text-xs font-medium text-fg">
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{user?.name || 'SpeakUp learner'}</p>
                  <p className="truncate text-xs text-muted">{user?.email || '—'}</p>
                </div>
              </div>
            </div>

            <nav className="flex flex-col" aria-label="Settings sections">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`cursor-pointer border-l-2 px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? 'border-l-white text-fg'
                        : 'border-l-line text-muted hover:border-l-line-strong hover:text-fg'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* ── Content ── */}
          <main className="space-y-6">
            {/* Profile */}
            {activeTab === 'profile' && (
              <section className={sectionClass}>
                <SectionHeading
                  title="Profile"
                  description="Your display name and the native language we adapt pronunciation feedback to."
                />

                <div className="space-y-6">
                  <div>
                    <label htmlFor="settings-name" className="mb-1.5 block text-xs text-muted">
                      Display name
                    </label>
                    <input
                      id="settings-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <span className="mb-1.5 block text-xs text-muted">Email</span>
                    <div className="flex items-center justify-between rounded-control border border-line bg-canvas px-3 py-2.5">
                      <span className="truncate text-sm text-muted">{user?.email || '—'}</span>
                      <span className="ml-3 shrink-0 text-xs text-muted">Read only</span>
                    </div>
                  </div>

                  <div>
                    <span className="mb-2.5 block text-xs text-muted">Native language</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Native language">
                      {LANGUAGES.map((lang) => {
                        const selected = nativeLanguage === lang.value
                        return (
                          <button
                            key={lang.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setNativeLanguage(lang.value)}
                            className={optionClass(selected)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm">{lang.value}</span>
                              {lang.native && (
                                <span className="block truncate text-xs text-muted">{lang.native}</span>
                              )}
                            </span>
                            <SelectedDot visible={selected} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Learning */}
            {activeTab === 'preferences' && (
              <section className={sectionClass}>
                <SectionHeading
                  title="Learning"
                  description="Your current proficiency and what you are mainly practising for."
                />

                <div className="space-y-6">
                  <div>
                    <span className="mb-2.5 block text-xs text-muted">English level</span>
                    <div className="space-y-2" role="radiogroup" aria-label="English level">
                      {LEVELS.map((level) => {
                        const selected = englishLevel === level.value
                        return (
                          <button
                            key={level.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setEnglishLevel(level.value)}
                            className={optionClass(selected)}
                          >
                            <span className="min-w-0">
                              <span className="flex items-center gap-2">
                                <span className="text-sm">{level.value}</span>
                                <span className="text-xs text-muted">{level.cefr}</span>
                              </span>
                              <span className="mt-0.5 block truncate text-xs text-muted">{level.desc}</span>
                            </span>
                            <SelectedDot visible={selected} />
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <span className="mb-2.5 block text-xs text-muted">Primary goal</span>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Primary goal">
                      {GOALS.map((goal) => {
                        const selected = learningGoal === goal.value
                        return (
                          <button
                            key={goal.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setLearningGoal(goal.value)}
                            className={optionClass(selected)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm">{goal.value}</span>
                              <span className="block truncate text-xs text-muted">{goal.desc}</span>
                            </span>
                            <SelectedDot visible={selected} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Daily goal */}
            {activeTab === 'goals' && (
              <section className={sectionClass}>
                <SectionHeading
                  title="Daily goal"
                  description="How many minutes you want to practise speaking each day."
                />

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Daily goal">
                  {DAILY_GOALS.map((goal) => {
                    const selected = dailyGoalMinutes === goal.value
                    return (
                      <button
                        key={goal.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setDailyGoalMinutes(goal.value)}
                        className={optionClass(selected)}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm">{goal.label}</span>
                          <span className="block truncate text-xs text-muted">{goal.desc}</span>
                        </span>
                        <SelectedDot visible={selected} />
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Voice & reminders */}
            {activeTab === 'voice' && (
              <section className={sectionClass}>
                <SectionHeading
                  title="Voice & reminders"
                  description="How your tutor sounds, and whether we nudge you on the days you have not practised."
                />

                <div className="space-y-8">
                  <div>
                    <span className="mb-2.5 block text-xs text-muted">Tutor voice</span>
                    <div className="space-y-2" role="radiogroup" aria-label="Tutor voice">
                      {VOICE_OPTIONS.map((option) => {
                        const selected = tutorVoice === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setTutorVoice(option.value)}
                            className={optionClass(selected)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm">{option.label}</span>
                              <span className="block truncate text-xs text-muted">{option.desc}</span>
                            </span>
                            <SelectedDot visible={selected} />
                          </button>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      The natural voice falls back to your browser’s voice whenever it is
                      unavailable, so a session never goes quiet.
                    </p>
                  </div>

                  <div>
                    <span className="mb-2.5 block text-xs text-muted">Practice reminders</span>
                    <div className="divide-y divide-line border-y border-line">
                      <div className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                        <div className="min-w-0">
                          <p className="text-sm text-fg">Daily reminder</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {reminderHint({
                              unsupported: reminders.unsupported,
                              needsKey: reminders.needsKey,
                              permission: reminders.permission,
                              enabled: reminders.enabled,
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={reminders.enabled ? reminders.disable : reminders.enable}
                          disabled={
                            reminders.busy ||
                            (!reminders.enabled &&
                              (!reminders.available || reminders.permission === 'denied'))
                          }
                          className={secondaryButtonClass}
                        >
                          {reminders.busy && <Spinner />}
                          {reminders.enabled ? 'Turn off' : 'Enable reminders'}
                        </button>
                      </div>

                      {reminders.enabled && reminders.available && (
                        <div className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                          <div className="min-w-0">
                            <p className="text-sm text-fg">Send a test reminder</p>
                            <p className="mt-0.5 text-xs text-muted">
                              Delivers one now, so you can check it reaches this device.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={reminders.sendTest}
                            disabled={reminders.busy}
                            className={secondaryButtonClass}
                          >
                            Send test
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Account */}
            {activeTab === 'account' && (
              <section className={sectionClass}>
                <SectionHeading
                  title="Account"
                  description="Your access level and session on this browser."
                />

                <div className="divide-y divide-line border-y border-line">
                  <div className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <p className="text-sm text-fg">Role</p>
                      <p className="mt-0.5 text-xs text-muted">Account authorization level</p>
                    </div>
                    <span className="rounded-control border border-line bg-canvas px-2.5 py-1 text-xs text-muted capitalize">
                      {user?.role || 'learner'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 py-3.5">
                    <div>
                      <p className="text-sm text-fg">Sign out</p>
                      <p className="mt-0.5 text-xs text-muted">Ends your session on this browser</p>
                    </div>
                    <button
                      type="button"
                      id="settings-logout"
                      onClick={handleLogout}
                      className="cursor-pointer rounded-control border border-danger/30 bg-transparent px-3.5 py-2 text-sm text-danger transition-colors hover:border-danger/60 hover:bg-danger/10"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Save bar */}
            {activeTab !== 'account' && (
              <div className="flex items-center justify-end gap-4 border-t border-line pt-6">
                <span className="hidden text-xs text-muted sm:inline">
                  Changes apply to every future practice session.
                </span>
                <button
                  type="button"
                  id="settings-save"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? <><Spinner /><span>Saving…</span></> : 'Save changes'}
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

