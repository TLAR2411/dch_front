<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useYearStore } from "@/stores/yearStore";
import { getYears } from "@/services/dataService";
import { app } from "@/utils/app";

const yearStore = useYearStore();
const { year_id } = storeToRefs(yearStore);

const years = ref(app()?.years);

const currentYear = computed(
  () =>
    years.value.find((item) => item.id === year_id.value) ??
    years.value[years.value.length - 1],
);

const switchYear = (id) => {
  if (id === year_id.value) return;
  yearStore.setYearId(id);
};

onMounted(async () => {
  if (!year_id.value && years.value.length) {
    yearStore.setYearId(years.value[years.value.length - 1].id);
  }
});
</script>

<template>
  <VBtn size="small" variant="tonal" color="primary">
    <span class="font-weight-bold">
      {{ currentYear?.year_name }}
    </span>
    <VMenu activator="parent" location="bottom end" offset="6" class="pa-0">
      <VList size="small" class="py-1">
        <VListItem
          v-for="item in years"
          :key="item.id"
          size="small"
          class="pa-0"
          :active="item.id === year_id"
          @click="switchYear(item.id)"
        >
          <VListItemTitle>{{ item.year_name }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </VBtn>
</template>
