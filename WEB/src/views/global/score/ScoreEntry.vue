<script setup>
/**
 * Score Entry page
 *
 * Progressive tabs:
 *   - No class → empty state (no tabs)
 *   - Class + Subject + Term → load score sheet, then show all tabs on Insert Score
 *
 * FLOW (score tab):
 *   1. Pick Class → resolve grade_id → load Subjects
 *   2. Pick Subject + Term → load grid
 *   3. Load: rules → ensure items → students → scores → attendance days
 *   4. Edit cells → Save upserts student_scores
 */
import { computed, onMounted, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { getClasses } from "@/services/dataService.js";
import { useYearStore } from "@/stores/yearStore.js";
import { usePartStore } from "@/stores/partStore";
import { useSettingStore } from "@/stores/settingStore";
import { getEntityLabel } from "@/utils/reportLabels.js";
import successAlert from "@/helper/successAlert.js";
import { validateScore } from "@/utils/gradeCalculation.js";
import { resolveSubjectAttendanceMax } from "@/utils/schoolDays.js";
import { isRequestCanceled } from "@/utils/api.js";
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
  upsertScores,
} from "./scoreEntryService.js";
import StudentBehavior from "./StudentBehavior.vue";
import { usePageTour } from "@/composable/usePageTour";

usePageTour("global-score-entry");

const { t } = useI18n();
const yearStore = useYearStore();
const partStore = usePartStore();
const settingStore = useSettingStore();
const { year_id: yearId } = storeToRefs(yearStore);
const { branch_id: branchId } = storeToRefs(settingStore);
const reportPart = computed(() => partStore.system_part || "english");

function selectItemTitle(item) {
  return getEntityLabel(item, reportPart.value, "");
}

function entityLabel(entity, fallback = "—") {
  return getEntityLabel(entity, reportPart.value, fallback);
}

const activeTab = ref("scores");
const tabsEverShown = ref(false);

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
  () =>
    terms.value.find((t) => Number(t.id) === Number(form.value.term_id)) ??
    null,
);

/** Scheduled subject school days in term (not full term school_days). */
const attendanceMax = ref(null);

const selectedClass = computed(
  () =>
    classes.value.find((c) => Number(c.id) === Number(form.value.class_id)) ??
    null,
);

const hasClass = computed(() => !!form.value.class_id);
const hasSubject = computed(() => !!form.value.subject_id);

/** Wait for class subjects before mounting tabs that also fetch grade subjects. */
const classFiltersReady = computed(
  () => hasClass.value && !!classGradeId.value && !loadingFilters.value,
);

const canLoad = computed(
  () =>
    !!form.value.class_id &&
    !!form.value.subject_id &&
    !!form.value.term_id &&
    !!yearId.value,
);

/** Full-page loader until the first score sheet load finishes for the current filters. */
const showInitialLoading = computed(
  () =>
    canLoad.value &&
    !tabsEverShown.value &&
    (loadingGrid.value || !hasLoaded.value),
);

/** Tabs stay visible after the first successful load (including during Refresh). */
const showTabs = computed(
  () => canLoad.value && tabsEverShown.value,
);

let subjectsLoadSeq = 0;

const allItemIds = computed(() =>
  categories.value.flatMap((c) => (c.items || []).map((i) => i.id)),
);

function clearGrid() {
  students.value = [];
  categories.value = [];
  hasLoaded.value = false;
  tabsEverShown.value = false;
  attendanceMax.value = null;
  Object.keys(scores).forEach((k) => delete scores[k]);
}

function setStudentScores(studentId, bag) {
  if (!scores[studentId]) scores[studentId] = {};
  Object.assign(scores[studentId], bag);
}

function onUpdateScore({ studentId, itemId, value }) {
  if (!scores[studentId]) scores[studentId] = {};
  scores[studentId][itemId] = value === "" || value == null ? null : value;
}

