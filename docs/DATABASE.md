# BUSINESSHUB — Database Schema and Relationships

All SQL lives in `supabase/migrations/` and is applied in numeric order. This document
describes the Phase 1 model, its invariants and the reasoning behind key choices.

---

## 1. Entity relationship overview

```
auth.users (Supabase)
   │ 1
   ├── 0..1 platform_admins
   └── 0..1 employees ──── 1 business
                          │
businesses ──< branches
     │            │
     │            └──< employees (branch_id)
     │
     ├──< roles ──< role_permissions >── permissions
     │       │
     │       └──< employee_roles >── employees
     │
     ├──< devices >── employees
     ├──< login_events
     └──< audit_logs

role_templates ──< role_template_permissions >── permissions
      (global catalogue copied into each business at provisioning)
```

### Cardinality summary

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| `auth.users` → `platform_admins` | 1 : 0..1 | A user is either platform, tenant or neither. |
| `auth.users` → `employees` | 1 : 0..1 | `user_id` is globally unique: one business per account. |
| `businesses` → `branches` | 1 : N | Exactly one default branch per business (partial unique index). |
| `businesses` → `employees` | 1 : N | Employee number unique within a business. |
| `businesses` → `roles` | 1 : N | Role key unique within a business. |
| `roles` ↔ `permissions` | M : N | Via `role_permissions`, scoped by `business_id`. |
| `employees` ↔ `roles` | M : N | Via `employee_roles`, scoped by `business_id`. |
| `employees` → `devices` | 1 : N | Unique fingerprint per business. |
| `businesses` → `audit_logs` | 1 : N | Nullable for platform-level entries. |

---

## 2. Global reference tables

### `permissions`
Immutable catalogue of every permission key (`module.action`).

| Column | Type | Notes |
| --- | --- | --- |
| `key` | `text` PK | e.g. `employee.manage` |
| `module` | `text` | e.g. `Employees` |
| `action` | `text` | e.g. `manage` |
| `description` | `text` | Human-readable |

45 keys are seeded in `0001_schema.sql`. The same catalogue is mirrored in
`src/lib/permissions.ts`; a unit test asserts uniqueness and shape.

### `role_templates` / `role_template_permissions`
The six system roles and their default grants. `provision_business()` copies these into
the tenant's `roles` and `role_permissions`, so a business starts with usable roles and
can diverge afterwards.

| Template key | Default scope |
| --- | --- |
| `business_admin` | all permissions (locked; cannot be reduced) |
| `branch_manager` | branch operations, staff view, stock, sales, reports |
| `cashier` | sales, customers, receipts, limited reporting |
| `inventory_officer` | products, stock, transfers, suppliers |
| `accountant` | expenses, reconciliation, finance, audit, reports |
| `sales_representative` | sales, discounts, customers, wholesale, analytics |

---

## 3. Platform table

### `platform_admins`
| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` PK → `auth.users(id)` | |
| `full_name`, `email` | `text` | Display only. |
| `created_at`, `created_by` | | |

No blanket privileges on tenant tables. The table is read-only to its owner via RLS.

---

## 4. Tenant core

### `businesses`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `name` | `text` | 2–120 chars. |
| `slug` | `text` unique | `^[a-z0-9]+(?:-[a-z0-9]+)*$`. |
| `legal_name`, `email`, `phone`, `address`, `city`, `state` | `text` | Profile. |
| `country` | `text` | Default `Nigeria`. |
| `currency` | `char(3)` | ISO code, default `NGN`. |
| `timezone` | `text` | Default `Africa/Lagos`. |
| `logo_url` | `text` | Storage URL (Phase 2 upload). |
| `status` | `text` | `active` \| `suspended` \| `archived`. |
| `license_reference`, `licensed_until`, `license_notes` | | Commercial record only. |
| `expense_approval_threshold` | `numeric(14,2)` | 0 means all expenses need approval. |
| `offline_session_hours` | `int` | 1–720; offline window for devices. |
| `created_at`, `updated_at` | `timestamptz` | |

**Invariants**
- Suspension immediately removes access because `current_business_id()` joins
  `businesses.status = 'active'`.
- Only a platform admin may change `status` or licence columns (enforced by
  `guard_business_update()`), even if a tenant has `business.settings`.

### `branches`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `business_id` | `uuid` → `businesses` | Cascade delete. |
| `name` | `text` | |
| `code` | `text` | `^[A-Z0-9][A-Z0-9-]{0,15}$`; unique per business. |
| `address`, `phone` | `text` | |
| `is_default` | `boolean` | Partial unique index allows one per business. |
| `status` | `text` | `active` \| `inactive`. |
| `unique (business_id, id)` | | Enables composite FKs. |

### `employees`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `business_id` | `uuid` → `businesses` | |
| `user_id` | `uuid` unique → `auth.users` | One business per account. |
| `employee_number` | `text` | Unique per business; auto-generated if blank. |
| `full_name`, `email`, `phone` | | |
| `branch_id` | `uuid` nullable | Composite FK to `(business_id, id)`. |
| `designation` | `text` | |
| `status` | `text` | `active` \| `suspended` \| `terminated`. |
| `must_change_password` | `boolean` | Forced first-login rotation. |
| `hired_on`, `last_login_at` | | |
| `created_at`, `updated_at` | | |

**Invariants**
- `guard_employee_update()` blocks moving an employee to another business/account and
  blocks changing your own status.
- `revoke_employee_devices()` revokes all active devices when status leaves `active`.
- Email is unique per business (case-insensitive index), not globally.

### `roles`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `business_id` | `uuid` → `businesses` | |
| `key` | `text` | `^[a-z][a-z0-9_]{1,49}$`; unique per business. |
| `name` | `text` | 2–60 chars. |
| `description` | `text` | |
| `is_system` | `boolean` | System roles cannot be deleted. |
| `unique (business_id, id)` | | Composite FK support. |

### `role_permissions`
`(role_id, permission_key)` PK, `business_id` FK. Includes `business_id` so RLS can
scope reads without a join. Composite FK to `(business_id, role_id)`.

### `employee_roles`
`(employee_id, role_id)` PK, `business_id`, `assigned_at`, `assigned_by`. Composite FKs
to employees and roles. A trigger prevents removing the last active Business
Administrator.

---

## 5. Devices (offline foundation)

### `devices`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | |
| `business_id` | `uuid` → `businesses` | |
| `employee_id` | `uuid` | Composite FK to `(business_id, id)`. |
| `device_name` | `text` | Display label. |
| `device_fingerprint` | `text` | 32–128 chars; unique per business. |
| `platform`, `app_version` | `text` | Diagnostics. |
| `status` | `text` | `active` \| `revoked`. |
| `offline_expiry_hours` | `int` | 1–720; copied from business at registration. |
| `registered_at`, `last_seen_at`, `revoked_at`, `revoked_by` | | |

In Phase 3, only an `active` device whose `last_seen_at` is within
`offline_expiry_hours` may authenticate offline.

---

## 6. Activity and audit

### `login_events`
`id bigint identity`, `business_id` nullable, `user_id`, `employee_id`, `email`,
`event` (`login`/`logout`/`failed_login`/`offline_login`), `ip inet`, `user_agent`,
`device_id`, `created_at`. Insert allowed only for the caller's own `user_id`;
update/delete revoked.

### `audit_logs` — append only
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` identity | |
| `business_id` | `uuid` nullable | Null for platform entries. |
| `actor_user_id`, `actor_employee_id` | `uuid` | Attribution. |
| `action` | `text` | `insert` / `update` / `delete` / `platform.*`. |
| `entity_type`, `entity_id` | `text` | |
| `metadata` | `jsonb` | `{ old, new }` for tenant triggers. |
| `ip`, `user_agent` | | Where available. |
| `created_at` | `timestamptz` | |

