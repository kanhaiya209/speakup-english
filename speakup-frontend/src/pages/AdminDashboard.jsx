import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axiosConfig'
import Navbar from '../components/Navbar'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'admin', label: 'Admins' },
]

function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  )
}

function Pill({ children, emphasis = false }) {
  return (
    <span
      className={`inline-flex items-center rounded-control border border-line bg-canvas px-2 py-0.5 text-xs capitalize ${
        emphasis ? 'text-fg' : 'text-muted'
      }`}
    >
      {children}
    </span>
  )
}

function initialsOf(name) {
  if (!name) return 'SU'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SU'
  return parts.map((part) => part[0]).join('').toUpperCase().slice(0, 2)
}

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

  const engagement =
    analytics?.totalUsers
      ? `${Math.round(((analytics?.dailyActiveUsers || 0) / (analytics?.totalUsers || 1)) * 100)}% of all users`
      : null

  const thClass = 'px-5 py-3 text-xs font-medium text-muted'

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Admin</h1>
            <p className="mt-2 text-sm text-muted">User engagement, assessment coverage, and the learner directory.</p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex w-fit cursor-pointer items-center gap-2 rounded-control border border-line bg-transparent px-3.5 py-2 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRefreshing ? <Spinner className="h-3.5 w-3.5" /> : (
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            )}
            <span>Refresh</span>
          </button>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-28 text-muted">
            <Spinner className="h-4 w-4" />
            <span className="text-sm">Loading admin data…</span>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Stats */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total users" value={analytics?.totalUsers ?? users.length} />
              <StatCard label="Active today" value={analytics?.dailyActiveUsers ?? 0} sub={engagement} />
              <StatCard label="Assessed" value={onboardedCount} sub={`of ${users.length} users`} />
              <StatCard label="Streak keepers" value={activeStreaksCount} sub="Streak above zero" />
            </section>

            {/* Directory */}
            <section className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-sm font-medium text-fg">Users</h2>
                  <p className="mt-1 text-xs text-muted">
                    Showing {filteredUsers.length} of {users.length}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search name or email"
                      aria-label="Search users"
                      className="w-full rounded-control border border-line bg-canvas py-2 pr-3 pl-9 text-sm text-fg placeholder:text-faint transition-colors focus:border-line-strong focus:outline-none sm:w-64"
                    />
                    <svg className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 rounded-control border border-line bg-canvas p-1">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFilter(f.id)}
                        aria-pressed={selectedFilter === f.id}
                        className={`cursor-pointer rounded-control px-2.5 py-1 text-xs transition-colors ${
                          selectedFilter === f.id ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <p className="text-sm text-muted">No users match this search or filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedFilter('all')
                    }}
                    className="mt-4 cursor-pointer rounded-control border border-line bg-transparent px-3.5 py-2 text-sm text-fg transition-colors hover:border-line-strong hover:bg-surface-2"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left">
                    <thead className="border-b border-line bg-canvas">
                      <tr>
                        <th scope="col" className={thClass}>User</th>
                        <th scope="col" className={thClass}>Email</th>
                        <th scope="col" className={thClass}>Level</th>
                        <th scope="col" className={thClass}>Streak</th>
                        <th scope="col" className={thClass}>Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredUsers.map((u) => (
                        <tr key={u._id || u.id || u.email} className="transition-colors hover:bg-surface-2">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-canvas text-[10px] font-medium text-fg">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  initialsOf(u.name)
                                )}
                              </div>
                              <span className="truncate text-sm text-fg">{u.name || 'Unnamed learner'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted">{u.email || '—'}</td>
                          <td className="px-5 py-3.5">
                            {u.englishLevel ? (
                              <Pill>{u.englishLevel}</Pill>
                            ) : (
                              <span className="text-sm text-faint">Not assessed</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-muted">
                            {(u.streak || 0) > 0 ? `${u.streak} days` : '—'}
                          </td>
                          <td className="px-5 py-3.5">
                            <Pill emphasis={u.role === 'admin'}>{u.role || 'learner'}</Pill>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
