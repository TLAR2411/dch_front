<script setup>
import ReportAttendance from "@/views/global/report/attendance/ReportAttendance.vue";

definePage({
  meta: {
    title: "Report Attendance",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "grades:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <ReportAttendance />
</template>
