/**
 * Score Entry data layer (Supabase).
 *
 * Flow for future updates:
 *   1. fetchTerms / resolveCurrentTermId
 *   2. resolveClassGradeId → fetchSubjectsForGrade
 *   3. fetchGradingLayout (rules + assessment items)
 *   4. fetchClassStudents
 *   5. fetchExistingScores
 *   6. fetchAttendanceDays (auto-fill)
 *   7. ensureCategoryItems (lazy create for single-score cats)
 *   8. upsertScores
 */
import { listTermPeriods } from "@/services/api/academicPeriod";
import { showClassDetail } from "@/services/api/classes";
import { listGradeSubjectAssignments } from "@/services/api/gradeSubject";
import { listGradingLayout } from "@/services/api/gradingRules";
import { listSubjectParentMap } from "@/services/api/subjects";
import { listClassRoster } from "@/services/api/studentClasses";
import { listStudentScores, saveStudentScores } from "@/services/api/studentScores";
import { listAttendanceRange } from "@/services/api/attendance";
import { ensureAssessmentItem } from "@/services/api/assessmentItems";
import {
  categorySortIndex,
  normalizeCategoryKey,
} from "@/utils/gradeCalculation.js";

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1";
}

export function resolveCurrentTermId(terms = []) {
  if (!terms.length) return null;
  const today = normalizeDate(new Date());
  const current = terms.find((term) => {
    const start = normalizeDate(term.start_date);
    const end = normalizeDate(term.end_date);
    return start && end && today >= start && today <= end;
  });
  return current?.id ?? terms[0].id;
}

/** Load academic periods for a school year (prefer school_days column). */
export async function fetchTerms(yearId) {
  // Same endpoint the term table uses: whole set for the branch+year, ordered
  // by start_date, soft-deleted rows excluded.
  return await listTermPeriods({ year_id: yearId ?? null });
}

export async function resolveClassGradeId(classId) {
  if (!classId) return null;

  const detail = await showClassDetail(classId);
  return detail?.grade_id ?? detail?.grade?.id ?? null;
}

/** Share one in-flight request per year+grade (api.js aborts duplicate POSTs). */
const subjectsForGradeInFlight = new Map();

/** Parent subjects assigned to grade for the year.
 *  classId lets the API narrow the list to the subjects the logged-in
 *  teacher teaches in that class (admins are unaffected). */
export async function fetchSubjectsForGrade(yearId, gradeId, classId = null) {
  if (!yearId || !gradeId) return [];

  const key = `${yearId}:${gradeId}:${classId ?? ""}`;
  const existing = subjectsForGradeInFlight.get(key);
  if (existing) return existing;

  const promise = listGradeSubjectAssignments({
    year_id: yearId,
    grade_id: gradeId,
    class_id: classId,
  })
    .then(({ assignments: data }) =>
      (data ?? [])
        .filter((row) => row.subject && !row.subject.parent_id)
        .map((row) => ({
          id: row.subject_id,
          name_en: row.subject.name_en || "",
          name_kh: row.subject.name_kh || "",
          name_cn: row.subject.name_cn || "",
        }))
        .sort((a, b) => a.name_en.localeCompare(b.name_en)),
    )
    .finally(() => {
      subjectsForGradeInFlight.delete(key);
    });

  subjectsForGradeInFlight.set(key, promise);
  return promise;
}

/**
 * Layout for the score grid:
 * categories (rules) sorted, each with assessment items.
 */
export async function fetchGradingLayout({ yearId, gradeId, subjectId }) {
  if (!yearId || !gradeId || !subjectId) return [];

  const data = await listGradingLayout({
    year_id: yearId,
    grade_id: gradeId,
    subject_ids: [subjectId],
  });

  const rows = (data ?? []).map((row) => {
    const items = sortAssessmentItems(row.assessments ?? []).filter(
      (assessment) =>
        assessment.subject_id == null ||
        Number(assessment.subject_id) === Number(row.subject_id),
    );

    const key = normalizeCategoryKey(row.category?.name_en);

    return {
      rule_id: row.id,
      category_id: row.category_id,
      category_key: key,
      is_attendance: key === "attendance",
      name_en: row.category?.name_en ?? "Category",
      name_kh: row.category?.name_kh ?? "",
      symbol: row.category?.symbol ?? null,
      percentage: Number(row.percentage) || 0,
      max_score: row.max_score != null ? Number(row.max_score) : null,
      items,
    };
  });

  return rows.sort(
    (a, b) =>
      categorySortIndex(a.name_en) - categorySortIndex(b.name_en) ||
      a.rule_id - b.rule_id,
  );
}

