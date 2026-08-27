<script setup>
/**
 * ReportRanking — class ranking by subject averages.
 *
 * Data flow:
 *   1. Load grade subjects (dynamic columns)
 *   2. Load class students
 *   3. For each subject: grading layout → scores → subject average (0–100)
 *   4. Total = sum of subject averages
 *   5. Average = total / subjectCount
 *   6. sortRankingRows() only — no extra filters
 */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { roundScore } from "@/utils/gradeCalculation.js";
import {
  compareEntityNames,
  getBilingualLabel,
  getEntityLabel,
} from "@/utils/reportLabels.js";
import { fetchTerms } from "@/views/global/score/scoreEntryService.js";
import { loadClassSubjectAverages } from "@/views/global/report/examReportScoreService.js";
import { getClasses, getGrades } from "@/services/dataService";
import { getCurrentYearId } from "@/services/getCurrentYearId";
import { usePartStore } from "@/stores/partStore";
import dchLogoHeader from "../../../../../public/logo/dchlogoheader.png";
import FooterRepor from "@/views/global/components/footerRepor.vue";

const props = defineProps({
  formSearch: {
    type: Object,
    required: true,
  },
});

const { t,locale } = useI18n();
const partStore = usePartStore();
const reportPart = computed(() => partStore.system_part || "english");

const loading = ref(false);
const subjects = ref([]);
const rankingRows = ref([]);
const errorMessage = ref("");
const meta = ref({
  gradeName: "",
  className: "",
  termName: "",
});

const yearId = computed(() => getCurrentYearId());

/** Sum of each subject's category percentage for this grade */
const totalMax = computed(() =>
  subjects.value.reduce((sum, subject) => sum + (Number(subject.subject_max) || 0), 0),
);

const canLoad = computed(() => {
  const { grade_id, class_id, term_id, type_report } = props.formSearch || {};
  if (!grade_id || !class_id) return false;
  if (type_report === "Term") return !!term_id;
  return type_report === "Final";
});

const hasData = computed(
  () => !loading.value && !errorMessage.value && rankingRows.value.length > 0,
);

const reportTitle = computed(() => {
  if (props.formSearch?.type_report === "Final") {
    return t("Student Ranking Report (Final)");
  }
  const term = meta.value.termName;
  return term
    ? t("Student Ranking Report — {term}", { term })
    : t("Student Ranking Report");
});

const printObj = computed(() => ({
  id: "printAreaRanking",
  popTitle: reportTitle.value,
}));

function formatScore(value) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return roundScore(value, 2).toFixed(2);
}

function subjectLabel(subject) {
  return getBilingualLabel(subject, reportPart.value);
}

function studentLabel(row) {
  return getBilingualLabel(row, reportPart.value);
}

function genderLabel(gender) {
  if (!gender) return "—";
  const value = String(gender).toLowerCase();
  const useKhmerAbbr =
    reportPart.value === "khmer" || reportPart.value === "chinese";
  if (value === "male" || value === "m") {
    return useKhmerAbbr ? "ប" : t("male");
  }
  if (value === "female" || value === "f") {
    return useKhmerAbbr ? "ស" : t("female");
  }
  return gender;
}

async function loadReportMeta() {
  const { grade_id, class_id, term_id, type_report } = props.formSearch || {};

  const [gradeRows, classRows, termRows] = await Promise.all([
    getGrades(),
    getClasses(),
    fetchTerms(yearId.value),
  ]);

  const grade = (gradeRows || []).find((g) => Number(g.id) === Number(grade_id));
  const cls = (classRows || []).find((c) => Number(c.id) === Number(class_id));
  const term = (termRows || []).find((t) => Number(t.id) === Number(term_id));

  meta.value = {
    gradeName: getEntityLabel(grade, reportPart.value, ""),
    className: getEntityLabel(cls, reportPart.value, ""),
    termName:
      type_report === "Final"
        ? "Final"
        : getEntityLabel(term, reportPart.value, ""),
  };
}

/**
 * sortRankingRows — SORT ONLY.
 * Orders students by average ↓, then total ↓, then name.
 * Assigns rank 1…N. Does not filter or change scores.
 */
