<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { allClasses } from "@/services/api/classes";
import { getClasses, getGrades, getTerms } from "@/services/dataService";
import { getCurrentYearId } from "@/services/getCurrentYearId";
import ReportStudentIndividual from "../components/ReportStudentIndividual.vue";

import ReportRanking from "../components/ReportRanking.vue";
import ReportTeacherRecommendation from "../components/ReportTeacherRecommendation.vue";

import { usePartStore } from "@/stores/partStore";
import {
  getEntityLabel,
} from "@/utils/reportLabels.js";
import { usePageTour } from "@/composable/usePageTour";

usePageTour("global-report-exam", { delayMs: 500 });

const { t } = useI18n();
const pathStore = usePartStore();

const yearId = ref(getCurrentYearId());

const cur_id = ref(pathStore.cur_id);

const reportPart = computed(() => pathStore.system_part || "english");

function selectItemTitle(item) {
  return getEntityLabel(item, reportPart.value, "");
}

const activeTab = ref("ranking");

const reportTitle = ref("Report Exam");

const formSearch = ref({
  grade_id: null,
  class_id: null,
  term_id: null,
  type_report: "Term",
});

const grades = ref([]);
const classes = ref([]);
const terms = ref([]);
const loading = ref(false);

/** Open panel index; `undefined` = collapsed */
const openedPanel = ref(0);

/** Empty state stays until user clicks Search */
const hasSearched = ref(false);

const typeReport = computed(() => [
  { label: t("Term"), value: "Term" },
  { label: t("Final"), value: "Final" },
]);

/** Classes belonging to the selected grade only */
const filteredClasses = computed(() => {
  if (!formSearch.value.grade_id) return [];

  return (classes.value || []).filter(
    (item) => Number(item.grade_id) === Number(formSearch.value.grade_id),
  );
});

const selectedGrade = computed(
  () =>
    grades.value.find(
      (g) => Number(g.id) === Number(formSearch.value.grade_id),
    ) ?? null,
);

const selectedClass = computed(
  () =>
    filteredClasses.value.find(
      (c) => Number(c.id) === Number(formSearch.value.class_id),
    ) ?? null,
);

const selectedTerm = computed(
  () =>
    terms.value.find(
      (t) => Number(t.id) === Number(formSearch.value.term_id),
    ) ?? null,
);

const filterSummary = computed(() => {
  const parts = [];

  if (selectedGrade.value)
    parts.push(getEntityLabel(selectedGrade.value, reportPart.value, ""));
  if (selectedClass.value)
    parts.push(
      getEntityLabel(selectedClass.value, reportPart.value, "") ||
        selectedClass.value.symbol,
    );
  if (formSearch.value.type_report === "Term" && selectedTerm.value)
    parts.push(getEntityLabel(selectedTerm.value, reportPart.value, ""));
  else if (formSearch.value.type_report === "Final") parts.push(t("Final"));

  return parts.length ? parts.join(" · ") : t("Select filters to generate report");
});

const canSearch = computed(() => {
  const base =
    !!formSearch.value.grade_id && !!formSearch.value.class_id;

  if (formSearch.value.type_report === "Term")
    return base && !!formSearch.value.term_id;

  return base;
});

watch(
  () => formSearch.value.grade_id,
  () => {
    formSearch.value.class_id = null;
  },
);

watch(
  () => formSearch.value.type_report,
  (type) => {
    if (type !== "Term") formSearch.value.term_id = null;
  },
);

function onSearch() {
  if (!canSearch.value) return;

  hasSearched.value = true;
  openedPanel.value = undefined;
}

function onClear() {
  formSearch.value = {
    grade_id: null,
    class_id: null,
    term_id: null,
    type_report: "Term",
  };
  hasSearched.value = false;
  activeTab.value = "ranking";
  openedPanel.value = 0;
}


const fetchClasses = async ()=>{
    loading.value = true;
    try {
        // classes.value = await allClasses({ year_id: yearId.value }) ?? [];
        classes.value = await getClasses();
    } catch (error) {
        
    }
}


