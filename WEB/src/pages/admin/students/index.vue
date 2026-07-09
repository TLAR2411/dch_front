<script setup>
import StudentList from "@/views/admin/students/StudentList.vue";

definePage({
  meta: {
    title: "Students",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-students",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <StudentList />
</template>