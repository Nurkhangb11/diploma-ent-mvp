import { useState, useEffect, useMemo } from 'react'
import { useUser } from '../context/UserContext'
import { useSubject } from '../context/SubjectContext'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts'
import GlassCard from '../components/GlassCard'
import SubjectSwitcher from '../components/SubjectSwitcher'
import Spinner from '../components/Spinner'
import { predictionSubjectMax } from '../lib/subjectMax'

export default function Prediction() {
  const { userId, userName, targetScore, authLoading } = useUser()
  const { subject, setSubject } = useSubject()
  const navigate = useNavigate()
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aiTip, setAiTip] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const fetchPrediction = async () => {
    if (!userId) return

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/prediction/${userId}?subject=${encodeURIComponent(subject)}`)
      if (!response.ok) throw new Error('Failed to fetch prediction')
      const data = await response.json()
      setPrediction(data)
    } catch (err) {
      setError('Ошибка при загрузке прогноза')
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      navigate('/login')
      return
    }
    fetchPrediction()
  }, [authLoading, userId, navigate, subject])

  useEffect(() => {
    if (!prediction?.section_scores?.length) return
    const weak = prediction.section_scores.reduce((a, b) => ((a.mastery ?? 1) < (b.mastery ?? 1) ? a : b))
    let cancelled = false
    const run = async () => {
      setAiLoading(true)
      setAiTip('')
      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Одно короткое предложение: что повторить для ЕНТ по теме «${weak.section_name}». Без новых фактов.`,
            context: {
              question: 'Рекомендация AI по прогнозу',
              correct_answer: '',
              user_answer: '',
            },
          }),
        })
        const j = await res.json()
        if (!cancelled && res.ok) setAiTip(j.reply || '')
      } catch {
        if (!cancelled) setAiTip(`Имеет смысл уделить время теме «${weak.section_name}».`)
      } finally {
        if (!cancelled) setAiLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [prediction, subject])

  const scoreOn120 = useMemo(() => {
    const p = prediction?.predicted_score ?? 0
    return Math.min(120, Math.max(0, Math.round((p / 20) * 120)))
  }, [prediction])

  const subjectMax = predictionSubjectMax(prediction, subject)
  const target = targetScore || 120
  const progressToTarget = Math.min(100, target > 0 ? (scoreOn120 / target) * 100 : 0)

  const radialData = useMemo(
    () => [{ name: 't', value: progressToTarget, fill: 'url(#radGrad)' }],
    [progressToTarget]
  )

  const masteryBars = useMemo(() => {
    const sections = prediction?.section_scores || []
    return sections.map((s) => ({
      name: s.section_name.length > 16 ? `${s.section_name.slice(0, 16)}…` : s.section_name,
      mastery: Math.round((s.mastery || 0) * 100),
    }))
  }, [prediction])

  const confidenceLabel = (level) => {
    switch (level) {
      case 'high':
        return 'Высокая'
      case 'medium':
        return 'Средняя'
      case 'low':
        return 'Низкая'
      default:
        return '—'
    }
  }

  if (loading && !prediction) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="text-sm text-[color:var(--app-muted)]">Считаем прогноз…</p>
      </div>
    )
  }

  if (error) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-red-400">{error}</p>
        <button type="button" onClick={fetchPrediction} className="mt-4 text-violet-400 underline">
          Повторить
        </button>
      </GlassCard>
    )
  }

  if (!prediction) {
    return (
      <GlassCard className="p-10 text-center">
        <p className="text-[color:var(--app-muted)]">Прогноз не найден</p>
      </GlassCard>
    )
  }

  const confPct = Math.round((prediction.confidence || 0) * 100)

  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-[color:var(--app-muted)]">{userName ? `Привет, ${userName}` : 'Прогноз'}</p>
        <h1 className="mt-1 text-4xl font-extrabold text-[color:var(--app-fg)] md:text-5xl">Твой прогноз</h1>
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[color:var(--app-muted)]">Предмет</p>
          <SubjectSwitcher value={subject} onChange={setSubject} />
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard delay={0.05} className="relative overflow-hidden p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative flex flex-col items-center">
            <div className="relative h-52 w-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="68%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={10} background={{ fill: 'rgba(148,163,184,0.15)' }} />
                  <defs>
                    <linearGradient id="radGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#e879f9" />
                    </linearGradient>
                  </defs>
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold tabular-nums text-[color:var(--app-fg)]">{scoreOn120}</span>
                <span className="text-sm text-[color:var(--app-muted)]">/ {target} цель</span>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-[color:var(--app-muted)]">
              Модель по предмету: <span className="font-semibold text-[color:var(--app-fg)]">{prediction.predicted_score.toFixed(1)}</span> / {subjectMax} · на шкале ЕНТ ≈{' '}
              {scoreOn120} / 120
            </p>
          </div>
        </GlassCard>

        <GlassCard delay={0.08} className="p-8">
          <h2 className="text-lg font-bold text-[color:var(--app-fg)]">Уверенность модели</h2>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-5xl font-extrabold text-emerald-400">{confPct}%</p>
              <p className="mt-1 text-sm font-medium text-[color:var(--app-muted)]">{confidenceLabel(prediction.confidence_level)}</p>
            </div>
            <span className="rounded-full border border-[color:var(--app-border)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--app-muted)]">
              {prediction.confidence_level}
            </span>
          </div>
          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-black/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
              initial={{ width: 0 }}
              animate={{ width: `${confPct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          {prediction.message && (
            <p className="mt-6 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] p-4 text-sm leading-relaxed text-[color:var(--app-muted)]">
              {prediction.message}
            </p>
          )}
        </GlassCard>
      </div>

      <GlassCard delay={0.1} className="p-6 md:p-8">
        <h3 className="text-lg font-bold text-[color:var(--app-fg)]">AI рекомендация</h3>
        <div className="mt-4 min-h-[3rem] rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4">
          {aiLoading && <p className="animate-pulse text-sm text-violet-300">Подбираем формулировку…</p>}
          {!aiLoading && <p className="text-sm leading-relaxed text-[color:var(--app-fg)]">{aiTip}</p>}
        </div>
      </GlassCard>

      {masteryBars.length > 0 ? (
        <GlassCard delay={0.12} className="min-h-[320px] p-4 md:p-6">
          <h3 className="mb-6 text-lg font-bold text-[color:var(--app-fg)]">Освоенность по секциям</h3>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={masteryBars} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--app-muted)', fontSize: 11 }} interval={0} angle={-14} textAnchor="end" height={72} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--app-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--app-card)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 12,
                  }}
                  formatter={(v) => [`${v}%`, 'mastery']}
                />
                <Bar dataKey="mastery" fill="url(#predBar)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="predBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      ) : (
        <GlassCard delay={0.12} className="p-8 text-center md:text-left">
          <h3 className="text-lg font-bold text-[color:var(--app-fg)]">Mastery по секциям</h3>
          <p className="mt-3 text-sm text-[color:var(--app-muted)]">
            Пока недостаточно данных для графика по «{subject}». Пройди несколько вопросов в тренажёре — модель покажет освоенность по темам.
          </p>
        </GlassCard>
      )}

      <div className="flex justify-center pb-8">
        <motion.button
          type="button"
          onClick={fetchPrediction}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-10 py-3 font-semibold text-white shadow-xl shadow-violet-500/30"
        >
          Обновить прогноз
        </motion.button>
      </div>
    </div>
  )
}
