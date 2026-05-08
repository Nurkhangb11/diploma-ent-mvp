import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

function Profile() {
  const { token, authLoading } = useUser()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [targetScore, setTargetScore] = useState(0)

  useEffect(() => {
    if (authLoading) return
    if (!token) return

    const fetchProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        if (!response.ok) {
          throw new Error('Failed to load profile')
        }
        const data = await response.json()
        setName(data.user?.name || '')
        setAvatar(data.user?.avatar || '')
        setTargetScore(data.user?.target_score || 0)
      } catch (e) {
        console.error('Profile error:', e)
        setError('Ошибка при загрузке профиля')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [authLoading, token])

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          avatar,
          target_score: targetScore,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      navigate('/test')
    } catch (e) {
      console.error('Save profile error:', e)
      setError('Ошибка при сохранении')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Загрузка профиля...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Профиль</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-500 text-sm">AI</span>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Текущий пользователь</div>
            <div className="font-semibold">{name || '—'}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Имя</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Цель (target score)</label>
            <div className="grid grid-cols-3 gap-3">
              {[50, 70, 120].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTargetScore(v)}
                  className={`px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                    targetScore === v
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>

          <button
            onClick={() => navigate('/test')}
            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}

export default Profile

