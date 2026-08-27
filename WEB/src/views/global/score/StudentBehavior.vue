<script setup>
/**
 * Student Behavior grid for Score Entry.
 * Rows = class students; columns = behaviors; cells = rating select.
 */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useYearStore } from "@/stores/yearStore.js";
import successAlert from "@/helper/successAlert.js";
import { isRequestCanceled } from "@/utils/api.js";
import { listBehaviors } from "@/services/api/behaviors";
import { listRatings } from "@/services/api/ratings";
import {
  listStudentBehaviorRatings,
  saveStudentBehaviorRatings,
} from "@/services/api/studentBehaviorRatings";
import { useEntityLabel } from "@/composable/useEntityLabel.js";
import { fetchClassStudents } from "./scoreEntryService.js";

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

const { t } = useI18n();
const yearStore = useYearStore();
const yearId = computed(() => yearStore.year_id);
const { entityLabel, selectItemTitle } = useEntityLabel();

const loading = ref(false);
const saving = ref(false);
const errorMessage = ref("");
const behaviors = ref([]);
const ratings = ref([]);
const rows = ref([]);
const dirty = ref(false);

const canLoad = computed(
  () => !!props.classId && !!props.termId && !!yearId.value,
);

const hasRows = computed(() => rows.value.length > 0);
const hasBehaviors = computed(() => behaviors.value.length > 0);

function isActive(row) {
  return row?.is_active !== false;
}

function genderLabel(gender) {
  if (!gender) return "—";
  const value = String(gender).toLowerCase();
  if (value === "male" || value === "m") return t("male");
  if (value === "female" || value === "f") return t("female");
  return gender;
}

function onRatingChange() {
  dirty.value = true;
}

