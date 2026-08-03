function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1";
}

export function emptyTotals() {
  return { absent: 0, permission: 0, late: 0, present: 0 };
}

export function recordToStatus(record) {
  if (!record) return null;
  if (isTruthyFlag(record.ask_permission)) return { ask_permission: true };
  if (!isTruthyFlag(record.present)) return { absent: true };
  if (isTruthyFlag(record.late)) return { late: true };
  if (isTruthyFlag(record.present)) return { present: true };
  return null;
}

export function mergeDayRecords(records = []) {
  if (!records.length) return null;
  if (records.some((r) => isTruthyFlag(r.ask_permission))) {
    return { ask_permission: true };
  }
  if (records.some((r) => !isTruthyFlag(r.present))) return { absent: true };
  if (records.some((r) => isTruthyFlag(r.late))) return { late: true };
  if (records.some((r) => isTruthyFlag(r.present))) return { present: true };
  return null;
}

export function dayFromDate(date) {
  if (!date) return null;
  const match = String(date).match(/^\d{4}-\d{2}-(\d{2})/);
  return match ? Number(match[1]) : null;
}

export function resolveReportSubjectId(subjectId, subjectParentMap) {
  return subjectParentMap?.get(subjectId) ?? subjectId;
}

export function countStatusCode(code, totals) {
  if (code === "A") totals.absent += 1;
  else if (code === "P") totals.permission += 1;
  else if (code === "L") totals.late += 1;
  else if (code === "✓") totals.present += 1;
}

export function statusToCode(entry) {
  if (!entry) return "";

  if (typeof entry === "string") {
    const map = {
      a: "A",
      absent: "A",
      p: "P",
      permission: "P",
      pre: "P",
      ask_permission: "P",
      l: "L",
      late: "L",
      present: "✓",
      check: "✓",
      "✓": "✓",
    };
    return map[entry.toLowerCase()] ?? entry;
  }

  if (isTruthyFlag(entry.ask_permission) || isTruthyFlag(entry.permission)) {
    return "P";
  }
  if (isTruthyFlag(entry.absent)) return "A";
  if (isTruthyFlag(entry.late)) return "L";
  if (isTruthyFlag(entry.present)) return "✓";

  if (entry.status) return statusToCode(entry.status);
  if (entry.code) return statusToCode(entry.code);
  if (entry.value) return statusToCode(entry.value);

  return "";
}

export function isPresentMark(value) {
  return value === "✓";
}

export function getDayStatus(student, day) {
  const entry = student._dailyMap?.[day] ?? student._dailyMap?.[String(day)];
  if (!entry) return "";
  return statusToCode(entry);
}

export function getStudentSubjectTotal(student, subjectId, field) {
  return student._bySubject?.[subjectId]?.[field] ?? 0;
}

export function genderLabel(gender, reportPart = "english") {
  if (!gender) return "—";
  const useKhmerAbbr = reportPart === "khmer" || reportPart === "chinese";
  const isFemale = String(gender).toLowerCase().startsWith("f");
  if (useKhmerAbbr) return isFemale ? "ស" : "ប";
  return isFemale ? "F" : "M";
}

/**
 * Build student rows for attendance reports.
 * - dailyMode: merge marks per calendar day
 * - bySubject: bucket marks under parent/report subject ids
 */
export function buildStudentReportRows(
  students,
  attendanceRows,
  {
    dailyMode = false,
    bySubject = false,
    subjectParentMap = null,
    reportSubjectIds = [],
  } = {},
) {
  const recordsByStudent = new Map();

  for (const row of attendanceRows) {
    if (!recordsByStudent.has(row.student_id)) {
      recordsByStudent.set(row.student_id, []);
    }
    recordsByStudent.get(row.student_id).push(row);
  }

  return students.map((entry, index) => {
    const records = recordsByStudent.get(entry.student_id) ?? [];
    const totals = emptyTotals();
    const dailyMap = {};
    const bySubjectMap = {};

    if (bySubject) {
      for (const subjectId of reportSubjectIds) {
        bySubjectMap[subjectId] = emptyTotals();
      }

      for (const record of records) {
        const subjectId = resolveReportSubjectId(
          record.subject_id,
          subjectParentMap,
        );
        if (!bySubjectMap[subjectId]) continue;
        countStatusCode(
          statusToCode(recordToStatus(record)),
          bySubjectMap[subjectId],
        );
      }

      for (const subjectTotals of Object.values(bySubjectMap)) {
        totals.absent += subjectTotals.absent;
        totals.permission += subjectTotals.permission;
        totals.late += subjectTotals.late;
        totals.present += subjectTotals.present;
      }
    } else if (dailyMode) {
      const recordsByDay = new Map();

      for (const record of records) {
        const day = dayFromDate(record.date);
        if (!day) continue;
        if (!recordsByDay.has(day)) recordsByDay.set(day, []);
        recordsByDay.get(day).push(record);
      }

      for (const [day, dayRecords] of recordsByDay) {
        const status = mergeDayRecords(dayRecords);
        dailyMap[day] = status;
        countStatusCode(statusToCode(status), totals);
      }
    } else {
      for (const record of records) {
        countStatusCode(statusToCode(recordToStatus(record)), totals);
      }
    }

    return {
      id: entry.student_id,
      index: entry.index ?? index + 1,
      name_en: entry.student?.name_en ?? "",
      name_kh: entry.student?.name_kh ?? "",
      gender: entry.student?.gender ?? "",
      _dailyMap: dailyMap,
      _bySubject: bySubjectMap,
      absent_total: totals.absent,
      ask_permission_total: totals.permission,
      late_total: totals.late,
      present_total: totals.present,
    };
  });
}
