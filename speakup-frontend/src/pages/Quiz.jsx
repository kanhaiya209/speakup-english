import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setUser, setOnboardingCompleted } from '../store/authSlice'
import useQuiz from '../hooks/useQuiz'

/* ── Static copy for question categories and assessed levels ── */

const CATEGORY_LABELS = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  comprehension: 'Comprehension',
}

const LEVEL_CONFIG = {
  beginner: {
    label: 'Beginner',
    cefr: 'CEFR A1–A2',
    description: 'We will focus on core vocabulary, everyday sentences, and speaking confidence.',
  },
  intermediate: {
    label: 'Intermediate',
    cefr: 'CEFR B1–B2',
    description: 'We will sharpen conversation flow, spontaneous speaking, and professional idiom.',
  },
  advanced: {
    label: 'Advanced',
    cefr: 'CEFR C1–C2',
    description: 'We will polish executive communication, complex arguments, and native nuance.',
  },
}

/* ── Shared styles ── */

const cardClass = 'rounded-card border border-line bg-surface'

const primaryButtonClass =
  'flex w-full cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90'

const outlineButtonClass =
  'flex w-full cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-transparent px-4 py-2.5 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2'

function Spinner({ className = 'h-5 w-5' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* ── Loading ── */

function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="h-5 w-5 text-muted" />
        <p className="text-sm text-muted">{message}</p>
      </div>
    </div>
  )
}

/* ── Error ── */

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className={`w-full max-w-[400px] ${cardClass} p-6 sm:p-8`}>
        <h2 className="text-base font-medium text-fg">Something went wrong</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className={`mt-6 ${outlineButtonClass}`}>
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Result ── */

function ResultScreen({ result, onContinue }) {
  const level = LEVEL_CONFIG[result.assessedLevel] || LEVEL_CONFIG.beginner
  const categories = Object.entries(result.categoryScores || {})

  return (
    <div className="min-h-screen bg-canvas px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <p className="text-sm text-muted">Assessment complete</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Your English profile</h1>
          <p className="mt-2 text-sm text-muted">
            Your learning path is now tuned to the level below.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={`${cardClass} flex flex-col justify-center p-5`}>
            <p className="text-sm text-muted">Score</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-fg">{result.score}%</p>
            <p className="mt-1 text-xs text-muted">
              {result.correctAnswers} of {result.totalQuestions} correct
            </p>
          </div>

          <div className={`${cardClass} p-5 sm:col-span-2`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Assessed level</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-fg">{level.label}</p>
              </div>
              <span className="shrink-0 rounded-control border border-line bg-canvas px-2 py-0.5 text-xs text-muted">
                {level.cefr}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{level.description}</p>
          </div>
        </div>

        {categories.length > 0 && (
          <section className={`mt-4 ${cardClass} p-5`}>
            <h2 className="text-sm font-medium text-fg">Breakdown by category</h2>
            <div className="mt-5 space-y-4">
              {categories.map(([category, score]) => (
                <div key={category}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-muted capitalize">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                    <span className="text-sm text-fg">{score}%</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-white" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8">
          <button type="button" id="quiz-start-journey" onClick={onContinue} className={primaryButtonClass}>
            Start speaking journey
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Quiz page ── */

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
    return <LoadingScreen message="Preparing your assessment…" />
  }

  if (error && !result) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />
  }

  if (submitting) {
    return <LoadingScreen message="Scoring your answers…" />
  }

  if (result && !alreadyCompleted) {
    return <ResultScreen result={result} onContinue={handleContinue} />
  }

  if (!currentQuestion) {
    return <LoadingScreen />
  }

  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100
  const categoryLabel = CATEGORY_LABELS[currentQuestion.category] || currentQuestion.category
  const selectedAnswer = answers[String(currentQuestion.id)]

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <span className="text-[15px] font-semibold tracking-tight text-fg">SpeakUp</span>
          <div className="flex items-center gap-3">
            {categoryLabel && (
              <span className="hidden rounded-control border border-line bg-surface px-2 py-0.5 text-xs text-muted capitalize sm:inline-block">
                {categoryLabel}
              </span>
            )}
            <span className="text-xs text-muted">
              Question {currentIndex + 1} of {totalQuestions}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="h-0.5 w-full bg-line">
          <div
            className="h-full bg-white transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* Question */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 sm:px-6 sm:py-14">
        <div className={`w-full ${cardClass} p-6 sm:p-8`}>
          <h1 className="text-lg leading-snug font-medium text-fg sm:text-xl">
            {currentQuestion.question}
          </h1>

          <div
            className="mt-6 space-y-2"
            role="radiogroup"
            aria-label={`Question ${currentIndex + 1} of ${totalQuestions}`}
          >
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = selectedAnswer === option
              const optionLetter = String.fromCharCode(65 + optIdx)
              const isDimmed = !!selectedAnswer && !isSelected

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
                  className={`flex w-full items-center gap-3.5 rounded-control border px-3.5 py-3 text-left transition-colors ${
                    isSelected
                      ? 'border-line-strong bg-surface-2 text-fg'
                      : isDimmed
                        ? 'cursor-not-allowed border-line bg-canvas text-muted opacity-40'
                        : 'cursor-pointer border-line bg-canvas text-muted hover:border-line-strong hover:text-fg'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-control border text-xs ${
                      isSelected ? 'border-line-strong bg-canvas text-fg' : 'border-line text-muted'
                    }`}
                    aria-hidden="true"
                  >
                    {optionLetter}
                  </span>
                  <span className="text-sm leading-relaxed">{option}</span>
                </button>
              )
            })}
          </div>
        </div>
      </main>

      {/* Footer hint */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-1.5">
            {['A', 'B', 'C', 'D'].map((key) => (
              <kbd
                key={key}
                className="rounded-control border border-line bg-surface px-1.5 py-0.5 text-[10px] text-muted"
              >
                {key}
              </kbd>
            ))}
            <span className="ml-1.5 text-xs text-muted">Press a key to answer</span>
          </div>
          <span className="text-xs text-muted">Advances automatically</span>
        </div>
      </footer>
    </div>
  )
}
