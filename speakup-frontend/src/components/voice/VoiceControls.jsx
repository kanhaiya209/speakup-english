import { ACTIVE_STATES, VOICE_STATE } from '../../config/voice'

const OUTLINE_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-transparent px-3.5 py-2 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50'

const DANGER_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-control border border-danger/30 bg-transparent px-3.5 py-2 text-sm text-danger transition-colors hover:border-danger/60 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Pause and end. There is deliberately no Send: the tutor answers when the learner stops
 * talking, and adding a button would only make people wait for it.
 */
export default function VoiceControls({ status, onPause, onResume, onEnd }) {
  const isActive = ACTIVE_STATES.includes(status)
  const isPaused = status === VOICE_STATE.PAUSED
  const isEnding = status === VOICE_STATE.ENDING

  if (!isActive && !isEnding) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isPaused ? (
        <button type="button" onClick={onResume} className={OUTLINE_BUTTON} disabled={isEnding}>
          Resume
        </button>
      ) : (
        <button type="button" onClick={onPause} className={OUTLINE_BUTTON} disabled={isEnding}>
          Pause
        </button>
      )}

      <button type="button" onClick={onEnd} className={DANGER_BUTTON} disabled={isEnding}>
        {isEnding && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {isEnding ? 'Saving' : 'End session'}
      </button>
    </div>
  )
}
