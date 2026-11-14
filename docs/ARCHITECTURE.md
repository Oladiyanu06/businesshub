# BUSINESSHUB — System Architecture

## 1. Purpose and constraints

BUSINESSHUB is a commercial, multi-tenant business operations platform. It must:

- Serve many independent businesses from **one deployment and one database**.
- Guarantee that a business can never read or mutate another business's data.
- Keep working on authorised devices when the internet is unavailable.
- Preserve an immutable, attributable record of important actions.
- Be licensed commercially **outside** the application — no subscriptions, packages,
  renewals, automated billing or feature gating by plan.

The architecture optimises for these constraints over novelty. Every layer assumes the
network will fail and that a compromised client must not be able to escalate access.

---

## 2. High-level topology

```
                        ┌───────────────────────────────────────────┐
                        │            Browser (PWA)                  │
                        │  Server-rendered HTML + client components  │
                        │  Service worker + IndexedDB (Phase 3)      │
                        └───────────────┬───────────────────────────┘
                                        │ HTTPS
                        ┌───────────────▼───────────────────────────┐
                        │        Next.js on Vercel / Node           │
                        │                                           │
                        │  proxy.ts        session refresh          │
                        │  Server          Components (RSC)         │
                        │  Server          Actions (mutations)      │
                        │  Route           Handlers (/auth/confirm) │
                        └───────┬───────────────────────┬───────────┘
                                │                       │
                 user JWT (RLS) │                       │ service role
                                │                       │ (Auth admin only)
                        ┌───────▼───────────────────────▼───────────┐
                        │                 Supabase                  │
                        │                                           │
                        │  Auth: email + password, sessions         │
                        │  Postgres: RLS, SECURITY DEFINER helpers, │
                        │            triggers, provisioning RPCs    │
                        │  Storage (Phase 2+): logos, attachments   │
                        └───────────────────────────────────────────┘
```

### Why Next.js + Supabase

| Choice | Reason |
| --- | --- |
| Next.js App Router | Server Components keep privileged queries on the server; Server Actions remove a hand-written REST layer; streaming and per-route layouts fit a dashboard. |
| Supabase Auth | Managed email/password auth, JWT issuance, session refresh and admin APIs for provisioning. |
| PostgreSQL + RLS | The database, not the UI, is the final authority on tenant isolation. |
| Service worker + IndexedDB | Standard, dependency-free offline stack that works in every target browser. |
| Tailwind CSS | Fast, consistent design system with no runtime CSS cost. |

---

## 3. Module boundaries

### 3.1 Platform module (`/platform`)

Responsible for **tenant lifecycle**, never tenant transactions.

- Provision a business (name, slug, currency, country, timezone, default branch).
- Create the Business Administrator auth account with a one-time password.
- Activate / suspend / archive businesses.
- Record licence reference, expiry and notes.
- View platform audit entries.

The platform administrator is deliberately **not** granted RLS access to tenant
transaction tables. Account-level information is exposed through two narrow
`SECURITY DEFINER` RPCs:

- `platform_business_directory()` — list view.
- `platform_business_detail(uuid)` — profile, administrators, counts, licence.

Exceptional access to tenant data (e.g. a legal request) must be granted explicitly and
recorded; it is not a feature of the normal product.

### 3.2 Tenant workspace (`/app`)

Every route requires an active employee linked to an active business.

| Area | Route | Guard |
| --- | --- | --- |
| Overview | `/app` | authenticated employee |
| Employees | `/app/employees` | `employee.view` / `employee.manage` |
| Roles | `/app/roles` | `role.view` / `role.manage` |
| Branches | `/app/branches` | `branch.view` / `branch.manage` |
| Devices | `/app/devices` | `device.view` / `device.manage` |
| Audit | `/app/audit` | `audit.view` |
| Settings | `/app/settings` | `business.settings` |

Navigation is filtered by permission so inaccessible modules are not advertised. Route
guards (`requirePermission`) are authoritative; hiding a link is only cosmetic.

### 3.3 Authentication module

- `/login` — email + password.
- `/change-password` — forced for provisioned accounts and resets.
- `/suspended`, `/no-access` — explicit dead ends with sign-out.
- `/auth/confirm` — email OTP confirmation.
- `proxy.ts` — refreshes the Supabase session cookie on every matched request.

---

## 4. Request lifecycle

### 4.1 Authenticated page render

1. `proxy.ts` calls `supabase.auth.getUser()` and refreshes cookies if needed.
2. The route's server component calls `requireBusiness()` or `requirePermission(key)`.
3. `getSessionContext()` performs one `get_my_context()` RPC which returns, in a single
   round trip:
   - `is_platform_admin`
   - platform admin profile
   - employee summary
   - business summary
   - assigned roles
   - flattened permission list
4. The context is validated with Zod. A malformed payload fails closed (treated as
   unauthenticated).
