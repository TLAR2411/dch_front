<script setup>
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import { useYearStore } from "@/stores/yearStore";
import { usePartStore } from "@/stores/partStore";
import { getPartDashboardRoute } from "@/utils/partHomeRoutes";
import { app } from "@/utils/app";

const router = useRouter();
const yearStore = useYearStore();
const partStore = usePartStore();
const { year_id } = storeToRefs(yearStore);
const { smAndDown } = useDisplay();

// `app()` reads localStorage["app"], which NOTHING in this codebase ever
// writes — no commit in the repo's history contains a setItem for that key. So
// this was always undefined, and the `?.` protected the app() call while
// leaving `years.value` unguarded one line below.
//
// This component sits in DefaultLayoutWithVerticalNav, so the throw took out
// every page using that layout: 65 of 82 routes rendered the error boundary
// instead of their content. Defaulting to [] degrades to an empty year picker
// rather than a dead app.
const years = ref(app()?.years ?? []);

const currentYear = computed(() => {
  const list = years.value ?? [];
  if (!list.length) return null;

  return list.find((item) => item.id === year_id.value) ?? list[list.length - 1];
});

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
  <!-- Mobile: calendar icon only -->
  <IconBtn
    v-if="smAndDown"
    class="navbar-year-icon-btn flex-shrink-0"
    :aria-label="currentYear?.year_name || $t('Academic Year')"
  >
    <VIcon size="24" icon="tabler-calendar" />
    <VMenu activator="parent" location="bottom start" offset="6" class="pa-0">
      <VList size="small" class="py-1 navbar-year-menu">
        <VListItem
          v-for="item in years"
          :key="item.id"
          size="small"
          :active="item.id === year_id"
          @click="switchYear(item.id)"
        >
          <VListItemTitle>{{ item.year_name }}</VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </IconBtn>

  <!-- hello world -->


  

  <!-- Desktop: year label chip -->
  <VBtn
    v-else
    size="small"
    variant="tonal"
    color="primary"
    class="navbar-year-btn"
  >
    <span class="font-weight-bold text-truncate">
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

<style scoped>
.navbar-year-btn {
  flex-shrink: 1;
  max-inline-size: 130px;
  min-inline-size: 0;
}
</style>
