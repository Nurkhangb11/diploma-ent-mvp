import { useLanguage } from '../context/LanguageContext'

const LOCALES = [
  { code: 'ru', labelKey: 'lang.ru' },
  { code: 'kk', labelKey: 'lang.kk' },
  { code: 'en', labelKey: 'lang.en' },
]

export default function LanguageSwitcher({ compact = false }) {
  const { locale, setLocale, t } = useLanguage()

  return (
    <div
      className={`flex items-center rounded-xl border border-[color:var(--app-border)] bg-[color:var(--app-card)] ${compact ? 'p-0.5' : 'p-1'}`}
      role="group"
      aria-label={t('nav.lang')}
    >
      {LOCALES.map(({ code, labelKey }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={`rounded-lg px-2 py-1.5 text-xs font-bold transition sm:px-2.5 ${
            locale === code
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/25'
              : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]'
          }`}
          aria-pressed={locale === code}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  )
}
