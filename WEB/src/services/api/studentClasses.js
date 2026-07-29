import { api } from "@/utils/api";

/**
 * Replaces supabase.from("student_classes") in scoreEntryService.js and the
 * three attendance report components.
 *
 * SHAPE ADAPTER, deliberately. The PostgREST query these replace was:
 *
 *     .select("student_id, index, student:students(id, name_en, name_kh, gender)")
 *
 * /api/students-classes-list already returns a nested `student` object, but it
 * differs in two ways that would break the callers silently:
 *
 *   1. it is PAGINATED — rows live at data.data, and the default page size
 *      would truncate a class. `limit` is set high so a whole class comes back.
 *   2. its top-level `student_id` is the human-readable code, while the
 *      PostgREST `student_classes.student_id` is the FK to students.id. The
 *      callers key attendance records off it, so getting this wrong would
 *      produce empty rows rather than an error.
 *
 * The adapter reproduces the original shape exactly, so nothing downstream
 * changes.
 */
const CLASS_ROSTER_LIMIT = 500;

export const listClassRoster = async (classId) => {
  const res = await api.post("/api/students-classes-list", {
    class_id: classId,
    page: 1,
    limit: CLASS_ROSTER_LIMIT,
  });

  const rows = res.data?.data?.data ?? [];

  return rows
    .filter((r) => !r.is_deleted)
    .map((r) => ({
      // students.id — what the callers use to match attendance rows.
      student_id: r.student?.id ?? null,
      index: r.index,
      student: {
        id: r.student?.id ?? null,
        name_en: r.student?.name_en ?? null,
        name_kh: r.student?.name_kh ?? null,
        gender: r.student?.gender ?? null,
      },
    }));
};

export const listStudentClasses = (filter = {}) =>
  api.post("/api/students-classes-list", filter).then((r) => r.data.data);

export const showStudentClass = (id) =>
  api.post("/api/students-classes-show", { id }).then((r) => r.data.data);
