import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { navItems } from '@/lib/nav'
import { cn } from '@/lib/utils'
import { auth } from '@/lib/auth'

export function AdminLayout() {
  const navigate = useNavigate()
  const admin = auth.getAdmin()

  const signOut = () => {
    auth.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card px-3 py-5">
        <div className="mb-6 px-2">
          <div className="text-lg font-semibold text-primary">Admin Portal</div>
          <div className="text-xs text-muted-foreground">Restaurant Platform</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                  isActive && 'bg-primary/10 text-primary',
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border pt-3">
          <div className="px-2 text-sm">
            <div className="font-medium">{admin?.fullName ?? 'Admin'}</div>
            <div className="text-xs text-muted-foreground">{admin?.role.replace('_', ' ')}</div>
          </div>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
