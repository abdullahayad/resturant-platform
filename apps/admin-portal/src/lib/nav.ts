import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  ClipboardCheck,
  Store,
  Tags,
  MapPin,
  MessageSquareWarning,
  ShieldAlert,
  ShieldCheck,
  Megaphone,
  Percent,
  Sparkles,
  Award,
  CalendarCheck,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  superAdminOnly?: boolean
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Restaurant Approvals', path: '/approvals', icon: ClipboardCheck },
  { label: 'Restaurants', path: '/restaurants', icon: Store },
  { label: 'Master Data', path: '/master-data', icon: Tags },
  { label: 'Cities & Districts', path: '/locations', icon: MapPin },
  { label: 'Reviews Moderation', path: '/reviews', icon: MessageSquareWarning },
  { label: 'Content Moderation', path: '/content-moderation', icon: ShieldAlert },
  { label: 'Promotions', path: '/promotions', icon: Percent },
  { label: 'Advertising', path: '/advertising', icon: Sparkles },
  { label: 'Loyalty & Rewards', path: '/loyalty', icon: Award },
  { label: 'Event Bookings', path: '/event-bookings', icon: CalendarCheck },
  { label: 'Notifications', path: '/notifications', icon: Megaphone },
  { label: 'Admin Users', path: '/admins', icon: ShieldCheck, superAdminOnly: true },
]