/** Child subjects linked to a parent (e.g. Read under Language Art). */
export async function fetchChildSubjects(parentSubjectId) {
  if (!parentSubjectId) return [];

  return await listSubjectParentMap([parentSubjectId]);
}

function sortAssessmentItems(items = []) {
  return [...items].sort((a, b) => {
    const sa = Number(a.sequence_no) || 0;
    const sb = Number(b.sequence_no) || 0;
    if (sa !== sb) return sa - sb;
    return String(a.item_name || "").localeCompare(String(b.item_name || ""));
  });
}

function mapChildRuleRow(row) {
  return {
    rule_id: row.id,
    category_id: row.category_id,
    max_score: row.max_score != null ? Number(row.max_score) : null,
    percentage: Number(row.percentage) || 0,
    items: sortAssessmentItems(row.assessments ?? []).filter(
      (item) =>
        item.subject_id == null ||
        Number(item.subject_id) === Number(row.subject_id),
    ),
  };
}

/**
 * Grading rules per child subject_id for composite layout.
 * @returns {Map<number, Array>}
 */
export async function fetchChildGradingRules({
  yearId,
  gradeId,
  childSubjectIds,
}) {
  const map = new Map();
  if (!yearId || !gradeId || !childSubjectIds?.length) return map;

  const data = await listGradingLayout({
    year_id: yearId,
    grade_id: gradeId,
    subject_ids: childSubjectIds,
  });

  for (const row of data ?? []) {
    if (!map.has(row.subject_id)) map.set(row.subject_id, []);
    map.get(row.subject_id).push(mapChildRuleRow(row));
  }

  return map;
}

/**
 * When children share a category with the parent, expand that category into
 * child sub-columns (Listen / Read / …) instead of a single parent item.
 */
export function buildCompositeLayout(
  parentLayout,
  childSubjects = [],
  childRulesBySubjectId = new Map(),
) {
  if (!parentLayout?.length || !childSubjects?.length) return parentLayout;

  return parentLayout.map((cat) => {
    const childItems = [];

    for (const child of childSubjects) {
      const childRules = childRulesBySubjectId.get(child.id) ?? [];
      const childRule = childRules.find(
        (rule) => rule.category_id === cat.category_id,
      );
      if (!childRule) continue;

      const existingItems = childRule.items ?? [];

      if (existingItems.length) {
        for (const item of existingItems) {
          childItems.push({
            ...item,
            is_child_component: true,
            child_subject_id: child.id,
            child_rule_id: childRule.rule_id,
          });
        }
        continue;
      }

      childItems.push({
        id: null,
        item_name: child.name_en || "Score",
        max_score: childRule.max_score,
        sequence_no: childItems.length + 1,
        grade_subject_grading_rule_id: childRule.rule_id,
        subject_id: child.id,
        is_child_component: true,
        child_subject_id: child.id,
        child_rule_id: childRule.rule_id,
      });
    }

    if (!childItems.length) return cat;

    return {
      ...cat,
      uses_child_components: true,
      items: childItems,
    };
  });
}

export async function fetchClassStudents(classId) {
  if (!classId) return [];

  // listClassRoster reproduces the {student_id, index, student:{...}} shape
  // the embedded query returned, from the paginated API.
  const data = await listClassRoster(classId);

  return (data ?? []).map((row, i) => ({
    student_id: row.student_id,
    index: row.index ?? i + 1,
    name_en: row.student?.name_en ?? "",
    name_kh: row.student?.name_kh ?? "",
    gender: row.student?.gender ?? null,
  }));
}

