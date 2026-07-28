<script setup>
import GradeSubjectList from "@/views/global/gradesubject/GradeSubjectList.vue";

definePage({
  meta: {
    title: "Grade Subjects",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-grades",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <GradeSubjectList />
</template>
