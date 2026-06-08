import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { authHeaders } from '../../lib/api'
import { useTranslation } from '../../context/LanguageContext'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'

const EMPTY_FORM = {
  subject: '',
  topic: '',
  question_text: '',
  options: ['', '', '', ''],
  correct_answer: '',
  explanation: '',
}

export default function AdminQuestions() {
  const { token } = useUser()
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [questions, setQuestions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterSubject, setFilterSubject] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const limit = 15

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filterSubject) params.set('subject', filterSubject)
      const res = await fetch(`/api/admin/questions?${params}`, {
        headers: authHeaders(token),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setQuestions(data.questions || [])
      setTotal(data.total || 0)
    } catch {
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    fetch(`/api/admin/subjects`, { headers: authHeaders(token) })
      .then((r) => r.json())
      .then((d) => setSubjects(d.subjects || []))
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (token) fetchQuestions()
  }, [token, page, filterSubject])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleOptionChange = (idx, value) => {
    setForm((f) => {
      const options = [...f.options]
      options[idx] = value
      return { ...f, options }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const options = form.options.map((o) => o.trim()).filter(Boolean)
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({
          subject: form.subject.trim(),
          topic: form.topic.trim(),
          question_text: form.question_text.trim(),
          options,
          correct_answer: form.correct_answer.trim(),
          explanation: form.explanation.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || t('admin.createFailed'), 'error')
        return
      }
      showToast(t('admin.createSuccess'), 'success')
      setForm(EMPTY_FORM)
      setShowForm(false)
      setPage(1)
      fetchQuestions()
      if (!subjects.includes(form.subject.trim())) {
        setSubjects((s) => [...s, form.subject.trim()].sort())
      }
    } catch {
      showToast(t('admin.createFailed'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[color:var(--app-fg)]">{t('admin.questionsTitle')}</h1>
          <p className="mt-2 text-[color:var(--app-muted)]">{t('admin.questionsSub')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25"
        >
          {showForm ? t('admin.cancel') : t('admin.addQuestion')}
        </button>
      </div>

      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="glass-panel mb-8 rounded-2xl p-6"
        >
          <h2 className="mb-4 text-lg font-bold text-[color:var(--app-fg)]">{t('admin.newQuestion')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.subject')}</label>
              <input
                list="subjects-list"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                required
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm"
                placeholder={t('admin.subjectPlaceholder')}
              />
              <datalist id="subjects-list">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.topic')}</label>
              <input
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                required
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">{t('admin.questionText')}</label>
            <textarea
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
              required
              rows={3}
              className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {form.options.map((opt, i) => (
              <div key={i}>
                <label className="mb-1 block text-sm font-medium">
                  {t('admin.option')} {i + 1}
                </label>
                <input
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.correctAnswer')}</label>
              <input
                value={form.correct_answer}
                onChange={(e) => setForm((f) => ({ ...f, correct_answer: e.target.value }))}
                required
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.explanation')}</label>
              <input
                value={form.explanation}
                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                className="w-full rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? t('admin.saving') : t('admin.save')}
          </button>
        </motion.form>
      )}

      <div className="mb-4">
        <select
          value={filterSubject}
          onChange={(e) => {
            setFilterSubject(e.target.value)
            setPage(1)
          }}
          className="rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2 text-sm"
        >
          <option value="">{t('admin.allSubjects')}</option>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <p className="text-center text-[color:var(--app-muted)]">{t('admin.noQuestions')}</p>
          ) : (
            questions.map((q) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel rounded-2xl p-5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 font-semibold text-violet-300">
                    #{q.id}
                  </span>
                  <span className="text-[color:var(--app-muted)]">{q.subject}</span>
                  <span className="text-[color:var(--app-muted)]">·</span>
                  <span className="text-[color:var(--app-muted)]">{q.topic}</span>
                </div>
                <p className="font-medium text-[color:var(--app-fg)]">{q.question_text}</p>
                <ul className="mt-3 space-y-1 text-sm text-[color:var(--app-muted)]">
                  {(q.options || []).map((opt, i) => (
                    <li
                      key={i}
                      className={opt === q.correct_answer ? 'font-semibold text-emerald-400' : ''}
                    >
                      {opt === q.correct_answer ? '✓ ' : '· '}
                      {opt}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-[color:var(--app-border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-sm text-[color:var(--app-muted)]">
                {t('admin.pageOf', { page, total: totalPages })}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[color:var(--app-border)] px-3 py-1.5 text-sm disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
