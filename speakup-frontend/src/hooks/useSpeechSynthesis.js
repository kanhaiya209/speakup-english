import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PREFERRED_VOICE_LANGS,
  SPEECH_LANG,
  TTS_CHUNK_CHARS,
  TTS_PITCH,
  TTS_RATE,
} from '../config/voice'

/** Chrome needs a moment after cancel() before a new utterance will actually play. */
const CANCEL_SETTLE_MS = 80

/**
 * Upper bound on how long a chunk may take before we assume the synthesiser dropped it.
 * Chrome occasionally never fires `onend`, which would freeze the conversation on
 * "Tutor speaking" for ever.
 */
function watchdogMsFor(text) {
  return 5000 + text.length * 130
}

/**
 * Splits a reply into sentence-sized chunks. Chrome truncates long utterances, so a reply
 * is queued as several short ones instead of a single long one.
 */
function chunkText(text) {
  const sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) || [text]
  const chunks = []
  let current = ''

  for (const sentence of sentences) {
    const piece = sentence.trim()
    if (!piece) continue
    if (!current) {
      current = piece
    } else if (current.length + piece.length + 1 <= TTS_CHUNK_CHARS) {
      current = `${current} ${piece}`
    } else {
      chunks.push(current)
      current = piece
    }
  }
  if (current) chunks.push(current)
  return chunks
}

/**
 * Wraps `speechSynthesis` so the tutor can be heard.
 *
 * Every call to {@link speak} is stamped with an epoch. `cancel` bumps the epoch, so
 * callbacks belonging to speech that has been interrupted resolve to no-ops — that is what
 * stops two replies from overlapping and stops a cancelled reply from advancing the state
 * machine.
 */
export default function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)

  const epochRef = useRef(0)
  const timerRef = useRef(null)
  const watchdogRef = useRef(null)
  const voiceRef = useRef(null)
  const unmountedRef = useRef(false)

  const isSupported = typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined'

  /**
   * Voices load asynchronously in Chrome, so the first `getVoices()` is often empty. The
   * chosen voice is kept in a ref rather than state: it is not rendered, and writing it
   * from an effect would be a state update during render.
   */
  useEffect(() => {
    if (!isSupported) return undefined

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices || voices.length === 0) return
      for (const lang of PREFERRED_VOICE_LANGS) {
        const match = voices.find((voice) => voice.lang?.replace('_', '-').toLowerCase() === lang.toLowerCase())
          || voices.find((voice) => voice.lang?.toLowerCase().startsWith(lang.toLowerCase()))
        if (match) {
          voiceRef.current = match
          return
        }
      }
      voiceRef.current = voices.find((voice) => voice.default) || voices[0]
    }

    pickVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', pickVoice)
  }, [isSupported])

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  /** Stops any speech in progress and invalidates its callbacks. */
  const cancel = useCallback(() => {
    epochRef.current += 1
    clearTimers()
    if (isSupported) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* Nothing to cancel. */
      }
    }
    if (!unmountedRef.current) setSpeaking(false)
  }, [clearTimers, isSupported])

  /**
   * Speaks `text`, then calls `onDone`. `onDone` runs exactly once per call — on success,
   * on synthesiser error, or on watchdog timeout — so the caller can always advance. It is
   * not called when the speech is cancelled, because the canceller decides what happens next.
   */
  const speak = useCallback((text, options = {}) => {
    const { onStart, onDone, onError } = options
    const spoken = (text || '').trim()

    if (!isSupported || !spoken) {
      onDone?.()
      return
    }

    epochRef.current += 1
    const epoch = epochRef.current
    const isStale = () => epoch !== epochRef.current || unmountedRef.current

    clearTimers()
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* Nothing to cancel. */
    }

    const chunks = chunkText(spoken)

    const finish = () => {
      if (isStale()) return
      clearTimers()
      setSpeaking(false)
      onDone?.()
    }

    const speakChunk = (index) => {
      if (isStale()) return

      const chunk = chunks[index]
      const utterance = new SpeechSynthesisUtterance(chunk)
      utterance.lang = voiceRef.current?.lang || SPEECH_LANG
      utterance.rate = TTS_RATE
      utterance.pitch = TTS_PITCH
      if (voiceRef.current) utterance.voice = voiceRef.current

      utterance.onstart = () => {
        if (isStale()) return
        if (index === 0) {
          setSpeaking(true)
          onStart?.()
        }
      }

      utterance.onend = () => {
        if (isStale()) return
        if (index + 1 < chunks.length) {
          speakChunk(index + 1)
        } else {
          finish()
        }
      }

      utterance.onerror = (event) => {
        if (isStale()) return
        // 'interrupted' and 'canceled' are our own cancel() landing late.
        if (event?.error === 'interrupted' || event?.error === 'canceled') return
        onError?.(event?.error || 'synthesis-failed')
        finish()
      }

      if (watchdogRef.current) clearTimeout(watchdogRef.current)
      watchdogRef.current = setTimeout(() => {
        watchdogRef.current = null
        if (isStale()) return
        try {
          window.speechSynthesis.cancel()
        } catch {
          /* Nothing to cancel. */
        }
        finish()
      }, watchdogMsFor(chunk))

      try {
        window.speechSynthesis.speak(utterance)
      } catch {
        finish()
      }
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null
      speakChunk(0)
    }, CANCEL_SETTLE_MS)
  }, [clearTimers, isSupported])

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      epochRef.current += 1
      if (timerRef.current) clearTimeout(timerRef.current)
      if (watchdogRef.current) clearTimeout(watchdogRef.current)
      timerRef.current = null
      watchdogRef.current = null
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel()
        } catch {
          /* Nothing to cancel. */
        }
      }
    }
  }, [])

  return { speak, cancel, speaking, isSupported }
}
