# BUSINESSHUB — Offline Architecture and Synchronisation Strategy

> **Status:** Phase 1 delivers the foundation (PWA shell, service worker, device
> registry, offline session policy, permission model). The full offline POS, local
> ledger and sync engine are Phase 3. This document is the design that Phase 3 must
> implement, and explains what already exists.

---

## 1. Design principles

1. **Offline is a first-class mode, not an error state.** Authorised devices must be able
   to complete ordinary work without a connection.
2. **Local writes are durable and attributable.** Every offline record carries business,
   branch, employee, device, timestamp and a locally generated identifier.
3. **The server remains authoritative.** Offline actions are *claims* until synchronised
   and validated.
4. **Inventory is a ledger, never an editable counter.** Sales, receipts, returns and
   transfers append movements; current stock is a projection.
5. **Conflicts surface, they do not silently overwrite.** Negative stock or contradictory
   movements are flagged for administrator review.
6. **Security does not degrade offline.** Only provisioned devices, provisioned
   credentials and unexpired sessions may work offline.
7. **Nothing sensitive is cached for the wrong user.** Local data is partitioned by
   business + employee + device and cleared on revocation.

---

## 2. Offline capability matrix

| Capability | Phase 1 (now) | Phase 3 (target) |
| --- | --- | --- |
| App shell available without network | ✅ offline fallback + static caching | ✅ full route shell precache |
| Device registry and revocation | ✅ | ✅ |
| Offline session policy stored | ✅ (`offline_session_hours`) | ✅ enforced locally |
| Passwords derived for offline login | ❌ | ✅ encrypted verifier |
| Products cached locally | ❌ | ✅ IndexedDB |
| Offline sales and receipts | ❌ | ✅ queued with statuses |
| Offline customer creation | ❌ | ✅ queued |
| Offline stock movements | ❌ | ✅ queued ledger entries |
| Background sync | ❌ | ✅ Background Sync + foreground fallback |
| Duplicate prevention | ❌ | ✅ idempotency keys + server unique index |
| Conflict review queue | ❌ | ✅ admin UI |
| Local receipt printing | ❌ | ✅ print stylesheet + PDF |

The current service worker **never caches authenticated HTML or tenant API responses**.
Phase 3 replaces that with explicit, scoped IndexedDB storage.

---

## 3. Local storage design (Phase 3)

### 3.1 Technology

- **IndexedDB** for structured records (products, customers, queued transactions).
- **Cache Storage** for the app shell and static assets only.
- **Web Crypto API** for encryption of sensitive local records where supported.
- **Background Sync** where available; foreground retry loop as the universal fallback.

### 3.2 Database layout

One IndexedDB database per device, with object stores partitioned by tenant key:

```
businesshub-offline (db)
├── meta              { key, value }            // device id, business id, employee id,
│                                               // schema version, last sync cursor
├── products          keyPath id, index businessId
├── customers         keyPath id, index businessId
├── sales_queue       keyPath localId, index syncStatus, index businessId
├── sale_items        keyPath [localSaleId, lineNo]
├── inventory_queue   keyPath localId, index syncStatus
├── stock_snapshot    keyPath [branchId, productId]
├── receipts          keyPath localId
└── sync_log          keyPath id, index createdAt
```

Every record includes:

```
businessId, branchId, employeeId, deviceId,
createdAtLocal, updatedAtLocal, schemaVersion
```

### 3.3 Encryption

- A device key is generated with Web Crypto (`AES-GCM`) and stored in IndexedDB wrapped
  by a key derived from the offline credential verifier (PBKDF2/Argon2-equivalent).
- Sensitive fields (customer phone, balances, receipt contents) are encrypted at rest
  where the platform supports it.
- On revocation, the wrapped key is deleted and the database is cleared on next launch.
- No plaintext passwords or refresh tokens are ever stored.

---

## 4. Offline authentication

### 4.1 Provisioning (online, once per device)

1. Employee signs in online and registers the device (`devices` row, status `active`).
2. Server issues a device-scoped offline credential:
   - a random secret (shown to the device only),
   - stored server-side as a hash bound to `(business_id, employee_id, device_id)`,
   - with an expiry derived from `offline_session_hours`.
3. The device stores an encrypted verifier locally.

### 4.2 Offline sign-in

1. The app asks for the employee's email/password (or PIN) as usual.
2. It derives the verifier and compares it to the locally stored value.
3. It checks:
   - device status was `active` at last sync,
   - last successful contact + `offline_session_hours` has not elapsed,
   - the employee was `active` at last sync,
   - the last known permission set includes the module being used.
4. On success it opens a local session with an explicit `offline` flag.

### 4.3 Limits

- Permissions revoked online take effect **on the next connection**. Until then the
  device continues with the last known permission set, bounded by the expiry window.
  This is the unavoidable trade-off of offline operation and is disclosed in the UI.
- An expired offline session requires a network connection to renew.
- A revoked device may not renew and must wipe local data.

---

## 5. Offline transaction flow

### 5.1 Recording a sale

```
1. Cashier builds a sale from cached products.
2. Client generates:
     localId            = crypto.randomUUID()
     clientTransactionId = `${deviceId}:${localId}`
     idempotencyKey      = SHA-256(clientTransactionId + businessId)
3. Sale + items + payments + receipt are written to IndexedDB in ONE transaction.
4. Stock snapshot is decremented locally (optimistic projection only).
5. Receipt is rendered from local data and can be printed immediately.
6. Record status = "pending".
7. A sync attempt is scheduled (Background Sync if available).
```

