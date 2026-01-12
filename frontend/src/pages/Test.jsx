import { useState, useEffect } from 'react'

const USER_ID = 1 // ID пользователя Nurkhan

function Test() {
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [options, setOptions] = useState([])

  useEffect(() => {
    fetchQuestion()
  }, [])

  const fetchQuestion = async () => {
    setLoading(true)
    setSelectedAnswer('')
    setResult(null)
    try {
      const response = await fetch('/api/questions')
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
          user_id: USER_ID,
          question_id: question.id,
          user_answer: selectedAnswer,
        }),
      })

      const data = await response.json()
      setResult({
        correct: data.correct,
        correct_answer: data.correct_answer,
        explanation: data.explanation,
      })
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
              {question.subject} - {question.topic}
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
            <button
              onClick={handleNext}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Следующий вопрос
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Test
