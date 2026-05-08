import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

function Test() {
  const { userId, authLoading } = useUser()
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

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      navigate('/login')
      return
    }
  }, [authLoading, userId, navigate])

  const subjectCards = [
    {
      id: 'math',
      name: 'Математическая грамотность',
      desc: 'Логика, базовые вычисления и практические задачи.',
      count: '10 вопросов',
      icon: '🧮',
    },
    {
      id: 'history',
      name: 'История Казахстана',
      desc: 'Ключевые события, даты, личности и исторические процессы.',
      count: '20 вопросов',
      icon: '🏛️',
    },
    {
      id: 'reading',
      name: 'Грамотность чтения',
      desc: 'Понимание текста, анализ и интерпретация информации.',
      count: '10 вопросов',
      icon: '📘',
    },
  ]

  const fetchQuestion = async () => {
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
      const response = await fetch(`/api/questions?user_id=${userId}`)
      const data = await response.json()
      if (data.length > 0) {
        const q = data[0]
        setQuestion(q)
        // Parse options JSON string to array
        try {
          const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options
          setOptions(opts || [])
        } catch (e) {
          setOptions([])
        }
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
    if (!result) {
      setSelectedAnswer(answer)
    }
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !question) {
      alert('Пожалуйста, выберите ответ')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      await fetchAIFeedback(nextResult)
    } catch (error) {
      console.error('Error submitting answer:', error)
      alert('Ошибка при отправке ответа')
    } finally {
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    fetchQuestion()
  }

  const startTest = (subjectName) => {
    setSelectedSubject(subjectName)
    fetchQuestion()
  }

  const fetchAIFeedback = async (answerResult) => {
    if (!question) return

    setAiFeedback('')
    setAiFeedbackError('')
    setAiFeedbackLoading(true)
    try {
      const response = await fetch('/api/ai-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.question_text,
          correct_answer: answerResult.correct_answer,
          user_answer: selectedAnswer,
          explanation: answerResult.explanation || '',
        }),
      })

      if (!response.ok) {
        throw new Error('AI feedback request failed')
      }

      const data = await response.json()
      setAiFeedback(data.ai_feedback || '')
    } catch (error) {
      console.error('Error getting AI feedback:', error)
      setAiFeedbackError('Не удалось получить подсказку от AI. Попробуйте чуть позже.')
    } finally {
      setAiFeedbackLoading(false)
    }
  }

  const openChat = () => {
    setChatOpen(true)
    setChatError('')
    if (chatMessages.length === 0) {
      setChatMessages([
        {
          role: 'ai',
          text: 'Я помогу разобрать этот вопрос. Спроси, что осталось непонятно.',
        },
      ])
    }
  }

  const sendChatMessage = async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading || !result) return

    const userMessage = { role: 'user', text: trimmed }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setChatError('')
    setChatLoading(true)

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: trimmed,
          context: {
            question: question?.question_text || '',
            correct_answer: result.correct_answer,
            user_answer: selectedAnswer,
          },
        }),
      })

      if (!response.ok) {
        throw new Error('AI chat request failed')
      }

      const data = await response.json()
      setChatMessages((prev) => [
        ...prev,
        { role: 'ai', text: data.reply || 'Не удалось получить ответ.' },
      ])
    } catch (error) {
      console.error('Error sending message to AI chat:', error)
      setChatError('Ошибка отправки сообщения. Попробуйте снова.')
    } finally {
      setChatLoading(false)
    }
  }

  const getOptionColor = (option) => {
    if (!result) return 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
    if (option === result.correct_answer) {
      return 'border-green-500 bg-green-50'
    }
    if (option === selectedAnswer && !result.correct) {
      return 'border-red-500 bg-red-50'
    }
    return 'border-gray-200 bg-gray-50'
  }

  if (!selectedSubject) {
    return (
      <div className="px-2 py-4">
        <h1 className="text-5xl font-extrabold text-slate-900">
          Выберите <span className="text-violet-700">предмет</span>
        </h1>
        <p className="mt-3 text-2xl text-slate-600">Запустите тест и получите разбор ошибок от AI-ассистента.</p>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {subjectCards.map((subject) => (
            <div key={subject.id} className="rounded-3xl border border-[#e7e4f2] bg-white p-6 shadow-sm">
              <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 text-3xl text-white shadow">
                {subject.icon}
              </div>
              <h2 className="text-5xl font-extrabold leading-tight text-slate-900">{subject.name}</h2>
              <p className="mt-4 text-xl text-slate-600">{subject.desc}</p>
              <p className="mt-5 text-lg font-medium text-slate-500">{subject.count}</p>
              <button
                onClick={() => startTest(subject.name)}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-3 text-3xl font-semibold text-white shadow-md transition hover:brightness-105"
              >
                Начать тест
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Загрузка вопроса...</div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Вопросы не найдены</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
        {/* Question Card */}
        <div className="mb-6">
          <div className="mb-4">
            <span className="inline-block text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {selectedSubject} - {question.topic}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6">
            {question.question_text}
          </h2>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(option)}
                disabled={!!result}
                className={`w-full text-left p-4 border-2 rounded-lg transition duration-200 ${getOptionColor(option)} ${
                  selectedAnswer === option && !result
                    ? 'border-blue-500 bg-blue-50'
                    : ''
                } ${result ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                      selectedAnswer === option
                        ? result && option === result.correct_answer
                          ? 'border-green-500 bg-green-500'
                          : result && option === selectedAnswer && !result.correct
                          ? 'border-red-500 bg-red-500'
                          : 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedAnswer === option && (
                      <span className="text-white text-xs">●</span>
                    )}
                  </div>
                  <span className="text-gray-700">{option}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mb-6 p-4 md:p-6 rounded-lg border-2 ${
              result.correct
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="font-semibold text-lg mb-3">
              {result.correct ? (
                <span className="text-green-800">✓ Правильно!</span>
              ) : (
                <span className="text-red-800">✗ Неправильно</span>
              )}
            </div>
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">Правильный ответ: </span>
              <span className="text-sm font-semibold text-gray-900">{result.correct_answer}</span>
            </div>
            {result.explanation && (
              <div className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                <span className="font-medium">Объяснение: </span>
                {result.explanation}
              </div>
            )}

            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <div className="text-sm font-semibold text-indigo-900 mb-1">AI-подсказка</div>
              {aiFeedbackLoading && (
                <div className="text-sm text-indigo-700">AI анализирует ответ...</div>
              )}
              {!aiFeedbackLoading && aiFeedbackError && (
                <div className="text-sm text-red-700">{aiFeedbackError}</div>
              )}
              {!aiFeedbackLoading && !aiFeedbackError && aiFeedback && (
                <div className="text-sm text-gray-800">{aiFeedback}</div>
              )}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <button
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer || submitting || result}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            {submitting ? 'Отправка...' : 'Отправить ответ'}
          </button>

          {result && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={openChat}
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                Обсудить с AI
              </button>
              <button
                onClick={handleNext}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                Следующий вопрос
              </button>
            </div>
          )}
        </div>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Обсуждение с AI</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Закрыть
              </button>
            </div>

            <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-3">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 text-gray-600 rounded-2xl px-4 py-2 text-sm">
                    AI печатает...
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              {chatError && <div className="text-sm text-red-600 mb-2">{chatError}</div>}
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
                  placeholder="Задай вопрос по этой теме..."
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium"
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

export default Test
