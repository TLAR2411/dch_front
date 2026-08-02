<script setup>
import { api } from "@/utils/api";
import { onMounted, ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";
import { getEntityLabel } from "@/utils/reportLabels.js";
import FooterRepor from "@/views/global/components/footerRepor.vue";

const { t } = useI18n();
const partStore = usePartStore();
const reportPart = computed(() => partStore.system_part || "english");

function entityLabel(entity, fallback = "—") {
  return getEntityLabel(entity, reportPart.value, fallback);
}

function genderLabel(gender) {
  if (!gender) return "—";
  const useKhmerAbbr =
    reportPart.value === "khmer" || reportPart.value === "chinese";
  const isFemale = String(gender).toLowerCase().startsWith("f");
  if (useKhmerAbbr) return isFemale ? "ស" : "ប";
  return isFemale ? "F" : "M";
}

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

const printTitle = computed(() => {
  if (!formDay.value.start_date) return t("Attendance Report Daily");
  const date = new Date(formDay.value.start_date);
  if (Number.isNaN(date.getTime())) return t("Attendance Report Daily");
  const label = date.toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return t("Attendance Report for {date}", { date: label });
});

const printObj = computed(() => ({
  id: "printAreaDay",
  popTitle: printTitle.value,
}));

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

const statusProps = computed(() => ({
  present: { dot: "dot-present", icon: "tabler-check", label: t("Present") },
  late: { dot: "dot-late", icon: "tabler-clock", label: t("Late") },
  permission: {
    dot: "dot-permission",
    icon: "tabler-file-check",
    label: t("Ask Permission"),
  },
  absent: { dot: "dot-absent", icon: "tabler-x", label: t("Absent") },
}));

function getStatus(att) {
  const status = attStatus(att);
  return status
    ? statusProps.value[status]
    : { dot: "dot-none", icon: "tabler-minus", label: "—" };
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
  <VRow class="mt-1 report-no-print" align="center">
    <VCol cols="9" md="3">
      <AppDateTimePicker
        v-model="formDay.start_date"
        :placeholder="$t('Select date')"
      />
    </VCol>
    <VCol cols="3" md="5" class="d-flex gap-2">
      <VBtn
        color="primary"
        @click="getData"
        variant="tonal"
        
        :loading="loading"
        :disabled="loading"
        prepend-icon="tabler-search"
        >{{ $t("Search") }}</VBtn
      >
      <VBtn
        variant="tonal"
 
        :disabled="!hasData || loading || !attData.length"
        prepend-icon="tabler-printer"
        v-print="printObj"
      >
        {{ $t("Print") }}
      </VBtn>
    </VCol>
    <!-- <VCol cols="12" md="9" class="d-flex justify-end">
        <VBtn variant="tonal" size="small" prepend-icon="tabler-download">
          Export
        </VBtn>
      </VCol> -->
  </VRow>

  <div v-if="loading || hasData">
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
            <div class="stat-lbl">{{ $t("Total students") }}</div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon neutral-icon">
              <VIcon size="18" color="medium-emphasis">tabler-check</VIcon>
            </div>
            <div class="stat-val">{{ stats.present }}</div>
            <div class="stat-lbl">{{ $t("Present") }}</div>
            <div class="stat-sub">{{ $t("includes {n} late", { n: stats.late }) }}</div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon neutral-icon">
              <VIcon size="18" color="medium-emphasis">tabler-clock</VIcon>
            </div>
            <div class="stat-val">{{ stats.late }}</div>
            <div class="stat-lbl">{{ $t("Late") }}</div>
            <div class="stat-sub">
              {{
                stats.total
                  ? Math.round(
                      (stats.late / (subjects.length * stats.total || 1)) * 100,
                    )
                  : 0
              }}{{ $t("% of subjects") }}
            </div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon neutral-icon">
              <VIcon size="18" color="medium-emphasis">tabler-file-check</VIcon>
            </div>
            <div class="stat-val">{{ stats.permission }}</div>
            <div class="stat-lbl">{{ $t("Ask Permission") }}</div>
            <div class="stat-sub">
              {{
                stats.total
                  ? Math.round(
                      (stats.permission /
                        (subjects.length * stats.total || 1)) *
                        100,
                    )
                  : 0
              }}{{ $t("% of subjects") }}
            </div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon neutral-icon">
              <VIcon size="18" color="medium-emphasis">tabler-x</VIcon>
            </div>
            <div class="stat-val">{{ stats.absent }}</div>
            <div class="stat-lbl">{{ $t("Absent") }}</div>
            <div class="stat-sub">
              {{
                stats.total
                  ? Math.round(
                      (stats.absent / (subjects.length * stats.total || 1)) *
                        100,
                    )
                  : 0
              }}{{ $t("% of subjects") }}
            </div>
          </div>
        </VCol>

        <VCol cols="6" sm="4" md="2">
          <div class="stat-card">
            <div class="stat-icon neutral-icon">
              <VIcon size="18" color="medium-emphasis">tabler-chart-bar</VIcon>
            </div>
            <div class="stat-val">{{ stats.avgPct }}%</div>
            <div class="stat-lbl">{{ $t("Avg. attendance") }}</div>
          </div>
        </VCol>
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
        <div v-else id="printAreaDay" class="border rounded-lg pa-3">
          <div class="text-center mb-3 d-none d-print-block">
            <div class="font-weight-medium">{{ printTitle }}</div>
          </div>
        <VTable
          fixed-header
          density="comfortable"
          class="report-table"
        >
          <thead>
            <tr>
              <th style="width: 24px" class="text-center">{{ $t("No") }}</th>
              <th style="min-width: 160px">{{ $t("Student") }}</th>
              <th style="width: 60px" class="text-center">{{ $t("Gender") }}</th>
              <th
                v-for="sub in subjects"
                :key="sub.subject_id"
                class="text-center"
                style="min-width: 110px"
              >
                <div class="subject-name">{{ entityLabel(sub) }}</div>
                <!-- <div class="subject-kh">{{ sub.name_kh }}</div> -->
              </th>
              <th class="text-center" style="width: 62px">{{ $t("Present") }}</th>
              <th class="text-center" style="width: 52px">{{ $t("Late") }}</th>
              <th class="text-center" style="width: 80px">{{ $t("Ask Permission") }}</th>
              <th class="text-center" style="width: 60px">{{ $t("Absent") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, i) in attData" :key="student.id">
              <td class="text-center ">{{ student.index ?? i + 1 }}</td>
              <td>
                {{ entityLabel(student) }}
               
              </td>
              <td class="text-center">
                {{ genderLabel(student.gender) }}
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
                    $t('No reason provided')
                  "
                  location="right"
                  max-width="200"
                  open-on-click
                  :open-on-hover="false"
                >
                  <template #activator="{ props: tooltipProps }">
                    <span
                      v-bind="tooltipProps"
                      class="status-badge"
                      style="cursor: pointer"
                    >
                      <span
                        class="status-dot"
                        :class="getStatus(getAtt(student, sub.subject_id)).dot"
                      />
                      <!-- <VIcon size="12" color="medium-emphasis">
                        {{ getStatus(getAtt(student, sub.subject_id)).icon }}
                      </VIcon> -->
                      {{ getStatus(getAtt(student, sub.subject_id)).label }}
                    </span>
                  </template>
                </VTooltip>

                <span
                  v-else
                  class="status-badge"
                >
                  <span
                    class="status-dot"
                    :class="getStatus(getAtt(student, sub.subject_id)).dot"
                  />
                  <!-- <VIcon size="12" color="medium-emphasis">
                    {{ getStatus(getAtt(student, sub.subject_id)).icon }}
                  </VIcon> -->
                  {{ getStatus(getAtt(student, sub.subject_id)).label }}
                </span>
              </td>
              <td class="text-center total-col">{{ student.present_total }}</td>
              <td class="text-center total-col">{{ student.late_total }}</td>
              <td class="text-center total-col">
                {{ student.ask_permission_total }}
              </td>
              <td class="text-center total-col">{{ student.absent_total }}</td>
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
        <FooterRepor editable />
        </div>
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
                <div class="avi">
                  {{ initials(entityLabel(student, student.name_en || "?")) }}
                </div>
                <div>
                  <div class="name-main">{{ entityLabel(student) }}</div>
                </div>
              </div>
              <span class="gender-tag">
                {{ genderLabel(student.gender) }}
              </span>
            </div>

            <!-- subjects -->
            <div class="subject-rows">
              <div
                v-for="att in student.attendance"
                :key="att.subject_id"
                class="subject-row"
              >
                <div class="subject-row-name">
                  <div class="subject-name">{{ entityLabel(att) }}</div>
                </div>

                <VTooltip
                  v-if="attStatus(att) === 'permission'"
                  :text="att.reason || $t('No reason provided')"
                  location="right"
                  max-width="200"
                  open-on-click
                  :open-on-hover="false"
                >
                  <template #activator="{ props: tooltipProps }">
                    <span
                      v-bind="tooltipProps"
                      class="status-badge"
                      style="cursor: pointer"
                    >
                      <span class="status-dot" :class="getStatus(att).dot" />
                      <VIcon size="12" color="medium-emphasis">
                        {{ getStatus(att).icon }}
                      </VIcon>
                      {{ getStatus(att).label }}
                    </span>
                  </template>
                </VTooltip>

                <span v-else class="status-badge">
                  <span class="status-dot" :class="getStatus(att).dot" />
                  <VIcon size="12" color="medium-emphasis">
                    {{ getStatus(att).icon }}
                  </VIcon>
                  {{ getStatus(att).label }}
                </span>
              </div>
            </div>

            <!-- totals footer -->
            <div class="card-totals">
              <div class="ct">
                <VIcon size="13" color="medium-emphasis">tabler-check</VIcon>
                {{ student.present_total }} present
              </div>
              <div class="ct">
                <VIcon size="13" color="medium-emphasis">tabler-clock</VIcon>
                {{ student.late_total }} late
              </div>
              <div class="ct">
                <VIcon size="13" color="medium-emphasis">tabler-file-check</VIcon>
                {{ student.ask_permission_total }} permission
              </div>
              <div class="ct">
                <VIcon size="13" color="medium-emphasis">tabler-x</VIcon>
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

.stat-val {
  font-size: 22px;
  font-weight: 500;
  line-height: 1;
  color: rgb(var(--v-theme-on-surface));
}

.stat-lbl {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  margin-top: 3px;
}
.stat-sub {
  font-size: 11px;
  margin-top: 2px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  white-space: nowrap;
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-present {
  background: rgba(var(--v-theme-on-surface), 0.35);
}
.dot-late {
  background: rgba(var(--v-theme-on-surface), 0.5);
}
.dot-permission {
  background: rgba(var(--v-theme-on-surface), 0.45);
}
.dot-absent {
  background: rgb(var(--v-theme-error));
}
.dot-none {
  background: rgba(var(--v-theme-on-surface), 0.15);
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
.total-col {
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
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
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}
.gender-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
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
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media print {
  .report-no-print {
    display: none !important;
  }

  .d-print-block {
    display: block !important;
  }

  #printAreaDay {
    border: none !important;
    padding: 0 !important;
  }
}
</style>