5. The component queries data through the request-scoped Supabase client. RLS applies
   to every row.
6. The component renders. Loading states stream automatically.

### 4.2 Server Action mutation

1. The action re-derives the session with `getActionSession(permission)` — it does not
   trust hidden form fields or UI state.
2. Input is parsed with Zod.
3. Ownership checks add a second line of defence (`business_id = session.business.id`).
4. The mutation runs through the user-scoped client, so RLS remains active.
5. Post-conditions that span systems (e.g. suspend + Auth ban) are applied explicitly.
6. `revalidatePath` refreshes affected routes; audit triggers record the change.

### 4.3 Provisioning a business

1. Platform admin submits the form.
2. Server Action checks `requirePlatformAdmin()` and validates input.
3. The service-role client creates the Supabase Auth user with a generated password.
4. `provision_business()` runs as the platform admin's JWT (required by
   `is_platform_admin()`), creating in one transaction:
   - business, default branch
   - six system roles + permission rows
   - administrator employee + role assignment
   - platform audit entry
5. If step 4 fails, the auth user is deleted (compensation) so no orphan sign-in exists.
6. The temporary password is returned once and never stored in readable form.

---

## 5. Data access rules

1. **Every tenant table carries `business_id`.** Composite foreign keys
   `(business_id, id)` prevent cross-tenant references even if an ID is guessed.
2. **RLS is enabled on every table.** Policies require
   `business_id = current_business_id()`; sensitive verbs additionally require
   `has_permission(...)`.
3. **Helper functions are `SECURITY DEFINER` and `STABLE`**, read identity from
   `auth.uid()`, and pin `search_path = ''` to avoid hijacking.
4. **The service role is never used for routine reads.** It exists solely for Auth
   administration; all business data flows through the user's JWT.
5. **Audit tables are append-only from the application.** `insert/update/delete` is
   revoked from `anon` and `authenticated`; writes happen in triggers or in explicitly
   authorised RPCs.

Details: [`MULTI-TENANCY.md`](MULTI-TENANCY.md).

---

## 6. State management

- **Server state** lives in PostgreSQL and is read per request. No global client cache
  of tenant data exists in Phase 1.
- **Session state** is the Supabase JWT in HttpOnly cookies plus the derived
  `SessionContext` (memoised per render with React `cache`).
- **UI state** is local component state (forms, disclosure panels, connection status).
- **Offline state** (Phase 3) will live in IndexedDB, partitioned by business, employee
  and device, with explicit sync status per record.

---

## 7. Security architecture

| Control | Implementation |
| --- | --- |
| Authentication | Supabase Auth, JWT validated server-side on every request |
| Session refresh | `proxy.ts` using `getUser()` (never `getSession()` for trust) |
| Authorization | Permissions in the database and in route/action guards |
| Tenant isolation | RLS + `business_id` on every table + composite FKs |
| Privilege boundary | Platform admin RPCs expose account data only |
| Secret handling | Service role key imported exclusively from `server-only` modules |
| Input validation | Zod at forms, Server Actions and context parsing |
| Output safety | React escaping; no `dangerouslySetInnerHTML` on user data |
| Transport | HTTPS enforced by the hosting provider |
| Headers | `X-Frame-Options: DENY`, `nosniff`, strict referrer, restrictive permissions policy |
| Password policy | 12+ chars, mixed case, number, symbol; forced rotation on first use/reset |
| Account takeover limits | Employee suspension bans the Auth user and revokes devices |
| Audit | Append-only rows with actor, action, entity, before/after, IP/UA where available |
| Offline (Phase 3) | Device registry, expiry windows, revocation, encrypted local storage |

Threats and mitigations: [`RISKS.md`](RISKS.md).

---

## 8. Deployment

- **Hosting:** Vercel (or any Node host) with environment variables set in the platform.
- **Database:** Supabase managed Postgres with daily backups and PITR in production.
- **Migrations:** applied in order via the Supabase CLI from CI; never edited after
  being applied — add a new numbered file.
- **Observability:** structured server logs for RPC failures; Supabase logs for Auth and
  Postgres; add an error tracker (Sentry) before Phase 2.
- **Environments:** development, staging and production projects. The seed script is
  development-only.

---

## 9. Extensibility

The Phase 1 foundation anticipates later modules:

- Permission catalogue already contains product, inventory, transfer, sales, finance,
  reporting, wholesale, feedback and attendance keys, so new modules do not require a
  schema migration to the catalogue.
- Roles are data, not code: new system templates can be added by seeding
  `role_templates` and provisioning copies them.
- `devices` and `businesses.offline_session_hours` are in place for Phase 3 sync.
- Audit triggers are generic; new tables only need a trigger declaration.
- API surface can be added as route handlers for the sync engine without changing the
  web application's data access patterns.
