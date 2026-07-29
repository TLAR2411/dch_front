<script setup>
/**
 * Teacher recommendations — auto from subject averages, editable + save.
 */
import { computed, ref, watch } from "vue";
import { listStudentRecommendations, saveStudentRecommendations } from "@/services/api/studentRecommendations";
import { getCurrentYearId } from "@/services/getCurrentYearId";
import { usePartStore } from "@/stores/partStore";
import { getEntityLabel } from "@/utils/reportLabels.js";
import { loadClassSubjectAverages } from "@/views/global/report/examReportScoreService.js";
import { buildTeacherRecommendation } from "@/utils/teacherRecommendation.js";
import successAlert from "@/helper/successAlert.js";

const props = defineProps({
  formSearch: {
    type: Object,
    required: true,
  },
});

const partStore = usePartStore();
const reportPart = computed(() => partStore.system_part || "english");

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const subjects = ref([]);
const rows = ref([]);

const yearId = computed(() => getCurrentYearId());

const canLoad = computed(() => {
  const { grade_id, class_id, term_id, type_report } = props.formSearch || {};
  if (!grade_id || !class_id) return false;
  if (type_report === "Term") return !!term_id;
  return type_report === "Year";
});

const periodId = computed(() => {
  if (props.formSearch?.type_report === "Term") {
    return props.formSearch.term_id ?? null;
  }
  return null;
});

const hasRows = computed(() => rows.value.length > 0);

function draftForStudent(student, subjectList, scoreByStudent, absentDays = 0) {
  return buildTeacherRecommendation({
    name: getEntityLabel(student, reportPart.value, "Student"),
    gender: student.gender,
    studentId: student.student_id,
    subjects: subjectList,
    subjectScores: scoreByStudent.get(student.student_id) || {},
    absentDays,
  });
}

async function fetchSavedRecommendations(studentIds) {
  if (!studentIds.length || !props.formSearch?.class_id || !yearId.value) {
    return new Map();
  }

  const data = await listStudentRecommendations({
    class_id: props.formSearch.class_id,
    year_id: yearId.value,
    student_ids: studentIds,
    ...(periodId.value != null
      ? { academic_period_id: periodId.value }
      : { academic_period_null: true }),
  });
  const error = null;
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.student_id, row]));
}

async function loadRecommendations() {
  if (!canLoad.value) {
    subjects.value = [];
    rows.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    const result = await loadClassSubjectAverages({
      yearId: yearId.value,
      gradeId: props.formSearch.grade_id,
      classId: props.formSearch.class_id,
      typeReport: props.formSearch.type_report,
      termId: props.formSearch.term_id,
    });

    if (result.error) {
      subjects.value = [];
      rows.value = [];
      errorMessage.value = result.error;
      return;
    }

    subjects.value = result.subjects;

    const savedMap = await fetchSavedRecommendations(
      result.students.map((s) => s.student_id),
    );

    rows.value = result.students.map((student) => {
      const generated = draftForStudent(
        student,
        result.subjects,
        result.scoreByStudent,
      );
      const saved = savedMap.get(student.student_id);

      if (saved) {
        return {
          student_id: student.student_id,
          name_en: student.name_en || "",
          name_kh: student.name_kh || "",
          display_name: getEntityLabel(student, reportPart.value, "—"),
          gender: student.gender,
          recommendation: saved.recommendation ?? "",
          generated_text: saved.generated_text ?? generated,
          is_edited: !!saved.is_edited,
          db_id: saved.id,
          dirty: false,
        };
      }

      // Auto-generate when no saved row yet
      return {
        student_id: student.student_id,
        name_en: student.name_en || "",
        name_kh: student.name_kh || "",
        display_name: getEntityLabel(student, reportPart.value, "—"),
        gender: student.gender,
        recommendation: generated,
        generated_text: generated,
        is_edited: false,
        db_id: null,
        dirty: true,
      };
    });
  } catch (error) {
    console.error("Failed to load recommendations:", error);
    subjects.value = [];
    rows.value = [];
    errorMessage.value =
      error?.message || "Failed to load teacher recommendations.";
  } finally {
    loading.value = false;
  }
}

function onEdit(row) {
  row.dirty = true;
  if (row.recommendation !== row.generated_text) {
    row.is_edited = true;
  }
}

