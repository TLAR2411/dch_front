/**
 * Shared subject-average loading for exam reports (Ranking, Recommendations, Individual).
 */
import {
  calcAverageGrade,
  calcCategoryPercent,
  categorySortIndex,
  normalizeCategoryKey,
  resolveCategoryMax,
  roundScore,
  sumItemScores,
} from "@/utils/gradeCalculation.js";
import { resolveSubjectAttendanceMax } from "@/utils/schoolDays.js";
import {
  buildCompositeLayout,
  buildScoreMap,
  fetchChildGradingRules,
  fetchChildSubjects,
  fetchClassStudents,
  fetchExistingScores,
  fetchGradingLayout,
  fetchSubjectsForGrade,
  fetchTerms,
} from "@/views/global/score/scoreEntryService.js";

/** E / G / N scale from the printed academic report. */
export function letterGrade(score) {
  if (score == null || !Number.isFinite(Number(score))) return "—";
  const n = Number(score);
  if (n >= 90) return "E";
  if (n >= 80) return "G";
  return "N";
}

function categoryApplies(cat) {
  if (!cat) return false;
  if (cat.is_attendance) return true;
  return (cat.items || []).length > 0;
}

function studentCategoryPercent(cat, scoreBag, attendanceMax) {
  if (!categoryApplies(cat)) return null;

  return roundScore(
    calcCategoryPercent({
      studentTotal: sumItemScores(scoreBag, cat.items || []),
      categoryMax: resolveCategoryMax({
        items: cat.items || [],
        categoryMax: cat.max_score,
        attendanceMax,
        isAttendance: cat.is_attendance,
      }),
      weight: cat.percentage,
    }),
    2,
  );
}

/** Union of grading categories across subjects (actual category names). */
export function buildCriteriaFromLayouts(layoutsBySubjectId) {
  const map = new Map();

  for (const layout of layoutsBySubjectId.values()) {
    for (const cat of layout || []) {
      const key = cat.category_key || normalizeCategoryKey(cat.name_en);
      if (!key || map.has(key)) continue;
      map.set(key, {
        key,
        label: cat.name_en || key,
      });
    }
  }

  return [...map.values()].sort(
    (a, b) =>
      categorySortIndex(a.label) - categorySortIndex(b.label) ||
      String(a.label).localeCompare(String(b.label)),
  );
}

export function sumSubjectCategoryPercentage(categories = []) {
  return roundScore(
    categories.reduce((sum, cat) => sum + (Number(cat.percentage) || 0), 0),
    2,
  );
}

export function studentSubjectAverage(categories, scoreBag, attendanceMax) {
  if (!categories?.length) return 0;

  const percents = categories.map((cat) => ({
    percent: calcCategoryPercent({
      studentTotal: sumItemScores(scoreBag, cat.items || []),
      categoryMax: resolveCategoryMax({
        items: cat.items || [],
        categoryMax: cat.max_score,
        attendanceMax,
        isAttendance: cat.is_attendance,
      }),
      weight: cat.percentage,
    }),
  }));

  return roundScore(calcAverageGrade(percents), 2);
}

export async function loadSubjectLayout({ yearId, gradeId, subjectId }) {
  let layout = await fetchGradingLayout({ yearId, gradeId, subjectId });
  if (!layout.length) return [];

  const children = await fetchChildSubjects(subjectId);
  if (children.length) {
    const childRules = await fetchChildGradingRules({
      yearId,
      gradeId,
      childSubjectIds: children.map((c) => c.id),
    });
    layout = buildCompositeLayout(layout, children, childRules);
  }

  return layout.map((cat) => ({
    ...cat,
    items: (cat.items || []).filter((item) => item?.id),
  }));
}

export async function resolveTermIds({ typeReport, termId, yearId }) {
  if (typeReport === "Term") {
    return termId ? [termId] : [];
  }

  const terms = await fetchTerms(yearId);
  return (terms || []).map((t) => t.id).filter(Boolean);
}

