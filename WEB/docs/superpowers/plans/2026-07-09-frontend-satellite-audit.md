# Frontend Satellite-Readiness Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Orchestration note:** Task 3 invokes the `Workflow` tool, which only the main session (Fable) can call. Tasks 1–2 and 4–7 may be delegated; Task 3 must run inline.

**Goal:** Produce a verified satellite-readiness audit report and remediation backlog for this Vue SPA against `satellite-playbook.md`, using a 7-dimension subagent workflow with adversarial verification.

**Architecture:** Fable authors all rubrics and a single Workflow script; 7 dimension finders (haiku/sonnet/opus by task type) run in parallel, findings are deduped, adversarially verified by 2–3 refuter lenses each, checked by a completeness critic (one optional targeted second round), then Fable hand-verifies gate-blockers and writes the two deliverables.

**Tech Stack:** Claude Code Workflow tool (structured-output agents), Bash/grep, npm/Vite build, Markdown deliverables.

**Spec:** `docs/superpowers/specs/2026-07-09-frontend-satellite-audit-design.md`

## Global Constraints

- **Read-only audit:** never modify app source. Only create files under `docs/audit/` and the session scratchpad.
- **Static only:** never call any spine, staging, or external URL. The only executed build step is `npm run build` against already-installed `node_modules`.
- **Worker ceiling:** every subagent uses `haiku`, `sonnet`, or `opus` — exactly as assigned per dimension. Fable performs synthesis and gate-blocker sign-off personally; these are never delegated.
- **Fixed date literal:** `2026-07-09` in all filenames and document headers.
- **Deliverables (exact paths):** `docs/audit/2026-07-09-satellite-frontend-audit.md` and `docs/audit/2026-07-09-remediation-backlog.md`.
- **Confirmed assumption (severity calls depend on it):** app users are spine-known humans (Frappe users/employees).
- **Severity vocabulary (only these four):** `gate-blocker`, `violation`, `hygiene`, `gap` — defined in spec §6.
- `<SCRATCHPAD>` below means the session scratchpad directory printed in the system prompt.

---

### Task 1: Production build (audit surface prep)

**Files:**
- Create: `dist/` (build output, git-ignored; audit surface only)
- Create: `<SCRATCHPAD>/build-status.txt`

**Interfaces:**
- Produces: `BUILD_STATUS` — a one-line string, either `ok` or `failed: <one-line reason>`. Task 3 passes it verbatim as `args.buildStatus`; Task 5 reports it under Limitations.

- [ ] **Step 1: Run the production build (best-effort)**

Run (timeout 600000 ms):
```bash
npm run build 2>&1 | tail -25
```
Expected: Vite output ending in `✓ built in <N>s` (success) OR an error trace (failure). Either outcome is acceptable — a failed build is an audit limitation, not a blocker.

- [ ] **Step 2: Confirm whether dist/ exists**

```bash
ls dist/ 2>/dev/null | head -10 && du -sh dist/ 2>/dev/null
```
Expected on success: `index.html`, `assets/`, possibly `sw.js` / `manifest.webmanifest` / `mockServiceWorker.js`. On failure: no output.

- [ ] **Step 3: Record BUILD_STATUS**

Write `<SCRATCHPAD>/build-status.txt` containing exactly one line: `ok` if dist/ exists with assets, else `failed: <one-line reason from the build error>`.

No commit (nothing in the repo changed).

---

### Task 2: Author the audit workflow script

**Files:**
- Create: `<SCRATCHPAD>/satellite-audit-workflow.mjs` (`.mjs` so `node --check` parses ESM)

**Interfaces:**
- Consumes: nothing from earlier tasks (`buildStatus` arrives at run time via `args`).
- Produces: the script Task 3 invokes via `Workflow({scriptPath})`. Its return value shape (consumed by Tasks 4–6):
  ```
  {
    confirmed:   Finding[],   // verification.status === 'CONFIRMED'
    plausible:   Finding[],   // 'PLAUSIBLE' (split refuter vote)
    killed:      Finding[],   // majority-refuted (report appendix only)
    unconfirmed: Finding[],   // zero usable refuter votes
    deadDimensions: string[], // finder died twice → coverage gap
    inventory:  string,       // concatenated per-dimension coverage_notes
    critic:     {missed_checks: [{what, why_it_matters, suggested_commands}]},
    buildStatus: string
  }
  // Finding: {dimension, severity, title, evidence:[{file,line,snippet}],
  //           playbook_ref, gate_blocking, recommendation,
  //           verification:{status, votes:[{refuted, reasoning, corrected_severity?}]}}
  ```

- [ ] **Step 1: Write the complete script**

Write `<SCRATCHPAD>/satellite-audit-workflow.mjs` with exactly this content:

