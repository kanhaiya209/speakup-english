import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';

export default function Home() {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-3xl p-10 shadow-2xl shadow-black/20 max-w-lg">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/25 mb-5">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome{user?.name ? `, ${user.name}` : ''}! 🎉
          </h1>
          <p className="text-slate-400 text-sm mb-2">
            You're logged in to SpeakUp. Your speaking practice journey starts here.
          </p>
          {user?.englishLevel && (
            <p className="text-indigo-400 text-sm font-medium mb-6">
              Level: {user.englishLevel} 🎯
            </p>
          )}

          <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-500">Dashboard coming soon — stay tuned!</span>
          </div>

          {/* ── Navigation Buttons ── */}
          <div className="flex flex-col gap-3 mb-4">
            <button
              onClick={() => navigate('/settings')}
              id="home-settings-button"
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-slate-300 font-semibold text-sm hover:bg-white/[0.08] hover:border-white/[0.12] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span>Settings</span>
            </button>

            {user?.role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                id="home-admin-button"
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold text-sm hover:bg-amber-500/20 hover:border-amber-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
                </svg>
                <span>Admin Dashboard</span>
              </button>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="px-6 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all duration-200 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}