async function loadPeriodSubjectScores({
  students,
  subjectList,
  classId,
  termId,
  term,
  yearId,
  layoutsBySubjectId,
}) {
  const byStudent = new Map(students.map((s) => [s.student_id, {}]));

  for (const subject of subjectList) {
    const layout = layoutsBySubjectId.get(subject.id) || [];
    const attendanceMax = await resolveSubjectAttendanceMax({
      classId,
      subjectId: subject.id,
      startDate: term?.start_date,
      endDate: term?.end_date,
      yearId,
      fallbackSchoolDays: term?.school_days,
    });

    const itemIds = layout.flatMap((c) =>
      (c.items || []).map((i) => i.id).filter(Boolean),
    );

    let scoreMap = new Map();
    if (itemIds.length && students.length) {
      const rows = await fetchExistingScores({
        studentIds: students.map((s) => s.student_id),
        assessmentItemIds: itemIds,
        academicPeriodId: termId,
        classId,
      });
      scoreMap = buildScoreMap(rows);
    }

    for (const student of students) {
      const bag = scoreMap.get(student.student_id) || {};
      const avg = studentSubjectAverage(layout, bag, attendanceMax);
      byStudent.get(student.student_id)[subject.id] = avg;
    }
  }

  return byStudent;
}

function mergePeriodScores(periodMaps, students, subjectList) {
  const merged = new Map();

  for (const student of students) {
    const scores = {};
    for (const subject of subjectList) {
      const values = [];
      for (const map of periodMaps) {
        const v = map.get(student.student_id)?.[subject.id];
        if (v != null && Number.isFinite(Number(v))) values.push(Number(v));
      }
      scores[subject.id] = values.length
        ? roundScore(values.reduce((a, b) => a + b, 0) / values.length, 2)
        : 0;
    }
    merged.set(student.student_id, scores);
  }

  return merged;
}

/**
 * Load subjects + students + per-student subject averages for a class/term/year.
 *
 * @returns {{
 *   subjects: Array,
 *   students: Array,
 *   scoreByStudent: Map<number, Record<number, number>>,
 *   termIds: number[],
 * }}
 */
export async function loadClassSubjectAverages({
  yearId,
  gradeId,
  classId,
  typeReport,
  termId,
}) {
  const termIds = await resolveTermIds({ typeReport, termId, yearId });
  if (!termIds.length) {
    return {
      subjects: [],
      students: [],
      scoreByStudent: new Map(),
      termIds: [],
      error: "No term found for this report.",
    };
  }

  const [subjectList, students, terms] = await Promise.all([
    fetchSubjectsForGrade(yearId, gradeId),
    fetchClassStudents(classId),
    fetchTerms(yearId),
  ]);

  if (!subjectList.length) {
    return {
      subjects: [],
      students: [],
      scoreByStudent: new Map(),
      termIds,
      error: "No subjects found for this grade.",
    };
  }

  if (!students.length) {
    return {
      subjects: [],
      students: [],
      scoreByStudent: new Map(),
      termIds,
      error: "No students in this class.",
    };
  }

  const layoutsBySubjectId = new Map();
  const subjectsWithMax = [];

  for (const subject of subjectList) {
    const layout = await loadSubjectLayout({
      yearId,
      gradeId,
      subjectId: subject.id,
    });
    layoutsBySubjectId.set(subject.id, layout);
    subjectsWithMax.push({
      ...subject,
      subject_max: sumSubjectCategoryPercentage(layout),
    });
  }

  const termsById = new Map(
    (terms || []).map((t) => [Number(t.id), t]),
  );

  const periodMaps = [];
  for (const periodId of termIds) {
    const term = termsById.get(Number(periodId)) ?? null;
    const map = await loadPeriodSubjectScores({
      students,
      subjectList: subjectsWithMax,
      classId,
      termId: periodId,
      term,
      yearId,
      layoutsBySubjectId,
    });
    periodMaps.push(map);
  }

  const scoreByStudent =
    periodMaps.length === 1
      ? periodMaps[0]
      : mergePeriodScores(periodMaps, students, subjectsWithMax);

  return {
    subjects: subjectsWithMax,
    students,
    scoreByStudent,
    termIds,
    error: null,
  };
}

