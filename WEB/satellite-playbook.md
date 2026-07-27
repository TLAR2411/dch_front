# Dewey Spine Satellite Playbook

**Drop this file into the root of any satellite repository** (suggested name: `SATELLITE_PLAYBOOK.md`) and add one line to the satellite's `AGENTS.md` / `CLAUDE.md`:

> Before implementing or reviewing any spine integration code, read `SATELLITE_PLAYBOOK.md` in the repo root and follow it exactly.

**Provenance:** generated from the spine repo (`dewey-edu-core`) at commit `e7120ee`, 2026-07-09, and verified against the implementation (not just the docs). The v1 contract is **additive-only**, so this file stays valid as the spine evolves; new fields/endpoints/events may appear that this file doesn't list. The live sources of truth are the spine repo's `openapi.yaml` and `docs/api-changelog.md` — check them when in doubt or when this file is more than a few months old.

---

## 0. How to use this file

Works for **humans and AI agents**, for **existing and future satellites**, in **any language/stack** (the grep patterns are content-based, not language-based; use `rg` or your agent's search tool).

Two modes:

- **IMPLEMENT mode** — you are building or changing spine integration code. Treat §1 as the requirements document. Every MUST/MUST NOT is binding. When done, run AUDIT mode on your own changes.
- **AUDIT mode** — you are verifying an existing codebase. Run §2 (static, fully runnable inside this repo with no external access), then §3 (dynamic, needs staging credentials), and report findings against the gate in §5.

**AI agents:** the spine repo ships an MCP server (`mcp/dewey_spine_mcp.py`) exposing this whole contract as typed tools against a sandbox spine — use it for dev-time exploration and testing. It is a dev tool only: satellite **production code speaks HTTP to `/api/v1` directly**, never through MCP.

Role boundaries:

- **Satellite backend** — owns everything in §1.1–§1.12 and §1.15.
- **Satellite frontend** — owns §1.13–§1.14. The frontend never talks to the spine's `/api/v1` and never holds a spine secret. Its only spine touchpoint is the OAuth2/PKCE redirect flow.
- **Spine operator** — steps marked **[SPINE OPERATOR]** require Frappe Desk / bench access on the spine and cannot be performed from the satellite side. In AUDIT mode, list them as "requires operator" rather than skipping silently.

---

## 1. The contract (MUST / MUST NOT)

### 1.1 Transport and server auth

- All server-to-spine calls go to `{SPINE_URL}/api/method/dewey_edu_core.api.v1.<module>.<function>` — nothing else. No `/api/resource/*`, no `frappe.client`, no `/api/method/frappe.*` (except the three OAuth endpoints in §1.13), no `/api/v2`, no direct DB connection to the spine. The satellite's `Edu Satellite` role has zero doctype permissions, so `/api/resource` returns 403 by design.
- Auth header: `Authorization: token <api_key>:<api_secret>` — the issued satellite key pair, from env/secret store, server-side only. Never personal credentials, never session cookies, never from browser code.
- Keep the `api.v1` prefix in one config constant, not scattered string literals.
- Sandbox and Production are **separate registrations with separate key pairs**. Production keys are only issued after the conformance suite passes on staging (§3). What `environment` means for the data those registrations create and read is §1.16.

### 1.2 Endpoint surface

Reads (GET-style, all under `dewey_edu_core.api.v1.`):

- `ping.ping` (no scope — see §1.4 note on rate limiting)
- `discovery.capabilities` (no scope; any active satellite token). Live, self-describing index of every **scoped** `/api/v1` endpoint — path, required scope, allowed HTTP verbs, and `granted` (whether **your** app holds that scope). Derived by introspection from the code, so it never drifts from the running spine. Use it at boot to fail fast on a missing grant, and as the authoritative scoped-endpoint list when this file is stale. The two unscoped meta-endpoints (`ping.ping`, `discovery.capabilities`) are not self-listed. Like `ping`, it **bypasses the rate limiter** (not a scoped endpoint) — don't use it to reason about rate limiting. Envelope: `message.data.endpoints[]` plus `contract`, `app_version`, `app`, `environment`.
- **Browsable reference:** `{SPINE_URL}/edu-api-docs` — a human web page (no token, no login) listing every endpoint with its scope, verbs, live-introspected request parameters (required/optional/default), and response codes. Always current (server-side introspection). Bookmark it; it's the drop-in "what can I call?" reference for the whole team.
- `catalog.list_brands`, `catalog.list_campuses`, `catalog.list_offering_types`, `catalog.list_offerings`, `catalog.list_periods` (scope `read:catalog`)
- `registry_read.list_students`, `registry_read.get_student` (scope `read:students`); `registry_read.list_guardians`, `registry_read.get_guardian` (scope `read:guardians`); `registry_read.list_families`, `registry_read.get_family` (scope `read:families`); `registry_read.list_enrollments`, `registry_read.get_enrollment` (scope `read:enrollments`)
- `money_read.list_invoices`, `money_read.get_invoice`, `money_read.get_family_statement` (scope `read:invoices`)
- `events.list_events` (scope `read:events`)

Writes (POST, exactly thirteen):

- `catalog_write.create_offering`, `catalog_write.update_offering`,
  `catalog_write.create_period`, `catalog_write.update_period` (scope
  `write:catalog`) — fenced by your app's **Catalog Grants**; ask the hub for
  a grant row per (brand, offering type) you need. `default_fee_plan` is
  hub-only: your offering is enrollable but unpriced until the hub attaches
  a plan, and enrollments taken meanwhile are backfilled at that moment.
- `registry_write.create_student`, `registry_write.update_student` (scope `write:students`); `registry_write.create_guardian` (scope `write:guardians`); `registry_write.create_family`, `registry_write.add_family_member` (scope `write:families`); `registry_write.create_enrollment`, `registry_write.transition_enrollment` (scope `write:enrollments`)
- `charges.create_charge` (scope `write:charges`)
- `POST update_guardian(guardian_id, **fields)` — scope `write:guardians`.
  Patchable: `guardian_name, first_name, middle_name, last_name,
  khmer_first_name, khmer_last_name, name_order, phone, email`.
  **Governance:** if your app solely owns the guardian → `200` (applied,
  audited). If the guardian is shared with another app → `202`
  `{status:"change_requested", change_request_id}`; nothing is overwritten
  until a hub admin approves the Edu Change Request. Same gate now applies to
  `update_student` (a shared student returns `202`).

Scopes are exact set membership — no hierarchy or aliasing. The full valid vocabulary (anything else is not a scope): `read:catalog`, `write:catalog`, `read:students`, `write:students`, `read:guardians`, `write:guardians`, `read:families`, `write:families`, `read:enrollments`, `write:enrollments`, `read:invoices`, `write:charges`, `read:events`. Request only the scopes your call set needs (least privilege — grants are diffed against usage in audits).

Anything else the satellite "writes" must be local-only data (§1.10).

### 1.3 Response envelope and error codes

Because these are Frappe `/api/method` endpoints, the payload arrives under the top-level `message` key: success is `message.data` (+ optional `message.next_cursor` on lists); errors are `message.error`.

- Error shape: `{"error": {"code": "...", "message": "..."}}` with a `details` key **only when the spine has details to give** (e.g. 422 validation). A plain 404 body is `{"error": {"code": "not_found", "message": "Resource not found."}}` — **no `details` key**. Never assert `details` presence.
- Branch on `error.code`, never on message text or HTTP status alone. Codes you must handle:
  - `unauthorized` (401) — credentials revoked/inactive → alert and stop, never retry-loop.
  - `missing_scope` (403) — configuration error → alert, do not retry.
  - `rate_limited` (429) — back off (per-app, per-minute bucket; §1.4).
  - `not_found` (404) — missing **or belongs to a brand you can't see** (no existence leaks: foreign-brand is 404, never 403). Terminal: mark local record orphaned; no retry.
  - `duplicate_candidates` (409) — duplicate-person protocol (§1.8).
  - `invalid_fields` (422) — `update_student` with fields outside the patch whitelist (§1.7).
  - `invalid_transition` (422) — illegal enrollment transition; show the spine's error, don't flip local state.
  - `immediate_not_allowed` (422) — `create_charge` with `immediate=true` for a brand that disallows immediate mini-invoices.
- **Additive-only tolerance:** parsers MUST ignore unknown fields in responses, webhook payloads, and event envelopes. Strict/closed schema validation (`additionalProperties: false`, `extra='forbid'`, `DisallowUnknownFields`, etc.) of spine data is a conformance violation.

### 1.4 Status codes, retries, rate limits

- **Creates return HTTP 201** (documented in `openapi.yaml`; the implementation sets `http_status_code = 201` on every create endpoint, and the conformance suite accepts either code). The client rule: treat **200 OR 201** as create success — proxies or pre-2026-07 copies of the spec may say 200. A strict `== 200` check is the bug to look for.
- Retryable set: **5xx and network errors only** — and only with an idempotency strategy on writes (§1.5). 400/401/403/404/409/422 are never retried.
- Rate limit: per-app per-minute bucket (spine default 300/min; operator-configurable). On 429, exponential backoff; bulk sync jobs must be throttled below the limit. Note: the two unscoped meta-endpoints `ping.ping` and `discovery.capabilities` **bypass** the rate limiter (neither is a scoped endpoint) — never use them to test or reason about rate limiting.

### 1.5 Idempotency — read this carefully

The spine honors an `Idempotency-Key` header on **exactly four endpoints**: `registry_write.create_student`, `registry_write.create_enrollment`, `catalog_write.create_offering` and `catalog_write.create_period`. Replays within 48h return the same resource; only terminal success (<400) is cached, so a 409/422 response followed by a corrected retry with the same key re-executes.

Note the replay is keyed on `(app, endpoint, key)` and does **not** fingerprint the payload: reusing a key with different arguments returns the cached response for the ORIGINAL call, and writes nothing. Use a fresh key per logical operation.

**Every other write — including `charges.create_charge` — has NO spine-side replay protection.** The satellite MUST provide its own retry safety (transactional outbox with a dedupe key, or equivalent) for `create_charge` (double-billing risk), `create_guardian`, `create_family`, `add_family_member`, `update_student`, `update_guardian`, `update_offering`, `update_period`, and `transition_enrollment`.

Where `Idempotency-Key` is used: generate it once per logical operation (persist it on the outbox row) and reuse it verbatim across retries. A fresh `uuid4()` inside the retry loop defeats the mechanism entirely.

### 1.6 Pagination

- Cursors are **opaque**. Never construct, decode, or persist their internals (any `b64decode` near cursor code is a violation).
- Page size: default 100, hard max 200.
- Loop shape: `while next_cursor:` threading the exact returned value; terminate when `next_cursor` is absent/null. `next_cursor` is only emitted on a full page, so the final full page may be followed by one empty fetch — that's normal.
- An invalid cursor raises a validation error, not an empty page. Surface it; never swallow it or treat it as end-of-feed.
- Persist the cursor between runs for feed consumers.

### 1.7 Incremental sync and write constraints

- `catalog.list_campuses`, `catalog.list_offerings`, `registry_read.list_students` accept `updated_since` + `limit`. Local caches sync incrementally against a **durable watermark** (persisted after each successful run) — no scheduled "fetch everything" jobs against large collections.
- Campus `address` is a flat multi-line display string — never parse structure out of it. On the hub it is backed by a linked core Address document; edits to that Address bump the campus `modified`, so watermark sync picks up address changes like any other campus edit.
- Only documented filters: `list_offerings` (brand, status); `list_students` (q, guardian_phone, dob, family); `list_campuses` (brand); `list_invoices` status filter takes the ERPNext literals **exactly**: `Draft`, `Unpaid`, `Paid`, `Overdue`, `Return` (lowercase variants silently match nothing).
- `update_student` accepts ONLY: `first_name`, `middle_name`, `last_name`, `preferred_name`, `khmer_first_name`, `khmer_last_name`, `name_order`, `email`, `phone`, `status`. Anything else → 422 `invalid_fields`. Don't build a generic "patch whatever changed" sync against it.
- `create_charge` has an `immediate` flag (mini-invoice now vs. next fee run). Sending `immediate=true` to a brand that disallows it → 422 `immediate_not_allowed`; handle as a configuration/product decision, not a retryable error.

**Shared-record edits.** Edits to hub-global persons (students, guardians) that more than one app touches become change requests, not silent overwrites: the requesting app receives the `change_request_id` and learns the outcome via the `<resource>.updated` event when applied. A **rejected** change request emits no event — only applied changes emit `<resource>.updated` — so a satellite must treat prolonged silence after a `change_request_id` as not-yet-applied (or rejected), never as success.

### 1.8 Duplicate-person protocol

`create_student` (and `create_guardian`) against a probable duplicate returns 409 `duplicate_candidates` with the candidates in the error payload. Required behavior:

1. Surface the candidates for **human** review.
2. Only after a human confirms "genuinely new", resubmit the **identical body** plus `confirmed: true`.

**Duplicate detection** is name-order-insensitive and matches across Khmer and Latin name records. `create_student` accepts optional `khmer_first_name`, `khmer_last_name`, and `name_order` parameters to support structured Khmer names.

`duplicate_candidates` error response: `details[]` items include additive keys `full_name` (Latin name rendering) and `khmer_full_name` (Khmer name rendering if available); existing keys `student_id` and `match_reasons[]` are unchanged.

MUST NOT: auto-set `confirmed=true` by default, blind-retry a 409, or create a local-only person to dodge the protocol.

### 1.9 Identity — spine IDs are the only person identity

The spine is the system of record for Student / Guardian / Family / Enrollment identity.

- Every locally stored spine-known person row MUST carry the spine ID (e.g. `STU-2026-00001` pattern) and all cross-system references use it. Local surrogate PKs are fine as long as the spine ID column exists, is populated, and is the join key.
- Every person-creation code path MUST call `create_student` / `create_guardian` / `create_family` (+ `add_family_member`) and persist the returned spine ID before — or atomically with — the local row.
- **Never mint local identities for spine-known people.** Offline/degraded flows queue the creation; they do not create an unsynced person. Zero person rows with NULL spine ID is the audit criterion.

### 1.10 System-of-record boundaries

| Data | Owner | Satellite may |
|---|---|---|
| Student/guardian/family/enrollment identity & status | Spine | Read, cache keyed by spine ID, request writes via §1.2 |
| Enrollment state | Spine | Display; request changes via `transition_enrollment` (expect 422 on illegal transitions); local state converges from events/re-reads — never authoritative local flips |
| Invoices, payments, credit notes, GL | Spine (ERPNext) | Display via `money_read.*` only; the ONLY money write is `create_charge` |
| Grades, assessments, transcripts, curriculum | Satellite | Keep local; do NOT push spine-side (summaries are a deferred future phase) |
| Daily ops (naps, meals, lessons, timetables, incidents, medical/allergy detail) | Satellite | Keep local, linked by spine student ID; **medical/allergy detail must never be sent to the spine** |
| Staff/HR/payroll | Spine (ERPNext) | Scoped reads only; no authoritative staff records or payroll logic satellite-side |

### 1.11 Webhooks — receiving spine events

Every spine webhook is a POST, `Content-Type: application/json`, carrying:

```
X-Dewey-Signature: t=<unix_ts>, v1=<hex hmac_sha256(webhook_secret, "<t>.<raw_body>")>
```

The receiver MUST:

1. Recompute HMAC-SHA256 over `"<t>.<raw request bytes>"` — the **raw body**, never re-serialized JSON.
2. Compare in constant time (`hmac.compare_digest` / `timingSafeEqual`), never `==`.
3. Reject when `|now − t| > 300` seconds even with a valid MAC (symmetric: future-dated beyond 300s also rejects). Keep the host NTP-synced — clock skew silently rejects everything.
4. Verify **before** parsing or acting on the payload.
5. Ack fast: only a 2xx within the spine's 10-second timeout counts as delivered; queue heavy work. Events you don't handle still get a 2xx (log-and-advance), otherwise you burn the retry ladder on noise.

Delivery semantics: **at-least-once**, no ordering guarantee (a `.updated` can arrive before/without its `.created`; handlers must be order-tolerant upserts keyed on spine IDs that self-heal via `links.self` when needed). Retry ladder on failure: 60s, 5m, 30m, 2h, 6h, 24h, 48h — **~80.6 hours total from first failure**, then the delivery is marked Exhausted and permanently dropped. Your outage runbook gets ~80h of webhook grace, after which recovery is pull-feed only (§1.12) — and only within the spine's event retention window (default 180 days).

A portable reference verifier (port to your language; this is the exact algorithm the spine signs with):

```python
import hmac, hashlib, time

def verify_signature(secret: str, header: str, body: bytes, max_age_seconds: int = 300) -> bool:
    parts = dict(p.strip().split("=", 1) for p in header.split(","))
    t, v1 = parts["t"], parts["v1"]
    if abs(time.time() - int(t)) > max_age_seconds:
        return False
    expected = hmac.new(secret.encode(), f"{t}.".encode() + body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, v1)
```

### 1.12 Events — catalog, payloads, consumption rules

Envelope: `{event_id, type, schema_version (int, currently 1), occurred_at, data, links}`. `event_id` format `EVT-<yymmddHHMMSS>-<8-char hash>`, globally unique.

v1 catalog (exact strings, dot-separated lowercase):
`student.created`, `student.updated`, `student.merged`; `guardian.created`, `guardian.updated`; `family.updated`; `enrollment.applied`, `enrollment.offered`, `enrollment.enrolled`, `enrollment.activated`, `enrollment.suspended`, `enrollment.resumed`, `enrollment.completed`, `enrollment.withdrawn`; `invoice.submitted`, `invoice.paid`, `invoice.overdue`; `credit_note.issued`; `offering.created`; `offering.updated`; `offering.capacity_warning`; `period.created`; and the shared-record governance types `student.change_requested`, `guardian.change_requested`, `offering.change_requested`, `period.change_requested` (emitted when a write you sent returned `202` — see §1.4).

There is NO `family.created` event — discover new families via periodic list
reads. `offering.created` and `period.created` DO exist (added 2026-07-25,
when satellites gained catalog writes). A handler for an event name not in
this catalog is a bug.

Payload shapes (`data`):

- `student.*` → `{student_id, full_name, dob, status, family, guardians[]}`, `links.self = /api/v1/students/{id}`
- `student.merged` → `{survivor_id, merged_id}`
- `guardian.*` → `{guardian_id, guardian_name, phone, email}`
- `family.updated` → `{family_id, family_name, customer, students[]}`
- `enrollment.*` → `{enrollment_id, student, offering, brand, status, prior_status, effective_date, reason}`
- `invoice.*` / `credit_note.issued` → `{invoice_id, family, customer, company, currency, grand_total, outstanding_amount, due_date, is_return, fee_run}`
- `offering.updated` → `{offering_id, offering_name, brand, campus, offering_type, enrollment_period, status, capacity}`
- `offering.created` → same shape as `offering.updated`
- `offering.capacity_warning` → `{offering, capacity, enrolled}` — note the key is `offering`, **not** `offering_id`
- `period.created` → `{period_id, period_name, brand, period_model, start_date, end_date}`

Consumption rules:

1. **Dedupe on `event_id` before side effects**, in a table with a UNIQUE constraint (or upsert), ideally in the same transaction as processing, **shared by the webhook path and the pull path** — the two channels deliberately overlap and the same event WILL arrive via both.
2. **Run a scheduled poller** on `events.list_events` (params `since`/`limit`, limit clamped to 200), persisting its cursor transactionally with processing. `since` IS the cursor: pass the previously returned `next_cursor` value verbatim (opaque — §1.6 rules apply). Webhooks are latency sugar; the pull feed is the reconciliation path.
3. **The pull feed is subscription-gated.** It only returns events for types the registration subscribed to **at emit time**. An unsubscribed event type is invisible to BOTH channels, and events emitted before a subscription was added can never be pulled. Consequences: get `subscribed_events` complete at go-live; after any subscription change, backfill the gap window via the list endpoints (`updated_since`), not the feed. Retention is finite (default 180 days) — the feed cannot recover older events either.
4. **`enrollment.resumed` maps to the same local state as `enrollment.activated`.** The spine emits `resumed` (not `activated`) when an enrollment re-enters Active from Suspended. Handling only `activated` silently misses every resume.
5. `student.merged`: repoint **every** local table/column holding `merged_id` to `survivor_id` — enrollments, attendance, messages, billing refs, caches; audit your schema for the full column list. The merged ID ceases to exist spine-side; subsequent reads of it 404, which is expected and must not crash sync jobs.
6. Unknown `type` → log and 2xx/advance. `schema_version > 1` → log/alert, don't crash. Unknown fields anywhere → ignore (§1.3).

### 1.13 Human SSO — OAuth2 Authorization Code + PKCE only

Humans (guardians, staff) authenticate via the spine's OAuth2. The satellite:

- Authorize: `GET {SPINE_URL}/api/method/frappe.integrations.oauth2.authorize` with `client_id`, `response_type=code`, `scope=all openid`, `redirect_uri`, `code_challenge_method=S256` (plain not acceptable), `code_challenge`.
- Token: `POST {SPINE_URL}/api/method/frappe.integrations.oauth2.get_token` with `code_verifier` and **no `client_secret`** (public client).
- Identity: `GET {SPINE_URL}/api/method/frappe.integrations.oauth2.openid_profile`; key guardians on `Edu Guardian.user == sub/email` — never invent your own matching.

MUST NOT: store local passwords for spine-known humans (no password hash columns on guardian/staff models, no "forgot password" route for them), offer phone-first OTP login (deferred platform-wide), or use human OAuth tokens against `/api/v1` — human tokens are for the satellite's own UX only; all `/api/v1` calls use the server key pair (§1.1).

### 1.14 Frontend rules

- No `/api/v1` calls from browser/mobile code — ever. The frontend talks to the satellite's own backend, which proxies to the spine.
- No spine secrets in client bundles: `api_secret`, `APP_SECRET`, `webhook_secret`, `client_secret` (there is no client secret — PKCE), or issued key values. Built artifacts (`dist/`, bundles) are part of the audit surface.
- The PKCE flow (§1.13) is the frontend's only direct spine touchpoint: `code_verifier` generated client-side per session, never persisted beyond the flow, never logged.
- Enrollment/billing state shown in UI is display of spine data; UI actions that change it call the satellite backend, which calls `transition_enrollment` / `create_charge` and surfaces spine 422 errors verbatim (§1.3).

### 1.15 Change policy

v1 is additive-only; breaking changes and deprecations follow the spine's `docs/api-changelog.md` with announced windows. Requirements: tolerant parsing (§1.3), a named owner watching the changelog, and no version-sniffing hacks. Never pin strict response schemas.

### 1.16 Sandbox data quarantine — what `environment` means for data

Every Student, Guardian, Family, Enrollment, and Adhoc Charge the spine creates — and, since satellites gained catalog writes, every Offering and Enrollment Period too — is stamped (internally, never exposed in v1 responses — §1.3's additive-only tolerance still holds, nothing here changes response shapes) with a hidden test/real flag at creation time, driven by the one signal the spine trusts: the writing satellite app's `environment` at the moment of the call. A create through a `Sandbox`-registered app's key pair lands in the **test pool**; a create through a `Production` app (or a staff Desk/SPA session) lands in the **real pool**. This is decided once, at create — it is not kept in sync if an app's `environment` changes later (see the backfill-patch caveat below).

- **Two pools, no crossover.** Test and real rows are disjoint with no legitimate path between them. Duplicate-person detection (§1.8), guardian-phone matching, and every explicit `guardian` / `family` / `primary_payer_guardian` id a satellite supplies in a write body are compared **within the caller's own pool only**. A Sandbox create can never dedupe against, or silently attach to, a real person, and a Production create can never match a Sandbox one. A caller-supplied id from the wrong pool is rejected as unknown — the same outcome as an id that doesn't exist at all, with no signal distinguishing "wrong pool" from "never existed." Do not build retry/fallback logic on the assumption that a rejected id must exist somewhere; treat it exactly like a 404 you'd get for any other reason (same no-existence-leak posture as brand isolation, §1.3/§3.2.17).
- **Reads are pool-matched, symmetrically.** `registry_read.*`, `money_read.*`, and `catalog.list_offerings` / `catalog.list_periods` return only the caller's own pool: a Sandbox app's `list_students` / `get_student` (and the guardian/family/enrollment/invoice equivalents) see test rows only; a Production app sees real rows only. A `get_*` call for an id in the other pool is a plain `not_found` (404) — same shape and same handling rules as a brand-mismatch 404 (§1.3): never infer existence from the error, never distinguish pool-mismatch from brand-mismatch from genuinely-missing.
- **Events are environment-matched, with one exception.** Deliveries for `student.*`, `guardian.*`, `family.*`, and `enrollment.*` events go only to apps whose `environment` matches the emitting entity's pool: an event about a Sandbox-created enrollment delivers to Sandbox-environment apps only; an event about a real one delivers to Production-environment apps only. **The four catalog event types are the one exception** — `offering.created`, `offering.updated`, `offering.capacity_warning` and `period.created` carry no person data, so they deliver to BOTH environments regardless of pool (a Sandbox app still needs to see its own dev catalog change, and delivery is deliberately not filtered on the catalog row's pool). If you subscribe to those four types expecting environment isolation, you will still receive events for the other environment's catalog — that's intended, not a leak. **The exception is scoped to exactly those four names, not to the `offering.*` / `period.*` globs**: `offering.change_requested` and `period.change_requested` are emitted with the target row's pool and ARE environment-matched, like every person event. Note the asymmetry: catalog **reads** (`catalog.list_offerings`, `catalog.list_periods`) ARE pool-matched — a Sandbox app lists only Sandbox-created offerings and periods — even though catalog **events** are not.
- **Events are brand-fenced as well as pool-matched (since 2026-07-27).** Independently of the environment rule above, an app receives an event only if it holds an `allowed_brands` grant for one of the brands the event concerns, or it created the record. Brands resolve the same way read visibility does: directly from `brand` for offerings, periods and enrollments; transitively through enrollments for students, guardians and families. Delivery is therefore never more generous than what `registry_read` / `money_read` would return for the same caller. **Consequence to design for: a person with no enrollment reaches no satellite** — a brand-new student has no brand yet, so only the creating app receives `student.created`; every other satellite first sees that person via `enrollment.*` when it enrols them into a brand it holds. Do not treat `student.created` as a group-wide roster feed. The two rules compose: a catalog event reaches both environments (I5, above) **but still only granted brands**.
- **Test data carries no retention guarantee.** Unlike everything else in this playbook, test-pool rows exist only to support satellite dev/staging traffic and are the one class of registry data the spine may delete outright (operator-run purge, below). Do not build a Sandbox-environment integration that assumes long-lived spine-side history for records it created against a Sandbox key pair.
- **Money never touches test data.** Fee-run selection and mini-invoice creation skip/refuse test-pool enrollments and charges outright — a Sandbox app cannot cause a real invoice to be generated, by construction. Test families' ERP Customers land in a dedicated "Sandbox Test" Customer Group, visually segregated in ERPNext UIs (AR reports, Customer lists) without needing custom fields on `Customer` itself.
- **Staff-visible surfaces exclude test data by default** — this affects what your [SPINE OPERATOR] contact sees when troubleshooting on your behalf. `/api/resource` and `get_list`/Desk list views hide test-pool rows via `permission_query_conditions`; **an admin (System Manager, which the built-in Administrator holds) is exempted** and sees both pools in those list views — the deliberate inspection escape hatch. The ⌘K search, dashboards, enrollment board, and duplicate reports filter test data in hand-written SQL (not the permission hook), so they stay hidden **even for admins**. A single record is always reachable by name (`frappe.client.get`, or the Desk form URL `/app/edu-student/<id>`) regardless of pool. Note: Frappe does NOT auto-exempt Administrator from `permission_query_conditions` — the exemption is coded explicitly in `permissions.py`.

**Operational notes [SPINE OPERATOR]:**

- Rows created before this quarantine existed were backfilled into the test pool via a one-time patch, using each row's creating user as a proxy for "was this created by a currently-Sandbox app." That proxy does not correct for an app that was Production at creation time and was demoted to Sandbox afterward, or for a system-user account reused across a retired app and a replacement one — treat the backfill as a best-effort one-time cleanup, not a live guarantee.
- A System-Manager-only, dry-run-by-default purge command hard-deletes all test-pool data in dependency order (event outbox/deliveries → adhoc charges → enrollments → student notes → students → families and their Customers → guardians). It skips (reports, never deletes) any Customer with a linked Sales Invoice — that combination shouldn't be reachable given the money guard above, and is worth investigating before any manual cleanup. Always read the dry-run counts before re-running with delete enabled.

**Deferred / known gaps — not addressed by this mechanism:**

- ~~**Event brand-fencing.**~~ **CLOSED 2026-07-27** — deliveries are now brand-matched per-delivery, not just environment-matched. See "Events are brand-fenced" above and the `docs/api-changelog.md` entry; note the behavior change for `student.created` on a person with no enrollment.
- **Mixed-pool merge is unsupported.** A `student.merged` event assumes both the surviving and merged student are in the same pool. Nothing today creates a mixed-pool merge candidate (two-way isolation above rules it out at the dedupe stage), so this is a latent gap rather than a reachable one — but merge handling has not been exercised against a mixed-pool pair and should not be assumed safe if that ever becomes reachable.

---

## 2. Static audit checklist (run inside the satellite repo)

Run from the repo root; `rg -n` equivalents fine. Each item cites the contract section it enforces. **Backend** items B1–B14, **frontend** items F1–F4.

- **B1 — v1-only surface (§1.1).** `grep -rn "api/method" .` — every spine URL starts `/api/method/dewey_edu_core.api.v1.`. Then `grep -rn "api/resource\|frappe.client\|/api/v2\|frappeclient" .` and `grep -rnE "(mysql|mariadb|psycopg).*(spine|dewey)" .` — all must be empty. `/api/method/frappe.*` hits are only the three OAuth endpoints (§1.13).
- **B2 — endpoint whitelist diff (§1.2).** `grep -rn "dewey_edu_core.api.v1" .` — extract the called set, diff against §1.2. Anything not listed is a violation. Every `get_*` call site has a 404 branch.
- **B3 — auth header + secret hygiene (§1.1).** `grep -rn "Authorization" .` — exactly one credential pattern, `token KEY:SECRET`, values from env/secret store. `grep -rn "APP_SECRET\|api_secret\|webhook_secret" .` — no hardcoded values, including test fixtures, docker-compose, and repo history.
- **B4 — status codes and retry policy (§1.4).** Read the HTTP client's retry policy: retryable set excludes 400/401/403/404/409/422; create success accepts 200 OR 201 (`grep -rn "status_code == 200" .` near create calls is the red flag); 401/403 alert-and-stop; 429 backs off.
- **B5 — envelope + tolerant parsing (§1.3).** Client reads `message.data` / `message.next_cursor` / `message.error.code`; branches on the full code list including `invalid_fields`, `invalid_transition`, `immediate_not_allowed`; `grep -rn "additionalProperties.*false\|extra='forbid'\|DisallowUnknownFields\|deny_unknown_fields" .` on spine-response models — hits are violations. No code asserts a `details` key on 404s.
- **B6 — duplicate protocol (§1.8).** `grep -rn "duplicate_candidates" .` must hit the create path; `grep -rn "confirmed" .` — `confirmed=true` only in a human-gated path, never a default payload field.
- **B7 — idempotency discipline (§1.5).** `grep -rn "Idempotency-Key" .` on `create_student`/`create_enrollment`/`create_offering`/`create_period` calls, key persisted per logical op (outbox row), reused across retries, and never reused across operations with different arguments. Then verify satellite-side dedupe/outbox exists for **all other writes**, above all `create_charge`.
- **B8 — pagination (§1.6).** `grep -rn "next_cursor" .` — `while next_cursor` shape, exact value threaded, cursor persisted; `grep -rn "b64decode" .` near cursor code = violation; requested `limit <= 200`; bad-cursor validation errors surfaced.
- **B9 — incremental sync (§1.7).** `grep -rn "updated_since" .` — durable watermark persisted; no full re-list jobs; `update_student` payloads ⊆ the six whitelisted fields; invoice status filters use exact ERPNext literals.
- **B10 — event consumption (§1.12).** Verify: scheduled poller exists (not webhook-only); processed-events table with UNIQUE(event_id) checked before side effects, shared by both paths; default branch logs-and-advances unknown types; `schema_version > 1` alerts; handlers are order-tolerant upserts; `grep -rn "family.created" .` — presence is a bug; **`enrollment.resumed` handled and mapped to the same state as `enrollment.activated`**; subscription-gap backfill logic exists (list-endpoint backfill after subscription changes).
- **B11 — payload field names (§1.12).** Handlers consume exact field names per the shape table — especially `survivor_id`/`merged_id`, `prior_status` on enrollment events, and `offering` (not `offering_id`) on `capacity_warning`.
- **B12 — webhook receiver (§1.11).** `grep -rn "X-Dewey-Signature" .`; HMAC over raw bytes (not re-serialized JSON); `grep -rn "compare_digest\|timingSafeEqual" .` (a `==` compare is a finding); 300s freshness window both directions; verification before parsing; fast 2xx with heavy work queued; unhandled types still 2xx.
- **B13 — merge re-keying (§1.12.5).** `grep -rn "student.merged\|survivor_id\|merged_id" .` — handler exists; enumerate every schema column holding spine student IDs and confirm each is repointed; 404-on-merged-id doesn't crash sync.
- **B14 — identity & SoR (§1.9, §1.10).** Person tables carry populated spine-ID columns used as join keys; every person-creation path calls the spine and persists the returned ID; `SELECT count(*) ... WHERE spine_id IS NULL` = 0; no authoritative local enrollment-status writes outside event-consumer/read-sync; no locally writable invoice/payment tables beyond read caches; grade/daily-ops modules make no `registry_write`/`charges` calls; medical/allergy fields never appear in spine payload builders; no payroll logic.

- **F1 — no spine calls or secrets client-side (§1.14).** `grep -rn "dewey_edu_core.api.v1\|api_secret\|APP_SECRET\|webhook_secret\|client_secret" <frontend dirs> dist/` — all empty, including built bundles.
- **F2 — PKCE correctness (§1.13).** `grep -rn "code_challenge_method" .` → `S256` only; `code_verifier` present in the token request; no `client_secret` anywhere in the flow; verifier not persisted/logged.
- **F3 — no local auth for spine-known humans (§1.13).** `grep -rn "bcrypt\|argon2\|pbkdf2\|password_hash\|set_password" .` on guardian/staff/adult-student models — hits are violations; no forgot-password route or phone-OTP login entry point for them.
- **F4 — human tokens never reach /api/v1 (§1.13).** No `Bearer` header construction targeting `/api/v1`; all spine calls originate server-side (cross-check B1 hit locations).

---

## 3. Dynamic verification on staging

**Never point any of this at production** — the suite creates real student records (`Conform <uuid8>` / `Idem <uuid8>`).

### 3.1 The official conformance suite (production-key gate)

Before staging, you can develop and pre-run everything against a **local Docker spine** — a real Frappe/ERPNext spine the spine team can hand you (spine repo: `dev/sandbox/`, seeded via `seed_local_satellite`, serving `http://localhost:8000` with dev credentials and a `FOREIGN_ID`). Only the staging run counts for the production-key gate.

The suite lives in the spine repo (`conformance/`); run it from a spine-repo checkout (plain `unittest` + `requests`):

```bash
pip install requests   # silently gates live tests off if missing
SANDBOX_URL=https://<staging-host> APP_KEY=<api_key> APP_SECRET=<api_secret> \
  FOREIGN_ID=<other-brand-student-id> \
  python3 -m unittest conformance.test_conformance -v
```

- Requires scopes ⊇ `{read:students, write:students, read:events}` on the sandbox registration.
- `FOREIGN_ID` = a student in a brand the app can NOT see. **Without it, test_07 (brand isolation, 404-not-403) skips silently** — an audit that never ran test_07 has not verified isolation.
- **The skip trap:** with env vars unset the suite skips cleanly and the always-on local signature self-test still passes, so "1 ok, 6 skipped" looks green while proving nothing. A valid pass = test_01–test_05 and test_07 all `ok` in the retained `-v` output. `skipped` is not a pass.
- Coverage: ping envelope + satellite identification; bad-secret 401; 409 `duplicate_candidates` → `confirmed=true` retry; `Idempotency-Key` replay on create_student; events feed envelope; reference signature verifier self-test (local only); foreign-brand 404.

### 3.2 Probes the suite does NOT perform

The suite never contacts the satellite. These probe the satellite's own behavior:

1. **Webhook matrix** against the satellite's staging webhook endpoint, signing with the §1.11 algorithm and the staging webhook secret: valid+fresh → 2xx; valid MAC but `t = now−600` → reject; fresh `t` with one MAC hex digit flipped → reject; missing header → reject; boundary: `now−301` reject, `now−299` accept. Response time < 10s hard, ideally < 1s. Valid-but-unhandled event type → still 2xx.
2. **Additive tolerance (dynamic):** deliver a correctly signed webhook whose envelope AND `data` carry an extra unknown field — must process normally. This is the only behavioral evidence for the §1.15 obligation.
3. **event_id idempotency:** POST the identical signed payload twice AND let the poller fetch the same event — exactly one side effect total.
4. **student.merged re-keying:** **[SPINE OPERATOR]** merge two students the satellite uses; verify zero rows still reference `merged_id`, UX resolves to the survivor, subsequent calls use `survivor_id`.
5. **Pagination walk:** drive a list with `limit=2` — no dupes/skips, clean termination; seed >1 page of events and confirm full ingestion; send `cursor=garbage` — the error is surfaced, not looped on or read as empty.
6. **Idempotent retry:** kill the satellite mid-create and let its retry fire — exactly one student spine-side; same `Idempotency-Key` twice manually → identical body and status.
7. **Charge double-bill:** trigger the same billable action twice via retry — exactly one charge spine-side. **This passes only on the strength of the satellite's own outbox/dedupe** (§1.5) — the spine offers no protection on `create_charge`.
8. **Duplicate flow via the UI:** submit a near-duplicate student — 409 surfaced, candidates shown, human-gated confirm.
9. **Rate limit:** fire limit+1 requests within one clock minute **against a scoped endpoint** (e.g. `catalog.list_brands`) — expect the 429 `rate_limited` envelope and backoff recovery. Do NOT use `ping` or `discovery.capabilities` — both bypass the limiter and will produce a false "rate limiting broken" finding.
10. **/api/resource closure:** `GET /api/resource/Edu%20Student` and `GET /api/resource/Edu%20Satellite%20App` with the satellite token → both 403.
11. **Deactivation:** **[SPINE OPERATOR]** toggle `active=0` on the sandbox registration — calls flip to 401 `unauthorized`, satellite alerts without retry-looping; restore afterward.
12. **missing_scope:** call one ungranted-scope endpoint → 403 `missing_scope`, treated as config error, not retried.
13. **Invalid transition:** request an illegal enrollment transition → satellite shows the spine's 422, no local status flip.
14. **SSO walkthrough:** full login through the satellite UI — authorize redirect carries `code_challenge_method=S256`; token request carries `code_verifier`, no `client_secret`; session resolves to the correct Edu Guardian; no local password form exists.
15. **Pull-feed catch-up:** stop the webhook endpoint for an hour, generate events, restart — poller fully catches up, zero duplicates.
16. **Order tolerance:** deliver an `.updated` for an entity the satellite has never seen — it self-heals (fetch via `links.self`), not an error loop.
17. **404 semantics:** with the satellite token, `get_student` on a known other-brand ID → 404 with `{error: {code: "not_found", message: ...}}` (**no `details` key**); repeat for `get_guardian`/`get_family`/`get_enrollment`/`get_invoice`.

### 3.3 Spine-side registration review — [SPINE OPERATOR]

Performed on the spine (Desk / bench console), summarized here so satellite-side auditors know what to request:

1. Dedicated System User: `user_type = System User`, roles exactly `['Edu Satellite']`, never linked to an Edu Guardian; exactly one app per user.
2. `Edu Satellite App` record complete: `active=1`, correct `environment`, `scopes` / `allowed_brands` / `subscribed_events` matching the contract, `webhook_url` HTTPS, `webhook_secret` set; Sandbox/Production pair with separate keys.
3. `conformance_passed_on` set (the spine refuses `environment='Production'` without it), backed by retained `-v` evidence; if stale, re-run §3.1.
4. Scope minimality: granted scopes = scopes actually used (cross-check access logs); flag unused grants.
5. **Subscription history vs go-live:** check the record's Version history for when each `subscribed_events` row was added; any gap between satellite go-live and a subscription's add date is a permanently unpullable window (§1.12.3) — require evidence of list-endpoint backfill for it.
6. Access logs: zero requests from the satellite's user outside `/api/method/dewey_edu_core.api.v1.`.
7. Delivery health: `SELECT status, COUNT(*) FROM \`tabEdu Event Delivery\` WHERE satellite_app=<app> GROUP BY status` — investigate Failed/Exhausted (Exhausted = events the satellite lost and must have backfilled).
8. Hygiene: no students named `Conform *` / `Idem *` in production (someone ran the gate suite against prod); satellite record Version history shows no unexplained scope/brand additions.

---

## 4. Pass/fail gate — what blocks production credentials

Per the spine's SoW clause, any ONE of these blocks (or should revoke) production keys:

- Conformance suite not fully passed on staging (`skipped` results, missing `FOREIGN_ID`, no retained `-v` evidence).
- Any non-v1 spine channel: `/api/resource`, `frappe.client`, non-OAuth `/api/method/frappe.*`, `/api/v2`, or a DB driver pointed at the spine.
- Shared/human/Administrator credentials; extra roles on the system user; system user linked to a guardian.
- Locally minted identities for spine-known people; person rows with no spine ID.
- Missing/broken webhook signature verification (wrong signing string, `==` compare, missing 300s freshness) or non-HTTPS webhook URL.
- No `event_id` dedupe; no `student.merged` re-keying; `enrollment.resumed` unhandled.
- Unconditional `confirmed=true` on creates; fresh `Idempotency-Key` per retry attempt; no satellite-side dedupe on `create_charge`.
- Secrets hardcoded or present in client bundles.
- Local password storage or phone-first login for spine-known humans; human OAuth tokens used against `/api/v1`.
- Local authoritative invoices/payments/AR; local-only enrollment creation (which also produces zero revenue — finance only invoices spine enrollments).

## 5. Known limits of the automated gate

The conformance suite is necessary, not sufficient. It never contacts the satellite, never tests SSO, never follows `next_cursor`, never exercises `catalog.*` / `money_read.*` / `charges.*` / `update_student` / `transition_enrollment`, and cannot see consumer-side idempotency, re-keying, identity discipline, scope minimality, or secret handling. Those are exactly the §2 checklist and §3.2/§3.3 probes — do not skip them because "the suite passed".

