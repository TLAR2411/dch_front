<script setup>
import DashboardCurriculums from "@/views/global/dashboard/DashboardCurriculums.vue";

definePage({
  meta: {
    title: "Dashboard",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <DashboardCurriculums />
</template>
