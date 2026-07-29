import { api } from "@/utils/api";

/** Replaces supabase.from("academic_period") in TermList.vue. */
export const listAcademicPeriods = (filter = {}) =>
  api.post("/api/academics-periods-list", filter).then((r) => r.data.data);

export const allAcademicPeriods = (filter = {}) =>
  api.post("/api/academics-periods-all", filter).then((r) => r.data.data);

/**
 * The term table's own read: every row for the branch+year, ordered by
 * start_date, with the school-day columns and the school_year object.
 *
 * Not listAcademicPeriods, which paginates at 10 and is consumed by the
 * attendance reports — their behaviour must not change.
 */
export const listTermPeriods = (filter = {}) =>
  api.post("/api/academics-periods-terms", filter).then((r) => r.data.data);

export const createAcademicPeriod = (row) =>
  api.post("/api/academics-periods-store", row).then((r) => r.data.data);

export const updateAcademicPeriod = (row) =>
  api.post("/api/academics-periods-update", row).then((r) => r.data.data);

/** Derived counts only; the term's own fields are left alone. */
export const updateSchoolDayCounts = (row) =>
  api.post("/api/academics-periods-school-days", row).then((r) => r.data.data);
