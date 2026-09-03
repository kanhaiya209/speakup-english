import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axiosConfig'

/* ────────────────────────────────────────────
   Spinner
   ──────────────────────────────────────────── */

function Spinner() {
  return (
    <svg
      className="animate-spin w-5 h-5"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Stat Card
   ──────────────────────────────────────────── */

function StatCard({ icon, label, value, gradient, shadowColor }) {
  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-2xl shadow-black/20">
      <div className="flex items-center gap-4">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} shadow-lg ${shadowColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-slate-400 text-xs font-medium mb-0.5">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
      isAdmin
        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
        : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
    }`}>
      {isAdmin ? '👑 Admin' : '📚 Learner'}
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

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Admin access required')
      navigate('/home', { replace: true })
    }
  }, [user, navigate])

  // Fetch analytics + users
  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const fetchData = async () => {
      try {
        setIsLoading(true)
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
      } catch (error) {
        console.error('Admin dashboard error:', error)
        if (error.response?.status === 403) {
          toast.error('Admin access required')
          navigate('/home', { replace: true })
        } else {
          toast.error('Failed to load admin data')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, navigate])

  // Don't render for non-admins
  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      {/* ── Ambient background effects ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* ── Floating particles ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-indigo-400/30 rounded-full animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/home')}
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all duration-200 cursor-pointer"
              aria-label="Back to home"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>Admin Dashboard</span>
                <span className="text-amber-400">👑</span>
              </h1>
              <p className="text-slate-400 text-sm">Manage users & view analytics</p>
            </div>
          </div>
        </div>

        {/* ── Loading State ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] mb-4">
              <Spinner />
            </div>
            <p className="text-slate-400 text-sm">Loading admin data…</p>
          </div>
        ) : (
          <>
            {/* ═══════════ ANALYTICS CARDS ═══════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <StatCard
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                }
                label="Total Users"
                value={analytics?.totalUsers ?? 0}
                gradient="from-indigo-500 to-violet-600"
                shadowColor="shadow-indigo-500/25"
              />
              <StatCard
                icon={
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                }
                label="Active Today"
                value={analytics?.dailyActiveUsers ?? 0}
                gradient="from-emerald-500 to-teal-600"
                shadowColor="shadow-emerald-500/25"
              />
            </div>

            {/* ═══════════ USERS TABLE ═══════════ */}
            <section className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
              <div className="px-6 py-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M12 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M3.375 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m-1.125 2.625c0 .621.504 1.125 1.125 1.125M12 13.125c0 .621.504 1.125 1.125 1.125" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">All Users</h2>
                      <p className="text-slate-500 text-xs">{users.length} registered user{users.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Level</th>
                      <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Streak</th>
                      <th className="text-center px-6 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 text-sm">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr
                          key={u.userId}
                          className="hover:bg-white/[0.02] transition-colors duration-150"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                              </div>
                              <span className="text-sm font-medium text-white truncate max-w-[150px]">
                                {u.name || 'Unnamed'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-400 truncate max-w-[200px] block">
                              {u.email || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-slate-300">
                              {u.englishLevel || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-semibold text-amber-400">
                              {u.streak || 0}
                              <span className="ml-1 text-xs">🔥</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <RoleBadge role={u.role} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Bottom spacer ── */}
            <div className="h-8" />
          </>
        )}
      </div>

      {/* ── Custom keyframe ── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.3; }
          50% { transform: translateY(-20px) scale(1.5); opacity: 0.6; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
