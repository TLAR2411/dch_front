<script setup>
/**
 * Score Entry page
 *
 * Tabs:
 *   1. Insert Score — Class + Subject + Term → grid
 *   2. Teacher Recommend — Class + Term → auto subject strengths/weaknesses
 *
 * FLOW (score tab):
 *   1. Pick Class → resolve grade_id → load Subjects
 *   2. Pick Subject + Term → load grid
 *   3. Load: rules → ensure items → students → scores → attendance days
 *   4. Edit cells → Save upserts student_scores
 */
import { computed, onMounted, reactive, ref, watch } from "vue";
import { getClasses } from "@/services/dataService.js";
import { useYearStore } from "@/stores/yearStore.js";
import successAlert from "@/helper/successAlert.js";
import { validateScore } from "@/utils/gradeCalculation.js";
import { resolveSubjectAttendanceMax } from "@/utils/schoolDays.js";
import ScoreEntryGrid from "./ScoreEntryGrid.vue";
import ScoreEntryRecommendations from "./ScoreEntryRecommendations.vue";
import {
  buildCompositeLayout,
  buildScoreMap,
  ensureCategoryItems,
  fetchAttendanceDays,
  fetchChildGradingRules,
  fetchChildSubjects,
  fetchClassStudents,
  fetchExistingScores,
  fetchGradingLayout,
  fetchSubjectsForGrade,
  fetchTerms,
  resolveClassGradeId,
  resolveCurrentTermId,
  upsertScores,
} from "./scoreEntryService.js";
import StudentBehavior from "./StudentBehavior.vue";

const yearStore = useYearStore();
const yearId = computed(() => yearStore.year_id);

const activeTab = ref("scores");

const classes = ref([]);
const subjects = ref([]);
const terms = ref([]);
const students = ref([]);
const categories = ref([]);

const loadingFilters = ref(false);
const loadingGrid = ref(false);
const saving = ref(false);
const hasLoaded = ref(false);
const classGradeId = ref(null);

const form = ref({
  class_id: null,
  subject_id: null,
  term_id: null,
});

/** studentId → { [itemId]: score } */
const scores = reactive({});

const selectedTerm = computed(
  () => terms.value.find((t) => Number(t.id) === Number(form.value.term_id)) ?? null,
);

/** Scheduled subject school days in term (not full term school_days). */
const attendanceMax = ref(null);

const selectedClass = computed(
  () => classes.value.find((c) => Number(c.id) === Number(form.value.class_id)) ?? null,
);

const canLoad = computed(
  () =>
    !!form.value.class_id &&
    !!form.value.subject_id &&
    !!form.value.term_id &&
    !!yearId.value,
);

const allItemIds = computed(() =>
  categories.value.flatMap((c) => (c.items || []).map((i) => i.id)),
);

function clearGrid() {
  students.value = [];
  categories.value = [];
  hasLoaded.value = false;
  attendanceMax.value = null;
  Object.keys(scores).forEach((k) => delete scores[k]);
}

function setStudentScores(studentId, bag) {
  if (!scores[studentId]) scores[studentId] = {};
  Object.assign(scores[studentId], bag);
}

function onUpdateScore({ studentId, itemId, value }) {
  if (!scores[studentId]) scores[studentId] = {};
  scores[studentId][itemId] =
    value === "" || value == null ? null : value;
}

async function loadSubjects() {
  subjects.value = [];
  form.value.subject_id = null;
  classGradeId.value = null;
  clearGrid();

  if (!form.value.class_id || !yearId.value) return;

  loadingFilters.value = true;
  try {
    const gradeId =
      selectedClass.value?.grade_id ??
      (await resolveClassGradeId(form.value.class_id));

    classGradeId.value = gradeId;
    subjects.value = await fetchSubjectsForGrade(yearId.value, gradeId);
  } catch (error) {
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to load subjects",
    });
  } finally {
    loadingFilters.value = false;
  }
}

async function loadTerms() {
  if (!yearId.value) {
    terms.value = [];
    form.value.term_id = null;
    return;
  }

  loadingFilters.value = true;
  try {
    terms.value = await fetchTerms(yearId.value);
    if (
      !form.value.term_id ||
      !terms.value.some((t) => Number(t.id) === Number(form.value.term_id))
    ) {
      form.value.term_id = resolveCurrentTermId(terms.value);
    }
  } catch (error) {
    console.error(error);
    terms.value = [];
  } finally {
    loadingFilters.value = false;
  }
}

/**
 * Main load pipeline — call after Class + Subject + Term are set.
 */
