<script setup>
import { api } from "@/utils/api";
import { onMounted, ref, watch, computed } from "vue";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect"; // ← ADD THIS
import "flatpickr/dist/plugins/monthSelect/style.css";
const props = defineProps({
  class_id: {
    type: Number,
  },
});

const hasData = ref(false);

const attData = ref([]);

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

const loading = ref(false);

const currentMonth = new Date();

const formDay = ref({
  type: "month",
  class_id: props.class_id,
  start_date: null,
});

const getData = async () => {
  hasData.value = true;
  loading.value = true;
  try {
    const res = await api.post(
      "students-classes-attendance-report",
      formDay.value,
    );
    attData.value = res.data.data || [];
  } catch (error) {
    console.log(error);
  } finally {
    loading.value = false;
  }
};

watch(
  [() => props.class_id, () => formDay.value.start_date],
  ([classId, startDate]) => {
    if (!classId || !startDate) return;
    formDay.value.class_id = classId;
    getData();
  },
);

onMounted(() => {
  formDay.value.start_date = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
});
</script>
<template>
  <VRow class="mt-1" align="center">
    <VCol cols="9" md="3">
      <AppDateTimePicker
        v-model="formDay.start_date"
        placeholder="Select date"
        :config="monthPickerConfig"
      />
    </VCol>
    <VCol cols="9" md="3">
      <AppDateTimePicker
        v-model="formDay.start_date"
        placeholder="Select date"
        :config="monthPickerConfig"
      />
    </VCol>
    <VCol cols="3" md="3">
      <VBtn
        color="success"
        view-mode="months"
        variant="tonal"
        density="comfortable"
        :loading="loading"
        :disabled="loading"
        @click="getData"
        prepend-icon="tabler-search"
        >Search</VBtn
      >
    </VCol>
  </VRow>
</template>
