<script setup>
import { api } from "@/utils/api";
import { onMounted, ref, watch, computed } from "vue";

const props = defineProps({
  class_id: {
    type: Number,
  },
});

const loading = ref(false);

const hasData = ref(false);

const attData = ref([]);

const formDay = ref({
  type: "date",
  class_id: props.class_id,
  start_date: null,
});

const subjects = computed(() => {
  if (!attData.value.length) return [];
  return attData.value[0].attendance || [];
});

const stats = computed(() => {
  const total = attData.value.length;
  const present = attData.value.reduce(
    (s, st) => s + (st.present_total ?? 0),
    0,
  );
  const late = attData.value.reduce((s, st) => s + (st.late_total ?? 0), 0);
  const permission = attData.value.reduce(
    (s, st) => s + (st.ask_permission_total ?? 0),
    0,
  );
  const absent = attData.value.reduce((s, st) => s + (st.absent_total ?? 0), 0);
  const totalSubjects = subjects.value.length * total;
  const avgPct =
    totalSubjects > 0 ? Math.round((present / totalSubjects) * 100) : 0;
  return { total, present, late, permission, absent, avgPct };
});

function getAtt(student, subjectId) {
  return student.attendance?.find((a) => a.subject_id === subjectId) || null;
}

function attStatus(att) {
  if (!att) return null;
  if (att.ask_permission) return "permission";
  if (att.absent) return "absent";
  if (att.late) return "late";
  if (att.present) return "present";
  return null;
}

const chipProps = {
  present: { color: "success", icon: "tabler-check", label: "Present" },
  late: { color: "warning", icon: "tabler-clock", label: "Late" },
  permission: { color: "info", icon: "tabler-file-check", label: "Permission" },
  absent: { color: "error", icon: "tabler-x", label: "Absent" },
};

function getChip(att) {
  const status = attStatus(att);
  return status
    ? chipProps[status]
    : { color: "default", icon: "tabler-minus", label: "—" };
}

const avatarColors = [
  { bg: "#E6F1FB", text: "#0C447C" },
  { bg: "#EAF3DE", text: "#27500A" },
  { bg: "#FAEEDA", text: "#633806" },
  { bg: "#FBEAF0", text: "#72243E" },
  { bg: "#E1F5EE", text: "#085041" },
];

function avatarColor(id) {
  return avatarColors[id % avatarColors.length];
}

function initials(name) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const getData = async () => {
  hasData.value = true;
  loading.value = true;
  try {
    const res = await api.post(
      "students-classes-attendance-report",
      formDay.value,
    );
    attData.value = res.data.data || [];
  } catch (error) {
    console.log(error);
  } finally {
    loading.value = false;
  }
};

watch(
  [() => props.class_id, () => formDay.value.start_date],
  ([classId, startDate]) => {
    if (!classId || !startDate) return;
    formDay.value.class_id = classId;
    getData();
  },
);

onMounted(() => {
  formDay.value.start_date = new Date();
});
</script>

