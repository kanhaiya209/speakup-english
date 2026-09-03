import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setUser, setOnboardingCompleted } from '../store/authSlice'
import useQuiz from '../hooks/useQuiz'

/* ────────────────────────────────────────────
   Spinner
   ──────────────────────────────────────────── */

function Spinner({ className = 'w-5 h-5' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
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
   Category Icons
   ──────────────────────────────────────────── */

const CATEGORY_CONFIG = {
  grammar: {
    icon: '📝',
    label: 'Grammar',
    gradient: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
  },
  vocabulary: {
    icon: '📚',
    label: 'Vocabulary',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-400',
  },
  comprehension: {
    icon: '🧠',
    label: 'Comprehension',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-400',
  },
}

/* ────────────────────────────────────────────
   Level Badge Config
   ──────────────────────────────────────────── */

const LEVEL_CONFIG = {
  beginner: {
    icon: '🌱',
    label: 'Beginner',
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/25',
    description: 'You\'re just getting started — we\'ll build your foundation!',
  },
  intermediate: {
    icon: '📘',
    label: 'Intermediate',
    gradient: 'from-blue-500 to-indigo-500',
    shadow: 'shadow-blue-500/25',
    description: 'Solid base! Let\'s sharpen your skills further.',
  },
  advanced: {
    icon: '🏆',
    label: 'Advanced',
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/25',
    description: 'Impressive! Let\'s polish your fluency to perfection.',
  },
}

/* ────────────────────────────────────────────
   Background Effects (shared across views)
   ──────────────────────────────────────────── */

function BackgroundEffects() {
  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>
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
    </>
  )
}

/* ────────────────────────────────────────────
   Loading Screen
   ──────────────────────────────────────────── */

function LoadingScreen({ message = 'Loading quiz...' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundEffects />
      <div className="relative z-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-6">
          <Spinner className="w-8 h-8 text-white" />
        </div>
        <p className="text-slate-300 text-sm font-medium animate-pulse">{message}</p>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Error Screen
   ──────────────────────────────────────────── */

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundEffects />
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-6">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              Try Again
            </button>
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
  const [showContent, setShowContent] = useState(false)
  const levelConfig = LEVEL_CONFIG[result.assessedLevel] || LEVEL_CONFIG.beginner

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundEffects />

      <div className={`relative z-10 w-full max-w-lg transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20">

          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br ${levelConfig.gradient} shadow-lg ${levelConfig.shadow} mb-5`}>
              <span className="text-4xl">{levelConfig.icon}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
              Quiz Complete! 🎉
            </h1>
            <p className="text-slate-400 text-sm">
              Here's how you did on the assessment
            </p>
          </div>

          {/* Score Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
                <circle
                  cx="64" cy="64" r="56"
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="8"
                />
                <circle
                  cx="64" cy="64" r="56"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${result.score * 3.52} ${352 - result.score * 3.52}`}
                  className="transition-all duration-1000 ease-out"
                  style={{ transitionDelay: '500ms' }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{result.score}%</span>
                <span className="text-xs text-slate-400 mt-0.5">
                  {result.correctAnswers}/{result.totalQuestions} correct
                </span>
              </div>
            </div>
          </div>

          {/* Assessed Level */}
          <div className={`mb-6 p-4 rounded-2xl bg-gradient-to-r ${levelConfig.gradient}/10 border border-white/[0.06]`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{levelConfig.icon}</span>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Your Level</p>
                <p className="text-lg font-bold text-white capitalize">{levelConfig.label}</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">{levelConfig.description}</p>
          </div>

          {/* Category Breakdown */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Category Breakdown
            </h3>
            <div className="space-y-3">
              {Object.entries(result.categoryScores || {}).map(([category, score]) => {
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.grammar
                return (
                  <div key={category} className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl ${config.bg} border ${config.border} shrink-0`}>
                      <span className="text-lg">{config.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-200">{config.label}</span>
                        <span className={`text-sm font-bold ${config.text}`}>{score}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${config.gradient} transition-all duration-1000 ease-out`}
                          style={{ width: `${score}%`, transitionDelay: '800ms' }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* CTA */}
          <button
            id="quiz-start-journey"
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          >
            <span>Start Your Journey</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        {/* Bottom badge */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Your personalized learning path is ready</span>
          </div>
        </div>
      </div>

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

/* ────────────────────────────────────────────
   Quiz Page (Main Component)
   ──────────────────────────────────────────── */

export default function Quiz() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const {
    questions,
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

  const [animating, setAnimating] = useState(false)
  const [slideDirection, setSlideDirection] = useState('in')

  // If quiz already completed, redirect to home
  useEffect(() => {
    if (alreadyCompleted && result) {
      navigate('/home', { replace: true })
    }
  }, [alreadyCompleted, result, navigate])

  // Handle answer selection with animation
  const handleSelectAnswer = useCallback((questionId, answer) => {
    selectAnswer(questionId, answer)

    // Animate transition after a short delay
    setTimeout(() => {
      if (currentIndex < totalQuestions - 1) {
        setSlideDirection('out')
        setAnimating(true)

        setTimeout(() => {
          goToNext()
          setSlideDirection('in')

          setTimeout(() => {
            setAnimating(false)
          }, 50)
        }, 300)
      } else {
        // Last question — trigger submit
        handleSubmit(questionId, answer)
      }
    }, 400)
  }, [currentIndex, totalQuestions, selectAnswer, goToNext])

  // Submit quiz
  const handleSubmit = useCallback(async (lastQuestionId, lastAnswer) => {
    try {
      // Make sure the last answer is included
      const finalAnswers = { ...answers, [String(lastQuestionId)]: lastAnswer }

      // Temporarily update answers state so submitQuiz has them
      selectAnswer(lastQuestionId, lastAnswer)

      // Small delay for the selection animation
      await new Promise(resolve => setTimeout(resolve, 300))

      const quizResult = await submitQuiz()

      // Update Redux store
      if (quizResult) {
        dispatch(setOnboardingCompleted(true))
        if (user) {
          dispatch(setUser({
            ...user,
            englishLevel: quizResult.assessedLevel,
            onboardingCompleted: true,
          }))
        }
      }
    } catch (err) {
      console.error('Quiz submission failed:', err)
    }
  }, [answers, submitQuiz, selectAnswer, dispatch, user])

  // Navigate to home after viewing results
  const handleContinue = useCallback(() => {
    navigate('/home', { replace: true })
  }, [navigate])

  /* ── Loading state ── */
  if (loading) {
    return <LoadingScreen />
  }

  /* ── Error state ── */
  if (error && !result) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />
  }

  /* ── Submitting state ── */
  if (submitting) {
    return <LoadingScreen message="Analyzing your answers..." />
  }

  /* ── Result state ── */
  if (result && !alreadyCompleted) {
    return <ResultScreen result={result} onContinue={handleContinue} />
  }

  /* ── Quiz state ── */
  if (!currentQuestion) {
    return <LoadingScreen />
  }

  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100
  const categoryConfig = CATEGORY_CONFIG[currentQuestion.category] || CATEGORY_CONFIG.grammar
  const selectedAnswer = answers[String(currentQuestion.id)]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      <BackgroundEffects />

      <div className="relative z-10 w-full max-w-lg">
        {/* ────────────────── Card ────────────────── */}
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20">

          {/* ── Progress section ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${categoryConfig.bg} ${categoryConfig.border} border ${categoryConfig.text}`}>
                  <span>{categoryConfig.icon}</span>
                  {categoryConfig.label}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* ── Question ── */}
          <div
            className={`transition-all duration-300 ${
              animating
                ? slideDirection === 'out'
                  ? 'opacity-0 -translate-x-8'
                  : 'opacity-0 translate-x-8'
                : 'opacity-100 translate-x-0'
            }`}
          >
            {/* Question number pill */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20">
                <span className="text-sm font-bold text-indigo-400">{currentIndex + 1}</span>
              </div>
            </div>

            {/* Question text */}
            <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed mb-6 text-pretty">
              {currentQuestion.question}
            </h2>

            {/* ── Option Cards ── */}
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
                    className={`group w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-500/15 border-indigo-500/40 shadow-sm shadow-indigo-500/10 scale-[1.02]'
                        : selectedAnswer
                          ? 'bg-white/[0.02] border-white/[0.04] opacity-50 cursor-not-allowed'
                          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] hover:scale-[1.01] cursor-pointer'
                    }`}
                  >
                    {/* Letter badge */}
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30'
                        : 'bg-white/[0.06] border border-white/[0.08] text-slate-400 group-hover:text-slate-200 group-hover:border-white/[0.12]'
                    }`}>
                      <span className="text-sm font-bold">{optionLetter}</span>
                    </div>

                    {/* Option text */}
                    <span className={`text-sm font-medium leading-relaxed transition-colors duration-200 ${
                      isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                    }`}>
                      {option}
                    </span>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="ml-auto shrink-0">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom badge ── */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs text-slate-500">Quick English level assessment</span>
          </div>
        </div>
      </div>

      {/* ── Custom keyframes ── */}
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
