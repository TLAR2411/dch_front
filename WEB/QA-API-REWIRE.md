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

You need the branch: `git checkout feat/api-permission-layer` (or `main`, which
now carries it). The endpoints this frontend calls do not exist before it.

It should print `Server running on port 8080`. If it **exits** complaining
about missing permissions, the vocabulary migration has not been applied — the
server refuses to boot rather than 403 every user, which is deliberate.

`GET /health` returning 503 with `spine_feed` is **expected and unrelated** —
that is the spine event consumer, whose migration is deliberately not applied.

### Migrations (only matters on a fresh database)

All five are already applied to the shared database. On a fresh one, apply in
order — see `dch_app/docs/RUNBOOK.md`:

| Migration | What it does |
|---|---|
| `20260729000000_permission_vocabulary_and_parity_grants` | Seeds the permission vocabulary and grants. **Without it the server will not start.** |
| `20260801000000_delete_subjects_grades_permission` | One permission added later; same rule — the server will not start without it. |
| `20260802000000_rls_deny_all_public_schema` | Row-level security deny-all, and revokes the browser key's table grants. |
| `20260802000001_rls_revoke_public_execute_on_secdef` | Closes the `SECURITY DEFINER` bypass that RLS alone does not cover. |
| `20260803000000_storage_close_report_signatures` | Removes the public write/delete policies on the signature bucket. |

**Why the RLS ones matter to you as a tester:** once they are applied, any
surviving `supabase.from(...)` in the frontend returns **zero rows instead of
an error**. The screen renders blank, with no exception and no failed request
in the Network tab. There should be none left — `npm run conformance` in
`dch_front/WEB` proves it — but that is the failure mode to expect if one is
ever reintroduced.

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
| Terms | `/global/terms` | List loads in **start-date order**, and shows disabled terms as well as active ones. Create, edit, disable, delete. The school-day columns (total / weekend / holiday / school days) keep their values — and recompute when you change a term's dates. |
| Grade subjects | `/global/grade-subjects` | Each grade lists its subjects, with component subjects nested under their parent. Assign several subjects at once; remove one. **A removed subject must not come back on reload.** |
| Report footer (signatures) | any printable report | Names, roles and dates load and save. **Clearing a signature image must actually clear it** — save, reload, confirm it is still gone. This was broken and is now fixed. |
| Anything counting school days | term forms, score entry | Day counts are unchanged from before. These come from holidays + timetable, and a wrong branch or year filter shows as a count that is too high. |
| **Score entry (marks grid)** | score entry | **The highest-value screen on this list.** Columns appear per grading category with the right max scores; component subjects (Read/Write/Listen/Speak) nest under their parent. Enter marks, save, reload, confirm they persisted. A category with no assessment item yet gets one created on open — that must succeed silently, and the marks you then type must save. |
| Score entry — recommendations | score entry | Saved recommendations load for the selected term. **Check a term AND the "no period" case if your data has one** — they are different rows, and the wrong one showing is the failure. |
| Subject settings | `/global/subject-settings` | Rules list per grade/subject with categories and assessments. Edit percentages and max scores (single grade and several at once). Add assessments — the total is capped at the category max, now enforced server-side, so exceeding it returns a message rather than silently saving. |
| Subject settings — delete | same | Deleting a subject's rules removes its child subjects' rules and their assessments together. **If marks have been entered against them you will get a clear "N student scores…" message and nothing is deleted.** That is correct — it used to fail with an opaque error. |
| Signature image upload | any printable report | Upload a signature, crop, save. It should appear in the report and survive a reload. Non-image files are rejected. |

*(That is every screen. `npm run conformance` in `dch_front/WEB` asserts no
direct database access remains.)*

## Things that are deliberately different

Five behaviour changes are intentional. They are security fixes, not
regressions:

1. **Branch `*` now means "every branch you are entitled to"**, not every
   branch. Admins hold branches 1 and 2 and see no change. A user entitled to
   one branch will stop seeing other branches' data.
2. **Holiday lists exclude other branches' private events.** Public/national
   holidays are unaffected.
3. **Editing a teacher** rejects branch assignments outside your own
   entitlement.
4. **Terms belong to a branch.** Viewing, editing, disabling or deleting
   another branch's term now reports "not found". Before this branch any of
   those worked — including the delete, which is permanent. Users holding both
   branches (three of the eight) see no change.

5. **"All Branch" breaks create forms and the report footer.** With the navbar
   set to *All Branch*, creating a student/class/room/subject/term and loading
   the report footer return **400 "A specific branch is required"**. Pick a
   specific branch and they work.
   This is **NOT a regression** — it was already broken, just less clearly.
   Before, the literal string `"*"` was passed into an integer column and the
   request died as a 500. Same outcome, worse message. Whether "All Branch"
   should disable those buttons, or fall back to a primary branch, is an open
   product decision.

If a tester reports "I can see less than before" on any of the first four,
that is the fix working.

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

## Where to concentrate

If time is short, spend it on **writes**, not reads.

Every read on this branch has been verified against production data. The
writes — create a term, save the footer, assign and remove a grade subject,
save recommendations, save marks, upload a signature — are covered only by
unit tests that mock the database driver. That is exactly the arrangement that
once let a real bug sit behind 421 passing tests: the mocks encoded an
assumption about a return shape, and the assumption was wrong. One live
request found it immediately.

So: type something in, save it, reload the page, and check it is still there
and still correct. That is the test that has not been run.
