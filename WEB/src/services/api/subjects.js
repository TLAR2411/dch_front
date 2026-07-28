import { api } from "@/utils/api";

/** Replaces supabase.from("subjects") — read-only at every call site. */
export const listSubjects = (filter = {}) =>
  api.post("/api/subjects-list", filter).then((r) => r.data.data);

export const allSubjects = (filter = {}) =>
  api.post("/api/subjects-all", filter).then((r) => r.data.data);

export const showSubject = (id) =>
  api.post("/api/subjects-show", { id }).then((r) => r.data.data);
