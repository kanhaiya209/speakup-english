import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import api from '../api/axiosConfig'
import { setUser } from '../store/authSlice'

/* ── Static onboarding copy ──────────────────────────────────────────────────
   These lists are UI copy, not data (DESIGN_SYSTEM.md §8). Every `value` string
   is part of the /api/user/profile contract — change a label if you must, never
   a value. `dailyGoalMinutes` values are numbers because the API stores an int. */

const STEPS = [
  {
    key: 'nativeLanguage',
    title: 'What is your native language?',
    subtitle: 'Pronunciation practice is tuned to the sounds your mother tongue does not use.',
    layout: 'grid grid-cols-1 gap-2 sm:grid-cols-2',
    options: [
      { value: 'Hindi', label: 'Hindi', sub: 'हिंदी' },
      { value: 'Bengali', label: 'Bengali', sub: 'বাংলা' },
      { value: 'Tamil', label: 'Tamil', sub: 'தமிழ்' },
      { value: 'Telugu', label: 'Telugu', sub: 'తెలుగు' },
      { value: 'Marathi', label: 'Marathi', sub: 'मराठी' },
      { value: 'Gujarati', label: 'Gujarati', sub: 'ગુજરાતી' },
      { value: 'Kannada', label: 'Kannada', sub: 'ಕನ್ನಡ' },
      { value: 'Punjabi', label: 'Punjabi', sub: 'ਪੰਜਾਬੀ' },
      { value: 'Malayalam', label: 'Malayalam', sub: 'മലയാളം' },
      { value: 'Other', label: 'Another language' },
    ],
  },
  {
    key: 'englishLevel',
    title: 'How would you describe your English?',
    subtitle: 'Answer honestly — it sets the speaking pace your tutor starts with.',
    layout: 'space-y-2',
    options: [
      {
        value: 'Beginner',
        label: 'Beginner',
        badge: 'A1',
        desc: 'I know basic words but need help building sentences.',
      },
      {
        value: 'Elementary',
        label: 'Elementary',
        badge: 'A2',
        desc: 'I can say simple sentences, though I hesitate often.',
      },
      {
        value: 'Intermediate',
        label: 'Intermediate',
        badge: 'B1',
        desc: 'I hold everyday conversations with occasional pauses.',
      },
      {
        value: 'Upper Intermediate',
        label: 'Upper intermediate',
        badge: 'B2',
        desc: 'I speak with confidence and want to polish grammar and tone.',
      },
      {
        value: 'Advanced',
        label: 'Advanced',
        badge: 'C1',
        desc: 'I am fluent and working on nuance and precision.',
      },
    ],
  },
  {
    key: 'learningGoal',
    title: 'What are you practising for?',
    subtitle: 'Your practice conversations are built around this.',
    layout: 'grid grid-cols-1 gap-2 sm:grid-cols-2',
    options: [
      {
        value: 'Job Interviews',
        label: 'Job interviews',
        desc: 'HR rounds, technical questions, self introductions.',
      },
      {
        value: 'Business Communication',
        label: 'Business communication',
        desc: 'Meetings, presentations, client conversations.',
      },
      {
        value: 'Daily Conversation',
        label: 'Daily conversation',
        desc: 'Casual talk and expressing opinions with ease.',
      },
      {
        value: 'Travel & Tourism',
        label: 'Travel',
        desc: 'Airports, hotels, directions, meeting new people.',
      },
      {
        value: 'Academic English',
        label: 'Academic English',
        desc: 'IELTS, TOEFL, seminars and classroom discussion.',
      },
      {
        value: 'Public Speaking',
        label: 'Public speaking',
        desc: 'Stage presence, storytelling, voice modulation.',
      },
    ],
  },
  {
    key: 'dailyGoalMinutes',
    title: 'How long will you practise each day?',
    subtitle: 'Short daily sessions build speaking reflex faster than long, rare ones.',
    layout: 'grid grid-cols-1 gap-2 sm:grid-cols-2',
    options: [
      { value: 5, label: '5 minutes', desc: 'A quick daily warm-up.' },
      { value: 10, label: '10 minutes', desc: 'A steady, sustainable habit.' },
      { value: 15, label: '15 minutes', desc: 'Enough to notice progress week to week.' },
      { value: 20, label: '20 minutes', desc: 'A serious daily commitment.' },
      { value: 30, label: '30 minutes', desc: 'Immersive practice.' },
    ],
  },
]

/* ── Shared styles (DESIGN_SYSTEM.md §4) ── */

const PRIMARY_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50'

const OUTLINE_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-transparent px-4 py-2.5 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50'

const optionClass = (selected) =>
  `flex w-full cursor-pointer items-center justify-between gap-3 rounded-control border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
    selected
      ? 'border-line-strong bg-surface-2 text-fg'
      : 'border-line bg-canvas text-muted hover:border-line-strong hover:text-fg'
  }`

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * One choice. Selection is the 1.5px white dot from §4 — never a coloured fill or a
 * checkmark badge. `sub`, `badge` and `desc` are all optional, so the same row renders a
 * language, a CEFR level and a daily goal without four near-identical blocks of JSX.
 */
function Option({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(option.value)}
      className={optionClass(selected)}
    >
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{option.label}</span>
          {option.sub && <span className="text-sm text-muted">{option.sub}</span>}
          {option.badge && (
            <span className="inline-flex items-center rounded-control border border-line bg-canvas px-2 py-0.5 text-xs text-muted">
              {option.badge}
            </span>
          )}
        </span>
        {option.desc && (
          <span className="mt-1 block text-xs leading-relaxed text-muted">{option.desc}</span>
        )}
      </span>
      {selected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden="true" />}
    </button>
  )
}

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
  const progressPercent = ((currentStep + 1) / totalSteps) * 100

  const handleSelect = (value) => {
    setSelections((prev) => ({ ...prev, [step.key]: value }))
    setBanner('')
  }

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

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="text-[15px] font-semibold tracking-tight text-fg">SpeakUp</span>
          <span className="text-xs text-muted">
            Step {currentStep + 1} of {totalSteps}
          </span>
        </div>

        <div className="h-0.5 w-full bg-line">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full rounded-card border border-line bg-surface p-6 sm:p-8">
          {banner && (
            <div
              className="mb-6 rounded-control border border-danger/30 bg-danger/10 px-3 py-2.5"
              role="alert"
            >
              <p className="text-sm text-danger">{banner}</p>
            </div>
          )}

          <h1 className="text-lg leading-snug font-medium text-fg sm:text-xl">{step.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{step.subtitle}</p>

          <div className={`mt-6 ${step.layout}`} role="radiogroup" aria-label={step.title}>
            {step.options.map((option) => (
              <Option
                key={String(option.value)}
                option={option}
                selected={currentValue === option.value}
                onSelect={handleSelect}
              />
            ))}
          </div>

          <div className="mt-8 flex items-center gap-2 border-t border-line pt-5">
            {currentStep > 0 && (
              <button
                type="button"
                id="profile-back-button"
                onClick={handleBack}
                disabled={isLoading}
                className={OUTLINE_BUTTON}
              >
                Back
              </button>
            )}

            <button
              type="button"
              id="profile-next-button"
              onClick={handleNext}
              disabled={!hasSelection || isLoading}
              className={`ml-auto ${PRIMARY_BUTTON}`}
            >
              {isLoading && <Spinner />}
              {isLoading ? 'Saving' : isLastStep ? 'Finish setup' : 'Continue'}
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-2xl px-4 py-3.5 sm:px-6">
          <p className="text-xs text-muted">You can change any of these later in Settings.</p>
        </div>
      </footer>
    </div>
  )
}
