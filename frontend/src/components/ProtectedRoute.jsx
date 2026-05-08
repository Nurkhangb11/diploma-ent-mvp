import { Navigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

export default function ProtectedRoute({ children }) {
  const { token, authLoading } = useUser()

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600 text-lg">Загрузка...</div>
      </div>
    )
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return children
}

