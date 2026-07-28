import { api } from "@/utils/api";

/** Replaces supabase.from("grade_subject_grading_rule") in SubjectSettingList.vue. */
export const listGradingRules = (filter = {}) =>
  api.post("/api/grading-rule-list", filter).then((r) => r.data.data);

export const showGradingRule = (id) =>
  api.post("/api/grading-rule-show", { id }).then((r) => r.data.data);

export const createGradingRule = (row) =>
  api.post("/api/grading-rule-store", row).then((r) => r.data.data);

export const updateGradingRule = (row) =>
  api.post("/api/grading-rule-update", row).then((r) => r.data.data);

export const deleteGradingRule = (id) =>
  api.post("/api/grading-rule-delete", { id }).then((r) => r.data.data);

/**
 * Flat grading-rule rows for the score-entry grid, each with its category and
 * assessment items. Pass one subject id or several — the child-component
 * layout is the same query over the child subjects.
 *
 * Not listGradingRules, which aggregates to one row per subject, paginates,
 * and omits assessment_items.subject_id that the grid keys its cells on.
 */
export const listGradingLayout = (filter) =>
  api.post("/api/grading-rule-layout", filter).then((r) => r.data.data);

/**
 * The settings screen's whole read: every rule for a year with its grade,
 * year, subject, category and assessment items — plus the child subjects of
 * every parent subject that appears.
 *
 * Resolves to `{ rules, children }`.
 */
export const listGradingRuleSettings = (filter) =>
  api.post("/api/grading-rule-settings", filter).then((r) => r.data.data);

/**
 * Deletes rules AND their assessment items in one transaction.
 *
 * Pass `{ id }` for one rule, or `{ subject_id, grade_id, year_id }` for a
 * subject's rules including its child subjects' — the server derives the
 * children itself, so no child id list is sent.
 *
 * Rejects with 409 when student scores reference the items. That delete
 * already failed (the foreign key is NO ACTION); it now says why.
 */
export const cascadeDeleteGradingRules = (target) =>
  api.post("/api/grading-rule-cascade-delete", target).then((r) => r.data);

/** Applies removals, reweights and additions as one transaction. */
export const syncGradingRules = (changes) =>
  api.post("/api/grading-rule-sync", changes).then((r) => r.data.data);
