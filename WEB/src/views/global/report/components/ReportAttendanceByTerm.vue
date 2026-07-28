<script setup>
import { api } from "@/utils/api";
import { listClassRoster } from "@/services/api/studentClasses";
import { onMounted, ref, watch, computed } from "vue";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import { listGradeSubjectAssignments } from "@/services/api/gradeSubject";
import { listSubjectParentMap } from "@/services/api/subjects";
import { listAttendanceRange } from "@/services/api/attendance";
import { getClasses, getGrades, getCurriculums } from "@/services/dataService.js";
import { useYearStore } from "@/stores/yearStore.js";
import { usePartStore } from "@/stores/partStore.js";
import { app } from "@/utils/app";
import ReportAttendanceLegend from "./ReportAttendanceLegend.vue";
import dchLogoHeader from "../../../../../public/logo/dchlogoheader.png";
import FooterRepor from "@/views/global/components/footerRepor.vue";
const props = defineProps({
  class_id: {
    type: Number,
  },
});

const yearStore = useYearStore();
const partStore = usePartStore();

const loading = ref(false);
const hasData = ref(false);
const attData = ref([]);
const classes = ref([]);
const grades = ref([]);
const curriculums = ref([]);
const subjectOptions = ref([]);
const subjectLoading = ref(false);
const termOptions = ref([]);
const termLoading = ref(false);
const classGradeId = ref(null);
const isInitializing = ref(false);

const form = ref({
  class_id: props.class_id,
  term_id: null,
});

const yearId = computed(() => yearStore.year_id);

const selectedClass = computed(() =>
  classes.value.find(
    (item) => Number(item.id) === Number(props.class_id),
  ) ?? null,
);

const selectedGrade = computed(() => {
  const gradeId = classGradeId.value;
  if (!gradeId) return null;
  return grades.value.find((g) => Number(g.id) === Number(gradeId)) ?? null;
});

const selectedTerm = computed(() =>
  termOptions.value.find((t) => t.id === form.value.term_id) ?? null,
);

const programName = computed(() => {
  const cur = curriculums.value.find((c) => c.id === partStore.cur_id);
  return cur?.name_en || cur?.name_kh || "—";
});

const classLabel = computed(() => {
  const cls = selectedClass.value;
  if (!cls) return "—";
  const gradeName = selectedGrade.value?.name_en || "";
  const symbol = cls.symbol ? ` ${cls.symbol}` : "";
  return `${gradeName}${symbol}`.trim() || cls.name_en || "—";
});

