import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useSelector } from 'react-redux'
import { synthesizeSpeech } from '../api/conversationApi'
import { TUTOR_VOICE } from '../config/voice'
import useSpeechSynthesis from './useSpeechSynthesis'

/**
 * Upper bound on how long a fetched clip may play before we assume the audio element stalled.
 * Only armed once playback has actually started — the request phase is bounded by the axios
 * timeout in {@link synthesizeSpeech} instead.
 */
function watchdogMsFor(text) {
  return 8000 + text.length * 130
}

/**
 * Speaks the tutor's lines, in whichever voice the learner has chosen.
 *
 * Presents exactly the contract {@link useSpeechSynthesis} does — `speak(text, { onStart,
 * onDone, onError })`, `cancel()`, `speaking`, `isSupported` — so the conversation state
 * machine swaps one for the other by changing an import and nothing else. `onDone` still runs
 * exactly once per call, and still does not run on cancel, because the canceller decides what
 * happens next.
 *
 * With `tutorVoice` set to browser (the default) this is a thin pass-through. With it set to
 * natural, each line is fetched from `POST /api/tts/speak` and played through an `Audio`
 * element under the same epoch-and-watchdog discipline the browser hook uses.
 *
 * **Every failure falls back to browser speech rather than going quiet.** A missing key, a spent
 * quota, blocked autoplay, a stalled clip — the line still gets spoken, and the learner is told
 * once, quietly, that they are hearing the browser voice. `onError` is deliberately not called
 * on those paths: the line was spoken, so the caller has nothing to report. A 503 means the
 * natural voice is not coming back, so the rest of the session skips the round-trip entirely.
 */
export default function useTutorVoice() {
  const tutorVoice = useSelector((state) => state.auth.user?.tutorVoice)

  // Destructured rather than kept as an object: these two are stable across renders, and the
  // object around them is not, so depending on the object would rebuild every callback in the
  // conversation state machine on every render.
  const {
    speak: speakInBrowser,
    cancel: cancelBrowser,
    speaking: browserSpeaking,
    isSupported,
  } = useSpeechSynthesis()

  const [naturalSpeaking, setNaturalSpeaking] = useState(false)

  const epochRef = useRef(0)
  const audioRef = useRef(null)
  const objectUrlRef = useRef(null)
  const watchdogRef = useRef(null)
  const unmountedRef = useRef(false)
  /** Set once the natural voice has proved unavailable — no point asking again. */
  const naturalOffRef = useRef(false)
  /** The learner is told about the fallback once per page, not once per turn. */
  const noticedRef = useRef(false)

  const wantsNatural = tutorVoice === TUTOR_VOICE.NATURAL

  /** Stops playback and releases the clip. Safe to call when nothing is playing. */
  const releaseAudio = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
    const audio = audioRef.current
    audioRef.current = null
    if (audio) {
      audio.onplay = null
      audio.onended = null
      audio.onerror = null
      try {
        audio.pause()
      } catch {
        /* Already stopped. */
      }
      audio.src = ''
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    epochRef.current += 1
    releaseAudio()
    if (!unmountedRef.current) setNaturalSpeaking(false)
    cancelBrowser()
  }, [cancelBrowser, releaseAudio])

  /** Says once, quietly, that the browser voice is standing in. */
  const noticeFallback = useCallback(() => {
    if (noticedRef.current) return
    noticedRef.current = true
    toast('Using your browser’s voice for this session.')
  }, [])

  const speak = useCallback((text, options = {}) => {
    const spoken = (text || '').trim()

    // `naturalOffRef` is read here rather than during render: whether the natural voice is
    // still worth trying only matters at the moment a line is spoken, and it changes nothing
    // that is displayed.
    if (!wantsNatural || naturalOffRef.current || !spoken) {
      speakInBrowser(text, options)
      return
    }

    epochRef.current += 1
    const epoch = epochRef.current
    const isStale = () => epoch !== epochRef.current || unmountedRef.current

    releaseAudio()
    cancelBrowser()

    /** Hands this one line to the browser voice, having said why once. */
    const fallBackToBrowser = () => {
      if (isStale()) return
      releaseAudio()
      setNaturalSpeaking(false)
      noticeFallback()
      speakInBrowser(spoken, options)
    }

    synthesizeSpeech(spoken)
      .then((audioData) => {
        if (isStale()) return

        const url = URL.createObjectURL(new Blob([audioData], { type: 'audio/mpeg' }))
        objectUrlRef.current = url
        const audio = new Audio(url)
        audioRef.current = audio

        const finish = () => {
          if (isStale()) return
          releaseAudio()
          setNaturalSpeaking(false)
          options.onDone?.()
        }

        audio.onplay = () => {
          if (isStale()) return
          setNaturalSpeaking(true)
          options.onStart?.()
          watchdogRef.current = setTimeout(() => {
            watchdogRef.current = null
            // The clip started but never ended. Advance rather than freeze the conversation.
            finish()
          }, watchdogMsFor(spoken))
        }
        audio.onended = finish
        audio.onerror = fallBackToBrowser

        // A rejected play() is the autoplay policy, or a codec the browser will not take.
        audio.play().catch(fallBackToBrowser)
      })
      .catch((requestError) => {
        if (isStale()) return
        // 503: no key, or the quota is spent. Nothing will change before the session ends.
        if (requestError?.voiceUnavailable) naturalOffRef.current = true
        fallBackToBrowser()
      })
  }, [cancelBrowser, noticeFallback, releaseAudio, speakInBrowser, wantsNatural])

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      epochRef.current += 1
      releaseAudio()
    }
  }, [releaseAudio])

  return {
    speak,
    cancel,
    speaking: browserSpeaking || naturalSpeaking,
    isSupported,
  }
}
