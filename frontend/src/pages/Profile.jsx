import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'
import { useTranslation } from '../context/LanguageContext'
import Spinner from '../components/Spinner'

const TARGETS = [50, 70, 90, 120]

export default function Profile() {
  const { token, authLoading, refreshUser } = useUser()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [targetScore, setTargetScore] = useState(90)

  useEffect(() => {
    if (authLoading) return
    if (!token) return

    const fetchProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Failed to load profile')
        const data = await response.json()
        setName(data.user?.name || '')
        setAvatar(data.user?.avatar || '')
        const ts = data.user?.target_score || 0
        setTargetScore(ts > 0 ? ts : 90)
      } catch (e) {
        console.error('Profile error:', e)
        setError(t('profile.loadError'))
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [authLoading, token])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          avatar,
          target_score: targetScore,
        }),
      })

      if (!response.ok) throw new Error('Failed to update profile')

      await refreshUser()
      navigate('/dashboard')
    } catch (e) {
      console.error('Save profile error:', e)
      setError(t('profile.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="text-sm text-[color:var(--app-muted)]">{t('profile.loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-2 py-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-3xl p-6 md:p-8"
      >
        <h1 className="text-2xl font-bold text-[color:var(--app-fg)]">{t('profile.title')}</h1>
        <p className="mt-1 text-sm text-[color:var(--app-muted)]">{t('profile.subtitle')}</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        )}

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <motion.div
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ring-violet-500/30"
            whileHover={{ scale: 1.03 }}
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-600 text-3xl font-bold text-white">
                {(name || '?').slice(0, 1).toUpperCase()}
              </div>
            )}
          </motion.div>
          <div className="flex-1 text-center sm:text-left">
            <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-muted)]">{t('profile.name')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-2.5 text-[color:var(--app-fg)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-muted)]">{t('profile.avatarUrl')}</label>
          <input
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-2.5 text-sm text-[color:var(--app-fg)] focus:border-violet-400/60 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
        </div>

        <div className="mt-8">
          <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--app-muted)]">{t('profile.targetScore')}</label>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TARGETS.map((v) => (
              <motion.button
                key={v}
                type="button"
                onClick={() => setTargetScore(v)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-xl border px-3 py-3 text-center text-sm font-bold transition ${
                  targetScore === v
                    ? 'border-violet-400 bg-violet-500/20 text-violet-200 shadow-[0_0_24px_-8px_rgba(139,92,246,0.6)]'
                    : 'border-[color:var(--app-border)] bg-[color:var(--app-card)] text-[color:var(--app-fg)] hover:border-violet-400/40'
                }`}
              >
                {v}
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving}
            whileHover={{ scale: saving ? 1 : 1.02 }}
            className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-60"
          >
            {saving ? t('profile.saving') : t('profile.save')}
          </motion.button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-xl border border-[color:var(--app-border)] px-6 py-3 font-semibold text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]"
          >
            {t('profile.skip')}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