function sortRankingRows(rows = []) {
  return [...rows]
    .sort((a, b) => {
      const avgDiff = Number(b.average) - Number(a.average);
      if (avgDiff !== 0) return avgDiff;

      const totalDiff = Number(b.total) - Number(a.total);
      if (totalDiff !== 0) return totalDiff;

      return compareEntityNames(a, b, reportPart.value);
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
}

function buildRows(students, subjectList, scoreByStudent) {
  const rows = students.map((student) => {
    const subjectScores = {};
    let total = 0;

    for (const subject of subjectList) {
      const score = Number(scoreByStudent.get(student.student_id)?.[subject.id]) || 0;
      subjectScores[subject.id] = score;
      total += score;
    }

    const count = subjectList.length || 1;
    const average = roundScore(total / count, 2);

    return {
      student_id: student.student_id,
      no: student.index ?? null,
      name_en: student.name_en || "",
      name_kh: student.name_kh || "",
      name_cn: student.name_cn || "",
      gender: student.gender || null,
      subjectScores,
      total: roundScore(total, 2),
      average,
    };
  });

  return sortRankingRows(rows);
}

async function loadRanking() {
  if (!canLoad.value) {
    subjects.value = [];
    rankingRows.value = [];
    return;
  }

  loading.value = true;
  errorMessage.value = "";

  try {
    await loadReportMeta();

    const result = await loadClassSubjectAverages({
      yearId: yearId.value,
      gradeId: props.formSearch.grade_id,
      classId: props.formSearch.class_id,
      typeReport: props.formSearch.type_report,
      termId: props.formSearch.term_id,
    });

    if (result.error) {
      subjects.value = [];
      rankingRows.value = [];
      errorMessage.value = result.error;
      return;
    }

    subjects.value = result.subjects;
    rankingRows.value = buildRows(
      result.students,
      result.subjects,
      result.scoreByStudent,
    );
  } catch (error) {
    console.error("Failed to load ranking:", error);
    subjects.value = [];
    rankingRows.value = [];
    errorMessage.value = error?.message || "Failed to load ranking report.";
  } finally {
    loading.value = false;
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
    loadRanking();
  },
  { immediate: true },
);
</script>

<template>
  <div class="report-ranking">
    <VRow class="mb-3 report-no-print" align="center">
      <VCol cols="12" class="d-flex justify-end">
        <VBtn
          id="page-tour-exam-report-print"
          color="primary"
          variant="tonal"
          prepend-icon="tabler-printer"
          :disabled="!hasData"
          v-print="printObj"
        >
          {{ $t("Print") }}
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
      <div class="text-body-2 text-medium-emphasis">{{ $t("Loading ranking…") }}</div>
    </div>

    <div v-else-if="errorMessage" class="pa-6 text-center text-body-2 text-medium-emphasis">
      {{ errorMessage }}
    </div>

    <div
      v-else
      id="printAreaRanking"
      class="ranking-report-sheet border rounded-lg pa-4"
    >
      <div class="w-100 mx-auto d-flex flex-column align-center justify-center mb-4">
        <VImg
          :src="dchLogoHeader"
          alt="Dewey Childcare House"
          class="w-100 report-logo"
        />
        <div :class="{moul:locale === 'km'}" class="report-title mt-4">{{ reportTitle }}</div>
      </div>

      <div class="report-meta d-flex justify-space-between mb-3" style="margin-top: -30px;">
        <div :class="{moul:locale === 'km'}">
          <div :class="{moul:locale === 'km'}">
            <span class="meta-label">{{ $t("class:") }}</span>
            <span class="meta-class-name">{{ meta.className || "—" }}</span>
          </div>
          <div>
            <span class="meta-label">{{ $t("period:") }}</span>
           <span class="meta-class-name">{{ meta.termName || "—" }}</span>
          </div>
        </div>
        <div class="text-end">
          <div :class="{moul:locale === 'km'}">
            <span class="meta-label">{{ $t("grade:") }}</span>
            <span class="meta-class-name">{{ meta.gradeName || "—" }}</span>
          </div>
        </div>
      </div>

      <div class="ranking-table-wrap">
        <table class="ranking-table">
          <thead :class="{ moul: reportPart === 'khmer' }">
            <tr>
              <!-- <th class="col-no" rowspan="2">NO</th> -->
              <th class="col-name" rowspan="2">{{ $t("STUDENT'S NAME") }}</th>
              <th class="col-gender" rowspan="2">{{ $t("Gender") }}</th>
              <th
                v-for="subject in subjects"
                :key="`h-${subject.id}`"
                class="col-subject"
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
              <th class="col-total">{{ $t("Total") }}</th>
              <th class="col-average">{{ $t("Average") }}</th>
              <th v-if="reportPart === 'khmer'" class="col-rank" rowspan="2">ចំ.ថ្នាក់</th>
              <th v-else class="col-rank" rowspan="2">{{ $t("Rank") }}</th>
            </tr>
            <tr>
              <th
                v-for="subject in subjects"
                :key="`m-${subject.id}`"
                class="col-subject col-max"
              >
                {{ subject.subject_max || 0 }}
              </th>
              <th class="col-total col-max">{{ totalMax }}</th>
              <th class="col-average col-max">100%</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, i) in rankingRows" :key="row.student_id">
              <!-- <td class="text-center col-no">{{ row.no ?? i + 1 }}</td> -->
              <td class="col-name-cell">
                <div
                  v-for="label in [studentLabel(row)]"
                  :key="`nl-${row.student_id}`"
                  class="report-name"
                >
                  <div class="name-primary">{{ label.primary }}</div>
                  <div v-if="label.secondary" class="name-secondary">
                    {{ label.secondary }}
                  </div>
                </div>
              </td>
              <td class="text-center col-gender">
                {{ genderLabel(row.gender) }}
              </td>
              <td
                v-for="subject in subjects"
                :key="`${row.student_id}-${subject.id}`"
                class="text-center"
              >
                {{ formatScore(row.subjectScores[subject.id]) }}
              </td>
              <td class="text-center col-total-cell">
                {{ formatScore(row.total) }}
              </td>
              <td class="text-center col-average-cell">
                {{ formatScore(row.average) }}
              </td>
              <td
                class="text-center col-rank-cell"
                :class="{ 'rank-top': row.rank <= 3 }"
              >
                {{ row.rank }}
              </td>
            </tr>

            <tr v-if="!rankingRows.length">
              <td
                :colspan="subjects.length + 5"
                class="text-center py-8 text-medium-emphasis"
              >
                No ranking data yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <FooterRepor editable />
    </div>
  </div>
</template>

<style scoped>
.ranking-report-sheet {
  background: rgb(var(--v-theme-surface));
  overflow-x: auto;
}

.report-logo {
  height: 100px;
  width: 200px;
  object-fit: cover;
}

.report-title {
  font-size: 13px;
  font-weight: 200;
  margin-top: 10px;
  
  text-align: center;
  color:#00620d !important;
}
.meta-class-name {
  color: orange;
}

.report-meta {
  font-size: 12px;
}

.meta-label {
  font-weight: 500;
  margin-right: 4px;
  color:#00620d !important;
}

.ranking-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.ranking-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  font-size: 0.8125rem;
  min-width: 720px;
}

