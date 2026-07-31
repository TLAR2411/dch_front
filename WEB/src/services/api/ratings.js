import { api } from "@/utils/api";

/** Curriculum-scoped ratings — same shape as behaviors. */
export const listRatings = () =>
  api.post("/api/ratings-list", {}).then((r) => r.data.data);

export const createRating = (row) =>
  api.post("/api/ratings-store", row).then((r) => r.data.data);

export const updateRating = (row) =>
  api.post("/api/ratings-update", row).then((r) => r.data.data);

/** Soft delete, expressed as an update — the same shape the table uses. */
export const deleteRating = (id) =>
  api.post("/api/ratings-update", { id, is_deleted: true, is_active: false })
     .then((r) => r.data.data);
