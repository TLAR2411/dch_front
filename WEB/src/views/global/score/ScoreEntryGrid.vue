<script setup>
/**
 * ScoreEntryGrid — spreadsheet-style score table.
 *
 * Columns per category:
 *   Attendance / Participation: score col + % only (no Total)
 *   Others: [item cols…] + Total + %
 * Sticky: No. + Student name
 * Last: Average Grade
 *
 * Props:
 *   categories — layout from fetchGradingLayout / ensureCategoryItems
 *   students — { student_id, index, name_en, name_kh }
 *   scores — reactive Map/object: studentId → { [itemId]: value }
 *   attendanceMax — scheduled subject school days for Attendance category max
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePartStore } from "@/stores/partStore";
import { getEntityLabel } from "@/utils/reportLabels.js";
import {
  calcAverageGrade,
  calcCategoryPercent,
  resolveCategoryMax,
  roundScore,
  sumItemScores,
  validateScore,
} from "@/utils/gradeCalculation.js";

const props = defineProps({
  categories: {
    type: Array,
    default: () => [],
  },
  students: {
    type: Array,
    default: () => [],
  },
  scores: {
    type: Object,
    required: true,
  },
  attendanceMax: {
    type: [Number, null],
    default: null,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["update:score"]);

const { t } = useI18n();
const partStore = usePartStore();
const reportPart = computed(() => partStore.system_part || "english");

function entityLabel(entity, fallback = "—") {
  return getEntityLabel(entity, reportPart.value, fallback);
}

function studentScoreBag(studentId) {
  return props.scores[studentId] || {};
}

function getScore(studentId, itemId) {
  const val = studentScoreBag(studentId)[itemId];
  return val === undefined ? null : val;
}

function onScoreInput(studentId, itemId, value) {
  emit("update:score", { studentId, itemId, value });
}

function categoryMax(cat) {
  return resolveCategoryMax({
    items: cat.items,
    categoryMax: cat.max_score,
    attendanceMax: props.attendanceMax,
    isAttendance: cat.is_attendance,
  });
}

function studentCategoryTotal(studentId, cat) {
  return sumItemScores(studentScoreBag(studentId), cat.items);
}

function studentCategoryPercent(studentId, cat) {
  return calcCategoryPercent({
    studentTotal: studentCategoryTotal(studentId, cat),
    categoryMax: categoryMax(cat),
    weight: cat.percentage,
  });
}

function studentAverage(studentId) {
  const percents = props.categories.map((cat) => ({
    percent: studentCategoryPercent(studentId, cat),
  }));
  return calcAverageGrade(percents);
}

function itemMaxForValidation(cat, item) {
  if (cat.is_attendance && props.attendanceMax != null) {
    return props.attendanceMax;
  }
  return item.max_score;
}

function cellError(studentId, cat, item) {
  return validateScore(
    getScore(studentId, item.id),
    itemMaxForValidation(cat, item),
  );
}

const totalWeight = computed(() =>
  props.categories.reduce((sum, c) => sum + (Number(c.percentage) || 0), 0),
);

const weightOk = computed(() => Math.abs(totalWeight.value - 100) < 0.01);

function showTotalColumn(cat) {
  return !cat.is_attendance && cat.category_key !== "participation";
}

function itemHeaderLabel(cat, item) {
  if (cat.is_attendance) return t("DAYS");
  if (cat.category_key === "participation") return t("Participation");
  return item.item_name;
}

/** Colspan for a category group header. */
function categoryColspan(cat) {
  const itemCols = Math.max(cat.items?.length || 0, 1);
  return itemCols + (showTotalColumn(cat) ? 2 : 1);
}
</script>

