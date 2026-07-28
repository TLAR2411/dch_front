<script setup>
/**
 * Teacher recommendations for Score Entry — table of Name + Recommendation.
 * Auto text from all grade subjects (strong ≥ 80, weak < 60).
 */
import { computed, ref, watch } from "vue";
import supabase from "@/utils/supabase.js";
import { useYearStore } from "@/stores/yearStore.js";
import successAlert from "@/helper/successAlert.js";
import { loadClassSubjectAverages } from "@/views/global/report/examReportScoreService.js";
import { buildTeacherRecommendation } from "@/utils/teacherRecommendation.js";
import { fetchTerms, resolveClassGradeId } from "./scoreEntryService.js";
import AppTextField from "@/@core/components/app-form-elements/AppTextField.vue";

const props = defineProps({
  classId: {
    type: [Number, String, null],
    default: null,
  },
  termId: {
    type: [Number, String, null],
    default: null,
  },
  gradeId: {
    type: [Number, String, null],
    default: null,
  },
});

const yearStore = useYearStore();
const yearId = computed(() => yearStore.year_id);

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const rows = ref([]);

const canLoad = computed(
  () => !!props.classId && !!props.termId && !!yearId.value,
);

const hasRows = computed(() => rows.value.length > 0);

function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1";
}

/**
 * Count unique absent dates per student for the term (permission not counted as absent).
 * @returns {Map<number, number>}
 */
async function fetchAbsentDaysByStudent(classId, termId) {
  const map = new Map();
  if (!classId || !termId) return map;

  const terms = await fetchTerms(yearId.value);
  const term = terms.find((t) => Number(t.id) === Number(termId));
  if (!term?.start_date || !term?.end_date) return map;

  const start = String(term.start_date).slice(0, 10);
  const end = String(term.end_date).slice(0, 10);

  const { data, error } = await supabase
    .from("students_attendance")
    .select("student_id, date, present, ask_permission")
    .eq("class_id", classId)
    .gte("date", start)
    .lte("date", end);

  if (error) throw error;

  /** studentId → Set of absent dates */
  const absentDates = new Map();

  for (const row of data ?? []) {
    if (isTruthyFlag(row.ask_permission)) continue;
    if (isTruthyFlag(row.present)) continue;

    const sid = row.student_id;
    const day = String(row.date).slice(0, 10);
    if (!absentDates.has(sid)) absentDates.set(sid, new Set());
    absentDates.get(sid).add(day);
  }

  for (const [sid, days] of absentDates.entries()) {
    map.set(sid, days.size);
  }

  return map;
}

function draftForStudent(student, subjectList, scoreByStudent, absentByStudent) {
  return buildTeacherRecommendation({
    name: student.name_en || student.name_kh || "Student",
    gender: student.gender,
    studentId: student.student_id,
    subjects: subjectList,
    subjectScores: scoreByStudent.get(student.student_id) || {},
    absentDays: absentByStudent?.get(student.student_id) ?? 0,
  });
}

async function fetchSavedRecommendations(studentIds) {
  if (!studentIds.length || !props.classId || !yearId.value) return new Map();

  const { data, error } = await supabase
    .from("student_teacher_recommendations")
    .select(
      "id, student_id, class_id, academic_period_id, year_id, recommendation, generated_text, is_edited",
    )
    .eq("class_id", props.classId)
    .eq("year_id", yearId.value)
    .eq("academic_period_id", props.termId)
    .in("student_id", studentIds);

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.student_id, row]));
}

async function resolveGrade() {
  if (props.gradeId) return props.gradeId;
  return resolveClassGradeId(props.classId);
}

