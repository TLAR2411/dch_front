import { api } from "@/utils/api";

/** Replaces supabase.from("schedules") in Schedule.vue and CheckAttendance.vue. */
export const listSchedules = (filter) =>
  api.post("/api/schedules-list", filter).then((r) => r.data.data);

/** Accepts one row or an array; Schedule.vue bulk-inserts multi-slot entries. */
export const createSchedules = (rows) =>
  api.post("/api/schedules-store", rows).then((r) => r.data.data);

export const updateSchedule = (row) =>
  api.post("/api/schedules-update", row).then((r) => r.data.data);

export const deleteSchedule = (id) =>
  api.post("/api/schedules-delete", { id }).then((r) => r.data.data);

/** Clears every slot for the given classes — used when copying a timetable. */
export const deleteSchedulesForClasses = (classIds) =>
  api.post("/api/schedules-delete", { class_ids: classIds }).then((r) => r.data.data);
