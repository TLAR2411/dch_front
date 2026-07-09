# Satellite Frontend Readiness Audit — dch_front/WEB

**Date:** 2026-07-09 · **Mode:** AUDIT, static only (playbook §2) · **Contract:** `satellite-playbook.md` (spine `dewey-edu-core` @ `e7120ee`)
**Method:** 7-dimension subagent audit (haiku/sonnet/opus workers), 2–3-lens adversarial verification per finding, opus completeness critic with one targeted follow-up round (36 raw findings), Fable hand-verification of all gate-relevant findings and synthesis-time merging (16 reported findings). Assumption confirmed by owner: app users are spine-known humans (Frappe users/employees).

## Executive summary

This repo is a **pre-integration frontend**: exhaustive sweeps found zero spine touchpoints — no `dewey_edu_core`/`/api/v1` calls, no spine secrets, no webhook code, no PKCE flow (D1/D2/D6 coverage, independently verified). Because nothing talks to the spine yet, **no present-tense §4 gate-blocker exists**, and the literal F1/F4 checks pass. The audit's real output is the readiness picture: **10 gap findings and 6 hygiene findings**, of which **three are go-live blockers** — items that become §4 gate violations the day this app ships as a satellite: human SSO is Supabase Google OAuth plus a dormant local password flow instead of spine PKCE (G-1), enrollment is created as local-authoritative state (G-5), and the app runs a fully local money SoR — double-entry GL plus a loan/AR module (G-7). The single most important next step is architectural: establish the satellite-backend proxy boundary (G-2), because nearly every other remediation hangs off it. Two immediate low-cost actions: fix the broken production build so the bundle can actually be audited (G-10), and rotate/scrub the real credentials committed in `.env.example` (H-1).

**Severity counts:** gate-blocker 0 · violation 0 · hygiene 6 · gap 10 (3 flagged GO-LIVE BLOCKER).

## F1–F4 checklist results

| Item | Playbook check | Result | Evidence |
|---|---|---|---|
| F1 | No spine calls or secrets client-side (incl. `dist/`) | **PASS (source) / UNVERIFIABLE (dist/)** | Greps for `dewey_edu_core.api.v1`, `api_secret`, `APP_SECRET`, `webhook_secret` across `src/`, `public/`, `index.html`, config, git history: all empty (D1/D2 coverage). The `dist/` arm cannot run — the build fails on a pre-existing broken import (G-10). `client_secret` appears only as an empty, unreferenced `VITE_CLIENT_SECRET=` template var (folded into H-1). |
| F2 | PKCE correctness (S256, `code_verifier`, no client_secret, verifier not persisted/logged) | **N/A — flow absent (gap G-1)** | `grep -rn "pkce\|code_challenge\|code_verifier"` over `src/`: zero hits. N/A is not a pass: the flow must be built; the codebase's current token-logging habits (H-3) are the precedent the PKCE code must not inherit. |
| F3 | No local auth for spine-known humans | **PASS with notes (H-2)** | No password-hash storage or forgot-password/OTP route exists (D3 sweep of `src/router`, `src/pages`: no such route; only inert starter-template i18n strings). The username/password login flow exists but is dormant — UI fully commented out, hand-verified (`src/pages/login.vue:124-166`). It is one uncomment away from an F3 failure; see H-2. |
| F4 | Human tokens never reach `/api/v1` | **PASS** | Full egress inventory (D2): exactly two client surfaces — the app's own backend via axios (`src/utils/api.js:49`, Bearer token to `VITE_API_URL`) and Supabase (`src/utils/supabase.js:6`). No Bearer construction toward any spine URL; no `/api/v1` anywhere. |

## Findings

