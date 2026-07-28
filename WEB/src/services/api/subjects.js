import { api } from "@/utils/api";

/** Replaces supabase.from("subjects") — read-only at every call site. */
export const listSubjects = (filter = {}) =>
  api.post("/api/subjects-list", filter).then((r) => r.data.data);

export const allSubjects = (filter = {}) =>
  api.post("/api/subjects-all", filter).then((r) => r.data.data);

export const showSubject = (id) =>
  api.post("/api/subjects-show", { id }).then((r) => r.data.data);

/**
 * Live subjects that have a parent, as {id, parent_id, name_en, name_kh}.
 * Omit parent_ids for the whole child->parent map; pass them to get just those
 * parents' components.
 */
export const listSubjectParentMap = (parentIds) =>
  api
    .post("/api/subjects-parent-map", parentIds ? { parent_ids: parentIds } : {})
    .then((r) => r.data.data);