<template>
  <!-- ── filter ─────────────────────────────────────────────────────── -->
  <VRow class="mt-1" align="center">
    <VCol cols="9" md="3">
      <AppDateTimePicker
        v-model="formDay.start_date"
        placeholder="Select date"
      />
    </VCol>
    <VCol cols="3" md="3">
      <VBtn
        color="success"
        @click="getData"
        variant="tonal"
        density="comfortable"
        :loading="loading"
        :disabled="loading"
        prepend-icon="tabler-search"
        >Search</VBtn
      >
    </VCol>
    <!-- <VCol cols="12" md="9" class="d-flex justify-end">
        <VBtn variant="tonal" size="small" prepend-icon="tabler-download">
          Export
        </VBtn>
      </VCol> -->
  </VRow>

  <div v-if="hasData">
    <VRow class="mt-2 d-none d-md-flex">
      <template v-if="loading">
        <VCol v-for="n in 6" :key="n" cols="6" sm="4" md="2">
          <VSkeletonLoader type="image" class="border rounded-lg" />
        </VCol>
      </template>
      <template v-else>
        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon neutral-icon">
              <VIcon size="18" color="medium-emphasis">tabler-users</VIcon>
            </div>
            <div class="stat-val">{{ stats.total }}</div>
            <div class="stat-lbl">Total students</div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon success-icon">
              <VIcon size="18" color="success">tabler-check</VIcon>
            </div>
            <div class="stat-val">{{ stats.present }}</div>
            <div class="stat-lbl">Present</div>
            <div class="stat-sub">includes {{ stats.late }} late</div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon warning-icon">
              <VIcon size="18" color="warning">tabler-clock</VIcon>
            </div>
            <div class="stat-val">{{ stats.late }}</div>
            <div class="stat-lbl">Late</div>
            <div class="stat-sub">
              {{
                stats.total
                  ? Math.round(
                      (stats.late / (subjects.length * stats.total || 1)) * 100,
                    )
                  : 0
              }}% of subjects
            </div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon info-icon">
              <VIcon size="18" color="info">tabler-file-check</VIcon>
            </div>
            <div class="stat-val">{{ stats.permission }}</div>
            <div class="stat-lbl">Permission</div>
            <div class="stat-sub">
              {{
                stats.total
                  ? Math.round(
                      (stats.permission /
                        (subjects.length * stats.total || 1)) *
                        100,
                    )
                  : 0
              }}% of subjects
            </div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon error-icon">
              <VIcon size="18" color="error">tabler-x</VIcon>
            </div>
            <div class="stat-val">{{ stats.absent }}</div>
            <div class="stat-lbl">Absent</div>
            <div class="stat-sub">
              {{
                stats.total
                  ? Math.round(
                      (stats.absent / (subjects.length * stats.total || 1)) *
                        100,
                    )
                  : 0
              }}% of subjects
            </div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon neutral-icon">
              <VIcon size="18" color="medium-emphasis">tabler-chart-bar</VIcon>
            </div>
            <div class="stat-val">{{ stats.avgPct }}%</div>
            <div class="stat-lbl">Avg. attendance</div>
          </div> </VCol
        >s
      </template>
    </VRow>

    <!-- ── table (md and up)  -->
    <VRow class="d-none d-md-flex">
      <VCol cols="12">
        <div v-if="loading" class="border rounded-lg pa-3">
          <VSkeletonLoader type="table-heading" />
          <VSkeletonLoader
            v-for="n in 5"
            :key="n"
            type="table-row"
            class="mt-1"
          />
        </div>
        <VTable
          v-else
          fixed-header
          density="comfortable"
          class="border rounded-lg report-table"
        >
          <thead>
            <tr>
              <th style="width: 44px" class="text-center">N°</th>
              <th style="min-width: 160px">Student</th>
              <th style="width: 60px" class="text-center">Gender</th>
              <th
                v-for="sub in subjects"
                :key="sub.subject_id"
                class="text-center"
                style="min-width: 110px"
              >
                <div class="subject-name">{{ sub.name_en }}</div>
                <!-- <div class="subject-kh">{{ sub.name_kh }}</div> -->
              </th>
              <th class="text-center" style="width: 62px">Present</th>
              <th class="text-center" style="width: 52px">Late</th>
              <th class="text-center" style="width: 80px">Permission</th>
              <th class="text-center" style="width: 60px">Absent</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, i) in attData" :key="student.id">
              <td class="text-center no-col">{{ student.index ?? i + 1 }}</td>
              <td>
                <div class="name-main">{{ student.name_en }}</div>
                <div class="name-sub">{{ student.name_kh }}</div>
              </td>
              <td class="text-center">
                {{ student.gender === "female" ? "F" : "M" }}
              </td>
              <td
                v-for="sub in subjects"
                :key="sub.subject_id"
                class="text-center"
              >
                <VTooltip
                  v-if="
                    attStatus(getAtt(student, sub.subject_id)) === 'permission'
                  "
                  :text="
                    getAtt(student, sub.subject_id)?.reason ||
                    'No reason provided'
                  "
                  location="right"
                  max-width="200"
                  open-on-click
                  :open-on-hover="false"
                >
                  <template #activator="{ props: tooltipProps }">
                    <VChip
                      v-bind="tooltipProps"
                      size="x-small"
                      :color="getChip(getAtt(student, sub.subject_id)).color"
                      variant="tonal"
                      :prepend-icon="
                        getChip(getAtt(student, sub.subject_id)).icon
                      "
                      style="cursor: pointer"
                    >
                      {{ getChip(getAtt(student, sub.subject_id)).label }}
                    </VChip>
                  </template>
                </VTooltip>

                <VChip
                  v-else
                  size="x-small"
                  :color="getChip(getAtt(student, sub.subject_id)).color"
                  variant="tonal"
                  :prepend-icon="getChip(getAtt(student, sub.subject_id)).icon"
                >
                  {{ getChip(getAtt(student, sub.subject_id)).label }}
                </VChip>
              </td>
              <td class="text-center total-p">{{ student.present_total }}</td>
              <td class="text-center total-l">{{ student.late_total }}</td>
              <td class="text-center total-x">
                {{ student.ask_permission_total }}
              </td>
              <td class="text-center total-a">{{ student.absent_total }}</td>
            </tr>

            <tr v-if="!attData.length">
              <td :colspan="4 + subjects.length" class="text-center py-10">
                <VIcon size="40" style="opacity: 0.2">tabler-report</VIcon>
                <div class="mt-2" style="opacity: 0.4; font-size: 13px">
                  Select a date to load the report.
                </div>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCol>
    </VRow>

    <!-- student cards (small screen only) -->
    <VRow class="d-flex d-md-none">
      <template v-if="loading">
        <VCol v-for="n in 4" :key="n" cols="12" sm="6">
          <VSkeletonLoader
            type="list-item-avatar-two-line, divider, list-item-three-line, actions"
            class="border rounded-lg"
          />
        </VCol>
      </template>
      <template v-else>
        <VCol
          v-for="(student, i) in attData"
          :key="student.id"
          cols="12"
          sm="6"
        >
          <div class="student-card">
            <!-- header -->
            <div class="student-card-head">
              <div class="d-flex align-center gap-2">
                <div
                  class="avi"
                  :style="`background:${avatarColor(student.id).bg};color:${avatarColor(student.id).text}`"
                >
                  {{ initials(student.name_en) }}
                </div>
                <div>
                  <div class="name-main">{{ student.name_en }}</div>
                  <div class="name-sub">{{ student.name_kh }}</div>
                </div>
              </div>
              <VChip
                size="x-small"
                :color="student.gender === 'female' ? 'pink' : 'info'"
                variant="tonal"
              >
                {{ student.gender === "female" ? "F" : "M" }}
              </VChip>
            </div>

            <!-- subjects -->
            <div class="subject-rows">
              <div
                v-for="att in student.attendance"
                :key="att.subject_id"
                class="subject-row"
              >
                <div class="subject-row-name">
                  <div class="subject-name">{{ att.name_en }}</div>
                  <div class="subject-kh">{{ att.name_kh }}</div>
                </div>

                <VTooltip
                  v-if="attStatus(att) === 'permission'"
                  :text="att.reason || 'No reason provided'"
                  location="right"
                  max-width="200"
                  open-on-click
                  :open-on-hover="false"
                >
                  <template #activator="{ props: tooltipProps }">
                    <VChip
                      v-bind="tooltipProps"
                      size="x-small"
                      :color="getChip(att).color"
                      variant="tonal"
                      :prepend-icon="getChip(att).icon"
                      style="cursor: pointer"
                    >
                      {{ getChip(att).label }}
                    </VChip>
                  </template>
                </VTooltip>

                <VChip
                  v-else
                  size="x-small"
                  :color="getChip(att).color"
                  variant="tonal"
                  :prepend-icon="getChip(att).icon"
                >
                  {{ getChip(att).label }}
                </VChip>
              </div>
            </div>

            <!-- totals footer -->
            <div class="card-totals">
              <div class="ct success-text">
                <VIcon size="13" color="success">tabler-check</VIcon>
                {{ student.present_total }} present
              </div>
              <div class="ct warning-text">
                <VIcon size="13" color="warning">tabler-clock</VIcon>
                {{ student.late_total }} late
              </div>
              <div class="ct info-text">
                <VIcon size="13" color="info">tabler-file-check</VIcon>
                {{ student.ask_permission_total }} permission
              </div>
              <div class="ct error-text">
                <VIcon size="13" color="error">tabler-x</VIcon>
                {{ student.absent_total }} absent
              </div>
            </div>
          </div>
        </VCol>

        <VCol v-if="!attData.length" cols="12" class="text-center py-10">
          <VIcon size="40" style="opacity: 0.2">tabler-report</VIcon>
          <div class="mt-2" style="opacity: 0.4; font-size: 13px">
            Select a date to load the report.
          </div>
        </VCol>
      </template>
    </VRow>
  </div>
