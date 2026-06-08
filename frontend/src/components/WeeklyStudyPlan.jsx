import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '../context/LanguageContext'
import { apiFetch } from '../lib/api'
import { subjectLabel } from '../i18n'
import GlassCard from './GlassCard'

function parsePlanSections(planText) {
  if (!planText) return { bullets: [], growth: '', motivation: '' }
  const lines = planText.split('\n').map((l) => l.trim()).filter(Boolean)
  const bullets = []
  let growth = ''
  let motivation = ''
  let section = 'bullets'

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (lower.includes('ожидаемый рост') || lower.includes('expected') || lower.includes('өсу') || lower.includes('болжам')) {
      section = 'growth'
      continue
    }
    if (lower.startsWith('мотивация') || lower.startsWith('motivation')) {
      section = 'motivation'
      continue
    }
    if (lower.includes('ai рекомендует') || lower.includes('recommends') || lower.includes('ұсынады')) {
      section = 'bullets'
      continue
    }
    if (section === 'bullets' && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*'))) {
      bullets.push(line.replace(/^[•\-*]\s*/, ''))
    } else if (section === 'growth') {
      growth += (growth ? ' ' : '') + line
    } else if (section === 'motivation') {
      motivation += (motivation ? ' ' : '') + line
    }
  }
  return { bullets, growth, motivation }
}

function formatDate(iso, locale) {
  if (!iso) return ''
  const tag = locale === 'kk' ? 'kk-KZ' : locale === 'en' ? 'en-US' : 'ru-RU'
  try {
    return new Date(iso).toLocaleDateString(tag, { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export default function WeeklyStudyPlan({ userId, subject }) {
  const { t, locale } = useTranslation()
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(
    async (force = false) => {
      if (!userId) return
      if (force) setRegenerating(true)
      else setLoading(true)
      setError('')
      try {
        const q = new URLSearchParams({ subject })
        if (force) q.set('force', 'true')
        const res = await apiFetch(`/api/ai/weekly-plan/${userId}?${q}`, locale)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const msg = data?.error || `HTTP ${res.status}`
          throw new Error(msg)
        }
        if (!data?.plan_text) {
          throw new Error('Пустой ответ сервера')
        }
        setPlan(data)
      } catch (e) {
        console.error('Weekly plan load error:', e)
        const hint =
          e?.message?.includes('404') || e?.message?.includes('Failed to load')
            ? ' Перезапустите backend (go run main.go).'
            : ''
        setError(t('weeklyPlan.loadError'))
      } finally {
        setLoading(false)
        setRegenerating(false)
      }
    },
    [userId, subject, locale]
  )

  useEffect(() => {
    load(false)
  }, [load])

  const sections = useMemo(() => parsePlanSections(plan?.plan_text), [plan?.plan_text])
  const growth = plan?.expected_growth || sections.growth || t('weeklyPlan.defaultGrowth')
  const updatedLabel = plan?.generated_at ? formatDate(plan.generated_at, locale) : ''
  const subjectDisplay = subjectLabel(locale, subject)

  return (
    <GlassCard
      delay={0.32}
      className="relative overflow-hidden border border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/10 p-6 md:p-8"
      hover={false}
    >
      <motion.div
        className="pointer-events-none absolute -right-20 top-0 h-48 w-48 rounded-full bg-violet-500/25 blur-3xl"
        animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.08, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="pointer-events-none absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-fuchsia-500/20 blur-3xl"
        animate={{ opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <motion.div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl shadow-lg shadow-violet-500/40"
          animate={regenerating ? { rotate: [0, 8, -8, 0], scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.6, repeat: regenerating ? Infinity : 0 }}
        >
          ✨
        </motion.div>
        <motion.div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-[color:var(--app-fg)]">{t('weeklyPlan.title')}</h2>
            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
              {t('weeklyPlan.badge')}
            </span>
            {plan?.cached && (
              <span className="rounded-full border border-[color:var(--app-border)] px-2 py-0.5 text-[10px] text-[color:var(--app-muted)]">
                {t('weeklyPlan.cached')}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[color:var(--app-muted)]">
            {t('weeklyPlan.subtitle', { subject: subjectDisplay })}
            {updatedLabel ? ` ${t('weeklyPlan.updated', { date: updatedLabel })}` : ''}
          </p>
        </motion.div>
        <div className="flex shrink-0 gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            disabled={regenerating || loading}
            onClick={() => load(true)}
            className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-200 disabled:opacity-50"
          >
            {regenerating ? t('weeklyPlan.refreshing') : t('weeklyPlan.refresh')}
          </motion.button>
          <Link
            to="/test"
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/30"
          >
            {t('weeklyPlan.toTrainer')}
          </Link>
        </div>
      </motion.div>

      <motion.div className="relative mt-6 min-h-[10rem]">
        {loading && !plan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
            aria-hidden
          >
            <motion.div
              className="skeleton h-4 w-3/4 rounded-lg"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <motion.div
              className="skeleton h-4 w-full rounded-lg"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div
              className="skeleton h-4 w-5/6 rounded-lg"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="skeleton mt-4 h-10 w-1/2 rounded-xl"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
            />
          </motion.div>
        )}

        {error && !loading && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => load(false)}
              className="self-start rounded-xl border border-violet-400/40 px-4 py-2 text-xs font-semibold text-violet-200"
            >
              {t('prediction.retry')}
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!loading && plan && (
            <motion.div
              key={plan.generated_at + String(plan.cached)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <motion.div
                className="rounded-2xl border border-violet-500/20 bg-black/10 p-5 backdrop-blur-sm"
                animate={regenerating ? { boxShadow: ['0 0 0 rgba(139,92,246,0)', '0 0 32px rgba(139,92,246,0.35)', '0 0 0 rgba(139,92,246,0)'] } : {}}
                transition={{ duration: 1.5, repeat: regenerating ? Infinity : 0 }}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-violet-300/90">
                  {t('weeklyPlan.recommendTitle')}
                </p>
                <ul className="mt-3 space-y-2">
                  {(sections.bullets.length > 0 ? sections.bullets : plan.plan_text.split('\n').filter((l) => l.trim().startsWith('•'))).map(
                    (item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                        className="flex gap-2 text-sm leading-relaxed text-[color:var(--app-fg)]"
                      >
                        <span className="text-violet-400">•</span>
                        <span>{item.replace(/^[•\-*]\s*/, '')}</span>
                      </motion.li>
                    )
                  )}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 px-5 py-4"
              >
                <span className="text-sm text-[color:var(--app-muted)]">{t('weeklyPlan.expectedGrowth')}</span>
                <span className="text-2xl font-extrabold tabular-nums text-fuchsia-300">{growth}</span>
              </motion.div>

              {sections.motivation && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-sm italic leading-relaxed text-[color:var(--app-muted)]"
                >
                  {sections.motivation}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </GlassCard>
  )
}
