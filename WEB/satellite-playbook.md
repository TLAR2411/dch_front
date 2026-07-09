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
- Sandbox and Production are **separate registrations with separate key pairs**. Production keys are only issued after the conformance suite passes on staging (§3).

### 1.2 Endpoint surface

Reads (GET-style, all under `dewey_edu_core.api.v1.`):

- `ping.ping` (no scope — see §1.4 note on rate limiting)
- `catalog.list_brands`, `catalog.list_campuses`, `catalog.list_offering_types`, `catalog.list_offerings`, `catalog.list_periods` (scope `read:catalog`)
- `registry_read.list_students`, `registry_read.get_student` (scope `read:students`); `registry_read.list_guardians`, `registry_read.get_guardian` (scope `read:guardians`); `registry_read.list_families`, `registry_read.get_family` (scope `read:families`); `registry_read.list_enrollments`, `registry_read.get_enrollment` (scope `read:enrollments`)
- `money_read.list_invoices`, `money_read.get_invoice`, `money_read.get_family_statement` (scope `read:invoices`)
- `events.list_events` (scope `read:events`)

Writes (POST, exactly eight):

- `registry_write.create_student`, `registry_write.update_student` (scope `write:students`); `registry_write.create_guardian` (scope `write:guardians`); `registry_write.create_family`, `registry_write.add_family_member` (scope `write:families`); `registry_write.create_enrollment`, `registry_write.transition_enrollment` (scope `write:enrollments`)
- `charges.create_charge` (scope `write:charges`)