```js
export const meta = {
  name: 'satellite-frontend-audit',
  description: 'Static satellite-readiness audit: 7 dimension finders, adversarial verification, completeness critic',
  phases: [
    { title: 'Find', detail: '7 dimension workers (haiku/sonnet/opus)' },
    { title: 'Verify', detail: '2-3 adversarial refuter lenses per finding' },
    { title: 'Critic', detail: 'completeness check vs F1-F4 and section 4', model: 'opus' },
    { title: 'Round2', detail: 'targeted finders for critic misses (max 1 extra round)' },
  ],
}

const SEVERITIES = ['gate-blocker', 'violation', 'hygiene', 'gap']

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings', 'coverage_notes'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['dimension', 'severity', 'title', 'evidence', 'playbook_ref', 'gate_blocking', 'recommendation'],
        properties: {
          dimension: { type: 'string' },
          severity: { enum: SEVERITIES },
          title: { type: 'string' },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              required: ['file', 'line', 'snippet'],
              properties: {
                file: { type: 'string' },
                line: { type: 'integer', description: 'use 0 for minified/binary artifacts' },
                snippet: { type: 'string' },
              },
            },
          },
          playbook_ref: { type: 'string', description: 'e.g. "section 1.13", "F2", "section 4 bullet: Secrets hardcoded..."' },
          gate_blocking: { type: 'boolean' },
          recommendation: { type: 'string' },
        },
      },
    },
    coverage_notes: { type: 'string', description: 'what was checked, full inventory, explicit no-hit statements' },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refuted', 'reasoning'],
  properties: {
    refuted: { type: 'boolean' },
    reasoning: { type: 'string' },
    corrected_severity: { enum: SEVERITIES, description: 'only if the severity label is wrong but the finding is real' },
  },
}

const CRITIC_SCHEMA = {
  type: 'object',
  required: ['missed_checks'],
  properties: {
    missed_checks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['what', 'why_it_matters', 'suggested_commands'],
        properties: {
          what: { type: 'string' },
          why_it_matters: { type: 'string' },
          suggested_commands: { type: 'string' },
        },
      },
    },
  },
}

const BUILD = (args && args.buildStatus) || 'unknown'

const CONTEXT = `Repo root: /Users/lolbikb/projects/dch_front/WEB — a Vue 3 + Vuetify + Vite SPA ("pos-system").
This is a STATIC readiness audit against the Dewey Spine Satellite Playbook, which is the file satellite-playbook.md in the repo root. The app has NO spine integration today; part of your job is documenting conflicts and gaps for when it becomes a satellite frontend.
FIXED FACT for severity decisions: the app's users are spine-known humans (Frappe users / employees).
Severity ladder (use exactly these): gate-blocker = matches a bullet in playbook section 4 (pass/fail gate); violation = breaks a MUST in section 1.13/1.14 outside the section-4 list; hygiene = against the contract's spirit (e.g. committed credentials, false-security patterns); gap = required satellite plumbing that simply does not exist yet.
Rules: READ-ONLY — never modify files. Every evidence entry must cite a real file and line you actually read (line 0 only for minified artifacts). Do not speculate: if you cannot evidence a claim, put it in coverage_notes instead of findings. Never call any network URL.
Return results ONLY via the structured output schema.`

// ---------------------------------------------------------------------------
// Dimension rubrics (D1-D6; D7 is a two-stage special case below)
// ---------------------------------------------------------------------------
const DIMENSIONS = [
  {
    key: 'D1-secrets', model: 'haiku',
    prompt: `Secret and credential hygiene sweep (playbook F1, section 1.14).
Playbook excerpt you enforce: "No spine secrets in client bundles: api_secret, APP_SECRET, webhook_secret, client_secret (there is no client secret — PKCE), or issued key values." and F1: "grep -rn 'dewey_edu_core.api.v1|api_secret|APP_SECRET|webhook_secret|client_secret' <frontend dirs> dist/ — all empty, including built bundles."
Run these exact commands from the repo root and report hits:
1. grep -rn -E "api_secret|APP_SECRET|webhook_secret|client_secret" src public index.html vite.config.js themeConfig.js .env.example
2. cat .env.example   (report EVERY populated credential-looking value: passwords, secrets, API keys, client IDs)
3. grep -c "" stats.html && grep -n -o -E "AIza[0-9A-Za-z_-]{30,}|password[^,<]{0,40}|secret[^,<]{0,40}" stats.html | head -40
4. git log -p --all | grep -n -iE "password.?=|secret.?=|api_key|AIza" | head -60
5. grep -rn -E "AIza[0-9A-Za-z_-]{30,}" src .env.example public index.html
Severity rules for this dimension: a spine-issued secret name/value (api_secret, APP_SECRET, webhook_secret) anywhere = gate-blocker (section 4: "Secrets hardcoded or present in client bundles"). The VITE_CLIENT_SECRET variable existing at all (even empty) = violation of section 1.13 ("no client_secret — public client"). Committed non-spine credentials (login password, encryption secret, Google Maps key) = hygiene, gate_blocking=false. One finding per distinct credential, exact file:line each.`,
  },
  {
    key: 'D2-network-surface', model: 'sonnet',
    prompt: `Network call-surface inventory (playbook F1, F4, section 1.14).
