# Satellite Remediation Backlog — dch_front/WEB

**Date:** 2026-07-09 · **Source:** `2026-07-09-satellite-frontend-audit.md` (finding IDs referenced below)
**Ordering:** go-live blockers are flagged ★; items are sequenced by dependency, with independent hygiene wins first. Sizes: S ≤ 0.5d, M ≤ 3d, L > 3d (single-engineer rough estimate).

| # | Item | Findings | Size | Depends on |
|---|---|---|---|---|
| 1 | Fix the broken production build; add a bundle secret-scan step | G-10 | S | — |
| 2 | Rotate and scrub committed credentials in `.env.example` | H-1 | S | — |
| 3 | Delete the dormant local password login path and dead auth artifacts | H-2 | S | — |
| 4 | Token hygiene: single storage helper, no token/PII logging, lint guard | H-3 | S | — |
| 5 | Remove Mock Service Worker from production builds | H-6 | S | — |
| 6 | Remove or relocate the client-side AES false-security layer | H-4 | S | #2 |
| 7 | Stand up the satellite-backend proxy boundary | G-2 | L | — (needs backend repo/runtime decision) |
| 8 | Route browser→Supabase data access through the backend | H-5 | M | #7 |
| 9 | ★ Implement spine OAuth2 + PKCE SSO for all human login | G-1 | M | #7, spine sandbox registration (operator) |
| 10 | Spine error envelope: verbatim 422 surfacing + terminal-404 orphan UX | G-3, G-4 | M | #7 |
| 11 | Spine-ID identity rework for students, guardians/families, staff | G-8, G-6 | L | #7, #9 |
| 12 | ★ Enrollment re-architecture: create/transition via spine, event-converged local state | G-5 | L | #7, #10, #11 |
| 13 | ★ Money-boundary ruling and rework: `create_charge` + `money_read.*`, outbox/dedupe | G-7 | L | #7, #10, product ruling |
| 14 | Re-point spine-bound display surfaces; mark them with a convention | G-9 | M | #12, #13 |

## Item details

### 1. Fix the broken production build; add a bundle secret-scan step
- **Resolves:** G-10
- **What:** Repair the unresolvable import in `src/views/admin/subjects/SubjectsList.vue:2` (`./AddEditRoomsDialog.vue` does not exist; the directory holds `AddEditSubjectsDialog.vue`), get `npm run build` green, then run the F1 grep (`dewey_edu_core.api.v1|api_secret|APP_SECRET|webhook_secret|client_secret`) plus a pattern scan (AIza keys, ngrok hosts, the H-1 secret values) over `dist/`. Wire the scan into CI so every build re-verifies F1's bundle arm.
- **Depends on:** — (do first: it unblocks the only F1 arm this audit could not verify)
- **Acceptance:** `npm run build` succeeds; the dist/ greps return empty; the scan runs in CI.

### 2. Rotate and scrub committed credentials in `.env.example`
- **Resolves:** H-1
- **What:** Rotate the Google Maps API key and `VITE_ENCRYPTION_SECRET` (both live in git history — removal is not enough). Replace every populated value in `.env.example` with placeholders. Delete the `VITE_CLIENT_SECRET`, `VITE_LOGIN_USERNAME`, and `VITE_LOGIN_PASSWORD` variables entirely (a PKCE public client never has a client secret, per playbook §1.13).
- **Depends on:** —
- **Acceptance:** `grep -nE "CLIENT_SECRET|LOGIN_USERNAME|LOGIN_PASSWORD" .env.example src -r` returns nothing; no populated secret-looking value remains in `.env.example`; old key/secret confirmed revoked.

### 3. Delete the dormant local password login path and dead auth artifacts
- **Resolves:** H-2
- **What:** Remove (not comment) the commented username/password UI in `src/pages/login.vue:124-166`, the env-seeded form state (`login.vue:21-25`), the `authStore.login` password action (`authStore.js:31-88`), and the inert Forgot/Reset Password i18n keys. Google OAuth stays as the interim login until item #9 replaces it.
- **Depends on:** — (safe now; shrinks the §1.13 attack surface a re-enable would create)
- **Acceptance:** `grep -rniE "VITE_LOGIN_|forgot password|reset password" src` returns nothing; login page renders only the SSO button; app login still works.

