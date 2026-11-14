# BUSINESSHUB — Development Roadmap

Six phases. Each phase ends with explicit exit criteria; later phases build on, and do
not replace, earlier ones.

---

## Phase 1 — Foundation (delivered)

**Goal:** a secure, genuinely functional multi-tenant foundation with authentication,
business provisioning, employee management and permissions.

### Delivered
- Architecture, schema, isolation and offline planning pack (`docs/`).
- PostgreSQL schema (`0001`), authorization helpers (`0002`), RLS (`0003`),
  provisioning and audit (`0004`), platform RPCs (`0005`).
- Supabase Auth integration, session refresh via `proxy.ts`, forced password change,
  suspended/no-access states.
- Design system and responsive app shell with connection indicator.
- Platform administrator: business directory, provisioning with one-time credentials,
  status changes, licensing records, platform audit and sign-in activity.
- Business workspace: overview, employees (register/edit/suspend/terminate/restore/
  roles/reset password/history), roles (system + custom with permission matrix),
  branches, devices (register/revoke), audit trail, business settings.
- PWA manifest, service worker and offline fallback.
- Unit tests for permissions, passwords, slugs, formatting and context parsing.
- Demo seed script.

### Exit criteria
- [x] Schema applies cleanly to a fresh Supabase project.
- [x] A platform admin can provision a business and sign in as its administrator.
- [x] Every tenant route is permission-guarded on the server.
- [x] RLS prevents cross-tenant reads (verified by policy review; integration tests in
      Phase 2).
- [x] Audit entries are written for employee, role, branch and device changes.
- [x] `npm run lint`, `npm run test` and `npm run build` pass.

---

## Phase 2 — Products, Inventory, POS, Customers, Receipts

**Goal:** replace paper with a real point of sale and a ledger-based inventory.

### Deliverables
- Products and categories: SKU, barcode, purchase/selling price, min stock, supplier,
  expiry, description, images (Supabase Storage).
- Suppliers.
- Inventory ledger (`inventory_movements`) and projected `stock_levels`.
- Stock receipt, adjustments, damage, returns, stocktaking worksheets.
- Customers with purchase history and outstanding balances.
- POS: product search, barcode, cart, discounts, multiple payment methods in one sale,
  receipt generation, print/PDF.
- Sales history with search by receipt, customer, phone, product, employee, branch, date.
- Receipts: unique number, business/branch branding, cashier, payment breakdown.
- Permission-gated reversals (`sale.void`, `sale.refund`) with mandatory reasons.
- Audit and immutable transaction records.

### Exit criteria
- A sale of multiple products with split payments posts correct movements and a receipt.
- Stock cannot be sold below zero without an explicit override permission.
- Reversals create compensating records; completed sales cannot be edited or deleted.
- Daily totals reconcile with the ledger.

---

## Phase 3 — Offline-first and Synchronisation

**Goal:** the POS works with the network down, and reconciles safely.

### Deliverables
- IndexedDB schema and encrypted local storage.
- Offline credential provisioning per authorised device.
- Offline sign-in with expiry enforcement.
- Offline product/customer cache and offline sales, receipts, payments and movements.
- Local receipt printing.
- Background sync with foreground fallback.
- Idempotency keys, server unique index, duplicate-safe handler.
- Conflict detection for negative stock and contradictory movements.
- Administrator conflict review and resolution workflow.
- Device revocation wipe; permission revocation at next sync.
- Sync log and per-record statuses in the UI.

### Exit criteria
- All ten acceptance criteria in [`OFFLINE-SYNC.md`](OFFLINE-SYNC.md#10-phase-3-acceptance-criteria).
- Duplicate submission creates exactly one sale.
- A revoked device cannot sync and clears local data.

---

## Phase 4 — Multi-branch, Transfers, Wholesale

**Goal:** coordinate stock and goods across locations and external wholesalers.

### Deliverables
- Central multi-branch stock view and per-branch views.
- Transfer workflow: request → approve/reject → dispatch → in transit → receive.
- Partial deliveries and discrepancy handling.
- Printable stocktaking sheets and reconciliation.
- Wholesale collections and returns: company, contact, product, quantity, prices,
  collection/return dates, responsible employee, reference numbers, balances.
- Daily wholesale reports and administrator notifications.

### Exit criteria
- A transfer cannot skip approval or receipt states.
- Discrepancies are recorded, not overwritten.
- Outstanding goods and balances compute correctly from events.

---

## Phase 5 — Finance, Analytics, Feedback, Attendance, Daily Reports

**Goal:** give owners a reliable operational and financial picture.

### Deliverables
- Expenses with categories and threshold-based approval.
- Purchases, supplier payments, customer credit, outstanding balances.
- Cash reconciliation and daily financial summaries.
- Revenue vs COGS vs gross profit vs estimated net profit, clearly separated.
- Analytics: daily/weekly/monthly sales, by branch and employee, best/slow products,
  declining products, revenue by payment method, branch performance.
- Data-driven recommendations (e.g. transfer stock to the faster-selling branch).
- Employee suggestion/complaint box with confidential submissions and responses.
- Attendance clock-in/out, late records, offline attendance marked on sync.
- Automated daily branch reports (PDF, email) with provisional offline variants.

### Exit criteria
- Financial summaries reconcile with sales, expenses and ledger movements.
- Reports match underlying records for a controlled test period.
- Attendance and feedback enforce visibility rules.

---

## Phase 6 — Notifications, Security, Performance, Recovery, Deployment

**Goal:** production hardening and launch.

### Deliverables
- In-app and email notifications (low stock, transfer events, approvals, report delivery).
- Security testing: RLS integration suite, authorization matrix, dependency scanning,
  penetration test, rate limiting, CSP.
- Performance: query plans and indexes, pagination everywhere, Lighthouse ≥ 90 on key
  routes, bundle review.
- Backup and recovery: automated backups, PITR, documented restore drill.
- Deployment pipeline: CI migrations, staging, production, rollback procedure.
- Operational runbooks and support tooling.

### Exit criteria
- All 12 test requirements from the project brief pass automatically or are evidenced.
- Restore from backup verified on a staging project.
- No high-severity findings open.

---

## Continuous workstreams

| Workstream | Cadence |
| --- | --- |
| Migration review (tenant coverage + RLS) | every change |
| Audit coverage for new tables | every change |
| Accessibility checks | every UI change |
| Dependency and secret scanning | weekly |
| Backup restore drill | monthly |
| Permission matrix review with the business owner | quarterly |

---

## Explicitly out of scope

- Subscription registration, packages, renewals, automated billing or plan-based feature
  gating.
- Payment processing for the software itself (business-level Paystack/Flutterwave
  integration may be added later for *their* customers, not for licensing).
- A separate application per client.
