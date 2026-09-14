import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Sun, UtensilsCrossed } from 'lucide-react'
import { navItems } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { api } from '@/lib/api'

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const admin = auth.getAdmin()
  const { theme, toggleTheme } = useTheme()
  const [approvalsBadge, setApprovalsBadge] = useState(0)

  // True pending count (signup + go-live review), refetched on every
  // navigation so it stays reasonably fresh as the admin moves around and
  // works through the queue.
  useEffect(() => {
    Promise.all([
      api.restaurants({ status: 'PENDING_REVIEW' }).then((r) => r.total).catch(() => 0),
      api.restaurants({ publishStatus: 'PENDING' }).then((r) => r.total).catch(() => 0),
    ]).then(([signup, review]) => setApprovalsBadge(signup + review))
  }, [location.pathname])

  const signOut = () => {
    auth.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card px-3 py-5 shadow-[var(--shadow-sidebar)]">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-[var(--shadow-glow)]">
            <UtensilsCrossed className="size-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight text-primary">Admin Portal</div>
            <div className="text-xs text-muted-foreground">Restaurant Platform</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems
            .filter((item) => !item.superAdminOnly || admin?.role === 'SUPER_ADMIN')
            .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-secondary hover:text-foreground',
                  isActive && 'bg-primary/10 text-primary font-medium',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary transition-all duration-200',
                      isActive ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0',
                    )}
                  />
                  <item.icon
                    className={cn(
                      'size-4 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.path === '/approvals' && approvalsBadge > 0 && (
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                      {approvalsBadge > 9 ? '9+' : approvalsBadge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-3">
          <div className="px-2 text-sm">
            <div className="font-medium">{admin?.fullName ?? 'Admin'}</div>
            <div className="text-xs text-muted-foreground">{admin?.role.replace('_', ' ')}</div>
          </div>
          <button
            onClick={toggleTheme}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