function formatDisplayDate(value) {
  if (!value) return "";
  const date = new Date(String(value).slice(0, 10));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

const termRangeLabel = computed(() => {
  const term = selectedTerm.value;
  if (!term) return "";
  const start = formatDisplayDate(term.start_date);
  const end = formatDisplayDate(term.end_date);
  return `${start} - ${end}`;
});

const reportTitle = computed(() => {
  const term = selectedTerm.value;
  if (!term) return "Attendance Report by Term";
  const name = term.name_en || term.name_kh || "Term";
  return termRangeLabel.value
    ? `Attendance Report for ${name} (${termRangeLabel.value})`
    : `Attendance Report for ${name}`;
});

const printObj = computed(() => ({
  id: "printAreaTerm",
  popTitle: reportTitle.value,
}));

const reportSubjects = computed(() => subjectOptions.value);

const summarySubjectTotals = computed(() => {
  const totals = {};

  for (const sub of reportSubjects.value) {
    totals[sub.id] = { absent: 0, permission: 0, late: 0, present: 0 };
  }

  for (const student of attData.value) {
    for (const sub of reportSubjects.value) {
      const entry = student._bySubject?.[sub.id];
      if (!entry) continue;
      totals[sub.id].absent += entry.absent;
      totals[sub.id].permission += entry.permission;
      totals[sub.id].late += entry.late;
      totals[sub.id].present += entry.present;
    }
  }

  return totals;
});

const summaryTableColspan = computed(
  () => 2 + reportSubjects.value.length * 4,
);

const canSearch = computed(() => Boolean(props.class_id && form.value.term_id));

function termSelectLabel(term) {
  const name = term.name_en || term.name_kh || "Term";
  const start = formatDisplayDate(term.start_date);
  const end = formatDisplayDate(term.end_date);
  return `${name} (${start} - ${end})`;
}

function resolveCurrentTermId(terms) {
  if (!terms.length) return null;
  const today = normalizeDate(new Date().toISOString());
  const current = terms.find((term) => {
    const start = normalizeDate(term.start_date);
    const end = normalizeDate(term.end_date);
    return start && end && today >= start && today <= end;
  });
  return current?.id ?? terms[0].id;
}

function buildSubjectOptions(assignments) {
  return assignments
    .filter((row) => row.subject && !row.subject.parent_id)
    .map((row) => ({
      id: row.subject_id,
      name_en: row.subject.name_en || "",
      name_kh: row.subject.name_kh || "",
    }))
    .sort((a, b) => a.name_en.localeCompare(b.name_en));
}

async function resolveClassGradeId() {
  classGradeId.value = null;
  if (!props.class_id) return null;

  const cls = selectedClass.value;
  let gradeId = cls?.grade_id ?? cls?.grade?.id ?? null;

  if (!gradeId) {
    try {
      const res = await api.post("class-detail", {
        class_id: props.class_id,
      });
      const detail = res.data?.data;
      gradeId = detail?.grade_id ?? detail?.grade?.id ?? null;
    } catch (error) {
      console.error("Failed to resolve class grade:", error);
    }
  }

  classGradeId.value = gradeId;
  return gradeId;
}

async function fetchGradeSubjects() {
  subjectLoading.value = true;

  try {
    const gradeId = await resolveClassGradeId();

    if (!yearId.value || !gradeId) {
      subjectOptions.value = [];
      return;
    }

    // Endpoint filters by year and grade; the subject arrives nested with
    // its parent_id, which is what buildSubjectOptions groups on.
    const { assignments: assignmentRows } = await listGradeSubjectAssignments({
      year_id: yearId.value,
      grade_id: gradeId,
    });


    subjectOptions.value = buildSubjectOptions(assignmentRows ?? []);
  } catch (error) {
    console.error(error);
    subjectOptions.value = [];
  } finally {
    subjectLoading.value = false;
  }
}

async function fetchTerms() {
  termLoading.value = true;

  try {
    const res = await api.post("academics-periods-list", {
      page: 1,
      limit: 999999,
      filter: [],
    });

    let terms = res.data?.data?.data ?? [];

    if (yearId.value) {
      terms = terms.filter(
        (term) => Number(term.year_id) === Number(yearId.value),
      );
    }

    termOptions.value = terms.sort(
      (a, b) => new Date(a.start_date) - new Date(b.start_date),
    );

    if (
      !form.value.term_id ||
      !termOptions.value.some((term) => term.id === form.value.term_id)
    ) {
      form.value.term_id = resolveCurrentTermId(termOptions.value);
    }
  } catch (error) {
    console.error(error);
    termOptions.value = [];
    form.value.term_id = null;
  } finally {
    termLoading.value = false;
  }
}

async function buildSubjectParentMap() {
  const data = await listSubjectParentMap();


  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.id, row.parent_id);
  }
  return map;
}

async function fetchClassStudents(classId) {
  // Was a direct student_classes query with a nested students embed.
  // listClassRoster reproduces that exact shape from the API.
  return await listClassRoster(classId);
}

async function fetchTermAttendance({ classId, startDate, endDate }) {
  return await listAttendanceRange({
    class_id: classId,
    from: startDate,
    to: endDate,
  });
}

function isTruthyFlag(value) {
  return value === true || value === 1 || value === "1";
}

function recordToStatus(record) {
  if (!record) return null;
  if (isTruthyFlag(record.ask_permission)) return { ask_permission: true };
  if (!isTruthyFlag(record.present)) return { absent: true };
  if (isTruthyFlag(record.late)) return { late: true };
  if (isTruthyFlag(record.present)) return { present: true };
  return null;
}

function emptyTotals() {
  return { absent: 0, permission: 0, late: 0, present: 0 };
}

function resolveReportSubjectId(subjectId, subjectParentMap) {
  return subjectParentMap?.get(subjectId) ?? subjectId;
}

function countStatusCode(code, totals) {
  if (code === "A") totals.absent += 1;
  else if (code === "P") totals.permission += 1;
  else if (code === "L") totals.late += 1;
  else if (code === "✓") totals.present += 1;
}

