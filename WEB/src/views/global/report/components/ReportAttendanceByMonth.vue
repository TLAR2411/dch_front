<script setup>
import { api } from "@/utils/api";
import { onMounted, ref, watch, computed } from "vue";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect";
import "flatpickr/dist/plugins/monthSelect/style.css";
import MianLogo from "@images/logo/main-logo-1.svg?url";
import supabase from "@/utils/supabase.js";
import { getClasses, getGrades, getCurriculums } from "@/services/dataService.js";
import { useYearStore } from "@/stores/yearStore.js";
import { usePartStore } from "@/stores/partStore.js";
import { useSettingStore } from "@/stores/settingStore.js";
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
const settingStore = useSettingStore();

const loading = ref(false);
const hasData = ref(false);
const attData = ref([]);
const classes = ref([]);
const grades = ref([]);
const curriculums = ref([]);
const subjectOptions = ref([]);
const subjectLoading = ref(false);
const classGradeId = ref(null);
const reportType = ref("daily");
const holidayDates = ref(new Set());
/** JS weekday numbers (0=Sun…6=Sat) when subject has a class schedule; null = no filter */
const subjectScheduledDows = ref(null);

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABEL_ORDER = [1, 2, 3, 4, 5, 6, 0];

const monthPickerConfig = {
  altInput: false,
  dateFormat: "Y-m",
  locale: "en",
  plugins: [
    new monthSelectPlugin({
      shorthand: false,
      dateFormat: "Y-m",
      altFormat: "F Y",
    }),
  ],
};

const form = ref({
  type: "month",
  class_id: props.class_id,
  start_date: null,
  subject_id: null,
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

const selectedSubject = computed(() =>
  subjectOptions.value.find((s) => s.id === form.value.subject_id) ?? null,
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

const monthLabel = computed(() => {
  if (!form.value.start_date) return "";
  const [year, month] = form.value.start_date.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en", {
    month: "long",
    year: "numeric",
  });
});

const reportTitle = computed(() => {
  const base = reportType.value === "daily"
    ? "Attendance Report Daily"
    : "Attendance Report Monthly";
  return monthLabel.value ? `${base} for ${monthLabel.value}` : base;
});

const printObj = computed(() => ({
  id: "printArea",
  popTitle: reportTitle.value,
}));

const scheduleDaysLabel = computed(() => {
  const dows = subjectScheduledDows.value;
  if (!dows?.size) return "";
  return WEEKDAY_LABEL_ORDER.filter((d) => dows.has(d))
    .map((d) => WEEKDAY_SHORT[d])
    .join(", ");
});

const calendarDays = computed(() => {
  if (!form.value.start_date) return [];
  const [year, month] = form.value.start_date.split("-").map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  const scheduledDows = subjectScheduledDows.value;
  const days = [];

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    const iso = `${year}-${monthStr}-${String(day).padStart(2, "0")}`;
    const isHoliday = holidayDates.value.has(iso);
    const isWeekend = dow === 0 || dow === 6;
    const isUnscheduledSubjectDay =
      scheduledDows instanceof Set && !scheduledDows.has(dow);
    days.push({
      day,
      iso,
      weekday: WEEKDAY_SHORT[dow],
      isHoliday,
      isWeekend,
      isUnscheduledSubjectDay,
      isNonSchoolDay: isWeekend || isHoliday || isUnscheduledSubjectDay,
    });
  }

  return days;
});

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

const canSearch = computed(() => {
  if (!props.class_id || !form.value.start_date) return false;
  if (reportType.value === "daily" && !form.value.subject_id) return false;
  return true;
});

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
      form.value.subject_id = null;
      return;
    }

    const { data: assignmentRows, error } = await supabase
      .from("grade_subject")
      .select(`
        id,
        grade_id,
        subject_id,
        subject:subjects(id, name_en, name_kh, parent_id)
      `)
      .eq("year_id", yearId.value)
      .eq("grade_id", gradeId)
      .is("deleted_at", null)
      .eq("is_active", true);

    if (error) throw error;

    const assignments = assignmentRows ?? [];
    subjectOptions.value = buildSubjectOptions(assignments);

    if (
      form.value.subject_id &&
      !subjectOptions.value.some((s) => s.id === form.value.subject_id)
    ) {
      form.value.subject_id = null;
    }
  } catch (error) {
    console.error(error);
    subjectOptions.value = [];
    form.value.subject_id = null;
  } finally {
    subjectLoading.value = false;
  }
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

function mergeDayRecords(records = []) {
  if (!records.length) return null;
  if (records.some((r) => isTruthyFlag(r.ask_permission))) {
    return { ask_permission: true };
  }
  if (records.some((r) => !isTruthyFlag(r.present))) return { absent: true };
  if (records.some((r) => isTruthyFlag(r.late))) return { late: true };
  if (records.some((r) => isTruthyFlag(r.present))) return { present: true };
  return null;
}