### 4. Token hygiene: single storage helper, no token/PII logging, lint guard
- **Resolves:** H-3
- **What:** Consolidate on the `accessToken.js` helpers (delete the direct `localStorage.getItem("accessToken")` read at `authStore.js:14`); remove the token log at `authStore.js:109` and the payload logs at `:134,210-212`; add an ESLint `no-console` rule scoped to `src/stores/authStore.js`, `src/utils/accessToken.js`, and the future PKCE module.
- **Depends on:** —
- **Acceptance:** one storage key in use; `grep -n "console\." src/stores/authStore.js src/utils/accessToken.js` returns nothing; lint fails on a reintroduced `console.log` in those files.

### 5. Remove Mock Service Worker from production builds
- **Resolves:** H-6
- **What:** Gate `msw:init` behind a dev-only script (drop it from `postinstall`) or exclude `public/mockServiceWorker.js` from the build output.
- **Depends on:** —
- **Acceptance:** after item #1's build is green, `dist/mockServiceWorker.js` does not exist.

### 6. Remove or relocate the client-side AES false-security layer
- **Resolves:** H-4
- **What:** Delete `src/utils/encrypteData.js` and the dead `bootstrap1` decrypt path (`authStore.js:206-208`), or move genuinely secret-dependent work server-side. Coordinate with the backend, which currently encrypts the bootstrap payload with the shared key.
- **Depends on:** #2 (key rotation happens there)
- **Acceptance:** no `VITE_ENCRYPTION_SECRET` reference in `src/`; bootstrap flow works without client-side decrypt.