### 5.2 Statuses shown to the user

| Status | Meaning |
| --- | --- |
| **Synchronised** | Server accepted and returned a canonical record. |
| **Pending Synchronisation** | Stored locally, not yet sent. |
| **Synchronisation Failed** | Server rejected or network failed repeatedly; retry available. |
| **Requires Review** | Server accepted the record but flagged a conflict (e.g. negative stock). |

### 5.3 Synchronisation

```
1. Detect connectivity (online event + periodic health check).
2. Read pending records in created order, batched (e.g. 25).
3. POST to /api/sync with:
     - device credential,
     - employee context,
     - idempotency keys,
     - payloads.
4. Server:
     a. authenticates the device and employee,
     b. verifies the device is active and not expired,
     c. verifies permissions for each operation,
     d. rejects duplicate idempotency keys (returns the original result),
     e. validates business/branch/employee ownership,
     f. appends inventory movements and sale records in one transaction,
     g. returns canonical IDs plus any conflicts.
5. Client marks each record synchronised / failed / requires-review.
6. Client stores a sync log entry and updates the last-sync cursor.
```

### 5.4 Duplicate prevention

Three independent layers:

1. **Client idempotency key** derived deterministically from
   `(business_id, device_id, local_id)`.
2. **Server unique index** on `(business_id, idempotency_key)` in the sync table.
3. **Idempotent handler** — a repeated key returns the original canonical record with
   `200 OK`, never a second sale.

### 5.5 Conflict handling (inventory)

Inventory is an append-only ledger:

```
inventory_movements(
  id, business_id, branch_id, product_id,
  movement_type,          -- sale | return | receipt | transfer_out | transfer_in |
                          -- adjustment | damage | stocktake
  quantity,               -- signed
  reference_type, reference_id,
  employee_id, device_id,
  occurred_at, synced_at,
  idempotency_key unique per business
)
stock_levels is a materialised projection updated by trigger or job.
```

When a sync would drive projected stock negative:

- The movement is **still recorded** (history is never rewritten).
- The branch/product is flagged `requires_review` with a conflict row.
- Administrators see the conflict, the movements involved and both branches' counts.
- Resolution options: accept (with reason), request stocktake, or reverse via an
  authorised adjustment. Every resolution is audited.

Two branches selling the same stock offline therefore produce **two movements and a
visible conflict**, not a silent overwrite.

### 5.6 Transfers offline

- A branch may *request* a transfer offline (saved locally, marked pending).
- Approval, dispatch and receipt require the relevant authorised workflow; an offline
  device cannot mark goods as approved or dispatched while disconnected.
- Sync replays the request; server-side state machine decides validity.

---

## 6. Receipts and email

- Receipts are generated from the local record; printing uses a print stylesheet and
  works offline.
- PDF generation can be local (client-side) for offline use.
- Email delivery is **queued** and only marked delivered when the provider confirms
  (webhook or API response). The UI must never show "sent" for a queued message.

---

## 7. Sync security

| Requirement | Implementation |
| --- | --- |
| Only authorised devices sync | Device credential + `devices.status = 'active'` |
| Reject expired devices | Compare `last_seen_at` + `offline_expiry_hours` |
| Verify permissions server-side | Re-resolve context per batch; never trust a local permission claim |
| Prevent replay | Idempotency keys + timestamps + nonce |
| Prevent cross-tenant writes | Every payload carries `business_id`; server validates against the device's business |
| Bound payloads | Max batch size, max line items, strict Zod schemas |
| Rate limit | Per-device and per-business limits at the edge |
| Audit | Log each sync batch, conflicts and resolutions |

---

## 8. Revocation and expiry

1. Administrator revokes a device.
2. On reconnect, the sync endpoint rejects the device and returns `device_revoked`.
3. The client clears IndexedDB, deletes the wrapped key and returns to the login screen.
4. Employee suspension/termination automatically revokes all devices (trigger).
5. Offline session expiry is enforced locally before any offline operation; an expired
   session can only be renewed online.

---

## 9. What Phase 1 already provides

| Foundation | Location |
| --- | --- |
| PWA manifest and icons | `src/app/manifest.ts`, `public/icons/*` |
| Service worker with offline fallback | `public/sw.js`, `src/app/offline/page.tsx` |
| Device registry, fingerprint, revocation | `devices` table, `/app/devices` |
| Offline session window per business | `businesses.offline_session_hours` |
| Per-device expiry window | `devices.offline_expiry_hours` |
| Employee suspension → device revocation | `revoke_employee_devices()` trigger |
| Connection indicator (online/offline/syncing/error) | `src/components/connection-indicator.tsx` |
| Permission model that sync will re-verify | `permissions`, `has_permission()` |

---

## 10. Phase 3 acceptance criteria

1. An authorised device can sign in, view cached products and complete a sale with the
   network disabled.
2. The receipt prints offline and is retrievable after restart.
3. Reconnecting synchronises queued sales exactly once.
4. Submitting the same batch twice creates no duplicates.
5. Two branches selling the same stock offline produce two movements and a reviewable
   conflict, not a negative silent overwrite.
6. A revoked device cannot sync and wipes its cache.
7. An expired offline session requires reconnection.
8. Permissions revoked online take effect at the next sync.
9. Sync failures are visible, retryable and logged locally.
10. The sync endpoint rejects cross-tenant payloads.
