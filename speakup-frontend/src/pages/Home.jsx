import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { logout } from '../store/authSlice'
import { Meteors } from '../components/ui/meteors'

export default function Home() {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleLogout = () => {
    dispatch(logout())
    navigate('/', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SU'

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Meteors number={15} />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/20">

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 mb-4">
              <span className="text-xl font-bold text-white">{initials}</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 🎉
            </h1>
            <p className="text-slate-400 text-sm">Your speaking practice journey starts here.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{user?.streak || 0}</p>
              <p className="text-xs text-slate-500 mt-1">🔥 Streak</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{user?.totalMinutesPracticed || 0}</p>
              <p className="text-xs text-slate-500 mt-1">⏱ Minutes</p>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-indigo-400 capitalize">{user?.englishLevel || 'N/A'}</p>
              <p className="text-xs text-slate-500 mt-1">🎯 Level</p>
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-400">Daily Goal</p>
              <p className="text-xs text-indigo-400 font-semibold">0 / {user?.dailyGoalMinutes || 10} min</p>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 w-0 transition-all duration-500" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">AI Practice coming soon — stay tuned!</span>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/settings')}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 font-semibold text-sm hover:bg-white/[0.08] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              ⚙️ Settings
            </button>
            {user?.role === 'admin' && (
              <button onClick={() => navigate('/admin')}
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                📊 Admin Dashboard
              </button>
            )}
            <button onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/20 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              Logout
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.06]">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Built for Indian English Learners</span>
          </div>
        </div>
      </div>
    </div>
  )
}