async function loadRecommendations() {
  if (!canLoad.value) {
    rows.value = [];
    errorMessage.value = "";
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const gradeId = await resolveGrade();
    if (!gradeId) {
      rows.value = [];
      errorMessage.value = "Class has no grade assigned.";
      return;
    }

    const result = await loadClassSubjectAverages({
      yearId: yearId.value,
      gradeId,
      classId: props.classId,
      typeReport: "Term",
      termId: props.termId,
    });

    if (result.error) {
      rows.value = [];
      errorMessage.value = result.error;
      return;
    }

    const [savedMap, absentByStudent] = await Promise.all([
      fetchSavedRecommendations(result.students.map((s) => s.student_id)),
      fetchAbsentDaysByStudent(props.classId, props.termId),
    ]);

    rows.value = result.students.map((student, index) => {
      const generated = draftForStudent(
        student,
        result.subjects,
        result.scoreByStudent,
        absentByStudent,
      );
      const saved = savedMap.get(student.student_id);

      if (saved) {
        return {
          student_id: student.student_id,
          no: student.index ?? index + 1,
          name_en: student.name_en || student.name_kh || "—",
          gender: student.gender,
          recommendation: saved.recommendation ?? "",
          generated_text: saved.generated_text ?? generated,
          is_edited: !!saved.is_edited,
          dirty: false,
        };
      }

      return {
        student_id: student.student_id,
        no: student.index ?? index + 1,
        name_en: student.name_en || student.name_kh || "—",
        gender: student.gender,
        recommendation: generated,
        generated_text: generated,
        is_edited: false,
        dirty: true,
      };
    });
  } catch (error) {
    console.error(error);
    rows.value = [];
    errorMessage.value =
      error?.message || "Failed to load teacher recommendations.";
  } finally {
    loading.value = false;
  }
}

function onEdit(row) {
  row.dirty = true;
  row.is_edited = row.recommendation !== row.generated_text;
}

async function regenerateUnedited() {
  if (!canLoad.value) return;
  loading.value = true;
  try {
    const gradeId = await resolveGrade();
    const result = await loadClassSubjectAverages({
      yearId: yearId.value,
      gradeId,
      classId: props.classId,
      typeReport: "Term",
      termId: props.termId,
    });

    if (result.error) {
      errorMessage.value = result.error;
      return;
    }

    const absentByStudent = await fetchAbsentDaysByStudent(
      props.classId,
      props.termId,
    );

    for (const row of rows.value) {
      const generated = draftForStudent(
        {
          student_id: row.student_id,
          name_en: row.name_en,
          gender: row.gender,
        },
        result.subjects,
        result.scoreByStudent,
        absentByStudent,
      );
      row.generated_text = generated;
      if (!row.is_edited || !row.recommendation?.trim()) {
        row.recommendation = generated;
        row.is_edited = false;
        row.dirty = true;
      }
    }
  } catch (error) {
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to generate",
    });
  } finally {
    loading.value = false;
  }
}

async function regenerateAllOverwrite() {
  if (!canLoad.value) return;
  loading.value = true;
  try {
    const gradeId = await resolveGrade();
    const result = await loadClassSubjectAverages({
      yearId: yearId.value,
      gradeId,
      classId: props.classId,
      typeReport: "Term",
      termId: props.termId,
    });

    if (result.error) {
      errorMessage.value = result.error;
      return;
    }

    const absentByStudent = await fetchAbsentDaysByStudent(
      props.classId,
      props.termId,
    );

    for (const row of rows.value) {
      const generated = draftForStudent(
        {
          student_id: row.student_id,
          name_en: row.name_en,
          gender: row.gender,
        },
        result.subjects,
        result.scoreByStudent,
        absentByStudent,
      );
      row.generated_text = generated;
      row.recommendation = generated;
      row.is_edited = false;
      row.dirty = true;
    }
  } catch (error) {
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to regenerate",
    });
  } finally {
    loading.value = false;
  }
}

