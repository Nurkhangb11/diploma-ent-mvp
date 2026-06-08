import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'
import { useToast } from '../context/ToastContext'
import { useTranslation } from '../context/LanguageContext'
import Logo from '../components/Logo'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useUser()
  const { showToast } = useToast()
  const { t } = useTranslation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (!response.ok) {
        const msg =
          typeof data?.error === 'string'
            ? data.error === 'invalid credentials'
              ? t('auth.invalidCredentials')
              : data.error
            : t('auth.loginFailed')
        setError(msg)
        showToast(msg, 'error')
        return
      }

      login(data.token, data.user)
      showToast(t('auth.welcomeToast'), 'success')
      if (data.user?.role === 'admin') navigate('/admin')
      else if (data.user?.target_score > 0) navigate('/dashboard')
      else navigate('/profile')
    } catch (err) {
      const msg = t('auth.networkError')
      setError(msg)
      showToast(msg, 'error')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-panel w-full max-w-md rounded-3xl p-8 shadow-[0_0_60px_-20px_var(--app-glow)] md:p-10"
      >
        <div className="mb-8 text-center">
          <motion.span
            className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/25 to-gray-900/50 p-3 shadow-lg shadow-violet-500/30 ring-1 ring-violet-400/30"
            whileHover={{ scale: 1.05, rotate: -4 }}
          >
            <Logo size={44} />
          </motion.span>
          <h2 className="mt-5 text-3xl font-extrabold text-[color:var(--app-fg)]">{t('auth.welcomeBack')}</h2>
          <p className="mt-2 text-[color:var(--app-muted)]">{t('auth.welcomeSub')}</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-[color:var(--app-fg)]">
              {t('auth.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-3 text-[color:var(--app-fg)] placeholder:text-[color:var(--app-muted)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-[color:var(--app-fg)]">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-3 pr-24 text-[color:var(--app-fg)] placeholder:text-[color:var(--app-muted)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]"
              >
                {showPassword ? t('auth.hide') : t('auth.show')}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? t('auth.loggingIn') : t('auth.login')}
          </motion.button>
        </form>

        <div className="my-8 flex items-center gap-3 text-xs text-[color:var(--app-muted)]">
          <div className="h-px flex-1 bg-[color:var(--app-border)]" />
          {t('auth.or')}
          <div className="h-px flex-1 bg-[color:var(--app-border)]" />
        </div>

        <button
          type="button"
          disabled
          title="Soon"
          className="w-full cursor-not-allowed rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-3 text-sm font-medium text-[color:var(--app-muted)] opacity-60"
        >
          {t('auth.googleSoon')}
        </button>

        <p className="mt-8 text-center text-sm text-[color:var(--app-muted)]">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-violet-400 hover:text-violet-300">
            {t('auth.register')}
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-[color:var(--app-muted)]">{t('auth.demoHint')}</p>
      </motion.div>
    </div>
  )
}