function statusToCode(entry) {
  if (!entry) return "";

  if (typeof entry === "string") {
    const map = {
      a: "A",
      absent: "A",
      p: "P",
      permission: "P",
      pre: "P",
      ask_permission: "P",
      l: "L",
      late: "L",
      present: "✓",
      check: "✓",
      "✓": "✓",
    };
    return map[entry.toLowerCase()] ?? entry;
  }

  if (isTruthyFlag(entry.ask_permission) || isTruthyFlag(entry.permission)) {
    return "P";
  }
  if (isTruthyFlag(entry.absent)) return "A";
  if (isTruthyFlag(entry.late)) return "L";
  if (isTruthyFlag(entry.present)) return "✓";

  if (entry.status) return statusToCode(entry.status);
  if (entry.code) return statusToCode(entry.code);
  if (entry.value) return statusToCode(entry.value);

  return "";
}

function buildStudentReportRows(
  students,
  attendanceRows,
  { subjectParentMap = null, reportSubjectIds = [] } = {},
) {
  const recordsByStudent = new Map();

  for (const row of attendanceRows) {
    if (!recordsByStudent.has(row.student_id)) {
      recordsByStudent.set(row.student_id, []);
    }
    recordsByStudent.get(row.student_id).push(row);
  }

  return students.map((entry, index) => {
    const records = recordsByStudent.get(entry.student_id) ?? [];
    const totals = emptyTotals();
    const bySubjectMap = {};

    for (const subjectId of reportSubjectIds) {
      bySubjectMap[subjectId] = emptyTotals();
    }

    for (const record of records) {
      const subjectId = resolveReportSubjectId(
        record.subject_id,
        subjectParentMap,
      );
      if (!bySubjectMap[subjectId]) continue;
      countStatusCode(
        statusToCode(recordToStatus(record)),
        bySubjectMap[subjectId],
      );
    }

    for (const subjectTotals of Object.values(bySubjectMap)) {
      totals.absent += subjectTotals.absent;
      totals.permission += subjectTotals.permission;
      totals.late += subjectTotals.late;
      totals.present += subjectTotals.present;
    }

    return {
      id: entry.student_id,
      index: entry.index ?? index + 1,
      name_en: entry.student?.name_en ?? "",
      name_kh: entry.student?.name_kh ?? "",
      gender: entry.student?.gender ?? "",
      _bySubject: bySubjectMap,
      absent_total: totals.absent,
      ask_permission_total: totals.permission,
      late_total: totals.late,
      present_total: totals.present,
    };
  });
}

function getStudentSubjectTotal(student, subjectId, field) {
  return student._bySubject?.[subjectId]?.[field] ?? 0;
}

function genderLabel(gender) {
  if (!gender) return "—";
  return String(gender).toLowerCase().startsWith("f") ? "F" : "M";
}

const getData = async () => {
  if (!canSearch.value) return;

  loading.value = true;
  hasData.value = true;

  try {
    await fetchReportData();
  } catch (error) {
    console.error(error);
    attData.value = [];
  } finally {
    loading.value = false;
  }
};

async function fetchReportData() {
  const term = selectedTerm.value;
  const startDate = normalizeDate(term?.start_date);
  const endDate = normalizeDate(term?.end_date);
  if (!startDate || !endDate) {
    attData.value = [];
    return;
  }

  if (!subjectOptions.value.length) {
    await fetchGradeSubjects();
  }

  const [students, subjectParentMap, attendanceRows] = await Promise.all([
    fetchClassStudents(props.class_id),
    buildSubjectParentMap(),
    fetchTermAttendance({
      classId: props.class_id,
      startDate,
      endDate,
    }),
  ]);

  attData.value = buildStudentReportRows(students, attendanceRows, {
    subjectParentMap,
    reportSubjectIds: subjectOptions.value.map((s) => s.id),
  });
}

async function loadReport() {
  if (!props.class_id || !yearId.value) {
    attData.value = [];
    hasData.value = false;
    loading.value = false;
    return;
  }

  loading.value = true;
  hasData.value = true;
  form.value.class_id = props.class_id;
  isInitializing.value = true;

  try {
    await Promise.all([fetchGradeSubjects(), fetchTerms()]);
    if (canSearch.value) {
      await fetchReportData();
    } else {
      attData.value = [];
    }
  } catch (error) {
    console.error(error);
    attData.value = [];
  } finally {
    isInitializing.value = false;
    loading.value = false;
  }
}