async function loadPeriodCategoryBreakdown({
  students,
  subjectList,
  classId,
  termId,
  term,
  yearId,
  layoutsBySubjectId,
  criteria,
}) {
  const byStudent = new Map(
    students.map((s) => [
      s.student_id,
      {
        categories: {},
        totals: {},
      },
    ]),
  );

  for (const subject of subjectList) {
    const layout = layoutsBySubjectId.get(subject.id) || [];
    const attendanceMax = await resolveSubjectAttendanceMax({
      classId,
      subjectId: subject.id,
      startDate: term?.start_date,
      endDate: term?.end_date,
      yearId,
      fallbackSchoolDays: term?.school_days,
    });

    const itemIds = layout.flatMap((c) =>
      (c.items || []).map((i) => i.id).filter(Boolean),
    );

    let scoreMap = new Map();
    if (itemIds.length && students.length) {
      const rows = await fetchExistingScores({
        studentIds: students.map((s) => s.student_id),
        assessmentItemIds: itemIds,
        academicPeriodId: termId,
        classId,
      });
      scoreMap = buildScoreMap(rows);
    }

    for (const student of students) {
      const bag = scoreMap.get(student.student_id) || {};
      const entry = byStudent.get(student.student_id);
      const catScores = {};

      for (const row of criteria) {
        const cat =
          layout.find(
            (c) =>
              c.category_key === row.key ||
              normalizeCategoryKey(c.name_en) === row.key,
          ) || null;
        catScores[row.key] = studentCategoryPercent(cat, bag, attendanceMax);
      }

      entry.categories[subject.id] = catScores;
      entry.totals[subject.id] = studentSubjectAverage(
        layout,
        bag,
        attendanceMax,
      );
    }
  }

  return byStudent;
}

function mergePeriodCategoryBreakdown(
  periodMaps,
  students,
  subjectList,
  criteria,
) {
  const merged = new Map();

  for (const student of students) {
    const categories = {};
    const totals = {};

    for (const subject of subjectList) {
      const catKeys = {};
      for (const row of criteria) {
        const values = [];
        for (const map of periodMaps) {
          const v =
            map.get(student.student_id)?.categories?.[subject.id]?.[row.key];
          if (v != null && Number.isFinite(Number(v))) values.push(Number(v));
        }
        catKeys[row.key] = values.length
          ? roundScore(values.reduce((a, b) => a + b, 0) / values.length, 2)
          : null;
      }
      categories[subject.id] = catKeys;

      const totalValues = [];
      for (const map of periodMaps) {
        const v = map.get(student.student_id)?.totals?.[subject.id];
        if (v != null && Number.isFinite(Number(v))) totalValues.push(Number(v));
      }
      totals[subject.id] = totalValues.length
        ? roundScore(
            totalValues.reduce((a, b) => a + b, 0) / totalValues.length,
            2,
          )
        : 0;
    }

    merged.set(student.student_id, { categories, totals });
  }

  return merged;
}

function finalizeStudentBreakdown(entry, subjectList) {
  const grades = {};
  let sum = 0;
  let count = 0;

  for (const subject of subjectList) {
    const total = Number(entry.totals?.[subject.id]) || 0;
    grades[subject.id] = letterGrade(total);
    sum += total;
    count += 1;
  }

  const average = count ? roundScore(sum / count, 2) : 0;

  return {
    categories: entry.categories || {},
    totals: entry.totals || {},
    grades,
    average,
    overallGrade: letterGrade(average),
  };
}

/**
 * Fast setup for individual report: students + subjects + criteria (no scores yet).
 */
