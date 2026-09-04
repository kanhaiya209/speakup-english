import { formatDuration, formatMode } from './formatters'

/**
 * What the learner did, read straight off the saved session record. Nothing here is derived
 * from anything the browser guessed at — the backend timed the session, counted the words, and
 * scored the fluency from the transcript it actually stored.
 *
 * Every block below renders only when the backend sent its data. An absent section means the
 * agent behind it had nothing to report, which is said plainly rather than filled with a
 * placeholder.
 */

const PILL =
  'inline-flex shrink-0 items-center rounded-control border border-line bg-canvas px-2 py-0.5 text-xs text-muted'

const PRIMARY_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40'

const SECONDARY_BUTTON =
  'flex cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-transparent px-4 py-2.5 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40'

function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-line bg-canvas p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg text-fg">{value}</p>
    </div>
  )
}

/** One line of the fluency breakdown. `note` replaces the score when it was not measured. */
function Component({ label, value, max, note }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xs text-fg">{note || `${value ?? 0} / ${max}`}</dd>
    </div>
  )
}

/**
 * The fluency score, its band, and the five components behind it.
 *
 * The breakdown is shown rather than just the total because the total is only trustworthy if
 * the learner can see where it came from — and because a component sitting at zero is the one
 * piece of advice the score can actually give.
 */
function Fluency({ fluency }) {
  return (
    <div className="rounded-card border border-line bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">Fluency score</p>
        <span className={PILL}>{fluency.band}</span>
      </div>

      <p className="mt-1 text-2xl font-semibold tracking-tight text-fg">
        {fluency.overall}
        <span className="text-sm font-normal text-muted"> / 100</span>
      </p>

      <div className="mt-3 h-1 w-full bg-line">
        <div
          className="h-full bg-white transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, fluency.overall))}%` }}
        />
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Component label="Participation" value={fluency.participation} max={25} />
        <Component label="Turn substance" value={fluency.turnSubstance} max={20} />
        <Component label="Flow" value={fluency.flow} max={20} />
        <Component
          label="Accuracy"
          value={fluency.accuracy}
          max={20}
          note={fluency.accuracyMeasured ? null : 'Not checked'}
        />
        <Component label="Range" value={fluency.range} max={15} />
      </dl>

      <p className="mt-4 text-xs text-muted">
        {fluency.wordsPerTurn ?? 0} words per turn · {fluency.fillerCount ?? 0}{' '}
        {fluency.fillerCount === 1 ? 'filler or repeat' : 'fillers and repeats'}
      </p>

      {fluency.accuracyMeasured === false && (
        <p className="mt-2 text-xs text-muted">
          Your grammar could not be checked this time, so accuracy is not part of this score.
        </p>
      )}
    </div>
  )
}

/** The grammar slips the watcher caught while the learner was speaking. */
function Corrections({ notes }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-fg">Corrections</h3>
      <p className="mt-1 text-xs text-muted">
        Noted quietly while you spoke, so nothing interrupted you.
      </p>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {notes.map((note, index) => (
          <li key={`${note.turnIndex}-${index}`} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm text-muted">{note.said}</p>
              {note.type && <span className={PILL}>{note.type}</span>}
            </div>
            <p className="mt-1 flex items-start gap-2 text-sm text-fg">
              <span className="text-muted" aria-hidden="true">
                →
              </span>
              <span>{note.better}</span>
            </p>
            {note.why && <p className="mt-1 text-xs text-muted">{note.why}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Words worth keeping from this conversation. */
function Vocabulary({ words }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-fg">New words</h3>
      <p className="mt-1 text-xs text-muted">Saved to your vocabulary so you can review them.</p>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {words.map((entry, index) => (
          <li key={`${entry.word}-${index}`} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-fg">{entry.word}</p>
              {entry.source === 'reached-for' && <span className={PILL}>You reached for this</span>}
            </div>
            {entry.meaning && <p className="mt-1 text-sm text-muted">{entry.meaning}</p>}
            {entry.example && <p className="mt-1 text-xs text-muted">“{entry.example}”</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SessionSummary({ summary, onRestart, onBack }) {
  const wasSaved = summary?.status === 'completed'

  // No record means the save request itself failed — the banner above says why. The buttons
  // still have to be here, or the learner is stranded on a dead screen.
  const subtitle = !summary
    ? 'The session could not be saved. Your transcript is still below.'
    : wasSaved
      ? 'Saved to your practice history. Your streak and practice minutes are up to date.'
      : 'You did not speak this time, so nothing was added to your history.'

  const fluency = summary?.fluency
  const notes = summary?.grammarNotes ?? []
  const words = summary?.vocabulary ?? []

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base text-fg">Session finished</h2>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {summary?.mode && <span className={PILL}>{formatMode(summary.mode)}</span>}
      </div>

      {wasSaved && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Time spoken" value={formatDuration(summary.durationSeconds)} />
          <Stat label="Your turns" value={summary.userTurnCount ?? 0} />
          <Stat label="Words spoken" value={summary.userWordCount ?? 0} />
        </div>
      )}

      {wasSaved &&
        (fluency ? (
          <Fluency fluency={fluency} />
        ) : (
          // The score is deliberately withheld below a floor of learner words: over a handful
          // of words, flow, accuracy and range all pay full marks for lack of evidence, and
          // that number would read as a measurement without being one.
          <p className="text-xs text-muted">
            This session was too short to score. Speak a few more sentences next time and you
            will get a fluency score.
          </p>
        ))}

      {notes.length > 0 && <Corrections notes={notes} />}

      {words.length > 0 && <Vocabulary words={words} />}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onRestart} className={PRIMARY_BUTTON}>
          Practise again
        </button>
        <button type="button" onClick={onBack} className={SECONDARY_BUTTON}>
          Back to home
        </button>
      </div>
    </div>
  )
}
