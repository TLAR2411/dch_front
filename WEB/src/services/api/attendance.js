import { api } from "@/utils/api";

/** Replaces supabase.from("students_attendance") in the report components. */
export const listAttendance = (filter = {}) =>
  api.post("/api/students-classes-attendance-list", filter).then((r) => r.data.data);

export const attendanceReport = (filter = {}) =>
  api.post("/api/students-classes-attendance-report", filter).then((r) => r.data.data);
