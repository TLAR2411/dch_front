import supabase from "@/utils/supabase.js";

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function eachDateInclusive(startDate, endDate) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end || start > end) return [];

  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);

  while (cursor <= last) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    dates.push({
      iso: `${y}-${m}-${d}`,
      dow: cursor.getDay(), // 0=Sun … 6=Sat
      calendarYear: String(y),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

/**
 * Fetch closed dates for a term range, scoped correctly by year:
 * - public holidays: match by date range + calendar year field
 * - school events: match by date range + academic year_id (+ optional cur/branch)
 */
export async function fetchClosedDatesForTerm({
  startDate,
  endDate,
  yearId = null,
  curId = null,
  branchId = null,
} = {}) {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) {
    return { publicDates: new Set(), eventDates: new Set() };
  }

  const calendarYears = [
    ...new Set(
      eachDateInclusive(start, end).map((day) => day.calendarYear),
    ),
  ];

  const { data: publicRows, error: publicError } = await supabase
    .from("holiday")
    .select("date, year")
    .eq("is_public", true)
    .eq("is_deleted", false)
    .gte("date", start)
    .lte("date", end)
    .in("year", calendarYears);

  if (publicError) throw publicError;

  let eventQuery = supabase
    .from("holiday")
    .select("date, year_id, cur_id, branch_id")
    .eq("is_public", false)
    .eq("is_deleted", false)
    .gte("date", start)
    .lte("date", end);

  if (yearId != null) {
    eventQuery = eventQuery.eq("year_id", yearId);
  }
  if (curId != null) {
    eventQuery = eventQuery.eq("cur_id", curId);
  }
  if (branchId != null) {
    eventQuery = eventQuery.eq("branch_id", branchId);
  }

  const { data: eventRows, error: eventError } = await eventQuery;
  if (eventError) throw eventError;

  const publicDates = new Set(
    (publicRows ?? [])
      .map((row) => normalizeDate(row.date))
      .filter(Boolean),
  );
  const eventDates = new Set(
    (eventRows ?? [])
      .map((row) => normalizeDate(row.date))
      .filter(Boolean),
  );

  return { publicDates, eventDates };
}

export function computeSchoolDayCounts({
  startDate,
  endDate,
  publicDates = new Set(),
  eventDates = new Set(),
} = {}) {
  const days = eachDateInclusive(startDate, endDate);
  let weekendDays = 0;
  let holidayDays = 0;
  let schoolEventDays = 0;
  let schoolDays = 0;

  for (const day of days) {
    const isWeekend = day.dow === 0 || day.dow === 6;
    if (isWeekend) {
      weekendDays += 1;
      continue;
    }

    // weekday only — avoid double-counting holiday/event on weekend
    if (publicDates.has(day.iso)) {
      holidayDays += 1;
      continue;
    }

    if (eventDates.has(day.iso)) {
      schoolEventDays += 1;
      continue;
    }

    schoolDays += 1;
  }

  return {
    total_days: days.length,
    weekend_days: weekendDays,
    holiday_days: holidayDays,
    school_event_days: schoolEventDays,
    school_days: schoolDays,
  };
}

export async function calculateSchoolDayCountsForTerm({
  startDate,
  endDate,
  yearId = null,
  curId = null,
  branchId = null,
} = {}) {
  const { publicDates, eventDates } = await fetchClosedDatesForTerm({
    startDate,
    endDate,
    yearId,
    curId,
    branchId,
  });

  return {
    ...computeSchoolDayCounts({
      startDate,
      endDate,
      publicDates,
      eventDates,
    }),
    school_days_calculated_at: new Date().toISOString(),
  };
}

/**
 * Weekday ids (0=Sun … 6=Sat) when this class+subject has schedule rows.
 * Returns null when none exist so callers fall back to all school days.
 */
export async function fetchScheduledDowsForSubject({
  classId,
  subjectId,
} = {}) {
  if (!classId || !subjectId) return null;

  const { data, error } = await supabase
    .from("schedules")
    .select("day_id")
    .eq("class_id", classId)
    .eq("subject_id", subjectId);

  if (error) throw error;

  const dows = new Set(
    (data ?? [])
      .map((row) => Number(row.day_id))
      .filter((id) => Number.isFinite(id) && id >= 0 && id <= 6),
  );

  return dows.size ? dows : null;
}

/**
 * Count school days in range that also fall on the subject's scheduled weekdays.
 * When scheduledDows is null, counts all school days (same as term school_days).
 */
export function computeScheduledSchoolDays({
  startDate,
  endDate,
  publicDates = new Set(),
  eventDates = new Set(),
  scheduledDows = null,
} = {}) {
  const days = eachDateInclusive(startDate, endDate);
  let count = 0;

  for (const day of days) {
    if (day.dow === 0 || day.dow === 6) continue;
    if (publicDates.has(day.iso)) continue;
    if (eventDates.has(day.iso)) continue;
    if (scheduledDows instanceof Set && !scheduledDows.has(day.dow)) continue;
    count += 1;
  }

  return count;
}

/**
 * Attendance max for a class+subject in a term:
 * school days ∩ subject schedule weekdays.
 * Falls back to term.school_days when dates are missing.
 */
export async function resolveSubjectAttendanceMax({
  classId,
  subjectId,
  startDate,
  endDate,
  yearId = null,
  curId = null,
  branchId = null,
  fallbackSchoolDays = null,
} = {}) {
  const fallback = Number(fallbackSchoolDays);
  const fallbackValue = Number.isFinite(fallback) ? fallback : null;

  if (!startDate || !endDate) return fallbackValue;

  const [{ publicDates, eventDates }, scheduledDows] = await Promise.all([
    fetchClosedDatesForTerm({
      startDate,
      endDate,
      yearId,
      curId,
      branchId,
    }),
    fetchScheduledDowsForSubject({ classId, subjectId }),
  ]);

  return computeScheduledSchoolDays({
    startDate,
    endDate,
    publicDates,
    eventDates,
    scheduledDows,
  });
}
