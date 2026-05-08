import { useState, useEffect } from 'react'
import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

function Prediction() {
  const { userId, userName, authLoading } = useUser()
  const navigate = useNavigate()
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subjectName, setSubjectName] = useState('История Казахстана')

  useEffect(() => {
    if (authLoading) return
    if (!userId) {
      navigate('/login')
      return
    }
    fetchPrediction()
  }, [authLoading, userId, navigate])

  const fetchPrediction = async () => {
    if (!userId) return

    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        `/api/prediction/${userId}?subject=${encodeURIComponent(subjectName)}`
      )
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
      <div className="mb-6 flex flex-col gap-3">
        {userName && <p className="text-slate-600">Пользователь: {userName}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="rounded-xl border border-[#d8d2ea] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="История Казахстана">История Казахстана</option>
            <option value="Математическая грамотность">Математическая грамотность</option>
            <option value="Грамотность чтения">Грамотность чтения</option>
          </select>
          <button
            onClick={fetchPrediction}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
          >
            Показать
          </button>
        </div>
      </div>

      {/* Основной прогноз */}
      <div className="mb-6 rounded-2xl border border-[#e4deef] bg-white p-6 shadow-sm md:p-8">
        <div className="text-center mb-6">
          <div className="mb-2 text-6xl font-extrabold text-violet-700">
            {prediction.predicted_score.toFixed(1)}
          </div>
          <div className="text-lg text-slate-600">из 20 баллов</div>
        </div>

        {/* Уровень доверия */}
        <div className={`mb-4 rounded-xl border-2 p-4 ${getConfidenceColor(prediction.confidence_level)}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">Уровень доверия:</span>
            <span className="font-bold">{getConfidenceText(prediction.confidence_level)}</span>
          </div>
          <div className="mb-2 h-2.5 w-full rounded-full bg-gray-200">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${prediction.confidence * 100}%` }}
            />
          </div>
          <div className="text-sm font-medium">
            Доверие: {(prediction.confidence * 100).toFixed(0)}%
          </div>
        </div>

        {/* Сообщение */}
        {prediction.message && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">{prediction.message}</p>
          </div>
        )}
      </div>

      {/* Баллы по темам */}
      {prediction.section_scores && prediction.section_scores.length > 0 && (
        <div>
          <h2 className="mb-4 text-4xl font-bold text-slate-900">Баллы по темам</h2>
          <div className="space-y-4">
            {prediction.section_scores.map((section, index) => (
              <div key={index} className="rounded-2xl border border-[#e4deef] bg-white p-6 shadow-sm">
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
                  <div className="mb-2 h-3 w-full rounded-full bg-gray-200">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300"
                      style={{ width: `${section.mastery * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Балл за тему:</span>
                    <span className="text-xl font-bold text-violet-700">
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
          className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-8 py-3 font-semibold text-white shadow-md transition hover:brightness-105"
        >
          Обновить прогноз
        </button>
      </div>
    </div>
  )
}

export default Prediction



