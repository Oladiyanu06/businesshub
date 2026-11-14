# BUSINESSHUB — Multi-Tenant Data Isolation Strategy

## 1. Model

BUSINESSHUB uses a **shared database, shared schema** tenancy model:

- One PostgreSQL database and one application deployment serve all businesses.
- Every tenant-owned row carries an immutable `business_id`.
- PostgreSQL Row-Level Security (RLS) is the final authority on which rows a request may
  read or write.
- Application code adds defense in depth: route guards, action authorization and
  explicit `business_id` filters.

This model was chosen over schema-per-tenant or database-per-tenant because it keeps
migrations, backups and support operationally simple while still delivering hard
isolation. It scales to thousands of businesses when indexes lead with `business_id`.

---

## 2. Identity chain

Every request derives identity from the Supabase JWT, never from client input.

```
auth.uid()
   │
   ├─ platform_admins?  → platform operator (account lifecycle only)
   │
   └─ employees (active)
         │  business_id
         └─ businesses (status = 'active')
               │
               ├─ roles → role_permissions → permissions
               └─ tenant rows filtered by business_id
```

### Helper functions

All are `SECURITY DEFINER`, `STABLE`, and `SET search_path = ''`:

```sql
current_employee_id()  -- active employee for auth.uid(), else null
current_business_id()  -- active business for auth.uid(), else null
has_permission(key)    -- permission for the current active business
actor_has_permission(business_id, key)
is_platform_admin()
```

Because `current_business_id()` joins `businesses.status = 'active'`, **suspension is
instantaneous**: every policy that references it stops matching.

---

## 3. Policy pattern

Every tenant table follows the same shape:

```sql
-- Read: scoped to the business, optionally permission-gated.
using (business_id = public.current_business_id() and public.has_permission('thing.view'))

-- Write: scoped to the business, permission-gated, and the check repeats in WITH CHECK.
with check (business_id = public.current_business_id() and public.has_permission('thing.manage'))
```

Why repeat the permission in `WITH CHECK`? `USING` decides which existing rows may be
touched; `WITH CHECK` validates the new row. Without it, an employee could move a row to
another business or escalate a status field.

### Sensitive exceptions

| Table | Policy detail |
| --- | --- |
| `branches` | Readable if `branch.view` **or** it is the employee's own branch. |
| `employees` | Readable if `employee.view` **or** it is the caller's own record. |
| `employee_roles` | Readable if `employee.view` or the caller's own assignments. |
| `devices` | Readable if `device.view` or the device belongs to the caller. Self-registration only inserts `employee_id = current_employee_id()`. |
| `login_events` | Caller sees own events; `employee.view` sees the business's events. Insert only for own `user_id`. |
| `businesses` | Tenants read/update their own row; status and licence columns are protected by a trigger. |
| `audit_logs` | Tenant read requires `audit.view`; platform read requires `is_platform_admin()` **and** `business_id is null`. |

---

## 4. Cross-tenant reference prevention

RLS prevents reading another tenant's rows but does not, by itself, stop a foreign key
from pointing at another tenant's row. BUSINESSHUB prevents this structurally:

- Parent tables expose `unique (business_id, id)`.
- Child tables declare composite foreign keys such as
  `foreign key (business_id, branch_id) references branches(business_id, id)`.
- Therefore a row can only reference a parent **in the same business**, even if an
  attacker knows a valid UUID from another tenant.

`employee_roles` and `role_permissions` use composite FKs to both parents.

---

## 5. The platform boundary

The platform administrator controls the software but **does not** get a master key to
tenant transactions.

| Data | Platform access |
| --- | --- |
| Business name, slug, status, currency, country | Yes (directory/detail RPC) |
| Administrator name/email/phone | Yes |
| Employee/branch counts | Yes |
| Licence reference, expiry, notes | Yes |
| Sales, receipts, customers, inventory, expenses, stock, attendance | **No** |
| Employee records beyond administrators | **No** |
| Tenant audit metadata | **No** |

Implementation:

- No RLS policy grants `is_platform_admin()` access to tenant tables.
- `platform_business_directory()` and `platform_business_detail()` are `SECURITY
  DEFINER` functions that return **whitelisted account fields only**.
- Platform audit entries are written with `business_id = null` and never contain
  tenant payloads.
