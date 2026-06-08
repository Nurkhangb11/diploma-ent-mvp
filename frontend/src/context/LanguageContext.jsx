import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getTranslation, normalizeLocale } from '../i18n'

const STORAGE_KEY = 'ent_locale'
const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(() => {
    try {
      return normalizeLocale(localStorage.getItem(STORAGE_KEY) || 'ru')
    } catch {
      return 'ru'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'kk' ? 'kk' : locale === 'en' ? 'en' : 'ru'
  }, [locale])

  const setLocale = useCallback((next) => {
    setLocaleState(normalizeLocale(next))
  }, [])

  const cycleLocale = useCallback(() => {
    setLocaleState((current) => {
      const order = ['ru', 'kk', 'en']
      const idx = order.indexOf(current)
      return order[(idx + 1) % order.length]
    })
  }, [])

  const t = useCallback((key, vars) => getTranslation(locale, key, vars), [locale])

  const value = useMemo(
    () => ({ locale, setLocale, cycleLocale, t }),
    [locale, setLocale, cycleLocale, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function useTranslation() {
  const { locale, t, setLocale, cycleLocale } = useLanguage()
  return { locale, t, setLocale, cycleLocale }
}
