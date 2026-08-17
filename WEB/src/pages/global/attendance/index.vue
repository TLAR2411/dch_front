<script setup>
import CheckAttendance from "@/views/global/attendance/CheckAttendance.vue";

definePage({
  meta: {
    title: "Attendance",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "attendance:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CheckAttendance />
</template>
