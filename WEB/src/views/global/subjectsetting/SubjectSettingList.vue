<script setup>
import { useI18n } from "vue-i18n";
import { api } from "@/utils/api";
import { useDisplay } from "vuetify";
import formatTime from "@/utils/formater/formatTime";
import AddEditSubjectSettingDialog from "./AddEditSubjectSettingDialog.vue";
import AddEditAssessmentDialog from "./AddEditAssessmentDialog.vue";
import SubjectSettingRuleList from "./SubjectSettingRuleList.vue";
import { onMounted, ref, computed } from "vue";
import { getSubjects } from "@/services/dataService.js";
import supabase from "@/utils/supabase.js";
import successAlert from "@/helper/successAlert.js";
import DeleteAlert from "@/helper/deleteAlert.js";

import { useYearStore } from "@/stores/yearStore.js";

const yearStore = useYearStore();

const yearId = yearStore.year_id;

const { mdAndUp } = useDisplay();

definePage({
  meta: {
    title: "Checkin Checkout",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-curriculumns",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});

const { t } = useI18n();

const formData = ref({});
const isDialogVisible = ref(false);
const isAssessmentDialogVisible = ref(false);
const assessmentFormData = ref({});
const isLoading = ref(true);

const subjects = ref([]);
const grades = ref([]); // grouped grade -> subjects -> rules, same shape as the API payload

const filter = ref({
  search: null,
});

// only one grade open at a time
const openGradeId = ref(null);
// only one parent subject open at a time
const openSubjectKey = ref(null);
// only one child subject open at a time per parent
const openChildSubjects = ref({});
// only one category/rule open at a time
const openRuleKey = ref(null);

const toggleGrade = (gradeId) => {
  openGradeId.value = openGradeId.value === gradeId ? null : gradeId;
};

const subjectRowKey = (gradeId, subjectId) => `${gradeId}-${subjectId}`;

const isSubjectOpen = (gradeId, subjectId) =>
  openSubjectKey.value === subjectRowKey(gradeId, subjectId);

const toggleSubject = (subjectRowId) => {
  openSubjectKey.value =
    openSubjectKey.value === subjectRowId ? null : subjectRowId;
  openRuleKey.value = null;
};

const parentChildKey = (gradeId, parentSubjectId) =>
  `${gradeId}-${parentSubjectId}`;

const subjectSectionKey = (gradeId, subjectId) => `${gradeId}-${subjectId}`;

const openSubjectSections = ref({});

const isChildSubjectOpen = (gradeId, parentSubjectId, childSubjectId) =>
  openChildSubjects.value[parentChildKey(gradeId, parentSubjectId)] ===
  childSubjectId;

const toggleChildSubject = (gradeId, parentSubjectId, childSubjectId) => {
  const parentKey = parentChildKey(gradeId, parentSubjectId);
  const isOpen = openChildSubjects.value[parentKey] === childSubjectId;

  openChildSubjects.value = {
    ...openChildSubjects.value,
    [parentKey]: isOpen ? null : childSubjectId,
  };

  if (!isOpen) {
    openRuleKey.value = null;
  }
};

const toggleSubjectSection = (gradeId, subjectId, section) => {
  const key = subjectSectionKey(gradeId, subjectId);
  const isClosing = openSubjectSections.value[key] === section;

  openSubjectSections.value = {
    ...openSubjectSections.value,
    [key]: isClosing ? null : section,
  };
  openRuleKey.value = null;
};

const toggleRule = (key) => {
  openRuleKey.value = openRuleKey.value === key ? null : key;
};

const totalMaxScore = (subject) =>
  (subject.rules || []).reduce((sum, r) => sum + Number(r.max_score || 0), 0);

const totalPercentage = (subject) =>
  (subject.rules || []).reduce((sum, r) => sum + Number(r.percentage || 0), 0);

const filteredGrades = computed(() => {
  const q = (filter.value.search || "").trim().toLowerCase();
  if (!q) return grades.value;

  return grades.value
    .map((grade) => {
      const gradeMatches =
        grade.grade?.name_en?.toLowerCase().includes(q) ||
        grade.grade?.name_kh?.toLowerCase().includes(q);

      const matchingSubjects = (grade.subjects || []).filter((s) => {
        const parentMatches =
          s.subject?.name_en?.toLowerCase().includes(q) ||
          s.subject?.name_kh?.toLowerCase().includes(q);

        const childMatches = (s.child_subjects || []).some(
          (child) =>
            child.subject?.name_en?.toLowerCase().includes(q) ||
            child.subject?.name_kh?.toLowerCase().includes(q),
        );

        return parentMatches || childMatches;
      });

      if (gradeMatches) return grade;
      if (matchingSubjects.length)
        return { ...grade, subjects: matchingSubjects };
      return null;
    })
    .filter(Boolean);
});

const fetchGrades = async () => {
  isLoading.value = true;
  try {
    const res = await api.post("grading-rule-list");
    if (res.data.status) {
      grades.value = res.data.data.data ?? res.data.data;

      // default: expand the first grade so the page isn't empty on load
      if (grades.value.length && openGradeId.value === null) {
        openGradeId.value = grades.value[0].grade_id;
      }
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

// const onDelete = async (id, type) => {
//   try {
//     const res = await api.post("grading-rule-delete", {
//       id: id,
//       type: type,
//       grade_id: formData.value.grade_id || null,
//     });
//     if (res.data.status) {
//       await fetchGrades();
//     } else {
//       console.error("Error with the response:", res.data);
//     }
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//   } finally {
//     isLoading.value = false;
//   }
// };

const collectSubjectIdsForDelete = async (subjectId) => {
  const { data: children, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("parent_id", subjectId);

  if (error) throw error;

  const childIds = (children || []).map((child) => child.id);

  return {
    subjectIds: [subjectId, ...childIds],
    childIds,
  };
};

const fetchGradingRuleIdsForSubjects = async (
  subjectIds,
  childIds,
  gradeId,
) => {
  let query = supabase
    .from("grade_subject_grading_rule")
    .select("id")
    .eq("grade_id", gradeId)
    .eq("year_id", yearId);

  if (childIds.length) {
    query = query.or(
      `subject_id.in.(${subjectIds.join(",")}),child_subject_id.in.(${childIds.join(",")})`,
    );
  } else {
    query = query.in("subject_id", subjectIds);
  }

  const { data: rules, error } = await query;
  if (error) throw error;

  return (rules || []).map((rule) => rule.id);
};

const deleteAssessmentsByRuleIds = async (ruleIds) => {
  if (!ruleIds.length) return;

  const { error } = await supabase
    .from("assessment_items")
    .delete()
    .in("grade_subject_grading_rule_id", ruleIds);

  if (error) throw error;
};

const deleteGradingRulesByIds = async (ruleIds) => {
  if (!ruleIds.length) return;

  const { error } = await supabase
    .from("grade_subject_grading_rule")
    .delete()
    .in("id", ruleIds);

  if (error) throw error;
};

const onDeleteRule = async (id) => {
  await DeleteAlert(async () => {
    try {
      await deleteAssessmentsByRuleIds([id]);
      await deleteGradingRulesByIds([id]);

      successAlert.fire({
        icon: "success",
        title: "Rule deleted successfully",
      });
      fetchGrades1();
    } catch (error) {
      console.error("Failed to delete rule:", error);
      successAlert.fire({
        icon: "error",
        title: error.message || "Failed to delete rule",
      });
    }
  });
};

const onDelete = async (subjectId, gradeId) => {
  if (!gradeId) {
    successAlert.fire({
      icon: "error",
      title: "Grade is required to delete subject grading rules",
    });
    return;
  }

  await DeleteAlert(async () => {
    try {
      const { subjectIds, childIds } =
        await collectSubjectIdsForDelete(subjectId);

      const ruleIds = await fetchGradingRuleIdsForSubjects(
        subjectIds,
        childIds,
        gradeId,
      );

      await deleteAssessmentsByRuleIds(ruleIds);
      await deleteGradingRulesByIds(ruleIds);

      successAlert.fire({
        icon: "success",
        title:
          childIds.length > 0
            ? "Subject, child subjects, rules, and assessments deleted successfully"
            : "Subject rules and assessments deleted successfully",
      });
      fetchGrades1();
    } catch (error) {
      console.error("Failed to delete subject grading data:", error);
      successAlert.fire({
        icon: "error",
        title: error.message || "Failed to delete subject grading data",
      });
    }
  });
};

const onCreate = async (data, callback) => {
  try {
    isLoading.value = true;
    const res = await api.post("grading-rule-store", data);
    if (res.data.status) {
      await fetchGrades1();
      isDialogVisible.value = false;
    } else {
      console.error("Error with the response:", res.data);
    }
    callback(res.data.status);
    subjects.value = await getSubjects();
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

const onEdit = async (id, type, grade_id = null) => {
  console.log("edit item", id, type);
  try {
    isLoading.value = true;
    const res = await api.post("grading-rule-show", {
      id: id,
      type: type,
      grade_id: grade_id,
    });

    if (res.data.status) {
      formData.value = res.data.data;
      formData.value.edit_mode = type;
      formData.value.isEdit = true;
      isDialogVisible.value = true;
    } else {
      console.error("Error with the response:", res.data);
    }
  } catch (error) {
    console.error("Failed to fetch data:", error);
  } finally {
    isLoading.value = false;
  }
};

// const onUpdate = async (data, callback) => {
//   try {
//     isLoading.value = true;
//     const res = await api.post("grading-rule-update", data);

//     if (res.data.status) {
//       await fetchGrades();
//       isDialogVisible.value = false;
//     } else {
//       console.error("Error with the response:", res.data);
//     }
//     callback(res.data.status);
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//   } finally {
//     isLoading.value = false;
//   }
// };

const fetchChildSubjectRows = async (parentSubjectId) => {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name_en")
    .eq("parent_id", parentSubjectId);

  if (error) throw error;
  return data ?? [];
};

const validateParentChildCategoryMaxScores = async ({
  subjectId,
  yearId: selectedYearId,
  gradeIds,
  rules,
}) => {
  const { data: subjectRow, error: subjectError } = await supabase
    .from("subjects")
    .select("id, parent_id, name_en")
    .eq("id", subjectId)
    .single();

  if (subjectError) throw subjectError;

  if (subjectRow.parent_id) {
    for (const rule of rules) {
      if (Number(rule.percentage || 0) !== 0) {
        return `${subjectRow.name_en}: child subject categories should have 0% weight (they roll up into the parent).`;
      }
    }

    const siblings = await fetchChildSubjectRows(subjectRow.parent_id);
    const siblingIds = siblings.map((child) => child.id);

    for (const gradeId of gradeIds) {
      for (const rule of rules) {
        const { data: siblingRules, error } = await supabase
          .from("grade_subject_grading_rule")
          .select("subject_id, category_id, max_score")
          .eq("year_id", selectedYearId)
          .eq("grade_id", gradeId)
          .eq("category_id", rule.category_id)
          .in("subject_id", siblingIds);

        if (error) throw error;

        const siblingTotal = siblings.reduce((sum, sibling) => {
          if (Number(sibling.id) === Number(subjectId)) {
            return sum + Number(rule.max_score || 0);
          }

          const row = (siblingRules ?? []).find(
            (entry) => entry.subject_id === sibling.id,
          );
          return sum + Number(row?.max_score || 0);
        }, 0);

        const { data: parentRule, error: parentError } = await supabase
          .from("grade_subject_grading_rule")
          .select("max_score")
          .eq("year_id", selectedYearId)
          .eq("grade_id", gradeId)
          .eq("subject_id", subjectRow.parent_id)
          .eq("category_id", rule.category_id)
          .maybeSingle();

        if (parentError) throw parentError;
        if (!parentRule) continue;

        const parentMax = Number(parentRule.max_score);
        if (!Number.isFinite(parentMax)) continue;

        if (Math.abs(parentMax - siblingTotal) > 0.01) {
          return `Child max scores for this category sum to ${siblingTotal} pts, but the parent category max is ${parentMax} pts. Adjust parent or child rules so they match.`;
        }
      }
    }

    return null;
  }

  const children = await fetchChildSubjectRows(subjectId);
  if (!children.length) return null;

  for (const gradeId of gradeIds) {
    const { data: childRules, error } = await supabase
      .from("grade_subject_grading_rule")
      .select("subject_id, category_id, max_score")
      .eq("year_id", selectedYearId)
      .eq("grade_id", gradeId)
      .in(
        "subject_id",
        children.map((child) => child.id),
      );

    if (error) throw error;

    const childMaxByCategory = new Map();
    for (const row of childRules ?? []) {
      childMaxByCategory.set(
        row.category_id,
        (childMaxByCategory.get(row.category_id) || 0) +
          Number(row.max_score || 0),
      );
    }

    for (const rule of rules) {
      const childTotal = childMaxByCategory.get(rule.category_id);
      if (childTotal == null) continue;

      const parentMax = Number(rule.max_score);
      if (!Number.isFinite(parentMax)) continue;

      if (Math.abs(parentMax - childTotal) > 0.01) {
        return `Category max score (${parentMax} pts) must equal the sum of child subject max scores (${childTotal} pts).`;
      }
    }
  }

  return null;
};

const onUpdate = async (data, callback) => {
  isLoading.value = true;
  try {
    const { subject_id, year_id, rules } = data;
    const gradeIds = Array.isArray(data.grade_id)
      ? data.grade_id
      : [data.grade_id];

    if (!subject_id || !year_id || !gradeIds.length || !rules?.length) {
      console.error("Missing subject_id / year_id / grade_id / rules");
      callback(false);
      return;
    }

    const validationMessage = await validateParentChildCategoryMaxScores({
      subjectId: subject_id,
      yearId: year_id,
      gradeIds,
      rules,
    });

    if (validationMessage) {
      successAlert.fire({
        icon: "error",
        title: validationMessage,
      });
      callback(false, validationMessage);
      return;
    }

    // 1. Fetch existing rows ONLY for the grades being edited (not the whole subject/year)
    const { data: existingRows, error: fetchError } = await supabase
      .from("grade_subject_grading_rule")
      .select("*")
      .eq("subject_id", subject_id)
      .eq("year_id", year_id)
      .in("grade_id", gradeIds);

    if (fetchError) throw fetchError;

    // 2. If multiple grades selected, make sure they currently share
    //    the exact same category_id set before allowing a bulk update
    if (gradeIds.length > 1) {
      const categorySetByGrade = new Map();
      for (const grade_id of gradeIds) {
        const cats = existingRows
          .filter((r) => r.grade_id === grade_id)
          .map((r) => r.category_id)
          .sort((a, b) => a - b)
          .join(",");
        categorySetByGrade.set(grade_id, cats);
      }

      // ignore grades that have no existing rules yet (newly added to this subject)
      const nonEmptySets = [...categorySetByGrade.values()].filter(
        (v) => v !== "",
      );
      const uniqueSets = new Set(nonEmptySets);

      if (uniqueSets.size > 1) {
        const message =
          "Selected grades have different rule categories. Please update them individually.";
        console.error(message, Object.fromEntries(categorySetByGrade));
        callback(false, message); // <-- pass message as 2nd arg
        return;
      }
    }

    // 3. Diff — scoped only to the selected grades
    const key = (grade_id, category_id) => `${grade_id}::${category_id}`;
    const existingMap = new Map(
      existingRows.map((row) => [key(row.grade_id, row.category_id), row]),
    );

    const desiredKeys = new Set();
    const toInsert = [];
    const toUpdate = [];

    for (const grade_id of gradeIds) {
      for (const rule of rules) {
        const k = key(grade_id, rule.category_id);
        desiredKeys.add(k);

        const existing = existingMap.get(k);
        if (existing) {
          if (
            existing.percentage !== rule.percentage ||
            existing.max_score !== rule.max_score
          ) {
            toUpdate.push({
              id: existing.id,
              percentage: rule.percentage,
              max_score: rule.max_score,
            });
          }
        } else {
          toInsert.push({
            subject_id,
            year_id,
            grade_id,
            category_id: rule.category_id,
            percentage: rule.percentage,
            max_score: rule.max_score,
          });
        }
      }
    }

    // 4. Delete only rows WITHIN the selected grades that are no longer desired
    //    (e.g. a category was removed from the rules list for these grades)
    // const toDeleteIds = existingRows
    //   .filter((row) => !desiredKeys.has(key(row.grade_id, row.category_id)))
    //   .map((row) => row.id);

    const toDeleteIds =
      data.edit_mode === "subject"
        ? existingRows
            .filter(
              (row) => !desiredKeys.has(key(row.grade_id, row.category_id)),
            )
            .map((row) => row.id)
        : [];

    // --- execute ---
    if (toDeleteIds.length) {
      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .delete()
        .in("id", toDeleteIds);
      if (error) throw error;
    }

    for (const row of toUpdate) {
      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .update({ percentage: row.percentage, max_score: row.max_score })
        .eq("id", row.id);
      if (error) throw error;
    }

    if (toInsert.length) {
      const { error } = await supabase
        .from("grade_subject_grading_rule")
        .insert(toInsert);
      if (error) throw error;
    }

    await fetchGrades1();
    isDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to update grading rule:", error);
    callback(false, error.message || "Something went wrong while updating.");
  } finally {
    isLoading.value = false;
  }
};

const onDisable = async (item, callback) => {
  try {
    const res = await api.post("grading-rule-disable", {
      id: item.id,
    });

    if (res.data.status) {
      await fetchGrades1();
    } else {
      console.error("Error with the response:", res.data);
    }
    callback?.(res.data.status);
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }
};

const gradeSubjectRulesKey = (gradeId, subjectId) => `${gradeId}-${subjectId}`;

const mapRulePayload = (row) => ({
  grading_rule_id: row.id,
  grade_id: row.grade_id ?? null,
  subject_id: row.subject_id ?? null,
  category_id: row.category_id ?? null,
  category: row.category
    ? {
        name_en: row.category.name_en ?? null,
        name_kh: row.category.name_kh ?? null,
      }
    : {
        name_en: null,
        name_kh: null,
      },
  percentage: row.percentage ?? null,
  max_score: row.max_score ?? null,
  assessments: (row.assessments ?? [])
    .filter(
      (assessment) =>
        assessment.subject_id == null ||
        Number(assessment.subject_id) === Number(row.subject_id),
    )
    .map((assessment) => ({
      id: assessment.id,
      item_name: assessment.item_name ?? null,
      max_score: assessment.max_score ?? null,
      sequence_no: assessment.sequence_no ?? null,
      subject_id: assessment.subject_id ?? null,
    }))
    .sort((a, b) => {
      const aSeq = Number(a.sequence_no ?? 0);
      const bSeq = Number(b.sequence_no ?? 0);
      return aSeq - bSeq || Number(a.id ?? 0) - Number(b.id ?? 0);
    }),
});

const sortRules = (rules) =>
  [...rules].sort((a, b) => {
    if (a.category_id == null && b.category_id == null) return 0;
    if (a.category_id == null) return 1;
    if (b.category_id == null) return -1;
    return a.category_id - b.category_id;
  });

const mapSubjectPayload = (
  subjectId,
  subject,
  rules,
  childSubjects = [],
  rulesByGradeSubjectId = new Map(),
  gradeId = null,
) => ({
  subject_id: subjectId,
  subject: subject
    ? {
        name_en: subject.name_en ?? null,
        name_kh: subject.name_kh ?? null,
      }
    : null,
  rules: sortRules(rules),
  child_subjects: [...childSubjects]
    .sort((a, b) =>
      String(a.name_en ?? "").localeCompare(String(b.name_en ?? "")),
    )
    .map((child) =>
      mapSubjectPayload(
        child.id,
        child,
        rulesByGradeSubjectId.get(gradeSubjectRulesKey(gradeId, child.id)) ??
          [],
        [],
        rulesByGradeSubjectId,
        gradeId,
      ),
    ),
});

const fetchGrades1 = async () => {
  isLoading.value = true;
  try {
    const { data: ruleRows, error: rulesError } = await supabase
      .from("grade_subject_grading_rule")
      .select(`
        id,
        grade_id,
        year_id,
        subject_id,
        category_id,
        percentage,
        max_score,
        grade:grades(name_en, name_kh),
        year:school_year(year_name),
        subject:subjects(name_en, name_kh, parent_id),
        category:grading_category(name_en, name_kh),
        assessments:assessment_items(id, item_name, max_score, sequence_no, subject_id)
      `)
      .eq("year_id", yearId);

    if (rulesError) throw rulesError;

    const rows = ruleRows ?? [];
    const rulesByGradeSubjectId = new Map();
    const groupedByGrade = new Map();

    for (const row of rows) {
      const ruleKey = gradeSubjectRulesKey(row.grade_id, row.subject_id);
      if (!rulesByGradeSubjectId.has(ruleKey)) {
        rulesByGradeSubjectId.set(ruleKey, []);
      }
      rulesByGradeSubjectId.get(ruleKey).push(mapRulePayload(row));

      if (!groupedByGrade.has(row.grade_id)) {
        groupedByGrade.set(row.grade_id, {
          grade_id: row.grade_id,
          year_id: row.year_id,
          grade: row.grade ?? null,
          year: row.year ?? null,
          subjects: [],
        });
      }

      const gradeGroup = groupedByGrade.get(row.grade_id);
      let subjectGroup = gradeGroup.subjects.find(
        (subject) => subject.subject_id === row.subject_id,
      );

      if (!subjectGroup) {
        subjectGroup = {
          subject_id: row.subject_id,
          subjectRow: row.subject ?? null,
        };
        gradeGroup.subjects.push(subjectGroup);
      }
    }

    const parentSubjectIds = [
      ...new Set(
        [...groupedByGrade.values()].flatMap((gradeGroup) =>
          gradeGroup.subjects
            .filter((subjectGroup) => !subjectGroup.subjectRow?.parent_id)
            .map((subjectGroup) => subjectGroup.subject_id),
        ),
      ),
    ];

    let childSubjectRows = [];
    if (parentSubjectIds.length) {
      const { data: childRows, error: childError } = await supabase
        .from("subjects")
        .select("id, name_en, name_kh, parent_id")
        .in("parent_id", parentSubjectIds);

      if (childError) throw childError;
      childSubjectRows = childRows ?? [];
    }

    const childrenByParentId = new Map();
    for (const child of childSubjectRows) {
      if (!childrenByParentId.has(child.parent_id)) {
        childrenByParentId.set(child.parent_id, []);
      }
      childrenByParentId.get(child.parent_id).push(child);
    }

    const result = [...groupedByGrade.values()]
      .map((gradeGroup) => ({
        grade_id: gradeGroup.grade_id,
        year_id: gradeGroup.year_id,
        grade: gradeGroup.grade,
        year: gradeGroup.year,
        subjects: gradeGroup.subjects
          .filter((subjectGroup) => !subjectGroup.subjectRow?.parent_id)
          .map((subjectGroup) =>
            mapSubjectPayload(
              subjectGroup.subject_id,
              subjectGroup.subjectRow,
              rulesByGradeSubjectId.get(
                gradeSubjectRulesKey(
                  gradeGroup.grade_id,
                  subjectGroup.subject_id,
                ),
              ) ?? [],
              childrenByParentId.get(subjectGroup.subject_id) ?? [],
              rulesByGradeSubjectId,
              gradeGroup.grade_id,
            ),
          )
          .sort((a, b) =>
            String(a.subject?.name_en ?? "").localeCompare(
              String(b.subject?.name_en ?? ""),
            ),
          ),
      }))
      .sort((a, b) =>
        String(a.grade?.name_en ?? "").localeCompare(String(b.grade?.name_en ?? "")),
      );

    const path = `${window.location.origin}${window.location.pathname}`;

    const response = {
      status: true,
      data: {
        data: result,
        links: {
          first: `${path}?page=1`,
          last: `${path}?page=1`,
          next: null,
          prev: null,
        },
        meta: {
          current_page: 1,
          from: result.length ? 1 : 0,
          to: result.length,
          last_page: 1,
          per_page: 10,
          total: result.length,
          path: `${path}/`,
          links: [
            {
              url: null,
              label: "&laquo; Previous",
              page: null,
              active: false,
            },
            {
              url: `${path}?page=1`,
              label: "1",
              page: 1,
              active: true,
            },
            {
              url: null,
              label: "Next &raquo;",
              page: null,
              active: false,
            },
          ],
        },
      },
    };

    grades.value = response.data.data;

    if (grades.value.length && openGradeId.value === null) {
      openGradeId.value = grades.value[0].grade_id;
    }

    return response;
  } catch (error) {
    console.error("Failed to fetch data from Supabase:", error);
    grades.value = [];
    return {
      status: false,
      data: {
        data: [],
      },
      message: error.message || "Failed to fetch data from Supabase.",
    };
  } finally {
    isLoading.value = false;
  }
};

const openCreateDialog = () => {
  formData.value = {};
  isDialogVisible.value = true;
};

const openAssessmentDialog = (rule, subjectId) => {
  const ruleAssessments = (rule.assessments ?? []).filter(
    (assessment) =>
      assessment.subject_id == null ||
      Number(assessment.subject_id) === Number(subjectId),
  );

  const existingUsedScore = ruleAssessments.reduce(
    (sum, assessment) => sum + Number(assessment.max_score || 0),
    0,
  );

  assessmentFormData.value = {
    grading_rule_id: rule.grading_rule_id,
    subject_id: subjectId,
    category_name: rule.category?.name_en ?? null,
    category_max_score: rule.max_score ?? null,
    category_percentage: rule.percentage ?? null,
    existing_used_score: existingUsedScore,
    existing_count: ruleAssessments.length,
  };
  isAssessmentDialogVisible.value = true;
};

const onCreateAssessment = async (data, callback) => {
  try {
    isLoading.value = true;

    const payload = (data.assessments ?? []).map((row) => ({
      grade_subject_grading_rule_id: data.grading_rule_id,
      item_name: row.item_name,
      max_score: Number(row.max_score),
      sequence_no: row.sequence_no ? Number(row.sequence_no) : null,
      subject_id: data.subject_id ?? null,
    }));

    if (!payload.length) {
      throw new Error("Please add at least one assessment.");
    }

    const { data: ruleRow, error: ruleError } = await supabase
      .from("grade_subject_grading_rule")
      .select("max_score, subject_id")
      .eq("id", data.grading_rule_id)
      .single();

    if (ruleError) throw ruleError;

    if (
      data.subject_id != null &&
      Number(ruleRow.subject_id) !== Number(data.subject_id)
    ) {
      throw new Error("This category does not belong to the selected subject.");
    }

    let existingItemsQuery = supabase
      .from("assessment_items")
      .select("max_score")
      .eq("grade_subject_grading_rule_id", data.grading_rule_id);

    if (data.subject_id != null) {
      existingItemsQuery = existingItemsQuery.eq("subject_id", data.subject_id);
    }

    const { data: existingItems, error: existingError } = await existingItemsQuery;

    if (existingError) throw existingError;

    const categoryMaxScore = Number(ruleRow?.max_score);
    if (Number.isFinite(categoryMaxScore)) {
      const existingTotal = (existingItems ?? []).reduce(
        (sum, item) => sum + Number(item.max_score || 0),
        0,
      );
      const newTotal = payload.reduce(
        (sum, item) => sum + Number(item.max_score || 0),
        0,
      );

      if (existingTotal + newTotal > categoryMaxScore) {
        throw new Error(
          `Total assessment score (${existingTotal + newTotal} pts) exceeds category max (${categoryMaxScore} pts).`,
        );
      }
    }

    const { error } = await supabase.from("assessment_items").insert(payload);

    if (error) throw error;

    successAlert.fire({
      icon: "success",
      title:
        payload.length === 1
          ? "Assessment created successfully"
          : `${payload.length} assessments created successfully`,
    });

    await fetchGrades1();
    isAssessmentDialogVisible.value = false;
    callback(true);
  } catch (error) {
    console.error("Failed to create assessment:", error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to create assessment",
    });
    callback(false);
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  subjects.value = await getSubjects();
  await fetchGrades1();
});
</script>

<template>
  <AddEditSubjectSettingDialog
    v-model:isDialogVisible="isDialogVisible"
    :item-data="formData"
    :loading="isLoading"
    :data="subjects"
    @on-create="onCreate"
    @on-update="onUpdate"
  />

  <AddEditAssessmentDialog
    v-model:isDialogVisible="isAssessmentDialogVisible"
    :item-data="assessmentFormData"
    :loading="isLoading"
    @on-create="onCreateAssessment"
  />

  <div class="grading-rules-scroll">
    <div class="d-flex flex-column gap-4">
      <!-- search + add -->
      <div class="d-flex align-center mt-3 gap-4">
        <AppTextField
          v-model="filter.search"
          :placeholder="t('Search grade or subject...')"
          prepend-inner-icon="tabler-search"
          variant="outlined"
          rounded="lg"
          hide-details
          class="flex-grow-1"
        />
        <VBtn
          color="primary"
          prepend-icon="tabler-plus"
          @click="openCreateDialog"
          density="comfortable"
        >
          {{ t("Add Rule") }}
        </VBtn>
      </div>

      <!-- loading -->

      <VRow v-if="isLoading && !grades.length" class="d-flex justify-center">
        <VCol v-for="n in 4" :key="n" cols="12">
          <VSkeletonLoader type="avatar, sentences" class="border rounded-lg" />
        </VCol>
      </VRow>

      <!-- empty -->
      <VAlert
        v-else-if="!filteredGrades.length"
        type="info"
        variant="tonal"
        :text="t('No grades or subjects match your search.')"
      />

      <!-- grades -->
      <VCard
        v-for="grade in filteredGrades"
        :key="grade.grade_id"
        variant="outlined"
        rounded="lg"
        class="pa-0"
      >
        <!-- grade header -->
        <div
          v-if="mdAndUp"
          class="d-flex align-center justify-space-between pa-4 cursor-pointer"
          @click="toggleGrade(grade.grade_id)"
        >
          <div class="d-flex align-center gap-3">
            <VAvatar color="primary" size="44" rounded="lg">
              <VIcon icon="tabler-school" color="white" size="22" />
            </VAvatar>
            <div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ grade.grade?.name_en }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ grade.grade?.name_kh }}
              </div>
            </div>
          </div>

          <div class="d-flex align-center gap-8">
            <div class="text-center">
              <div style="font-size: 11px">
                {{ t("SUBJECTS") }}
              </div>
              <div class="text-subtitle-1 font-weight-bold">
                {{ grade.subjects?.length ?? 0 }}
              </div>
            </div>
            <VDivider vertical class="mx-2" />
            <div class="text-end">
              <div style="font-size: 11px">
                {{ t("YEAR") }}
              </div>
              <div class="text-subtitle-5 font-weight-bold">
                {{ grade.year?.year_name }}
              </div>
            </div>
            <VIcon
              :icon="
                openGradeId === grade.grade_id
                  ? 'tabler-chevron-up'
                  : 'tabler-chevron-down'
              "
            />
          </div>
        </div>

        <!-- grade header: mobile -->
        <div
          v-else
          class="d-flex justify-space-between gap-2 pa-3 cursor-pointer"
          @click="toggleGrade(grade.grade_id)"
        >
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center gap-3">
              <VAvatar color="primary" size="38" rounded="lg">
                <VIcon icon="tabler-school" color="white" size="18" />
              </VAvatar>
              <div>
                <div class="text-body-1 font-weight-bold">
                  {{ grade.grade?.name_en }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ grade.grade?.name_kh }}
                </div>
              </div>
            </div>
          </div>

          <div
            class="d-flex align-center gap-2 text-caption text-medium-emphasis"
            style="padding-left: 50px"
          >
            <VChip size="small" color="primary" text-color="white">
              {{ grade.subjects?.length ?? 0 }}
            </VChip>
            <span>•</span>
            <span>{{ grade.year?.year_name }}</span>
          </div>
        </div>

        <VExpandTransition>
          <div v-show="openGradeId === grade.grade_id">
            <VDivider />

            <div class="pa-4 d-flex flex-column gap-3">
              <VCard
                v-for="subject in grade.subjects"
                :key="subject.subject_id"
                variant="outlined"
                rounded="lg"
              >
                <!-- subject header -->
                <div
                  class="d-flex align-center justify-space-between pa-4 cursor-pointer"
                  @click="
                    toggleSubject(`${grade.grade_id}-${subject.subject_id}`)
                  "
                >
                  <div class="d-flex align-center gap-3">
                    <VAvatar color="lightprimary" variant="tonal" size="36" rounded="lg">
                      <VIcon icon="tabler-book" color="lightprimary" size="18" />
                    </VAvatar>
                    <div>
                      <div class="text-body-1 font-weight-bold">
                        {{ subject.subject?.name_en }}
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        {{ subject.subject?.name_kh }}
                      </div>
                    </div>
                  </div>

                  <!-- subject actions + rule count + expand icon (largescreen) -->
                  <div class="d-flex align-center gap-3">
                    <div v-if="mdAndUp">
                      <!-- add -->
                      <VBtn
                        icon="tabler-plus"
                        color="success"
                        variant="text"
                        size="small"
                        density="comfortable"
                        @click.stop="
                          openCreateDialog();
                          formData = {
                            subject_id: subject.subject_id,
                            grade_id: grade.grade_id,
                            existingRules: subject.rules,
                            isEdit: false,
                          };
                        "
                      >
                      </VBtn>

                      <!-- edit -->
                      <VBtn
                        icon="tabler-pencil"
                        color="warning"
                        variant="text"
                        size="small"
                        density="comfortable"
                        @click.stop="
                          onEdit(subject.subject_id, 'subject', grade.grade_id)
                        "
                      ></VBtn>

                      <!-- delete -->
                      <VBtn
                        icon="tabler-trash"
                        color="error"
                        variant="text"
                        size="small"
                        density="comfortable"
                        @click.stop="
                          onDelete(subject.subject_id, grade.grade_id)
                        "
                      >
                      </VBtn>
                    </div>

                    <!-- child subjects count -->
                    <VChip
                      
                      size="small"
                      color="secondary"
                      variant="tonal"
                    >
                      {{ subject.child_subjects.length }} {{ t("children") }}
                    </VChip>
                    <VChip size="small" color="primary" text-color="white">
                      {{ (subject.rules || []).length }} {{ t("rules") }}
                    </VChip>
                    <VIcon
                      :icon="
                        isSubjectOpen(grade.grade_id, subject.subject_id)
                          ? 'tabler-chevron-up'
                          : 'tabler-chevron-down'
                      "
                    />
                  </div>
                </div>

                <!-- subject actions + rule count + expand icon (small screen) -->
                <!-- <VDivider class="mx-2" /> -->
                <div
                  class="d-flex align-center px-2 justify-space-between"
                  v-if="!mdAndUp"
                >
                  <VBtn
                    prepend-icon="tabler-plus"
                    color="primary"
                    variant="text"
                    size="small"
                    density="comfortable"
                    @click.stop="onEdit(subject.subject_id, 'subject')"
                  >
                    {{ t("Add Rule") }}
                  </VBtn>

                  <VBtn
                    prepend-icon="tabler-pencil"
                    color="warning"
                    variant="text"
                    size="small"
                    density="comfortable"
                    @click.stop="onEdit(subject.subject_id)"
                  >
                    {{ t("Edit") }}
                  </VBtn>

                  <VBtn
                    prepend-icon="tabler-trash"
                    color="error"
                    variant="text"
                    size="small"
                    density="comfortable"
                    @click.stop="onDelete(subject.subject_id, grade.grade_id)"
                  >
                    {{ t("Delete") }}
                  </VBtn>
                </div>

                <VExpandTransition>
                  <div
                    v-show="isSubjectOpen(grade.grade_id, subject.subject_id)"
                  >
                    <!-- <VDivider /> -->

                    <!-- drill-down: Child | Category -->
                    <div class="d-flex flex-column gap-3 pa-4">
                      <!-- Child section -->
                      <VCard
                        variant="outlined"
                        rounded="lg"
                        class="panel-section-card"
                      >
                        <div
                          class="d-flex align-center justify-space-between pa-4 cursor-pointer"
                          @click="
                            toggleSubjectSection(
                              grade.grade_id,
                              subject.subject_id,
                              'child',
                            )
                          "
                        >
                          <div class="d-flex align-center gap-3">
                            <VAvatar color="lightprimary" variant="tonal" size="36" rounded="lg">
                              <VIcon icon="tabler-folders" color="lightprimary" size="18" />
                            </VAvatar>
                            <div>
                              <div class="text-body-1 font-weight-bold">
                                {{ t("Child") }}
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ (subject.child_subjects || []).length }}
                                {{ t("subjects") }}
                              </div>
                            </div>
                          </div>
                          <VIcon
                            :icon="
                              openSubjectSections[
                                subjectSectionKey(
                                  grade.grade_id,
                                  subject.subject_id,
                                )
                              ] === 'child'
                                ? 'tabler-chevron-up'
                                : 'tabler-chevron-down'
                            "
                          />
                        </div>

                        <VExpandTransition>
                          <div
                            v-show="
                              openSubjectSections[
                                subjectSectionKey(
                                  grade.grade_id,
                                  subject.subject_id,
                                )
                              ] === 'child'
                            "
                          >
                            <VDivider />

                            <div
                              v-if="!(subject.child_subjects || []).length"
                              class="pa-4 text-caption text-medium-emphasis text-center"
                            >
                              {{ t("No child subjects yet.") }}
                            </div>

                            <div v-else class="d-flex flex-column gap-3 pa-4">
                              <VCard
                                v-for="childSubject in subject.child_subjects"
                                :key="childSubject.subject_id"
                                variant="outlined"
                                rounded="lg"
                                class="child-subject-card"
                              >
                                <div
                                  class="d-flex align-center justify-space-between pa-4 cursor-pointer"
                                  @click.stop="
                                    toggleChildSubject(
                                      grade.grade_id,
                                      subject.subject_id,
                                      childSubject.subject_id,
                                    )
                                  "
                                >
                                  <div class="d-flex align-center gap-3">
                                    <VAvatar
                                      color="secondary"
                                      variant="tonal"
                                      size="36"
                                      rounded="lg"
                                    >
                                      <VIcon icon="tabler-book-2" color="secondary" size="18" />
                                    </VAvatar>
                                    <div>
                                      <div class="text-body-1 font-weight-bold">
                                        {{ childSubject.subject?.name_en }}
                                      </div>
                                      <div
                                        class="text-caption text-medium-emphasis"
                                      >
                                        {{ childSubject.subject?.name_kh }}
                                      </div>
                                    </div>
                                  </div>

                                  <div class="d-flex align-center gap-2">
                                    <div
                                      v-if="mdAndUp"
                                      class="d-flex align-center"
                                    >
                                      <VBtn
                                        icon="tabler-plus"
                                        color="success"
                                        variant="text"
                                        size="small"
                                        density="comfortable"
                                        @click.stop="
                                          openCreateDialog();
                                          formData = {
                                            subject_id: childSubject.subject_id,
                                            grade_id: grade.grade_id,
                                            existingRules: childSubject.rules,
                                            isEdit: false,
                                          };
                                        "
                                      />
                                      <VBtn
                                        icon="tabler-pencil"
                                        color="warning"
                                        variant="text"
                                        size="small"
                                        density="comfortable"
                                        @click.stop="
                                          onEdit(
                                            childSubject.subject_id,
                                            'subject',
                                            grade.grade_id,
                                          )
                                        "
                                      />
                                      <VBtn
                                        icon="tabler-trash"
                                        color="error"
                                        variant="text"
                                        size="small"
                                        density="comfortable"
                                        @click.stop="
                                          onDelete(
                                            childSubject.subject_id,
                                            grade.grade_id,
                                          )
                                        "
                                      />
                                    </div>

                                    <VChip
                                      size="small"
                                      color="secondary"
                                      variant="tonal"
                                    >
                                      {{ (childSubject.rules || []).length }}
                                      {{ t("rules") }}
                                    </VChip>
                                    <VIcon
                                      size="18"
                                      :icon="
                                        isChildSubjectOpen(
                                          grade.grade_id,
                                          subject.subject_id,
                                          childSubject.subject_id,
                                        )
                                          ? 'tabler-chevron-up'
                                          : 'tabler-chevron-down'
                                      "
                                    />
                                  </div>
                                </div>

                                <div
                                  v-if="!mdAndUp"
                                  class="d-flex align-center px-2 pb-2 justify-space-between"
                                >
                                  <VBtn
                                    prepend-icon="tabler-plus"
                                    color="primary"
                                    variant="text"
                                    size="small"
                                    density="comfortable"
                                    @click.stop="
                                      openCreateDialog();
                                      formData = {
                                        subject_id: childSubject.subject_id,
                                        grade_id: grade.grade_id,
                                        existingRules: childSubject.rules,
                                        isEdit: false,
                                      };
                                    "
                                  >
                                    {{ t("Add Rule") }}
                                  </VBtn>
                                  <VBtn
                                    prepend-icon="tabler-pencil"
                                    color="warning"
                                    variant="text"
                                    size="small"
                                    density="comfortable"
                                    @click.stop="
                                      onEdit(
                                        childSubject.subject_id,
                                        'subject',
                                        grade.grade_id,
                                      )
                                    "
                                  >
                                    {{ t("Edit") }}
                                  </VBtn>
                                  <VBtn
                                    prepend-icon="tabler-trash"
                                    color="error"
                                    variant="text"
                                    size="small"
                                    density="comfortable"
                                    @click.stop="
                                      onDelete(
                                        childSubject.subject_id,
                                        grade.grade_id,
                                      )
                                    "
                                  >
                                    {{ t("Delete") }}
                                  </VBtn>
                                </div>

                                <VExpandTransition>
                                  <div
                                    v-show="
                                      isChildSubjectOpen(
                                        grade.grade_id,
                                        subject.subject_id,
                                        childSubject.subject_id,
                                      )
                                    "
                                  >
                                    <VDivider />

                                    <div
                                      v-if="!(childSubject.rules || []).length"
                                      class="pa-4 text-caption text-medium-emphasis text-center"
                                    >
                                      {{ t("No categories yet.") }}
                                    </div>

                                    <div
                                      v-else
                                      class="d-flex flex-column gap-2 pa-4 pl-6"
                                    >
                                      <SubjectSettingRuleList
                                        :grade-id="grade.grade_id"
                                        :subject-id="childSubject.subject_id"
                                        :rules="childSubject.rules"
                                        :active-rule-key="openRuleKey"
                                        compact
                                        @toggle-rule="toggleRule"
                                        @edit-rule="onEdit($event, 'rule')"
                                        @delete-rule="onDeleteRule"
                                        @add-assessment="
                                          openAssessmentDialog(
                                            $event,
                                            childSubject.subject_id,
                                          )
                                        "
                                      />

                                      <div
                                        class="d-flex justify-end ga-3 px-1 py-1 text-caption text-medium-emphasis"
                                      >
                                        <span class="font-weight-bold font-mono">
                                          {{ totalMaxScore(childSubject) }}pts
                                        </span>
                                        <span class="font-weight-bold font-mono">
                                          {{ totalPercentage(childSubject) }}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </VExpandTransition>
                              </VCard>
                            </div>
                          </div>
                        </VExpandTransition>
                      </VCard>

                      <!-- Category section (parent rules) -->
                      <VCard
                        variant="outlined"
                        rounded="lg"
                        class="panel-section-card"
                      >
                        <div
                          class="d-flex align-center justify-space-between pa-4 cursor-pointer"
                          @click="
                            toggleSubjectSection(
                              grade.grade_id,
                              subject.subject_id,
                              'category',
                            )
                          "
                        >
                          <div class="d-flex align-center gap-3">
                            <VAvatar color="info" variant="tonal" size="36" rounded="lg">
                              <VIcon icon="tabler-category" color="info" size="18" />
                            </VAvatar>
                            <div>
                              <div class="text-body-1 font-weight-bold">
                                {{ t("Category") }}
                              </div>
                              <div class="text-caption text-medium-emphasis">
                                {{ (subject.rules || []).length }}
                                {{ t("categories") }}
                              </div>
                            </div>
                          </div>
                          <div class="d-flex align-center gap-2">
                            <div v-if="mdAndUp" class="d-flex align-center">
                              <VBtn
                                icon="tabler-plus"
                                color="success"
                                variant="text"
                                size="small"
                                density="comfortable"
                                @click.stop="
                                  openCreateDialog();
                                  formData = {
                                    subject_id: subject.subject_id,
                                    grade_id: grade.grade_id,
                                    existingRules: subject.rules,
                                    isEdit: false,
                                  };
                                "
                              />
                              <VBtn
                                icon="tabler-pencil"
                                color="warning"
                                variant="text"
                                size="small"
                                density="comfortable"
                                @click.stop="
                                  onEdit(
                                    subject.subject_id,
                                    'subject',
                                    grade.grade_id,
                                  )
                                "
                              />
                            </div>
                            <VIcon
                              :icon="
                                openSubjectSections[
                                  subjectSectionKey(
                                    grade.grade_id,
                                    subject.subject_id,
                                  )
                                ] === 'category'
                                  ? 'tabler-chevron-up'
                                  : 'tabler-chevron-down'
                              "
                            />
                          </div>
                        </div>

                        <div
                          v-if="!mdAndUp"
                          class="d-flex align-center px-2 pb-2 justify-space-between"
                        >
                          <VBtn
                            prepend-icon="tabler-plus"
                            color="primary"
                            variant="text"
                            size="small"
                            density="comfortable"
                            @click.stop="
                              openCreateDialog();
                              formData = {
                                subject_id: subject.subject_id,
                                grade_id: grade.grade_id,
                                existingRules: subject.rules,
                                isEdit: false,
                              };
                            "
                          >
                            {{ t("Add Rule") }}
                          </VBtn>
                          <VBtn
                            prepend-icon="tabler-pencil"
                            color="warning"
                            variant="text"
                            size="small"
                            density="comfortable"
                            @click.stop="
                              onEdit(subject.subject_id, 'subject', grade.grade_id)
                            "
                          >
                            {{ t("Edit") }}
                          </VBtn>
                        </div>

                        <VExpandTransition>
                          <div
                            v-show="
                              openSubjectSections[
                                subjectSectionKey(
                                  grade.grade_id,
                                  subject.subject_id,
                                )
                              ] === 'category'
                            "
                          >
                            <VDivider />

                            <div
                              v-if="!(subject.rules || []).length"
                              class="pa-4 text-caption text-medium-emphasis text-center"
                            >
                              {{ t("No categories yet.") }}
                            </div>

                            <div v-else class="d-flex flex-column gap-2 pa-4">
                              <SubjectSettingRuleList
                                :grade-id="grade.grade_id"
                                :subject-id="subject.subject_id"
                                :rules="subject.rules"
                                :active-rule-key="openRuleKey"
                                @toggle-rule="toggleRule"
                                @edit-rule="onEdit($event, 'rule')"
                                @delete-rule="onDeleteRule"
                                @add-assessment="
                                  openAssessmentDialog(
                                    $event,
                                    subject.subject_id,
                                  )
                                "
                              />

                              <!-- <div
                                class="d-flex justify-end ga-3 px-1 py-2 text-caption text-medium-emphasis"
                              >
                                <span class="font-weight-bold font-mono">
                                  {{ totalMaxScore(subject) }}pts
                                </span>
                                <span class="font-weight-bold font-mono">
                                  {{ totalPercentage(subject) }}%
                                </span>
                              </div> -->
                            </div>
                          </div>
                        </VExpandTransition>
                      </VCard>
                    </div>
                  </div>
                </VExpandTransition>
              </VCard>
            </div>
          </div>
        </VExpandTransition>
      </VCard>
    </div>
  </div>
</template>

<style scoped>
.grading-rules-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.panel-section-card {
  border-width: 2px;
}

.child-subject-card {
  border-width: 2px;
  border-color: rgba(var(--v-theme-lightprimary), 0.3);
  margin-left: 12px;
}

.font-mono {
  font-family: ui-monospace, monospace;
}
</style>
