<script setup>
import CloseDaysList from "@/views/admin/closed-days/CloseDaysList.vue";

definePage({
  meta: {
    title: "Closed Days",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "academics-periods:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CloseDaysList />
</template>
