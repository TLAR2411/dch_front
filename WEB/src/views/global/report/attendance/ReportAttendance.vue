<script setup>
import { getClasses } from "@/services/dataService";
import { onMounted, ref } from "vue";
import ReportAttendanceByDay from "../components/ReportAttendanceByDay.vue";
import ReportAttendanceByMonth from "../components/ReportAttendanceByMonth.vue";

const classes = ref([]);

const currentTab = ref("window1");

const form = ref({
  class_id: null,
});

onMounted(async () => {
  classes.value = await getClasses();
  if (classes.value.length > 0) {
    form.value.class_id = classes.value[0].id;
  }
});
</script>
<template>
  <div>
    <VRow>
      <VCol cols="12" md="2"
        ><AppSelect
          v-model="form.class_id"
          :items="classes"
          item-title="name_en"
          item-value="id"
          autocomplete="off"
          placeholder="Choose Class"
      /></VCol>
      <VCol cols="12" md="8">
        <VTabs
          density="comfortable"
          variant="tonal"
          v-model="currentTab"
          class="v-tabs-pill"
        >
          <VTab>Day</VTab>
          <VTab>Month</VTab>
          <VTab>Term</VTab>
          <VTab>Year</VTab>
        </VTabs>
      </VCol>
    </VRow>
    <VCard class="mt-3 pa-3">
      <VWindow v-model="currentTab">
        <VWindowItem>
          <ReportAttendanceByDay :class_id="form.class_id" />
        </VWindowItem>
        <VWindowItem>
          <ReportAttendanceByMonth :class_id="form.class_id" />
        </VWindowItem>
      </VWindow>
    </VCard>
  </div>
</template>
