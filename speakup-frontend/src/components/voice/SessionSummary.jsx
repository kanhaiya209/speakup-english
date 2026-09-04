import { formatDuration } from './formatters'

/**
 * What the learner did, read straight off the saved session record. Nothing here is derived
 * from anything the browser guessed at — the backend timed the session and counted the words.
 */
function Stat({ label, value }) {
  return (
    <div className="rounded-card border border-line bg-canvas p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg text-fg">{value}</p>
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base text-fg">Session finished</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      {wasSaved && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Time spoken" value={formatDuration(summary.durationSeconds)} />
          <Stat label="Your turns" value={summary.userTurnCount ?? 0} />
          <Stat label="Words spoken" value={summary.userWordCount ?? 0} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRestart}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-control bg-white px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        >
          Practise again
        </button>
        <button
          type="button"
          onClick={onBack}
          className="flex cursor-pointer items-center justify-center gap-2 rounded-control border border-line bg-transparent px-4 py-2.5 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
