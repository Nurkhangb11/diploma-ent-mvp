import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useUser()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Login failed')
      }

      login(data.token, data.user)
      if (data.user?.target_score > 0) {
        navigate('/test')
      } else {
        navigate('/profile')
      }
    } catch (err) {
      setError('Ошибка при входе. Попробуйте еще раз.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[76vh] items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-3xl border border-[#e7e4f2] bg-white p-10 shadow-sm">
        <div className="mb-8 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 text-2xl text-white shadow-md">
            🧠
          </span>
          <h2 className="mt-4 text-4xl font-extrabold text-slate-900">AI-тренажер ЕНТ</h2>
          <p className="mt-2 text-lg text-slate-500">Войдите в свой аккаунт</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-base font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-base font-medium text-slate-700">
              Пароль
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-24 text-lg focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
                placeholder="Введите пароль"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-base font-medium text-slate-500 hover:text-slate-700"
              >
                {showPassword ? 'Скрыть' : 'Показать'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-4 py-3 text-xl font-semibold text-white shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-sm text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          или
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-xl font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Войти через Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-base text-slate-600">
            Нет аккаунта?{' '}
            <Link to="/register" className="font-semibold text-violet-700 hover:text-violet-800">
              Зарегистрироваться
            </Link>
          </p>
          <p className="mt-4 text-sm text-slate-500">Тестовый пользователь: `nurkhan@example.com` / пароль `12345678`</p>
        </div>
      </div>
    </div>
  )
}

export default Login