.ranking-table th,
.ranking-table td {
  border: 1px solid #6b6b6b;
  padding: 6px 8px;
  vertical-align: middle;
}

.ranking-table thead th {
  font-weight: 600;
  text-align: center;
  line-height: 1.25;
  background: #f0f0f0;
}

.ranking-table thead.moul th {
  font-family: "moul", sans-serif !important;
  font-size: 10px;
  font-weight: 100;
}

.col-no {
  width: 36px;
  max-width: 36px;
  padding-inline: 2px !important;
}

.col-name {
  min-width: 180px;
  text-align: left !important;
}

.col-gender {
  width: 52px;
  max-width: 64px;
  min-width: 48px;
  padding-inline: 4px !important;
  white-space: nowrap;
}

.col-name-cell {
  height: 0;
  text-align: left;
  white-space: nowrap;
}

.report-name {
  display: flex;
  flex-direction: column;
  align-items: inherit;
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

.col-subject {
  min-width: 88px;
}

.col-total {
  min-width: 60px;
}

.col-average {
  min-width: 60px;
}

.col-rank {
  width: 40px;
  max-width: 40px;
  min-width: 40px;
  padding-inline: 2px !important;
}

.col-max {
  font-weight: 600;
  font-size: 0.75rem;
}

.col-total-cell,
.col-average-cell {
  font-weight: 600;
}

.col-rank-cell {
  width: 40px;
  max-width: 40px;
  padding-inline: 2px !important;
  font-weight: 600;
}

.rank-top {
  color: #d32f2f;
  font-weight: 700;
}

.ranking-table tbody td {
  background: #fff;
}

@media print {
  .report-no-print {
    display: none !important;
  }

  .ranking-report-sheet {
    border: none !important;
    padding: 0 !important;
    color: #000 !important;
  }

  .ranking-report-sheet,
  .ranking-report-sheet *:not(.rank-top):not(.meta-class-name):not(.meta-label):not(.report-title) {
    color: #000 !important;
  }

  .report-meta {
    color: #000 !important;
  }

  .ranking-table th,
  .ranking-table td:not(.rank-top) {
    color: #000 !important;
    border-color: #000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .report-title {
    color: #00620d !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .meta-label {
    color: #00620d !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .meta-class-name {
    color: rgb(255, 128, 0) !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .rank-top {
    color: #d32f2f !important;
    font-weight: 700 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .ranking-table thead th {
    background: #f0f0f0 !important;
  }

  .ranking-table tbody td {
    background: #fff !important;
  }
}
</style>
