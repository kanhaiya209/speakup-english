import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import api from '../api/axiosConfig'
import {
  describeApiError,
  endConversation,
  endConversationOnUnload,
  requestNudge,
  sendUtterance,
  startConversation,
} from '../api/conversationApi'
import {
  MAX_UTTERANCE_CHARS,
  SILENCE_PROMPT_MS,
  SPEECH_END_DELAY_MS,
  VOICE_STATE,
  detectVoiceSupport,
} from '../config/voice'
import { setUser } from '../store/authSlice'
import { historyInvalidated, sessionSaved } from '../store/voiceSlice'
import useSpeechRecognition from './useSpeechRecognition'
import useSpeechSynthesis from './useSpeechSynthesis'

/** Recognition is open and the learner has not started a phrase yet. */
const AWAITING_SPEECH = [VOICE_STATE.WAITING_FOR_USER, VOICE_STATE.LISTENING]

/**
 * The only states in which a recognition result belongs to the current turn.
 *
 * `stop()` deliberately lets a phrase in progress finalise, so a result can arrive after the
 * microphone has been closed — while the tutor is already speaking, or after the learner
 * paused. Accepting it there would send a turn mid-reply, so it is dropped instead.
 */
const ACCEPTS_SPEECH = [
  VOICE_STATE.WAITING_FOR_USER,
  VOICE_STATE.LISTENING,
  VOICE_STATE.USER_SPEAKING,
]

/** Turns a getUserMedia rejection into something a learner can act on. */
function describeMicError(error) {
  switch (error?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access was blocked. Allow it in your browser’s address bar, then start again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No microphone was found. Connect one and start again.'
    case 'NotReadableError':
      return 'Your microphone is being used by another app. Close it and start again.'
    default:
      return 'The microphone could not be started. Check your browser’s microphone settings and try again.'
  }
}

/**
 * The whole conversation, as one state machine.
 *
 * The turn order is: tutor speaks → recognition opens → learner speaks → a pause of
 * {@link SPEECH_END_DELAY_MS} ends the turn → the backend replies → tutor speaks. There is
 * no Send button, and nothing else may run in between.
 *
 * The invariants the refs exist to hold:
 *
 * - Recognition is never open while the tutor is speaking. The Web Speech API has no echo
 *   cancellation, so a live microphone would transcribe the tutor and reply to itself.
 * - One request per turn — `turnInFlightRef` gates both /turn and /nudge.
 * - A timer armed for an earlier turn cannot fire into a later one: each captures the
 *   `epochRef` value it was armed under, and starting or ending a session bumps the epoch.
 * - The silence nudge never interrupts. It only fires from a state where the microphone is
 *   open and nothing has been said.
 *
 * A handful of callbacks are reached through refs (`armSpeechEndTimerRef`, `failSessionRef`,
 * `runNudgeRef`) because the recogniser's event handlers and the machine's timers form a
 * cycle. The refs are assigned in effects, so they are always set before any event can fire.
 */
