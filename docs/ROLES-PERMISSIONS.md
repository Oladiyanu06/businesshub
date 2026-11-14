# BUSINESSHUB — Roles and Permissions

## 1. Model

- A business has **roles**. Each role has **permissions**.
- An employee can hold **multiple roles**.
- Effective permissions are the **union** of all assigned roles.
- Roles are data, not code: businesses can create custom roles and edit permissions.
- The `business_admin` role is special: it always holds every permission and cannot be
  reduced or deleted.

---

## 2. System roles

Provisioned automatically for every business from `role_templates`.

### Business Administrator (`business_admin`)
Full control of the business environment. Locked to all permissions. At least one
active employee must retain this role (enforced by a database trigger).

### Branch Manager (`branch_manager`)
Runs a location: people visibility, stock, transfers, sales, expenses, reports and
attendance.

### Cashier (`cashier`)
Processes sales and customer records; views products, stock and basic reports.

### Inventory Officer (`inventory_officer`)
Products, stock receipt, adjustments, stocktaking, transfers and suppliers.

### Accountant (`accountant`)
Expenses, approvals, reconciliation, financial summaries, reports and audit.

### Sales Representative (`sales_representative`)
Sales, discounts, customers, wholesale collections and analytics.

Exact default grants live in `supabase/migrations/0001_schema.sql` and are copied at
provisioning time. They are a starting point, not a ceiling.

---

## 3. Permission catalogue

Format: `module.action`. 45 keys.

| Module | Permissions |
| --- | --- |
| Business | `business.view`, `business.settings` |
| Branches | `branch.view`, `branch.manage` |
| Employees | `employee.view`, `employee.manage` |
| Roles | `role.view`, `role.manage` |
| Devices | `device.view`, `device.manage` |
| Audit | `audit.view` |
| Products | `product.view`, `product.manage` |
| Inventory | `inventory.view`, `inventory.adjust`, `inventory.receive`, `inventory.stocktake` |
| Transfers | `transfer.view`, `transfer.request`, `transfer.approve`, `transfer.receive` |
| Sales | `sale.create`, `sale.view`, `sale.discount`, `sale.void`, `sale.refund` |
| Customers | `customer.view`, `customer.manage` |
| Suppliers | `supplier.view`, `supplier.manage` |
| Finance | `expense.view`, `expense.manage`, `expense.approve`, `finance.view`, `finance.reconcile` |
| Reports | `report.view`, `report.export` |
| Analytics | `analytics.view` |
| Wholesale | `wholesale.view`, `wholesale.manage` |
| Feedback | `feedback.submit`, `feedback.review` |
| Attendance | `attendance.clock`, `attendance.view`, `attendance.manage` |

The catalogue exists in **two places that must stay in sync**:

- SQL: `public.permissions` (seeded by `0001_schema.sql`)
- TypeScript: `src/lib/permissions.ts` (`PERMISSION_CATALOG`)

A unit test guards uniqueness and shape in TypeScript. Adding a permission requires a new
migration that inserts the key **and** an update to the TypeScript catalogue.

---

## 4. Enforcement layers

Permission checks happen at four independent layers. Any one of them can deny; none is
sufficient alone.

```
1. Navigation     hide modules the user cannot access (cosmetic, not security)
2. Route guard    requirePermission(key) redirects before data loads
3. Server Action  getActionSession(key) re-derives context from the database
4. Database RLS   has_permission(key) inside the policy
```

### 4.1 Route guard

```ts
export async function requirePermission(key: PermissionKey) {
  const session = await requireBusiness();
  if (!can(session.permissions, key)) redirect("/app?error=forbidden&permission=" + key);
  return session;
}
```

### 4.2 Server Action guard

```ts
const session = await getActionSession("employee.manage");
if (!session) return { error: "You are not authorised…" };
```

`getActionSession` returns `null` unless the employee is active, the business is active,
the password has been changed and the permission is present. It never redirects, so it is
safe to call from actions.

### 4.3 Database policy

```sql
create policy employees_update on public.employees
  for update to authenticated
  using (business_id = public.current_business_id()
         and public.has_permission('employee.manage'))
  with check (business_id = public.current_business_id()
              and public.has_permission('employee.manage'));
```

---

## 5. Protected invariants

| Rule | Enforcement |
| --- | --- |
| Business Administrator always has all permissions | `guard_role_permission_delete()` + UI lock |
| Business cannot lose its last administrator | `guard_employee_role_delete()` |
| System roles cannot be deleted | `guard_role_change()` + UI |
| System role keys cannot change | `guard_role_change()` |
| Employee cannot change own status | `guard_employee_update()` |
| Employee cannot move business/account | `guard_employee_update()` |
| Only platform admin changes status/licence | `guard_business_update()` |
| Only own user can clear forced password flag | `mark_password_changed()` uses `auth.uid()` |
| Audit rows cannot be altered | `insert/update/delete` revoked from clients |

---

## 6. Assigning and changing access

### Creating a custom role
1. `role.manage` required.
2. Name is validated; a unique key is derived (`store_supervisor`, `store_supervisor_2`…).
3. Selected permissions are inserted scoped to the business.
4. The role appears immediately for assignment.

### Assigning roles
1. `employee.manage` required.
2. Role IDs are validated against the business before any change.
3. Removals run first; if the removal would leave no active administrator, the database
   rejects it and the UI explains why.
4. Additions run second, with `assigned_by` recording the actor.
5. Effective permissions refresh on the employee's next request.

### Revoking access
- Remove the role, or
- Suspend/terminate the employee (also bans the Auth user and revokes devices).

---

## 7. Principle of least privilege guidance

- Grant `role.manage` and `employee.manage` only to administrators.
- Grant `audit.view` to accountants and administrators, not operational staff.
- Grant `sale.void` and `sale.refund` only to supervisors; they create reversals.
- `expense.approve` should sit with the accountant or owner, not the person recording
  expenses.
- `device.manage` is effectively the ability to authorise offline access; treat it as
  sensitive.
- Custom roles should start from zero permissions and add only what the job needs.

---

## 8. Testing requirements

- A cashier cannot read employees, roles, audit or settings.
- A branch manager cannot manage roles or change business settings.
- A custom role with only `sale.create` cannot open any management page.
- Removing a permission takes effect on the next request (no stale client cache).
- The last administrator cannot be unassigned.
- `business_admin` permissions cannot be removed via SQL or UI.
- A suspended employee loses all permissions immediately.
- Every denied attempt is either redirected (pages) or rejected (actions) without leaking
  data in the response.