Verification status legend: **CONFIRMED** = zero refuter dissent; **PLAUSIBLE** = survived with minority dissent (in this audit, dissents were overwhelmingly the citation lens noting that §1.9/§1.10 obligations are backend-owned per §0 — correct on the letter; these findings are retained as *readiness* items under the audit spec's gap-analysis mandate, with citations framed accordingly); **REINSTATED** = killed by the panel, restored by Fable with documented justification.

### Hygiene

#### H-1: Real credential material committed in `.env.example`
- **Severity:** hygiene · **Verification:** PLAUSIBLE (4 findings merged; evidence hand-verified by Fable)
- **Playbook:** F1 / §1.14 spirit — none of these are spine secrets, so §4 is not tripped; but this is exactly the hygiene bar the contract sets for the day spine credentials exist. §1.13 note: `VITE_CLIENT_SECRET` must not exist at all (PKCE public client has no client secret).
- **Evidence:**
  - `.env.example:10-11` — `VITE_LOGIN_USERNAME=admin` / `VITE_LOGIN_PASSWORD=Admin@168`
  - `.env.example:12` — `VITE_ENCRYPTION_SECRET=Hsrxx3xmrF67+…` (live AES key format consumed by `src/utils/encrypteData.js:4`)
  - `.env.example:15` — `VITE_GOOGLE_MAPS_API_KEY=AIzaSy…` (used at `src/components/AppGoogleMap.vue:4`, `src/composable/useGoogleMaps.js:35`)
  - `.env.example:4` — `VITE_CLIENT_SECRET=` (empty, referenced nowhere in `src/`; killed as a violation by the refuter panel — folded here at hygiene per hand-review)
  - `.env.example:16` — `VITE_CLIENT_ID=9e0f33a0-…`
- **Recommendation:** Rotate the Google Maps key and AES secret now (they are in git history; removal alone is insufficient). Replace all values with placeholders. Delete the `VITE_CLIENT_SECRET`, `VITE_LOGIN_USERNAME`, `VITE_LOGIN_PASSWORD` variables entirely — Vite inlines every referenced `VITE_` var into the shipped bundle at build time.

#### H-2: Dormant local username/password login flow, seeded from committed env credentials
- **Severity:** hygiene · **Verification:** hand-verified by Fable (panel killed the original gate-blocker claim 2–1; dormancy ground upheld, substance folded here — see Appendix B)
- **Playbook:** §1.13 MUST NOT / §4 "local password storage or phone-first login for spine-known humans" — **not violated today** (nothing rendered, nothing stored frontend-side), but re-enabling this flow at go-live trips §4 verbatim. Remediation is part of go-live blocker G-1.
- **Evidence:**
  - `src/pages/login.vue:124-166` — username, password, remember-me, and submit controls all HTML-commented out; only Google Sign-In renders (`:168-206`)
  - `src/pages/login.vue:121` — `<VForm @submit.prevent="onSubmit">` binding still live; `onSubmit` (`:34-38`) is the sole caller of `authStore.login`
  - `src/pages/login.vue:21-25` — form state seeded from `VITE_LOGIN_USERNAME`/`VITE_LOGIN_PASSWORD` (inlined into any bundle)
  - `src/stores/authStore.js:31-88` — fully implemented password login action (POST `login` with `X-CLIENT-ID`)
  - `src/plugins/i18n/locales/en.json:75,78`, `km.json:72` — inert "Forgot Password"/"Reset Password" starter-template strings, no route or component references them (D3 verified absence across `src/router`, `src/pages`)
- **Recommendation:** Delete (don't comment) the local login path: the commented UI, `authStore.login`, the env seeding, and the dead i18n keys. Spine-known humans must only ever authenticate via spine PKCE (G-1).

#### H-3: Token and identity data handled without hygiene: plaintext localStorage, divergent keys, console logging, no redaction convention
- **Severity:** hygiene · **Verification:** PLAUSIBLE (4 findings merged; token logging hand-verified by Fable)
- **Playbook:** §1.14/F2 spirit — "`code_verifier` … never persisted beyond the flow, never logged" is the standard the future PKCE code must meet; today's code establishes the opposite precedent.
- **Evidence:**
  - `src/stores/authStore.js:109` — `console.log("token-session:", token)` prints the live access token + expiry (hand-verified)
  - `src/stores/authStore.js:134, 210-212` — verify-session branches and decrypted user/branches/permissions payloads logged to console
  - `src/utils/accessToken.js:2,18` vs `src/stores/authStore.js:13-14` — two divergent localStorage keys (`token` via helpers; `accessToken` read directly with the helper call commented out) — drifted code that can desync auth state
  - `src/router/guards.js:28` — `localStorage.setItem('token', null); // Clear invalid cookie` (stale comment from a storage migration)
  - No logging wrapper, redaction, or lint guard across 554 `console.*` sites (R2-2 sweep)
- **Recommendation:** Remove token/PII logging; consolidate on one storage helper/key; add an ESLint `no-console` rule scoped to auth modules (and the future PKCE module) before spine integration.

#### H-4: Client-side AES encryption key ships in the bundle (false security)
- **Severity:** hygiene · **Verification:** PLAUSIBLE
- **Playbook:** §1.14 spirit (false-security pattern).
- **Evidence:** `src/utils/encrypteData.js:4` — key from `VITE_ENCRYPTION_SECRET` (build-time inlined); `:20` — AES-CBC encrypt/decrypt; `src/stores/authStore.js:206-208` — decrypts bootstrap user/branches/permissions payload. Note: the only `decrypt` caller (`bootstrap1`) is dead code per D3's call-graph check, but the util and key still ship in every bundle.
- **Recommendation:** Client-held keys provide zero confidentiality against the end user. Drop the encryption theater or move genuinely secret-dependent operations server-side; rotate the committed key (H-1).

#### H-5: Direct browser→Supabase data plane, including an unfiltered `students` PII read
- **Severity:** hygiene · **Verification:** PLAUSIBLE (2 findings merged)
- **Playbook:** §1.14 spirit ("the frontend talks to the satellite's own backend") — the literal rule governs spine calls only (dissent noted); the architectural pattern conflicts with the proxy boundary the satellite requires (G-2).
- **Evidence:** `src/utils/supabase.js:6` (anon-key client); `src/views/admin/students/StudentList.vue:96-117` — `supabase.from("students").select("*")` on every mount (roster PII: photo, dob, contacts — the one confirmed live PII-bearing direct read, hand-checked by R2-5's exhaustive sweep); `StudentCurriculumList.vue:124`; `BranchesList.vue:152`; `Schedule.vue:212,232` (insert/delete); `CalendarList.vue:225` (insert); `SubjectSettingList.vue:146,153`; `src/services/dataService.js:394-395`.
- **Recommendation:** Route app-data reads/writes through the satellite backend (StudentList already uses `api.post` for student disable/delete — same channel). If Supabase remains the satellite's own datastore, browser access must be RLS-scoped and narrow, never bulk `select(*)` on PII tables.

#### H-6: Mock Service Worker ships into every production build
- **Severity:** hygiene · **Verification:** PLAUSIBLE
- **Playbook:** F1/§1.14 spirit (build-artifact hygiene).
- **Evidence:** `package.json:11-12` — `msw:init` runs unconditionally via `postinstall` into `public/`; Vite copies `public/` verbatim into `dist/`, so `mockServiceWorker.js` is a fetchable, registrable request-interceptor at the production origin. Currently dormant (no `setupWorker` call in `src/` — verified).
- **Recommendation:** Gate `msw:init` to dev or delete the generated worker pre-build.

### Gaps (readiness)

#### G-1: No spine OAuth2 + PKCE SSO — human auth is Supabase Google OAuth (live) plus the dormant local password flow — **GO-LIVE BLOCKER**
- **Severity:** gap · **Verification:** CONFIRMED (D6; D3's duplicate merged)
- **Playbook:** §1.13 ("Humans … authenticate via the spine's OAuth2 … Authorization Code + PKCE only"), F2. At go-live, non-spine SSO for spine-known humans is a §4 matter (§1.13 MUST NOT set).
- **Evidence:** `src/pages/login.vue:47` — `supabase.auth.signInWithOAuth({provider:"google"})` is the live login; `src/stores/authStore.js:94-121` — Supabase session token stored as the app access token; `src/stores/authStore.js:31-88` — dormant password flow (H-2); zero source hits for `pkce|code_challenge|code_verifier|frappe.integrations.oauth2|openid_profile` (D6 grep, exit 1).
- **Recommendation:** Build the §1.13 flow: authorize via `{SPINE_URL}/api/method/frappe.integrations.oauth2.authorize` (`response_type=code`, `scope=all openid`, `code_challenge_method=S256`), exchange via `get_token` with `code_verifier` and **no client_secret**, resolve identity via `openid_profile` keyed on the spine user. `code_verifier` in memory only, never persisted or logged (contrast H-3). Hook points: `authStore.login`/`getSession` (`authStore.js:31,94`) and `login.vue:44`.

#### G-2: No satellite-backend proxy boundary; the committed "server" handlers are dead code
- **Severity:** gap · **Verification:** PLAUSIBLE (2 findings merged)
- **Playbook:** §1.14 ("the frontend talks to the satellite's own backend, which proxies to the spine").
- **Evidence:** `src/utils/api.js:49` — single axios instance to `VITE_API_URL` (the current non-spine app backend, an ngrok host in the example env); `src/utils/supabase.js:6` — second direct egress path (H-5); `src/server/api/[...slug].js:3,27` — Nitro-style `defineEventHandler`/`$fetch` handlers with no Nitro/Nuxt/h3 runtime anywhere in `package.json` — nothing builds or serves them.
- **Recommendation:** Stand up a real satellite backend tier (or wire these handlers into an actual runtime, or delete them). Every spine read/write, and ideally all app data, flows through it. This is the foundation nearly every other gap depends on.

#### G-3: No spine error-envelope handling — errors reach the user as a generic toast, never branched on `error.code`
- **Severity:** gap · **Verification:** PLAUSIBLE
- **Playbook:** §1.14 (surface spine 422s verbatim), §1.3 (branch on `error.code`: `invalid_transition`, `invalid_fields`, `immediate_not_allowed`).
- **Evidence:** `src/utils/api.js:157,167` — interceptor extracts only `data.message` into a 4-second auto-dismissing dialog; `:132` — success-path errors keyed on bare HTTP numbers `[401,404,500]`; `src/services/dataService.js:9` — call sites `console.error` and swallow, returning `undefined`. Zero repo references to any spine error code (grep empty). Envelope mismatch: spine errors arrive under `message.error`, which this interceptor never reads.
- **Recommendation:** When the proxy lands, implement an error layer that parses the spine envelope, branches on the full §1.3 code list, and renders 422 messages verbatim.

#### G-4: No terminal-404 / orphaned-record UX
- **Severity:** gap · **Verification:** PLAUSIBLE
- **Playbook:** §1.3 — `not_found` is terminal ("mark local record orphaned; no retry"); foreign-brand data 404s by design, so 404 must be handled as a legitimate, expected outcome.
- **Evidence:** `src/utils/api.js:132` — 404 lumped into a generic `[401,404,500]` error bucket; `:160` — only 401 gets distinct handling; `:167` — everything else is the same timed toast. No orphan concept anywhere in `src/`.
- **Recommendation:** Add `not_found` branching: mark the local record (keyed by spine ID) orphaned, suppress retry, distinct from retryable 5xx/network.

#### G-5: Enrollment and curriculum assignment are local-authoritative writes — **GO-LIVE BLOCKER**
- **Severity:** gap · **Verification:** PLAUSIBLE (D5 + D6 evidence merged)
- **Playbook:** §1.10 (enrollment state → spine; "never authoritative local flips"); §4 at go-live: "local-only enrollment creation (which also produces zero revenue — finance only invoices spine enrollments)".
- **Evidence:** `src/views/global/classses/ClassesList.vue:108` — `api.post("students-classes-enrollment", {student_id, class_id})`; `src/views/global/students/StudentCurriculumList.vue:104` — `api.post("students-curriculums-enrollment", …)`; `src/views/admin/students/CreateStudent.vue:473` — curriculum set chosen at student create; `src/views/global/checkin-checkout/CheckinCheckoutList.vue:94` — `curriculums-assignments-store`.
- **Recommendation:** Enrollment creation routes through the satellite backend to `registry_write.create_enrollment` (persist the returned spine `enrollment_id`); state changes via `transition_enrollment`, surfacing 422 `invalid_transition` verbatim (G-3); local class/section membership stays satellite-local but keyed by spine enrollment ID, converging from `enrollment.*` events — including `resumed` — never local flips.

#### G-6: Guardian/family data minted locally as free-text student fields
- **Severity:** gap · **Verification:** PLAUSIBLE
- **Playbook:** §1.9/§1.10 (guardian/family identity → spine), §1.8 (duplicate protocol), §1.2 (`create_guardian`/`create_family`/`add_family_member`).
- **Evidence:** `src/views/admin/students/CreateStudent.vue:63` — `f_name, m_name, f_contact, m_contact` as loose columns on the student form; `:530` — free-text "Father Name"/"Mother Name" inputs.
- **Recommendation:** Replace free-text parent fields with a spine-backed guardian/family picker-creator flowing through the backend (`create_guardian` → 409 `duplicate_candidates` human-gated → `create_family`/`add_family_member`), persisting spine IDs so `guardian.updated`/`family.updated` events converge.

#### G-7: Fully local money system of record: double-entry GL, chart of accounts, accounting persons, and a loan/AR module — **GO-LIVE BLOCKER**
- **Severity:** gap · **Verification:** PLAUSIBLE (2 findings merged, D6 evidence folded)
- **Playbook:** §1.10 (invoices/payments/credit notes/GL → spine ERPNext; "the ONLY money write is `create_charge`"); §4 at go-live: "Local authoritative invoices/payments/AR".
- **Evidence:** `src/views/accounting/journals/CreateJournals.vue:203` — `journals-store` posts debit/credit transactions against chart accounts; `EditJournals.vue:242` — `journals-update`; `ChartAccountList.vue:68` — chart-of-accounts CRUD; `PeopleList.vue:56,96` — accounting persons created/edited locally; `src/stores/loanStore.js:16` + `src/services/dataService.js:201` + `src/constants/loans/loanTabs.js:11` — loan borrowers, repayments, and overdue/AR aging lifecycle held locally.
- **Recommendation:** Needs an explicit product ruling on the money boundary. Anything that must appear on family statements/AR goes through `create_charge` (with satellite-side outbox + dedupe — the spine offers **no** replay protection on `create_charge`, §1.5) and is displayed via `money_read.*`. If an internal management ledger is retained, firewall it from spine billing/AR and never present it as the authoritative financial position. The loan module is the strongest conflict: either its borrowers become spine persons and its money becomes spine charges, or it is explicitly ruled out of spine scope and isolated.

#### G-8: Student and staff identities minted locally with no spine-ID columns
- **Severity:** gap · **Verification:** REINSTATED (Fable override — see Appendix B)
- **Playbook:** §1.9 ("Never mint local identities for spine-known people"; spine ID as the join key), §1.10 (staff/HR → spine ERPNext), assessed as readiness per the audit spec's D5 mandate.
- **Evidence:** `src/views/admin/students/CreateStudent.vue:44,295` and `EditStudent.vue:217` — student create/edit against the local backend with no spine-ID concept; `src/services/dataService.js:57` — local student reads; `src/views/global/teachers/CreateTeacher.vue:246` — teacher/staff records created locally (factual lens verified all citations verbatim before the panel's scope-based kill).
- **Recommendation:** Person-creation paths must call the spine (via the backend): `create_student` with `Idempotency-Key`, 409 duplicate protocol human-gated, spine ID persisted before or atomically with the local row; the local schema gains spine-ID columns used as join keys (audit criterion: zero person rows with NULL spine ID). Staff records become scoped reads of spine ERPNext data, not local masters.

#### G-9: Spine-bound display surfaces are unmapped and indistinguishable from local-master screens
- **Severity:** gap · **Verification:** CONFIRMED (R2-4; its companion convention finding merged)
- **Playbook:** §1.14 ("enrollment/billing state shown in UI is display of spine data").
- **Evidence:** Six render sites across four files show would-be spine-authoritative figures sourced from local endpoints: `src/views/accounting/journals/ListJournal.vue:90,99` (debit/credit), `TwoCardJournal.vue:188` (account balance), `dashboards/IncomeExpenseProfile.vue:450` (income/expense/profit), `src/views/global/students/StudentCurriculumList.vue:207` and `src/views/admin/students/StudentList.vue:173` (enrollment "Study/Not Study" chips). Counter-examples that must NOT be re-pointed: `PeopleList.vue:30`, `ChartAccountList.vue:34` (local master data), `CreateStudentCurriculum.vue:56` (`bmi_status` — health data, stays local per §1.10).
- **Recommendation:** Treat this inventory as the §1.14 re-pointing worklist; adopt a naming/comment convention marking spine-bound reads so future engineers don't re-derive scope (or mistakenly re-point local masters — or send health data spine-ward, which §1.10 forbids).

#### G-10: Production build is broken, so the bundle half of F1 cannot be verified
- **Severity:** gap · **Verification:** CONFIRMED (R2-1; reproduced by Fable in this audit's prep step)
- **Playbook:** F1 / §1.14 ("built artifacts (dist/, bundles) are part of the audit surface").
- **Evidence:** `npm run build` fails: `src/views/admin/subjects/SubjectsList.vue:2` imports `./AddEditRoomsDialog.vue`, which does not exist (directory contains only `AddEditSubjectsDialog.vue` — likely a rename/copy-paste error). No `dist/` was ever committed either (D7 checked full git history).
- **Recommendation:** Fix the import, rebuild, then run the F1 secret/spine grep plus a pattern scan (AIza keys, ngrok hosts, the H-1 secret values) over `dist/assets/*.js`. Until then, F1's bundle arm and §4's "secrets in client bundles" line are **unverifiable**, not passed.

## Requires staging (not runnable statically)

Frontend-relevant §3 probes deferred until a satellite backend + staging credentials exist:
- §3.2.8 — duplicate-person flow via the UI (409 surfaced, candidates shown, human-gated confirm)
- §3.2.13 — invalid enrollment transition: UI shows the spine's 422 verbatim, no local state flip
- §3.2.14 — full SSO walkthrough (S256 challenge, `code_verifier` in token request, no `client_secret`, correct user resolution, no local password form)
- §3.1 conformance suite and the remaining §3.2/§3.3 probes are backend/spine-operator scope (out of scope per spec §8). Additionally, §4's "extra roles on the system user / system user linked to a guardian" bullet is a spine-side registration property — **requires operator**; nothing frontend-side can evaluate it (the app's local role model is unrelated, per R2-3).

## Coverage & limitations

- **Build status:** failed (broken import, G-10) — the D7 built-artifact dimension degraded to confirming `dist/` absence across the working tree and full git history; no bundle bytes were scanned.
- **Dead dimensions:** none — all 7 dimensions returned results.
- **Completeness critic:** found 5 missed checks; a targeted Round 2 ran all 5 (10 additional findings, same verification pipeline). No further rounds per the spec's 2-round cap.
- **Synthesis merges:** 36 raw verified findings → 16 reported (same-file/same-issue merges across dimensions, e.g. four `.env.example` findings → H-1; the D4 data-plane dimension's inventory produced H-4, H-5, and H-6; the full mapping is recorded in the raw results JSON retained with session artifacts).
- **Context finding folded into this section:** D1's confirmed "app is pre-integration, no spine secrets anywhere" is reported as the executive summary's opening claim and the F1 row rather than as a numbered finding.
- **Verification caveat:** the adversarial panel systematically dissented on citation scope for §1.9/§1.10-based readiness findings (backend-owned sections per §0). Those dissents are correct about the letter of the playbook and are why most findings carry PLAUSIBLE rather than CONFIRMED; the findings stand as readiness items mandated by the audit spec, not as claims of current frontend contract violations.
- **Spec-assumption delta:** the spec (§2) assumed a *live* username/password login and pre-committed gate-blocker severity for it. The audit found the flow dormant (UI commented out) with Supabase Google OAuth as the live login. Both still require the same remediation (G-1), but present-tense severity was adjusted to hygiene (H-2) with the go-live blocker tag carried by G-1 — the factually precise reading of the same intent.

## Appendix A — Unconfirmed findings

None.

## Appendix B — Killed by adversarial verification

1. **"Username/password login flow implemented and wired for spine-known humans" (gate-blocker)** — killed 2–1. The severity lens showed the entire password UI is commented out and unreachable (`login.vue:124-166`), which Fable hand-verified and upheld; the citation lens's separate "repo isn't a satellite" ground was rejected as contradicting the audit's fixed framing. Substance folded into H-2 and G-1.
2. **"VITE_CLIENT_SECRET variable exists in .env.example, violating §1.13" (violation)** — killed 2–1. Empty, unreferenced template variable; no flow exists to send it; §4 requires actual secret material or bundle presence. Upheld; folded into H-1 at hygiene.
3. **"Students are created as local-authoritative identities with no spine ID" (gap)** — killed on §0 role-boundary grounds despite verbatim-verified evidence. **Overridden by Fable:** the kill contradicts the audit spec's explicit D5 mandate to judge UI flows against §1.9/§1.10 as readiness items. Reinstated as G-8.
4. **"Staff/teachers and system users are created and edited as local-authoritative records" (gap)** — same kill ground, same override. Reinstated into G-8.
5. **"Exhaustive inventory closes D2/D4's open call-site question…" (gap)** — killed correctly: an inventory note, not a finding. Its live-PII discovery survives inside H-5; its call-site inventory is reflected in the coverage notes.
