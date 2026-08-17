<script setup>
import Schedule from "@/views/global/components/Schedule.vue";
import ScheduleList from "@/views/global/schedule/ScheduleList.vue";
definePage({
  meta: {
    title: "Schdules",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "teachers:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <ScheduleList />
</template>
