<script setup>
import AssessmentList from "@/views/global/Assessment/AssessmentList.vue";

definePage({
  meta: {
    title: "Assessments",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <AssessmentList />
</template>
