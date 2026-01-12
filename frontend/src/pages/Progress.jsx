import { useState, useEffect } from 'react'

const USER_ID = 1 // ID пользователя Nurkhan

function Progress() {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/progress/${USER_ID}`)
      const data = await response.json()
      setProgress(data)
    } catch (error) {
      console.error('Error fetching progress:', error)
    } finally {
      setLoading(false)
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Мой прогресс</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Всего вопросов</div>
          <div className="text-3xl font-bold text-blue-600">{progress.total_questions}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Правильных ответов</div>
          <div className="text-3xl font-bold text-green-600">{progress.correct_answers}</div>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Процент правильности</div>
          <div className="text-3xl font-bold text-purple-600">
            {progress.percentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <div className="mb-2 flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Общий прогресс</span>
          <span className="text-sm font-semibold text-gray-900">
            {progress.correct_answers} / {progress.total_questions}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>
      </div>

      {/* Wrong Questions */}
      {progress.wrong_questions && progress.wrong_questions.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Вопросы с ошибками ({progress.wrong_questions.length})
          </h2>
          <div className="space-y-6">
            {progress.wrong_questions.map((q, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {q.question_text}
                  </h3>
                  <div className="space-y-2 mb-4">
                    {q.options && q.options.length > 0 ? (
                      q.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-3 border-2 rounded-lg ${
                            option === q.correct_answer
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center">
                            {option === q.correct_answer && (
                              <span className="text-green-600 mr-2 font-bold">✓</span>
                            )}
                            <span className="text-gray-700">{option}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-gray-500 text-sm">Варианты ответов не загружены</div>
                    )}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    Правильный ответ:
                  </div>
                  <div className="text-blue-800 font-semibold">{q.correct_answer}</div>
                </div>
                {q.explanation && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700 mb-1">Объяснение:</div>
                    <div className="text-gray-700">{q.explanation}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-gray-600 text-lg">
            {progress.total_questions === 0
              ? 'Вы еще не ответили ни на один вопрос'
              : 'Отлично! Все ответы правильные!'}
          </div>
        </div>
      )}
    </div>
  )
}

export default Progress

