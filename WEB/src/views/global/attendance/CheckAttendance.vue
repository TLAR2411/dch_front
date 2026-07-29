<script setup>
import { onMounted, ref, watch } from "vue";
import { listSchedules } from "@/services/api/schedules";
import DateNavigator from "../components/DateNavigator.vue";
import { getClasses, getWeekdays } from "@/services/dataService.js";
import { useRoute } from "vue-router";
import { api } from "@/utils/api.js";
import AppCombobox from "@/@core/components/app-form-elements/AppCombobox.vue";
import Loading from "../components/Loading.vue";

const dataAttendance = ref([]);
const route = useRoute();
const classes = ref([]);

const subjectSchedules = ref([]);

const date = ref("");

const DAYS = ref([]);

const isSearch = ref(false); // loading find data

const isLoading = ref(false); // for loading page

const isApprove = ref(false); // for approve function

const textApprove = ref("");

const errorMessage = ref("");

const isSubmit = ref(null);

const form = ref({
  class_id: route.params.id ? Number(route.params.id) : null,
  date: "",
  day_id: null,
  subject_id: null,
});

watch(
  () => route.params.id,
  (newId) => {
    form.value.class_id = Number(newId) || null;
  },
);

watch(
  () => form.value.class_id,
  () => {
    if (form.value.date) getData();
    if (form.value.day_id) {
      getSubjectSchedule(form.value.day_id);
    }
  },
);

watch(
  () => form.value.subject_id,
  (newVal) => {
    getData();
  },
);

const reasons = ref(["Trip", "Busy", "Sick"]);

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

    const newData = dataAttendance.value.filter(
      (item) => item.subject_id === 25,
    );
    console.log("newData", newData);

    if (dataAttendance.value.length === 0) {
      textApprove.value = "Disapprove";
    } else {
      textApprove.value = dataAttendance.value[0].is_approve
        ? "Approve"
        : "Disapprove";
    }

    console.log("data", dataAttendance.value);
  } catch (error) {
    console.log(error);
  } finally {
    isLoading.value = false;

    if (dataAttendance.value.length === 0) {
      isSearch.value = false;
      errorMessage.value = "Data Not Found";
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
  const dayNumber = new Date(newDate).getDay();

  console.log("1");

  // Two guards, both load-bearing. getWeekdays() used to return null on any
  // API error, so `DAYS.value.length` threw and took the page down — and
  // /api/weekday-all does intermittently 500 in production today.
  //
  // The wait also needed a timeout: if the days never arrive, the original
  // promise never resolved and everything below it silently never ran, so the
  // page looked fine while day_id stayed unset.
  if (!DAYS.value?.length) {
    const arrived = await new Promise((resolve) => {
      const stop = watch(DAYS, (val) => {
        if (val?.length) {
          stop();
          resolve(true);
        }
      });
      setTimeout(() => {
        stop();
        resolve(false);
      }, 5000);
    });
    if (!arrived) return;
  }

  const day = DAYS.value.find((item) => item.id === dayNumber);
  if (!day) return;

  form.value.day_id = day.id;
  if (form.value.class_id) {
    getSubjectSchedule(day.id);
  }
});

const getSubjectSchedule = async (dayId) => {
  try {
    subjectSchedules.value = await listSchedules({
      class_id: form.value.class_id,
      day_id: dayId,
    });

    console.log("formSubject", form.value.subject_id);

    console.log("subject", subjectSchedules.value);
  } catch (error) {}
};

onMounted(async () => {
  DAYS.value = await getWeekdays();
  console.log(DAYS.value);

  classes.value = await getClasses();
  date.value = new Date().toISOString().split("T")[0];
  // if (route.params.id) {
  //   getData();
  // }
});
</script>

