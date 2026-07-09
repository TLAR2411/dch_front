<script setup>
import daily from "@/pages/accounting/reports/profit-and-loss/daily.vue";
import monthly from "@/pages/accounting/reports/profit-and-loss/monthly.vue";
import yearly from "@/pages/accounting/reports/profit-and-loss/yearly.vue";

definePage({
  meta: {
    title: "Profit And Loss",
    layout: "default",
    subject: "Auth",
    navActiveLink: "reports",
  },
});
const currentTab = ref(0);

const preventScrollInterference = (event) => {
  if (event.target.closest(".v-window__container")) {
    event.stopPropagation();
  }
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
      <VWindowItem :value="0" :key="0">
        <daily v-if="currentTab === 0" />
      </VWindowItem>
      <VWindowItem :value="1" :key="1">
        <monthly v-if="currentTab === 1" />
      </VWindowItem>
      <VWindowItem :value="2" :key="2">
        <yearly v-if="currentTab === 2" />
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
