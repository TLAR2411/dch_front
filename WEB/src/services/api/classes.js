import { api } from "@/utils/api";

/** Replaces supabase.from("classes"). */
export const listClasses = (filter = {}) =>
  api.post("/api/classes-list", filter).then((r) => r.data.data);

export const allClasses = (filter = {}) =>
  api.post("/api/classes-all", filter).then((r) => r.data.data);

export const showClass = (id) =>
  api.post("/api/classes-show", { id }).then((r) => r.data.data);