Playbook excerpts you enforce: "No /api/v1 calls from browser/mobile code — ever. The frontend talks to the satellite's own backend, which proxies to the spine." and F4: "No Bearer header construction targeting /api/v1; all spine calls originate server-side."
Steps:
1. grep -rn -E "axios|ofetch|fetch\\(|XMLHttpRequest|WebSocket|EventSource|createClient" src index.html | head -60
2. Read in full: src/utils/api.js, src/utils/supabase.js, src/server/api/[...slug].js
3. grep -rn "import.meta.env" src | head -40   (every env-configured endpoint/credential)
4. grep -rn -E "dewey_edu_core|/api/v1|api/method" src public index.html
5. grep -rn -E "Authorization|Bearer" src | head -30
Findings: only actual violations/hygiene you can cite (any spine URL client-side; any Bearer construction toward a spine URL; anything else concretely wrong at a call site).
coverage_notes MUST contain the complete inventory: every distinct base URL / SDK / worker, what auth each uses, what data crosses it — and an explicit statement if NO spine calls and NO /api/v1 Bearer construction exist (that is the F1/F4 pass evidence).`,
  },
  {
    key: 'D3-auth-model', model: 'sonnet',
    prompt: `Authentication model vs playbook section 1.13, F2, F3. Users ARE spine-known humans (Frappe users/employees).
Playbook excerpts you enforce: "MUST NOT: store local passwords for spine-known humans (no password hash columns on guardian/staff models, no 'forgot password' route for them), offer phone-first OTP login (deferred platform-wide), or use human OAuth tokens against /api/v1". Section 4 gate bullet: "Local password storage or phone-first login for spine-known humans". F2: "code_challenge_method -> S256 only; code_verifier present in the token request; no client_secret anywhere in the flow; verifier not persisted/logged".
Steps:
1. Read in full: src/stores/authStore.js, src/utils/accessToken.js, .env.example
2. Find and read the encryption util: ls src/utils/ then read the file matching encrypt* in src/utils/
3. Find login UI + guards: grep -rln -iE "login|signin|logout" src/pages src/views src/router src/navigation | head; read the login page and any router auth guard you find.
4. grep -rn -iE "forgot|reset.?password|otp|one.?time" src --include=*.vue --include=*.js | head -20
5. grep -rn -iE "pkce|code_challenge|code_verifier|oauth" src
Expected findings to confirm or refute WITH evidence:
(a) username/password login flow for spine-known humans -> gate-blocker (section 4 bullet above);
(b) VITE_CLIENT_SECRET + VITE_LOGIN_USERNAME/VITE_LOGIN_PASSWORD env vars -> violation (1.13) / hygiene;
(c) total absence of OAuth2+PKCE -> gap ("PKCE login flow must be built"), cite the current login call site as the hook point;
(d) access/refresh token persistence mechanism (localStorage? cookies? encrypted?) -> hygiene finding describing it;
(e) any forgot-password or OTP entry point -> gate-blocker.
Exact file:line for everything.`,
  },
  {
    key: 'D4-data-plane', model: 'sonnet',
    prompt: `Client-side data plane (playbook section 1.14 spirit: "The frontend talks to the satellite's own backend, which proxies to the spine").
Steps:
1. Supabase: grep -rln "supabase" src --include=*.js --include=*.vue | head; read each hit; document which tables/buckets/channels the BROWSER touches directly and what data flows (PII? money? files?).
2. Persistence: grep -rn -i "persist" src/stores src/plugins src/main.js | head -20; determine which pinia stores persist to localStorage and whether tokens or PII are included (pinia-plugin-persistedstate is a dependency).
3. MSW: check package.json scripts (postinstall runs msw init), ls public/ for mockServiceWorker.js, and grep -rn -iE "msw|mockServiceWorker|setupWorker" src index.html — decide whether the mock worker can ship/register in production builds.
4. crypto-js: read the encryption util in src/utils/; where does its key come from (VITE_ env var inlined into the bundle at build time?) and what does it protect?
Findings: direct browser-to-third-party data plane = hygiene/architecture concern for satellite readiness (gate_blocking=false, playbook_ref "section 1.14 spirit"); client-side encryption whose key ships in the bundle = hygiene (false security); mock service worker registrable in prod = hygiene. Full data-flow inventory goes in coverage_notes.`,
  },
  {
    key: 'D5-sor-boundary', model: 'opus',
    prompt: `System-of-record boundary judgment (playbook sections 1.9, 1.10; section 4 bullet: "Local authoritative invoices/payments/AR; local-only enrollment creation").
