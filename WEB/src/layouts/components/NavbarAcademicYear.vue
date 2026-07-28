<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useYearStore } from "@/stores/yearStore";
import { usePartStore } from "@/stores/partStore";
import { getPartDashboardRoute } from "@/utils/partHomeRoutes";
import { app } from "@/utils/app";

const router = useRouter();
const yearStore = useYearStore();
const partStore = usePartStore();
const { year_id } = storeToRefs(yearStore);

const years = ref(app()?.years);

const currentYear = computed(
  () =>
    years.value.find((item) => item.id === year_id.value) ??
    years.value[years.value.length - 1],
);

const navigateToPartDashboard = () => {
  const dashboardRoute = getPartDashboardRoute(partStore.system_part);

  if (router.currentRoute.value.name === dashboardRoute) return;
  if (router.hasRoute(dashboardRoute)) {
    router.push({ name: dashboardRoute });
  }
};

const switchYear = (id) => {
  if (id === year_id.value) return;
  yearStore.setYearId(id);
  navigateToPartDashboard();
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
