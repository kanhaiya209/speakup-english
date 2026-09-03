import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { setUser, setOnboardingCompleted } from '../store/authSlice'
import useQuiz from '../hooks/useQuiz'
import { BackgroundBeams } from '../components/ui/background-beams'
import { ShimmerButton } from '../components/ui/shimmer-button'

/* ────────────────────────────────────────────
   Category Configuration
   ──────────────────────────────────────────── */

const CATEGORY_CONFIG = {
  grammar: {
    icon: '📝',
    label: 'Grammar',
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
  },
  vocabulary: {
    icon: '📚',
    label: 'Vocabulary',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
  },
  comprehension: {
    icon: '🧠',
    label: 'Comprehension',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
  },
}

/* ────────────────────────────────────────────
   Level Configuration
   ──────────────────────────────────────────── */

const LEVEL_CONFIG = {
  beginner: {
    icon: '🌱',
    label: 'Beginner',
    cefr: 'CEFR A1 - A2',
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/30',
    description: 'Great starting point! We will focus on building core vocabulary, everyday sentences, and confidence.',
  },
  intermediate: {
    icon: '📘',
    label: 'Intermediate',
    cefr: 'CEFR B1 - B2',
    gradient: 'from-indigo-500 to-violet-500',
    shadow: 'shadow-indigo-500/30',
    description: 'Solid foundation! We will sharpen your conversation flow, spontaneous speaking, and professional idioms.',
  },
  advanced: {
    icon: '🏆',
    label: 'Advanced',
    cefr: 'CEFR C1 - C2',
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/30',
    description: 'Exceptional articulation! We will polish executive communication, complex arguments, and native nuance.',
  },
}

/* ────────────────────────────────────────────
   Loading / Analyzing Screen
   ──────────────────────────────────────────── */

