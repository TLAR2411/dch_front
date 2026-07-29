import { api } from "@/utils/api";

/** Replaces supabase.from("students_attendance") in the report components. */
export const listAttendance = (filter = {}) =>
  api.post("/api/students-classes-attendance-list", filter).then((r) => r.data.data);

export const attendanceReport = (filter = {}) =>
  api.post("/api/students-classes-attendance-report", filter).then((r) => r.data.data);

/**
 * Raw attendance rows over a date range, as stored — the reports must be able
 * to tell "marked absent" from "never marked", so nothing is filled in.
 *
 * Not listAttendance, which is single-date, roster-shaped, and defaults an
 * unmarked student to present.
 *
 * subject_ids is optional. Omit it for all subjects; an empty array means no
 * subjects, which is a different question.
 */
export const listAttendanceRange = (filter) =>
  api.post("/api/students-classes-attendance-range", filter).then((r) => r.data.data);
