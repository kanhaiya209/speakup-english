import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../api/axiosConfig'
import { setUser } from '../store/authSlice'
import { BackgroundBeams } from '../components/ui/background-beams'
import { ShimmerButton } from '../components/ui/shimmer-button'

/* ────────────────────────────────────────────
   Step Configuration
   ──────────────────────────────────────────── */

const STEPS = [
  {
    key: 'nativeLanguage',
    stepNumber: '01',
    category: 'Background',
    title: 'What is your native language?',
    subtitle: 'We personalize pronunciation and phonics based on your mother tongue',
    options: [
      { value: 'Hindi', icon: '🇮🇳', label: 'Hindi', sub: 'हिंदी' },
      { value: 'Bengali', icon: '🟢', label: 'Bengali', sub: 'বাংলা' },
      { value: 'Tamil', icon: '🔴', label: 'Tamil', sub: 'தமிழ்' },
      { value: 'Telugu', icon: '🟡', label: 'Telugu', sub: 'తెలుగు' },
      { value: 'Marathi', icon: '🟠', label: 'Marathi', sub: 'मराठी' },
      { value: 'Gujarati', icon: '🟤', label: 'Gujarati', sub: 'ગુજરાતી' },
      { value: 'Kannada', icon: '🟣', label: 'Kannada', sub: 'ಕನ್ನಡ' },
      { value: 'Punjabi', icon: '🔵', label: 'Punjabi', sub: 'ਪੰਜਾਬੀ' },
      { value: 'Malayalam', icon: '🟢', label: 'Malayalam', sub: 'മലയാളം' },
      { value: 'Other', icon: '🌍', label: 'Other', sub: 'Global' },
    ],
  },
  {
    key: 'englishLevel',
    stepNumber: '02',
    category: 'Assessment',
    title: 'What is your English level?',
    subtitle: 'Be honest — this helps our AI set the optimal speaking pace for you',
    options: [
      { value: 'Beginner', icon: '🌱', label: 'Beginner', badge: 'A1', desc: 'I know basic words, need help building simple sentences' },
      { value: 'Elementary', icon: '📗', label: 'Elementary', badge: 'A2', desc: 'I can speak simple sentences but hesitate often' },
      { value: 'Intermediate', icon: '📘', label: 'Intermediate', badge: 'B1', desc: 'I can hold daily conversations with occasional pauses' },
      { value: 'Upper Intermediate', icon: '📙', label: 'Upper Intermediate', badge: 'B2', desc: 'I speak with confidence, looking to polish grammar & tone' },
      { value: 'Advanced', icon: '🏆', label: 'Advanced', badge: 'C1', desc: 'Fluent speaker aiming for executive articulation & nuance' },
    ],
  },
  {
    key: 'learningGoal',
    stepNumber: '03',
    category: 'Objectives',
    title: 'What is your primary goal?',
    subtitle: 'Practice scenarios will be tailored directly to this objective',
    options: [
      { value: 'Job Interviews', icon: '💼', label: 'Job Interviews', desc: 'HR rounds, technical prep, behavioral questions' },
      { value: 'Business Communication', icon: '📊', label: 'Business Meetings', desc: 'Presentations, emails, client pitching' },
      { value: 'Daily Conversation', icon: '💬', label: 'Daily Fluency', desc: 'Casual chat, expressing opinions with ease' },
      { value: 'Travel & Tourism', icon: '✈️', label: 'Travel & Global', desc: 'Navigating flights, hotels, and international friends' },
      { value: 'Academic English', icon: '🎓', label: 'Academic & Tests', desc: 'IELTS, TOEFL, university seminars' },
      { value: 'Public Speaking', icon: '🎤', label: 'Public Speaking', desc: 'Stage presence, storytelling, voice modulation' },
    ],
  },
  {
    key: 'dailyGoalMinutes',
    stepNumber: '04',
    category: 'Commitment',
    title: 'Choose your daily practice goal',
    subtitle: 'Consistent micro-sessions build real speaking reflex faster than cramming',
    options: [
      { value: 5, icon: '⚡', label: '5 Mins', badge: 'Casual', desc: 'Quick daily warm-up' },
      { value: 10, icon: '🔥', label: '10 Mins', badge: 'Popular', desc: 'Steady, sustainable habit' },
      { value: 15, icon: '💪', label: '15 Mins', badge: 'Recommended', desc: 'Solid compounding growth' },
      { value: 20, icon: '🚀', label: '20 Mins', badge: 'Pro', desc: 'Rapid confidence acceleration' },
      { value: 30, icon: '🏅', label: '30 Mins', badge: 'Mastery', desc: 'Total immersive mastery' },
    ],
  },
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
   ProfileSetup Page
   ──────────────────────────────────────────── */

export default function ProfileSetup() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
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
      setDirection(1)
      setCurrentStep((s) => s + 1)
      setBanner('')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1)
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

  const variants = {
    enter: (d) => ({
      x: d > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: 'easeOut' },
    },
    exit: (d) => ({
      x: d > 0 ? -30 : 30,
      opacity: 0,
      transition: { duration: 0.18, ease: 'easeIn' },
    }),
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* ── Background Beams ── */}
      <BackgroundBeams />

      {/* ── Ambient Radial Glows ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        {/* ── Stepper Header ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-mono font-medium text-indigo-400">
                STEP {step.stepNumber}
              </span>
              <span className="text-xs font-medium text-neutral-400">
                {step.category}
              </span>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              {currentStep + 1} / {totalSteps}
            </span>
          </div>

          {/* Segmented Progress Track */}
          <div className="grid grid-cols-4 gap-2">
            {STEPS.map((s, idx) => {
              const isPast = idx < currentStep
              const isCurrent = idx === currentStep
              return (
                <div key={s.key} className="h-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isPast
                        ? 'bg-indigo-500 w-full'
                        : isCurrent
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-400 w-full animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Card Container ── */}
        <div className="backdrop-blur-2xl bg-neutral-900/70 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
          {/* Subtle Top Glow Border */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent pointer-events-none" />

          {/* Error Banner */}
          {banner && (
            <div
              className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
              role="alert"
            >
              <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <p className="text-red-300 text-sm leading-relaxed">{banner}</p>
            </div>
          )}

          {/* Step Content with AnimatePresence */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.key}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {/* Title & Subtitle */}
              <div className="mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-1.5">
                  {step.title}
                </h1>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                  {step.subtitle}
                </p>
              </div>

              {/* Step 1: Native Language (2-col grid) */}
              {step.key === 'nativeLanguage' && (
                <div className="grid grid-cols-2 gap-2.5 mb-8" role="radiogroup">
                  {step.options.map((option) => {
                    const isSelected = currentValue === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelect(option.value)}
                        className={`group relative flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/15 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/50'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{option.icon}</span>
                          <div>
                            <span className={`block text-sm font-semibold tracking-tight ${isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                              {option.label}
                            </span>
                            <span className="block text-[11px] text-neutral-500">
                              {option.sub}
                            </span>
                          </div>
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
              )}

              {/* Step 2: English Level (Vertical Cards) */}
              {step.key === 'englishLevel' && (
                <div className="space-y-2.5 mb-8" role="radiogroup">
                  {step.options.map((option) => {
                    const isSelected = currentValue === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelect(option.value)}
                        className={`group relative w-full flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/15 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/50'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors ${
                          isSelected ? 'bg-indigo-500/20 border border-indigo-500/30' : 'bg-white/[0.04] border border-white/[0.06]'
                        }`}>
                          {option.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold text-sm tracking-tight ${isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                              {option.label}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/[0.06] text-neutral-400">
                              {option.badge}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 leading-relaxed line-clamp-1 ${isSelected ? 'text-indigo-200/80' : 'text-neutral-400'}`}>
                            {option.desc}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 3: Learning Goal (2-col grid) */}
              {step.key === 'learningGoal' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-8" role="radiogroup">
                  {step.options.map((option) => {
                    const isSelected = currentValue === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelect(option.value)}
                        className={`group relative flex flex-col justify-between p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/15 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/50'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2">
                          <span className="text-2xl">{option.icon}</span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className={`block font-semibold text-sm tracking-tight ${isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
                            {option.label}
                          </span>
                          <span className="block text-[11px] text-neutral-400 mt-0.5 leading-snug">
                            {option.desc}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Step 4: Daily Practice Goal */}
              {step.key === 'dailyGoalMinutes' && (
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 mb-8" role="radiogroup">
                  {step.options.map((option) => {
                    const isSelected = currentValue === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleSelect(option.value)}
                        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-500/15 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/50'
                            : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                        }`}
                      >
                        <span className="text-xl mb-1">{option.icon}</span>
                        <span className={`text-base font-bold tracking-tight ${isSelected ? 'text-white' : 'text-neutral-200'}`}>
                          {option.label}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400 mt-0.5">
                          {option.badge}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ── Actions Row ── */}
          <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
            {currentStep > 0 && (
              <button
                type="button"
                id="profile-back-button"
                onClick={handleBack}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-300 font-semibold text-sm hover:bg-white/[0.08] hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
                Back
              </button>
            )}

            <ShimmerButton
              id="profile-next-button"
              type="button"
              onClick={handleNext}
              disabled={!hasSelection || isLoading}
              className="flex-1 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              background="rgba(79, 70, 229, 1)"
              borderRadius="12px"
            >
              {isLoading ? (
                <>
                  <Spinner />
                  <span>Saving Profile…</span>
                </>
              ) : isLastStep ? (
                <>
                  <span>Complete Setup</span>
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </>
              )}
            </ShimmerButton>
          </div>
        </div>

        {/* Bottom Tag */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-neutral-500 font-medium">Quick setup • Takes under 60 seconds</span>
          </div>
        </div>
      </div>
    </div>
  )
}
