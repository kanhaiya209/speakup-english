import { useState, useEffect, useCallback } from 'react'
import api from '../api/axiosConfig'

/**
 * Custom hook for managing the onboarding quiz flow.
 *
 * Provides:
 * - questions      — array of quiz questions from the backend
 * - currentIndex   — index of the currently displayed question
 * - currentQuestion — the current question object
 * - answers        — map of questionId → selected answer
 * - selectAnswer   — function to record an answer and auto-advance
 * - submitQuiz     — function to submit all answers to the backend
 * - result         — the quiz result after submission
 * - loading        — true while fetching questions or submitting
 * - submitting     — true specifically during quiz submission
 * - error          — error message string or null
 * - alreadyCompleted — true if user already has a quiz result
 */
export default function useQuiz() {
  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [alreadyCompleted, setAlreadyCompleted] = useState(false)

  // On mount: check if quiz already completed, then fetch questions
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        setLoading(true)
        setError(null)

        // 1. Check if user already completed the quiz
        try {
          const resultRes = await api.get('/api/quiz/result')
          if (!cancelled && resultRes.data.success && resultRes.data.data) {
            setResult(resultRes.data.data)
            setAlreadyCompleted(true)
            setLoading(false)
            return
          }
        } catch (err) {
  // 404 or 401 means quiz not completed yet — expected, continue
  if (err.response?.status !== 404 && err.response?.status !== 401) {
    throw err
  }
}

        // 2. Fetch quiz questions
        const questionsRes = await api.get('/api/quiz/questions')
        if (!cancelled && questionsRes.data.success) {
          setQuestions(questionsRes.data.data)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to initialize quiz:', err)
          setError(err.response?.data?.message || 'Failed to load quiz. Please try again.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const currentQuestion = questions[currentIndex] || null
  const totalQuestions = questions.length

  /**
   * Records the user's answer for the current question.
   * Auto-advances to the next question after a short delay.
   */
  const selectAnswer = useCallback((questionId, selectedAnswer) => {
    setAnswers((prev) => ({
      ...prev,
      [String(questionId)]: selectedAnswer,
    }))
  }, [])

  /**
   * Advances to the next question.
   */
  const goToNext = useCallback(() => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }, [currentIndex, totalQuestions])

  /**
   * Submits all answers to the backend.
   */
  const submitQuiz = useCallback(async () => {
    try {
      setSubmitting(true)
      setError(null)

      const response = await api.post('/api/quiz/submit', { answers })
      if (response.data.success) {
        setResult(response.data.data)
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Failed to submit quiz.')
      }
    } catch (err) {
      console.error('Quiz submission error:', err)
      const msg = err.response?.data?.message || err.message || 'Failed to submit quiz. Please try again.'
      setError(msg)
      throw err
    } finally {
      setSubmitting(false)
    }
  }, [answers])

  return {
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
  }
}
