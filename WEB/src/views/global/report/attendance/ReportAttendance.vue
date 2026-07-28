<script setup>
import { getClasses } from "@/services/dataService";
import { onMounted, ref } from "vue";
import ReportAttendanceByDay from "../components/ReportAttendanceByDay.vue";
import ReportAttendanceByMonth from "../components/ReportAttendanceByMonth.vue";
import ReportAttendanceByTerm from "../components/ReportAttendanceByTerm.vue";
import ReportAttendanceByYear from "../components/ReportAttendanceByYear.vue";

const classes = ref([]);
const reportType = ref("day");

const form = ref({
  class_id: null,
});

onMounted(async () => {
  classes.value = await getClasses();
});
</script>

<template>
  <div>
    <VRow align="center">
      <VCol cols="12" md="4">
        <AppSelect
          v-model="form.class_id"
          :items="classes"
          item-title="name_en"
          item-value="id"
          autocomplete="off"
          placeholder="Choose Class"
        />
      </VCol>
      <VCol cols="12" md="8">
        <VBtnToggle
          v-model="reportType"
          density="compact"
          color="primary"
          divided
          class="report-type-toggle w-100"
        >
          <VBtn value="day" class="flex-grow-1">Day</VBtn>
          <VBtn value="month" class="flex-grow-1">Month</VBtn>
          <VBtn value="term" class="flex-grow-1">Term</VBtn>
          <VBtn value="year" class="flex-grow-1">Year</VBtn>
        </VBtnToggle>
      </VCol>
    </VRow>

    <VCard v-if="!form.class_id" class="mt-3 pa-8 text-center">
      <VIcon size="48" class="mb-3" style="opacity: 0.35">tabler-school</VIcon>
      <div class="text-body-1 font-weight-medium">
        Select a class to view attendance reports
      </div>
      <div class="text-body-2 mt-1" style="opacity: 0.7">
        Choose a class above, then pick Day, Month, Term, or Year.
      </div>
    </VCard>

    <VCard v-if="form.class_id" class="mt-3 pa-3">
      <ReportAttendanceByDay
        v-if="reportType === 'day'"
        :class_id="form.class_id"
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
