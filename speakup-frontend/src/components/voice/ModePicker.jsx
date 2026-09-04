import { useEffect, useState } from 'react'
import { fetchModes } from '../../api/conversationApi'

const optionClass = (selected) =>
  `flex w-full cursor-pointer items-center justify-between gap-3 rounded-control border px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-50 ${
    selected
      ? 'border-line-strong bg-surface-2 text-fg'
      : 'border-line bg-canvas text-muted hover:border-line-strong hover:text-fg'
  }`

const PILL =
  'inline-flex shrink-0 items-center rounded-control border border-line bg-canvas px-2 py-0.5 text-xs text-muted'

function SelectedDot({ visible }) {
  if (!visible) return null
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white" aria-hidden="true" />
}

/**
 * Picks the scenario the tutor plays for this session.
 *
 * The list comes from `GET /api/conversation/modes` rather than a local constant: the persona
 * prompt behind each mode lives on the server, and the ids are stored on every saved session.
 *
 * `value` is null until the learner chooses. That is not an empty selection — the backend uses
 * the mode recommended for their learning goal when `start` sends no mode, so the recommended
 * card is shown as selected and describes exactly what will happen. A failed load is not fatal
 * for the same reason, so it says so quietly instead of blocking the session.
 *
 * @param value    the chosen mode id, or null for "whatever is recommended"
 * @param onChange called with a mode id when the learner picks one
 * @param disabled true while a session is being opened
 */
export default function ModePicker({ value, onChange, disabled = false }) {
  const [modes, setModes] = useState([])
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    let active = true

    fetchModes()
      .then((list) => {
        if (active) setModes(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (active) setLoadFailed(true)
      })

    return () => {
      active = false
    }
  }, [])

  if (loadFailed) {
    return (
      <p className="text-xs text-muted">
        The practice modes could not be loaded. Your session will use the mode recommended for
        your learning goal.
      </p>
    )
  }

  if (modes.length === 0) {
    return <p className="text-xs text-muted">Loading practice modes…</p>
  }

  // No explicit choice means the recommended mode, which is what the backend will use.
  const activeId = value || modes.find((mode) => mode.recommended)?.id || modes[0].id

  return (
    <div>
      <span className="mb-2.5 block text-xs text-muted">Practice mode</span>
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Practice mode"
      >
        {modes.map((mode) => {
          const selected = mode.id === activeId
          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(mode.id)}
              className={optionClass(selected)}
            >
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{mode.label}</span>
                  {mode.recommended && <span className={PILL}>Recommended</span>}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{mode.description}</span>
              </span>
              <SelectedDot visible={selected} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
