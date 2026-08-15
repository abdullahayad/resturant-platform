# Restaurant Platform

Two-sided platform for a restaurant-discovery service in Iraq: a tablet-first **Partner App**
(Expo / React Native) for restaurant owners, and an **Admin Portal** (React / Vite) for
platform staff, sharing one **NestJS + PostgreSQL** backend.

## Structure

```
apps/
  backend/        NestJS API + Prisma (PostgreSQL)
  admin-portal/   React + Vite + Tailwind, dark/amber theme
  partner-app/    Expo (React Native), tablet-first sidebar layout
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

# 4. Run the first migration (apps/backend/.env already has working dev defaults)
cd apps/backend
npx prisma migrate dev --name init
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
New restaurant sign-ups start in `PENDING_REVIEW` and are invisible publicly until
an admin approves them.

## Status

This is a scaffold: project structure, theming, navigation shells, and the full
Prisma data model are in place. No business logic, auth flows, or API endpoints
are implemented yet — see the project brief's suggested build order for what's next.

Open questions to resolve before building further (flagged in the original brief,
not guessed on here):
- Exact facilities/amenities starter list
- Staff permission levels beyond the three roles stubbed in the schema
  (`OWNER` / `MANAGER` / `MENU_EDITOR`)
- Whether 24-hour story uploads get pre-moderation in v1 or v2
