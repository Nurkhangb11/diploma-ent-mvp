import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

function Progress() {
  const { userId, authLoading } = useUser()
  const navigate = useNavigate()
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subjectPredictions, setSubjectPredictions] = useState({})
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  const subjects = [
    'Математическая грамотность',
    'Грамотность чтения',
    'История Казахстана',
  ]

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      navigate('/login')
      return
    }
    fetchProgress()
  }, [authLoading, userId, navigate])

  const fetchProgress = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/progress/${userId}`)
      const data = await response.json()
      setProgress(data)
      await fetchPredictionsBySubject()
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPredictionsBySubject = async () => {
    if (!userId) return
    const entries = await Promise.all(
      subjects.map(async (subjectName) => {
        try {
          const res = await fetch(`/api/prediction/${userId}?subject=${encodeURIComponent(subjectName)}`)
          if (!res.ok) return [subjectName, null]
          const data = await res.json()
          return [subjectName, data]
        } catch (e) {
          return [subjectName, null]
        }
      })
    )
    setSubjectPredictions(Object.fromEntries(entries))
  }

  const openChat = () => {
    setChatOpen(true)
    setChatError('')
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          role: 'ai',
          text: 'Я AI-наставник по вашим ошибкам. Задайте вопрос, и я помогу разобрать слабые места.',
        },
      ])
    }
  }

  const buildMistakesContext = () => {
    const wrong = progress?.wrong_questions || []
    if (wrong.length === 0) return 'Ошибок пока нет.'
    return wrong
      .slice(0, 12)
      .map((q, idx) => `${idx + 1}) [${q.topic || 'Без темы'}] ${q.question_text} | верный: ${q.correct_answer}`)
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
        body: JSON.stringify({
          message: messageWithContext,
          context: {
            question: 'Анализ ошибок пользователя',
            correct_answer: '',
            user_answer: '',
          },
        }),
      })
      if (!response.ok) throw new Error('Chat request failed')

      const data = await response.json()
      setChatMessages((prev) => [...prev, { role: 'ai', text: data.reply || 'Не удалось получить ответ.' }])
    } catch (error) {
      console.error('AI chat error:', error)
      setChatError('Ошибка отправки сообщения. Попробуйте снова.')
    } finally {
      setChatLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Загрузка прогресса...</div>
      </div>
    )
  }

  if (!progress) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Прогресс не найден</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="mb-8 text-5xl font-extrabold text-slate-900">Ваш прогресс</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="rounded-2xl border border-[#e4deef] bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-slate-600">Всего вопросов</div>
          <div className="text-5xl font-extrabold text-violet-700">{progress.total_questions}</div>
        </div>
        <div className="rounded-2xl border border-[#e4deef] bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-slate-600">Правильных ответов</div>
          <div className="text-5xl font-extrabold text-violet-700">{progress.correct_answers}</div>
        </div>
        <div className="rounded-2xl border border-[#e4deef] bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm text-slate-600">Процент правильности</div>
          <div className="text-5xl font-extrabold text-violet-700">
            {progress.percentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 rounded-2xl border border-[#e4deef] bg-white p-6 shadow-sm">
        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm font-medium text-slate-700">Общий прогресс</span>
          <span className="text-sm font-semibold text-slate-900">
            {progress.correct_answers} / {progress.total_questions}
          </span>
        </div>
        <div className="h-4 w-full rounded-full bg-gray-200">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      <h2 className="mb-4 text-4xl font-bold text-slate-900">Баллы по подтемам</h2>
      <div className="space-y-4">
        {subjects.map((subjectName) => {
          const data = subjectPredictions[subjectName]
          const hasSections = data?.section_scores?.length > 0

          return (
            <div key={subjectName} className="rounded-2xl border border-[#e4deef] bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-4">
                <h3 className="text-4xl font-extrabold text-slate-900">{subjectName}</h3>
                {hasSections && (
                  <div className="text-sm text-slate-600">
                    Освоено <span className="font-bold text-violet-700">{data.predicted_score?.toFixed?.(1) ?? data.predicted_score} / 20</span>
                    {' '}· точность {Math.round((data.confidence || 0) * 100)}%
                  </div>
                )}
              </div>

              {!hasSections ? (
                <p className="mt-3 text-slate-500">Данные по предмету пока недоступны.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {data.section_scores.map((section, idx) => (
                    <div key={`${subjectName}-${idx}`}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="text-base font-semibold text-slate-800">{section.section_name}</div>
                        <div className="text-sm text-slate-500">
                          Вес темы: {section.weight} · Освоенность: {(section.mastery * 100).toFixed(0)}% · Балл: <span className="font-semibold text-violet-700">{section.score.toFixed(1)} / {section.weight}</span>
                        </div>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500"
                          style={{ width: `${Math.max(0, Math.min(100, section.mastery * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={openChat}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-2xl text-white shadow-xl transition hover:brightness-110"
        aria-label="Открыть чат AI"
      >
        💬
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900">AI-чат по ошибкам</h3>
              <button onClick={() => setChatOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
                Закрыть
              </button>
            </div>

            <div className="h-80 space-y-3 overflow-y-auto bg-gray-50 p-4">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user' ? 'bg-violet-600 text-white' : 'border border-gray-200 bg-white text-gray-800'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600">AI печатает...</div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4">
              {chatError && <div className="mb-2 text-sm text-red-600">{chatError}</div>}
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
                  placeholder="Спросите AI про ваши ошибки..."
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Progress

