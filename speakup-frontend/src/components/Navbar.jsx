import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { logout } from '../store/authSlice'

/* Nav items. `to: null` renders a disabled (coming soon) item. */
const NAV_LINKS = [
  { label: 'Home', to: '/home' },
  { label: 'Practice', to: '/practice' },
  { label: 'Settings', to: '/settings' },
]

function initialsOf(name) {
  if (!name) return 'SU'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'SU'
  return parts.map((part) => part[0]).join('').toUpperCase().slice(0, 2)
}

export default function Navbar() {
  const { user } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [accountOpen, setAccountOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const accountRef = useRef(null)

  /* Dismiss the account dropdown on outside click or Escape */
  useEffect(() => {
    if (!accountOpen) return

    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setAccountOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [accountOpen])

  const isAdmin = user?.role === 'admin'
  const links = isAdmin ? [...NAV_LINKS, { label: 'Admin', to: '/admin' }] : NAV_LINKS

  const closeAll = () => {
    setAccountOpen(false)
    setMobileOpen(false)
  }

  const go = (to) => {
    closeAll()
    navigate(to)
  }

  const handleLogout = () => {
    closeAll()
    dispatch(logout())
    navigate('/', { replace: true })
    toast.success('Signed out')
  }

  const linkClass = (to) =>
    `text-sm transition-colors rounded-control px-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
      pathname === to ? 'text-fg' : 'text-muted hover:text-fg'
    }`

  const menuItemClass =
    'w-full rounded-control px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:bg-surface-2 focus-visible:text-fg cursor-pointer'

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-canvas">
      <nav className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Main">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/home"
            onClick={closeAll}
            className="rounded-control text-[15px] font-semibold tracking-tight text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
          >
            SpeakUp
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-7 md:flex">
            {links.map((link) =>
              link.to ? (
                <Link key={link.label} to={link.to} className={linkClass(link.to)}>
                  {link.label}
                </Link>
              ) : (
                <span
                  key={link.label}
                  aria-disabled="true"
                  title="Coming soon"
                  className="cursor-not-allowed text-sm text-faint select-none"
                >
                  {link.label}
                </span>
              )
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-label="Account menu"
                className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-xs font-medium text-fg transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
              >
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsOf(user?.name)
                )}
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  aria-label="Account"
                  className="absolute right-0 mt-2 w-56 rounded-card border border-line bg-surface p-1"
                >
                  <div className="mb-1 border-b border-line px-3 py-2.5">
                    <p className="truncate text-sm text-fg">{user?.name || 'SpeakUp learner'}</p>
                    <p className="truncate text-xs text-muted">{user?.email || '—'}</p>
                  </div>

                  <button type="button" role="menuitem" onClick={() => go('/settings')} className={menuItemClass}>
                    Settings
                  </button>

                  {isAdmin && (
                    <button type="button" role="menuitem" onClick={() => go('/admin')} className={menuItemClass}>
                      Admin
                    </button>
                  )}

                  <div className="my-1 h-px bg-line" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full cursor-pointer rounded-control px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger/10 focus-visible:bg-danger/10 focus-visible:outline-none"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-control border border-line text-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 md:hidden"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="mobile-nav" className="border-t border-line py-2 md:hidden">
            {links.map((link) =>
              link.to ? (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeAll}
                  className={`block rounded-control px-3 py-2.5 text-sm transition-colors ${
                    pathname === link.to ? 'bg-surface text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <span
                  key={link.label}
                  aria-disabled="true"
                  className="block cursor-not-allowed px-3 py-2.5 text-sm text-faint select-none"
                >
                  {link.label}
                  <span className="ml-2 text-xs">Coming soon</span>
                </span>
              )
            )}

            <div className="my-2 h-px bg-line" />

            <button
              type="button"
              onClick={handleLogout}
              className="block w-full cursor-pointer rounded-control px-3 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger/10"
            >
              Log out
            </button>
          </div>
        )}
      </nav>
    </header>
  )
}

