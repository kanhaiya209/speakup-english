import { useEffect, useRef, useState } from 'react'
import { parseInstant } from '../../api/conversationApi'
import { VOICE_STATE, VOICE_STATE_LABEL } from '../../config/voice'

/** Dot colour per state. The success token is used only here, as a status dot. */
const DOT_CLASS = {
  [VOICE_STATE.IDLE]: 'bg-faint',
  [VOICE_STATE.STARTING]: 'bg-muted',
  [VOICE_STATE.LISTENING]: 'bg-success',
  [VOICE_STATE.USER_SPEAKING]: 'bg-success',
  [VOICE_STATE.USER_FINISHED]: 'bg-muted',
  [VOICE_STATE.PROCESSING_AI]: 'bg-muted',
  [VOICE_STATE.AI_SPEAKING]: 'bg-white',
  [VOICE_STATE.WAITING_FOR_USER]: 'bg-success',
  [VOICE_STATE.PAUSED]: 'bg-faint',
  [VOICE_STATE.ENDING]: 'bg-muted',
  [VOICE_STATE.ENDED]: 'bg-faint',
  [VOICE_STATE.ERROR]: 'bg-danger',
}

/** States that are genuinely waiting on the network or the model. */
const BUSY_STATES = [VOICE_STATE.STARTING, VOICE_STATE.PROCESSING_AI, VOICE_STATE.ENDING]

function formatElapsed(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * The one place that says what the conversation is doing right now, plus how long the
 * session has been running.
 */
export default function VoiceStatus({ status, startedAt }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)

  const isBusy = BUSY_STATES.includes(status)
  const isRunning = Boolean(startedAt) && status !== VOICE_STATE.ENDED && status !== VOICE_STATE.ERROR

  useEffect(() => {
    if (!startedAt) {
      startRef.current = null
      return undefined
    }

    const started = parseInstant(startedAt)
    startRef.current = started ? started.getTime() : Date.now()

    const tick = () => setElapsed(Math.max(0, Math.round((Date.now() - startRef.current) / 1000)))
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2">
        {isBusy ? (
          <svg
            className="h-3.5 w-3.5 animate-spin text-muted"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_CLASS[status] || 'bg-faint'}`}
            aria-hidden="true"
          />
        )}
        <span className="text-sm text-fg" aria-live="polite">
          {VOICE_STATE_LABEL[status] || 'Ready'}
        </span>
      </span>

      {isRunning && (
        <>
          <span className="h-3.5 w-px bg-line" aria-hidden="true" />
          <span className="text-sm text-muted">
            <span className="sr-only">Session length </span>
            {formatElapsed(elapsed)}
          </span>
        </>
      )}
    </div>
  )
}
