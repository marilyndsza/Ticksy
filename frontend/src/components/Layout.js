import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useUI } from '../contexts/UIContext'
import { MessageCircle, Heart, Plus, CalendarDays, User, LogOut } from 'lucide-react'

const navItems = [
  { to: '/notes', icon: MessageCircle, testId: 'nav-notes' },
  { to: '/dashboard', icon: Heart, testId: 'nav-home' },
  { to: '/mark', icon: Plus, testId: 'nav-add', isCenter: true },
  { to: '/calendar', icon: CalendarDays, testId: 'nav-calendar' },
  { to: '/profile', icon: User, testId: 'nav-profile' },
]

export default function Layout() {
  const { signOut } = useAuth()
  const { navbarHidden } = useUI()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-ticksy-pink-light">
      {/* Minimal top brand bar */}
      <header className="bg-ticksy-pink sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <NavLink to="/dashboard" className="font-heading text-xl font-bold text-ticksy-navy">
            Ticksy
          </NavLink>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-full border border-ticksy-blue/20 bg-white/70 px-4 py-2 font-body text-sm font-semibold text-ticksy-navy shadow-[0_4px_14px_rgba(15,27,76,0.08)] transition-all hover:-translate-y-0.5 hover:border-ticksy-blue/35 hover:bg-white"
          >
            <LogOut size={15} className="text-ticksy-blue" />
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-6 pb-32">
        <Outlet />
      </main>

      {/* Bottom pill navbar — hidden during attendance popup */}
      {!navbarHidden && (
      <nav
        data-testid="bottom-navbar"
        className="fixed z-50"
        style={{ bottom: 72, left: 16, right: 16, maxWidth: 400, margin: '0 auto' }}
      >
        <div
          className="flex items-center rounded-full"
          style={{
            height: 70,
            backgroundColor: '#1a2f7a',
            boxShadow: '0 8px 32px rgba(15, 27, 76, 0.35)',
          }}
        >
          {navItems.map((item) => {
            const isActive = item.to === '/profile'
              ? location.pathname === '/profile'
              : location.pathname.startsWith(item.to)

            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={item.testId}
                className="flex-1 flex items-center justify-center h-full outline-none"
              >
                <div
                  className={`relative flex items-center justify-center transition-all duration-200 ease-out ${
                    isActive ? 'scale-[1.15] -translate-y-[10px]' : ''
                  }`}
                >
                  {isActive && (
                    <div className="absolute w-12 h-12 rounded-full bg-blue-500" />
                  )}
                  <item.icon
                    className="relative z-10 text-white"
                    size={item.isCenter ? 28 : 24}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
              </NavLink>
            )
          })}
        </div>
      </nav>
      )}
    </div>
  )
}