function AnalyzingScreen({ message = 'Analyzing your English responses…' }) {
  const [analysisStep, setAnalysisStep] = useState(0)
  const analysisSteps = [
    'Evaluating syntactic accuracy…',
    'Benchmarking vocabulary breadth…',
    'Assessing comprehension depth…',
    'Calibrating CEFR fluency tier…',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysisStep((prev) => (prev + 1) % analysisSteps.length)
    }, 900)
    return () => clearInterval(interval)
  }, [analysisSteps.length])

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <BackgroundBeams />

      <div className="relative z-10 flex flex-col items-center text-center max-w-md">
        {/* Animated Glowing Radar Pulse */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-500 p-1 animate-spin [animation-duration:4s]">
            <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center">
              <span className="text-3xl">✨</span>
            </div>
          </div>
          <div className="absolute inset-0 rounded-full bg-indigo-500/30 blur-xl animate-pulse" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight mb-2">
          {message}
        </h2>
        <p className="text-sm text-indigo-400 font-mono tracking-wide h-6 transition-all duration-300">
          {analysisSteps[analysisStep]}
        </p>

        <div className="mt-8 w-48 h-1 rounded-full bg-white/[0.08] overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 w-full animate-pulse" />
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Error Screen
   ──────────────────────────────────────────── */

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <BackgroundBeams />

      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-2xl bg-neutral-900/70 border border-white/[0.08] rounded-3xl p-8 shadow-2xl text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">{message}</p>
          {onRetry && (
            <ShimmerButton
              onClick={onRetry}
              className="w-full py-3 text-sm"
              background="rgba(79, 70, 229, 1)"
            >
              Try Again
            </ShimmerButton>
          )}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Result Screen
   ──────────────────────────────────────────── */

function ResultScreen({ result, onContinue }) {
  const levelConfig = LEVEL_CONFIG[result.assessedLevel] || LEVEL_CONFIG.beginner

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 sm:p-8 relative overflow-hidden font-sans">
      <BackgroundBeams />

      {/* Ambient background halos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[130px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="backdrop-blur-2xl bg-neutral-900/75 border border-white/[0.08] rounded-3xl p-6 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.7)] relative overflow-hidden">
          {/* Subtle Top Accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Assessment Complete
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Your English Fluency Profile
            </h1>
            <p className="text-neutral-400 text-sm">
              Tailored learning path generated from your answers
            </p>
          </div>

          {/* Hero Level Card & Score Ring */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Score Ring */}
            <div className="sm:col-span-1 flex flex-col items-center justify-center p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="relative w-28 h-28">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64" cy="64" r="54"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64" cy="64" r="54"
                    fill="none"
                    stroke="url(#resultScoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${result.score * 3.39} ${339 - result.score * 3.39}`}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="resultScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white tracking-tight">{result.score}%</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Accuracy</span>
                </div>
              </div>
              <span className="text-xs text-neutral-400 mt-2 font-medium">
                {result.correctAnswers} of {result.totalQuestions} Correct
              </span>
            </div>

            {/* Level Tier Hero */}
            <div className="sm:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-white/[0.02] to-transparent border border-indigo-500/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold uppercase text-indigo-400 tracking-wider">
                    Assessed Level
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-white/[0.06] text-neutral-300">
                    {levelConfig.cefr}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{levelConfig.icon}</span>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {levelConfig.label} Speaker
                  </h3>
                </div>
                <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
                  {levelConfig.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[11px] text-neutral-400">
                  AI tutor tuned to your fluency level
                </span>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="mb-8">
            <h3 className="text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider mb-3">
              Performance by Domain
            </h3>
            <div className="space-y-3">
              {Object.entries(result.categoryScores || {}).map(([category, score]) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.grammar
                return (
                  <div key={category} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${config.bg} ${config.border} border`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-neutral-200">{config.label}</span>
                        <span className={`text-xs font-mono font-bold ${config.text}`}>{score}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-1000 ease-out`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Action Button */}
          <ShimmerButton
            id="quiz-start-journey"
            type="button"
            onClick={onContinue}
            className="w-full py-3.5 text-sm"
            background="rgba(79, 70, 229, 1)"
            borderRadius="14px"
          >
            <span className="font-semibold">Start Speaking Journey</span>
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </ShimmerButton>
        </div>
      </motion.div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Quiz Page (Immersive Full Screen)
   ──────────────────────────────────────────── */

export default function Quiz() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const {
    currentIndex,
    currentQuestion,
    totalQuestions,
    answers,
    selectAnswer,
    goToNext,
    submitQuiz,
    result,
    loading,
    submitting,
    error,
    alreadyCompleted,
  } = useQuiz()

  // Redirect if already completed
  useEffect(() => {
    if (alreadyCompleted && result) {
      navigate('/home', { replace: true })
    }
  }, [alreadyCompleted, result, navigate])

  // Handle answer submission
  const handleSubmit = useCallback(
    async (lastQuestionId, lastAnswer) => {
      try {
        selectAnswer(lastQuestionId, lastAnswer)
        await new Promise((resolve) => setTimeout(resolve, 300))
        const quizResult = await submitQuiz()

        if (quizResult) {
          dispatch(setOnboardingCompleted(true))
          if (user) {
            dispatch(
              setUser({
                ...user,
                englishLevel: quizResult.assessedLevel,
                onboardingCompleted: true,
              })
            )
          }
        }
      } catch (err) {
        console.error('Quiz submission failed:', err)
      }
    },
    [submitQuiz, selectAnswer, dispatch, user]
  )

  // Handle answer selection
  const handleSelectAnswer = useCallback(
    (questionId, answer) => {
      selectAnswer(questionId, answer)

      setTimeout(() => {
        if (currentIndex < totalQuestions - 1) {
          goToNext()
        } else {
          handleSubmit(questionId, answer)
        }
      }, 450)
    },
    [currentIndex, totalQuestions, selectAnswer, goToNext, handleSubmit]
  )

  // Keyboard shortcut listener (A, B, C, D or 1, 2, 3, 4)
  useEffect(() => {
    if (!currentQuestion) return

    const handleKeyDown = (e) => {
      const selectedAnswer = answers[String(currentQuestion.id)]
      if (selectedAnswer) return // already answered

      const key = e.key.toUpperCase()
      const optionMap = {
        A: 0,
        B: 1,
        C: 2,
        D: 3,
        '1': 0,
        '2': 1,
        '3': 2,
        '4': 3,
      }

      if (key in optionMap) {
        const optionIndex = optionMap[key]
        if (currentQuestion.options[optionIndex]) {
          handleSelectAnswer(currentQuestion.id, currentQuestion.options[optionIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, answers, handleSelectAnswer])

  const handleContinue = useCallback(() => {
    navigate('/home', { replace: true })
  }, [navigate])

  /* ── Status views ── */
  if (loading) {
    return <AnalyzingScreen message="Preparing English diagnostic test…" />
  }

  if (error && !result) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />
  }

  if (submitting) {
    return <AnalyzingScreen message="Analyzing fluency and linguistic reflex…" />
  }

  if (result && !alreadyCompleted) {
    return <ResultScreen result={result} onContinue={handleContinue} />
  }

  if (!currentQuestion) {
    return <AnalyzingScreen />
  }

  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100
  const categoryConfig = CATEGORY_CONFIG[currentQuestion.category] || CATEGORY_CONFIG.grammar
  const selectedAnswer = answers[String(currentQuestion.id)]
  const formattedIndex = String(currentIndex + 1).padStart(2, '0')
  const formattedTotal = String(totalQuestions).padStart(2, '0')

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* ── Background Beams ── */}
      <BackgroundBeams />

      {/* ── Ambient Radial Glows ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      {/* ── Top Header & Progress HUD ── */}
      <header className="relative z-10 w-full max-w-4xl mx-auto flex items-center justify-between py-2">
        {/* Brand Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20">
            SU
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-tight">SpeakUp</span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono text-neutral-500">
              Fluency Assessment
            </span>
          </div>
        </div>

        {/* Category Pill */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${categoryConfig.bg} ${categoryConfig.border} border ${categoryConfig.text}`}>
          <span>{categoryConfig.icon}</span>
          <span className="font-semibold">{categoryConfig.label}</span>
        </div>

        {/* Question Counter */}
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="font-bold text-indigo-400">{formattedIndex}</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-500">{formattedTotal}</span>
        </div>
      </header>

      {/* ── Central Progress Bar ── */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-3">
        <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400 transition-all duration-400 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ── Main Stage (Distraction-Free) ── */}
      <main className="relative z-10 w-full max-w-3xl mx-auto my-auto py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full"
          >
            {/* Question prompt badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-neutral-400 text-xs font-mono mb-4">
              <span>Question {currentIndex + 1}</span>
            </div>

            {/* Question Text */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug mb-8 text-pretty">
              {currentQuestion.question}
            </h2>

            {/* Answer Cards */}
            <div className="space-y-3" role="radiogroup" aria-label={`Question ${currentIndex + 1}`}>
              {currentQuestion.options.map((option, optIdx) => {
                const isSelected = selectedAnswer === option
                const optionLetter = String.fromCharCode(65 + optIdx) // A, B, C, D

                return (
                  <button
                    key={`${currentQuestion.id}-${optIdx}`}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    id={`quiz-option-${currentQuestion.id}-${optIdx}`}
                    onClick={() => {
                      if (!selectedAnswer) {
                        handleSelectAnswer(currentQuestion.id, option)
                      }
                    }}
                    disabled={!!selectedAnswer}
                    className={`group w-full flex items-center justify-between p-4 sm:p-4.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/80 shadow-[0_0_25px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500/60 scale-[1.01]'
                        : selectedAnswer
                        ? 'bg-white/[0.02] border-white/[0.04] opacity-40 cursor-not-allowed'
                        : 'bg-neutral-900/60 border-white/[0.08] hover:bg-white/[0.05] hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.12)]'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Keyboard Keycap Letter */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                          : 'bg-white/[0.06] border border-white/[0.10] text-neutral-300 group-hover:text-white group-hover:border-white/[0.2]'
                      }`}>
                        {optionLetter}
                      </div>

                      {/* Option Text */}
                      <span className={`text-sm sm:text-base font-medium leading-relaxed transition-colors ${
                        isSelected ? 'text-white font-semibold' : 'text-neutral-200 group-hover:text-white'
                      }`}>
                        {option}
                      </span>
                    </div>

                    {/* Selection Checkmark */}
                    <div className="ml-4 shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-white/[0.15] group-hover:border-white/[0.3] transition-colors" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer Hints ── */}
      <footer className="relative z-10 w-full max-w-4xl mx-auto py-3 flex items-center justify-between text-xs text-neutral-500">
        <div className="hidden sm:flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] font-mono text-[10px] text-neutral-400">A</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] font-mono text-[10px] text-neutral-400">B</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] font-mono text-[10px] text-neutral-400">C</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] font-mono text-[10px] text-neutral-400">D</kbd>
          <span className="ml-1">Press keys to answer instantly</span>
        </div>
        <div className="flex items-center gap-2 mx-auto sm:mx-0">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span>Automatic progression upon selection</span>
        </div>
      </footer>
    </div>
  )
}
