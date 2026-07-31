<script setup>
/**
 * Individual Academic Report — one student, criteria × subject grid.
 * Download: Print (PDF) via v-print, or PNG via html2canvas.
 */
import { computed, nextTick, ref, watch } from "vue";
import { listStudentRecommendations } from "@/services/api/studentRecommendations";
import html2canvas from "html2canvas";
import FileSaver from "file-saver";
import { app } from "@/utils/app";
import { roundScore } from "@/utils/gradeCalculation.js";
import { buildTeacherRecommendation } from "@/utils/teacherRecommendation.js";
import { getClasses, getCurriculums, getGrades } from "@/services/dataService";
import { getCurrentYearId } from "@/services/getCurrentYearId";
import { usePartStore } from "@/stores/partStore";
import {
  getBilingualLabel,
  getEntityLabel,
} from "@/utils/reportLabels.js";
import { fetchTerms } from "@/views/global/score/scoreEntryService.js";
import {
  letterGrade,
  loadIndividualReportSetup,
  loadStudentCategoryBreakdown,
} from "@/views/global/report/examReportScoreService.js";
import FooterRepor from "@/views/global/components/footerRepor.vue";
import backgroundReport from "../../../../../public/logo/backgroundreport.png";

const props = defineProps({
  formSearch: {
    type: Object,
    required: true,
  },
});

const partStore = usePartStore();
const reportPart = computed(() => partStore.system_part || "english");

function selectItemTitle(item) {
  return getEntityLabel(item, reportPart.value, "");
}

const loading = ref(false);
const loadingStudent = ref(false);
const downloading = ref(false);
const errorMessage = ref("");
const students = ref([]);
const subjects = ref([]);
const criteria = ref([]);
const layoutsBySubjectId = ref(new Map());
const termIds = ref([]);
const terms = ref([]);
const studentReport = ref(null);
const selectedStudentId = ref(null);
const comment = ref("");
const curriculums = ref([]);

const meta = ref({
  gradeName: "",
  className: "",
  termName: "",
  yearLabel: "",
  programName: "",
});

const SUBJECT_HEADER_COLORS = [
  "#FFF4B8",
  "#FFD6E0",
  "#CDE8FF",
  "#FFE0B8",
  "#E8D5B7",
  "#D4EDDA",
  "#E2D4F0",
];

const yearId = computed(() => getCurrentYearId());

const canLoad = computed(() => {
  const { grade_id, class_id, term_id, type_report } = props.formSearch || {};
  if (!grade_id || !class_id) return false;
  if (type_report === "Term") return !!term_id;
  return type_report === "Final";
});

const selectedStudent = computed(
  () =>
    students.value.find(
      (s) => Number(s.student_id) === Number(selectedStudentId.value),
    ) ?? null,
);

const hasReport = computed(
  () =>
    !loading.value &&
    !loadingStudent.value &&
    !errorMessage.value &&
    !!selectedStudent.value &&
    !!studentReport.value,
);

const showMapecNote = computed(() =>
  subjects.value.some((s) => s.hasMapec || /mapec/i.test(s.name_en || "")),
);

const reportTitle = computed(() => {
  const name = getEntityLabel(selectedStudent.value, reportPart.value, "Student");
  if (props.formSearch?.type_report === "Final") {
    return `Academic Report — ${name} (Final)`;
  }
  const term = meta.value.termName;
  return term
    ? `Academic Report — ${name} — ${term}`
    : `Academic Report — ${name}`;
});

const printObj = computed(() => ({
  id: "printAreaIndividual",
  popTitle: reportTitle.value,
}));

const sheetStyle = computed(() => ({
  backgroundImage: `url(${backgroundReport})`,
}));

function subjectLabel(subject) {
  return getBilingualLabel(subject, reportPart.value);
}

function studentLabel(student) {
  return getBilingualLabel(student, reportPart.value);
}

function subjectHeaderColor(index) {
  return SUBJECT_HEADER_COLORS[index % SUBJECT_HEADER_COLORS.length];
}

function formatScore(value) {
  if (value == null || !Number.isFinite(Number(value))) return "N/A";
  return roundScore(value, 2).toFixed(2);
}

function formatGrade(value) {
  if (value == null || value === "—") return "—";
  return value;
}

function categoryCell(subjectId, criteriaKey) {
  const report = studentReport.value;
  if (!report) return null;
  return report.categories?.[subjectId]?.[criteriaKey] ?? null;
}

