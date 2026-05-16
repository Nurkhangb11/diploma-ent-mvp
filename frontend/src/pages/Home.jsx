import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'
import GlassCard from '../components/GlassCard'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.06 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] } }),
}

export default function Home() {
  const { userId } = useUser()

  const capabilities = [
    { title: 'Адаптивные тесты', desc: 'Вопросы подстраиваются под твой уровень.', icon: '🎯' },
    { title: 'AI-разбор', desc: 'Объяснения ошибок и чат с наставником.', icon: '✨' },
    { title: 'Прогноз балла', desc: 'Понятная модель прогресса и уверенности.', icon: '📈' },
    { title: 'Дашборд', desc: 'Streak, уровень и слабые темы в одном месте.', icon: '🔥' },
    { title: 'Темы ЕНТ', desc: 'История КЗ, математическая и читательская грамотность.', icon: '📚' },
    { title: 'Цели', desc: 'Целевой балл и отслеживание пути к результату.', icon: '🏅' },
  ]

  return (
    <div className="space-y-16 pb-16">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-panel relative overflow-hidden rounded-3xl px-6 py-14 text-center md:px-12 md:py-20"
      >
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />

        <span className="relative inline-flex rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-400">
          AI EdTech · ЕНТ
        </span>
        <h1 className="relative mt-6 text-4xl font-extrabold tracking-tight text-[color:var(--app-fg)] md:text-6xl md:leading-tight">
          Готовься к ЕНТ <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">как в топовом приложении</span>
        </h1>
        <p className="relative mx-auto mt-5 max-w-2xl text-lg text-[color:var(--app-muted)] md:text-xl">
          Тренажёр с адаптивными вопросами, прогнозом результата и AI-подсказками — в интерфейсе уровня Linear и Duolingo.
        </p>
        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
          {userId ? (
            <>
              <Link
                to="/dashboard"
                className="inline-flex rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:brightness-110"
              >
                Открыть дашборд
              </Link>
              <Link
                to="/test"
                className="inline-flex rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-8 py-3.5 text-base font-semibold text-[color:var(--app-fg)] transition hover:border-violet-400/40"
              >
                Тренировка
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/register"
                className="inline-flex rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-violet-500/30 transition hover:brightness-110"
              >
                Начать бесплатно
              </Link>
              <Link
                to="/login"
                className="inline-flex rounded-2xl border border-[color:var(--app-border)] px-8 py-3.5 text-base font-semibold text-[color:var(--app-fg)] transition hover:border-violet-400/40"
              >
                Уже есть аккаунт
              </Link>
            </>
          )}
        </div>
      </motion.section>

      <section>
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-8 text-center text-3xl font-bold text-[color:var(--app-fg)] md:text-4xl"
        >
          Возможности платформы
        </motion.h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item, i) => (
            <motion.div key={item.title} custom={i} initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}>
              <GlassCard hover className="h-full p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/80 to-fuchsia-500/80 text-xl shadow-lg">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-[color:var(--app-fg)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--app-muted)]">{item.desc}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="glass-panel rounded-3xl p-8 md:p-12"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-[color:var(--app-fg)] md:text-3xl">Стек проекта</h2>
          <p className="mt-3 text-[color:var(--app-muted)]">
            Быстрый React + Tailwind на фронте, надёжный Go API на бэкенде — всё для стабильной подготовки к экзамену.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {['React', 'Vite', 'Tailwind', 'Framer Motion', 'Go', 'Gin', 'SQLite'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-card)] px-4 py-2 text-sm font-medium text-[color:var(--app-fg)]"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      <section id="about" className="text-center">
        <h2 className="text-3xl font-bold text-[color:var(--app-fg)]">О проекте</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[color:var(--app-muted)]">
          AI-тренажёр ЕНТ объединяет тестирование, аналитику и искусственный интеллект, чтобы ты видел прогресс и приходил на экзамен уверенным.
        </p>
      </section>
    </div>
  )
}
