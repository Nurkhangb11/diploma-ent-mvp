import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'
import { useToast } from '../context/ToastContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useUser()
  const { showToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        const msg = typeof data?.error === 'string' ? data.error : 'Не удалось зарегистрироваться'
        setError(msg)
        showToast(msg, 'error')
        return
      }

      login(data.token, data.user)
      showToast('Аккаунт создан', 'success')
      navigate('/profile')
    } catch (err) {
      const msg = 'Сеть недоступна или сервер не ответил'
      setError(msg)
      showToast(msg, 'error')
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-[0_0_60px_-20px_var(--app-glow)] md:p-10"
      >
        <div className="mb-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl shadow-lg">
            ✨
          </span>
          <h2 className="mt-4 text-3xl font-extrabold text-[color:var(--app-fg)]">Создать аккаунт</h2>
          <p className="mt-2 text-sm text-[color:var(--app-muted)]">Имя → профиль → цель → тренировки</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-[color:var(--app-fg)]">
              Имя
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-3 text-[color:var(--app-fg)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder="Как к тебе обращаться"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[color:var(--app-fg)]">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-3 text-[color:var(--app-fg)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[color:var(--app-fg)]">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-3 text-[color:var(--app-fg)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder="Минимум надёжности на твоей совести"
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-60"
          >
            {loading ? 'Регистрация…' : 'Продолжить'}
          </motion.button>
        </form>

        <p className="mt-8 text-center text-sm text-[color:var(--app-muted)]">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-semibold text-violet-400 hover:text-violet-300">
            Войти
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