/** Fill empty / unedited rows from current scores */
async function regenerateUnedited() {
  loading.value = true;
  try {
    const result = await loadClassSubjectAverages({
      yearId: yearId.value,
      gradeId: props.formSearch.grade_id,
      classId: props.formSearch.class_id,
      typeReport: props.formSearch.type_report,
      termId: props.formSearch.term_id,
    });

    if (result.error) {
      errorMessage.value = result.error;
      return;
    }

    subjects.value = result.subjects;

    for (const row of rows.value) {
      const generated = draftForStudent(
        {
          student_id: row.student_id,
          name_en: row.name_en,
          name_kh: row.name_kh,
          gender: row.gender,
        },
        result.subjects,
        result.scoreByStudent,
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
      title: error.message || "Failed to regenerate",
    });
  } finally {
    loading.value = false;
  }
}

/** Overwrite every student from current scores */
async function regenerateAllOverwrite() {
  loading.value = true;
  try {
    const result = await loadClassSubjectAverages({
      yearId: yearId.value,
      gradeId: props.formSearch.grade_id,
      classId: props.formSearch.class_id,
      typeReport: props.formSearch.type_report,
      termId: props.formSearch.term_id,
    });

    if (result.error) {
      errorMessage.value = result.error;
      return;
    }

    subjects.value = result.subjects;

    for (const row of rows.value) {
      const generated = draftForStudent(
        {
          student_id: row.student_id,
          name_en: row.name_en,
          name_kh: row.name_kh,
          gender: row.gender,
        },
        result.subjects,
        result.scoreByStudent,
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
      class_id: props.formSearch.class_id,
      academic_period_id: periodId.value,
      year_id: yearId.value,
      recommendation: row.recommendation ?? "",
      generated_text: row.generated_text ?? "",
      is_edited: !!row.is_edited,
      updated_at: new Date().toISOString(),
    }));

    // Returns the upserted rows so db_id can be mapped back, same as the
    // .select("id, student_id") the PostgREST upsert used.
    const data = await saveStudentRecommendations(payload);

    const idByStudent = new Map((data ?? []).map((r) => [r.student_id, r.id]));
    for (const row of rows.value) {
      row.db_id = idByStudent.get(row.student_id) ?? row.db_id;
      row.dirty = false;
    }

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
  () => [
    props.formSearch?.grade_id,
    props.formSearch?.class_id,
    props.formSearch?.term_id,
    props.formSearch?.type_report,
    yearId.value,
    reportPart.value,
  ],
  () => {
    loadRecommendations();
  },
  { immediate: true },
);
</script>

<template>
  <div class="report-teacher-recommendation">
    <VRow class="mb-3" align="center">
      <VCol cols="12" md="6">
        <div class="text-body-2 text-medium-emphasis">
          Auto from subject scores (strong ≥ 80, weak &lt; 60). Edit anytime, then Save.
        </div>
      </VCol>
      <VCol cols="12" md="6" class="d-flex justify-end ga-2 flex-wrap">
        <VBtn
          variant="tonal"
          prepend-icon="tabler-sparkles"
          :disabled="!hasRows || loading"
          :loading="loading"
          @click="regenerateUnedited"
        >
          Generate
        </VBtn>
        <VBtn
          variant="tonal"
          color="warning"
          prepend-icon="tabler-refresh"
          :disabled="!hasRows || loading"
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
      </VCol>
    </VRow>

    <div v-if="loading" class="d-flex flex-column align-center justify-center pa-10">
      <VProgressCircular
        indeterminate
        color="primary"
        size="40"
        width="3"
        class="mb-3"
      />
      <div class="text-body-2 text-medium-emphasis">Loading recommendations…</div>
    </div>

    <div
      v-else-if="errorMessage"
      class="pa-6 text-center text-body-2 text-medium-emphasis"
    >
      {{ errorMessage }}
    </div>

    <div v-else-if="!hasRows" class="pa-6 text-center text-body-2 text-medium-emphasis">
      No students found for this class.
    </div>

    <div v-else class="d-flex flex-column ga-3">
      <VCard
        v-for="(row, index) in rows"
        :key="row.student_id"
        variant="outlined"
        class="pa-3"
      >
        <div class="d-flex align-center justify-space-between mb-2 flex-wrap ga-2">
          <div class="text-body-1 font-weight-medium">
            {{ index + 1 }}. {{ row.display_name }}
          </div>
          <VChip
            size="x-small"
            :color="row.is_edited ? 'warning' : 'success'"
            variant="tonal"
          >
            {{ row.is_edited ? "Edited" : "Auto" }}
          </VChip>
        </div>

        <VTextarea
          v-model="row.recommendation"
          rows="2"
          auto-grow
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="onEdit(row)"
        />
      </VCard>
    </div>
  </div>
</template>