Playbook excerpts you enforce: "Never mint local identities for spine-known people."; SoR table: student/guardian/family/enrollment identity & status -> Spine; invoices/payments/GL -> Spine ("Display via money_read.* only; the ONLY money write is create_charge"); grades/daily-ops -> Satellite-local, "medical/allergy detail must never be sent to the spine"; staff/HR/payroll -> Spine.
Steps:
1. Read all of: src/stores/ (especially loanStore.js), src/services/dataService.js (the full endpoint inventory it defines).
2. ls -R src/pages src/views | head -80 to map entity CRUD surfaces (people, customers, vendors, loans, payments, staff, ...).
3. Read the 2-3 most person-like and money-like page/store flows you find.
Your job: identify every store/flow that will collide with spine ownership once this app is a satellite frontend:
(a) local person/staff/customer creation or editing -> severity=gap, recommendation explains the section 1.9 rework (spine ID as join key, creation via satellite backend -> spine);
(b) locally authoritative money state (loans, payments, invoices, AR) -> severity=gap citing the section 4 bullet;
(c) any medical/allergy-like fields and where they flow;
(d) staff/HR/payroll-like logic;
(e) enrollment-like state.
Each claim needs concrete file:line evidence. These are readiness findings (gate_blocking=false) — the app is not yet a satellite; your recommendations feed the remediation backlog, so make them specific and sequenced.`,
  },
  {
    key: 'D6-missing-plumbing', model: 'opus',
    prompt: `Missing satellite plumbing — the gap list (playbook sections 1.13, 1.14, 1.3).
