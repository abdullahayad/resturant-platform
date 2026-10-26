import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ClipboardCheck,
  Store,
  Tags,
  MapPin,
  MessageSquareWarning,
  Building2,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Megaphone,
  Percent,
  Sparkles,
  Award,
  CalendarCheck,
  ToggleLeft,
  Users,
  Settings,
  Leaf,
  Flag,
  LifeBuoy,
  Send,
  Trophy,
  LayoutTemplate,
  Smile,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  superAdminOnly?: boolean
}

export type WorkspaceId = 'partners' | 'customers' | 'content' | 'platform'

// The sidebar shows one workspace at a time instead of every page in one
// long list - each workspace is a short group of related pages. Which
// workspace is active is worked out from the current URL (see
// workspaceForPath), so deep links and the browser back button always land
// on the right sidebar.
export interface Workspace {
  id: WorkspaceId
  label: string
  icon: LucideIcon
  items: NavItem[]
}

// Always visible above the workspace switcher - the to-do overview that
// links into every workspace.
export const homeItem: NavItem = { label: 'Dashboard', path: '/', icon: LayoutDashboard }

export const workspaces: Workspace[] = [
  {
    id: 'partners',
    label: 'Partners',
    icon: Store,
    items: [
      { label: 'Restaurant Approvals', path: '/approvals', icon: ClipboardCheck },
      { label: 'Restaurants', path: '/restaurants', icon: Store },
      { label: 'Chains', path: '/chains', icon: Building2 },
      { label: 'Event Bookings', path: '/event-bookings', icon: CalendarCheck },
      { label: 'Loyalty & Rewards', path: '/loyalty', icon: Award },
      { label: 'Healthy Tag Requests', path: '/healthy-tags', icon: Leaf },
    ],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    items: [
      { label: 'Customers', path: '/customers', icon: Users },
      { label: 'Reported & Blocked', path: '/customer-reports', icon: Flag },
      { label: 'Customer Support', path: '/customer-support', icon: LifeBuoy },
      { label: 'Push Campaigns', path: '/customer-campaigns', icon: Send },
      { label: 'Levels & Critics', path: '/reviewer-levels', icon: Trophy },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    icon: Megaphone,
    items: [
      { label: 'Customer Home Layout', path: '/home-layout', icon: LayoutTemplate },
      { label: 'Customer Moods', path: '/moods', icon: Smile },
      { label: 'Content Moderation', path: '/content-moderation', icon: ShieldAlert },
      { label: 'Reviews Moderation', path: '/reviews', icon: MessageSquareWarning },
      { label: 'Promotions', path: '/promotions', icon: Percent },
      { label: 'Advertising', path: '/advertising', icon: Sparkles },
      { label: 'Notifications', path: '/notifications', icon: Megaphone },
    ],
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: Settings,
    items: [
      { label: 'Recent Activity', path: '/recent-activity', icon: Activity },
      { label: 'Master Data', path: '/master-data', icon: Tags },
      { label: 'Cities & Districts', path: '/locations', icon: MapPin },
      { label: 'Feature Flags', path: '/feature-flags', icon: ToggleLeft },
      { label: 'Admin Users', path: '/admins', icon: ShieldCheck, superAdminOnly: true },
    ],
  },
]

// Matches by path prefix so nested pages (e.g. /restaurants/:id/publish-review)
// keep their parent's workspace selected. Returns null for the dashboard and
// any unknown path, letting the caller keep whichever workspace was last open.
export function workspaceForPath(pathname: string): WorkspaceId | null {
  for (const ws of workspaces) {
    if (ws.items.some((item) => pathname === item.path || pathname.startsWith(item.path + '/'))) {
      return ws.id
    }
  }
  return null
}
