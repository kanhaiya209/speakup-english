import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axiosConfig'
import { setUser } from '../store/authSlice'

/* ────────────────────────────────────────────
   Step Configuration
   ──────────────────────────────────────────── */

const STEPS = [
  {
    key: 'nativeLanguage',
    title: 'What is your native language?',
    subtitle: 'This helps us tailor content for you',
    options: [
      { value: 'Hindi', icon: '🇮🇳', label: 'Hindi' },
      { value: 'Bengali', icon: '🟢', label: 'Bengali' },
      { value: 'Tamil', icon: '🔴', label: 'Tamil' },
      { value: 'Telugu', icon: '🟡', label: 'Telugu' },
      { value: 'Marathi', icon: '🟠', label: 'Marathi' },
      { value: 'Gujarati', icon: '🟤', label: 'Gujarati' },
      { value: 'Kannada', icon: '🟣', label: 'Kannada' },
      { value: 'Punjabi', icon: '🔵', label: 'Punjabi' },
      { value: 'Malayalam', icon: '🟢', label: 'Malayalam' },
      { value: 'Other', icon: '🌍', label: 'Other' },
    ],
  },
  {
    key: 'englishLevel',
    title: 'What is your English level?',
    subtitle: 'Be honest — it helps us set the right difficulty',
    options: [
      { value: 'Beginner', icon: '🌱', label: 'Beginner', desc: 'I know very basic words' },
      { value: 'Elementary', icon: '📗', label: 'Elementary', desc: 'I can speak simple sentences' },
      { value: 'Intermediate', icon: '📘', label: 'Intermediate', desc: 'I can hold basic conversations' },
      { value: 'Upper Intermediate', icon: '📙', label: 'Upper Intermediate', desc: 'I speak well but make mistakes' },
      { value: 'Advanced', icon: '🏆', label: 'Advanced', desc: 'I speak fluently with minor errors' },
    ],
  },
  {
    key: 'learningGoal',
    title: 'What is your learning goal?',
    subtitle: "We'll focus your practice sessions around this",
    options: [
      { value: 'Job Interviews', icon: '💼', label: 'Job Interviews' },
      { value: 'Business Communication', icon: '📊', label: 'Business Communication' },
      { value: 'Daily Conversation', icon: '💬', label: 'Daily Conversation' },
      { value: 'Travel & Tourism', icon: '✈️', label: 'Travel & Tourism' },
      { value: 'Academic English', icon: '🎓', label: 'Academic English' },
      { value: 'Public Speaking', icon: '🎤', label: 'Public Speaking' },
    ],
  },
  {
    key: 'dailyGoalMinutes',
    title: 'Daily practice goal',
    subtitle: 'Even 5 minutes a day makes a difference',
    options: [
      { value: 5, icon: '⚡', label: '5 mins', desc: 'Quick burst' },
      { value: 10, icon: '🔥', label: '10 mins', desc: 'Steady pace' },
      { value: 15, icon: '💪', label: '15 mins', desc: 'Solid habit' },
      { value: 20, icon: '🚀', label: '20 mins', desc: 'Power learner' },
      { value: 30, icon: '🏅', label: '30 mins', desc: 'All in' },
    ],
  },
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
   ProfileSetup Page
   ──────────────────────────────────────────── */

export default function ProfileSetup() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [currentStep, setCurrentStep] = useState(0)
  const [selections, setSelections] = useState({
    nativeLanguage: '',
    englishLevel: '',
    learningGoal: '',
    dailyGoalMinutes: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [banner, setBanner] = useState('')

  const step = STEPS[currentStep]
  const totalSteps = STEPS.length
  const isLastStep = currentStep === totalSteps - 1
  const currentValue = selections[step.key]
  const hasSelection = currentValue !== '' && currentValue !== null

  /* ── Select an option ── */

  const handleSelect = (value) => {
    setSelections((prev) => ({ ...prev, [step.key]: value }))
    setBanner('')
  }

  /* ── Navigation ── */

  const handleNext = async () => {
    if (!hasSelection) return

    if (isLastStep) {
      await handleSubmit()
    } else {
      setCurrentStep((s) => s + 1)
      setBanner('')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
      setBanner('')
    }
  }

  /* ── Submit to backend ── */

  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setBanner('')

      const response = await api.patch('/api/user/profile', {
        nativeLanguage: selections.nativeLanguage,
        englishLevel: selections.englishLevel,
        learningGoal: selections.learningGoal,
        dailyGoalMinutes: selections.dailyGoalMinutes,
      })

      if (response.data.success) {
        // Update the Redux user with the new profile data
        const updatedUser = { ...user, ...response.data.data }
        dispatch(setUser(updatedUser))
        navigate('/home')
      } else {
        throw new Error(response.data.message || 'Failed to save profile.')
      }
    } catch (error) {
      console.error('Profile setup error:', error)
      if (error.response) {
        setBanner(error.response.data?.message || 'Failed to save profile. Please try again.')
      } else {
        setBanner(error.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Progress percentage ── */

  const progressPercent = ((currentStep + 1) / totalSteps) * 100

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

      <div className="relative z-10 w-full max-w-lg">
        {/* ────────────────── Card ────────────────── */}
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20">

          {/* ── Step indicator + Progress bar ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-indigo-400 tracking-wide">
                Step {currentStep + 1} of {totalSteps}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {Math.round(progressPercent)}% complete
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* ── Step title ── */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-1.5 text-pretty">
              {step.title}
            </h1>
            <p className="text-slate-400 text-sm">{step.subtitle}</p>
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

          {/* ── Option Cards ── */}
          <div
            className={`grid gap-3 mb-8 ${
              step.key === 'nativeLanguage'
                ? 'grid-cols-2'
                : step.key === 'dailyGoalMinutes'
                  ? 'grid-cols-2 sm:grid-cols-3'
                  : 'grid-cols-1'
            }`}
            role="radiogroup"
            aria-label={step.title}
          >
            {step.options.map((option) => {
              const isSelected = currentValue === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelect(option.value)}
                  className={`group relative flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10]'
                  } ${
                    step.key === 'nativeLanguage' || step.key === 'dailyGoalMinutes'
                      ? 'flex-col items-center text-center'
                      : ''
                  }`}
                >
                  {/* Selection ring indicator */}
                  <div
                    className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors duration-200 ${
                      isSelected ? 'border-indigo-400 bg-indigo-500' : 'border-white/20 bg-transparent'
                    } ${
                      step.key === 'nativeLanguage' || step.key === 'dailyGoalMinutes'
                        ? 'top-2 right-2'
                        : ''
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </div>

                  {/* Icon */}
                  <span className={`text-2xl ${
                    step.key === 'nativeLanguage' || step.key === 'dailyGoalMinutes' ? 'mb-1' : ''
                  }`}>
                    {option.icon}
                  </span>

                  {/* Text */}
                  <div className="min-w-0">
                    <span className={`block font-semibold text-sm ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {option.label}
                    </span>
                    {option.desc && (
                      <span className={`block text-xs mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {option.desc}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Navigation buttons ── */}
          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                id="profile-back-button"
                onClick={handleBack}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 font-semibold text-sm hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Back
              </button>
            )}

            <button
              type="button"
              id="profile-next-button"
              onClick={handleNext}
              disabled={!hasSelection || isLoading}
              className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg cursor-pointer"
            >
              {isLoading ? (
                <><Spinner /><span>Saving…</span></>
              ) : isLastStep ? (
                <>
                  <span>Get Started</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Bottom badge ── */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Takes less than a minute</span>
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