Scopes are exact set membership — no hierarchy or aliasing. The full valid vocabulary (anything else is not a scope): `read:catalog`, `read:students`, `write:students`, `read:guardians`, `write:guardians`, `read:families`, `write:families`, `read:enrollments`, `write:enrollments`, `read:invoices`, `write:charges`, `read:events`. Request only the scopes your call set needs (least privilege — grants are diffed against usage in audits).

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
- Rate limit: per-app per-minute bucket (spine default 300/min; operator-configurable). On 429, exponential backoff; bulk sync jobs must be throttled below the limit. Note: `ping.ping` **bypasses** the rate limiter (it's not a scoped endpoint) — never use ping to test or reason about rate limiting.

### 1.5 Idempotency — read this carefully

The spine honors an `Idempotency-Key` header on **exactly two endpoints**: `registry_write.create_student` and `registry_write.create_enrollment`. Replays within 48h return the same resource; only terminal success (<400) is cached, so a 409/422 response followed by a corrected retry with the same key re-executes.

**Every other write — including `charges.create_charge` — has NO spine-side replay protection.** The satellite MUST provide its own retry safety (transactional outbox with a dedupe key, or equivalent) for `create_charge` (double-billing risk), `create_guardian`, `create_family`, `add_family_member`, `update_student`, and `transition_enrollment`.

Where `Idempotency-Key` is used: generate it once per logical operation (persist it on the outbox row) and reuse it verbatim across retries. A fresh `uuid4()` inside the retry loop defeats the mechanism entirely.

### 1.6 Pagination

- Cursors are **opaque**. Never construct, decode, or persist their internals (any `b64decode` near cursor code is a violation).
- Page size: default 100, hard max 200.
- Loop shape: `while next_cursor:` threading the exact returned value; terminate when `next_cursor` is absent/null. `next_cursor` is only emitted on a full page, so the final full page may be followed by one empty fetch — that's normal.
- An invalid cursor raises a validation error, not an empty page. Surface it; never swallow it or treat it as end-of-feed.
- Persist the cursor between runs for feed consumers.

### 1.7 Incremental sync and write constraints

- `catalog.list_campuses`, `catalog.list_offerings`, `registry_read.list_students` accept `updated_since` + `limit`. Local caches sync incrementally against a **durable watermark** (persisted after each successful run) — no scheduled "fetch everything" jobs against large collections.
- Only documented filters: `list_offerings` (brand, status); `list_students` (q, guardian_phone, dob, family); `list_campuses` (brand); `list_invoices` status filter takes the ERPNext literals **exactly**: `Draft`, `Unpaid`, `Paid`, `Overdue`, `Return` (lowercase variants silently match nothing).
- `update_student` accepts ONLY: `first_name`, `last_name`, `preferred_name`, `email`, `phone`, `status`. Anything else → 422 `invalid_fields`. Don't build a generic "patch whatever changed" sync against it.
- `create_charge` has an `immediate` flag (mini-invoice now vs. next fee run). Sending `immediate=true` to a brand that disallows it → 422 `immediate_not_allowed`; handle as a configuration/product decision, not a retryable error.

### 1.8 Duplicate-person protocol

`create_student` (and `create_guardian`) against a probable duplicate returns 409 `duplicate_candidates` with the candidates in the error payload. Required behavior:

1. Surface the candidates for **human** review.
2. Only after a human confirms "genuinely new", resubmit the **identical body** plus `confirmed: true`.

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
`student.created`, `student.updated`, `student.merged`; `guardian.created`, `guardian.updated`; `family.updated`; `enrollment.applied`, `enrollment.offered`, `enrollment.enrolled`, `enrollment.activated`, `enrollment.suspended`, `enrollment.resumed`, `enrollment.completed`, `enrollment.withdrawn`; `invoice.submitted`, `invoice.paid`, `invoice.overdue`; `credit_note.issued`; `offering.updated`; `offering.capacity_warning`.

There are NO `family.created` or `offering.created` events — discover new families/offerings via periodic list reads. A handler for an event name not in this catalog is a bug.

Payload shapes (`data`):

- `student.*` → `{student_id, full_name, dob, status, family, guardians[]}`, `links.self = /api/v1/students/{id}`
- `student.merged` → `{survivor_id, merged_id}`
- `guardian.*` → `{guardian_id, guardian_name, phone, email}`
- `family.updated` → `{family_id, family_name, customer, students[]}`
- `enrollment.*` → `{enrollment_id, student, offering, brand, status, prior_status, effective_date, reason}`
- `invoice.*` / `credit_note.issued` → `{invoice_id, family, customer, company, currency, grand_total, outstanding_amount, due_date, is_return, fee_run}`
- `offering.updated` → `{offering_id, offering_name, brand, campus, offering_type, enrollment_period, status, capacity}`
- `offering.capacity_warning` → `{offering, capacity, enrolled}` — note the key is `offering`, **not** `offering_id`

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

---

## 2. Static audit checklist (run inside the satellite repo)

Run from the repo root; `rg -n` equivalents fine. Each item cites the contract section it enforces. **Backend** items B1–B14, **frontend** items F1–F4.

- **B1 — v1-only surface (§1.1).** `grep -rn "api/method" .` — every spine URL starts `/api/method/dewey_edu_core.api.v1.`. Then `grep -rn "api/resource\|frappe.client\|/api/v2\|frappeclient" .` and `grep -rnE "(mysql|mariadb|psycopg).*(spine|dewey)" .` — all must be empty. `/api/method/frappe.*` hits are only the three OAuth endpoints (§1.13).
- **B2 — endpoint whitelist diff (§1.2).** `grep -rn "dewey_edu_core.api.v1" .` — extract the called set, diff against §1.2. Anything not listed is a violation. Every `get_*` call site has a 404 branch.
- **B3 — auth header + secret hygiene (§1.1).** `grep -rn "Authorization" .` — exactly one credential pattern, `token KEY:SECRET`, values from env/secret store. `grep -rn "APP_SECRET\|api_secret\|webhook_secret" .` — no hardcoded values, including test fixtures, docker-compose, and repo history.
- **B4 — status codes and retry policy (§1.4).** Read the HTTP client's retry policy: retryable set excludes 400/401/403/404/409/422; create success accepts 200 OR 201 (`grep -rn "status_code == 200" .` near create calls is the red flag); 401/403 alert-and-stop; 429 backs off.
- **B5 — envelope + tolerant parsing (§1.3).** Client reads `message.data` / `message.next_cursor` / `message.error.code`; branches on the full code list including `invalid_fields`, `invalid_transition`, `immediate_not_allowed`; `grep -rn "additionalProperties.*false\|extra='forbid'\|DisallowUnknownFields\|deny_unknown_fields" .` on spine-response models — hits are violations. No code asserts a `details` key on 404s.
- **B6 — duplicate protocol (§1.8).** `grep -rn "duplicate_candidates" .` must hit the create path; `grep -rn "confirmed" .` — `confirmed=true` only in a human-gated path, never a default payload field.
- **B7 — idempotency discipline (§1.5).** `grep -rn "Idempotency-Key" .` on `create_student`/`create_enrollment` calls, key persisted per logical op (outbox row), reused across retries. Then verify satellite-side dedupe/outbox exists for **all other writes**, above all `create_charge`.
- **B8 — pagination (§1.6).** `grep -rn "next_cursor" .` — `while next_cursor` shape, exact value threaded, cursor persisted; `grep -rn "b64decode" .` near cursor code = violation; requested `limit <= 200`; bad-cursor validation errors surfaced.
- **B9 — incremental sync (§1.7).** `grep -rn "updated_since" .` — durable watermark persisted; no full re-list jobs; `update_student` payloads ⊆ the six whitelisted fields; invoice status filters use exact ERPNext literals.
- **B10 — event consumption (§1.12).** Verify: scheduled poller exists (not webhook-only); processed-events table with UNIQUE(event_id) checked before side effects, shared by both paths; default branch logs-and-advances unknown types; `schema_version > 1` alerts; handlers are order-tolerant upserts; `grep -rn "offering.created\|family.created" .` — presence is a bug; **`enrollment.resumed` handled and mapped to the same state as `enrollment.activated`**; subscription-gap backfill logic exists (list-endpoint backfill after subscription changes).
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
9. **Rate limit:** fire limit+1 requests within one clock minute **against a scoped endpoint** (e.g. `catalog.list_brands`) — expect the 429 `rate_limited` envelope and backoff recovery. Do NOT use `ping` — it bypasses the limiter and will produce a false "rate limiting broken" finding.
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

