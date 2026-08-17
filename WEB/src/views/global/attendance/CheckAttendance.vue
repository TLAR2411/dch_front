<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { listSchedules } from "@/services/api/schedules";
import { getClasses } from "@/services/dataService.js";
import { useRoute } from "vue-router";
import { api } from "@/utils/api.js";
import AppCombobox from "@/@core/components/app-form-elements/AppCombobox.vue";
import Loading from "../components/Loading.vue";
import { usePartStore } from "@/stores/partStore";
import { useYearStore } from "@/stores/yearStore";
import { useSettingStore } from "@/stores/settingStore";
import { getEntityLabel } from "@/utils/reportLabels.js";

const { t } = useI18n();
const partStore = usePartStore();
const yearStore = useYearStore();
const settingStore = useSettingStore();
const { year_id: yearId } = storeToRefs(yearStore);
const { branch_id: branchId } = storeToRefs(settingStore);
const reportPart = computed(() => partStore.system_part || "english");

function selectItemTitle(item) {
  return getEntityLabel(item, reportPart.value, "");
}

function subjectSelectTitle(item) {
  return getEntityLabel(item?.subjects || item, reportPart.value, "");
}

function entityLabel(entity, fallback = "—") {
  return getEntityLabel(entity, reportPart.value, fallback);
}

const dataAttendance = ref([]);
const route = useRoute();
const classes = ref([]);

const subjectSchedules = ref([]);

const date = ref("");

const isSearch = ref(false); // loading find data

const isLoading = ref(false); // for loading page

const isApprove = ref(false); // for approve function

const isApprovedFlag = ref(false);

const errorMessage = ref("");

const isSubmit = ref(null);

const form = ref({
  class_id: route.params.id ? Number(route.params.id) : null,
  date: "",
  day_id: null,
  subject_id: null,
});

const textApprove = computed(() =>
  isApprovedFlag.value ? t("Approve") : t("Disapprove"),
);

const reasons = computed(() => [
  { title: t("Trip"), value: "Trip" },
  { title: t("Busy"), value: "Busy" },
  { title: t("Sick"), value: "Sick" },
]);

watch(
  () => route.params.id,
  (newId) => {
    form.value.class_id = Number(newId) || null;
  },
);

watch(
  () => form.value.class_id,
  () => {
    if (!form.value.class_id) {
      dataAttendance.value = [];
      subjectSchedules.value = [];
      isSearch.value = false;
      return;
    }
    if (form.value.date) getData();
    // Explicit null check, not truthiness: Sunday's day_id is 0, so `if
    // (form.value.day_id)` silently skipped the schedule fetch every Sunday.
    if (form.value.day_id !== null && form.value.day_id !== undefined) {
      getSubjectSchedule(form.value.day_id);
    }
  },
);

watch(
  () => form.value.subject_id,
  () => {
    getData();
  },
);

const getData = async () => {
  isSearch.value = true;
  isLoading.value = true;
  try {
    const res = await api.post("students-classes-attendance-list", {
      class_id: form.value.class_id,
      date: form.value.date,
      subject_id: form.value.subject_id,
    });

    // API returns student_id (not id) — normalise here
    if (res.data.data) {
      isSubmit.value = res.data.is_submit;
      dataAttendance.value = (res.data.data || []).map((item) => ({
        ...item,
        // default everyone to present, only touch exceptions
        present: item.present ?? true,
        late: item.late ?? false,
        ask_permission: item.ask_permission ?? false,
        reason: item.reason ?? null,
        description: item.description ?? "",
      }));
    }

    if (dataAttendance.value.length === 0) {
      isApprovedFlag.value = false;
    } else {
      isApprovedFlag.value = !!dataAttendance.value[0].is_approve;
    }
  } catch (error) {
    console.log(error);
  } finally {
    isLoading.value = false;

    if (dataAttendance.value.length === 0) {
      isSearch.value = false;
      errorMessage.value = t("Data Not Found");
    }
  }
};

function onPresentChange(item) {
  if (!item.present) {
    item.late = false;
  }
}

