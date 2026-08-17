<script setup>
import TeacherDetail from "@/views/global/teachers/TeacherDetail.vue";

definePage({
  meta: {
    title: "Teacher Detail",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "teachers:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <TeacherDetail />
</template>
