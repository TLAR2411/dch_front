import { api } from "@/utils/api";

/** Replaces supabase.from("behaviors") in BehaviorList.vue. Curriculum-scoped. */
export const listBehaviors = () =>
  api.post("/api/behaviors-list", {}).then((r) => r.data.data);

export const createBehavior = (row) =>
  api.post("/api/behaviors-store", row).then((r) => r.data.data);

export const updateBehavior = (row) =>
  api.post("/api/behaviors-update", row).then((r) => r.data.data);

/** Soft delete, expressed as an update — the same shape the table uses. */
export const deleteBehavior = (id) =>
  api.post("/api/behaviors-update", { id, is_deleted: true, is_active: false })
     .then((r) => r.data.data);
