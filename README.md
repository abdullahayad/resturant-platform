# Restaurant Platform

Two-sided platform for a restaurant-discovery service in Iraq: a **Partner App**
(Expo / React Native) for restaurant owners, and an **Admin Portal** (React / Vite) for
platform staff, sharing one **NestJS + PostgreSQL** backend. Branded as **LiQETA**.

## Structure

```
apps/
  backend/        NestJS API + Prisma (PostgreSQL)
  admin-portal/   React + Vite + Tailwind, dark/amber theme
  partner-app/    Expo (React Native), responsive sidebar/rail/bottom-tabs layout
packages/
  shared-types/   Types shared between backend and admin-portal
docker-compose.yml  Local Postgres + MinIO (S3-compatible storage)
```

`apps/backend` and `apps/admin-portal` are npm workspaces at the repo root.
`apps/partner-app` manages its own `node_modules` (Expo/Metro monorepo integration
is out of scope for the scaffold) — use its own scripts via `npm --prefix apps/partner-app`.

## Prerequisites

- Node.js 20+
- Docker Desktop (for local Postgres + MinIO)

## Setup

```powershell
# 1. Install workspace deps (backend + admin-portal + shared-types)
npm install

# 2. Install the partner app's deps separately
npm --prefix apps/partner-app install

# 3. Start local Postgres + MinIO
npm run db:up

# 4. Apply migrations (apps/backend/.env already has working dev defaults)
cd apps/backend
npx prisma migrate deploy
cd ../..
```

## Running each app

```powershell
npm run dev:backend   # NestJS API on http://localhost:3000
npm run dev:admin     # Admin portal on http://localhost:5173
npm run dev:partner   # Expo dev server (press w for web, or scan the QR code)
```

MinIO console: http://localhost:9001 (user/pass: `restaurant` / `restaurant123`)

## Data model

See `apps/backend/prisma/schema.prisma` for the full schema. Every list the partner
app reads from (business types, food categories, menu categories, facilities,
provinces/districts) is admin-managed — partner submissions never bypass it.

## Feature overview

- **Two-stage restaurant approval**: signup approval (new registrations) and a separate,
  one-time go-live "Publish Review" gate checking profile completeness, both managed
  from the admin portal's Restaurant Approvals page.
- **Content moderation**: reviews, dishes, gallery photos, and events all carry a
  `ModerationStatus` (visible/flagged/hidden); admins can hide/restore any of them
  after the fact from the Content Moderation feed — no pre-approval required for
  routine partner edits.
- **Customer reviews with photos**: reviews support star ratings, category breakdowns,
  a restaurant reply, and optional customer-attached photos, which land in the
  restaurant's own gallery under a dedicated "Review Photos" album and flow through
  the same moderation system.
- **Partner-app inbox**: a combined "Inbox" screen (admin announcements + go-live
  publish-review status), with a persistent "Action Required" badge that only clears
  on an explicit acknowledgement, not just by opening the screen.
- **Push notifications** (Expo push, code complete): new reviews, new reservations,
  admin announcements, and publish-review outcomes. **Not yet live** — needs a Firebase
  project's credentials, not yet provided.
- **Forgot-password flow** with emailed 6-digit codes (via Resend; sandbox-restricted
  until a verified sending domain is added).
- Restaurant profile, menu, gallery, chef management, promotions, advertising,
  Chef Table events/reservations, staff accounts with role-based permissions
  (Owner / Manager / Menu Editor).

## Deployment

- Backend: Render (free tier — cold starts after ~15 min idle, expect up to ~50s
  wake-up on the first request).
- Database: Neon (managed Postgres).
- File storage: Cloudflare R2 (S3-compatible; MinIO is the local-dev equivalent).
- Partner app: Expo/EAS — `preview` build profile produces a sideloadable universal
  APK for testing, `production` produces an AAB for the Play Store (which Google then
  serves as smaller per-device APKs — don't judge final user-facing size from a
  preview build). Most JS-only changes ship instantly via `eas update` without a new
  store build; native config changes (permissions, icons, build settings) need a
  full `eas build`.

## Known limitations

Tracked here rather than guessed on silently — worth addressing before a public launch:

- **No automated tests.** Every change in this codebase has been verified manually
  against a live database; there is no regression safety net yet.
- **No CI/CD.** Deploys and migrations are run by hand.
- **No crash reporting or uptime monitoring.** A production error currently has no
  visibility beyond what a user happens to report.
- **No accessibility audit** (screen-reader labels, contrast, keyboard navigation).
- **Push notifications are wired but inactive** pending Firebase credentials.
- **Admin-portal has no shared component library** — each page is self-contained
  Tailwind JSX, which will get repetitive as the page count grows.
- Terms of Service / Privacy Policy links in the registration screen should be
  confirmed to point at real, published pages before public app-store submission —
  both Google Play and the App Store require a working privacy policy URL.
