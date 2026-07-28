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
