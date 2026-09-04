import { useCallback, useEffect, useRef, useState } from 'react'
import {
  RECOGNITION_RESTART_DELAY_MS,
  SPEECH_LANG,
  getSpeechRecognition,
} from '../config/voice'

/**
 * Wraps the Web Speech API recogniser and reports events. It holds no conversation policy:
 * deciding when a turn is over belongs to the orchestrator, which owns the timers.
 *
 * Two things the API gets wrong that this hook fixes:
 *
 * 1. `onresult` re-delivers the whole `results` list every time, so iterating from index 0
 *    duplicates every phrase. Iterating from `event.resultIndex` reports each phrase once.
 * 2. Chrome ends recognition on its own after a pause even with `continuous = true`, so
 *    `onend` restarts it while the caller still wants to listen — guarded against the
 *    `InvalidStateError` a double start throws.
 *
 * Callbacks are read from a ref that is refreshed every render, so handlers never see a
 * stale closure and the recogniser is never rebuilt just because a callback changed.
 */
export default function useSpeechRecognition(callbacks) {
  const [listening, setListening] = useState(false)

  const handlersRef = useRef(callbacks)
  const recognitionRef = useRef(null)
  const wantsToListenRef = useRef(false)
  const isRunningRef = useRef(false)
  const restartTimerRef = useRef(null)
  const unmountedRef = useRef(false)
  /** `launch` restarts itself from `onend`; the ref breaks that self-reference. */
  const launchRef = useRef(null)

  useEffect(() => {
    handlersRef.current = callbacks
  })

  const isSupported = Boolean(getSpeechRecognition())

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  /** Detaches every listener before dropping an instance, so nothing fires twice. */
  const teardownInstance = useCallback(() => {
    const instance = recognitionRef.current
    if (!instance) return
    instance.onstart = null
    instance.onresult = null
    instance.onerror = null
    instance.onend = null
    instance.onspeechstart = null
    recognitionRef.current = null
  }, [])

  const launch = useCallback(() => {
    const Recognition = getSpeechRecognition()
    if (!Recognition || isRunningRef.current) return

    const instance = new Recognition()
    instance.lang = SPEECH_LANG
    instance.continuous = true
    instance.interimResults = true
    instance.maxAlternatives = 1

    instance.onstart = () => {
      isRunningRef.current = true
      if (!unmountedRef.current) setListening(true)
      handlersRef.current?.onStarted?.()
    }

    instance.onspeechstart = () => {
      handlersRef.current?.onSpeechStart?.()
    }

    instance.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) {
          const finalText = transcript.trim()
          if (finalText) handlersRef.current?.onFinal?.(finalText)
        } else {
          interim += transcript
        }
      }
      // Reported even when empty, so the caller can clear a stale interim line.
      handlersRef.current?.onInterim?.(interim.trim())
    }

    instance.onerror = (event) => {
      // `no-speech` and `aborted` are routine: a quiet moment, or our own stop() call.
      const routine = event.error === 'no-speech' || event.error === 'aborted'
      if (!routine) {
        handlersRef.current?.onError?.(event.error)
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantsToListenRef.current = false
      }
    }

    instance.onend = () => {
      isRunningRef.current = false
      if (!unmountedRef.current) setListening(false)
      teardownInstance()

      if (wantsToListenRef.current && !unmountedRef.current) {
        clearRestartTimer()
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null
          if (wantsToListenRef.current && !unmountedRef.current) launchRef.current?.()
        }, RECOGNITION_RESTART_DELAY_MS)
      } else {
        handlersRef.current?.onStopped?.()
      }
    }

    recognitionRef.current = instance

    try {
      instance.start()
    } catch {
      // Thrown when an instance is already running. Recovering by dropping this one and
      // letting the running instance keep going is correct — never surface it.
      isRunningRef.current = false
      teardownInstance()
    }
  }, [clearRestartTimer, teardownInstance])

  useEffect(() => {
    launchRef.current = launch
  }, [launch])

  /** Begins (or resumes) continuous listening. Safe to call when already listening. */
  const start = useCallback(() => {
    if (!isSupported) return
    wantsToListenRef.current = true
    clearRestartTimer()
    if (!isRunningRef.current) launch()
  }, [clearRestartTimer, isSupported, launch])

  /** Stops listening and does not auto-restart. */
  const stop = useCallback(() => {
    wantsToListenRef.current = false
    clearRestartTimer()
    const instance = recognitionRef.current
    if (!instance) return
    try {
      // stop() lets a phrase in progress finalise; abort() would discard it.
      instance.stop()
    } catch {
      try {
        instance.abort()
      } catch {
        /* Already dead. */
      }
    }
  }, [clearRestartTimer])

  /** Stops immediately and discards anything in flight — used when tearing down. */
  const abort = useCallback(() => {
    wantsToListenRef.current = false
    clearRestartTimer()
    const instance = recognitionRef.current
    if (!instance) return
    try {
      instance.abort()
    } catch {
      /* Already dead. */
    }
    teardownInstance()
    isRunningRef.current = false
  }, [clearRestartTimer, teardownInstance])

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      wantsToListenRef.current = false
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current)
        restartTimerRef.current = null
      }
      const instance = recognitionRef.current
      if (instance) {
        instance.onstart = null
        instance.onresult = null
        instance.onerror = null
        instance.onend = null
        instance.onspeechstart = null
        try {
          instance.abort()
        } catch {
          /* Already dead. */
        }
        recognitionRef.current = null
      }
      isRunningRef.current = false
    }
  }, [])

  return { start, stop, abort, listening, isSupported }
}
