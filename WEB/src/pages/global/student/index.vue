<script setup>
import StudentCurriculumList from "@/views/global/students/StudentCurriculumList.vue";

definePage({
  meta: {
    title: "Students",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-teachers",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <StudentCurriculumList />
</template>
