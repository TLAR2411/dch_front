import { api } from "@/utils/api";

/** Replaces supabase.from("grade_subject") in GradeSubjectList.vue and score entry. */
export const listGradeSubjects = (filter = {}) =>
  api.post("/api/subjects-grades-list", filter).then((r) => r.data.data);

/**
 * The grade-subject screen's own read: every live assignment for a year, with
 * each subject's parent_id, plus the child subjects of every assigned parent.
 *
 * Resolves to `{ assignments, children }`. Not listGradeSubjects, which is
 * grade-centric, paginated, and returns soft-deleted assignments.
 */
export const listGradeSubjectAssignments = (filter = {}) =>
  api.post("/api/subjects-grades-assignments", filter).then((r) => r.data.data);

/** subject_id accepts one id or an array — the dialog assigns several at once. */
export const createGradeSubject = (row) =>
  api.post("/api/subjects-grades-store", row).then((r) => r.data.data);

/** Soft delete; the row survives because scores reference it. */
export const deleteGradeSubject = (id) =>
  api.post("/api/subjects-grades-delete", { id }).then((r) => r.data.data);