watch(
  () => props.class_id,
  async () => {
    form.value.term_id = null;
    await loadReport();
  },
);

watch(yearId, async () => {
  form.value.term_id = null;
  await loadReport();
});

watch(
  () => form.value.term_id,
  async () => {
    if (isInitializing.value || !canSearch.value) return;
    await getData();
  },
);

onMounted(async () => {
  if (props.class_id && yearId.value) {
    loading.value = true;
    hasData.value = true;
  }

  if (!yearStore.year_id) {
    const years = app()?.years ?? [];
    if (years.length) {
      yearStore.setYearId(years[years.length - 1].id);
    }
  }

  const [classRows, gradeRows, curriculumRows] = await Promise.all([
    getClasses(),
    getGrades(),
    getCurriculums(),
  ]);

  classes.value = classRows ?? [];
  grades.value = gradeRows ?? [];
  curriculums.value = curriculumRows ?? [];

  if (props.class_id) {
    await loadReport();
  }
});
</script>

<template>
  <VRow class="mt-1 report-no-print" align="center">
    <VCol cols="12" md="4">
      <AppSelect
        v-model="form.term_id"
        :items="termOptions"
        item-title="name_en"
        item-value="id"
        placeholder="Select term"
        autocomplete="off"
        :loading="termLoading"
        :disabled="termLoading || !props.class_id"
      >
        <template #item="{ props: itemProps, item }">
          <VListItem v-bind="itemProps" :title="termSelectLabel(item.raw)" />
        </template>
        <template #selection="{ item }">
          {{ termSelectLabel(item.raw) }}
        </template>
      </AppSelect>
    </VCol>

    <VCol cols="12" md="4" class="d-flex gap-2">
      <VBtn
        color="primary"
        variant="tonal"
        :loading="loading"
        :disabled="loading || !canSearch"
        prepend-icon="tabler-search"
        @click="getData"
      >
        Search
      </VBtn>
      <VBtn
        variant="tonal"
        :disabled="!hasData || loading || !attData.length"
        prepend-icon="tabler-printer"
        v-print="printObj"
      >
        Print
      </VBtn>
    </VCol>
  </VRow>

  <div v-if="loading || hasData" class="mt-4">
    <div v-if="loading" class="border rounded-lg pa-3">
      <VSkeletonLoader type="table-heading" />
      <VSkeletonLoader
        v-for="n in 6"
        :key="n"
        type="table-row"
        class="mt-1"
      />
    </div>

    <div
      v-else
      id="printAreaTerm"
      class="attendance-report-sheet border rounded-lg pa-4"
    >

    <div class="w-100 mx-auto d-flex flex-column align-center justify-center">
        <v-img  :src="dchLogoHeader" alt="Dewey Childcare House" class="w-100 report-logo" />

        <div class="report-title mt-5">{{ reportTitle }}</div>
      </div>
      <!-- <div class="report-header text-center mb-4">
        <img :src="MianLogo" alt="Dewey Childcare House" class="report-logo" />
        <div class="report-school-kh">ដេវី ឆាល់ឌែរ ហោស៍ DEWEY CHILDCARE HOUSE</div>
        <div class="report-school-sub">
          មត្តេយ្យសិក្សាអន្តរជាតិ ៣ ភាសា (អង់គ្លេស-ខ្មែរ-ចិន)
        </div>
        <div class="report-school-sub">International Trilingual Kindergarten</div>
        <div class="report-title mt-2">{{ reportTitle }}</div>
      </div> -->

      <div class="report-meta d-flex justify-space-between mb-3">
        <div>
          <div><span class="meta-label">class:</span> {{ classLabel }}</div>
          <div v-if="selectedTerm">
            <span class="meta-label">term:</span>
            {{ selectedTerm.name_en || selectedTerm.name_kh || "—" }}
          </div>
          <div v-if="termRangeLabel">
            <span class="meta-label">period:</span>
            {{ termRangeLabel }}
          </div>
        </div>
        <div class="text-end">
          <div><span class="meta-label">program:</span> {{ programName }}</div>
        </div>
      </div>

      

      <div class="report-table-wrap">
        <table class="report-grid report-grid-summary">
          <thead>
            <tr>
              <th rowspan="2" style="width: 200px;">Student</th>
              <th style="width: 34px;" rowspan="2" class="col-gender">
                <span class="vertical-label">Gender</span>
              </th>
              <th
                v-for="sub in reportSubjects"
                :key="`sub-${sub.id}`"
                colspan="4"
                class="col-subject-group"
              >
                {{ sub.name_en }}
              </th>
            </tr>
            <tr>
              <template v-for="sub in reportSubjects" :key="`sub-cols-${sub.id}`">
                <th class="col-total">A</th>
                <th class="col-total">P</th>
                <th class="col-total">L</th>
                <th class="col-total">✓</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, i) in attData" :key="student.id ?? i">
              <td class="col-student">
                <div class="name-main">{{ student.name_en }}</div>
              </td>
              <td class="text-center">{{ genderLabel(student.gender) }}</td>
              <template v-for="sub in reportSubjects" :key="`${student.id}-${sub.id}`">
                <td class="text-center">
                  {{ getStudentSubjectTotal(student, sub.id, "absent") }}
                </td>
                <td class="text-center">
                  {{ getStudentSubjectTotal(student, sub.id, "permission") }}
                </td>
                <td class="text-center">
                  {{ getStudentSubjectTotal(student, sub.id, "late") }}
                </td>
                <td class="text-center">
                  {{ getStudentSubjectTotal(student, sub.id, "present") }}
                </td>
              </template>
            </tr>
            <tr v-if="attData.length && reportSubjects.length" class="total-row">
              <td colspan="2" class="text-end font-weight-medium">Total</td>
              <template v-for="sub in reportSubjects" :key="`total-${sub.id}`">
                <td class="text-center">
                  {{ summarySubjectTotals[sub.id]?.absent ?? 0 }}
                </td>
                <td class="text-center">
                  {{ summarySubjectTotals[sub.id]?.permission ?? 0 }}
                </td>
                <td class="text-center">
                  {{ summarySubjectTotals[sub.id]?.late ?? 0 }}
                </td>
                <td class="text-center">
                  {{ summarySubjectTotals[sub.id]?.present ?? 0 }}
                </td>
              </template>
            </tr>
            <tr v-if="!attData.length">
              <td :colspan="summaryTableColspan" class="text-center py-8 empty-cell">
                No attendance recorded for this term yet.
              </td>
            </tr>
            <tr v-else-if="!reportSubjects.length">
              <td :colspan="summaryTableColspan" class="text-center py-8 empty-cell">
                No subjects found for this class.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-2">
        <ReportAttendanceLegend />
      </div>
      <FooterRepor editable />
    </div>
  </div>
