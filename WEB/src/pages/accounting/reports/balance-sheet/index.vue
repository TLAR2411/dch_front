<script setup>
import daily from "@/pages/accounting/reports/balance-sheet/daily.vue";
import monthly from "@/pages/accounting/reports/balance-sheet/monthly.vue";
import yearly from "@/pages/accounting/reports/balance-sheet/yearly.vue";

definePage({
  meta: {
    title: "Balance Sheet",
    layout: "default",
    subject: "Auth",
  },
});

const currentTab = ref("window1");

const preventScrollInterference = (event) => {
  if (event.target.closest(".v-window__container")) {
    event.stopPropagation();
  }
};
const getMainTab = (tabParam) => {
  for (const mainTab of settingsTabs) {
    // Check if it's a main tab
    if (mainTab.tab === tabParam) return mainTab.tab;

    // Check if it's a sub-tab
    if (mainTab.sub && mainTab.sub.some((sub) => sub.tab === tabParam)) {
      return mainTab.tab;
    }
  }
  return defaultTab; // Default fallback
};

// Set the active tab on route change
onMounted(() => {
  const windowContainer = document.querySelector(".v-window");
  if (windowContainer) {
    windowContainer.addEventListener("wheel", preventScrollInterference, {
      passive: false,
    });
    windowContainer.addEventListener("touchmove", preventScrollInterference, {
      passive: false,
    });
  }
});
</script>
<template>
  <VCard>
    <VTabs v-model="currentTab" grow stacked class="v-tabs--fixed">
      <VTab>
        <VIcon icon="tabler-calendar" class="mb-3" />
        <span>{{ $t("Daily") }}</span>
      </VTab>

      <VTab>
        <VIcon icon="tabler-calendar-month" class="mb-3" />
        <span>{{ $t("Monthly") }}</span>
      </VTab>

      <VTab>
        <VIcon icon="tabler-calendar-event" class="mb-3" />
        <span>{{ $t("Yearly") }}</span>
      </VTab>
    </VTabs>

    <VWindow v-model="currentTab" class="disable-tab-transition" :touch="false">
      <VWindowItem :key="`window1`">
        <daily />
      </VWindowItem>
      <VWindowItem :key="`window2`">
        <monthly />
      </VWindowItem>
      <VWindowItem :key="`window3`">
        <yearly />
      </VWindowItem>
    </VWindow>
  </VCard>
</template>

<style scoped>
/* Ensure content area handles scrolling correctly */
.v-window__container {
  max-height: calc(100vh - 150px); /* Adjust based on your layout */
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on touch devices */
}

/* Prevent VWindow from intercepting scroll events */
.v-window {
  overflow: hidden !important;
}
</style>