async function loadGrid() {
  if (!canLoad.value) {
    rows.value = [];
    behaviors.value = [];
    ratings.value = [];
    errorMessage.value = "";
    dirty.value = false;
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  dirty.value = false;

  try {
    const [behaviorList, ratingList, students] = await Promise.all([
      listBehaviors(),
      listRatings(),
      fetchClassStudents(props.classId),
    ]);

    behaviors.value = (behaviorList ?? []).filter(isActive);
    ratings.value = (ratingList ?? []).filter(isActive);

    if (!behaviors.value.length) {
      rows.value = [];
      errorMessage.value = t("No behaviors configured. Add them in Behavior settings first.");
      return;
    }

    if (!ratings.value.length) {
      rows.value = [];
      errorMessage.value = t("No ratings configured. Add them in Rating settings first.");
      return;
    }

    const studentIds = students.map((s) => s.student_id);
    const saved = studentIds.length
      ? await listStudentBehaviorRatings({
          class_id: props.classId,
          year_id: yearId.value,
          academic_period_id: props.termId,
          student_ids: studentIds,
        })
      : [];

    /** `${studentId}:${behaviorId}` → rating_id */
    const savedMap = new Map(
      (saved ?? []).map((row) => [
        `${row.student_id}:${row.behavior_id}`,
        row.rating_id ?? null,
      ]),
    );

    rows.value = students.map((student, index) => {
      const ratingsByBehavior = {};
      for (const behavior of behaviors.value) {
        ratingsByBehavior[behavior.id] =
          savedMap.get(`${student.student_id}:${behavior.id}`) ?? null;
      }

      return {
        student_id: student.student_id,
        no: student.index ?? index + 1,
        name: entityLabel(student, student.name_en || student.name_kh || "—"),
        gender: genderLabel(student.gender),
        ratingsByBehavior,
      };
    });
  } catch (error) {
    if (isRequestCanceled(error)) return;
    console.error(error);
    rows.value = [];
    errorMessage.value =
      error?.message || t("Failed to load student behaviors");
  } finally {
    loading.value = false;
  }
}

async function saveAll() {
  if (!hasRows.value || !hasBehaviors.value || !yearId.value) return;

  saving.value = true;
  try {
    const payload = [];
    for (const row of rows.value) {
      for (const behavior of behaviors.value) {
        payload.push({
          student_id: row.student_id,
          class_id: props.classId,
          academic_period_id: props.termId,
          year_id: yearId.value,
          behavior_id: behavior.id,
          rating_id: row.ratingsByBehavior[behavior.id] ?? null,
        });
      }
    }

    await saveStudentBehaviorRatings(payload);
    dirty.value = false;

    successAlert.fire({
      icon: "success",
      title: t("Behavior ratings saved"),
    });
  } catch (error) {
    if (isRequestCanceled(error)) return;
    console.error(error);
    successAlert.fire({
      icon: "error",
      title: error.message || t("Failed to save behavior ratings"),
    });
  } finally {
    saving.value = false;
  }
}

watch(
  () => [props.classId, props.termId, props.gradeId, yearId.value],
  () => {
    loadGrid();
  },
  { immediate: true },
);

defineExpose({
  reload: loadGrid,
});
</script>

<template>
  <div>
    <div
      id="page-tour-score-behavior-actions"
      class="d-flex justify-end ga-2 flex-wrap mb-3"
    >
      <VBtn
        variant="tonal"
        color="secondary"
        prepend-icon="tabler-refresh"
        :disabled="!canLoad || loading"
        :loading="loading"
        @click="loadGrid"
      >
        {{ $t("Refresh") }}
      </VBtn>
      <VBtn
        color="primary"
        prepend-icon="tabler-device-floppy"
        :disabled="!hasRows || !hasBehaviors || loading"
        :loading="saving"
        @click="saveAll"
      >
        {{ $t("Save") }}
      </VBtn>
    </div>

    <VCard v-if="!canLoad" class="pa-8 text-center" variant="outlined">
      <VIcon size="48" class="mb-3" style="opacity: 0.35">
        tabler-mood-smile
      </VIcon>
      <div class="text-body-1 font-weight-medium">
        {{ $t("Select Class and Term") }}
      </div>
      <div class="text-body-2 mt-1 text-medium-emphasis">
        {{ $t("Choose a class and term above to enter student behavior ratings.") }}
      </div>
    </VCard>

    <div
      v-else-if="loading"
      class="d-flex flex-column align-center justify-center pa-10"
    >
      <VProgressCircular indeterminate color="primary" class="mb-3" />
      <div class="text-body-2 text-medium-emphasis">
        {{ $t("Loading…") }}
      </div>
    </div>

    <div
      v-else-if="errorMessage"
      class="pa-6 text-center text-body-2 text-medium-emphasis"
    >
      {{ errorMessage }}
    </div>

    <template v-else>
      <div class="behavior-table-wrap">
        <table class="behavior-table">
          <thead>
            <tr>
              <th class="col-name">{{ $t("Student's Name") }}</th>
              <th class="col-gender">{{ $t("Gender") }}</th>
              <th
                v-for="behavior in behaviors"
                :key="behavior.id"
                class="col-behavior"
              >
                {{ entityLabel(behavior) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.student_id">
              <td class="col-name-cell">{{ row.name }}</td>
              <td class="text-center">{{ row.gender }}</td>
              <td
                v-for="behavior in behaviors"
                :key="`${row.student_id}-${behavior.id}`"
                class="col-rating"
              >
                <AppSelect
                  v-model="row.ratingsByBehavior[behavior.id]"
                  :items="ratings"
                  :item-title="selectItemTitle"
                  item-value="id"
                  :placeholder="$t('Select rating')"
                  clearable
                  density="compact"
                  hide-details
                  @update:model-value="onRatingChange"
                />
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td
                :colspan="2 + behaviors.length"
                class="text-center py-8 text-medium-emphasis"
              >
                {{ $t("No students in this class.") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.behavior-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.behavior-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 640px;
}

.behavior-table th,
.behavior-table td {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 8px 10px;
  vertical-align: middle;
}

.behavior-table thead th {
  background: #f0f0f0;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.col-name {
  min-width: 160px;
  text-align: left !important;
}

.col-name-cell {
  font-weight: 500;
  white-space: nowrap;
}

.col-gender {
  width: 90px;
}

.col-behavior {
  min-width: 140px;
}

.col-rating {
  min-width: 150px;
}
</style>
