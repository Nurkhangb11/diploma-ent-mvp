import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

function Prediction() {
  const { userId, userName } = useUser()
  const navigate = useNavigate()
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) {
      navigate('/login')
      return
    }
    fetchPrediction()
  }, [userId, navigate])

  const fetchPrediction = async () => {
    if (!userId) return

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/prediction/${userId}?subject=История Казахстана`)
      if (!response.ok) {
        throw new Error('Failed to fetch prediction')
      }
      const data = await response.json()
      setPrediction(data)
    } catch (err) {
      setError('Ошибка при загрузке прогноза')
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (level) => {
    switch (level) {
      case 'high':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getConfidenceText = (level) => {
    switch (level) {
      case 'high':
        return 'Высокая'
      case 'medium':
        return 'Средняя'
      case 'low':
        return 'Низкая'
      default:
        return 'Неизвестно'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Загрузка прогноза...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-red-600 text-lg">{error}</div>
      </div>
    )
  }

  if (!prediction) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Прогноз не найден</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Прогноз баллов</h1>
        {userName && (
          <p className="text-gray-600">Пользователь: {userName}</p>
        )}
      </div>

      {/* Основной прогноз */}
      <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 mb-6">
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-blue-600 mb-2">
            {prediction.predicted_score.toFixed(1)}
          </div>
          <div className="text-gray-600 text-lg">из 20 баллов</div>
        </div>

        {/* Уровень доверия */}
        <div className={`mb-4 p-4 rounded-lg border-2 ${getConfidenceColor(prediction.confidence_level)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Уровень доверия:</span>
            <span className="font-bold">{getConfidenceText(prediction.confidence_level)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${prediction.confidence * 100}%` }}
            ></div>
          </div>
          <div className="text-sm">
            Доверие: {(prediction.confidence * 100).toFixed(0)}%
          </div>
        </div>

        {/* Сообщение */}
        {prediction.message && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">{prediction.message}</p>
          </div>
        )}
      </div>

      {/* Баллы по темам */}
      {prediction.section_scores && prediction.section_scores.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Баллы по темам</h2>
          <div className="space-y-4">
            {prediction.section_scores.map((section, index) => (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {section.section_name}
                  </h3>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Освоенность: {(section.mastery * 100).toFixed(1)}%
                    </span>
                    <span className="text-sm font-medium text-gray-700">
                      Вес темы: {section.weight} баллов
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-green-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${section.mastery * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Балл за тему:</span>
                    <span className="text-xl font-bold text-green-600">
                      {section.score.toFixed(1)} / {section.weight}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Кнопка обновления */}
      <div className="mt-6 text-center">
        <button
          onClick={fetchPrediction}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
        >
          Обновить прогноз
        </button>
      </div>
    </div>
  )
}

export default Prediction