function onLateChange(item) {
  if (item.late) {
    item.present = 1;
  }
}

function onPermissionChange(item) {
  if (item.ask_permission) {
    item.present = false;
    item.late = false;
  } else {
    item.present = 1;
    item.reason = null;
  }
}

function rowClass(item) {
  if (item.ask_permission) return "row-perm";
  if (!item.present) return "row-absent";
  if (item.late) return "row-late";
  return "";
}

const saving = ref(false);

const saveAttendance = async () => {
  saving.value = true;
  try {
    await api.post("students-classes-attendance-store", {
      class_id: form.value.class_id,
      date: form.value.date,
      day_id: form.value.day_id,
      subject_id: form.value.subject_id,
      students: dataAttendance.value.map((item) => ({
        student_id: item.student_id,
        present: item.present,
        late: item.late,
        ask_permission: item.ask_permission,
        reason: item.reason,
        description: item.description,
      })),
    });
  } catch (error) {
    console.log(error);
  } finally {
    saving.value = false;
    getData();
  }
};

const approveAttendance = async () => {
  isApprove.value = true;

  try {
    await api.post("students-classes-attendance-approve", {
      class_id: form.value.class_id,
      date: form.value.date,
      subject_id: form.value.subject_id,
    });
  } catch (error) {
    console.log(error);
  } finally {
    isApprove.value = false;
    getData();
  }
};

watch(date, async (newDate) => {
  form.value.date = newDate;
  if (form.value.class_id && newDate) {
    getData();
    form.value.subject_id = null;
  }
  // public.weekday.id IS the JavaScript getDay() value — 0 Sunday .. 6 Saturday,
  // verified against the table. So day_id is derived locally and does NOT depend
  // on /api/weekday-all being reachable.
  const dayNumber = new Date(newDate).getDay();

  form.value.day_id = dayNumber;
  if (form.value.class_id) {
    getSubjectSchedule(dayNumber);
  }
});

const getSubjectSchedule = async (dayId) => {
  try {
    // only_teaching: non-admin teachers only get the subjects they teach
    // in this class; admins still see the full schedule.
    const rows = await listSchedules({
      class_id: form.value.class_id,
      day_id: dayId,
      only_teaching: true,
    });
    const seenSubjectIds = new Set();
    subjectSchedules.value = (rows || []).filter((row) => {
      const subjectId = row?.subject_id ?? row?.subjects?.id;
      if (!subjectId || seenSubjectIds.has(subjectId)) return false;
      seenSubjectIds.add(subjectId);
      return true;
    });

    if (
      form.value.subject_id &&
      !subjectSchedules.value.some(
        (row) => String(row.subject_id ?? row?.subjects?.id) === String(form.value.subject_id),
      )
    ) {
      form.value.subject_id = null;
    }
  } catch (error) {}
};

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
  if (list == null) return;
  classes.value = filterClassesForBranch(list);
}

async function resetForContextChange() {
  form.value.class_id = null;
  form.value.subject_id = null;
  dataAttendance.value = [];
  subjectSchedules.value = [];
  isSearch.value = false;
  errorMessage.value = "";
  classes.value = [];
  await loadClasses();
}

watch(
  () => [yearId.value, branchId.value],
  async (next, prev) => {
    if (!prev) return;
    if (next[0] === prev[0] && String(next[1]) === String(prev[1])) return;
    await resetForContextChange();
  },
);

onMounted(async () => {
  await loadClasses();
  date.value = new Date().toISOString().split("T")[0];
});
</script>

