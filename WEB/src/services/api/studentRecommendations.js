import { api } from "@/utils/api";

/** Replaces supabase.from("student_teacher_recommendations"). */
export const listStudentRecommendations = (filter) =>
  api.post("/api/student-recommendations-list", filter).then((r) => r.data.data);

export const saveStudentRecommendations = (rows) =>
  api.post("/api/student-recommendations-upsert", rows).then((r) => r.data.data);
