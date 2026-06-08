import { useState, useEffect, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useSubject } from '../context/SubjectContext'
import { useTranslation } from '../context/LanguageContext'
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
  LineChart,
  Line,
} from 'recharts'
import GlassCard from '../components/GlassCard'
import Spinner from '../components/Spinner'
import SubjectSwitcher from '../components/SubjectSwitcher'
import { predictionSubjectMax } from '../lib/subjectMax'
import { apiFetch, apiJsonBody } from '../lib/api'
import { SUBJECT_KEYS, subjectLabel } from '../i18n'

const SUBJECTS = SUBJECT_KEYS

export default function Progress() {
  const { userId, authLoading } = useUser()
  const { subject, setSubject } = useSubject()
  const { t, locale } = useTranslation()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subjectPredictions, setSubjectPredictions] = useState({})
  const [dash, setDash] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [aiInsight, setAiInsight] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const fetchDashboard = useCallback(async () => {
    if (!userId) return
    try {
      const res = await apiFetch(`/api/dashboard/${userId}?subject=${encodeURIComponent(subject)}`, locale)
      if (res.ok) setDash(await res.json())
    } catch {
      /* ignore */
    }
  }, [userId, subject, locale])

  const fetchProgress = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await apiFetch(`/api/progress/${userId}`, locale)
      const data = await response.json()
      setProgress(data)
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }, [userId, locale])

  const fetchPredictionsBySubject = useCallback(async () => {
    if (!userId) return
    const entries = await Promise.all(
      SUBJECTS.map(async (subjectName) => {
        try {
          const res = await apiFetch(`/api/prediction/${userId}?subject=${encodeURIComponent(subjectName)}`, locale)
          if (!res.ok) return [subjectName, null]
          const data = await res.json()
          return [subjectName, data]
        } catch {
          return [subjectName, null]
        }
      })
    )
    setSubjectPredictions(Object.fromEntries(entries))
  }, [userId, locale])

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      navigate('/login')
      return
    }
    fetchProgress()
  }, [authLoading, userId, navigate, fetchProgress])

  useEffect(() => {
    if (!userId) return
    fetchPredictionsBySubject()
  }, [userId, fetchPredictionsBySubject])

  useEffect(() => {
    if (!userId) return
    fetchDashboard()
  }, [userId, subject, fetchDashboard])

  const scoreSummary = useMemo(() => {
    return SUBJECTS.map((name) => {
      const p = subjectPredictions[name]
      const pred = p?.predicted_score ?? 0
      const max = predictionSubjectMax(p, name)
      const on120 = Math.min(120, Math.round((pred / 20) * 120))
      const label = subjectLabel(locale, name)
      return {
        name: label.length > 14 ? `${label.slice(0, 12)}…` : label,
        fullName: name,
        predicted: pred,
        max,
        on120,
        confidence: Math.round((p?.confidence || 0) * 100),
      }
    })
  }, [subjectPredictions, locale])

  const weakStrongBySubject = useMemo(() => {
    return SUBJECTS.map((sn) => {
      const p = subjectPredictions[sn]
      const sections = p?.section_scores || []
      if (sections.length === 0) return { subject: sn, weak: '—', strong: '—' }
      let weak = sections[0].section_name
      let strong = sections[0].section_name
      let wm = sections[0].mastery ?? 0
      let sm = sections[0].mastery ?? 0
      sections.forEach((s) => {
        const m = s.mastery ?? 0
        if (m < wm) {
          wm = m
          weak = s.section_name
        }
        if (m > sm) {
          sm = m
          strong = s.section_name
        }
      })
      return { subject: sn, weak, strong }
    })
  }, [subjectPredictions])

  const activitySeries = useMemo(() => {
    const h = dash?.heatmap || []
    const last = h.slice(-28)
    return last.map((d) => ({
      date: d.date.slice(5),
      count: d.count || 0,
    }))
  }, [dash])

  useEffect(() => {
    if (!progress || progress.total_questions === 0) return
    let cancelled = false
    const wrong = progress.wrong_questions?.length || 0
    const run = async () => {
      setAiLoading(true)
      setAiInsight('')
      try {
        const res = await fetch('/api/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: apiJsonBody(
            {
              message: `Brief (2 sentences): study advice. Mistakes in history: ${wrong}. No invented facts.`,
              context: {
                question: t('progress.aiInsight'),
                correct_answer: '',
                user_answer: '',
              },
            },
            locale
          ),
        })
        const j = await res.json()
        if (!cancelled && res.ok) setAiInsight(j.reply || '')
      } catch {
        if (!cancelled) setAiInsight(t('progress.aiFallback'))
      } finally {
        if (!cancelled) setAiLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [progress?.total_questions, progress?.wrong_questions?.length, locale, t])

  const openChat = () => {
    setChatOpen(true)
    setChatError('')
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          role: 'ai',
          text: t('progress.chatIntro'),
        },
      ])
    }
  }

  const buildMistakesContext = () => {
    const wrong = progress?.wrong_questions || []
    if (wrong.length === 0) return t('progress.noWrong')
    return wrong
      .slice(0, 12)
      .map((q, idx) => `${idx + 1}) [${q.topic || t('progress.noTopic')}] ${q.question_text} | ${q.correct_answer}`)
      .join('\n')
  }

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return

    setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setChatInput('')
    setChatError('')
    setChatLoading(true)

    try {
      const messageWithContext = `${trimmed}\n\nКонтекст ошибок пользователя:\n${buildMistakesContext()}`
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: apiJsonBody(
          {
            message: messageWithContext,
            context: {
              question: t('progress.wrongReview'),
              correct_answer: '',
              user_answer: '',
            },
          },
          locale
        ),
      })
      if (!response.ok) throw new Error('Chat request failed')

      const data = await response.json()
      setChatMessages((prev) => [...prev, { role: 'ai', text: data.reply || t('progress.chatNoReply') }])
    } catch (error) {
      console.error('AI chat error:', error)
      setChatError(t('progress.chatSendError'))
    } finally {
      setChatLoading(false)
    }
  }

  const streak = dash?.streak || { current: 0, best: 0, badge: '' }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="text-sm text-[color:var(--app-muted)]">{t('progress.loadingAnalytics')}</p>
      </div>
    )
  }

  if (!progress) {
    return (
      <GlassCard className="p-10 text-center">
        <p className="text-[color:var(--app-muted)]">{t('progress.notFound')}</p>
      </GlassCard>
    )
  }

  const totalAttempts = progress.total_questions

  return (
    <div className="space-y-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-extrabold text-[color:var(--app-fg)] md:text-5xl">{t('progress.analyticsTitle')}</h1>
        <p className="mt-2 text-[color:var(--app-muted)]">{t('progress.analyticsSubtitle')}</p>
        <div className="mt-6 max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--app-muted)]">{t('progress.subjectHeatmapHint')}</p>
          <SubjectSwitcher value={subject} onChange={setSubject} />
        </div>
      </motion.div>

      {totalAttempts === 0 && (
        <GlassCard className="border border-violet-400/25 bg-violet-500/5 p-6 md:p-8">
          <h2 className="text-lg font-bold text-[color:var(--app-fg)]">{t('progress.noAnswersTitle')}</h2>
          <p className="mt-2 text-sm text-[color:var(--app-muted)]">{t('progress.noAnswersDesc')}</p>
          <Link
            to="/test"
            className="mt-5 inline-flex rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg"
          >
            {t('progress.startTraining')}
          </Link>
        </GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard delay={0.05}>
          <p className="text-sm text-[color:var(--app-muted)]">{t('progress.total')}</p>
          <p className="mt-2 text-4xl font-extrabold text-[color:var(--app-fg)]">{progress.total_questions}</p>
        </GlassCard>
        <GlassCard delay={0.08}>
          <p className="text-sm text-[color:var(--app-muted)]">{t('progress.correct')}</p>
          <p className="mt-2 text-4xl font-extrabold text-emerald-400">{progress.correct_answers}</p>
        </GlassCard>
        <GlassCard delay={0.11}>
          <p className="text-sm text-[color:var(--app-muted)]">{t('progress.accuracy')}</p>
          <p className="mt-2 text-4xl font-extrabold text-violet-400">{progress.percentage.toFixed(1)}%</p>
        </GlassCard>
      </div>

      <GlassCard delay={0.12} className="p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[color:var(--app-fg)]">{t('progress.streakTitle')}</h2>
            <p className="text-sm text-[color:var(--app-muted)]">
              {t('progress.streakCurrent', { current: streak.current, best: streak.best, badge: streak.badge || '' })}
            </p>
          </div>
        </div>
        <div className="mb-2 flex justify-between text-xs text-[color:var(--app-muted)]">
          <span>{t('progress.overallProgress')}</span>
          <span>
            {progress.correct_answers} / {progress.total_questions}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-black/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, progress.percentage)}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard delay={0.14} className="min-h-[300px] p-4 md:p-6">
          <h3 className="mb-4 text-lg font-bold text-[color:var(--app-fg)]">{t('progress.subjectScores')}</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreSummary} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--app-muted)', fontSize: 11 }} />
                <YAxis domain={[0, 120]} tick={{ fill: 'var(--app-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--app-card)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 12,
                    color: 'var(--app-fg)',
                  }}
                  formatter={(v) => [`${v} / 120`, t('progress.forecastChart')]}
                />
                <Bar dataKey="on120" fill="url(#progGrad)" radius={[8, 8, 0, 0]} />
                <defs>
                  <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard delay={0.16} className="min-h-[300px] p-4 md:p-6">
          <h3 className="mb-4 text-lg font-bold text-[color:var(--app-fg)]">{t('progress.activity28')}</h3>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activitySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--app-muted)', fontSize: 10 }} hide />
                <YAxis tick={{ fill: 'var(--app-muted)', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--app-card)',
                    border: '1px solid var(--app-border)',
                    borderRadius: 12,
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#a78bfa" strokeWidth={2} dot={false} name={t('progress.answersPerDay')} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard delay={0.18} className="p-6 md:p-8">
        <h3 className="text-lg font-bold text-[color:var(--app-fg)]">{t('progress.aiInsightTitle')}</h3>
        <p className="text-sm text-[color:var(--app-muted)]">{t('progress.aiInsightSub')}</p>
        <div className="mt-4 min-h-[3rem] rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
          {aiLoading && <p className="animate-pulse text-sm text-violet-300">{t('progress.aiGenerating')}</p>}
          {!aiLoading && <p className="text-sm leading-relaxed text-[color:var(--app-fg)]">{aiInsight}</p>}
        </div>
      </GlassCard>

      <section>
        <h2 className="mb-6 text-2xl font-bold text-[color:var(--app-fg)]">{t('progress.weakStrongTitle')}</h2>
        <div className="space-y-5">
          {SUBJECTS.map((subjectName, idx) => {
            const data = subjectPredictions[subjectName]
            const hasSections = data?.section_scores?.length > 0
            const ws = weakStrongBySubject.find((x) => x.subject === subjectName)

            return (
              <motion.div
                key={subjectName}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <GlassCard className="p-6">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-xl font-bold text-[color:var(--app-fg)]">{subjectLabel(locale, subjectName)}</h3>
                    {hasSections && (
                      <span className="text-sm text-[color:var(--app-muted)]">
                        {t('progress.modelForecast')}{' '}
                        <span className="font-semibold text-violet-400">
                          {data.predicted_score?.toFixed?.(1) ?? data.predicted_score} / {predictionSubjectMax(data, subjectName)}
                        </span>{' '}
                        · {t('progress.confidence')} {Math.round((data.confidence || 0) * 100)}%
                      </span>
                    )}
                  </div>

                  {ws && (
                    <div className="mb-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm">
                        <span className="text-[color:var(--app-muted)]">{t('progress.strongest')}</span>
                        <p className="font-semibold text-[color:var(--app-fg)]">{ws.strong}</p>
                      </div>
                      <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm">
                        <span className="text-[color:var(--app-muted)]">{t('progress.needsWork')}</span>
                        <p className="font-semibold text-[color:var(--app-fg)]">{ws.weak}</p>
                      </div>
                    </div>
                  )}

                  {!hasSections ? (
                    <p className="text-[color:var(--app-muted)]">{t('progress.fewData')}</p>
                  ) : (
                    <div className="space-y-4">
                      {data.section_scores.map((section, sidx) => (
                        <div key={`${subjectName}-${sidx}`}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-[color:var(--app-fg)]">{section.section_name}</span>
                            <span className="text-xs text-[color:var(--app-muted)]">
                              {t('progress.mastery')} {(section.mastery * 100).toFixed(0)}% · {t('progress.score')} {section.score.toFixed(1)} / {section.weight}
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/10">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(0, Math.min(100, section.mastery * 100))}%` }}
                              transition={{ duration: 0.6, delay: 0.03 * sidx }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </section>

      <motion.button
        type="button"
        onClick={openChat}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.06 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl text-white shadow-xl shadow-violet-500/40"
        aria-label={t('progress.chatAria')}
      >
        💬
      </motion.button>

      {chatOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[color:var(--app-border)]"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--app-border)] px-5 py-4">
              <h3 className="font-semibold text-[color:var(--app-fg)]">{t('progress.chatTitle')}</h3>
              <button type="button" onClick={() => setChatOpen(false)} className="text-sm text-[color:var(--app-muted)]">
                {t('progress.chatClose')}
              </button>
            </div>
            <div className="h-80 space-y-3 overflow-y-auto p-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white'
                        : 'border border-[color:var(--app-border)] bg-[color:var(--app-card)] text-[color:var(--app-fg)]'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[color:var(--app-border)] px-4 py-2 text-sm text-[color:var(--app-muted)]">
                    {t('progress.chatTyping')}
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-[color:var(--app-border)] p-4">
              {chatError && <div className="mb-2 text-sm text-red-400">{chatError}</div>}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendChatMessage()
                    }
                  }}
                  placeholder={t('progress.chatPlaceholder')}
                  className="flex-1 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm text-[color:var(--app-fg)]"
                />
                <button
                  type="button"
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t('progress.chatSend')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