### 7. Stand up the satellite-backend proxy boundary
- **Resolves:** G-2
- **What:** Decide and build the real backend tier (the committed Nitro-style handlers in `src/server/` are dead code — wire them into an actual runtime or delete them). End state per §1.14: the browser talks only to the satellite's own backend; that backend is the sole holder of spine credentials and the sole caller of `/api/v1`. This is a cross-repo effort — most of it lands in the backend codebase, but this repo's egress must consolidate onto it.
- **Depends on:** — (architectural prerequisite for #8–#14)
- **Acceptance:** frontend has exactly one egress base URL (the satellite backend); `src/server/` dead code removed or actually served.

### 8. Route browser→Supabase data access through the backend
- **Resolves:** H-5
- **What:** Replace direct `supabase.from(...)` calls (students PII read at `StudentList.vue:96`, plus the schedule/holiday/branch/grading call sites listed in H-5) with satellite-backend endpoints. If Supabase remains the satellite's datastore, only the backend holds privileged access; any residual browser access is RLS-scoped and narrow.
- **Depends on:** #7
- **Acceptance:** `grep -rn "supabase.from" src` returns nothing (or only an approved RLS-scoped allowlist); `students` table unreachable from the browser.

### 9. ★ Implement spine OAuth2 + PKCE SSO for all human login
- **Resolves:** G-1 (go-live blocker)
- **What:** Build the §1.13 flow: authorize redirect to `{SPINE_URL}/api/method/frappe.integrations.oauth2.authorize` with `response_type=code`, `scope=all openid`, `code_challenge_method=S256`; token exchange via `get_token` with `code_verifier` and no client secret; identity via `openid_profile` keyed on the spine user. `code_verifier` generated per session, in memory only, never persisted or logged. Replaces the Supabase Google OAuth login (`login.vue:44-58`, `authStore.getSession`).
- **Depends on:** #7; spine sandbox registration with SSO client (spine operator)
- **Acceptance:** §3.2.14 staging walkthrough passes: S256 in the authorize redirect, `code_verifier` in the token request, no `client_secret`, session resolves to the correct spine user, no local password form.

### 10. Spine error envelope: verbatim 422 surfacing + terminal-404 orphan UX
- **Resolves:** G-3, G-4
- **What:** Rework the axios interceptor (`src/utils/api.js:132-176`) and service-layer error handling to parse the spine envelope (`message.error.code`), branch on the full §1.3 code list, render 422 messages (`invalid_transition`, `invalid_fields`, `immediate_not_allowed`) verbatim in the UI, and treat `not_found` as terminal — mark the spine-keyed local record orphaned, never retry. Stop swallowing errors into `undefined` returns (`dataService.js` pattern).
- **Depends on:** #7 (the envelope arrives via the proxy)
- **Acceptance:** §3.2.13 staging probe passes (422 shown verbatim, no local flip); a known-orphan ID renders an orphaned state without retry loops.

### 11. Spine-ID identity rework for students, guardians/families, staff
- **Resolves:** G-8, G-6
- **What:** Every person-creation path calls the spine through the backend: `create_student` (with `Idempotency-Key`), `create_guardian`/`create_family`/`add_family_member`; 409 `duplicate_candidates` surfaces candidates for human confirmation (§1.8) — never auto-`confirmed=true`. Replace the free-text father/mother fields (`CreateStudent.vue:63,530`) with a spine-backed guardian/family picker. Local rows carry and join on spine IDs. Staff/teacher screens become scoped reads of spine ERPNext data, not local masters (`CreateTeacher.vue:246`).
- **Design decision (2026-07-11):** Registration is its own page, separate from enrollment. The **Registration page** creates the person only — student + guardian/family via the spine registry writes above, persisting spine IDs — and contains **no curriculum/class selection**. The curriculum multi-select currently embedded in student creation (`CreateStudent.vue:473`) moves to the Enrollment page (item #12). Registration's output (a spine `student_id` linked to a family) is the input the Enrollment page operates on.
- **Depends on:** #7, #9 (creation flows sit behind authenticated backend sessions)
- **Acceptance:** zero person rows with NULL spine ID (§1.9 audit criterion); duplicate-create in the UI shows the 409 candidates with a human-gated confirm (§3.2.8); the registration form contains no enrollment fields.

### 12. ★ Enrollment re-architecture: create/transition via spine, event-converged local state
- **Resolves:** G-5 (go-live blocker)
- **What:** `students-classes-enrollment` / `students-curriculums-enrollment` writes (ClassesList.vue:108, StudentCurriculumList.vue:104, CreateStudent.vue:473) route through the backend to `registry_write.create_enrollment` / `transition_enrollment`; local class membership is keyed by spine `enrollment_id` and converges from `enrollment.*` events (including `resumed` → same state as `activated`) and re-reads — no authoritative local flips. Illegal transitions surface the spine's 422 verbatim (item #10).
- **Design decision (2026-07-11):** Enrollment is its own page, separate from registration (item #11). The **Enrollment page** operates on an already-registered student (looked up by spine `student_id`): pick an offering/period (via `catalog.*` reads through the backend), create the enrollment (`create_enrollment` with `Idempotency-Key`), and manage its lifecycle (`transition_enrollment`, with the applied → offered → enrolled → activated/suspended/resumed/completed/withdrawn states displayed from spine data). No person-creation fields on this page; an unregistered student routes the user to Registration first.
- **Depends on:** #7, #10, #11
- **Acceptance:** every enrollment row carries a spine `enrollment_id`; UI transition of an illegal state change shows the spine 422 and does not change local state; the enrollment page contains no person-creation fields.

### 13. ★ Money-boundary ruling and rework: `create_charge` + `money_read.*`, outbox/dedupe
- **Resolves:** G-7 (go-live blocker)
- **What:** First, a product ruling: which local money (GL/journals, loan/AR module) must appear on spine family statements vs. stays an isolated internal ledger. Spine-bound money becomes `charges.create_charge` calls (backend-side transactional outbox with a persisted dedupe key per §1.5 — the spine has no replay protection on `create_charge`) and is displayed via `money_read.*`. Retained internal ledgers are firewalled from billing/AR presentation. The loan module gets an explicit in/out-of-scope decision with the spine operator.
- **Depends on:** #7, #10, product ruling
- **Acceptance:** the ruling is documented; §3.2.7 staging probe (double-billing retry → exactly one charge) passes on the strength of the outbox; no UI presents local figures as the family's authoritative financial position.

### 14. Re-point spine-bound display surfaces; mark them with a convention
- **Resolves:** G-9
- **What:** Using the G-9 inventory: re-point ListJournal/TwoCardJournal/IncomeExpenseProfile money figures and the StudentList/StudentCurriculumList enrollment chips to satellite-backend reads of spine data; adopt a naming/comment convention distinguishing spine-bound reads from local masters (PeopleList, ChartAccountList) — and keep health fields (`bmi_status`) local per §1.10.
- **Depends on:** #12, #13 (the spine reads must exist to point at)
- **Acceptance:** each G-9 site sources from spine-backed endpoints; convention documented; no health/medical field appears in any spine-bound payload builder.
