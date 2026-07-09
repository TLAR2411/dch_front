<script setup>
import CloseDaysList from "@/views/admin/closed-days/CloseDaysList.vue";

definePage({
  meta: {
    title: "Closed Days",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CloseDaysList />
</template>
