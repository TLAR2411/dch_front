import { api } from "@/utils/api";

/** Replaces supabase.from("student_scores") in scoreEntryService.js. */
export const listStudentScores = (filter) =>
  api.post("/api/student-scores-list", filter).then((r) => r.data.data);

/**
 * Bulk upsert of a marks grid. academic_period_id is REQUIRED on every row:
 * the unique index is NULLS DISTINCT, so a null would insert a duplicate score
 * for the same cell instead of updating it.
 */
export const saveStudentScores = (rows) =>
  api.post("/api/student-scores-upsert", rows).then((r) => r.data.data);
