import { api } from "@/utils/api";

/** Replaces supabase.from("assessment_items") in SubjectSettingList.vue. */
export const listAssessmentItems = (filter = {}) =>
  api.post("/api/grade-assessment-list", filter).then((r) => r.data.data);

export const createAssessmentItem = (row) =>
  api.post("/api/grade-assessment-store", row).then((r) => r.data.data);

export const updateAssessmentItem = (row) =>
  api.post("/api/grade-assessment-update", row).then((r) => r.data.data);

export const deleteAssessmentItem = (id) =>
  api.post("/api/grade-assessment-delete", { id }).then((r) => r.data.data);

/**
 * Creates one placeholder item and RESOLVES TO IT. The grid keys every cell on
 * the returned id, so createAssessmentItem (/grade-assessment-store) cannot be
 * used here: it returns only a status, requires an academic_period_id these
 * items do not carry, and overrides sequence_no.
 */
export const ensureAssessmentItem = (row) =>
  api.post("/api/grade-assessment-ensure", row).then((r) => r.data.data);