Verify each absence with a search, then cite BOTH the absence and the exact current file:line where the replacement will hook in.
Checks (one finding each, severity=gap, gate_blocking=false, playbook_ref = the exact section):
(1) OAuth2 Authorization Code + PKCE flow — grep -rn -iE "pkce|code_challenge|code_verifier|openid|oauth" src. Required per 1.13: authorize via {SPINE_URL}/api/method/frappe.integrations.oauth2.authorize with code_challenge_method=S256; token via .../get_token with code_verifier and NO client_secret; identity via .../openid_profile. Hook point: the current login flow (read src/stores/authStore.js login action).
(2) Satellite-backend proxy pattern — per 1.14 the frontend must talk only to the satellite backend, which proxies the spine. Document today's direct-to-backend + direct-to-supabase topology (src/utils/api.js baseURL, src/utils/supabase.js) and what a proxy boundary must add.
(3) Verbatim spine 422 surfacing — per 1.14/1.3 the UI must surface spine 422 errors verbatim (codes: invalid_transition, invalid_fields, immediate_not_allowed). Check how API errors reach the user today (read the axios response interceptor in src/utils/api.js and one error-handling call site in src/services/dataService.js).
(4) Orphaned-record UX — per 1.3, not_found (404) is terminal ("mark local record orphaned; no retry", foreign-brand returns 404 never 403). Check current 404 handling in the interceptor.
(5) Display-only enrollment/billing views — per 1.14, spine-owned state shown in UI is display-only; changes go through the satellite backend (transition_enrollment / create_charge). Note where money-like views live today.
coverage_notes: anything you checked that is already satellite-compatible.`,
  },
]

const D7_SCAN_PROMPT = `Built-artifact scan (playbook F1: "Built artifacts (dist/, bundles) are part of the audit surface"). Build status from the orchestrator: ` + BUILD + `.
If dist/ does not exist (ls dist/ fails), return zero findings and coverage_notes exactly: "dist/ absent — build status: ` + BUILD + `".
Otherwise run exactly, from repo root:
1. grep -rn -E "dewey_edu_core|api/method|api_secret|APP_SECRET|webhook_secret|client_secret" dist/ | head -30
2. grep -rln "Admin@168" dist/
3. grep -rln "Hsrxx3xmrF67" dist/
4. grep -rln -E "AIza[0-9A-Za-z_-]{30,}" dist/ | head
5. grep -rln "ngrok" dist/
6. ls dist/sw.js dist/mockServiceWorker.js dist/manifest.webmanifest 2>/dev/null; for any service worker file found, head -c 600 of it.
Report every hit verbatim in coverage_notes (file + matched string). Also emit one finding per hit from commands 1-5: severity=hygiene, gate_blocking=false, playbook_ref "F1", line 0, snippet = the matched string. The interpreter stage will correct severities.`

const D7_INTERPRET_PROMPT = `You receive a raw scan of the built dist/ bundle (below). Interpret it per playbook F1 and section 1.14 ("No spine secrets in client bundles... Built artifacts (dist/, bundles) are part of the audit surface") and emit the CORRECTED findings set for dimension D7-artifacts:
- spine secret names/values in the bundle -> gate-blocker (section 4: "Secrets hardcoded or present in client bundles");
- non-spine credentials baked into the bundle (login password, encryption secret, API keys, dev ngrok URLs) -> hygiene, but state clearly in the recommendation that these become gate-relevant the day spine credentials follow the same path;
- service worker / mock worker shipping in the build -> evaluate what it caches or intercepts (auth routes cached = hygiene finding);
- benign hits (e.g. the string "token" in a library) -> drop, but record the dismissal in coverage_notes.
Verify questionable hits yourself by reading the cited dist/ file regions. line 0 with snippet is acceptable evidence for minified bundles.
RAW SCAN RESULT:
`

// ---------------------------------------------------------------------------
// Phase 1: Find (barrier — dedupe needs the full set; D1/D3/D7 overlap on secrets)
// ---------------------------------------------------------------------------
phase('Find')

async function findOnce(dim) {
  const run = () => agent(CONTEXT + '\n\nDIMENSION ' + dim.key + '\n' + dim.prompt, {
    label: 'find:' + dim.key, phase: 'Find', model: dim.model, schema: FINDINGS_SCHEMA,
  })
  let r = await run()
  if (!r) { log('finder ' + dim.key + ' died — re-dispatching once'); r = await run() }
  return r ? { dim: dim.key, ...r } : null
}

async function runD7() {
  const scanCall = () => agent(CONTEXT + '\n\nDIMENSION D7-artifacts (scan stage)\n' + D7_SCAN_PROMPT, {
    label: 'find:D7-scan', phase: 'Find', model: 'haiku', schema: FINDINGS_SCHEMA,
  })
  let scan = await scanCall()
  if (!scan) { log('D7 scanner died — re-dispatching once'); scan = await scanCall() }
  if (!scan) return null
  const interp = await agent(
    CONTEXT + '\n\nDIMENSION D7-artifacts (interpret stage)\n' + D7_INTERPRET_PROMPT + JSON.stringify(scan, null, 2),
    { label: 'find:D7-interpret', phase: 'Find', model: 'sonnet', schema: FINDINGS_SCHEMA },
  )
  return { dim: 'D7-artifacts', ...(interp || scan) }
}

const found = await parallel([
  ...DIMENSIONS.map(d => () => findOnce(d)),
  () => runD7(),
])

const dimKeys = [...DIMENSIONS.map(d => d.key), 'D7-artifacts']
const deadDimensions = dimKeys.filter((k, i) => !found[i])
if (deadDimensions.length) log('COVERAGE GAP — dead dimensions: ' + deadDimensions.join(', '))

const allFindings = found.filter(Boolean).flatMap(r =>
  (r.findings || []).map(f => ({ ...f, dimension: r.dim })))
const inventory = found.filter(Boolean).map(r => '## ' + r.dim + '\n' + r.coverage_notes).join('\n\n')

// Dedupe (exact-ish; Fable merges remaining near-dupes at synthesis)
function keyOf(f) {
  const file = (f.evidence && f.evidence[0] && f.evidence[0].file) || 'global'
  const slug = f.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
  return file + '|' + f.playbook_ref + '|' + slug
}
const seen = new Set()
const unique = []
for (const f of allFindings) {
  const k = keyOf(f)
  if (!seen.has(k)) { seen.add(k); unique.push(f) }
}
log('findings: ' + allFindings.length + ' raw -> ' + unique.length + ' after dedupe')

// ---------------------------------------------------------------------------
// Phase 2: Adversarial verification (2 lenses; 3 for gate-blockers)
// ---------------------------------------------------------------------------
phase('Verify')

function refuterPrompt(f, lens) {
  const fj = JSON.stringify(f, null, 2)
  const base = 'You are an ADVERSARIAL refuter in repo /Users/lolbikb/projects/dch_front/WEB. Your default stance is refuted=true; only return refuted=false if you positively confirm. READ-ONLY.\nFINDING UNDER TEST:\n' + fj + '\n\n'
  if (lens === 'factual') {
    return base + 'FACTUAL LENS: Read every cited evidence file at the cited line (for line 0 minified artifacts, grep the snippet in the file). refuted=true if any evidence does not exist where cited, the snippet misrepresents the code, or the described behavior is not what the code does. Explain exactly what you checked.'
  }
  if (lens === 'citation') {
    return base + 'CITATION LENS: Open satellite-playbook.md and read the section cited in playbook_ref in full. refuted=true if that section, read verbatim, does not support this finding as stated (wrong section, overreach beyond what the text requires, or the requirement targets the backend not the frontend). If the finding is real but mislabeled, set refuted=false and corrected_severity.'
  }
  return base + 'SEVERITY LENS: Read section 4 (pass/fail gate) of satellite-playbook.md verbatim. FIXED FACT: this app\'s users are spine-known humans (Frappe users/employees). refuted=true if this finding does not genuinely match a section-4 bullet. If it is real but below gate level, refuted=false with corrected_severity.'
}

async function verifyFinding(f) {
  const lenses = f.gate_blocking ? ['factual', 'citation', 'severity'] : ['factual', 'citation']
  const votes = await parallel(lenses.map(lens => () =>
    agent(refuterPrompt(f, lens), {
      label: 'verify:' + lens + ':' + f.title.slice(0, 28),
      phase: 'Verify',
      model: lens === 'severity' ? 'opus' : 'sonnet',
      schema: VERDICT_SCHEMA,
    })))
  const v = votes.filter(Boolean)
  const refutes = v.filter(x => x.refuted).length
  let status
  if (v.length === 0) status = 'unconfirmed'
  else if (refutes === 0) status = 'CONFIRMED'
  else if (refutes * 2 > v.length) status = 'killed'
  else status = 'PLAUSIBLE'
  return { ...f, verification: { status, votes: v } }
}

const verified = (await parallel(unique.map(f => () => verifyFinding(f)))).filter(Boolean)

// ---------------------------------------------------------------------------
// Phase 3: Completeness critic (opus) + optional targeted Round 2
// ---------------------------------------------------------------------------
phase('Critic')

const surviving = verified.filter(x => x.verification.status !== 'killed')
const critic = await agent(
  CONTEXT + '\n\nYou are the COMPLETENESS CRITIC. Read satellite-playbook.md sections 2 (items F1-F4), 1.13, 1.14, and 4 VERBATIM from the file. Below is what the audit covered and found. List every concrete check those sections require that NO dimension performed (an uncovered file class, an unswept pattern, an unexamined flow). Do not relist covered ground; return an empty list if coverage is complete.\n\nDIMENSION COVERAGE NOTES:\n' + inventory + '\n\nSURVIVING FINDINGS:\n' + surviving.map(x => '- [' + x.severity + '] ' + x.title + ' (' + x.playbook_ref + ')').join('\n'),
  { label: 'completeness-critic', phase: 'Critic', model: 'opus', schema: CRITIC_SCHEMA },
)

let round2 = []
const misses = ((critic && critic.missed_checks) || []).slice(0, 6)
if (misses.length) {
  phase('Round2')
  log('critic found ' + misses.length + ' missed checks — running one targeted round')
  const extra = await parallel(misses.map((m, i) => () =>
    agent(CONTEXT + '\n\nDIMENSION R2-' + (i + 1) + '\nPerform EXACTLY this one missed check and report findings:\nWHAT: ' + m.what + '\nWHY IT MATTERS: ' + m.why_it_matters + '\nSUGGESTED COMMANDS: ' + m.suggested_commands, {
      label: 'find:R2-' + (i + 1), phase: 'Round2', model: 'sonnet', schema: FINDINGS_SCHEMA,
    })))
  const extraFindings = extra.filter(Boolean).flatMap((r, i) =>
    (r.findings || []).map(f => ({ ...f, dimension: 'R2-' + (i + 1) })))
  const fresh = []
  for (const f of extraFindings) {
    const k = keyOf(f)
    if (!seen.has(k)) { seen.add(k); fresh.push(f) }
  }
  log('round 2: ' + extraFindings.length + ' found, ' + fresh.length + ' fresh — verifying')
  round2 = (await parallel(fresh.map(f => () => verifyFinding(f)))).filter(Boolean)
}
// Max 2 find rounds total (spec section 5): no further critic pass after Round2.

// ---------------------------------------------------------------------------
// Return everything; Fable synthesizes outside the workflow
// ---------------------------------------------------------------------------
const all = verified.concat(round2)
const byStatus = s => all.filter(x => x.verification.status === s)
return {
  confirmed: byStatus('CONFIRMED'),
  plausible: byStatus('PLAUSIBLE'),
  killed: byStatus('killed'),
  unconfirmed: byStatus('unconfirmed'),
  deadDimensions,
  inventory,
  critic,
  buildStatus: BUILD,
}
```

