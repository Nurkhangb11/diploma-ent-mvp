import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { authHeaders } from '../../lib/api'
import { useTranslation } from '../../context/LanguageContext'
import Spinner from '../../components/Spinner'

export default function AdminUsers() {
  const { token } = useUser()
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 20

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`, {
          headers: authHeaders(token),
        })
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setUsers(data.users || [])
        setTotal(data.total || 0)
      } catch {
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    if (token) fetchUsers()
  }, [token, page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[color:var(--app-fg)]">{t('admin.usersTitle')}</h1>
        <p className="mt-2 text-[color:var(--app-muted)]">{t('admin.usersSub')}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel overflow-hidden rounded-2xl"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--app-border)] bg-[color:var(--app-card)]">
                  <th className="px-4 py-3 font-semibold text-[color:var(--app-muted)]">ID</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--app-muted)]">{t('auth.name')}</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--app-muted)]">{t('auth.email')}</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--app-muted)]">{t('admin.role')}</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--app-muted)]">{t('admin.targetScore')}</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--app-muted)]">{t('admin.attempts')}</th>
                  <th className="px-4 py-3 font-semibold text-[color:var(--app-muted)]">{t('admin.registered')}</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[color:var(--app-muted)]">
                      {t('admin.noUsers')}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="border-b border-[color:var(--app-border)] last:border-0">
                      <td className="px-4 py-3 text-[color:var(--app-muted)]">{u.id}</td>
                      <td className="px-4 py-3 font-medium text-[color:var(--app-fg)]">{u.name}</td>
                      <td className="px-4 py-3 text-[color:var(--app-fg)]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.role === 'admin'
                              ? 'bg-violet-500/20 text-violet-300'
                              : 'bg-[color:var(--app-card)] text-[color:var(--app-muted)]'
                          }`}
                        >
                          {u.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleStudent')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[color:var(--app-fg)]">{u.target_score || '—'}</td>
                      <td className="px-4 py-3 text-[color:var(--app-fg)]">{u.attempt_count}</td>
                      <td className="px-4 py-3 text-[color:var(--app-muted)]">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[color:var(--app-border)] px-4 py-3">
              <span className="text-sm text-[color:var(--app-muted)]">
                {t('admin.pageOf', { page, total: totalPages })}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-[color:var(--app-border)] px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-[color:var(--app-border)] px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
