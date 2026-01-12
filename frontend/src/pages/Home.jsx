import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className="px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Добро пожаловать в систему подготовки к ЕНТ
          </h1>
          <p className="text-gray-600 mb-8">
            Интеллектуальная платформа для подготовки к Единому Национальному Тестированию.
            Проверьте свои знания и отслеживайте прогресс.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/test"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 text-center"
            >
              Начать тест
            </Link>
            <Link
              to="/progress"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 text-center"
            >
              Посмотреть прогресс
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

