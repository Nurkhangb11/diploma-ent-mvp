import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext'

function Layout({ children }) {
  const { userId, userName, logout, authLoading } = useUser()
  const userInitial = (userName || 'U').slice(0, 1).toUpperCase()

  return (
    <div className="min-h-screen bg-[#efedf7]">
      <nav className="sticky top-0 z-30 border-b border-[#e7e4f2] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 text-sm text-white shadow">
                🧠
              </span>
              <span className="text-xl font-bold text-slate-900">AI-тренажер ЕНТ</span>
            </Link>

            <div className="hidden items-center gap-7 md:flex">
              <Link to="/" className="text-sm font-semibold text-slate-700 hover:text-violet-700">Главная</Link>
              <Link to="/test" className="text-sm font-semibold text-slate-700 hover:text-violet-700">Тесты</Link>
              <Link to="/progress" className="text-sm font-semibold text-slate-700 hover:text-violet-700">Прогресс</Link>
              <Link to="/prediction" className="text-sm font-semibold text-slate-700 hover:text-violet-700">Прогноз</Link>
              <a href="/#about" className="text-sm font-semibold text-slate-700 hover:text-violet-700">О проекте</a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authLoading ? (
              <span className="text-sm text-slate-500">...</span>
            ) : userId ? (
              <>
                <Link
                  to="/profile"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-sm font-bold text-white shadow"
                >
                  {userInitial}
                </Link>
                <button onClick={logout} className="text-sm font-medium text-slate-500 hover:text-slate-700">
                  Выйти
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

export default Layout

