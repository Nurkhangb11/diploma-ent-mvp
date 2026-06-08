import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from '../../context/LanguageContext'

const tabCls = ({ isActive }) =>
  `rounded-xl px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-violet-500/20 text-violet-300'
      : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-fg)]'
  }`

export default function AdminLayout() {
  const { t } = useTranslation()

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-[color:var(--app-border)] pb-4">
        <span className="mr-2 text-sm font-bold uppercase tracking-wider text-violet-400">
          {t('admin.panel')}
        </span>
        <NavLink to="/admin/users" className={tabCls}>
          {t('admin.usersTab')}
        </NavLink>
        <NavLink to="/admin/questions" className={tabCls}>
          {t('admin.questionsTab')}
        </NavLink>
      </div>
      <Outlet />
    </div>
  )
}
