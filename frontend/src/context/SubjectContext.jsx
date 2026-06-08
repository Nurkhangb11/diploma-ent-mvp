import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'ent_selected_subject'
const DEFAULT_SUBJECT = 'История Казахстана'

const SubjectContext = createContext(null)

export function SubjectProvider({ children }) {
  const [subject, setSubjectState] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      return s && s.trim() ? s.trim() : DEFAULT_SUBJECT
    } catch {
      return DEFAULT_SUBJECT
    }
  })

  const setSubject = useCallback((next) => {
    const v = typeof next === 'string' && next.trim() ? next.trim() : DEFAULT_SUBJECT
    setSubjectState(v)
    try {
      localStorage.setItem(STORAGE_KEY, v)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(() => ({ subject, setSubject }), [subject, setSubject])
  return <SubjectContext.Provider value={value}>{children}</SubjectContext.Provider>
}

export function useSubject() {
  const ctx = useContext(SubjectContext)
  if (!ctx) throw new Error('useSubject must be used within SubjectProvider')
  return ctx
}
