import { api } from "@/utils/api";

/** Replaces supabase.from("classes"). */
export const listClasses = (filter = {}) =>
  api.post("/api/classes-list", filter).then((r) => r.data.data);

export const allClasses = (filter = {}) =>
  api.post("/api/classes-all", filter).then((r) => r.data.data);

export const showClass = (id) =>
  api.post("/api/classes-show", { id }).then((r) => r.data.data);

/**
 * Full class record including grade_id — classes-show does not carry it, and
 * the score grid needs the grade to resolve its grading rules.
 */
export const showClassDetail = (classId) =>
  api.post("/api/class-detail", { class_id: classId }).then((r) => r.data.data);