- If exceptional access is ever required (legal request, incident), it must be granted
  through a separate, logged, time-boxed mechanism — not a standing capability.

---

## 6. Application-layer defense in depth

RLS is necessary but the application does not rely on it alone:

1. **Route guards** — `requireBusiness()` / `requirePermission(key)` redirect
   unauthenticated or unauthorised users before a query runs.
2. **Server Action guards** — `getActionSession(permission)` re-derives context from the
   database on every mutation. Hidden fields are never trusted.
3. **Explicit filters** — queries include `.eq("business_id", session.business.id)` even
   though RLS would enforce it. This keeps intent obvious and protects against a future
   policy mistake.
4. **Ownership checks before cross-system actions** — e.g. an employee is loaded with
   `business_id` constrained before an Auth ban is applied.
5. **Input validation** — every action parses with Zod before touching the database.
6. **Server-clock session expiry** — the auth SDK decides whether a token needs refreshing
   by comparing its `expires_at` with the *local* clock, while `expires_at` is issued by
   the auth server. The proxy measures the offset and normalises the session cookie to
   server time (`src/lib/supabase/clock.ts`, `src/lib/supabase/session-cookie.ts`) so a
   skewed host does not rotate the refresh token on every request. The JWT sent to
   PostgREST is untouched and is still validated by `getUser()` on every request.

### Why not rely on the UI?

Hiding a navigation link is cosmetic. A user can call a Server Action directly or craft
a request. The guard in the action and the JWT-bound RLS policy are what actually deny
the operation.

---

## 7. Failure modes and how they are handled

| Failure | Result |
| --- | --- |
| Business suspended | `current_business_id()` returns null → every tenant policy fails closed. |
| Employee suspended/terminated | `current_employee_id()` null → no permissions; Auth user also banned. |
| Employee moved between businesses | Blocked by `guard_employee_update()` and `user_id` uniqueness. |
| Role permissions revoked | Next request re-reads `get_my_context()`; access disappears immediately. |
| Last administrator role removed | Blocked by `guard_employee_role_delete()`. |
| Business Administrator permissions reduced | Blocked by `guard_role_permission_delete()`. |
| Device revoked | Status flips to `revoked`; Phase 3 sync rejects the device. |
| Platform admin tries a tenant table | RLS returns zero rows; no policy matches. |
| Malformed session payload | Zod validation fails → treated as unauthenticated. |
| Host clock skewed from the auth server | Session expiry is normalised to server time, so tokens are not rotated on every request; a warning is logged. A session already revoked by refresh-token reuse detection must sign in again. |
| Service role key leaked | **Critical.** It bypasses RLS; rotate immediately. Never ship it to the client. |

---

## 8. Verification plan

RLS is only trustworthy when tested. The following must be automated against a
disposable project before Phase 2 ships:

1. **Tenant isolation** — create businesses A and B. As an A employee, attempt
   `select`, `insert`, `update`, `delete` on B's rows in every tenant table. Expect zero
   rows / RLS errors.
2. **Cross-tenant FK** — attempt to attach an A employee to a B branch. Expect a foreign
   key violation.
3. **Permission denial** — cashier attempts employee management and role editing.
4. **Platform boundary** — platform admin queries tenant tables directly. Expect zero
   rows; directory RPC still works.
5. **Suspension** — suspend a business; confirm an existing session loses all tenant
   reads on the next request.
6. **Employee suspension** — confirm Auth ban, device revocation and permission loss.
7. **Canonical administrator** — confirm the last Business Administrator cannot be
   unassigned and the role cannot lose permissions.
8. **Audit immutability** — attempt update/delete on `audit_logs` as `authenticated`.
   Expect permission denied.

Suggested harness: Vitest integration suite using the anon key with real user sessions
(not the service role) so RLS is exercised exactly as in production.

---

## 9. Operational rules

- New tenant table ⇒ add `business_id`, composite FKs, RLS enabled and policies **in the
  same migration**.
- New `SECURITY DEFINER` function ⇒ `search_path = ''`, revoke from `public`, grant
  minimally, and review for tenant leakage.
- Never write a policy that references `is_platform_admin()` on a tenant table.
- Never log row payloads from tenant tables into platform-visible logs.
- Review every migration for `business_id` coverage before merging.
