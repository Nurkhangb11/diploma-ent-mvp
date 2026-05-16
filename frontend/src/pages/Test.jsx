import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useSubject } from '../context/SubjectContext'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import GlassCard from '../components/GlassCard'
import Spinner from '../components/Spinner'

export default function Test() {
  const { userId, authLoading } = useUser()
  const { setSubject: setGlobalSubject } = useSubject()
  const navigate = useNavigate()
  const [selectedSubject, setSelectedSubject] = useState('')
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [aiFeedback, setAiFeedback] = useState('')
  const [aiFeedbackLoading, setAiFeedbackLoading] = useState(false)
  const [aiFeedbackError, setAiFeedbackError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [options, setOptions] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [sessionCount, setSessionCount] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!userId) navigate('/login')
  }, [authLoading, userId, navigate])

  const subjectCards = [
    {
      id: 'math',
      name: 'Математическая грамотность',
      desc: 'Логика, базовые вычисления и практические задачи.',
      count: 'Адаптивная серия',
      icon: '🧮',
    },
    {
      id: 'history',
      name: 'История Казахстана',
      desc: 'События, даты, личности и процессы.',
      count: 'Адаптивная серия',
      icon: '🏛️',
    },
    {
      id: 'reading',
      name: 'Грамотность чтения',
      desc: 'Понимание и анализ текстов.',
      count: 'Адаптивная серия',
      icon: '📘',
    },
  ]

  const fetchQuestion = async (subjectOverride) => {
    const subjectParam = subjectOverride ?? selectedSubject
    setLoading(true)
    setSelectedAnswer('')
    setResult(null)
    setAiFeedback('')
    setAiFeedbackError('')
    setChatOpen(false)
    setChatMessages([])
    setChatInput('')
    setChatError('')
    try {
      const response = await fetch(
        `/api/questions?user_id=${userId}&subject=${encodeURIComponent(subjectParam)}`
      )
      const data = await response.json()
      if (data.length > 0) {
        const q = data[0]
        setQuestion(q)
        try {
          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
          setOptions(opts || [])
        } catch {
          setOptions([])
        }
        setSessionCount((c) => c + 1)
      } else {
        setQuestion(null)
        setOptions([])
      }
    } catch (error) {
      console.error('Error fetching question:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerSelect = (answer) => {
    if (!result) setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !question) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          question_id: question.id,
          user_answer: selectedAnswer,
        }),
      })

      const data = await response.json()
      const nextResult = {
        correct: data.correct,
        correct_answer: data.correct_answer,
        explanation: data.explanation,
      }
      setResult(nextResult)
      if (!nextResult.correct) await fetchAIFeedback(nextResult)
      else {
        setAiFeedback('')
        setAiFeedbackError('')
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => fetchQuestion()

  const startTest = (subjectName) => {
    setGlobalSubject(subjectName)
    setSelectedSubject(subjectName)
    setSessionCount(0)
    fetchQuestion(subjectName)
  }

  const fetchAIFeedback = async (answerResult) => {
    if (!question) return
    setAiFeedback('')
    setAiFeedbackError('')
    setAiFeedbackLoading(true)
    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.question_text,
          correct_answer: answerResult.correct_answer,
          user_answer: selectedAnswer,
          explanation: answerResult.explanation || '',
        }),
      })
      if (!response.ok) throw new Error('AI feedback request failed')
      const data = await response.json()
      setAiFeedback(data.ai_feedback || '')
    } catch (error) {
      console.error('Error getting AI feedback:', error)
      setAiFeedbackError('Не удалось получить подсказку от AI.')
    } finally {
      setAiFeedbackLoading(false)
    }
  }

  const openChat = () => {
    setChatOpen(true)
    setChatError('')
    if (chatMessages.length === 0) {
      setChatMessages([
        { role: 'ai', text: 'Разберём этот вопрос вместе. Что именно непонятно?' },
      ])
    }
  }

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading || !result) return
    setChatMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setChatInput('')
    setChatError('')
    setChatLoading(true)
    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: {
            question: question?.question_text || '',
            correct_answer: result.correct_answer,
            user_answer: selectedAnswer,
          },
        }),
      })
      if (!response.ok) throw new Error('AI chat request failed')
      const data = await response.json()
      setChatMessages((prev) => [...prev, { role: 'ai', text: data.reply || 'Не удалось получить ответ.' }])
    } catch (error) {
      console.error('Error sending message to AI chat:', error)
      setChatError('Ошибка отправки. Попробуйте снова.')
    } finally {
      setChatLoading(false)
    }
  }

  const progressPct = Math.min(100, sessionCount * 12)

  const optionClass = (option) => {
    if (!result) {
      const sel = selectedAnswer === option
      return sel
        ? 'border-violet-400 bg-violet-500/15 shadow-[0_0_24px_-8px_rgba(139,92,246,0.5)]'
        : 'border-[color:var(--app-border)] bg-[color:var(--app-card)] hover:border-violet-400/40'
    }
    if (option === result.correct_answer) return 'border-emerald-400/80 bg-emerald-500/15 ring-2 ring-emerald-400/40'
    if (option === selectedAnswer && !result.correct) return 'border-red-400/80 bg-red-500/15 ring-2 ring-red-400/40'
    return 'border-[color:var(--app-border)] opacity-60'
  }

  if (!selectedSubject) {
    return (
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-extrabold tracking-tight text-[color:var(--app-fg)] md:text-5xl">
            Выберите <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">предмет</span>
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-[color:var(--app-muted)]">
            Адаптивная выдача вопросов и мгновенный разбор через AI.
          </p>
        </motion.div>
        <div className="grid gap-5 md:grid-cols-3">
          {subjectCards.map((subject, i) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
            >
              <GlassCard className="flex h-full flex-col p-6">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl shadow-lg">
                  {subject.icon}
                </div>
                <h2 className="text-xl font-bold text-[color:var(--app-fg)]">{subject.name}</h2>
                <p className="mt-2 flex-1 text-sm text-[color:var(--app-muted)]">{subject.desc}</p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-[color:var(--app-muted)]">{subject.count}</p>
                <motion.button
                  type="button"
                  onClick={() => startTest(subject.name)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25"
                >
                  Начать
                </motion.button>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="text-sm text-[color:var(--app-muted)]">Подбираем вопрос…</p>
      </div>
    )
  }

  if (!question) {
    return (
      <GlassCard className="p-10 text-center">
        <p className="text-[color:var(--app-muted)]">Вопросы не найдены</p>
        <button
          type="button"
          onClick={() => setSelectedSubject('')}
          className="mt-6 rounded-xl border border-[color:var(--app-border)] px-6 py-2 text-sm font-semibold"
        >
          Назад к предметам
        </button>
      </GlassCard>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">Сессия</p>
          <p className="text-[color:var(--app-muted)]">
            {selectedSubject} · вопрос <span className="font-semibold text-[color:var(--app-fg)]">#{sessionCount}</span>
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--app-card)] sm:max-w-xs">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35 }}
        >
          <GlassCard hover={false} className="p-6 md:p-8">
            <div className="mb-6 inline-flex rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-1 text-xs font-medium text-[color:var(--app-muted)]">
              {question.topic}
            </div>
            <h2 className="text-xl font-semibold leading-snug text-[color:var(--app-fg)] md:text-2xl">{question.question_text}</h2>

            <div className="mt-8 space-y-3">
              {options.map((option, index) => (
                <motion.button
                  key={index}
                  type="button"
                  onClick={() => handleAnswerSelect(option)}
                  disabled={!!result}
                  whileHover={!result ? { scale: 1.01 } : {}}
                  whileTap={!result ? { scale: 0.99 } : {}}
                  className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition ${optionClass(option)}`}
                >
                  <span
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      selectedAnswer === option ? 'border-violet-400 bg-violet-500 text-white' : 'border-[color:var(--app-border)]'
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-[color:var(--app-fg)]">{option}</span>
                </motion.button>
              ))}
            </div>

            {!result && (
              <motion.button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer || submitting}
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                className="mt-8 w-full rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3.5 font-semibold text-white shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Проверка…' : 'Ответить'}
              </motion.button>
            )}
          </GlassCard>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
            onClick={(e) => e.target === e.currentTarget && null}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                boxShadow: result.correct
                  ? '0 0 80px -20px rgba(52, 211, 153, 0.45)'
                  : '0 0 80px -20px rgba(248, 113, 113, 0.35)',
              }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className={`glass-panel max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border p-6 md:p-8 ${
                result.correct ? 'border-emerald-400/40' : 'border-red-400/35'
              }`}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.05 }}
                  className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl ${
                    result.correct ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  {result.correct ? '✓' : '✗'}
                </motion.div>
                <h3 className={`text-2xl font-bold ${result.correct ? 'text-emerald-300' : 'text-red-300'}`}>
                  {result.correct ? 'Отлично!' : 'Почти — разберём ошибку'}
                </h3>
                <p className="mt-2 text-sm text-[color:var(--app-muted)]">
                  {result.correct ? 'Так держать — переходи к следующему вопросу.' : 'Ниже правильный ответ и подсказка AI.'}
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] p-4 text-sm">
                <span className="text-[color:var(--app-muted)]">Верный ответ:</span>
                <p className="mt-1 font-semibold text-[color:var(--app-fg)]">{result.correct_answer}</p>
              </div>

              {result.explanation && (
                <div className="mt-4 rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] p-4 text-sm text-[color:var(--app-fg)]">
                  <span className="font-semibold text-[color:var(--app-muted)]">Комментарий: </span>
                  {result.explanation}
                </div>
              )}

              {!result.correct && (
                <div className="mt-4 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">AI-разбор</p>
                  {aiFeedbackLoading && <p className="mt-2 animate-pulse text-sm text-violet-200">Анализ ответа…</p>}
                  {!aiFeedbackLoading && aiFeedbackError && <p className="mt-2 text-sm text-red-300">{aiFeedbackError}</p>}
                  {!aiFeedbackLoading && !aiFeedbackError && aiFeedback && (
                    <p className="mt-2 text-sm leading-relaxed text-[color:var(--app-fg)]">{aiFeedback}</p>
                  )}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <motion.button
                  type="button"
                  onClick={openChat}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 rounded-xl border border-[color:var(--app-border)] py-3 font-semibold text-[color:var(--app-fg)]"
                >
                  Обсудить с AI
                </motion.button>
                <motion.button
                  type="button"
                  onClick={handleNext}
                  whileHover={{ scale: 1.02 }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 font-semibold text-white shadow-lg"
                >
                  Дальше
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {chatOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-panel flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[color:var(--app-border)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[color:var(--app-border)] px-5 py-4">
              <h3 className="font-semibold text-[color:var(--app-fg)]">Обсуждение с AI</h3>
              <button type="button" onClick={() => setChatOpen(false)} className="text-sm text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]">
                Закрыть
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-black/10 p-4">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
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
                    Печатает…
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
                  placeholder="Вопрос по теме…"
                  className="flex-1 rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-3 py-2.5 text-sm text-[color:var(--app-fg)] focus:border-violet-400/60 focus:outline-none"
                />
                <motion.button
                  type="button"
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Отправить
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
