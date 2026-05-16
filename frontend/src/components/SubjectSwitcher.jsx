const SUBJECTS = [
  'История Казахстана',
  'Математическая грамотность',
  'Грамотность чтения',
]

export default function SubjectSwitcher({ value, onChange, size = 'default' }) {
  const pad = size === 'compact' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  return (
    <div className="flex flex-wrap gap-2">
      {SUBJECTS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-full font-semibold transition ${pad} ${
            value === s
              ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
              : 'border border-[color:var(--app-border)] bg-[color:var(--app-card)] text-[color:var(--app-muted)] hover:border-violet-400/40 hover:text-[color:var(--app-fg)]'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
