import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message, variant = 'error') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts((list) => [...list, { id, message, variant }])
      window.setTimeout(() => dismiss(id), 5200)
    },
    [dismiss]
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-[200] flex flex-col items-stretch gap-2 p-4 sm:items-end" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={`pointer-events-auto max-w-md rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-md ${
                t.variant === 'success'
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
                  : t.variant === 'info'
                    ? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
                    : 'border-red-400/40 bg-red-500/15 text-red-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span>{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs opacity-70 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
