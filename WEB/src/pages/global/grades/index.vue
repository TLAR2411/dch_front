<script setup>
import GradeList from "@/views/global/grades/GradeList.vue";

definePage({
  meta: {
    title: "Grades",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-grades",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <GradeList />
</template>
