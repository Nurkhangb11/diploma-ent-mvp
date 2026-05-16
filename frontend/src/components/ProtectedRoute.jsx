import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUser } from '../context/UserContext'
import Spinner from './Spinner'

export default function ProtectedRoute({ children }) {
  const { token, authLoading } = useUser()

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Spinner />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[color:var(--app-muted)]"
        >
          Проверяем сессию…
        </motion.p>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}
