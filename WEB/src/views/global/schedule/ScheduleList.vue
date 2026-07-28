<script setup>
import { getClasses } from "@/services/dataService";
import { computed, onMounted, ref } from "vue";
import Schedule from "../components/Schedule.vue";

const classes = ref([]);

const form = ref({
  class_id: null,
});

const selectedClassName = computed(() => {
  const match = classes.value.find((c) => c.id === form.value.class_id);
  return match?.name_en || "";
});

onMounted(async () => {
  classes.value = (await getClasses()) || [];

  if (classes.value.length > 0) {
    form.value.class_id = classes.value[0].id;
  }
});
</script>

<template>
  <VRow>
    <VCol cols="12" md="4" class="mt-2 schedule-list-no-print">
      <AppSelect
        :loading="form.class_id == null"
        v-model="form.class_id"
        :items="classes"
        item-title="name_en"
        item-value="id"
        placeholder="Select Class"
        autocomplete="off"
      />
    </VCol>
    <VCol cols="12" md="12" v-if="form.class_id" style="margin-top: -5px">
      <Schedule
        :key="form.class_id"
        :class_id="form.class_id"
        :class_name="selectedClassName"
        :classes="classes"
      />
    </VCol>
  </VRow>
</template>