<template>
  <div>
    <VRow class="mt-1" align="center">
      <VCol cols="6" md="2">
        <AppSelect
          v-model="form.class_id"
          :items="classes"
          :item-title="selectItemTitle"
          item-value="id"
          autocomplete="off"
          :placeholder="$t('Choose Class')"
        />
      </VCol>

      <VCol cols="6" md="2">
        <AppDateTimePicker v-model="date" :placeholder="$t('Select date')" />
      </VCol>

      <VCol cols="6" md="2" v-if="isSearch">
        <AppSelect
          v-model="form.subject_id"
          :items="subjectSchedules"
          :item-title="subjectSelectTitle"
          item-value="subject_id"
          autocomplete="off"
          :placeholder="$t('Choose Subject')"
          color="primary"
          clearable
        />
      </VCol>

      <VCol cols="6" md="2" class="d-flex ga-2">
        <VBtn
          variant="tonal"
          color="success"
          density="comfortable"
          :loading="isLoading"
          :disabled="isLoading"
          prepend-icon="tabler-search"
          @click="getData"
        >
          {{ $t("Search") }}
        </VBtn>
      </VCol>

      <VCol cols="12" md="4" class="d-flex ga-2 flex-wrap" v-if="isSearch">
        <VBtn
          variant="tonal"
          color="success"
          :loading="saving"
          :disabled="saving"
          prepend-icon="tabler-send"
          @click="saveAttendance"
          density="comfortable"
        >
          {{ isSubmit ? $t("Update") : $t("Submit") }}
        </VBtn>
        <VBtn
          variant="tonal"
          :color="!isApprovedFlag ? 'warning' : 'primary'"
          :loading="isApprove"
          :disabled="isApprove || !isSubmit"
          @click="approveAttendance"
          prepend-icon="tabler-circle-check"
          density="comfortable"
        >
          {{ textApprove }}
        </VBtn>

        <div>
          <v-tooltip :open-on-hover="true" open-on-click>
            <template v-slot:activator="{ props }">
              <v-btn
                prepend-icon="tabler-exclamation-mark"
                density="comfortable"
                variant="tonal"
                v-bind="props"
              >
                {{ $t("Rule") }}
              </v-btn>
            </template>
            <span v-html="$t('Attendance rule hint')" />
          </v-tooltip>
        </div>
      </VCol>
    </VRow>

    <Loading v-if="isLoading" />

    <VRow v-else-if="isSearch">
      <VCol cols="12">
        <div
          class="submit-status-banner mb-3"
          :class="isSubmit ? 'is-submitted' : 'is-draft'"
        >
          <div class="d-flex align-center ga-2">
            <VIcon
              :icon="isSubmit ? 'tabler-circle-check' : 'tabler-alert-circle'"
              size="20"
            />
            <div>
              <div class="status-title">
                {{
                  isSubmit
                    ? $t("Already submitted")
                    : $t("Not yet submitted")
                }}
              </div>
              <div class="status-desc">
                {{
                  isSubmit
                    ? $t(
                        "Attendance for this class, date, and subject has been saved.",
                      )
                    : $t("Mark attendance, then click Submit to save.")
                }}
              </div>
            </div>
          </div>
          <VChip
            size="small"
            label
            :color="isSubmit ? 'success' : 'warning'"
            variant="flat"
          >
            {{ isSubmit ? $t("Submitted") : $t("Draft") }}
          </VChip>
        </div>

        <VTable
          fixed-header
          density="comfortable"
          class="border rounded attendance-table"
        >
          <thead>
            <tr>
              <th class="sticky-header" style="width: 270px">
                <span class="d-none d-sm-inline">{{ $t("Name") }}</span>
                <span class="d-inline d-sm-none">{{ $t("Name") }}</span>
              </th>
              <th style="width: 20px">
                <span class="d-none d-sm-inline">{{ $t("Gender") }}</span>
                <span class="d-inline d-sm-none">{{ $t("Gen") }}</span>
              </th>
              <th style="width: 85px" class="text-center">
                <span class="d-none d-sm-inline">{{ $t("Present") }}</span>
                <span class="d-inline d-sm-none">Pr</span>
              </th>
              <th style="width: 75px" class="text-center">
                <span class="d-none d-sm-inline">{{ $t("Late") }}</span>
                <span class="d-inline d-sm-none">L</span>
              </th>
              <th style="width: 110px" class="text-center">
                <span class="d-none d-sm-inline">{{ $t("Ask Permission") }}</span>
                <span class="d-inline d-sm-none">P</span>
              </th>
              <th style="min-width: 150px">{{ $t("Reason") }}</th>
              <th style="min-width: 150px">{{ $t("Description") }}</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in dataAttendance"
              :key="item.student_id"
              :class="rowClass(item)"
            >
              <td class="sticky-col">
                <div class="name-col">{{ entityLabel(item) }}</div>
              </td>

              <td v-if="item.gender == 'male'">M</td>
              <td v-else>F</td>

              <td class="text-center">
                <VCheckbox
                  v-model="item.present"
                  :disabled="item.ask_permission"
                  color="primary"
                  hide-details
                  density="compact"
                  class="justify-center"
                  :true-value="1"
                  :false-value="0"
                  @update:model-value="onPresentChange(item)"
                />
              </td>

              <td class="text-center">
                <VCheckbox
                  v-model="item.late"
                  :disabled="item.ask_permission"
                  color="error"
                  hide-details
                  density="compact"
                  class="justify-center"
                  :true-value="1"
                  :false-value="0"
                  @update:model-value="onLateChange(item)"
                />
              </td>

              <td class="text-center">
                <VCheckbox
                  v-model="item.ask_permission"
                  color="info"
                  hide-details
                  density="compact"
                  class="justify-center"
                  :true-value="1"
                  :false-value="0"
                  @update:model-value="onPermissionChange(item)"
                />
              </td>

              <td>
                <AppCombobox
                  v-model="item.reason"
                  :items="reasons"
                  item-title="title"
                  item-value="value"
                  placeholder="—"
                  density="compact"
                  hide-details
                />
              </td>

              <td>
                <AppTextField
                  v-model="item.description"
                  autocomplete="off"
                  :placeholder="$t('Note…')"
                  density="compact"
                  hide-details
                />
              </td>
            </tr>

            <tr v-if="!dataAttendance.length">
              <td colspan="8" class="text-center py-10">
                <i
                  class="ti ti-users mb-2"
                  style="font-size: 36px; display: block; opacity: 0.25"
                />
                <span style="opacity: 0.45; font-size: 13px">
                  {{ $t("Select a class and date to load students.") }}
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCol>
    </VRow>

    <p
      style="margin-top: 30px; font-size: 20px"
      class="d-flex justify-center font-weight-bold text-error"
      v-else
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.submit-status-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.submit-status-banner.is-draft {
  background: rgba(var(--v-theme-warning), 0.1);
  border-color: rgba(var(--v-theme-warning), 0.35);
  color: rgb(var(--v-theme-warning));
}