export async function loadIndividualReportSetup({
  yearId,
  gradeId,
  classId,
  typeReport,
  termId,
}) {
  const termIds = await resolveTermIds({ typeReport, termId, yearId });
  if (!termIds.length) {
    return {
      subjects: [],
      students: [],
      criteria: [],
      layoutsBySubjectId: new Map(),
      termIds: [],
      terms: [],
      error: "No term found for this report.",
    };
  }

  const [subjectList, students, terms] = await Promise.all([
    fetchSubjectsForGrade(yearId, gradeId),
    fetchClassStudents(classId),
    fetchTerms(yearId),
  ]);

  if (!subjectList.length) {
    return {
      subjects: [],
      students: [],
      criteria: [],
      layoutsBySubjectId: new Map(),
      termIds,
      terms: terms || [],
      error: "No subjects found for this grade.",
    };
  }

  if (!students.length) {
    return {
      subjects: [],
      students: [],
      criteria: [],
      layoutsBySubjectId: new Map(),
      termIds,
      terms: terms || [],
      error: "No students in this class.",
    };
  }

  const layoutsBySubjectId = new Map();
  const subjectsWithMax = [];

  await Promise.all(
    subjectList.map(async (subject) => {
      const layout = await loadSubjectLayout({
        yearId,
        gradeId,
        subjectId: subject.id,
      });
      layoutsBySubjectId.set(subject.id, layout);
      subjectsWithMax.push({
        ...subject,
        subject_max: sumSubjectCategoryPercentage(layout),
        hasMapec: /mapec/i.test(subject.name_en || ""),
      });
    }),
  );

  subjectsWithMax.sort((a, b) =>
    String(a.name_en || "").localeCompare(String(b.name_en || "")),
  );

  return {
    subjects: subjectsWithMax,
    students,
    criteria: buildCriteriaFromLayouts(layoutsBySubjectId),
    layoutsBySubjectId,
    termIds,
    terms: terms || [],
    error: null,
  };
}

/**
 * Load criteria × subject scores for one selected student only.
 */
export async function loadStudentCategoryBreakdown({
  yearId,
  classId,
  student,
  subjects,
  criteria,
  layoutsBySubjectId,
  termIds,
  terms,
}) {
  if (!student?.student_id) {
    return { report: null, error: "No student selected." };
  }

  if (!termIds?.length) {
    return { report: null, error: "No term found for this report." };
  }

  const students = [student];
  const termsById = new Map((terms || []).map((t) => [Number(t.id), t]));
  const criteriaRows = criteria?.length
    ? criteria
    : buildCriteriaFromLayouts(layoutsBySubjectId);

  const periodMaps = [];
  for (const periodId of termIds) {
    const term = termsById.get(Number(periodId)) ?? null;
    const map = await loadPeriodCategoryBreakdown({
      students,
      subjectList: subjects,
      classId,
      termId: periodId,
      term,
      yearId,
      layoutsBySubjectId,
      criteria: criteriaRows,
    });
    periodMaps.push(map);
  }

  const raw =
    periodMaps.length === 1
      ? periodMaps[0]
      : mergePeriodCategoryBreakdown(
          periodMaps,
          students,
          subjects,
          criteriaRows,
        );

  return {
    report: finalizeStudentBreakdown(
      raw.get(student.student_id) || {},
      subjects,
    ),
    error: null,
  };
}

/**
 * @deprecated Prefer loadIndividualReportSetup + loadStudentCategoryBreakdown.
 * Kept for any callers that still need full-class category maps.
 */
export async function loadClassCategoryBreakdown({
  yearId,
  gradeId,
  classId,
  typeReport,
  termId,
}) {
  const setup = await loadIndividualReportSetup({
    yearId,
    gradeId,
    classId,
    typeReport,
    termId,
  });

  if (setup.error) {
    return {
      subjects: [],
      students: [],
      criteria: [],
      byStudent: new Map(),
      termIds: setup.termIds || [],
      error: setup.error,
    };
  }

  const termsById = new Map(
    (setup.terms || []).map((t) => [Number(t.id), t]),
  );

  const periodMaps = [];
  for (const periodId of setup.termIds) {
    const term = termsById.get(Number(periodId)) ?? null;
    const map = await loadPeriodCategoryBreakdown({
      students: setup.students,
      subjectList: setup.subjects,
      classId,
      termId: periodId,
      term,
      yearId,
      layoutsBySubjectId: setup.layoutsBySubjectId,
      criteria: setup.criteria,
    });
    periodMaps.push(map);
  }

  const raw =
    periodMaps.length === 1
      ? periodMaps[0]
      : mergePeriodCategoryBreakdown(
          periodMaps,
          setup.students,
          setup.subjects,
          setup.criteria,
        );

  const byStudent = new Map();
  for (const student of setup.students) {
    byStudent.set(
      student.student_id,
      finalizeStudentBreakdown(raw.get(student.student_id) || {}, setup.subjects),
    );
  }

  return {
    subjects: setup.subjects,
    students: setup.students,
    criteria: setup.criteria,
    byStudent,
    termIds: setup.termIds,
    error: null,
  };
}
