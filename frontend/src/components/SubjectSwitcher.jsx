import { useLanguage } from '../context/LanguageContext'
import { SUBJECT_KEYS, subjectLabel } from '../i18n'

export default function SubjectSwitcher({ value, onChange, size = 'default' }) {
  const { locale } = useLanguage()
  const pad = size === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'

  return (
    <div className="flex flex-wrap gap-2">
      {SUBJECT_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full font-semibold transition ${pad} ${
            value === key
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
              : 'border border-[color:var(--app-border)] bg-[color:var(--app-card)] text-[color:var(--app-muted)] hover:border-violet-400/40 hover:text-[color:var(--app-fg)]'
          }`}
        >
          {subjectLabel(locale, key)}
        </button>
      ))}
    </div>
  )
}
