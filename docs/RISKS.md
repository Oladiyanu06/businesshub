# BUSINESSHUB — Technical Risks and Mitigations

Risks are grouped by area. Each entry states the risk, its impact, the mitigation
already designed or implemented, and any residual risk.

---

## 1. Security and tenancy

| # | Risk | Impact | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| S1 | A missing `business_id` filter or RLS policy leaks another tenant's data | Critical | RLS on every table, composite FKs, explicit filters in queries, migration review checklist | Requires discipline for every new table; add automated isolation tests |
| S2 | Service role key exposed to the browser | Critical | Imported only in `server-only` modules; never in client components; `.env.local` gitignored | A build misconfiguration could still inline it — add a CI check that scans client bundles |
| S3 | `SECURITY DEFINER` function with attacker-controlled `search_path` | High | Every definer function sets `search_path = ''` and uses schema-qualified names | Review each new function |
| S4 | Privilege escalation via role editing | High | `role.manage` is sensitive; `business_admin` locked; last-admin guard; all changes audited | A rogue administrator can still grant permissions — that is inherent to the role |
| S5 | Stale permissions after revocation | Medium | Context re-read on every request/action; no client-side permission cache | Offline devices keep last-known permissions until expiry (see O3) |
| S6 | Session fixation / cookie theft | High | Supabase SSR cookies, `getUser()` validation, HTTPS, security headers | Add CSP and consider short session lifetimes |
| S7 | Brute-force login | Medium | Supabase Auth rate limits; generic error messages; login events recorded | Add edge rate limiting before launch |
| S8 | Audit log tampering | High | `insert/update/delete` revoked from clients; append-only | A database superuser can still alter rows — restrict access and use PITR |
| S9 | Platform overreach into tenant data | High | No RLS grants; narrow directory/detail RPCs; platform audit excludes tenant payloads | Exceptional access process must be defined contractually |
| S10 | Cross-tenant foreign keys | High | Composite `(business_id, id)` FKs | New tables must follow the pattern |

---

## 2. Offline and synchronisation

| # | Risk | Impact | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| O1 | Duplicate transactions after retry | High | Deterministic idempotency key + unique index + idempotent handler | Requires careful server transaction boundaries |
| O2 | Silent inventory overwrite across branches | High | Append-only movement ledger; conflicts flagged for review; no destructive updates | Administrators must actually review conflicts |
| O3 | Revoked employee keeps working offline until expiry | High | Expiry window; device revocation on reconnect; local wipe | Unavoidable during the offline window — disclose and keep windows short |
| O4 | Lost/stolen device with cached data | High | Device revocation; encrypted local storage; key deletion on revocation | Data at rest on a lost device is only as strong as the device OS |
| O5 | IndexedDB quota exhaustion | Medium | Bounded caches, prune synced records, monitor usage | Large catalogues may need partial sync |
| O6 | Clock skew corrupts ordering | Medium | Server timestamp is canonical; client time stored for reference; monotonic local sequence | Conflicts may need manual review |
| O7 | Background Sync unsupported (Safari/iOS) | Medium | Foreground retry loop and manual "sync now" | Sync may be delayed until the app is opened |
| O8 | Partial batch failure | Medium | Per-record status; batch is idempotent and resumable | UI must communicate partial states clearly |
| O9 | Service worker serving stale app shell | Medium | Versioned caches; `skipWaiting`; never cache authenticated HTML | Users may need a reload after deploy |

---

## 3. Data integrity and finance

| # | Risk | Impact | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| D1 | Editing completed transactions | High | Reversals/adjustments only; audit trail; permission-gated | Must be enforced in every future module |
| D2 | Rounding and multi-currency errors | Medium | Integer minor units or `numeric`, explicit rounding rules, per-business currency | Requires test coverage per operation |
| D3 | Orphaned Auth user after failed provisioning | Medium | Compensating delete on failure | Auth delete can itself fail — log and retry |
| D4 | Deleting a business removes history | High | Archive instead of delete; no delete policy exposed | Manual DB action is still possible |
| D5 | Stocktake adjustments hide shrinkage | High | Stocktake creates explicit movements with reasons and actor | Requires operational discipline |
| D6 | Concurrent writes on the same row | Medium | Transactions, row locks, ledger instead of counters | Hot rows may need retry logic |

---

## 4. Architecture and operations

| # | Risk | Impact | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| A1 | Migrations applied out of order or edited after apply | High | Numbered files, CI application, never edit applied migrations | Manual SQL editor use can drift — prefer CLI in production |
| A2 | Supabase vendor lock-in | Medium | Standard Postgres; RLS and SQL are portable; storage/email adapters isolated | Auth and Storage APIs are vendor-specific |
| A3 | Serverless cold starts / timeouts | Low | Keep actions short; move heavy work to jobs in later phases | Long PDF/report generation needs a worker |
| A4 | Email deliverability | Medium | Use a reputable transactional provider; verify domains; track delivery webhooks | Never claim delivery before confirmation |
| A5 | Backup gaps | High | Supabase daily backups + PITR in production; documented restore drill | Must be tested, not assumed |
| A6 | Cost growth from audit/login tables | Low | Indexes on `(business_id, created_at)`; retention/archival policy later | Plan archival before large scale |
| A7 | No Git repository yet | Medium | Initialise Git before further work; commit migrations with code | Environment currently lacks Git — install it |

---

## 5. Product and delivery

| # | Risk | Impact | Mitigation | Residual |
| --- | --- | --- | --- | --- |
| P1 | Building too many modules at once | High | Strict phase gates; Phase 1 foundation first | Stakeholder pressure to skip gates |
| P2 | Mock data leaking into production | High | No mock screens; demo seed is a separate script and development-only | Review before launch |
| P3 | Ambiguous licensing treated as feature gating | Medium | Licensing fields are informational only; no access checks depend on them | Sales team must not promise in-app renewal |
| P4 | Poor offline UX erodes trust | Medium | Explicit statuses, connection indicator, retry controls | Requires user training |
| P5 | Accessibility gaps | Medium | Semantic HTML, labelled fields, focus states, aria-live on connection state | Needs an audit with assistive tech |
| P6 | Insufficient test coverage for RLS | High | Add an integration suite using real user sessions | Not yet implemented — highest testing priority |

---

## 6. Open decisions

1. **Email provider** — Resend, Postmark or SES; needed for receipts, reports and
   notifications.
2. **PDF generation** — server-side (Playwright/Puppeteer) vs client-side for offline
   receipts. Likely both: local for offline, server for consolidated reports.
3. **Payment gateways** — Paystack and Flutterwave are business-level integrations, not
   licensing. Design the `payments` table with a provider-agnostic shape.
4. **File storage policy** — logos and attachments need signed URLs and per-tenant paths.
5. **Offline credential scheme** — exact KDF and rotation policy need a security review.
6. **Data retention** — how long to keep audit and login events; archival strategy.
7. **Exceptional platform access** — the legal/operational process for any tenant data
   access must be documented before it is ever used.

---

## 7. Top priorities before Phase 2

1. Initialise version control and commit the Phase 1 baseline.
2. Apply migrations to a real Supabase project and verify the owner bootstrap.
3. Write the RLS integration suite (tenant isolation, platform boundary, suspension).
4. Add edge rate limiting on `/login` and Server Actions.
5. Add a CSP and confirm the service worker headers in production.
