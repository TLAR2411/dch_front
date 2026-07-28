# QA: the API rewire

Every screen listed here used to query Postgres directly from the browser and
now goes through `dch_app`. **The UI was not redesigned** — same screens, same
buttons, same behaviour. If anything looks different, that is a bug, not a
feature.

## The one failure mode to watch for

A wrong response shape renders a screen **blank or empty** rather than throwing
an error. There is no red toast, no console exception — a table just has no
rows, or a dropdown has no options.

So the test is not "did it crash". It is:

> **Does this screen show the same data it showed before?**

If a list is empty, check whether it should be. Compare against production, or
against the same screen before these commits.

## Setup

Two processes.

**1. Backend** (`dch_app`)

```bash
cd dch_app
npm install
npm run dev            # http://localhost:8080
```

It should print `Server running on port 8080`. If it exits complaining about
missing permissions, the vocabulary migration has not been applied — see
`dch_app/docs/RUNBOOK.md`. (It has already been applied to the shared database,
so this only bites on a fresh one.)

`GET /health` returning 503 with `spine_feed` is **expected and unrelated** —
that is the spine event consumer, whose migration is deliberately not applied.

**2. Frontend** (`dch_front/WEB`)

```bash
cd dch_front/WEB
npm install            # REQUIRED: vue3-print-nb was added and may be missing
npm run dev
```

Point it at the local backend in `.env`:

```
VITE_API_URL=http://localhost:8080
```

**Do a production build too**, at least once:

```bash
npx vite build
```

Dev mode compiles lazily, per route — a broken import in a screen you do not
open will not surface. `vite build` compiles everything. That is how a broken
import in `SubjectsList.vue` survived from the very first commit until now.

## What changed, by screen

Work down the list. Each row is one commit's worth of change.

| Screen | Route | What to exercise |
|---|---|---|
| Students list | `/admin/students` | List loads. (A dead full-table fetch was removed — the visible list always came from the API.) |
| Student curriculum list | `/global/students` | Same. |
| Branches list | `/admin/branches` | List loads; create, edit, disable, delete. |
| Attendance reports — month / term / year | report screens | **Class roster appears with every student, in order.** This one had a real shape mismatch: the old query keyed students differently from the API. An empty or short roster is the symptom. |
| Any screen using weekday names | schedule//calendar pickers | Day-of-week options are present. |

*(More rows land here as the remaining screens are rewired.)*

## Things that are deliberately different

Three behaviour changes are intentional. They are security fixes, not
regressions:

1. **Branch `*` now means "every branch you are entitled to"**, not every
   branch. Admins hold branches 1 and 2 and see no change. A user entitled to
   one branch will stop seeing other branches' data.
2. **Holiday lists exclude other branches' private events.** Public/national
   holidays are unaffected.
3. **Editing a teacher** rejects branch assignments outside your own
   entitlement.

If a tester reports "I can see less than before" on any of those three, that is
the fix working.

## Known-broken before you start

Not caused by this work; do not spend time on them:

- **There are no user-management endpoints**, though a Users page exists and the
  `teacher` role holds twelve `*-users` permissions. Those gate UI only.
- Several pages are unreachable for everyone because they gate on permissions
  granted to no role: journals, chart-accounts, activity-log, currencies,
  departments, positions, account-types, and the address screens. That is
  deliberate — those modules were dark before and stay dark.

## Reporting a problem

Include:

1. Screen and route.
2. What you expected vs what rendered (**"empty table" is the important one**).
3. The failing request from the Network tab — URL, status, and response body.
4. Whether it also fails on `origin/main` (i.e. pre-existing).

Point 4 matters: this branch also fixes two pre-existing build failures, so not
everything odd is from the rewire.
