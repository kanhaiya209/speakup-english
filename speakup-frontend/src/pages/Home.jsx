import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

function StatCard({ label, value, unit }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-fg capitalize">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </p>
    </div>
  )
}

export default function Home() {
  const { user } = useSelector((state) => state.auth)
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : null

  const outlineButtonClass =
    'cursor-pointer rounded-control border border-line bg-transparent px-4 py-2 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2'

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Greeting */}
        <header className="mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-2 text-sm text-muted">Here is where your speaking practice stands.</p>
        </header>

        {/* Stats */}
        <section className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Streak" value={user?.streak ?? 0} unit="days" />
          <StatCard label="Practice time" value={user?.totalMinutesPracticed ?? 0} unit="mins" />
          <StatCard label="Level" value={user?.englishLevel || '—'} />
          <StatCard label="Daily goal" value={user?.dailyGoalMinutes ?? 0} unit="mins / day" />
        </section>

        {/* Quick actions */}
        <section>
          <div className="mb-4 border-b border-line pb-3">
            <h2 className="text-sm font-medium text-fg">Quick actions</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="cursor-not-allowed rounded-control bg-white px-4 py-2 text-sm font-medium text-black opacity-40"
            >
              Start Practicing
            </button>
            <span className="text-xs text-muted">Coming soon</span>

            <div className="hidden h-5 w-px bg-line sm:block" />

            <button type="button" onClick={() => navigate('/settings')} className={outlineButtonClass}>
              Settings
            </button>

            {user?.role === 'admin' && (
              <button type="button" onClick={() => navigate('/admin')} className={outlineButtonClass}>
                Admin
              </button>
            )}

            <button type="button" onClick={() => navigate('/quiz')} className={outlineButtonClass}>
              Retake Assessment
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

