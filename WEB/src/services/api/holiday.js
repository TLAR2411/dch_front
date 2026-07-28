import { api } from "@/utils/api";

/**
 * Replaces supabase.from("holiday") in CalendarList.vue, CloseDaysList.vue and
 * utils/schoolDays.js.
 *
 * The calendar endpoint returns BOTH public holidays (national, no branch) and
 * the caller's own branch events in one array — the two queries the calendar
 * used to run separately and concatenate.
 */
export const listHolidayCalendar = (filter = {}) =>
  api.post("/api/holiday-calendar", filter).then((r) => r.data.data);

/** Accepts a single row or an array; two call sites bulk-import. */
export const createHolidays = (rows) =>
  api.post("/api/holiday-store", rows).then((r) => r.data.data);

export const updateHoliday = (row) =>
  api.post("/api/holiday-update", row).then((r) => r.data.data);

/** Soft delete — schoolDays.js relies on the row surviving. */
export const deleteHoliday = (id) =>
  api.post("/api/holiday-delete", { id }).then((r) => r.data.data);
