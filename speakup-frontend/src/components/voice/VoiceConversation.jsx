import { useState } from 'react'
import { useSelector } from 'react-redux'
import { SILENCE_PROMPT_MS, VOICE_STATE } from '../../config/voice'
import useVoiceConversation from '../../hooks/useVoiceConversation'
import ConversationTranscript from './ConversationTranscript'
import ModePicker from './ModePicker'
import SessionSummary from './SessionSummary'
import VoiceControls from './VoiceControls'
import VoiceStatus from './VoiceStatus'

const PRIMARY_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50'

const PILL =
  'inline-flex items-center rounded-control border border-line bg-canvas px-2 py-0.5 text-xs text-muted'

/** States in which the transcript panel is the thing on screen. */
const LIVE_STATES = [
  VOICE_STATE.LISTENING,
  VOICE_STATE.USER_SPEAKING,
  VOICE_STATE.USER_FINISHED,
  VOICE_STATE.PROCESSING_AI,
  VOICE_STATE.AI_SPEAKING,
  VOICE_STATE.WAITING_FOR_USER,
  VOICE_STATE.PAUSED,
  VOICE_STATE.ENDING,
]

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Bullet({ children }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden="true" />
      <span className="text-sm text-muted">{children}</span>
    </li>
  )
}

/**
 * The voice practice surface: pre-flight, live conversation, summary.
 *
 * All conversation logic lives in {@link useVoiceConversation}; this component only decides
 * what to show for the current state.
 */
export default function VoiceConversation({ onLeave }) {
  const user = useSelector((state) => state.auth.user)
  /**
   * Null until the learner picks a mode, which is not an empty selection: the backend uses the
   * mode recommended for their learning goal when none is sent, and the picker shows that mode
   * as the selected one.
   */
  const [mode, setMode] = useState(null)
  const {
    support,
    status,
    messages,
    interim,
    session,
    summary,
    error,
    micLive,
    start,
    pause,
    resume,
    end,
    reset,
    dismissError,
  } = useVoiceConversation()

  const isStarting = status === VOICE_STATE.STARTING
  const isLive = LIVE_STATES.includes(status)
  const showPreflight = status === VOICE_STATE.IDLE || isStarting
  const silenceSeconds = Math.round(SILENCE_PROMPT_MS / 1000)
  const startSession = () => start(mode)

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="flex items-start justify-between gap-3 rounded-control border border-danger/30 bg-danger/10 px-3 py-2.5"
          role="alert"
        >
          <p className="text-sm text-danger">{error.message}</p>
          {!error.fatal && (
            <button
              type="button"
              onClick={dismissError}
              aria-label="Dismiss message"
              className="shrink-0 cursor-pointer rounded-control p-0.5 text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {!support.supported && (
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-base text-fg">Voice practice needs a different browser</h2>
          <p className="mt-2 text-sm text-muted">
            This browser is missing {support.missing.join(' and ')}. Voice practice works in
            Chrome or Edge on a desktop, and in Chrome on Android.
          </p>
        </div>
      )}

      {support.supported && showPreflight && (
        <div className="rounded-card border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base text-fg">Speak with your AI tutor</h2>
              <p className="mt-1 text-sm text-muted">
                A real conversation, out loud. No typing, no send button.
              </p>
            </div>
            {user?.englishLevel && (
              <span className="inline-flex items-center rounded-control border border-line bg-canvas px-2 py-0.5 text-xs capitalize text-muted">
                {user.englishLevel}
              </span>
            )}
          </div>

          <ul className="mt-5 space-y-2.5">
            <Bullet>Your browser will ask to use the microphone. Allow it once.</Bullet>
            <Bullet>Just talk. The tutor replies as soon as you stop speaking.</Bullet>
            <Bullet>
              Go quiet for {silenceSeconds} seconds and the tutor will help you along.
            </Bullet>
            <Bullet>Everything you both say is written down below as you go.</Bullet>
          </ul>

          <div className="mt-5 border-t border-line pt-5">
            <ModePicker value={mode} onChange={setMode} disabled={isStarting} />
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={startSession}
              disabled={isStarting}
              className={PRIMARY_BUTTON}
              id="voice-start-session"
            >
              {isStarting && <Spinner />}
              {isStarting ? 'Connecting' : 'Start conversation'}
            </button>
          </div>
        </div>
      )}

      {isLive && (
        <div className="rounded-card border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <VoiceStatus status={status} startedAt={session?.startedAt} />
              {session?.modeLabel && <span className={PILL}>{session.modeLabel}</span>}
            </div>
            <VoiceControls status={status} onPause={pause} onResume={resume} onEnd={end} />
          </div>
          <div className="px-5 py-5">
            <ConversationTranscript
              messages={messages}
              interim={interim}
              isListening={micLive && status !== VOICE_STATE.PAUSED}
            />
            {status === VOICE_STATE.PAUSED && (
              <p className="mt-4 text-xs text-muted">
                The microphone is off. Resume when you are ready to keep going.
              </p>
            )}
          </div>
        </div>
      )}

      {status === VOICE_STATE.ENDED && (
        <div className="rounded-card border border-line bg-surface p-5">
          <SessionSummary summary={summary} onRestart={startSession} onBack={onLeave} />
        </div>
      )}

      {status === VOICE_STATE.ERROR && (
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-base text-fg">The session stopped</h2>
          <p className="mt-1 text-sm text-muted">
            Nothing you said before this was lost — it is saved with the session.
          </p>
          <div className="mt-5">
            <button type="button" onClick={reset} className={PRIMARY_BUTTON}>
              Try again
            </button>
          </div>
        </div>
      )}

      {status === VOICE_STATE.ENDED && messages.length > 0 && (
        <div className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-sm text-fg">This session’s transcript</h2>
          <div className="mt-4">
            <ConversationTranscript messages={messages} interim="" isListening={false} />
          </div>
        </div>
      )}
    </div>
  )
}
