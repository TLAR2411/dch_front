# Frontend Satellite-Readiness Audit — Design

**Date:** 2026-07-09
**Repo:** `dch_front/WEB` (Vue 3 + Vuetify + Vite SPA, `pos-system`)
**Reference contract:** `satellite-playbook.md` (repo root) — Dewey Spine Satellite Playbook, generated from `dewey-edu-core` @ `e7120ee`

## 1. Purpose

Readiness gap analysis of this frontend against the Dewey spine satellite contract. The repo has **no spine integration today** (no `dewey_edu_core` calls, no OAuth/PKCE, no spine URLs). The audit therefore has two jobs:

1. **Compliance:** run the playbook's static frontend checklist (F1–F4) as written and report pass/fail with evidence.
2. **Gap analysis:** identify everything in the current codebase that conflicts with becoming a satellite frontend, and everything that must be built, as a prioritized remediation backlog.

Playbook mode: **AUDIT, static only** (§2). The §3 dynamic probes require staging credentials and a running satellite backend; neither exists. Per §0, they are reported as "requires staging", never skipped silently.

## 2. Confirmed assumptions

- **Users are spine-known humans** (Frappe users / employees). Consequence: the existing username/password login (`authStore.login`, `VITE_LOGIN_USERNAME`/`VITE_LOGIN_PASSWORD`) is assessed as a **gate-blocker** under §4 ("local password storage … for spine-known humans") and §1.13, not as acceptable local auth.
- **Deliverable is report + backlog only.** No code changes in this project; remediation is a separate follow-up project.
- Audit surface includes committed artifacts (`.env.example`, `stats.html`, `index.html`, `public/`), git history (1 commit at design time), and a **fresh production build** (`npm run build` → `dist/`), since F1 names built bundles as audit surface.

## 3. Orchestration model

Subagent-driven. **Fable is architect and lead engineer**: authors every worker rubric, runs the workflow, dedupes, hand-verifies gate-blocker evidence, and writes the deliverables. Workers are **opus or below**, assigned by Fable's confidence per model:

- **haiku** — deterministic pattern sweeps only, with exact patterns authored by Fable.
- **sonnet** — structured read-against-rubric work (flow tracing, call-site inventory, verification).
- **opus** — judgment-heavy work (SoR boundary analysis, gap design, severity adjudication).

Workers never interpret the playbook themselves; each rubric embeds the exact playbook excerpts it enforces.

## 4. Audit dimensions

| # | Dimension | Checks | Playbook | Model |
|---|-----------|--------|----------|-------|
| D1 | Secret & credential hygiene | Sweep `src/`, `public/`, `.env*`, `index.html`, `stats.html`, git history for `api_secret` / `APP_SECRET` / `webhook_secret` / `client_secret`, hardcoded keys, passwords, encryption secrets | F1 | haiku |
| D2 | Network call surface | Inventory every call site (axios, ofetch, supabase-js, raw fetch, map SDK tokens); any spine URL or `Bearer`-to-`/api/v1` construction; destination of each call | F1, F4 | sonnet |
| D3 | Auth model vs §1.13 | Trace login end-to-end: `authStore`, `accessToken` util, `encrypteData`/crypto-js, refresh flow, `X-CLIENT-ID`, `VITE_CLIENT_SECRET` / `VITE_LOGIN_*`; absence of PKCE; password handling for spine-known humans | F2, F3 | sonnet |
| D4 | Client-side data plane | Direct browser→Supabase usage and what data flows there; localStorage / pinia-persistedstate of tokens & PII; MSW worker in prod build | §1.14 spirit | sonnet |
| D5 | SoR boundary in the UI | Locally authoritative person/enrollment/money-like state (loanStore, people, invoices); medical/allergy fields; local person-creation flows | §1.9, §1.10 | opus |
| D6 | Missing satellite plumbing (gap list) | What must exist and doesn't: PKCE flow, backend-proxy pattern, spine 422 verbatim surfacing, orphaned-record UX | §1.13, §1.14, §1.3 | opus |
| D7 | Build & artifact surface | Scan freshly built `dist/` for secrets / spine refs; PWA service-worker caching of auth routes | F1 | haiku scan + sonnet interpretation |

## 5. Workflow phases

- **Phase 0 — Prep (Fable, inline).** Best-effort `npm run build` (failure → recorded audit limitation, not a blocker); snapshot file inventory; author worker rubrics.
- **Phase 1 — Find.** All 7 dimension workers in parallel via the Workflow tool. Structured output schema per finding: `{dimension, severity, title, evidence: [{file, line, snippet}], playbook_ref, gate_blocking, recommendation}`.
- **Phase 2 — Dedupe + Verify.** Barrier after Phase 1 (dedupe needs the full set — D1/D3/D7 overlap on secrets). Fable dedupes by file+issue key in plain code. Each unique finding fans out to **3 adversarial refuters** with distinct lenses: factual (does the cited file:line show this? — sonnet), citation (is the playbook section correctly applied? — sonnet), severity (is the gate-blocking claim justified? — opus, gate-blockers only). Majority refute kills a finding; a 1–2 split keeps it marked `PLAUSIBLE` instead of `CONFIRMED`.
- **Phase 3 — Completeness critic (opus).** "Given F1–F4 and §4 verbatim, what did no dimension check?" Real misses trigger one more find round. Max 2 find rounds total.
- **Phase 4 — Synthesis (Fable, inline).** Fable re-reads the evidence for every surviving gate-blocker by hand, then writes the deliverables.

**Failure handling:** a dead/null worker is re-dispatched once, then recorded as a coverage gap in the report. Findings with unconfirmable evidence go to an "unconfirmed" appendix, never silently deleted.

## 6. Findings model

Severity ladder, tied to the playbook:

- **gate-blocker** — matches a §4 bullet (secrets in client bundles; local passwords for spine-known humans; …)
- **violation** — breaks a §1.13/§1.14 MUST outside the §4 list
- **hygiene** — against the contract's spirit (e.g., real-looking secrets committed in `.env.example`)
- **gap** — required plumbing that doesn't exist yet (feeds the readiness backlog)

Every finding carries: evidence `file:line` + snippet, playbook citation, verification status (`CONFIRMED` / `PLAUSIBLE`), and a recommendation.

## 7. Deliverables

Committed to this repo:

1. **`docs/audit/2026-07-09-satellite-frontend-audit.md`** — executive summary; findings grouped by severity with evidence, citation, and verification status; explicit F1–F4 pass/fail table; "requires staging" section enumerating the §3 dynamic probes not runnable statically.
2. **`docs/audit/2026-07-09-remediation-backlog.md`** — prioritized (gate-blockers first), each item rough-sized S/M/L with dependency ordering (e.g., satellite backend proxy before PKCE login).

## 8. Out of scope

- Any code changes or fixes (separate follow-up project).
- §3 dynamic verification, the conformance suite, and all **[SPINE OPERATOR]** items.
- Backend audit (B1–B14) — this repo is frontend-only; where a frontend finding implies a backend obligation (e.g., the proxy), it appears in the backlog as a dependency, not as an audited finding.
