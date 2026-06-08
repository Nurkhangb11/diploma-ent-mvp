import { Navigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import Spinner from './Spinner'

export default function AdminRoute({ children }) {
  const { token, user, authLoading } = useUser()

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Spinner />
        <p className="text-sm text-[color:var(--app-muted)]">Проверяем сессию…</p>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
