import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'
import { useUser } from '../context/UserContext'
import { useSubject } from '../context/SubjectContext'
import GlassCard from '../components/GlassCard'
import SubjectSwitcher from '../components/SubjectSwitcher'
import WeeklyStudyPlan from '../components/WeeklyStudyPlan'
import { predictionSubjectMax } from '../lib/subjectMax'

function aggregateWeeks(heatmap, weeks = 12) {
  const days = heatmap.slice(-7 * weeks)
  const out = []
  for (let w = 0; w < weeks; w++) {
    const chunk = days.slice(w * 7, (w + 1) * 7)
    const count = chunk.reduce((s, d) => s + (d.count || 0), 0)
    out.push({ label: `${w + 1}`, attempts: count })
  }
  return out
}

function progressLineFromWeeks(weeks, predicted) {
  const base = predicted || 0
  return weeks.map((w, i) => ({
    label: w.label,
    attempts: w.attempts,
    score: Math.min(20, Math.max(0, base * (0.55 + (0.45 * (i + 1)) / Math.max(1, weeks.length)))),
  }))
}

export default function Dashboard() {
  const { userId } = useUser()
  const { subject, setSubject } = useSubject()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setErr('')
    try {
      const res = await fetch(`/api/dashboard/${userId}?subject=${encodeURIComponent(subject)}`)
      if (!res.ok) throw new Error('dashboard')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setErr('Не удалось загрузить дашборд')
    } finally {
      setLoading(false)
    }
  }, [userId, subject])

  useEffect(() => {
    load()
  }, [load])

  const user = data?.user
  const pred = data?.prediction
  const streak = data?.streak || { current: 0, best: 0, badge: '' }
  const level = data?.level || { code: 'beginner', label: 'Beginner' }
  const heatmap = data?.heatmap || []

  const masteryBars = useMemo(() => {
    const sections = pred?.section_scores || []
    return sections.map((s) => ({
      name: s.section_name.length > 18 ? `${s.section_name.slice(0, 18)}…` : s.section_name,
      mastery: Math.round((s.mastery || 0) * 100),
    }))
  }, [pred])

  const weekly = useMemo(() => aggregateWeeks(heatmap, 12), [heatmap])
  const lineData = useMemo(
    () => progressLineFromWeeks(weekly, pred?.predicted_score),
    [weekly, pred?.predicted_score]
  )

  const heatmapRecent = useMemo(() => heatmap.slice(-98), [heatmap])

  const heatmapRows = useMemo(() => {
    const chunk = []
    for (let i = 0; i < heatmapRecent.length; i += 7) {
      chunk.push(heatmapRecent.slice(i, i + 7))
    }
    return chunk
  }, [heatmapRecent])

  const scoreOn120 = useMemo(() => {
    const p = pred?.predicted_score ?? 0
    return Math.min(120, Math.max(0, Math.round((p / 20) * 120)))
  }, [pred?.predicted_score])

  const heroSub = useMemo(() => {
    const target = user?.target_score || 120
    const p20 = pred?.predicted_score ?? 0
    const ratio = target > 0 ? p20 / (target / 6) : 0
    if (ratio >= 0.85) return `Отличный темп — ты всё ближе к ${target} баллам. Закрепи сильные темы короткими сериями.`
    if (ratio >= 0.45) return `Ты уже ближе к ${target} баллам, чем вчера — добавь 10 минут на слабую тему.`
    return `Каждый ответ приближает к ${target} баллам — начни с короткой сессии по слабой теме.`
  }, [user?.target_score, pred?.predicted_score])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (err) {
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{err}</div>
  }

  const attemptsTotal = data?.totals?.attempts ?? 0
  const hasActivity = attemptsTotal > 0
  const hasMasteryChart = masteryBars.length > 0
  const target = user?.target_score || 120
  const predicted = pred?.predicted_score ?? 0
  const subjectMax = predictionSubjectMax(pred, subject)
  const confidencePct = Math.round((pred?.confidence || 0) * 100)

  return (
    <div className="space-y-10">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative overflow-hidden rounded-3xl p-8 md:p-10"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-violet-300/90">Дашборд</p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[color:var(--app-fg)] md:text-5xl">
              Привет, {user?.name || 'ученик'} <span className="inline-block animate-pulse">👋</span>
            </h1>
            <p className="mt-3 max-w-xl text-lg text-[color:var(--app-muted)]">{heroSub}</p>
            <div className="mt-6">
              <SubjectSwitcher value={subject} onChange={setSubject} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 lg:flex-col lg:items-end">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-violet-400/50" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-bold text-white">
                  {(user?.name || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <div className="text-xs text-[color:var(--app-muted)]">Уровень</div>
                <div className="font-bold text-[color:var(--app-fg)]">{level.label}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-orange-200">
              <span className="text-2xl">🔥</span>
              <div>
                <div className="text-xs text-orange-200/80">Streak</div>
                <div className="text-lg font-bold">
                  {streak.current} дн. <span className="text-sm font-normal text-[color:var(--app-muted)]">· лучший {streak.best}</span>
                </div>
              </div>
              {streak.badge && <span className="text-2xl">{streak.badge}</span>}
            </div>
          </div>
        </div>
      </motion.section>

      {!hasActivity && (
        <GlassCard className="border border-violet-400/25 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[color:var(--app-fg)]">Начни с первого теста</h2>
              <p className="mt-2 max-w-xl text-sm text-[color:var(--app-muted)]">
                Как только появятся ответы, здесь оживут прогноз, mastery по секциям, streak и AI-инсайты — без «0%» и пустых графиков.
              </p>
            </div>
            <Link
              to="/test"
              className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30"
            >
              Пройти тренировку
            </Link>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard delay={0.05}>
          <p className="text-sm text-[color:var(--app-muted)]">Текущий прогноз</p>
          <p className="mt-2 text-4xl font-extrabold text-[color:var(--app-fg)]">
            {scoreOn120}{' '}
            <span className="text-lg font-semibold text-[color:var(--app-muted)]">/ 120</span>
          </p>
          <p className="mt-1 text-xs text-[color:var(--app-muted)]">
            шкала ЕНТ · модель {predicted.toFixed(1)} / {subjectMax} по «{subject}»
          </p>
        </GlassCard>
        <GlassCard delay={0.1}>
          <p className="text-sm text-[color:var(--app-muted)]">Целевой балл</p>
          <p className="mt-2 text-4xl font-extrabold text-[color:var(--app-fg)]">{target}</p>
          <p className="mt-1 text-xs text-[color:var(--app-muted)]">в профиле</p>
        </GlassCard>
        <GlassCard delay={0.15}>
          <p className="text-sm text-[color:var(--app-muted)]">Confidence</p>
          <p className="mt-2 text-4xl font-extrabold text-emerald-400">{confidencePct}%</p>
          <p className="mt-1 text-xs text-[color:var(--app-muted)]">{pred?.confidence_level || '—'}</p>
        </GlassCard>
        <GlassCard delay={0.2}>
          <p className="text-sm text-[color:var(--app-muted)]">Streak</p>
          <p className="mt-2 text-4xl font-extrabold text-orange-400">{streak.current}</p>
          <p className="mt-1 text-xs text-[color:var(--app-muted)]">дней подряд · best {streak.best}</p>
        </GlassCard>
        <GlassCard delay={0.25}>
          <p className="text-sm text-[color:var(--app-muted)]">Сильная тема</p>
          <p className="mt-2 line-clamp-2 text-xl font-bold text-[color:var(--app-fg)]">{data?.topics?.strong || '—'}</p>
        </GlassCard>
        <GlassCard delay={0.3}>
          <p className="text-sm text-[color:var(--app-muted)]">Слабая тема</p>
          <p className="mt-2 line-clamp-2 text-xl font-bold text-[color:var(--app-fg)]">{data?.topics?.weak || '—'}</p>
        </GlassCard>
      </div>

      {userId && <WeeklyStudyPlan userId={userId} subject={subject} />}

      <GlassCard delay={0.35} className="hidden p-6 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-[color:var(--app-fg)]">AI insight (legacy)</h2>
            <p className="text-sm text-[color:var(--app-muted)]">Короткая рекомендация под твой профиль</p>
          </div>
          <Link
            to="/test"
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30"
          >
            В тренажёр
          </Link>
        </div>
        <div className="mt-4 min-h-[3rem] rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 text-[color:var(--app-fg)]">
          <p className="text-sm text-[color:var(--app-muted)]">См. блок «План обучения на неделю» ниже.</p>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard delay={0.4} className="min-h-[280px] p-4 md:p-6">
          <h3 className="mb-4 text-lg font-bold text-[color:var(--app-fg)]">Mastery по секциям</h3>
          {!hasMasteryChart ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--app-border)] bg-[color:var(--app-card)] p-6 text-center">
              <p className="text-sm font-medium text-[color:var(--app-fg)]">Пока недостаточно данных по этому предмету</p>
              <p className="mt-2 text-xs text-[color:var(--app-muted)]">Пройди тест по «{subject}», чтобы построить картину освоенности.</p>
              <Link to="/test" className="mt-4 text-sm font-semibold text-violet-400 hover:text-violet-300">
                В тренажёр →
              </Link>
            </div>
          ) : (
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={masteryBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} interval={0} angle={-18} textAnchor="end" height={70} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="mastery" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
          )}
        </GlassCard>

        <GlassCard delay={0.45} className="min-h-[320px] p-4 md:p-6">
          <h3 className="mb-4 text-lg font-bold text-[color:var(--app-fg)]">Динамика прогноза (оценка тренда)</h3>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                />
                <Line type="monotone" dataKey="score" stroke="#c084fc" strokeWidth={3} dot={false} name="оценка тренда" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard delay={0.5} className="p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[color:var(--app-fg)]">Активность</h3>
            <p className="text-sm text-[color:var(--app-muted)]">GitHub-style: каждая строка — неделя (пн→вс)</p>
          </div>
          <div className="flex gap-1.5 text-[10px] text-[color:var(--app-muted)]">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-white/10 ring-1 ring-white/10" /> 0</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-violet-500/40 ring-1 ring-white/10" /> 1–2</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-violet-500/70 ring-1 ring-white/10" /> 3–5</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-fuchsia-500/85 ring-1 ring-white/10" /> 6+</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 overflow-x-auto pb-1">
          {heatmapRows.map((row, ri) => (
            <div key={ri} className="flex gap-1">
              {row.map((d) => {
                const c = d.count || 0
                const level =
                  c === 0 ? 'bg-white/10' : c < 3 ? 'bg-violet-500/40' : c < 6 ? 'bg-violet-500/70' : 'bg-fuchsia-500/85'
                return (
                  <motion.div
                    key={d.date}
                    title={`${d.date}: ${c} ответов`}
                    initial={{ opacity: 0.6 }}
                    whileHover={{ scale: 1.25 }}
                    className={`h-3.5 w-3.5 shrink-0 rounded-[3px] ${level} ring-1 ring-black/10 dark:ring-white/10`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
