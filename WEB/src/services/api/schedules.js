import { api } from "@/utils/api";

/** Replaces supabase.from("schedules") in Schedule.vue and CheckAttendance.vue. */
export const listSchedules = (filter) =>
  api.post("/api/schedules-list", filter).then((r) => r.data.data);

export const createSchedule = (row) =>
  api.post("/api/schedules-store", row).then((r) => r.data.data);

export const updateSchedule = (row) =>
  api.post("/api/schedules-update", row).then((r) => r.data.data);

export const deleteSchedule = (id) =>
  api.post("/api/schedules-delete", { id }).then((r) => r.data.data);