async function saveAll() {
  if (!hasRows.value || !yearId.value) return;

  saving.value = true;
  try {
    const payload = rows.value.map((row) => ({
      student_id: row.student_id,
      class_id: props.classId,
      academic_period_id: props.termId,
      year_id: yearId.value,
      recommendation: row.recommendation ?? "",
      generated_text: row.generated_text ?? "",
      is_edited: !!row.is_edited,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("student_teacher_recommendations")
      .upsert(payload, {
        onConflict: "student_id,class_id,academic_period_id,year_id",
      });

    if (error) throw error;

    for (const row of rows.value) row.dirty = false;

    successAlert.fire({
      icon: "success",
      title: "Recommendations saved",
    });
  } catch (error) {
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || "Failed to save",
    });
  } finally {
    saving.value = false;
  }
}

watch(
  () => [props.classId, props.termId, props.gradeId, yearId.value],
  () => {
    loadRecommendations();
  },
  { immediate: true },
);

defineExpose({
  reload: loadRecommendations,
});
</script>

<template>
  <div>
    <div class="d-flex justify-end ga-2 flex-wrap mb-3">
      <VBtn
        variant="tonal"
        prepend-icon="tabler-sparkles"
        :disabled="!canLoad || loading"
        :loading="loading"
        @click="regenerateUnedited"
      >
        Generate
      </VBtn>
      <VBtn
        variant="tonal"
        color="warning"
        prepend-icon="tabler-refresh"
        :disabled="!canLoad || loading || !hasRows"
        @click="regenerateAllOverwrite"
      >
        Regenerate all
      </VBtn>
      <VBtn
        color="primary"
        prepend-icon="tabler-device-floppy"
        :disabled="!hasRows || loading"
        :loading="saving"
        @click="saveAll"
      >
        Save
      </VBtn>
    </div>

    <VCard v-if="!canLoad" class="pa-8 text-center" variant="outlined">
      <VIcon size="48" class="mb-3" style="opacity: 0.35">
        tabler-message-2
      </VIcon>
      <div class="text-body-1 font-weight-medium">
        Select Class and Term
      </div>
      <div class="text-body-2 mt-1 text-medium-emphasis">
        Recommendations use scores across all subjects in the grade.
      </div>
    </VCard>

    <div
      v-else-if="loading"
      class="d-flex flex-column align-center justify-center pa-10"
    >
      <VProgressCircular indeterminate color="primary" class="mb-3" />
      <div class="text-body-2 text-medium-emphasis">
        Loading recommendations…
      </div>
    </div>

    <div
      v-else-if="errorMessage"
      class="pa-6 text-center text-body-2 text-medium-emphasis"
    >
      {{ errorMessage }}
    </div>

    <template v-else>
      <div class="recommendation-table-wrap">
        <table class="recommendation-table">
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-name">Student's Name</th>
              <th class="col-gender">Gender</th>
              <th class="col-rec">Teacher Recommendation</th>
              <th class="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.student_id">
              <td class="text-center">{{ row.no }}</td>
              <td class="col-name-cell">{{ row.name_en }}</td>
              <td class="text-center">{{ row.gender }}</td>
              <td>
                <AppTextField
                  v-model="row.recommendation"
                  rows="2"
                  auto-grow
                  variant="outlined"
                  density="compact"
                  hide-details
                  @update:model-value="onEdit(row)"
                />
              </td>
              <td class="text-center">
                <VChip
                  size="x-small"
                  :color="row.is_edited ? 'warning' : 'success'"
                  variant="tonal"
                >
                  {{ row.is_edited ? "Edited" : "Auto" }}
                </VChip>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="5" class="text-center py-8 text-medium-emphasis">
                No students in this class.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="recommend-legend">
        <span class="legend-label">Legend</span>
        <span class="legend-item">
          <strong>≥ 80</strong> Strength
        </span>
        <span class="legend-sep">·</span>
        <span class="legend-item">
          <strong>&lt; 60</strong> Improve
        </span>
        <span class="legend-sep">·</span>
        <span class="legend-item">
          <strong>≥ 5 absences</strong> Attendance note
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.recommendation-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.recommendation-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.recommendation-table th,
.recommendation-table td {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 8px 10px;
  vertical-align: middle;
}

.recommendation-table thead th {
  background: #f0f0f0;
  font-weight: 600;
  text-align: center;
}

.col-no {
  width: 48px;
}

.col-gender {
  width: 72px;
}

.col-name {
  width: 200px;
  text-align: left !important;
}

.col-name-cell {
  text-align: left;
  white-space: nowrap;
  font-weight: 500;
}

.col-status {
  width: 88px;
}

.recommendation-table tbody td {
  background: #fff;
}

.recommend-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.legend-label {
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-right: 4px;
}

.legend-item strong {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}

.legend-sep {
  opacity: 0.45;
}
</style>