function dayFromDate(date) {
  if (!date) return null;
  const match = String(date).match(/^\d{4}-\d{2}-(\d{2})/);
  return match ? Number(match[1]) : null;
}

function getMonthDateRange(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);
  const totalDays = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");

  return {
    startDate: `${year}-${monthStr}-01`,
    endDate: `${year}-${monthStr}-${String(totalDays).padStart(2, "0")}`,
    year,
  };
}

async function fetchMonthHolidays(monthValue) {
  const { startDate, endDate, year } = getMonthDateRange(monthValue);
  const dates = new Set();

  const { data: publicData, error: publicError } = await supabase
    .from("holiday")
    .select("date")
    .eq("is_public", true)
    .eq("year", String(year))
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("is_deleted", false);

  if (publicError) throw publicError;

  let eventQuery = supabase
    .from("holiday")
    .select("date")
    .eq("is_public", false)
    .gte("date", startDate)
    .lte("date", endDate)
    .eq("is_deleted", false);

  if (partStore.cur_id != null) {
    eventQuery = eventQuery.eq("cur_id", partStore.cur_id);
  }
  if (settingStore.branch_id != null) {
    eventQuery = eventQuery.eq("branch_id", settingStore.branch_id);
  }
  if (yearId.value != null) {
    eventQuery = eventQuery.eq("year_id", yearId.value);
  }

  const { data: eventData, error: eventError } = await eventQuery;
  if (eventError) throw eventError;

  for (const row of [...(publicData ?? []), ...(eventData ?? [])]) {
    if (row.date) dates.add(String(row.date).slice(0, 10));
  }

  holidayDates.value = dates;
}

async function resolveSubjectScope(subjectId) {
  const ids = [subjectId];
  const { data: children, error } = await supabase
    .from("subjects")
    .select("id")
    .eq("parent_id", subjectId)
    .is("deleted_at", null);

  if (error) throw error;

  for (const child of children ?? []) {
    ids.push(child.id);
  }

  return ids;
}

/**
 * Load weekday ids for this class + subject from schedules.
 * weekday.id matches JS Date.getDay() (0=Sun … 6=Sat), same as CheckAttendance.
 * Returns null when no schedule rows exist so we do not grey every weekday.
 */
async function fetchSubjectScheduledDows(classId, subjectIds) {
  if (!classId || !subjectIds?.length) {
    subjectScheduledDows.value = null;
    return null;
  }

  const { data, error } = await supabase
    .from("schedules")
    .select("day_id, subject_id")
    .eq("class_id", classId)
    .in("subject_id", subjectIds);

  if (error) throw error;

  const dows = new Set(
    (data ?? [])
      .map((row) => Number(row.day_id))
      .filter((id) => Number.isFinite(id) && id >= 0 && id <= 6),
  );

  subjectScheduledDows.value = dows.size ? dows : null;
  return subjectScheduledDows.value;
}