<template>
  <div id="page-tour-score-grid" class="score-grid-wrap">
    <div
      v-if="categories.length && !weightOk"
      class="text-caption text-warning mb-2 px-1"
    >
      {{ $t("Category weights sum to {n}% (expected 100%).", { n: roundScore(totalWeight) }) }}
      {{ $t("Check Subject Setting.") }}
    </div>

    <div class="score-grid-scroll">
      <table class="score-grid">
        <thead>
          <!-- Row 1: category groups -->
          <tr class="row-group">
            <th class="sticky-col col-no" rowspan="3">{{ $t("No.") }}</th>
            <th class="sticky-col col-name" rowspan="3">{{ $t("Student's Name") }}</th>
            <th
              v-for="cat in categories"
              :key="`g-${cat.rule_id}`"
              class="col-group"
              :colspan="categoryColspan(cat)"
            >
              {{ entityLabel(cat, cat.name_en) }}
              <span class="weight-tag">{{ roundScore(cat.percentage) }}%</span>
            </th>
            <th class="col-avg" rowspan="2">{{ $t("Average Grade") }}</th>
          </tr>

          <!-- Row 2: item headers + Total/% -->
          <tr class="row-items">
            <template v-for="cat in categories" :key="`i-${cat.rule_id}`">
              <th
                v-for="item in cat.items"
                :key="`ih-${item.id}`"
                class="col-item"
              >
                {{ itemHeaderLabel(cat, item) }}
              </th>
              <th v-if="!cat.items?.length" class="col-item">—</th>
              <th v-if="showTotalColumn(cat)" class="col-total">{{ $t("Total") }}</th>
              <th class="col-pct">%</th>
            </template>
          </tr>

          <!-- Row 3: highest possible -->
          <tr class="row-max">
            <template v-for="cat in categories" :key="`m-${cat.rule_id}`">
              <th
                v-for="item in cat.items"
                :key="`mh-${item.id}`"
                class="col-item col-max"
              >
                {{
                  cat.is_attendance && attendanceMax != null
                    ? attendanceMax
                    : (item.max_score ?? "—")
                }}
              </th>
              <th v-if="!cat.items?.length" class="col-item col-max">—</th>
              <th v-if="showTotalColumn(cat)" class="col-total col-max">
                {{ roundScore(categoryMax(cat)) || "—" }}
              </th>
              <th class="col-pct col-max">
                {{ roundScore(cat.percentage) }}%
              </th>
            </template>
            <th class="col-avg col-max">100%</th>
          </tr>
        </thead>

        <tbody>
          <tr v-if="!students.length">
            <td
              :colspan="3 + categories.reduce((n, c) => n + categoryColspan(c), 0)"
              class="text-center pa-6 text-medium-emphasis"
            >
              {{ $t("No students in this class.") }}
            </td>
          </tr>

          <tr
            v-for="(student, idx) in students"
            :key="student.student_id"
            class="student-row"
          >
            <td class="sticky-col col-no">
              {{ student.index ?? idx + 1 }}
            </td>
            <td class="sticky-col col-name">
              <div class="name-en">{{ entityLabel(student) }}</div>
              
            </td>

            <template
              v-for="cat in categories"
              :key="`c-${cat.rule_id}-${student.student_id}`"
            >
              <td
                v-for="item in cat.items"
                :key="`s-${student.student_id}-${item.id}`"
                class="col-item"
                :class="{
                  'has-error': cellError(student.student_id, cat, item),
                }"
              >
                <input
                  class="score-input"
                  type="number"
                  min="0"
                  :max="itemMaxForValidation(cat, item) ?? undefined"
                  step="any"
                  :disabled="readonly"
                  :value="getScore(student.student_id, item.id) ?? ''"
                  :title="cellError(student.student_id, cat, item) || ''"
                  @input="
                    onScoreInput(
                      student.student_id,
                      item.id,
                      $event.target.value,
                    )
                  "
                />
              </td>
              <td v-if="!cat.items?.length" class="col-item">—</td>
              <td v-if="showTotalColumn(cat)" class="col-total computed">
                {{ roundScore(studentCategoryTotal(student.student_id, cat)) }}
              </td>
              <td class="col-pct computed">
                {{
                  roundScore(studentCategoryPercent(student.student_id, cat))
                }}
              </td>
            </template>

            <td class="col-avg computed avg-value">
              {{ roundScore(studentAverage(student.student_id)) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped lang="scss">
.score-grid-wrap {
  width: 100%;
}

.score-grid-scroll {
  overflow: auto;
  max-height: calc(100vh - 280px);
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
}

.score-grid {
  border-collapse: separate;
  border-spacing: 0;
  min-width: 100%;
  font-size: 0.8125rem;
  --header-row-1: 38px;
  --header-row-2: 34px;

  th,
  td {
    border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    padding: 6px 8px;
    white-space: nowrap;
    text-align: center;
    vertical-align: middle;
    line-height: 1.25;
  }

  thead th {
    position: sticky;
    background: rgb(var(--v-theme-surface));
    font-weight: 600;
  }

  .row-group th {
    top: 0;
    z-index: 4;
    height: var(--header-row-1);
    min-height: var(--header-row-1);
    max-height: var(--header-row-1);
    background: rgba(var(--v-theme-primary), 0.12);
    padding-block: 8px;
    box-sizing: border-box;
  }

  .row-group .sticky-col.col-no,
  .row-group .sticky-col.col-name {
    max-height: none;
    height: auto;
    vertical-align: middle;
  }

  .row-items th {
    top: var(--header-row-1);
    z-index: 3;
    height: var(--header-row-2);
    min-height: var(--header-row-2);
    max-height: var(--header-row-2);
    background: rgba(var(--v-theme-primary), 0.06);
    padding-block: 6px;
    box-sizing: border-box;
  }

  .row-max th {
    top: calc(var(--header-row-1) + var(--header-row-2));
    z-index: 2;
    background: rgba(var(--v-theme-info), 0.08);
    font-weight: 500;
    font-size: 0.75rem;
    color: rgba(var(--v-theme-on-surface), 0.7);
    padding-block: 5px;
    box-sizing: border-box;
  }

  .sticky-col {
    position: sticky;
    z-index: 3;
    background: rgb(var(--v-theme-surface));
  }

  thead .sticky-col {
    z-index: 100;
  }

  .row-group .sticky-col {
    top: 0;
    z-index: 7;
  }

  .row-items .sticky-col {
    z-index: 6;
  }

  .row-max .sticky-col {
    z-index: 5;
  }

  .col-no {
    background-color: #fff;
    left: 0;
    min-width: 44px;
    width: 44px;
  }

  .col-name {
    background-color: #fff;
    left: 44px;
    min-width: 180px;
    text-align: left;
    padding-left: 10px;
  }

  thead .col-no,
  thead .col-name {
    background-color: #fff;
  }

  .row-group .sticky-col.col-no,
  .row-group .sticky-col.col-name {
    background-color: #fff;
  }

  tbody .sticky-col {
    background-color: #fff;
  }

  .col-group {
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  .weight-tag {
    display: inline-block;
    margin-left: 4px;
    padding: 0 5px;
    border-radius: 4px;
    background: rgba(var(--v-theme-primary), 0.2);
    font-size: 0.7rem;
  }

  .col-total,
  .col-pct {
    background: rgba(var(--v-theme-warning), 0.06);
    min-width: 52px;
  }

  .col-avg {
    background: rgba(var(--v-theme-success), 0.1);
    min-width: 72px;
    font-weight: 700;
  }

  .col-item {
    min-width: 56px;
    padding: 5px 3px;
  }

  .computed {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  .avg-value {
    font-size: 0.9rem;
  }

  .name-en {
    font-weight: 600;
    line-height: 1.2;
  }

  .name-kh {
    font-size: 0.75rem;
    opacity: 0.7;
    line-height: 1.2;
  }

  .has-error {
    background: rgba(var(--v-theme-error), 0.12);

    .score-input {
      color: rgb(var(--v-theme-error));
    }
  }
}

.score-input {
  width: 100%;
  min-width: 64px;
  min-height: 20px;
  padding: 6px 8px;
  font-size: 0.9375rem;
  font-weight: 600;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  text-align: center;
  color: inherit;
  box-sizing: border-box;

  &:hover {
    border-color: rgba(var(--v-theme-primary), 0.35);
  }

  &:focus {
    border-color: rgb(var(--v-theme-primary));
    background: rgb(var(--v-theme-surface));
    outline: none;
    box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.15);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* hide spinner */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  appearance: textfield;
}

// .student-row:hover td {
//   background: rgba(var(--v-theme-primary), 0.02);
//   cursor: pointer;
// }

// .student-row:hover .sticky-col {
//   background: rgba(var(--v-theme-primary), 0.02);
//   cursor: pointer;
// }
</style>
