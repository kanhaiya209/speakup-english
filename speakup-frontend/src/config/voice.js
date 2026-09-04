/**
 * Every tuning knob for the voice conversation lives here, so timing can be adjusted
 * without reading the state machine.
 */

/**
 * How long the recogniser must go quiet after a finalised phrase before the turn is
 * handed to the tutor. Too short and it cuts people off mid-thought; too long and the
 * conversation drags.
 */
export const SPEECH_END_DELAY_MS = 1300

/** Silence with no speech at all before the tutor gently prompts the learner. */
export const SILENCE_PROMPT_MS = 8000

/** Pause before restarting recognition after the browser ends it on its own. */
export const RECOGNITION_RESTART_DELAY_MS = 250

/** Recognition and synthesis locale. Indian English is what SpeakUp's learners speak. */
export const SPEECH_LANG = 'en-IN'

/** Voice locales to try, most preferred first, when picking a synthesis voice. */
export const PREFERRED_VOICE_LANGS = ['en-IN', 'en-GB', 'en-AU', 'en-US', 'en']

/** Slightly under natural pace — easier for a learner to follow. */
export const TTS_RATE = 0.95
export const TTS_PITCH = 1

/**
 * Chrome silently truncates long utterances, so replies are spoken in sentence-sized
 * chunks queued back to back.
 */
export const TTS_CHUNK_CHARS = 180

/** Mirrors the backend's own cap, so an over-long utterance is trimmed before the request. */
export const MAX_UTTERANCE_CHARS = 1000

/** The one state a session can be in. The UI renders directly from this. */
export const VOICE_STATE = {
  IDLE: 'idle',
  STARTING: 'starting',
  LISTENING: 'listening',
  USER_SPEAKING: 'userSpeaking',
  USER_FINISHED: 'userFinished',
  PROCESSING_AI: 'processingAi',
  AI_SPEAKING: 'aiSpeaking',
  WAITING_FOR_USER: 'waitingForUser',
  PAUSED: 'paused',
  ENDING: 'ending',
  ENDED: 'ended',
  ERROR: 'error',
}

/** Human-readable label for each state, shown next to the status dot. */
export const VOICE_STATE_LABEL = {
  [VOICE_STATE.IDLE]: 'Not started',
  [VOICE_STATE.STARTING]: 'Connecting',
  [VOICE_STATE.LISTENING]: 'Listening',
  [VOICE_STATE.USER_SPEAKING]: 'Hearing you',
  [VOICE_STATE.USER_FINISHED]: 'Got it',
  [VOICE_STATE.PROCESSING_AI]: 'Thinking',
  [VOICE_STATE.AI_SPEAKING]: 'Tutor speaking',
  [VOICE_STATE.WAITING_FOR_USER]: 'Your turn',
  [VOICE_STATE.PAUSED]: 'Paused',
  [VOICE_STATE.ENDING]: 'Saving session',
  [VOICE_STATE.ENDED]: 'Session ended',
  [VOICE_STATE.ERROR]: 'Something went wrong',
}

/** States in which a live session exists and the controls should be shown. */
export const ACTIVE_STATES = [
  VOICE_STATE.LISTENING,
  VOICE_STATE.USER_SPEAKING,
  VOICE_STATE.USER_FINISHED,
  VOICE_STATE.PROCESSING_AI,
  VOICE_STATE.AI_SPEAKING,
  VOICE_STATE.WAITING_FOR_USER,
  VOICE_STATE.PAUSED,
]

/** The vendor-prefixed constructor is still the only one Chrome and Safari expose. */
export function getSpeechRecognition() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/**
 * What this browser can actually do. Called before a session starts so the learner gets a
 * straight answer instead of a dead microphone button.
 */
export function detectVoiceSupport() {
  if (typeof window === 'undefined') {
    return { supported: false, recognition: false, synthesis: false, microphone: false, missing: [] }
  }

  const recognition = Boolean(getSpeechRecognition())
  const synthesis = typeof window.speechSynthesis !== 'undefined'
  const microphone = Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

  const missing = []
  if (!recognition) missing.push('speech recognition')
  if (!synthesis) missing.push('speech synthesis')
  if (!microphone) missing.push('microphone access')

  return {
    supported: recognition && synthesis && microphone,
    recognition,
    synthesis,
    microphone,
    missing,
  }
}