export async function fetchExistingScores({
  studentIds,
  assessmentItemIds,
  academicPeriodId,
  classId,
}) {
  if (
    !studentIds?.length ||
    !assessmentItemIds?.length ||
    !academicPeriodId ||
    !classId
  ) {
    return [];
  }

  return await listStudentScores({
    academic_period_id: academicPeriodId,
    class_id: classId,
    student_ids: studentIds,
    assessment_item_ids: assessmentItemIds,
  });
}

/**
 * Count present school days per student for class+subject in term range.
 * Present = present flag true (includes late). Permission/absent excluded.
 * Max for the attendance category should come from resolveSubjectAttendanceMax
 * (school days ∩ subject schedule), not term.school_days alone.
 */
export async function fetchAttendanceDays({
  classId,
  subjectId,
  startDate,
  endDate,
}) {
  if (!classId || !subjectId || !startDate || !endDate) return new Map();

  const data = await listAttendanceRange({
    class_id: classId,
    subject_ids: [subjectId],
    from: normalizeDate(startDate),
    to: normalizeDate(endDate),
  });

  const daysByStudent = new Map();

  for (const row of data ?? []) {
    if (isTruthyFlag(row.ask_permission)) continue;
    if (!isTruthyFlag(row.present)) continue;

    const sid = row.student_id;
    daysByStudent.set(sid, (daysByStudent.get(sid) || 0) + 1);
  }

  return daysByStudent;
}

/**
 * Ensure each category without assessment items has one placeholder item.
 * Child-component categories create items on each child's grading rule.
 */
export async function ensureCategoryItems(categories, { subjectId, attendanceMax }) {
  const result = [];

  for (const cat of categories) {
    if (cat.uses_child_components) {
      const ensuredItems = [];

      for (const item of cat.items ?? []) {
        if (item.id) {
          ensuredItems.push(item);
          continue;
        }

        const ruleId = item.child_rule_id ?? item.grade_subject_grading_rule_id;
        const itemSubjectId = item.child_subject_id ?? item.subject_id;

        // -ensure, not -store: the grid keys its cells on the returned id,
        // and -store returns only a status.
        const data = await ensureAssessmentItem({
          grade_subject_grading_rule_id: ruleId,
          item_name: item.item_name,
          max_score: item.max_score,
          sequence_no: item.sequence_no ?? 1,
          subject_id: itemSubjectId ?? null,
        });

        ensuredItems.push({
          ...data,
          is_child_component: true,
          child_subject_id: item.child_subject_id,
          child_rule_id: item.child_rule_id,
        });
      }

      result.push({ ...cat, items: ensuredItems });
      continue;
    }

    if (cat.items?.length) {
      result.push(cat);
      continue;
    }

    const maxScore = cat.is_attendance
      ? Number(attendanceMax) || Number(cat.max_score) || null
      : Number(cat.max_score) || null;

    const itemName = cat.is_attendance
      ? "DAYS"
      : cat.symbol || cat.name_en || "Score";

    const data = await ensureAssessmentItem({
      grade_subject_grading_rule_id: cat.rule_id,
      item_name: itemName,
      max_score: maxScore,
      sequence_no: 1,
      subject_id: subjectId ?? null,
    });

    result.push({
      ...cat,
      items: [data],
    });
  }

  return result;
}

/**
 * Upsert scores by (student_id, assessment_item_id, academic_period_id, class_id).
 * @param {Array<{ student_id, assessment_item_id, score, academic_period_id, class_id }>} rows
 */
export async function upsertScores(rows) {
  if (!rows?.length) return;

  const payload = rows.map((row) => ({
    student_id: row.student_id,
    assessment_item_id: row.assessment_item_id,
    academic_period_id: row.academic_period_id,
    class_id: row.class_id,
    score: row.score === "" || row.score == null ? null : Number(row.score),
  }));

  await saveStudentScores(payload);
}

/**
 * Build score map: studentId → { [itemId]: score }
 */
export function buildScoreMap(scoreRows = []) {
  const map = new Map();

  for (const row of scoreRows) {
    if (!map.has(row.student_id)) map.set(row.student_id, {});
    map.get(row.student_id)[row.assessment_item_id] =
      row.score == null ? null : Number(row.score);
  }

  return map;
}
