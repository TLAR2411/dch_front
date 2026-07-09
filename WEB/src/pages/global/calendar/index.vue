<script setup>
import CalendarList from "@/views/global/calendar/CalendarList.vue";

definePage({
  meta: {
    title: "Calendar",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CalendarList />
</template>