- [ ] **Step 2: Syntax-check the script**

```bash
node --check <SCRATCHPAD>/satellite-audit-workflow.mjs && echo SYNTAX_OK
```
Expected: `SYNTAX_OK`. (Top-level `await` and `export` are valid ESM; the workflow globals `agent`/`parallel`/`phase`/`log`/`args` are unresolved identifiers, which `--check` does not evaluate.) If it fails, fix the reported syntax error and re-run.

No commit (scratchpad file).

---

### Task 3: Run the audit workflow and capture raw results

> **Must run inline in the main session (Fable)** — subagents cannot invoke the Workflow tool.

**Files:**
- Create: `<SCRATCHPAD>/audit-raw-results.json`

**Interfaces:**
- Consumes: `<SCRATCHPAD>/satellite-audit-workflow.mjs` (Task 2), `BUILD_STATUS` from `<SCRATCHPAD>/build-status.txt` (Task 1).
- Produces: `audit-raw-results.json` — the workflow return value (shape defined in Task 2), consumed by Tasks 4–6.

- [ ] **Step 1: Invoke the workflow**

Call the `Workflow` tool with:
```json
{
  "scriptPath": "<SCRATCHPAD>/satellite-audit-workflow.mjs",
  "args": { "date": "2026-07-09", "buildStatus": "<contents of build-status.txt>" }
}
```
Expected: tool returns immediately with a `runId` and task ID; progress visible via `/workflows`.

- [ ] **Step 2: Wait for completion and retrieve the result**

