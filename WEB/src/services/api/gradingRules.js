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
