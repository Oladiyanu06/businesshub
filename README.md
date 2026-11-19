# BUSINESSHUB

**Multi-tenant business operations platform — one deployment, strict tenant isolation, offline-first foundations.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4-000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.3-087ea4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live:** <https://businesshub-pi.vercel.app> — invitation-only; accounts are issued by the platform administrator.

![Tenant workspace dashboard](docs/screenshots/tenant-dashboard.png)

---

## Why this project exists

Small businesses rarely run on one system. Sales live in a notebook, stock in a
spreadsheet, staff records in WhatsApp, and each branch keeps its own version of
the truth. BUSINESSHUB is a single workspace where a business can manage its
people, branches, roles and — in later phases — sales, inventory and expenses.

The engineering problem is not the forms. It is running **many independent
businesses on one deployment** without ever letting one see another's data,
while keeping a platform administrator able to operate the service without being
able to read tenant transactions.

## What is implemented (Phase 1)

| Area | Capability |
| --- | --- |
| **Platform administration** | Provision tenants, view a narrow business directory, record licence references, suspend/restore access, platform audit trail |
| **Tenant onboarding** | One-time generated administrator password, forced password rotation at first sign-in |
| **People** | Employee registration, branch assignment, status changes, one-time credentials |
| **Roles & permissions** | 6 system role templates, 45 permission keys, additive role assignment, permission matrix |
| **Branches** | Default branch rules, activation/deactivation, human-readable codes |
| **Devices** | Device registration and revocation, readiness checklist for offline mode |
| **Governance** | Append-only audit log, login activity, platform vs tenant boundaries |
| **PWA foundation** | Installable manifest, service worker with an offline fallback, authenticated HTML never cached |

Phase 2 (sales, inventory, customers, expenses) and Phase 3 (IndexedDB sync,
device authorisation) are planned — see [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Architecture

```mermaid
flowchart LR
  U["Browser / installed PWA"] -->|HTTPS| N["Next.js on Vercel"]
  N -->|"Server Components<br/>Server Actions"| A["Supabase Auth"]
  N -->|"JWT + PostgREST<br/>(RLS enforced)"| D[("PostgreSQL")]
  N -->|"service role<br/>(Auth admin only)"| AA["Auth Admin API"]
  A --> D
  D --- P["33 RLS policies<br/>business_id = current_business_id()"]
```

- **Shared database, shared schema.** Every tenant table carries `business_id`
  and row-level security compares it with the caller's business, resolved from
  the JWT by a `SECURITY DEFINER` helper.
- **Two administrator levels.** Platform administrators provision and govern
  tenants through narrow, audited RPCs; business administrators control their
  own tenant. Platform admins are excluded from tenant transaction tables.
- **Service role stays server-side.** It is used only for Supabase Auth
  administration (creating accounts, password resets), never for tenant reads.
- **Composite keys.** Child tables use `(business_id, id)` foreign keys so a row
  cannot point at another tenant's parent even if an application bug slips
  through.

Deeper write-ups: [architecture](docs/ARCHITECTURE.md) ·
[multi-tenancy](docs/MULTI-TENANCY.md) · [database](docs/DATABASE.md) ·
[roles & permissions](docs/ROLES-PERMISSIONS.md) · [offline strategy](docs/OFFLINE-SYNC.md)

## Security notes worth a look

- **Session clock normalisation** (`src/lib/supabase/clock.ts`). Supabase rotates
  refresh tokens on every request based on the auth server's clock. A machine
  with a skewed clock caused `refresh_token_already_used`, revoked sessions and
  random sign-outs. The fix measures the offset from the HTTP `Date` header and
  normalises cookie expiry instead of weakening route guards.
- **Prefetch-safe auth cookies** (`src/proxy.ts`). Next.js prefetches can race a
  cookie refresh; prefetch requests are prevented from deleting auth cookies.
- **Post-login redirect validation** (`src/lib/auth/redirect.ts`) — only
  same-origin, non-protocol paths are accepted in `?next=`.
- **Permission catalogue mirrored in SQL and TypeScript** so UI gating and
  database policies cannot drift silently.
- **Forced password rotation** for every provisioned account.

## Screenshots

| Tenant workspace | Employees |
| --- | --- |
| ![Dashboard](docs/screenshots/tenant-dashboard.png) | ![Employees](docs/screenshots/tenant-employees.png) |

| Roles & permissions | Branches |
| --- | --- |
| ![Roles](docs/screenshots/tenant-roles.png) | ![Branches](docs/screenshots/tenant-branches.png) |

| Platform: tenant profile | Platform: provisioning |
| --- | --- |
| ![Business detail](docs/screenshots/platform-business.jpeg) | ![Register business](docs/screenshots/platform-provision.jpeg) |

> Screenshots were captured from the live deployment using a temporary demo
> tenant, which was deleted afterwards. The live instance is invitation-only.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Server Components, Server Actions) |
| Language | TypeScript 5 (strict), Zod 4 at trust boundaries |
| UI | React 19.3, Tailwind CSS 4, custom components |
| Data & auth | Supabase (PostgreSQL 17, GoTrue auth, PostgREST, RLS) |
| Session handling | `@supabase/ssr` with a cookie-aware proxy |
| Tests | Vitest 5 (39 tests on auth, redirects, session cookies, permissions) |
| Hosting | Vercel (Node runtime) |

## Data model at a glance

13 tables, including:

- `businesses`, `branches`, `employees`, `devices`
- `roles`, `role_permissions`, `employee_roles`
- `permissions`, `role_templates`, `role_template_permissions` (platform catalogue)
- `platform_admins`, `login_events`, `audit_logs`

45 permission keys, 6 role templates, 140 template-permission grants, 33 RLS
policies, 17 triggers and 21 functions, all versioned as SQL migrations.

## Getting started

Prerequisites: Node.js 20+, a Supabase project, and its database connection
string (Dashboard → Connect → Session pooler).

```bash
npm install
cp .env.example .env.local          # PowerShell: Copy-Item .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`.

```bash
# Apply migrations (direct PostgreSQL connection, one transaction)
npm run db:apply -- "postgresql://postgres:PASSWORD@HOST:5432/postgres"

# Create the first platform administrator (password printed once)
npm run admin:bootstrap -- owner@example.com "Platform Owner"

# Optional: seed a disposable demo tenant for development
npm run seed
```

```bash
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

Deployment steps, environment variables and the Vercel smoke test are in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). The project is linked to Vercel, so
every push to `main` deploys to production automatically.

## Project structure

```
src/
  app/                 routes: landing, login, /app (tenant), /platform (staff)
  components/          shell, form and data-display components
  lib/
    auth/              session guards, redirect validation, password rules
    supabase/          browser/server clients, clock sync, cookie handling
    permissions.ts     45-key catalogue shared with SQL
supabase/migrations/   0001 schema · 0002 functions · 0003 RLS · 0004 provisioning · 0005 platform
scripts/               migrate, bootstrap admin, seed demo tenant
tests/                 auth, cookie, redirect and permission tests
docs/                  architecture, database, tenancy, roles, offline, deployment
```

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Tenancy, auth, businesses, employees, roles, branches, devices, audit | ✅ Complete |
| 2 | Sales, inventory, customers, expenses, reporting | Planned |
| 3 | Offline-first: IndexedDB, sync queue, idempotency, device authorisation | Foundation only |

## Licence

[MIT](LICENSE) © 2026 Oladiyanu06