Wait for the completion `<task-notification>`; retrieve the final return value (TaskOutput with the workflow's task ID if not included in the notification). Expected: an object with keys `confirmed`, `plausible`, `killed`, `unconfirmed`, `deadDimensions`, `inventory`, `critic`, `buildStatus`.

If the run dies mid-flight: fix the reported error in the script file and relaunch with `{scriptPath, resumeFromRunId: "<runId>"}` — completed agents replay from cache.

- [ ] **Step 3: Persist raw results**

Write the full return value, pretty-printed, to `<SCRATCHPAD>/audit-raw-results.json`. Then sanity-check:
```bash
node -e "const r=require('<SCRATCHPAD>/audit-raw-results.json'); console.log('confirmed:',r.confirmed.length,'plausible:',r.plausible.length,'killed:',r.killed.length,'unconfirmed:',r.unconfirmed.length,'dead:',r.deadDimensions)"
```
Expected: non-zero confirmed count (this codebase cannot plausibly yield zero findings — a zero suggests schema/parse failure; investigate before proceeding), `dead: []` ideally.

No commit (scratchpad file).

---

### Task 4: Fable hand-verification of gate-blockers

> **Fable personally — never delegated** (spec §5 Phase 4).

**Files:**
- Create: `<SCRATCHPAD>/gate-blocker-review.md`

**Interfaces:**
- Consumes: `audit-raw-results.json`.
- Produces: `gate-blocker-review.md` — one line per gate-blocker: `KEEP | DOWNGRADE to <severity> | DROP` + one-sentence justification. Task 5 applies these decisions verbatim.

- [ ] **Step 1: List the candidates**

From `audit-raw-results.json`, collect every finding in `confirmed` and `plausible` where `gate_blocking === true` OR `severity === "gate-blocker"`.

- [ ] **Step 2: Re-read the evidence for each**

For each candidate: `Read` every cited evidence file at the cited lines yourself; re-read the cited playbook section in `satellite-playbook.md`. Decide: KEEP (evidence and citation both hold), DOWNGRADE (real but not a §4 match — set corrected severity), or DROP to the unconfirmed appendix (evidence doesn't hold).

- [ ] **Step 3: Record decisions**

Write `<SCRATCHPAD>/gate-blocker-review.md`:
```markdown
# Gate-blocker hand-review — 2026-07-09
| Finding title | Decision | Justification |
|---|---|---|
| ... | KEEP | evidence at file:line confirmed; matches §4 bullet "..." |
```
Expected: every gate-blocker candidate has exactly one row. No commit (scratchpad file).

---

### Task 5: Write the audit report

**Files:**
- Create: `docs/audit/2026-07-09-satellite-frontend-audit.md`

**Interfaces:**
- Consumes: `audit-raw-results.json`, `gate-blocker-review.md`, `build-status.txt`.
- Produces: the committed report; Task 6's backlog cites finding IDs (`GB-1…`, `V-1…`, `H-1…`, `G-1…`) assigned here.

- [ ] **Step 1: Write the report from this exact skeleton**

Fill every `{{...}}` slot from the raw results + hand-review; assign stable finding IDs by severity group (`GB-n` gate-blockers, `V-n` violations, `H-n` hygiene, `G-n` gaps). Findings killed by refuters go to Appendix B with title + one-line refutation reason; DROPped gate-blockers move to Appendix A (Unconfirmed) with the hand-review justification.

```markdown
# Satellite Frontend Readiness Audit — dch_front/WEB

**Date:** 2026-07-09 · **Mode:** AUDIT, static only (playbook §2) · **Contract:** `satellite-playbook.md` (spine `dewey-edu-core` @ `e7120ee`)
**Method:** 7-dimension subagent audit (haiku/sonnet/opus workers), 2–3-lens adversarial verification per finding, opus completeness critic, Fable hand-verification of all gate-blockers. Assumption confirmed by owner: app users are spine-known humans (Frappe users/employees).

## Executive summary

{{3-6 sentences: overall readiness posture, count of findings by severity, the headline gate-blockers, and the single most important next step.}}

## F1–F4 checklist results

| Item | Playbook check | Result | Evidence |
|---|---|---|---|
| F1 | No spine calls or secrets client-side (incl. dist/) | {{PASS / FAIL / PASS-with-notes}} | {{summary + finding IDs}} |
| F2 | PKCE correctness | {{typically: N/A — no PKCE flow exists (gap G-n)}} | {{...}} |
| F3 | No local auth for spine-known humans | {{typically: FAIL (GB-n)}} | {{...}} |
| F4 | Human tokens never reach /api/v1 | {{PASS / FAIL}} | {{...}} |

F2 note: "N/A" is not a pass — the flow is absent and must be built (see gap findings); a literal grep "passes" only vacuously.

## Findings

{{One subsection per severity group, findings ordered by ID. Each finding:}}

### {{ID}}: {{title}}
- **Severity:** {{severity}} · **Verification:** {{CONFIRMED/PLAUSIBLE}} ({{n}} refuter lenses{{, hand-verified by Fable if gate-blocker}})
- **Playbook:** {{playbook_ref + short verbatim quote}}
- **Evidence:** {{file:line — snippet, one bullet per evidence item}}
- **Recommendation:** {{recommendation}}

## Requires staging (not runnable statically)

Frontend-relevant §3 probes deferred until a satellite backend + staging credentials exist:
- §3.2.8 — duplicate-person flow via the UI (409 surfaced, candidates shown, human-gated confirm)
- §3.2.13 — invalid enrollment transition: UI shows the spine's 422 verbatim, no local state flip
- §3.2.14 — full SSO walkthrough (S256 challenge, code_verifier in token request, no client_secret, correct user resolution, no local password form)
- §3.1 conformance suite and the remaining §3.2/§3.3 probes are backend/spine-operator scope (out of scope per spec §8)

## Coverage & limitations

- Build status: {{ok / failed: reason — if failed, dist/ audit did not run (D7 degraded)}}
- Dead dimensions (coverage gaps): {{none / list}}
- Completeness critic: {{n}} missed checks found and {{run in Round 2 / none}}
- Dedupe/merge notes: {{near-duplicates merged at synthesis, if any}}

## Appendix A — Unconfirmed findings

{{Findings with unconfirmable evidence or DROPped at hand-review — title, why unconfirmed. "None." if empty.}}

## Appendix B — Killed by adversarial verification

{{Titles + one-line refutation reason. Kept for audit-trail honesty. "None." if empty.}}
```

- [ ] **Step 2: Self-check the report**

```bash
grep -n -E "\{\{|TBD|TODO" docs/audit/2026-07-09-satellite-frontend-audit.md
```
Expected: no output (every slot filled). Also confirm: every `confirmed`+`plausible` finding from the raw results appears exactly once (count them), and every gate-blocker row cites the hand-review decision.

- [ ] **Step 3: Commit**

```bash
git add docs/audit/2026-07-09-satellite-frontend-audit.md
git commit -m "docs: add satellite frontend readiness audit report

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Write the remediation backlog

**Files:**
- Create: `docs/audit/2026-07-09-remediation-backlog.md`

**Interfaces:**
- Consumes: the committed report (finding IDs), `audit-raw-results.json` recommendations.
- Produces: the committed backlog — the input artifact for the future remediation project.

- [ ] **Step 1: Write the backlog from this exact skeleton**

Rules: every gate-blocker and violation gets an item; every gap finding gets an item; hygiene findings may be grouped into one cleanup item where they share a fix (e.g. "scrub committed credentials"). Order: gate-blockers first, then dependency order (an item listing a dependency appears after it). Sizes: S ≤ half a day, M ≤ 3 days, L > 3 days, as a rough single-engineer estimate.

```markdown
# Satellite Remediation Backlog — dch_front/WEB

**Date:** 2026-07-09 · **Source:** `2026-07-09-satellite-frontend-audit.md` (finding IDs referenced below)
**Ordering:** gate-blockers first, then dependency order. Sizes: S ≤ 0.5d, M ≤ 3d, L > 3d.

| # | Item | Findings | Size | Depends on |
|---|---|---|---|---|
| 1 | {{...}} | {{GB-1}} | {{M}} | — |
| 2 | ... | ... | ... | {{#1}} |

## Item details

### 1. {{Item title}}
- **Resolves:** {{finding IDs}}
- **What:** {{2-4 sentences: the change, its target end-state, playbook section it satisfies}}
- **Depends on:** {{— or item #s, with one clause saying why}}
- **Acceptance:** {{the static check or behavior that proves it done, e.g. "grep for VITE_CLIENT_SECRET returns nothing; F2 walkthrough passes on staging"}}
```

- [ ] **Step 2: Self-check the backlog**

```bash
grep -n -E "\{\{|TBD|TODO" docs/audit/2026-07-09-remediation-backlog.md
```
Expected: no output. Cross-check: every GB-/V-/G- finding ID from the report appears in some item's **Resolves** line; no dependency cycles (item N only depends on items < N).

- [ ] **Step 3: Commit**

```bash
git add docs/audit/2026-07-09-remediation-backlog.md
git commit -m "docs: add satellite remediation backlog

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Spec-coverage verification and close-out

**Files:**
- Modify (only if gaps found): the two `docs/audit/` deliverables

**Interfaces:**
- Consumes: spec `docs/superpowers/specs/2026-07-09-frontend-satellite-audit-design.md`, both deliverables.
- Produces: final verified deliverables; close-out summary to the user.

- [ ] **Step 1: Check deliverables against the spec, section by section**

For each spec section (§1 purpose, §2 assumptions, §4 dimensions, §5 phases incl. failure handling, §6 findings model, §7 deliverables, §8 out-of-scope): point to where the deliverables satisfy it. Specifically verify: F1–F4 table has all 4 rows; "Requires staging" section present; unconfirmed + killed appendices present; every dimension D1–D7 appears in the report's coverage notes or findings; both severity vocabularies match spec §6 exactly.

- [ ] **Step 2: Fix any gaps found**

Edit the deliverable(s) directly; then re-run both self-check greps from Tasks 5–6. Expected: no output.

- [ ] **Step 3: Final commit (only if Step 2 changed files)**

```bash
git add docs/audit/ && git commit -m "docs: audit close-out fixes from spec-coverage check

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Report to user**

Summarize: findings count by severity, F1–F4 results, the headline gate-blockers, top-3 backlog items, and coverage limitations. Offer the remediation project as the natural follow-up.
