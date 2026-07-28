import { api } from "@/utils/api";

/** Replaces supabase.from("academic_period") in TermList.vue. */
export const listAcademicPeriods = (filter = {}) =>
  api.post("/api/academics-periods-list", filter).then((r) => r.data.data);

export const allAcademicPeriods = (filter = {}) =>
  api.post("/api/academics-periods-all", filter).then((r) => r.data.data);

export const createAcademicPeriod = (row) =>
  api.post("/api/academics-periods-store", row).then((r) => r.data.data);

export const updateAcademicPeriod = (row) =>
  api.post("/api/academics-periods-update", row).then((r) => r.data.data);
