import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axiosConfig'
import { BackgroundBeams } from '../components/ui/background-beams'

/* ────────────────────────────────────────────
   Spinner
   ──────────────────────────────────────────── */

function Spinner({ className = 'w-5 h-5' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Stat Card
   ──────────────────────────────────────────── */

function StatCard({ icon, label, value, subtext, badge, gradient, glowColor }) {
  return (
    <div className="relative overflow-hidden backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl p-5 shadow-xl transition-all duration-200 hover:border-white/[0.15]">
      {/* Corner Glow */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${glowColor} blur-2xl pointer-events-none opacity-40`} />

      <div className="flex items-start justify-between mb-4">
        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} shadow-lg text-white`}>
          {icon}
        </div>
        {badge && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/[0.06] border border-white/[0.08] text-neutral-400">
            {badge}
          </span>
        )}
      </div>

      <div>
        <span className="text-xs font-medium text-neutral-400 block mb-0.5">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{value}</span>
          {subtext && <span className="text-[11px] text-neutral-500">{subtext}</span>}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   Role Badge
   ──────────────────────────────────────────── */

function RoleBadge({ role }) {
  const isAdmin = role === 'admin'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-mono ${
      isAdmin
        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
        : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
    }`}>
      <span>{isAdmin ? '👑' : '📚'}</span>
      <span>{isAdmin ? 'Admin' : 'Learner'}</span>
    </span>
  )
}

/* ────────────────────────────────────────────
   Level Badge
   ──────────────────────────────────────────── */

function LevelBadge({ level }) {
  if (!level) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-neutral-500 text-[11px] font-mono">
        Unassessed
      </span>
    )
  }

  const levelColorMap = {
    beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    elementary: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
    intermediate: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    'upper intermediate': 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    advanced: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  }

  const colorClass = levelColorMap[level.toLowerCase()] || 'text-neutral-300 bg-white/[0.05] border-white/[0.08]'

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${colorClass}`}>
      {level}
    </span>
  )
}

/* ────────────────────────────────────────────
   Admin Dashboard Page
   ──────────────────────────────────────────── */

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useSelector((state) => state.auth)

  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all') // 'all', 'beginner', 'intermediate', 'advanced', 'admin'

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required')
      navigate('/home', { replace: true })
    }
  }, [user, navigate])

  // Fetch analytics + users manually (e.g. Refresh button)
  const handleRefresh = async () => {
    if (!user || user.role !== 'admin') return
    try {
      setIsRefreshing(true)
      const [analyticsRes, usersRes] = await Promise.all([
        api.get('/api/admin/analytics'),
        api.get('/api/admin/users'),
      ])

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data)
      }
      if (usersRes.data.success) {
        setUsers(usersRes.data.data)
      }
      toast.success('Analytics & users refreshed')
    } catch (error) {
      console.error('Admin dashboard refresh error:', error)
      toast.error('Failed to refresh data')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Initial load
  useEffect(() => {
    if (!user || user.role !== 'admin') return
    let ignore = false

    const loadInitialData = async () => {
      try {
        const [analyticsRes, usersRes] = await Promise.all([
          api.get('/api/admin/analytics'),
          api.get('/api/admin/users'),
        ])

        if (!ignore) {
          if (analyticsRes.data.success) {
            setAnalytics(analyticsRes.data.data)
          }
          if (usersRes.data.success) {
            setUsers(usersRes.data.data)
          }
        }
      } catch (error) {
        if (!ignore) {
          console.error('Admin dashboard error:', error)
          if (error.response?.status === 403) {
            toast.error('Admin access required')
            navigate('/home', { replace: true })
          } else {
            toast.error('Failed to load admin data')
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadInitialData()
    return () => {
      ignore = true
    }
  }, [user, navigate])

  // Computed metrics
  const activeStreaksCount = useMemo(() => {
    return users.filter((u) => (u.streak || 0) > 0).length
  }, [users])

  const onboardedCount = useMemo(() => {
    return users.filter((u) => !!u.englishLevel).length
  }, [users])

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search match
      const name = (u.name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q || name.includes(q) || email.includes(q)

      if (!matchesSearch) return false

      // Category filter
      if (selectedFilter === 'all') return true
      if (selectedFilter === 'admin') return u.role === 'admin'
      if (selectedFilter === 'beginner') return (u.englishLevel || '').toLowerCase().includes('beginner')
      if (selectedFilter === 'intermediate') return (u.englishLevel || '').toLowerCase().includes('intermediate')
      if (selectedFilter === 'advanced') return (u.englishLevel || '').toLowerCase().includes('advanced')

      return true
    })
  }, [users, searchQuery, selectedFilter])

  // Don't render for non-admins
  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 relative overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* ── Background Beams ── */}
      <BackgroundBeams />

      {/* ── Ambient Radial Halos ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-1/3 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Header ── */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              aria-label="Back to home"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">Admin Command Center</h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[11px] font-mono text-amber-400 font-semibold flex items-center gap-1">
                  <span>👑</span>
                  <span>Supervisor</span>
                </span>
              </div>
              <p className="text-neutral-400 text-xs sm:text-sm mt-0.5">
                Real-time user engagement, fluency assessment telemetry, and cohort directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Engine</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs font-semibold text-neutral-200 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRefreshing ? <Spinner className="w-3.5 h-3.5" /> : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              )}
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* ── Content View ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-28">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
              <Spinner className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-neutral-400 text-sm font-medium">Aggregating telemetry metrics…</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ═══════════ STATS CARDS ROW ═══════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                }
                label="Total Registered Users"
                value={analytics?.totalUsers ?? users.length}
                badge="Platform Total"
                gradient="from-indigo-500 to-violet-600"
                glowColor="bg-indigo-500"
              />

              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                }
                label="Active Today (DAU)"
                value={analytics?.dailyActiveUsers ?? 0}
                subtext={analytics?.totalUsers ? `${Math.round(((analytics?.dailyActiveUsers || 0) / (analytics?.totalUsers || 1)) * 100)}% engagement` : ''}
                badge="Today"
                gradient="from-emerald-500 to-teal-600"
                glowColor="bg-emerald-500"
              />

              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 1-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
                  </svg>
                }
                label="Assessed Fluency"
                value={onboardedCount}
                subtext={`of ${users.length} onboarded`}
                badge="Completed Quiz"
                gradient="from-blue-500 to-cyan-600"
                glowColor="bg-blue-500"
              />

              <StatCard
                icon={
                  <span className="text-lg">🔥</span>
                }
                label="Streak Keepers"
                value={activeStreaksCount}
                subtext="Consistent learners"
                badge="Active Habit"
                gradient="from-amber-500 to-orange-600"
                glowColor="bg-amber-500"
              />
            </div>

            {/* ═══════════ DIRECTORY SECTION ═══════════ */}
            <section className="backdrop-blur-xl bg-neutral-900/60 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden">
              {/* Controls Bar */}
              <div className="p-5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">Registered Learners Directory</h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Showing {filteredUsers.length} of {users.length} total users
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name or email…"
                      className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl bg-neutral-950/80 border border-white/[0.08] text-white text-xs placeholder-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
                    />
                    <svg className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 bg-neutral-950/80 border border-white/[0.06] p-1 rounded-xl">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'beginner', label: 'Beginner' },
                      { id: 'intermediate', label: 'Inter' },
                      { id: 'advanced', label: 'Adv' },
                      { id: 'admin', label: 'Admins' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilter(f.id)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                          selectedFilter === f.id
                            ? 'bg-indigo-500/20 text-indigo-300 font-semibold'
                            : 'text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                      <th className="px-6 py-3.5 text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                        Learner
                      </th>
                      <th className="px-6 py-3.5 text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                        Email Address
                      </th>
                      <th className="px-6 py-3.5 text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider">
                        Assessed Tier
                      </th>
                      <th className="px-6 py-3.5 text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider text-center">
                        Practice Streak
                      </th>
                      <th className="px-6 py-3.5 text-xs font-mono font-semibold text-neutral-400 uppercase tracking-wider text-right">
                        System Role
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-14 text-center">
                          <div className="max-w-xs mx-auto text-center">
                            <span className="text-3xl block mb-2">🔍</span>
                            <h3 className="text-sm font-semibold text-white mb-1">No matching users found</h3>
                            <p className="text-xs text-neutral-500 mb-4">
                              Try clearing your search query or changing the filter selection
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('')
                                setSelectedFilter('all')
                              }}
                              className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white"
                            >
                              Reset Filters
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const avatarInitial = u.name ? u.name.charAt(0).toUpperCase() : '?'
                        return (
                          <tr
                            key={u.userId}
                            className="hover:bg-white/[0.02] transition-colors duration-150"
                          >
                            {/* Learner Info */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20 shrink-0">
                                  {avatarInitial}
                                </div>
                                <div className="min-w-0">
                                  <span className="block text-sm font-semibold text-white truncate max-w-[180px]">
                                    {u.name || 'Unnamed Learner'}
                                  </span>
                                  <span className="block text-[10px] font-mono text-neutral-500 truncate max-w-[180px]">
                                    ID: {u.userId ? String(u.userId).slice(0, 8) : '—'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="px-6 py-4">
                              <span className="text-xs text-neutral-300 font-mono truncate max-w-[220px] block">
                                {u.email || '—'}
                              </span>
                            </td>

                            {/* Level */}
                            <td className="px-6 py-4">
                              <LevelBadge level={u.englishLevel} />
                            </td>

                            {/* Streak */}
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                                <span>🔥</span>
                                <span>{u.streak || 0}</span>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-6 py-4 text-right">
                              <RoleBadge role={u.role} />
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