export default function useVoiceConversation() {
  const dispatch = useDispatch()

  const [support] = useState(detectVoiceSupport)
  const [status, setStatus] = useState(VOICE_STATE.IDLE)
  const [messages, setMessages] = useState([])
  const [interim, setInterim] = useState('')
  const [session, setSession] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState(null)

  const statusRef = useRef(VOICE_STATE.IDLE)
  const sessionIdRef = useRef(null)
  const epochRef = useRef(0)
  const messageIdRef = useRef(0)
  const segmentsRef = useRef([])
  const interimRef = useRef('')
  const speechEndTimerRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const turnInFlightRef = useRef(false)
  const endingRef = useRef(false)
  const nudgeExhaustedRef = useRef(false)
  const unmountedRef = useRef(false)

  const armSpeechEndTimerRef = useRef(null)
  const failSessionRef = useRef(null)
  const runNudgeRef = useRef(null)

  const transition = useCallback((next) => {
    statusRef.current = next
    if (!unmountedRef.current) setStatus(next)
  }, [])

  const appendMessage = useCallback((message) => {
    if (!message || unmountedRef.current) return
    messageIdRef.current += 1
    const id = `m${messageIdRef.current}`
    setMessages((previous) => [...previous, { ...message, id }])
  }, [])

  const setInterimText = useCallback((text) => {
    interimRef.current = text
    if (!unmountedRef.current) setInterim(text)
  }, [])

  const clearSpeechEndTimer = useCallback(() => {
    if (speechEndTimerRef.current) {
      clearTimeout(speechEndTimerRef.current)
      speechEndTimerRef.current = null
    }
  }, [])

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  const clearTimers = useCallback(() => {
    clearSpeechEndTimer()
    clearSilenceTimer()
  }, [clearSilenceTimer, clearSpeechEndTimer])

  const markSpeechActivity = useCallback(() => {
    clearSilenceTimer()
    if (AWAITING_SPEECH.includes(statusRef.current)) {
      transition(VOICE_STATE.USER_SPEAKING)
    }
    armSpeechEndTimerRef.current?.()
  }, [clearSilenceTimer, transition])

  const {
    start: startRecognition,
    stop: stopRecognition,
    abort: abortRecognition,
    listening: micLive,
  } = useSpeechRecognition({
    onStarted: () => {
      if (statusRef.current === VOICE_STATE.WAITING_FOR_USER) {
        transition(VOICE_STATE.LISTENING)
      }
    },
    onSpeechStart: () => {
      if (!AWAITING_SPEECH.includes(statusRef.current)) return
      clearSilenceTimer()
      transition(VOICE_STATE.USER_SPEAKING)
    },
    onInterim: (text) => {
      if (endingRef.current || turnInFlightRef.current) return
      if (!ACCEPTS_SPEECH.includes(statusRef.current)) return
      setInterimText(text)
      if (text) markSpeechActivity()
    },
    onFinal: (text) => {
      if (endingRef.current || turnInFlightRef.current) return
      if (!ACCEPTS_SPEECH.includes(statusRef.current)) return
      segmentsRef.current.push(text)
      setInterimText('')
      markSpeechActivity()
    },
    onError: (code) => {
      if (endingRef.current) return
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        failSessionRef.current?.(
          'Microphone access was blocked. Allow it in your browser, then start a new session.',
        )
        return
      }
      if (code === 'audio-capture') {
        failSessionRef.current?.('Your microphone stopped working. Check it, then start a new session.')
        return
      }
      // 'network' and anything else: recognition restarts itself, so say so and carry on.
      setError({
        message: 'Speech recognition hiccuped. Keep talking — it is reconnecting.',
        fatal: false,
      })
    },
  })

  const { speak, cancel: cancelSpeech, speaking: ttsSpeaking } = useSpeechSynthesis()

  /** Tears the microphone and speaker down and parks the machine in a stated failure. */
  const failSession = useCallback((message) => {
    clearTimers()
    cancelSpeech()
    abortRecognition()
    setInterimText('')
    turnInFlightRef.current = false
    epochRef.current += 1
    setError({ message, fatal: true })
    transition(VOICE_STATE.ERROR)
  }, [abortRecognition, cancelSpeech, clearTimers, setInterimText, transition])

  useEffect(() => {
    failSessionRef.current = failSession
  }, [failSession])

  /**
   * Opens the microphone for the learner's turn and starts the silence clock. Every path
   * that finishes a tutor reply ends here — the single entry point back to listening.
   */
  const beginListening = useCallback(() => {
    if (endingRef.current || unmountedRef.current) return
    clearTimers()
    segmentsRef.current = []
    setInterimText('')
    transition(VOICE_STATE.WAITING_FOR_USER)
    startRecognition()

    if (nudgeExhaustedRef.current) return
    const epoch = epochRef.current
    silenceTimerRef.current = setTimeout(() => {
      silenceTimerRef.current = null
      if (epoch !== epochRef.current || unmountedRef.current) return
      runNudgeRef.current?.()
    }, SILENCE_PROMPT_MS)
  }, [clearTimers, setInterimText, startRecognition, transition])

  /** Speaks a tutor line, then hands the turn back to the learner. */
  const speakThenListen = useCallback((text) => {
    const epoch = epochRef.current
    transition(VOICE_STATE.AI_SPEAKING)
    speak(text, {
      onDone: () => {
        if (epoch !== epochRef.current || unmountedRef.current || endingRef.current) return
        beginListening()
      },
      onError: () => {
        if (epoch !== epochRef.current) return
        setError({
          message: 'Your browser could not speak that out loud. You can still read it below.',
          fatal: false,
        })
      },
    })
  }, [beginListening, speak, transition])

  /**
   * The learner has stopped talking. Sends the accumulated phrases as one turn.
   *
   * Recognition is stopped before the request goes out, so the microphone is already closed
   * by the time the reply is spoken.
   */
  const flushTurn = useCallback(() => {
    clearSpeechEndTimer()
    if (endingRef.current || turnInFlightRef.current || unmountedRef.current) return

    const spoken = segmentsRef.current.join(' ').replace(/\s+/g, ' ').trim()
    if (!spoken) {
      // The recogniser reported activity but produced no words — go back to waiting.
      beginListening()
      return
    }

    segmentsRef.current = []
    setInterimText('')
    clearSilenceTimer()
    turnInFlightRef.current = true
    transition(VOICE_STATE.USER_FINISHED)
    stopRecognition()
    transition(VOICE_STATE.PROCESSING_AI)

    const epoch = epochRef.current

    sendUtterance(sessionIdRef.current, spoken.slice(0, MAX_UTTERANCE_CHARS))
      .then((data) => {
        if (epoch !== epochRef.current || unmountedRef.current || endingRef.current) return
        nudgeExhaustedRef.current = false
        setError(null)
        appendMessage(data.learnerMessage)
        appendMessage(data.reply)
        speakThenListen(data.reply.content)
      })
      .catch((requestError) => {
        if (epoch !== epochRef.current || unmountedRef.current || endingRef.current) return
        const httpStatus = requestError?.response?.status

        if (httpStatus === 404) {
          failSession('This practice session has expired. Start a new one to keep going.')
          return
        }
        if (httpStatus === 409) {
          // A turn is already being handled — drop this one rather than duplicating it.
          beginListening()
          return
        }
        // The backend rolled the utterance back, so nothing is half-saved: ask for a repeat.
        setError({
          message: describeApiError(
            requestError,
            'The tutor could not answer that. Please say it again.',
          ),
          fatal: false,
        })
        beginListening()
      })
      .finally(() => {
        if (epoch === epochRef.current) turnInFlightRef.current = false
      })
  }, [
    appendMessage,
    beginListening,
    clearSilenceTimer,
    clearSpeechEndTimer,
    failSession,
    setInterimText,
    speakThenListen,
    stopRecognition,
    transition,
  ])

  /**
   * Ends the turn once the learner has been quiet for {@link SPEECH_END_DELAY_MS}. Re-armed
   * on every interim word, so it only fires at a genuine end of speech.
   */
  const armSpeechEndTimer = useCallback(() => {
    clearSpeechEndTimer()
    const epoch = epochRef.current
    speechEndTimerRef.current = setTimeout(() => {
      speechEndTimerRef.current = null
      if (epoch !== epochRef.current || unmountedRef.current) return
      flushTurn()
    }, SPEECH_END_DELAY_MS)
  }, [clearSpeechEndTimer, flushTurn])

  useEffect(() => {
    armSpeechEndTimerRef.current = armSpeechEndTimer
  }, [armSpeechEndTimer])

  /** The learner has gone quiet without saying anything. The tutor encourages them. */
  const runNudge = useCallback(() => {
    clearSilenceTimer()
    if (endingRef.current || unmountedRef.current) return
    if (turnInFlightRef.current || nudgeExhaustedRef.current) return
    if (!AWAITING_SPEECH.includes(statusRef.current)) return
    // Mid-phrase after all: let the speech-end timer take it.
    if (segmentsRef.current.length > 0 || interimRef.current) return

    turnInFlightRef.current = true
    stopRecognition()
    transition(VOICE_STATE.PROCESSING_AI)

    const epoch = epochRef.current

    requestNudge(sessionIdRef.current)
      .then((data) => {
        if (epoch !== epochRef.current || unmountedRef.current || endingRef.current) return
        appendMessage(data.reply)
        speakThenListen(data.reply.content)
      })
      .catch((requestError) => {
        if (epoch !== epochRef.current || unmountedRef.current || endingRef.current) return
        const httpStatus = requestError?.response?.status

        if (httpStatus === 404) {
          failSession('This practice session has expired. Start a new one to keep going.')
          return
        }
        // 429 means the tutor has already prompted enough — stop the clock and simply wait.
        if (httpStatus === 429) nudgeExhaustedRef.current = true
        beginListening()
      })
      .finally(() => {
        if (epoch === epochRef.current) turnInFlightRef.current = false
      })
  }, [
    appendMessage,
    beginListening,
    clearSilenceTimer,
    failSession,
    speakThenListen,
    stopRecognition,
    transition,
  ])

  useEffect(() => {
    runNudgeRef.current = runNudge
  }, [runNudge])

  /** Opens a session: permission, then greeting, then the learner's first turn. */
  const start = useCallback(async () => {
    if (statusRef.current === VOICE_STATE.STARTING) return
    if (!support.supported) {
      setError({
        message: `This browser cannot run voice practice (missing ${support.missing.join(', ')}). Chrome or Edge on desktop works best.`,
        fatal: true,
      })
      transition(VOICE_STATE.ERROR)
      return
    }

    epochRef.current += 1
    endingRef.current = false
    nudgeExhaustedRef.current = false
    turnInFlightRef.current = false
    segmentsRef.current = []
    sessionIdRef.current = null
    clearTimers()
    setError(null)
    setSummary(null)
    setMessages([])
    setInterimText('')
    setSession(null)
    transition(VOICE_STATE.STARTING)

    const epoch = epochRef.current

    // Requested explicitly so the browser prompt appears on a click, and released at once:
    // recognition opens its own stream, and holding a second one would keep the recording
    // indicator lit for no reason. No audio is read from this stream.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch (micError) {
      if (epoch !== epochRef.current || unmountedRef.current) return
      setError({ message: describeMicError(micError), fatal: true })
      transition(VOICE_STATE.ERROR)
      return
    }

    if (epoch !== epochRef.current || unmountedRef.current) return

    try {
      const data = await startConversation()
      if (epoch !== epochRef.current || unmountedRef.current) return
      sessionIdRef.current = data.sessionId
      setSession({ sessionId: data.sessionId, startedAt: data.startedAt })
      appendMessage(data.reply)
      speakThenListen(data.reply.content)
    } catch (requestError) {
      if (epoch !== epochRef.current || unmountedRef.current) return
      setError({
        message: describeApiError(requestError, 'Could not reach the AI tutor. Please try again.'),
        fatal: true,
      })
      transition(VOICE_STATE.ERROR)
    }
  }, [appendMessage, clearTimers, setInterimText, speakThenListen, support, transition])

  /** Closes the microphone and speaker without ending the session. */
  const pause = useCallback(() => {
    if (endingRef.current) return
    clearTimers()
    cancelSpeech()
    stopRecognition()
    setInterimText('')
    segmentsRef.current = []
    transition(VOICE_STATE.PAUSED)
  }, [cancelSpeech, clearTimers, setInterimText, stopRecognition, transition])

  const resume = useCallback(() => {
    if (endingRef.current || statusRef.current !== VOICE_STATE.PAUSED) return
    nudgeExhaustedRef.current = false
    beginListening()
  }, [beginListening])

  /**
   * Ends the session and saves it. The epoch bump abandons everything in flight, so a reply
   * that lands after this point cannot re-open the microphone.
   */
  const end = useCallback(async () => {
    if (endingRef.current) return
    endingRef.current = true
    epochRef.current += 1

    clearTimers()
    cancelSpeech()
    abortRecognition()
    setInterimText('')
    turnInFlightRef.current = false

    const sessionId = sessionIdRef.current
    sessionIdRef.current = null

    if (!sessionId) {
      transition(VOICE_STATE.IDLE)
      return
    }

    transition(VOICE_STATE.ENDING)

    try {
      const record = await endConversation(sessionId)
      if (unmountedRef.current) return
      setSummary(record)
      dispatch(sessionSaved(record))
    } catch (requestError) {
      if (unmountedRef.current) return
      setError({
        message: describeApiError(requestError, 'The session could not be saved.'),
        fatal: false,
      })
    }

    if (unmountedRef.current) return
    transition(VOICE_STATE.ENDED)

    // Practice minutes and the streak changed on the server; read the real numbers back
    // rather than guessing at them locally.
    try {
      const response = await api.get('/api/user/profile')
      if (!unmountedRef.current && response.data?.success && response.data.data) {
        dispatch(setUser(response.data.data))
      }
    } catch {
      /* The next page load will refresh it. */
    }
  }, [abortRecognition, cancelSpeech, clearTimers, dispatch, setInterimText, transition])

  const dismissError = useCallback(() => {
    setError((previous) => (previous && previous.fatal ? previous : null))
  }, [])

  /** Returns to the pre-flight screen so the learner can start again. */
  const reset = useCallback(() => {
    epochRef.current += 1
    endingRef.current = false
    turnInFlightRef.current = false
    nudgeExhaustedRef.current = false
    segmentsRef.current = []
    sessionIdRef.current = null
    clearTimers()
    setMessages([])
    setInterimText('')
    setSummary(null)
    setSession(null)
    setError(null)
    transition(VOICE_STATE.IDLE)
  }, [clearTimers, setInterimText, transition])

  /** A hidden tab suspends recognition and synthesis, so park the session instead. */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      if (!sessionIdRef.current || endingRef.current) return
      if (statusRef.current === VOICE_STATE.PAUSED) return
      pause()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pause])

  /** Closing the tab still saves the transcript. */
  useEffect(() => {
    const handlePageHide = () => {
      if (sessionIdRef.current && !endingRef.current) {
        endConversationOnUnload(sessionIdRef.current)
      }
    }
    window.addEventListener('pagehide', handlePageHide)
    return () => window.removeEventListener('pagehide', handlePageHide)
  }, [])

  /**
   * Leaving the page mid-session saves it too. The recogniser and synthesiser clean
   * themselves up in their own hooks; the timers and the open session are this hook's job.
   */
  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      epochRef.current += 1
      if (speechEndTimerRef.current) clearTimeout(speechEndTimerRef.current)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      speechEndTimerRef.current = null
      silenceTimerRef.current = null
      if (sessionIdRef.current && !endingRef.current) {
        endConversationOnUnload(sessionIdRef.current)
        sessionIdRef.current = null
        // The server will save it, but the record never comes back through this page, so the
        // cached history list has to be refetched next time.
        dispatch(historyInvalidated())
      }
    }
  }, [dispatch])

  return {
    support,
    status,
    messages,
    interim,
    session,
    summary,
    error,
    micLive,
    ttsSpeaking,
    start,
    pause,
    resume,
    end,
    reset,
    dismissError,
  }
}