async function loadGrid() {
  if (!canLoad.value) {
    clearGrid();
    return;
  }

  loadingGrid.value = true;
  hasLoaded.value = false;

  try {
    const gradeId =
      selectedClass.value?.grade_id ??
      classGradeId.value ??
      (await resolveClassGradeId(form.value.class_id));

    classGradeId.value = gradeId;

    if (!gradeId) {
      throw new Error("Class has no grade assigned.");
    }

    let layout = await fetchGradingLayout({
      yearId: yearId.value,
      gradeId,
      subjectId: form.value.subject_id,
    });

    if (!layout.length) {
      categories.value = [];
      students.value = [];
      hasLoaded.value = true;
      return;
    }

    const childSubjects = await fetchChildSubjects(form.value.subject_id);
    if (childSubjects.length) {
      const childRulesBySubjectId = await fetchChildGradingRules({
        yearId: yearId.value,
        gradeId,
        childSubjectIds: childSubjects.map((child) => child.id),
      });
      layout = buildCompositeLayout(
        layout,
        childSubjects,
        childRulesBySubjectId,
      );
    }

    const term = selectedTerm.value;
    attendanceMax.value = await resolveSubjectAttendanceMax({
      classId: form.value.class_id,
      subjectId: form.value.subject_id,
      startDate: term?.start_date,
      endDate: term?.end_date,
      yearId: yearId.value,
      fallbackSchoolDays: term?.school_days,
    });

    layout = await ensureCategoryItems(layout, {
      subjectId: form.value.subject_id,
      attendanceMax: attendanceMax.value,
    });
    categories.value = layout;

    const classStudents = await fetchClassStudents(form.value.class_id);
    students.value = classStudents;

    Object.keys(scores).forEach((k) => delete scores[k]);
    for (const s of classStudents) {
      scores[s.student_id] = {};
    }

    const itemIds = layout.flatMap((c) =>
      (c.items || []).map((i) => i.id).filter(Boolean),
    );

    const existing = await fetchExistingScores({
      studentIds: classStudents.map((s) => s.student_id),
      assessmentItemIds: itemIds,
      academicPeriodId: form.value.term_id,
      classId: form.value.class_id,
    });

    const map = buildScoreMap(existing);
    for (const [sid, bag] of map.entries()) {
      setStudentScores(sid, bag);
    }

    const attendanceCat = layout.find((c) => c.is_attendance);
    const attendanceItem = attendanceCat?.items?.[0];

    if (attendanceItem && term?.start_date && term?.end_date) {
      const daysMap = await fetchAttendanceDays({
        classId: form.value.class_id,
        subjectId: form.value.subject_id,
        startDate: term.start_date,
        endDate: term.end_date,
      });

      for (const s of classStudents) {
        const current = scores[s.student_id]?.[attendanceItem.id];
        if (current != null && current !== "") continue;

        const days = daysMap.get(s.student_id);
        if (days != null) {
          setStudentScores(s.student_id, { [attendanceItem.id]: days });
        }
      }
    }

    hasLoaded.value = true;
  } catch (error) {
    console.error(error);
    clearGrid();
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to load scores",
    });
  } finally {
    loadingGrid.value = false;
  }
}

function collectValidationErrors() {
  const errors = [];

  for (const cat of categories.value) {
    for (const item of cat.items || []) {
      const max =
        cat.is_attendance && attendanceMax.value != null
          ? attendanceMax.value
          : item.max_score;

      for (const student of students.value) {
        const value = scores[student.student_id]?.[item.id];
        const msg = validateScore(value, max);
        if (msg) {
          errors.push(`${student.name_en} / ${item.item_name}: ${msg}`);
        }
      }
    }
  }

  return errors;
}

async function saveScores() {
  if (!canLoad.value || !categories.value.length) return;

  const errors = collectValidationErrors();
  if (errors.length) {
    successAlert.fire({
      icon: "error",
      title: errors[0],
      text: errors.length > 1 ? `+${errors.length - 1} more` : undefined,
    });
    return;
  }

  saving.value = true;
  try {
    const rows = [];

    for (const student of students.value) {
      const bag = scores[student.student_id] || {};
      for (const itemId of allItemIds.value) {
        if (!(itemId in bag)) continue;
        rows.push({
          student_id: student.student_id,
          assessment_item_id: itemId,
          academic_period_id: form.value.term_id,
          class_id: form.value.class_id,
          score: bag[itemId],
        });
      }
    }

    await upsertScores(rows);

    successAlert.fire({
      icon: "success",
      title: "Scores saved",
    });
  } catch (error) {
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to save scores",
    });
  } finally {
    saving.value = false;
  }
}

watch(
  () => form.value.class_id,
  () => {
    loadSubjects();
  },
);