</template>

<style scoped>
/* stat cards */
.stat-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 12px 14px;
  background: rgb(var(--v-theme-surface));
  height: 100%;
}
.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.neutral-icon {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.success-icon {
  background: rgba(var(--v-theme-success), 0.12);
}
.warning-icon {
  background: rgba(var(--v-theme-warning), 0.12);
}
.info-icon {
  background: rgba(var(--v-theme-info), 0.12);
}
.error-icon {
  background: rgba(var(--v-theme-error), 0.12);
}

.stat-val {
  font-size: 22px;
  font-weight: 500;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}
.success-val {
  color: rgb(var(--v-theme-success));
}
.warning-val {
  color: rgb(var(--v-theme-warning));
}
.info-val {
  color: rgb(var(--v-theme-info));
}
.error-val {
  color: rgb(var(--v-theme-error));
}

.stat-lbl {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin-top: 3px;
}
.stat-sub {
  font-size: 11px;
  margin-top: 2px;
  opacity: 0.7;
}
.success-sub {
  color: rgb(var(--v-theme-success));
}
.warning-sub {
  color: rgb(var(--v-theme-warning));
}
.info-sub {
  color: rgb(var(--v-theme-info));
}
.error-sub {
  color: rgb(var(--v-theme-error));
}

/* table */
.subject-name {
  font-size: 12px;
  font-weight: 500;
}
.subject-kh {
  font-size: 10px;
  opacity: 0.5;
  margin-top: 1px;
}
.name-main {
  font-weight: 500;
  font-size: 13px;
}
.name-sub {
  font-size: 11px;
  opacity: 0.5;
  margin-top: 1px;
}
.no-col {
  font-size: 12px;
  opacity: 0.4;
}
.total-p {
  color: rgb(var(--v-theme-success));
  font-weight: 500;
}
.total-l {
  color: rgb(var(--v-theme-warning));
  font-weight: 500;
}
.total-x {
  color: rgb(var(--v-theme-info));
  font-weight: 500;
}
.total-a {
  color: rgb(var(--v-theme-error));
  font-weight: 500;
}

.report-table tbody tr:hover td {
  background: rgba(var(--v-theme-on-surface), 0.04) !important;
}

/* student cards */
.student-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 12px 14px;
  background: rgb(var(--v-theme-surface));
}
.student-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  gap: 8px;
}
.avi {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}
.subject-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.subject-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
}
.subject-row-name {
  min-width: 0;
}
.card-totals {
  display: flex;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  flex-wrap: wrap;
}
.ct {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
}
.success-text {
  color: rgb(var(--v-theme-success)) !important;
}
.warning-text {
  color: rgb(var(--v-theme-warning)) !important;
}
.info-text {
  color: rgb(var(--v-theme-info)) !important;
}
.error-text {
  color: rgb(var(--v-theme-error)) !important;
}
</style>