function subjectTotal(subjectId) {
  return studentReport.value?.totals?.[subjectId] ?? null;
}

function subjectGrade(subjectId) {
  return studentReport.value?.grades?.[subjectId] ?? "—";
}

function resetStudentView() {
  selectedStudentId.value = null;
  studentReport.value = null;
  comment.value = "";
}

async function loadReportMeta() {
  const { grade_id, class_id, term_id, type_report } = props.formSearch || {};

  const [gradeRows, classRows, termRows, curriculumRows] = await Promise.all([
    getGrades(),
    getClasses(),
    fetchTerms(yearId.value),
    getCurriculums(),
  ]);

  curriculums.value = curriculumRows ?? [];

  const grade = (gradeRows || []).find((g) => Number(g.id) === Number(grade_id));
  const cls = (classRows || []).find((c) => Number(c.id) === Number(class_id));
  const term = (termRows || []).find((t) => Number(t.id) === Number(term_id));
  const cur = (curriculumRows || []).find(
    (c) => Number(c.id) === Number(partStore.cur_id),
  );

  const years = app()?.years || [];
  const year = years.find((y) => Number(y.id) === Number(yearId.value));

  const gradeName = getEntityLabel(grade, reportPart.value, "");
  const classSymbol = cls?.symbol ? ` ${cls.symbol}` : "";
  const className =
    `${gradeName}${classSymbol}`.trim() ||
    getEntityLabel(cls, reportPart.value, "");

  meta.value = {
    gradeName,
    className,
    termName:
      type_report === "Final"
        ? "Final"
        : getEntityLabel(term, reportPart.value, ""),
    yearLabel: year?.year_name || "",
    programName: getEntityLabel(cur, reportPart.value, ""),
  };
}

async function fetchStudentComment(studentId, subjectList, scoreTotals) {
  if (!studentId || !props.formSearch?.class_id || !yearId.value) {
    return "";
  }

  const periodId =
    props.formSearch?.type_report === "Term"
      ? props.formSearch.term_id ?? null
      : null;

  // academic_period_null distinguishes "the row with NO period" from "any
  // period" — passing a null id alone would match every period.
  const rows = await listStudentRecommendations({
    class_id: props.formSearch.class_id,
    year_id: yearId.value,
    student_ids: [studentId],
    ...(periodId != null
      ? { academic_period_id: periodId }
      : { academic_period_null: true }),
  });
  const data = rows[0] ?? null;

  if (data?.recommendation?.trim()) return data.recommendation.trim();
  if (data?.generated_text?.trim()) return data.generated_text.trim();

  const student = students.value.find(
    (s) => Number(s.student_id) === Number(studentId),
  );
  if (!student) return "";

  return buildTeacherRecommendation({
    name: getEntityLabel(student, reportPart.value, "Student"),
    gender: student.gender,
    studentId: student.student_id,
    subjects: subjectList,
    subjectScores: scoreTotals || {},
    absentDays: 0,
  });
}