async function fetchClassStudents(classId) {
  const { data, error } = await supabase
    .from("student_classes")
    .select(`
      student_id,
      index,
      student:students(id, name_en, name_kh, gender)
    `)
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("index", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function fetchMonthAttendance({
  classId,
  subjectIds = null,
  startDate,
  endDate,
}) {
  let query = supabase
    .from("students_attendance")
    .select("student_id, date, subject_id, present, late, ask_permission")
    .eq("class_id", classId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (subjectIds?.length) {
    query = query.in("subject_id", subjectIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

function emptyTotals() {
  return { absent: 0, permission: 0, late: 0, present: 0 };
}

async function buildSubjectParentMap() {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, parent_id")
    .not("parent_id", "is", null)
    .is("deleted_at", null);

  if (error) throw error;

  const map = new Map();
  for (const row of data ?? []) {
    map.set(row.id, row.parent_id);
  }
  return map;
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

function buildStudentReportRows(
  students,
  attendanceRows,
  {
    dailyMode = false,
    bySubject = false,
    subjectParentMap = null,
    reportSubjectIds = [],
  } = {},
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
    const dailyMap = {};
    const bySubjectMap = {};

    if (bySubject) {
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
    } else if (dailyMode) {
      const recordsByDay = new Map();

      for (const record of records) {
        const day = dayFromDate(record.date);
        if (!day) continue;
        if (!recordsByDay.has(day)) recordsByDay.set(day, []);
        recordsByDay.get(day).push(record);
      }

      for (const [day, dayRecords] of recordsByDay) {
        const status = mergeDayRecords(dayRecords);
        dailyMap[day] = status;
        countStatusCode(statusToCode(status), totals);
      }
    } else {
      for (const record of records) {
        countStatusCode(statusToCode(recordToStatus(record)), totals);
      }
    }

    return {
      id: entry.student_id,
      index: entry.index ?? index + 1,
      name_en: entry.student?.name_en ?? "",
      name_kh: entry.student?.name_kh ?? "",
      gender: entry.student?.gender ?? "",
      _dailyMap: dailyMap,
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

function getDayStatus(student, day) {
  const entry = student._dailyMap?.[day] ?? student._dailyMap?.[String(day)];
  if (!entry) {
    return "";
  }
  return statusToCode(entry);
}

function isPresentMark(value) {
  return value === "✓";
}

function isCellOffDay(student, calDay) {
  if (getDayStatus(student, calDay.day)) return false;
  return calDay.isNonSchoolDay;
}

function genderLabel(gender) {
  if (!gender) return "—";
  return String(gender).toLowerCase().startsWith("f") ? "F" : "M";
}

const getData = async () => {
  if (!canSearch.value) return;

  hasData.value = true;
  loading.value = true;
  try {
    const { startDate, endDate } = getMonthDateRange(form.value.start_date);

    await fetchMonthHolidays(form.value.start_date);

    if (reportType.value === "summary" && !subjectOptions.value.length) {
      await fetchGradeSubjects();
    }

    const students = await fetchClassStudents(props.class_id);

    let subjectIds = null;
    let subjectParentMap = null;
    if (reportType.value === "daily") {
      subjectIds = await resolveSubjectScope(form.value.subject_id);
      await fetchSubjectScheduledDows(props.class_id, subjectIds);
    } else {
      subjectScheduledDows.value = null;
      subjectParentMap = await buildSubjectParentMap();
    }

    const attendanceRows = await fetchMonthAttendance({
      classId: props.class_id,
      subjectIds,
      startDate,
      endDate,
    });

    attData.value = buildStudentReportRows(students, attendanceRows, {
      dailyMode: reportType.value === "daily",
      bySubject: reportType.value === "summary",
      subjectParentMap,
      reportSubjectIds: subjectOptions.value.map((s) => s.id),
    });
  } catch (error) {
    console.error(error);
    attData.value = [];
    subjectScheduledDows.value = null;
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.class_id,
  async () => {
    form.value.class_id = props.class_id;
    form.value.subject_id = null;
    attData.value = [];
    hasData.value = false;
    subjectScheduledDows.value = null;
    await fetchGradeSubjects();
    if (canSearch.value) await getData();
  },
);

watch(yearId, async () => {
  form.value.subject_id = null;
  attData.value = [];
  hasData.value = false;
  subjectScheduledDows.value = null;
  await fetchGradeSubjects();
  if (canSearch.value) await getData();
});

watch(
  () => form.value.start_date,
  async () => {
    if (canSearch.value) await getData();
  },
);

watch(
  () => form.value.subject_id,
  async () => {
    if (reportType.value === "daily" && canSearch.value) await getData();
  },
);

watch(reportType, async () => {
  form.value.subject_id = null;
  attData.value = [];
  hasData.value = false;
  subjectScheduledDows.value = null;
  if (reportType.value === "summary" && canSearch.value) {
    await getData();
  }
});

onMounted(async () => {
  const now = new Date();
  form.value.start_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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
    await fetchGradeSubjects();
    if (canSearch.value) await getData();
  }
});

</script>

<template>
  <VRow class="mt-1 report-no-print" align="center">
    <VCol cols="12" md="3">
      <AppDateTimePicker
        v-model="form.start_date"
        placeholder="Select month"
        :config="monthPickerConfig"
      />
    </VCol>

    <VCol cols="12" md="3">
      <VBtnToggle
        v-model="reportType"
       
        density="compact"
       color="primary"
        divided
        class="w-100"
      >
        <VBtn value="daily" class="flex-grow-1">Daily</VBtn>
        <VBtn value="summary" class="flex-grow-1">Whole Month</VBtn>
      </VBtnToggle>
      
    </VCol>

    <VCol v-if="reportType === 'daily'" cols="12" md="3">
      <AppSelect
        v-model="form.subject_id"
        :items="subjectOptions"
        item-title="name_en"
        item-value="id"
        placeholder="Select subject"
        autocomplete="off"
        :loading="subjectLoading"
        :disabled="subjectLoading || !props.class_id"
       
        persistent-hint
      />
    </VCol>

    <VCol cols="12" :md="reportType === 'daily' ? 3 : 6" class="d-flex gap-2">
      <VBtn
        color="primary"
        variant="tonal"
       
        :loading="loading"
        :disabled="loading || !canSearch"
        prepend-icon="tabler-Search"
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
      id="printArea"
      class="attendance-report-sheet border rounded-lg pa-4"
    >
      <!-- shared header -->

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
        
      </div> -->

      <div class="report-meta d-flex justify-space-between mb-3">
        <div>
          <div><span class="meta-label">class:</span> {{ classLabel }}</div>
          <div v-if="reportType === 'daily'">
            <span class="meta-label">subject:</span>
            {{ selectedSubject?.name_en || "—" }}
          </div>
          <div v-if="reportType === 'daily' && scheduleDaysLabel">
            <span class="meta-label">schedule:</span>
            {{ scheduleDaysLabel }}
          </div>
        </div>
        <div class="text-end">
          <div><span class="meta-label">program:</span> {{ programName }}</div>
        </div>
      </div>

      

      <!-- daily: calendar grid -->
      <div v-if="reportType === 'daily'" class="report-table-wrap">
        <table class="report-grid">
          <thead>
            <tr>
              <th style="width: 240px;" rowspan="3" class="col-student">student</th>
              <th style="width: 34px;" rowspan="3" class="col-gender"><span class="vertical-label">Gender</span></th>
              <th :colspan="calendarDays.length" class="col-calendar">
                calendar
              </th>
              <th colspan="4" class="col-summary">Attendance</th>
            </tr>
            <tr>
              <th
                v-for="day in calendarDays"
                :key="`day-${day.day}`"
                class="col-day"
                :class="{ 'is-weekend': day.isNonSchoolDay }"
              >
                {{ day.day }}
              </th>
              <th class="col-total vertical-header" rowspan="2">
                <span class="vertical-label">Absent</span>
              </th>
              <th class="col-total vertical-header" rowspan="2">
                <span class="vertical-label">Permission</span>
              </th>
              <th class="col-total vertical-header" rowspan="2">
                <span class="vertical-label">Late</span>
              </th>
              <th class="col-total vertical-header" rowspan="2">
                <span class="vertical-label">Present</span>
              </th>
            </tr>
            <tr class="weekday-row">
              <th
                v-for="day in calendarDays"
                :key="`wd-${day.day}`"
                class="col-weekday"
                :class="{ 'is-weekend': day.isNonSchoolDay }"
              >
                <span class="vertical-label">{{ day.weekday }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, i) in attData" :key="student.id ?? i">
              <td class="col-student">
                <div class="name-main">{{ student.name_en }}</div>
                <!-- <div v-if="student.name_kh" class="name-sub">
                  {{ student.name_kh }}
                </div> -->
              </td>
              <td class="text-center">{{ genderLabel(student.gender) }}</td>
              <td
                v-for="day in calendarDays"
                :key="`${student.id}-${day.day}`"
                class="text-center col-day"
                :class="{ 'is-weekend': isCellOffDay(student, day) }"
              >
                <VIcon
                  v-if="isPresentMark(getDayStatus(student, day.day))"
                  icon="tabler-check"
                  size="14"
                  class="status-present-icon"
                />
                <span v-else>{{ getDayStatus(student, day.day) }}</span>
              </td>
              <td class="text-center">{{ student.absent_total ?? 0 }}</td>
              <td class="text-center">
                {{ student.ask_permission_total ?? student.permission_total ?? 0 }}
              </td>
              <td class="text-center">{{ student.late_total ?? 0 }}</td>
              <td class="text-center">{{ student.present_total ?? 0 }}</td>
            </tr>
            <tr v-if="!attData.length">
              <td
                :colspan="calendarDays.length + 6"
                class="text-center py-8 empty-cell"
              >
                No attendance recorded for this month yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- whole month: per-subject summary -->
      <div v-else class="report-table-wrap">
        <table class="report-grid report-grid-summary">
          <thead>
            <tr>
              <th rowspan="2" style="width: 200px;">Student</th>
              <th style="width: 34px;" rowspan="2" class="col-gender"><span class="vertical-label">Gender</span></th>
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
                No attendance recorded for this month yet.
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
        <ReportAttendanceLegend
        :show-schedule-note="reportType === 'daily'"
      />
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

.weekday-row th {
  font-size: 10px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.vertical-header {
  height: 72px;
  padding: 4px 2px !important;
  vertical-align: middle;
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

.col-day {
  min-width: 28px;
  width: 28px;
  padding: 4px 2px !important;
  font-size: 11px;
}

.status-present-icon {
  color: rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity));
}

.col-weekday {
  min-width: 22px;
  width: 22px;
  height: 56px;
  padding: 2px !important;
  vertical-align: middle;
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

.is-weekend {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.total-row td {
  background: rgba(var(--v-theme-on-surface), 0.06);
  font-weight: 600;
}

.name-main {
  font-weight: 500;
  font-size: 12px;
}

.name-sub {
  font-size: 10px;
  opacity: 0.55;
  margin-top: 1px;
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

  .is-weekend,
  .total-row td {
    background: #f3f3f3 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