</template>

<style scoped>
.attendance-report-sheet {
  background: rgb(var(--v-theme-surface));
  overflow-x: auto;
}

.report-logo {
  height: 100px;
  width: 200px;
  object-fit: cover;
}


.report-school-kh {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
  margin-top: 6px;
}

.report-school-sub {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.report-title {
  font-size: 14px;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.meta-label {
  font-weight: 500;
  margin-right: 4px;
}

.report-table-wrap {
  overflow-x: auto;
}

.report-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}

.report-grid th,
.report-grid td {
  border: 1px solid rgba(var(--v-border-color), 0.35);
  padding: 6px 8px;
  vertical-align: middle;
  color: black;
}

.report-grid thead th {
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-weight: 600;
  text-align: center;
}

.vertical-label {
  display: inline-block;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  white-space: nowrap;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2px;
  line-height: 1;
}

.col-student {
  min-width: 140px;
  text-align: left;
  width: 140px;
}

.col-gender {
  width: 52px;
  text-align: center;
}

.col-total {
  min-width: 28px;
  width: 28px;
  text-align: center;
}

.report-grid-summary .col-total {
  min-width: 56px;
  width: auto;
  white-space: nowrap;
}

.col-subject-group {
  text-align: center;
  font-weight: 600;
}

.total-row td {
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-weight: 600;
}

.name-main {
  font-weight: 500;
  font-size: 12px;
}

.empty-cell {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

@media print {
  .report-no-print {
    display: none !important;
  }

  .attendance-report-sheet {
    border: none !important;
    padding: 0 !important;
  }

  .report-grid th,
  .report-grid td {
    border-color: #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .total-row td {
    background: #f3f3f3 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