/** Load class students + subject categories only (no per-student scores). */
async function loadSetup() {
  if (!canLoad.value) {
    students.value = [];
    subjects.value = [];
    criteria.value = [];
    layoutsBySubjectId.value = new Map();
    termIds.value = [];
    terms.value = [];
    resetStudentView();
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  resetStudentView();

  try {
    await loadReportMeta();

    const result = await loadIndividualReportSetup({
      yearId: yearId.value,
      gradeId: props.formSearch.grade_id,
      classId: props.formSearch.class_id,
      typeReport: props.formSearch.type_report,
      termId: props.formSearch.term_id,
    });

    console.log("result", result);

    if (result.error) {
      students.value = [];
      subjects.value = [];
      criteria.value = [];
      layoutsBySubjectId.value = new Map();
      termIds.value = [];
      terms.value = [];
      errorMessage.value = result.error;
      return;
    }

    students.value = result.students;
    subjects.value = result.subjects;
    criteria.value = result.criteria || [];
    layoutsBySubjectId.value = result.layoutsBySubjectId;
    termIds.value = result.termIds;
    terms.value = result.terms || [];
  } catch (error) {
    console.error("Failed to load individual report:", error);
    students.value = [];
    subjects.value = [];
    criteria.value = [];
    errorMessage.value =
      error?.message || "Failed to load individual academic report.";
  } finally {
    loading.value = false;
  }
}

/** Load scores + comment only after user picks a student. */
async function loadSelectedStudent() {
  if (!selectedStudent.value) {
    studentReport.value = null;
    comment.value = "";
    return;
  }

  loadingStudent.value = true;
  errorMessage.value = "";

  try {
    const result = await loadStudentCategoryBreakdown({
      yearId: yearId.value,
      classId: props.formSearch.class_id,
      student: selectedStudent.value,
      subjects: subjects.value,
      criteria: criteria.value,
      layoutsBySubjectId: layoutsBySubjectId.value,
      termIds: termIds.value,
      terms: terms.value,
    });

    if (result.error) {
      studentReport.value = null;
      comment.value = "";
      errorMessage.value = result.error;
      return;
    }

    studentReport.value = result.report;
    comment.value = await fetchStudentComment(
      selectedStudent.value.student_id,
      subjects.value,
      result.report?.totals,
    );
  } catch (error) {
    console.error("Failed to load student report:", error);
    studentReport.value = null;
    comment.value = "";
    errorMessage.value =
      error?.message || "Failed to load student academic report.";
  } finally {
    loadingStudent.value = false;
  }
}

function sanitizeFilename(name) {
  return String(name || "student")
    .trim()
    .replace(/[^\w\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
}

function shouldIgnoreForPng(node) {
  if (!(node instanceof Element)) return false;
  return (
    node.classList.contains("report-no-print") ||
    node.classList.contains("report-footer-actions")
  );
}

async function downloadPng() {
  if (!hasReport.value || downloading.value) return;

  downloading.value = true;
  try {
    await nextTick();
    const el = document.getElementById("printAreaIndividual");
    if (!el) throw new Error("Report area not found.");

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      // Vuetify `.d-flex` uses `display: flex !important`, so plain
      // style.display = "none" does not hide the Set signatures button.
      ignoreElements: shouldIgnoreForPng,
      onclone: (doc) => {
        doc
          .querySelectorAll(".report-no-print, .report-footer-actions")
          .forEach((node) => node.remove());
        doc
          .querySelectorAll(".footer-sign-space.is-editable")
          .forEach((node) => node.classList.remove("is-editable"));
      },
    });

    const studentName = sanitizeFilename(
      getEntityLabel(selectedStudent.value, reportPart.value, "student"),
    );
    const termPart = sanitizeFilename(meta.value.termName || "report");

    await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create image."));
          return;
        }
        FileSaver.saveAs(
          blob,
          `Academic-Report-${studentName}-${termPart}.png`,
        );
        resolve();
      }, "image/png");
    });
  } catch (error) {
    console.error("Download failed:", error);
    errorMessage.value = error?.message || "Failed to download report.";
  } finally {
    downloading.value = false;
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
    loadSetup();
  },
  { immediate: true },
);

watch(selectedStudentId, () => {
  loadSelectedStudent();
});
</script>