`insert/update/delete` is revoked from `anon` and `authenticated`. Rows are written by
triggers (`audit_row_change()`) and by `log_platform_action()`.

**Audited tables:** `businesses`, `branches`, `employees`, `roles`, `role_permissions`,
`employee_roles`, `devices`.

**Deliberate exclusion:** platform entries never contain tenant transaction payloads.
Platform audit rows have `business_id = null` and only account/licensing metadata.

---

## 7. Functions

| Function | Security | Purpose |
| --- | --- | --- |
| `is_platform_admin()` | definer, stable | Membership test. |
| `current_employee_id()` | definer, stable | Active employee for `auth.uid()`. |
| `current_business_id()` | definer, stable | Active business for `auth.uid()`. |
| `actor_has_permission(business, permission)` | definer, stable | Permission check for a specific tenant. |
| `has_permission(permission)` | definer, stable | Permission check for current tenant. |
| `get_my_context()` | definer, stable | Single bootstrap payload for the app. |
| `touch_device(device)` | definer | Heartbeat from an authorised device. |
| `mark_password_changed()` | definer | Clears forced rotation for the caller. |
| `provision_business(...)` | definer | Transactional tenant creation (platform only). |
| `provision_employee(...)` | definer | Employee creation + role assignment (`employee.manage`). |
| `platform_business_directory()` | definer | Platform account list. |
| `platform_business_detail(uuid)` | definer | Platform account detail. |
| `log_platform_action(...)` | definer | Explicit platform audit write. |

All helper functions revoke `EXECUTE` from `public` and grant only to
`authenticated` / `service_role` as required.

---

## 8. Provisioning flows

### 8.1 Business

```
validate slug/currency/uniqueness/admin-not-linked
  ├─ insert business
  ├─ insert default branch (MAIN)
  ├─ copy role_templates → roles
  ├─ copy role_template_permissions → role_permissions
  ├─ insert administrator employee (ADM-0001, must_change_password = true)
  ├─ assign business_admin role
  └─ insert platform audit row (business_id = null)
```

All steps run in one PL/pgSQL function call; any failure rolls back the whole
transaction. The caller compensates by deleting the Supabase Auth user.

### 8.2 Employee

```
authorise employee.manage for the target business
  ├─ validate branch belongs to the business
  ├─ validate auth user is not already linked
  ├─ generate employee number if blank
  ├─ insert employee (must_change_password = true)
  └─ insert employee_roles for selected role IDs belonging to the business
```

The server validates role ownership before calling Auth, and deletes the new Auth user
if provisioning fails.

---

## 9. Migration strategy

- Files are numbered and applied in order; **never edit an applied migration**.
- New change = new numbered file (`0006_...sql`).
- Destructive changes require a backfill plan and a reversible step.
- RLS is enabled in the same migration that creates each table (Phase 1 keeps schema
  and policies separate for readability; a new table must add its policies in the same
  release).
- Integration tests should run against a disposable Supabase branch or local stack.

---

## 10. Phase 2+ schema (planned)

These are not implemented yet; they are listed to show that Phase 1 does not need
restructuring:

- `products`, `product_categories`, `suppliers`
- `inventory_movements` (ledger), `stock_levels` (projection)
- `customers`, `sales`, `sale_items`, `payments`, `receipts`
- `stock_transfers`, `transfer_items`
- `expenses`, `supplier_payments`, `cash_reconciliations`
- `wholesale_collections`, `wholesale_returns`
- `attendance_events`, `feedback_submissions`, `daily_reports`
- `sync_batches`, `sync_conflicts` (Phase 3)

Every one of these will carry `business_id`, use composite FKs and add RLS policies in
the same migration.
