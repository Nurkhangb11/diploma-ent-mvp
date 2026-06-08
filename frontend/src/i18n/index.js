import ru from './locales/ru.json'
import kk from './locales/kk.json'
import en from './locales/en.json'

const catalogs = { ru, kk, en }

export function normalizeLocale(raw) {
  const v = String(raw || 'ru').toLowerCase().trim()
  if (v === 'kz' || v === 'kaz') return 'kk'
  if (v === 'kk' || v === 'en' || v === 'ru') return v
  return 'ru'
}

function interpolate(text, vars) {
  if (!vars) return text
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''))
}

function lookup(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] != null ? acc[part] : undefined), obj)
}

export function getTranslation(locale, key, vars) {
  const loc = normalizeLocale(locale)
  const value = lookup(catalogs[loc], key) ?? lookup(catalogs.ru, key) ?? key
  return typeof value === 'string' ? interpolate(value, vars) : key
}

export function withLang(url, locale) {
  const loc = normalizeLocale(locale)
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}lang=${encodeURIComponent(loc)}`
}

export const SUBJECT_KEYS = [
  'История Казахстана',
  'Математическая грамотность',
  'Грамотность чтения',
]

export function subjectLabel(locale, subjectKey) {
  return getTranslation(locale, `subjects.${subjectKey}`, {}) || subjectKey
}