<template>
  <div class="report-individual">
    <VRow class="mb-3 report-no-print" align="center">
      <VCol cols="12" md="5" sm="6">
        <AppSelect
          v-model="selectedStudentId"
          :items="students"
          :item-title="selectItemTitle"
          item-value="student_id"
          :placeholder="$t('Select student')"
          :loading="loading || loadingStudent"
          clearable
        />
      </VCol>

      <VCol cols="12" md="7" sm="6" class="d-flex justify-end flex-wrap ga-2">
        <VBtn
          color="primary"
          variant="tonal"
          prepend-icon="tabler-download"
          :disabled="!hasReport || downloading"
          :loading="downloading"
          @click="downloadPng"
        >
          {{ $t("Download PNG") }}
        </VBtn>
        <VBtn
          color="primary"
          variant="tonal"
          prepend-icon="tabler-printer"
          :disabled="!hasReport || downloading"
          v-print="printObj"
        >
          {{ $t("Print / PDF") }}
        </VBtn>
      </VCol>
    </VRow>

    <div
      v-if="loading"
      class="d-flex flex-column align-center justify-center pa-10"
    >
      <VProgressCircular
        indeterminate
        color="primary"
        size="40"
        width="3"
        class="mb-3"
      />
      <div class="text-body-2 text-medium-emphasis">
        {{ $t("Loading students…") }}
      </div>
    </div>

    <div
      v-else-if="errorMessage && !selectedStudent"
      class="pa-6 text-center text-body-2 text-medium-emphasis"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="!selectedStudent"
      class="pa-8 text-center text-body-2 text-medium-emphasis"
    >
      {{ $t("Select a student to view the academic report.") }}
    </div>

    <div
      v-else-if="loadingStudent"
      class="d-flex flex-column align-center justify-center pa-10"
    >
      <VProgressCircular
        indeterminate
        color="primary"
        size="40"
        width="3"
        class="mb-3"
      />
      <div class="text-body-2 text-medium-emphasis">
        {{ $t("Loading student report…") }}
      </div>
    </div>

    <div
      v-else-if="errorMessage"
      class="pa-6 text-center text-body-2 text-medium-emphasis"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else
      id="printAreaIndividual"
      class="individual-sheet"
      :style="sheetStyle"
    >
      <div class="individual-content" style="margin-top: 70px;">
        <h1 class="individual-title">{{ $t("ACADEMIC REPORT") }}</h1>

        <table class="info-grid">
          <tbody>
            <tr>
              <td class="info-label">{{ $t("Name:") }}</td>
              <td class="info-value info-name">
                <div
                  v-for="label in [studentLabel(selectedStudent)]"
                  :key="selectedStudent.student_id"
                  class="report-name"
                >
                  <div class="name-primary">{{ label.primary }}</div>
                  <div v-if="label.secondary" class="name-secondary">
                    {{ label.secondary }}
                  </div>
                </div>
              </td>
              <td class="info-label">{{ $t("Term:") }}</td>
              <td class="info-value">{{ meta.termName || "—" }}</td>
              <td class="info-label info-program-label">{{ $t("Program:") }}</td>
            </tr>
            <tr>
              <td class="info-label">{{ $t("Level:") }}</td>
              <td class="info-value">{{ meta.className || "—" }}</td>
              <td class="info-label">{{ $t("Year:") }}</td>
              <td class="info-value">{{ meta.yearLabel || "—" }}</td>
              <td class="info-value info-program-value">
                {{ meta.programName || "—" }}
              </td>
            </tr>
          </tbody>
        </table>

        <div class="score-table-wrap">
          <table class="score-table">
            <thead>
              <tr>
                <th class="col-criteria">{{ $t("Criteria") }}</th>
                <th
                  v-for="(subject, idx) in subjects"
                  :key="`h-${subject.id}`"
                  class="col-subject"
                  :style="{ background: subjectHeaderColor(idx) }"
                >
                  <div
                    v-for="label in [subjectLabel(subject)]"
                    :key="`hl-${subject.id}`"
                    class="report-name"
                  >
                    <div class="name-primary">{{ label.primary }}</div>
                    <div v-if="label.secondary" class="name-secondary">
                      {{ label.secondary }}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in criteria" :key="row.key">
                <td class="col-criteria-cell">{{ row.label }}</td>
                <td
                  v-for="subject in subjects"
                  :key="`${row.key}-${subject.id}`"
                  class="text-center"
                >
                  {{ formatScore(categoryCell(subject.id, row.key)) }}
                </td>
              </tr>

              <tr class="row-total">
                <td class="col-criteria-cell">{{ $t("TOTAL") }}</td>
                <td
                  v-for="subject in subjects"
                  :key="`total-${subject.id}`"
                  class="text-center"
                >
                  {{ formatScore(subjectTotal(subject.id)) }}
                </td>
              </tr>

              <tr class="row-grade">
                <td class="col-criteria-cell">{{ $t("SUBJECT EQUIVALENT GRADE") }}</td>
                <td
                  v-for="subject in subjects"
                  :key="`grade-${subject.id}`"
                  class="text-center grade-letter"
                >
                  {{ formatGrade(subjectGrade(subject.id)) }}
                </td>
              </tr>

              <tr class="row-average">
                <td class="col-criteria-cell">{{ $t("Average") }}</td>
                <td
                  class="text-center average-cell"
                  :colspan="Math.max(subjects.length, 1)"
                >
                  {{
                    studentReport?.average != null
                      ? formatScore(studentReport.average)
                      : "—"
                  }}
                </td>
              </tr>

              <tr class="row-overall">
                <td class="col-criteria-cell">{{ $t("Overall Equivalent Grade") }}</td>
                <td
                  class="text-center overall-grade"
                  :colspan="Math.max(subjects.length, 1)"
                >
                  {{
                    formatGrade(
                      studentReport?.overallGrade ||
                        letterGrade(studentReport?.average),
                    )
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="showMapecNote" class="mapec-note">
          MAPEC = MUSIC, ARTS, P.E &amp; COMPUTER
        </div>

        <div class="grade-legend">
          <span>{{ $t("E = Excellent (90-100)") }}</span>
          <span>{{ $t("G = Good (80-89)") }}</span>
          <span>{{ $t("N = Needs Improvement (0-79)") }}</span>
        </div>

        <div class="comment-box">
          <div class="comment-label">{{ $t("Teacher's Comment:") }}</div>
          <p class="comment-text">
            {{ comment || "—" }}
          </p>
        </div>

        <FooterRepor editable />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Background is 3572×5052 — keep that page ratio and inset content inside the frame */
.individual-sheet {
  --sheet-pad-top: 19%;
  --sheet-pad-x: 7%;
  --sheet-pad-bottom: 9%;

  width: 100%;
  max-width: 794px;
  aspect-ratio: 3572 / 5052;
  margin: 0 auto;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: center;
  background-color: #fff;
  overflow: hidden;
  box-sizing: border-box;
}

.individual-content {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: var(--sheet-pad-top) var(--sheet-pad-x) var(--sheet-pad-bottom);
  color: #1a1a1a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.individual-title {
  flex: 0 0 auto;
  margin: 0 0 10px;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-align: center;
  color: #111;
}

.info-grid {
  flex: 0 0 auto;
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
  font-size: 0.75rem;
  table-layout: fixed;
}

.info-grid td {
  border: 1px solid #b7d0ae;
  padding: 5px 6px;
  vertical-align: middle;
}

.info-label {
  width: 11%;
  background: #d8ecd0;
  font-weight: 600;
  white-space: nowrap;
}

.info-value {
  width: 22%;
  background: #fff;
}

.info-name {
  font-weight: 600;
}

.report-name {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.name-primary {
  font-weight: inherit;
}

.name-secondary {
  font-size: 0.7rem;
  font-weight: 400;
  opacity: 0.85;
  margin-top: 1px;
}

.info-program-label {
  width: 23%;
  text-align: center;
}

.info-program-value {
  width: 23%;
  text-align: center;
  font-weight: 600;
  background: #fff;
}

.score-table-wrap {
  flex: 0 0 auto;
  width: 100%;
  overflow: hidden;
}

.score-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.7rem;
  table-layout: fixed;
}

.score-table th,
.score-table td {
  border: 1px solid #c8c8c8;
  padding: 4px 3px;
  vertical-align: middle;
}

.score-table thead th {
  font-weight: 700;
  text-align: center;
  line-height: 1.15;
}

.col-criteria {
  width: 22%;
  background: #e8e8e8 !important;
  text-align: left !important;
}

.col-criteria-cell {
  background: #f5f5f5;
  font-weight: 600;
  text-align: left;
}

.col-subject {
  font-size: 0.65rem;
}

.row-total td {
  font-weight: 700;
  background: #fafafa;
}

.row-grade .grade-letter {
  font-weight: 700;
}

.row-average .average-cell {
  font-weight: 700;
  font-size: 0.85rem;
  background: #fff;
}

.row-overall .overall-grade {
  font-weight: 800;
  font-size: 0.95rem;
  color: #c62828;
}

.mapec-note {
  flex: 0 0 auto;
  margin-top: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  color: #333;
}

.grade-legend {
  flex: 0 0 auto;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: 4px;
  margin-bottom: 10px;
  font-size: 0.68rem;
  color: #333;
}

.comment-box {
  flex: 0 0 auto;
  min-height: 0;
  max-height: 72px;
  border: 1px solid #c8c8c8;
  border-radius: 4px;
  padding: 6px 8px;
  background: #fff;
  margin-bottom: 6px;
  overflow: hidden;
}

.comment-label {
  font-weight: 700;
  font-size: 0.72rem;
  margin-bottom: 2px;
}

.comment-text {
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.35;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.individual-content :deep(.report-footer-wrap) {
  flex: 0 0 auto;
  margin-top: 8px;
}

.individual-content :deep(.footer-sign-space) {
  height: 48px;
}

.individual-content :deep(.footer-line) {
  font-size: 0.72rem;
  padding: 1px 0;
}

@media print {
  .report-no-print {
    display: none !important;
  }

  .individual-sheet {
    max-width: none !important;
    width: 210mm !important;
    height: 297mm !important;
    aspect-ratio: auto !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .individual-content {
    padding: 19% 7% 9% !important;
  }

  .overall-grade {
    color: #c62828 !important;
  }

  .score-table th,
  .score-table td,
  .info-grid td {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
