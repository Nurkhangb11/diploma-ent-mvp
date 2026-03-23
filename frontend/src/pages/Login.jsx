import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

function Login() {
  const [identifier, setIdentifier] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useUser()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Для MVP: ищем пользователя по имени или email
      // В реальном приложении здесь был бы POST /api/auth/login
      
      // Проверяем, существует ли пользователь с таким именем/email
      // Для MVP используем простую логику
      // В реальности нужен backend endpoint GET /api/users?email=... или POST /api/auth/login
      
      // Временное решение: для MVP используем существующего пользователя или создаем нового
      // Если введено "Nurkhan" или "nurkhan@example.com", используем ID=1
      let userId = null
      let userName = null

      if (identifier.toLowerCase() === 'nurkhan' || identifier.toLowerCase() === 'nurkhan@example.com') {
        userId = 1
        userName = 'Nurkhan'
      } else {
        // Для других пользователей создаем новый ID
        userId = Math.abs(identifier.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 1000000
        userName = identifier.split('@')[0] || identifier
      }

      login(userId, userName)
      navigate('/')
    } catch (err) {
      setError('Ошибка при входе. Попробуйте еще раз.')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Вход
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
              Имя или Email
            </label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Введите имя или email"
            />
            <p className="mt-2 text-xs text-gray-500">
              Для MVP: введите "Nurkhan" или "nurkhan@example.com" для тестового аккаунта
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600">
            Нет аккаунта?{' '}
            <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Зарегистрироваться
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login


