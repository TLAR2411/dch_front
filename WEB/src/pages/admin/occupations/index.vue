<script setup>
import OccupationsList from "@/views/admin/occupations/OccupationsList.vue";

definePage({
  meta: {
    title: "Occupations",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <OccupationsList />
</template>