.submit-status-banner.is-submitted {
  background: rgba(var(--v-theme-success), 0.1);
  border-color: rgba(var(--v-theme-success), 0.35);
  color: rgb(var(--v-theme-success));
}

.status-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  color: rgb(var(--v-theme-on-surface));
}

.status-desc {
  font-size: 12px;
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.legend-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 12px;
  margin-top: -10px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.leg {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ldot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
  display: inline-block;
}
.ldot.success {
  background: rgb(var(--v-theme-primary));
}
.ldot.error {
  background: rgb(var(--v-theme-error));
}
.ldot.warning {
  background: rgb(var(--v-theme-warning));
}
.ldot.info {
  background: rgb(var(--v-theme-info));
}
.leg-hint {
  font-size: 12px;
}

.name-col {
  font-weight: 500;
  font-size: 13px;
}
.name-kh {
  font-size: 11px;
  opacity: 0.5;
  margin-top: 1px;
}
.no-col {
  font-size: 12px;
  opacity: 0.4;
}

.attendance-table :deep(.v-checkbox .v-selection-control) {
  justify-content: center;
}

@media (max-width: 600px) {
  .leg-hint {
    display: none;
  }
}

.attendance-table {
  overflow-x: auto;
}

.sticky-header {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 20;
  background: white !important;
}

.sticky-col {
  position: sticky;
  left: 0;
  z-index: 10;
  background: white;
}

:deep(.attendance-table thead th:first-child) {
  position: sticky;
  left: 0;
  top: 0;
  z-index: 30;
  background: white !important;
}

.attendance-table thead th.sticky-header {
  z-index: 0;
}
</style>
