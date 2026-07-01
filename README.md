# Dispatch CRM

A trucking dispatch operating system: Internal CRM, Client Portal, Driver App, and an AI layer — built on Next.js, PostgreSQL/Prisma, Clerk, OpenLayers, and Claude.

**Status: Phase 0–1 foundation.** This is not a finished product — it's the architectural backbone (schema, auth, RBAC, finance engine, core APIs, dashboard) that the rest of the system builds on. See "What's built" and "What's next" below.

---

## What's built

- **Database schema** (`prisma/schema.prisma`) — all ~25 entities from the spec: users, clients, drivers, trucks, loads, documents, communications, finance, tasks, issues, audit logs, etc.
- **RBAC engine** (`src/lib/auth/rbac.ts`) — permission matrix for 6 roles (Admin, Senior/Junior Dispatcher, Updater, Recruiter, Finance), row-level data scoping, and the **Load status state machine** (enforces valid status transitions server-side).
- **Finance engine** (`src/lib/finance.ts`) — RPM, dispatch fee, company revenue, senior commission, net income, cashflow forecasting, aging buckets.
- **Auth** — Clerk-based, with middleware route protection and a promote-to-admin script.
- **Core APIs** — Loads (CRUD + status transitions), Clients (CRUD), Finance dashboard, Map/driver locations, AI assistant (rate confirmation parsing, communication summaries, low-RPM analysis, natural-language search), Telegram bot webhook (status updates via inline buttons, document intake, account linking).
- **Dashboard UI** — KPI cards, load pipeline funnel, fleet map (OpenLayers), active drivers list, integration status panel. Dark premium theme implemented in Tailwind.
- **Audit logging** — every mutation writes to `AuditLog`.

## What's NOT built yet

Drivers/Trucks CRUD pages, the full Loads table + right-panel UI, Client Portal, Driver PWA, Gmail/RingCentral integrations, document upload flow (Supabase Storage wiring), Reports/exports, Settings pages, real-time WebSocket updates, and the remaining AI features (call summaries in production, weekly report generation). This matches Phases 2–7 of the original plan.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create accounts & get API keys

You need, at minimum, these to run the app at all:

| Service | What for | Get it at |
|---|---|---|
| **Supabase** (or any Postgres) | Database + file storage | supabase.com — free tier works |
| **Clerk** | Authentication | clerk.com — free tier works |
| **Anthropic** | AI features | console.anthropic.com |

Optional for now (needed only when you build Phase 4):
- Telegram Bot (via @BotFather)
- Google Cloud OAuth credentials (Gmail)
- RingCentral developer app

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL` (from Supabase: Project Settings → Database → Connection string, use the "Transaction" pooler URL), the two Clerk keys, and `ANTHROPIC_API_KEY`.

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 5. Run it

```bash
npm run dev
```

Open `http://localhost:3000` → you'll be redirected to `/login` → sign up via Clerk.

### 6. Make yourself an Admin

After signing up, grab your Clerk User ID from the Clerk Dashboard (Users → click yourself → copy User ID), then:

```bash
npx tsx prisma/promote-admin.ts <clerkId> <your-email> "Your Name"
```

Refresh the app — you should now land on the dashboard with full access.

---

## Project structure

```
prisma/schema.prisma          # source of truth for all data models
src/
  lib/
    auth/rbac.ts               # permission matrix + status state machine + auth guard
    finance.ts                 # all financial calculations
    db.ts                      # Prisma client singleton
    audit.ts                   # audit log writer
  app/
    api/                       # API routes (loads, clients, finance, map, ai, integrations)
    (dashboard)/                # authenticated app shell + pages
    (auth)/login/                # Clerk sign-in
  components/
    ui/                         # KpiCard, StatusBadge, etc.
    layout/                     # Sidebar
    modules/dashboard/         # dashboard-specific components
```

---

## Recommended next step: move to Claude Code

This chat environment can generate files but can't run `npm install`, connect to your database, or catch runtime errors. To keep building efficiently — implementing Drivers/Trucks pages, the full Loads UI, Client Portal, Driver PWA, and the remaining integrations — open this folder in **Claude Code** (desktop app or terminal), where Claude can run the dev server, see real errors, query your actual database, and iterate against a working app instead of guessing.

```bash
# once you have Claude Code installed
cd dispatch-crm
claude
```

Then continue with: "Let's build Phase 1.3 — the Truck & Trailer module" (or whichever phase you want next).