async function loadSubjects() {
  const seq = ++subjectsLoadSeq;
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

    if (seq !== subjectsLoadSeq) return;

    classGradeId.value = gradeId;
    const list = await fetchSubjectsForGrade(
      yearId.value,
      gradeId,
      form.value.class_id,
    );
    if (seq !== subjectsLoadSeq) return;

    subjects.value = list;
  } catch (error) {
    if (isRequestCanceled(error) || seq !== subjectsLoadSeq) return;
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || t("Failed to load subjects"),
    });
  } finally {
    if (seq === subjectsLoadSeq) loadingFilters.value = false;
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
    form.value.term_id = null;
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
      throw new Error(t("Class has no grade assigned."));
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
      title: error.message || t("Failed to load scores"),
    });
  } finally {
    loadingGrid.value = false;
    if (canLoad.value) tabsEverShown.value = true;
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
          errors.push(
            `${entityLabel(student, student.name_en)} / ${item.item_name}: ${msg}`,
          );
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
      text:
        errors.length > 1
          ? t("+{n} more", { n: errors.length - 1 })
          : undefined,
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
      title: t("Scores saved"),
    });
  } catch (error) {
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || t("Failed to save scores"),
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

// watch(
//   () => form.value.subject_id,
//   (subjectId) => {
//     if (!subjectId && activeTab.value === "scores") {
//       activeTab.value = "recommend";
//     }
//   },
// );

// watch(
//   () => [form.value.subject_id, form.value.term_id],
//   () => {
//     if (canLoad.value) loadGrid();
//     else clearGrid();
//   },
// );

watch(
  () => [form.value.class_id, form.value.term_id, form.value.subject_id],
  ([classId, termId, subjectId]) => {
    if (!classId || !termId || !subjectId) {
      clearGrid();
      return;
    }

    activeTab.value = "scores";
    loadGrid();
  },
);

let classesLoadSeq = 0;

function filterClassesForBranch(list = []) {
  const branch = branchId.value;
  if (branch == null || branch === "*") return list;
  return list.filter((c) => String(c.branch_id) === String(branch));
}

async function loadClasses() {
  const seq = ++classesLoadSeq;
  const list = await getClasses();
  if (seq !== classesLoadSeq) return;
  // Canceled in-flight reload — do not clobber with [].
  if (list == null) return;
  classes.value = filterClassesForBranch(list);
}

async function resetFiltersForContextChange() {
  form.value.class_id = null;
  form.value.subject_id = null;
  classGradeId.value = null;
  classes.value = [];
  clearGrid();
  await Promise.all([loadClasses(), loadTerms()]);
}

watch(
  () => [yearId.value, branchId.value],
  async (next, prev) => {
    if (!prev) return;
    if (next[0] === prev[0] && String(next[1]) === String(prev[1])) return;
    await resetFiltersForContextChange();
  },
);

onMounted(async () => {
  await Promise.all([loadClasses(), loadTerms()]);
});
</script>

<template>
  <div>
    <!-- Shared search — once for both tabs -->
    <VCard id="page-tour-score-filters" class="pa-3 mb-3">
      <VRow align="center" dense>
        <VCol id="page-tour-score-class" cols="12" md="3">
          <AppSelect
            v-model="form.class_id"
            :items="classes"
            :item-title="selectItemTitle"
            item-value="id"
            :placeholder="$t('Class')"
            clearable
            :disabled="loadingFilters"
          />
        </VCol>
        <VCol id="page-tour-score-subject" cols="12" md="3">
          <AppSelect
            v-model="form.subject_id"
            :items="subjects"
            :item-title="selectItemTitle"
            item-value="id"
            :placeholder="$t('Subject')"
            clearable
            :disabled="!form.class_id || loadingFilters"
          />
        </VCol>

        <VCol id="page-tour-score-term" cols="12" md="3">
          <AppSelect
            v-model="form.term_id"
            :items="terms"
            :item-title="selectItemTitle"
            item-value="id"
            :placeholder="$t('Term')"
            clearable
            :disabled="!form.subject_id || loadingFilters"
          />
        </VCol>

        <VCol cols="12" md="3" class="d-flex gap-2 justify-end">
          <VBtn
            v-if="activeTab === 'scores'"
            variant="tonal"
            density="comfortable"
            color="secondary"
            :loading="loadingGrid"
            :disabled="!canLoad"
            @click="loadGrid"
          >
            {{ $t("Refresh") }}
          </VBtn>
          <VBtn
            id="page-tour-score-save"
            density="comfortable"
            v-if="activeTab === 'scores'"
            color="primary"
            :loading="saving"
            :disabled="!hasLoaded || !categories.length || loadingGrid"
            @click="saveScores"
          >
            {{ $t("Save Scores") }}
          </VBtn>
        </VCol>
      </VRow>
    </VCard>

    <VCard v-if="!hasClass" id="page-tour-score-empty" class="pa-8 text-center">
      <VIcon size="48" class="mb-3" style="opacity: 0.35">
        tabler-report-analytics
      </VIcon>
      <div class="text-body-1 font-weight-medium">
        {{ $t("Select Class, Subject, and Term") }}
      </div>
      <div class="text-body-2 mt-1" style="opacity: 0.7">
        {{ $t("Choose a class above to continue.") }}
      </div>
    </VCard>

    <VCard
      v-else-if="hasClass && !canLoad"
      class="pa-8 text-center"
    >
      <VIcon size="48" class="mb-3" style="opacity: 0.35">
        tabler-report-analytics
      </VIcon>
      <div class="text-body-1 font-weight-medium">
        {{ $t("Select Class, Subject, and Term") }}
      </div>
      <div class="text-body-2 mt-1" style="opacity: 0.7">
        {{
          $t(
            "Choose filters above once, then switch tabs for scores or recommendations.",
          )
        }}
      </div>
    </VCard>

    <VCard v-else-if="showInitialLoading" class="pa-8 text-center">
      <VProgressCircular indeterminate color="primary" class="mb-3" />
      <div class="text-body-2">{{ $t("Loading score sheet…") }}</div>
    </VCard>

    <template v-else-if="showTabs">
      <VTabs
        id="page-tour-score-tabs"
        v-model="activeTab"
        color="primary"
        class="mb-3"
      >
        <VTab
          v-if="hasSubject"
          id="page-tour-score-tab-scores"
          value="scores"
          prepend-icon="tabler-table"
        >
          {{ $t("Insert Score") }}
        </VTab>
        <VTab
          id="page-tour-score-tab-recommend"
          value="recommend"
          prepend-icon="tabler-message-2"
        >
          {{ $t("Teacher Recommend") }}
        </VTab>
        <VTab
          id="page-tour-score-tab-behavior"
          value="behavior"
          prepend-icon="tabler-message-2"
        >
          {{ $t("Student Behavior") }}
        </VTab>
      </VTabs>

      <VWindow
        v-model="activeTab"
        class="disable-tab-transition"
        :touch="false"
      >
        <VWindowItem v-if="hasSubject" value="scores">
          <VCard v-if="!canLoad" class="pa-8 text-center">
            <VIcon size="48" class="mb-3" style="opacity: 0.35">
              tabler-report-analytics
            </VIcon>
            <div class="text-body-1 font-weight-medium">
              {{ $t("Select Class, Subject, and Term") }}
            </div>
            <div class="text-body-2 mt-1" style="opacity: 0.7">
              {{
                $t(
                  "Choose filters above once, then switch tabs for scores or recommendations.",
                )
              }}
            </div>
          </VCard>

          <VCard v-else-if="loadingGrid" class="pa-8 text-center">
            <VProgressCircular indeterminate color="primary" class="mb-3" />
            <div class="text-body-2">{{ $t("Loading score sheet…") }}</div>
          </VCard>

          <VCard
            v-else-if="hasLoaded && !categories.length"
            class="pa-8 text-center"
          >
            <VIcon size="48" class="mb-3" style="opacity: 0.35">
              tabler-settings
            </VIcon>
            <div class="text-body-1 font-weight-medium">
              {{ $t("No grading rules for this subject") }}
            </div>
            <div class="text-body-2 mt-1" style="opacity: 0.7">
              {{ $t("Configure categories and assessments in") }}
              <RouterLink :to="{ name: 'global-subjectsetting' }">
                {{ $t("Subject Setting") }}
              </RouterLink>
              {{ $t("first.") }}
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
          <VCard v-if="!classFiltersReady" class="pa-8 text-center">
            <VProgressCircular indeterminate color="primary" class="mb-3" />
            <div class="text-body-2">{{ $t("Loading…") }}</div>
          </VCard>
          <VCard v-else class="pa-3">
            <ScoreEntryRecommendations
              :class-id="form.class_id"
              :term-id="form.term_id"
              :grade-id="classGradeId"
            />
          </VCard>
        </VWindowItem>

        <VWindowItem value="behavior">
          <VCard v-if="!classFiltersReady" class="pa-8 text-center">
            <VProgressCircular indeterminate color="primary" class="mb-3" />
            <div class="text-body-2">{{ $t("Loading…") }}</div>
          </VCard>
          <VCard v-else class="pa-3">
            <StudentBehavior
              :class-id="form.class_id"
              :term-id="form.term_id"
              :grade-id="classGradeId"
            />
          </VCard>
        </VWindowItem>
      </VWindow>
    </template>
  </div>
</template>
