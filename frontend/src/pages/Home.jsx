import { Link } from 'react-router-dom'

function Home() {
  const capabilities = [
    'Адаптивные тесты в формате ЕНТ',
    'AI-разбор ошибок и объяснений',
    'Прогноз итогового результата',
    'Дашборды прогресса по темам',
    'Персональные рекомендации',
    'Единый учебный трек по целям',
  ]

  return (
    <div className="space-y-6">
      <section id="about" className="rounded-2xl border border-[#e7e4f2] bg-white p-10 text-center shadow-sm">
        <span className="mb-4 inline-flex rounded-full bg-violet-50 px-4 py-1 text-xs font-semibold text-violet-700">
          О проекте
        </span>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-violet-700 md:text-5xl">AI-тренажер ЕНТ</h1>
        <p className="mx-auto max-w-3xl text-lg text-slate-600">
          Платформа объединяет тестирование, аналитику и искусственный интеллект, чтобы готовиться к ЕНТ быстрее и эффективнее.
        </p>
      </section>

      <section className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 p-6 text-white shadow-lg">
        <h2 className="mb-2 text-3xl font-bold">Наша миссия</h2>
        <p className="max-w-4xl text-violet-100">
          Дать каждому ученику персонального AI-наставника, который объясняет ошибки, показывает прогресс и строит реальный путь к высокому баллу.
        </p>
      </section>

      <section>
        <h3 className="mb-4 text-3xl font-bold text-slate-900">Возможности</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {capabilities.map((item) => (
            <div key={item} className="rounded-2xl border border-[#e7e4f2] bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-3xl font-bold text-slate-900">Технологии</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e7e4f2] bg-white p-5 shadow-sm">
            <h4 className="text-xl font-bold text-slate-900">React + Tailwind</h4>
            <p className="mt-1 text-slate-600">Современный и быстрый UI.</p>
          </div>
          <div className="rounded-2xl border border-[#e7e4f2] bg-white p-5 shadow-sm">
            <h4 className="text-xl font-bold text-slate-900">Go + Gin</h4>
            <p className="mt-1 text-slate-600">Надежный backend для API.</p>
          </div>
          <div className="rounded-2xl border border-[#e7e4f2] bg-white p-5 shadow-sm">
            <h4 className="text-xl font-bold text-slate-900">SQLite + GORM</h4>
            <p className="mt-1 text-slate-600">Хранение тестов и прогресса.</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e7e4f2] bg-white p-10 text-center shadow-sm">
        <h3 className="text-4xl font-bold text-slate-900">Готовы начать?</h3>
        <p className="mt-2 text-slate-600">Запустите свой первый тест и получите AI-разбор ошибок.</p>
        <Link
          to="/test"
          className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-10 py-3 text-lg font-semibold text-white shadow-lg transition hover:brightness-105"
        >
          Начать тест
        </Link>
      </section>
    </div>
  )
}

export default Home