<template>
  <div>
    <VRow class="mt-1" align="center">
      <VCol cols="6" md="2">
        <AppSelect
          v-model="form.class_id"
          :items="classes"
          item-title="name_en"
          item-value="id"
          autocomplete="off"
          placeholder="Choose Class"
        />
      </VCol>

      <VCol cols="6" md="2">
        <AppDateTimePicker v-model="date" placeholder="Select date" />
      </VCol>

      <VCol cols="6" md="2" v-if="isSearch">
        <AppSelect
          v-model="form.subject_id"
          :items="subjectSchedules"
          item-title="subjects.name_en"
          item-value="subjects.id"
          autocomplete="off"
          placeholder="Choose Subject"
          color="primary"
          clearable
        />
      </VCol>

      <VCol cols="6" md="2" class="d-flex ga-2">
        <!-- <DateNavigator class="d-none d-sm-inline" v-model="date" /> -->

        <VBtn
          variant="tonal"
          color="success"
          density="comfortable"
          :loading="isLoading"
          :disabled="isLoading"
          prepend-icon="tabler-search"
          @click="getData"
        >
          Search
          <!-- <span class="d-none d-sm-inline"> Search </span> -->
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
          {{ isSubmit ? "Update" : "Submit" }}
        </VBtn>
        <VBtn
          variant="tonal"
          :color="textApprove == 'Disapprove' ? 'warning' : 'primary'"
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
                Rule
              </v-btn>
            </template>
            <span
              >All students are marked as Present by default <br />· Uncheck
              Present = Absent <br />· Check Late = Present but arrived late
              <br />· Check Permission = Excused absence (Present & Late are
              disabled)</span
            >
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
                {{ isSubmit ? "Already submitted" : "Not yet submitted" }}
              </div>
              <div class="status-desc">
                {{
                  isSubmit
                    ? "Attendance for this class, date, and subject has been saved."
                    : "Mark attendance, then click Submit to save."
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
            {{ isSubmit ? "Submitted" : "Draft" }}
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
                <span class="d-none d-sm-inline">Name English</span>
                <span class="d-inline d-sm-none">Name</span>
              </th>
              <th style="width: 20px">
                <span class="d-none d-sm-inline">Gender</span>
                <span class="d-inline d-sm-none">Gen</span>
              </th>
              <th style="width: 85px" class="text-center">
                <span class="d-none d-sm-inline">Present</span>
                <span class="d-inline d-sm-none">Pr</span>
              </th>
              <th style="width: 75px" class="text-center">
                <span class="d-none d-sm-inline">Late</span>
                <span class="d-inline d-sm-none">L</span>
              </th>
              <th style="width: 110px" class="text-center">
                <span class="d-none d-sm-inline">Permission</span>
                <span class="d-inline d-sm-none">P</span>
              </th>
              <th style="min-width: 150px">Reason</th>
              <th style="min-width: 150px">Description</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="(item, rowIndex) in dataAttendance"
              :key="item.student_id"
              :class="rowClass(item)"
            >
              <!-- Name — use name_en from your API -->
              <td class="sticky-col">
                <div class="name-col">{{ item.name_en }}</div>
                <!-- <div class="name-kh">{{ item.name_kh }}</div> -->
              </td>

              <!-- Gender — use gender from your API -->
              <td v-if="item.gender == 'male'">M</td>
              <td v-else>F</td>

              <!-- Present -->
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

              <!-- Late -->
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

              <!-- Ask Permission -->
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

              <!-- Reason — only active when permission checked -->
              <!-- :disabled="!item.ask_permission" -->
              <td>
                <AppCombobox
                  v-model="item.reason"
                  :items="reasons"
                  placeholder="—"
                  density="compact"
                  hide-details
                />
              </td>

              <!-- Description -->
              <td>
                <AppTextField
                  v-model="item.description"
                  autocomplete="off"
                  placeholder="Note…"
                  density="compact"
                  hide-details
                />
              </td>
            </tr>

            <!-- empty state -->
            <tr v-if="!dataAttendance.length">
              <td colspan="8" class="text-center py-10">
                <i
                  class="ti ti-users mb-2"
                  style="font-size: 36px; display: block; opacity: 0.25"
                />
                <span style="opacity: 0.45; font-size: 13px">
                  Select a class and date to load students.
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

/* legend */

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

/* cells */
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

/* .attendance-table tbody tr:hover td {
  background: rgba(var(--v-theme-primary), 0.03) !important;
  z-index: 0;
} */

/* center checkbox inside cell */
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

/* Top-left corner cell */
.attendance-table thead th.sticky-header {
  z-index: 0;
}
</style>
