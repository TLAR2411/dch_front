<script setup>

import ReportExam from "@/views/global/report/exam/ReportExam.vue";

definePage({
  meta: {
    title: "Report Exam",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "grades:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <ReportExam />
</template>
