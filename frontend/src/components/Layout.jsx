import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../context/UserContext'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from '../context/LanguageContext'
import LanguageSwitcher from './LanguageSwitcher'

const navCls = ({ isActive }) =>
  `text-sm font-semibold transition ${
    isActive ? 'text-violet-400' : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]'
  }`

function Layout({ children }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { userId, userName, logout, authLoading } = useUser()
  const { theme, toggleTheme } = useTheme()
  const { t } = useTranslation()
  const userInitial = (userName || 'U').slice(0, 1).toUpperCase()

  const navItems = [
    { to: '/', label: t('nav.home'), end: true },
    ...(userId ? [{ to: '/dashboard', label: t('nav.dashboard') }] : []),
    { to: '/test', label: t('nav.tests') },
    { to: '/progress', label: t('nav.progress') },
    { to: '/prediction', label: t('nav.prediction') },
  ]

  return (
    <div className="mesh-bg min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-[color:var(--app-border)] backdrop-blur-xl" style={{ background: 'var(--nav-bg)' }}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
            <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3" onClick={() => setMobileOpen(false)}>
              <motion.span
                layout
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm text-white shadow-lg shadow-violet-500/30"
                whileHover={{ rotate: 6, scale: 1.05 }}
              >
                🧠
              </motion.span>
              <span className="truncate text-lg font-extrabold tracking-tight text-[color:var(--app-fg)] sm:text-xl">{t('brand')}</span>
            </Link>

            <div className="hidden items-center gap-5 md:flex lg:gap-6">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={navCls} end={item.end}>
                  {item.label}
                </NavLink>
              ))}
              <a href="/#about" className="text-sm font-semibold text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]">
                {t('nav.about')}
              </a>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm font-semibold text-[color:var(--app-fg)] md:hidden"
              aria-expanded={mobileOpen}
              aria-label={t('nav.menu')}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
            <LanguageSwitcher compact />
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-2.5 py-2 text-xs font-semibold text-[color:var(--app-fg)] transition hover:border-violet-400/40 sm:px-3"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            {authLoading ? (
              <span className="hidden text-sm text-[color:var(--app-muted)] sm:inline">…</span>
            ) : userId ? (
              <>
                <Link
                  to="/profile"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xs font-bold text-white shadow-md sm:h-10 sm:w-10 sm:text-sm"
                  onClick={() => setMobileOpen(false)}
                >
                  {userInitial}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false)
                    logout()
                  }}
                  className="hidden rounded-xl px-3 py-2 text-sm font-medium text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)] sm:inline"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/25 sm:px-5 sm:text-sm"
                onClick={() => setMobileOpen(false)}
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-[color:var(--app-border)] bg-[color:var(--nav-bg)] md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-3">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-xl px-3 py-2.5 text-sm font-semibold ${isActive ? 'bg-violet-500/15 text-violet-300' : 'text-[color:var(--app-fg)]'}`
                    }
                    end={item.end}
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ))}
                <a
                  href="/#about"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[color:var(--app-muted)]"
                  onClick={() => setMobileOpen(false)}
                >
                  {t('nav.about')}
                </a>
                {userId && (
                  <button
                    type="button"
                    className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-300/90"
                    onClick={() => {
                      setMobileOpen(false)
                      logout()
                    }}
                  >
                    {t('nav.logout')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default Layout
