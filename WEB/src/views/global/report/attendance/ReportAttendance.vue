<script setup>
import { getClasses } from "@/services/dataService";
import { computed, onMounted, ref } from "vue";
import { usePartStore } from "@/stores/partStore";
import { getEntityLabel } from "@/utils/reportLabels.js";
import ReportAttendanceByDay from "../components/ReportAttendanceByDay.vue";
import ReportAttendanceByMonth from "../components/ReportAttendanceByMonth.vue";
import ReportAttendanceByTerm from "../components/ReportAttendanceByTerm.vue";
import ReportAttendanceByYear from "../components/ReportAttendanceByYear.vue";
import { usePageTour } from "@/composable/usePageTour";

usePageTour("global-report-attendance", { delayMs: 500 });

const partStore = usePartStore();
const reportPart = computed(() => partStore.system_part || "english");

function selectItemTitle(item) {
  return getEntityLabel(item, reportPart.value, "");
}

const classes = ref([]);
const reportType = ref("day");

const form = ref({
  class_id: null,
});

const selectedClassName = computed(() => {
  const match = classes.value.find(
    (c) => Number(c.id) === Number(form.value.class_id),
  );
  return selectItemTitle(match) || "—";
});

onMounted(async () => {
  classes.value = await getClasses();
});
</script>

<template>
  <div>
    <VRow id="page-tour-att-report-top" align="center">
      <VCol id="page-tour-att-report-class" cols="12" md="4">
        <AppSelect
          v-model="form.class_id"
          :items="classes"
          :item-title="selectItemTitle"
          item-value="id"
          autocomplete="off"
          :placeholder="$t('Choose Class')"
        />
      </VCol>
      <VCol id="page-tour-att-report-type" cols="12" md="8">
        <VBtnToggle
          v-model="reportType"
          density="compact"
          color="primary"
          divided
          class="report-type-toggle w-100"
        >
          <VBtn value="day" class="flex-grow-1">{{ $t("Day") }}</VBtn>
          <VBtn value="month" class="flex-grow-1">{{ $t("Month") }}</VBtn>
          <VBtn value="term" class="flex-grow-1">{{ $t("Term") }}</VBtn>
          <VBtn value="year" class="flex-grow-1">{{ $t("Year") }}</VBtn>
        </VBtnToggle>
      </VCol>
    </VRow>

    <VCard
      v-if="!form.class_id"
      id="page-tour-att-report-empty"
      class="mt-3 pa-8 text-center"
    >
      <VIcon size="48" class="mb-3" style="opacity: 0.35">tabler-school</VIcon>
      <div class="text-body-1 font-weight-medium">
        {{ $t("Select a class to view attendance reports") }}
      </div>
      <div class="text-body-2 mt-1" style="opacity: 0.7">
        {{ $t("Choose a class above, then pick Day, Month, Term, or Year.") }}
      </div>
    </VCard>

    <VCard
      v-if="form.class_id"
      id="page-tour-att-report-panel"
      class="mt-3 pa-3"
    >
      <ReportAttendanceByDay
        v-if="reportType === 'day'"
        :class_id="form.class_id"
        :class_name="selectedClassName"
      />
      <ReportAttendanceByMonth
        v-else-if="reportType === 'month'"
        :class_id="form.class_id"
      />
      <ReportAttendanceByTerm
        v-else-if="reportType === 'term'"
        :class_id="form.class_id"
      />
      <ReportAttendanceByYear
        v-else-if="reportType === 'year'"
        :class_id="form.class_id"
      />
    </VCard>
  </div>
</template>

<style scoped>
.report-type-toggle :deep(.v-btn) {
  text-transform: none;
  letter-spacing: 0;
}
</style>
