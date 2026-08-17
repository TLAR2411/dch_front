# Subject Setting UX Update

**Date:** 2026-08-14  
**Scope:** Parent subjects with child subjects (Exam today; more categories later)  
**Goal:** Make the UI easier to understand **without breaking** existing create / edit / delete / assessment flows.

---

## Summary

The scoring model did not change:

| Level | Role (unchanged) |
|-------|------------------|
| **Parent subject** | Category **weights (%)** — should total **100%** |
| **Child subject** | Category **max scores** at **0%** — roll up into the parent category max |

What changed is guidance, validation timing, and a few usability fixes so admins can set this up safely—especially when a child currently has only **Exam** and may gain more categories later.

---

## Files changed

| File | Change |
|------|--------|
| `WEB/src/views/global/subjectsetting/AddEditSubjectSettingDialog.vue` | Child-aware create/edit dialog |
| `WEB/src/views/global/subjectsetting/SubjectSettingList.vue` | Create validation, rollup hint, mobile fixes, clearer labels |
| `WEB/src/plugins/i18n/locales/en.json` | New UI strings |
| `WEB/src/plugins/i18n/locales/km.json` | Khmer translations |
| `WEB/docs/subject-setting-ux-update.md` | This document |

**Not changed:** API endpoints (`grading-rule-store`, `grading-rule-sync`, settings list, cascade delete). Payload shape is the same.

---

## What was updated

### 1. Child-aware create / edit dialog

When the selected subject has a `parent_id` (child subject):

- Dialog title becomes **Add / Update Child Categories**
- Info banner explains: children use **0%**; max scores should sum to the parent category max
- **Percentage** field is disabled and forced to **0** on submit
- Alert shows child weight status instead of “Total Percentage / 100%”
- Subject field can be locked when opened from a row’s **+** button (`lock_subject`)
- Child subject is loaded via `subjects-show` and added to the dropdown (parent-only `subjects-all` list was not enough to label children)

Parent subject create/edit behavior is unchanged (still aims for 100%).

### 2. Same parent/child validation on **create**

Previously, max-score / 0% checks ran only on **update**.  
**Create** now runs `validateParentChildCategoryMaxScores` before `grading-rule-store`.

So invalid child % or mismatched parent/child max scores fail early with a clear message—same rules as edit.

### 3. Child max-score rollup on the parent

Under **Parent Categories**, when the subject has children, an alert shows per category:

`childSum / parentMax pts` with check or warning icon.

Example: Exam `95 / 100` → warning until children max scores match the parent.

### 4. Clearer list labels & empty states

- **Child** → **Child Subjects** + hint “Set max scores at 0% weight”
- **Category** → **Parent Categories** + hint “Weights should total 100%”
- Opening a parent with children auto-opens the **Child Subjects** panel first
- Children chip only shows when there is at least one child
- Empty child categories: guidance to add Exam (0%) first, more categories later

### 5. Bug fixes (behavior that already looked broken)

- Mobile parent **Add Rule** called edit instead of create — fixed
- Mobile **Edit** now always passes `grade_id`
- Contextual **+** uses `openCreateForSubject(...)` so subject/grade/existing rules are preset correctly

---

## What was intentionally NOT changed

- Accordion structure (Grade → Subject → Child / Category → Rules → Assessments) — kept so current workflows stay familiar
- Store / sync / delete / assessment APIs
- Parent % totaling to 100
- Child roll-up into parent max score rules
- Ability to add **more than Exam** on a child later (dialog already supports multiple category rows; child mode no longer blocks add-more just because weight is 0%)

---

## How to verify (smoke test)

### A. Parent (no children) — regression

1. Subject Setting → **Add Rule**
2. Pick a leaf subject + grade(s)
3. Categories totaling **100%** → save
4. Expect success; rules appear under that grade/subject

### B. Parent with children — Exam flow

1. Open parent → **Child Subjects** opens by default
2. On a child → **+** → dialog shows 0% info; % disabled
3. Add **Exam**, max score (e.g. 40), save
4. Repeat for sibling children so Exam maxes sum to parent Exam max
5. Open **Parent Categories** → rollup shows `childSum / parentMax` green when matched
6. Mismatch → warning in UI; create/update that breaks the sum should error

### C. Future: second category on child

1. Child already has Exam at 0%
2. **+** again → add another category at 0% with its own max score
3. If that category exists on the parent with a max, child maxes for that category must still sum to the parent max

### D. Mobile

1. Parent **Add Rule** opens create (not edit)
2. Edit from mobile includes the correct grade

---

## Rollback

Revert the four source files listed above (dialog, list, en/km locales). No DB migration or API deploy required.

---

## Follow-ups (optional, not in this change)

- Matrix view (parent row + child columns per category) to further flatten the tree
- Wizard checklist for first-time composite subject setup
- Deduplicate some + / edit buttons now that labels are clearer
