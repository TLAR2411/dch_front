<script setup>
import CurriculumsList from "@/views/curriculums/CurriculumsList.vue";

definePage({
  meta: {
    title: "Checkin Checkout",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-curriculumns",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CurriculumsList />
</template>