watch(
  () => [form.value.subject_id, form.value.term_id],
  () => {
    if (canLoad.value) loadGrid();
    else clearGrid();
  },
);

watch(yearId, async () => {
  form.value.class_id = null;
  form.value.subject_id = null;
  classGradeId.value = null;
  clearGrid();
  await loadTerms();
});

onMounted(async () => {
  classes.value = await getClasses();
  await loadTerms();
});
</script>

<template>
  <div>
    <!-- Shared search — once for both tabs -->
    <VCard class="pa-3 mb-3">
      <VRow align="center" dense>

        <VCol cols="12" md="3">
          
          <AppSelect
            v-model="form.class_id"
            :items="classes"
            item-title="name_en"
            item-value="id"
            placeholder="Class"
            clearable
            :disabled="loadingFilters"
          />
        </VCol>
        <VCol cols="12" md="3">
          <AppSelect
            v-model="form.term_id"
            :items="terms"
            item-title="name_en"
            item-value="id"
            placeholder="Term"
            clearable
            :disabled="loadingFilters"
          />
        </VCol>
       
        <VCol cols="12" md="3">
          <AppSelect
            v-model="form.subject_id"
            :items="subjects"
            item-title="name_en"
            item-value="id"
            placeholder="Subject"
            clearable
            :disabled="!form.class_id || loadingFilters"
          />
        </VCol>
        
        <VCol cols="12" md="3" class="d-flex gap-2 justify-end">
          <VBtn
            v-if="activeTab === 'scores'"
            variant="tonal"
            color="secondary"
            :loading="loadingGrid"
            :disabled="!canLoad"
            @click="loadGrid"
          >
            Refresh
          </VBtn>
          <VBtn
            v-if="activeTab === 'scores'"
            color="primary"
            :loading="saving"
            :disabled="!hasLoaded || !categories.length || loadingGrid"
            @click="saveScores"
          >
            Save Scores
          </VBtn>
        </VCol>
      </VRow>
    </VCard>

    <VTabs v-model="activeTab" color="primary" class="mb-3">
      <VTab value="scores" prepend-icon="tabler-table">
        Insert Score
      </VTab>
      <VTab value="recommend" prepend-icon="tabler-message-2">
        Teacher Recommend
      </VTab>
      <VTab value="behavior" prepend-icon="tabler-message-2">
        Student Behavior
      </VTab>
    </VTabs>

    <VWindow v-model="activeTab" class="disable-tab-transition" :touch="false">
      <VWindowItem value="scores">
        <VCard v-if="!canLoad" class="pa-8 text-center">
          <VIcon size="48" class="mb-3" style="opacity: 0.35">
            tabler-report-analytics
          </VIcon>
          <div class="text-body-1 font-weight-medium">
            Select Class, Subject, and Term
          </div>
          <div class="text-body-2 mt-1" style="opacity: 0.7">
            Choose filters above once, then switch tabs for scores or
            recommendations.
          </div>
        </VCard>

        <VCard v-else-if="loadingGrid" class="pa-8 text-center">
          <VProgressCircular indeterminate color="primary" class="mb-3" />
          <div class="text-body-2">Loading score sheet…</div>
        </VCard>

        <VCard
          v-else-if="hasLoaded && !categories.length"
          class="pa-8 text-center"
        >
          <VIcon size="48" class="mb-3" style="opacity: 0.35">
            tabler-settings
          </VIcon>
          <div class="text-body-1 font-weight-medium">
            No grading rules for this subject
          </div>
          <div class="text-body-2 mt-1" style="opacity: 0.7">
            Configure categories and assessments in
            <RouterLink :to="{ name: 'global-subjectsetting' }">
              Subject Setting
            </RouterLink>
            first.
          </div>
        </VCard>

        <VCard v-else-if="hasLoaded" class="pa-3">
          <ScoreEntryGrid
            :categories="categories"
            :students="students"
            :scores="scores"
            :attendance-max="attendanceMax"
            @update:score="onUpdateScore"
          />
        </VCard>
      </VWindowItem>

      <VWindowItem value="recommend">
        <VCard class="pa-3">
          <ScoreEntryRecommendations
            :class-id="form.class_id"
            :term-id="form.term_id"
            :grade-id="classGradeId ?? selectedClass?.grade_id"
          />
        </VCard>
      </VWindowItem>

      <VWindowItem value="behavior">
        <VCard class="pa-3">
          <StudentBehavior
            :class-id="form.class_id"
            :term-id="form.term_id"
            :grade-id="classGradeId ?? selectedClass?.grade_id"
          />
        </VCard>
      </VWindowItem>
    </VWindow>
  </div>
</template>
