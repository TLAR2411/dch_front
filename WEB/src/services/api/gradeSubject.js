import { api } from "@/utils/api";

/** Replaces supabase.from("grade_subject") in GradeSubjectList.vue and score entry. */
export const listGradeSubjects = (filter = {}) =>
  api.post("/api/subjects-grades-list", filter).then((r) => r.data.data);

export const createGradeSubject = (row) =>
  api.post("/api/subjects-grades-store", row).then((r) => r.data.data);