onMounted(async () => {
    await fetchClasses();
  loading.value = true;
  try {
    const [gradeRows, termRows] = await Promise.all([
      getGrades(),
      getTerms(yearId.value),
    ]);
    grades.value = gradeRows ?? [];
    terms.value = termRows ?? [];
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="mt-4">
    <VExpansionPanels
      id="page-tour-exam-report-filters"
      v-model="openedPanel"
      variant="accordion"
      class="report-exam-filters"
    >
      <VExpansionPanel>
        <VExpansionPanelTitle>
          <div class="d-flex align-center ga-3 flex-wrap">
            <VAvatar
              color="primary"
              variant="tonal"
              size="36"
              rounded="lg"
            >
              <VIcon icon="tabler-filter" size="20" />
            </VAvatar>
            <div>
              {{ $t("Search") }}
            </div>
          </div>
        </VExpansionPanelTitle>

        <VExpansionPanelText>
          <VDivider class="mb-4" />

          <VRow>
            <VCol id="page-tour-exam-report-grade" cols="12" md="3" sm="6">
              <AppSelect
                v-model="formSearch.grade_id"
                :items="grades"
                :item-title="selectItemTitle"
                item-value="id"
                
                :placeholder="$t('Choose Grade')"
                clearable
                :loading="loading"
              />
            </VCol>
          </VRow>

          <VRow>
            

            <VCol id="page-tour-exam-report-class" cols="12" sm="6" md="3">
              <AppSelect
                v-model="formSearch.class_id"
                :items="filteredClasses"
                :item-title="selectItemTitle"
                item-value="id"
                
                :placeholder="$t('Choose Class')"
                clearable
                :disabled="!formSearch.grade_id"
                :loading="loading"
              />
            </VCol>

            <VCol id="page-tour-exam-report-type" cols="12" sm="6" md="3">
              <AppSelect
                v-model="formSearch.type_report"
                :items="typeReport"
                item-title="label"
                item-value="value"
                
              />
            </VCol>

            <VCol
              v-if="formSearch.type_report === 'Term'"
              id="page-tour-exam-report-term"
              cols="12"
              sm="6"
              md="3"
            >
              <AppSelect
                v-model="formSearch.term_id"
                :items="terms"
                :item-title="selectItemTitle"
                item-value="id"
                
                :placeholder="$t('Choose Term')"
                clearable
                :loading="loading"
              />
            </VCol>

            <VCol cols="12" sm="6" md="3" class="d-flex justify-end ga-2 ">
             
            <VBtn
              variant="tonal"
              color="secondary"
              prepend-icon="tabler-x"
              @click="onClear"
            >
              {{ $t("Clear") }}
            </VBtn>
            <VBtn
              id="page-tour-exam-report-search"
              color="primary"
              prepend-icon="tabler-search"
              :disabled="!canSearch"
              @click="onSearch"
            >
              {{ $t("Search") }}
            </VBtn>
      
            </VCol>
          </VRow>

         
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <VCard
      v-if="!hasSearched"
      id="page-tour-exam-report-empty"
      class="mt-4 report-exam-empty"
      variant="outlined"
    >
      <div class="pa-8 text-center d-flex flex-column align-center">
        <VAvatar
          color="primary"
          variant="tonal"
          size="64"
          rounded="lg"
          class="mb-4"
        >
          <VIcon icon="tabler-file-analytics" size="32" />
        </VAvatar>

        <div class="text-h6 font-weight-medium mb-1">
          {{ $t("No exam report yet") }}
        </div>
        <div class="text-body-2 text-medium-emphasis mb-6" style="max-width: 360px">
          {{ $t("Open the filters above, choose a grade and class") }}
          <template v-if="formSearch.type_report === 'Term'">
            {{ $t(", then pick a term") }}
          </template>
          {{ $t(", and click Search.") }}
        </div>

        <div class="d-flex flex-wrap justify-center ga-2">
          <VChip
            size="small"
            :color="formSearch.grade_id ? 'success' : 'default'"
            :variant="formSearch.grade_id ? 'flat' : 'tonal'"
            prepend-icon="tabler-stack-2"
          >
            {{ $t("Grade") }}
          </VChip>
          <VIcon icon="tabler-chevron-right" size="16" class="text-medium-emphasis" />
          <VChip
            size="small"
            :color="formSearch.class_id ? 'success' : 'default'"
            :variant="formSearch.class_id ? 'flat' : 'tonal'"
            prepend-icon="tabler-school"
          >
            {{ $t("Class") }}
          </VChip>
          <template v-if="formSearch.type_report === 'Term'">
            <VIcon icon="tabler-chevron-right" size="16" class="text-medium-emphasis" />
            <VChip
              size="small"
              :color="formSearch.term_id ? 'success' : 'default'"
              :variant="formSearch.term_id ? 'flat' : 'tonal'"
              prepend-icon="tabler-calendar"
            >
              {{ $t("Term") }}
            </VChip>
          </template>
        </div>
      </div>
    </VCard>

    <VCard v-else id="page-tour-exam-report-results" class="mt-4 pa-4">
      <VTabs
        id="page-tour-exam-report-tabs"
        v-model="activeTab"
        color="primary"
        class="mb-4"
        show-arrows
      >
        <VTab
          id="page-tour-exam-report-tab-ranking"
          value="ranking"
          prepend-icon="tabler-trophy"
        >
          {{ $t("Ranking") }}
        </VTab>
        <VTab
          id="page-tour-exam-report-tab-individual"
          value="individual"
          prepend-icon="tabler-user"
        >
          {{ $t("Individual") }}
        </VTab>
      </VTabs>

      <VWindow v-model="activeTab" class="disable-tab-transition" :touch="false">
        <VWindowItem value="ranking">
          <ReportRanking :form-search="formSearch" />
        </VWindowItem>

        <!-- <VWindowItem value="academics">
          <div class="pa-2 text-body-2 text-medium-emphasis">
            Academics report for
            <strong>{{ filterSummary }}</strong>
          </div>
        </VWindowItem> -->

        <VWindowItem value="individual">
          <ReportStudentIndividual :form-search="formSearch" />
        </VWindowItem>

        <!-- <VWindowItem value="behavior">
          <div class="pa-2 text-body-2 text-medium-emphasis">
            Behavior report for
            <strong>{{ filterSummary }}</strong>
          </div>
        </VWindowItem> -->

        <!-- <VWindowItem value="other">
          <div class="pa-2 text-body-2 text-medium-emphasis">
            Other report for
            <strong>{{ filterSummary }}</strong>
          </div>
        </VWindowItem> -->
      </VWindow>
    </VCard>
  </div>
</template>

<style scoped>
.report-exam-filters :deep(.v-expansion-panel) {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 7px !important;
  overflow: hidden;
}

.report-exam-filters :deep(.v-expansion-panel__shadow) {
  display: none;
}

.report-exam-filters :deep(.v-expansion-panel-title) {
  
}

.report-exam-filters :deep(.v-expansion-panel-text__wrapper) {
  padding-block-start: 0;
}

.report-exam-empty {
  border-style: dashed !important;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
</style>
