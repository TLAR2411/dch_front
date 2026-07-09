<script setup>
import TeacherList from "@/views/global/teachers/TeacherList.vue";

definePage({
  meta: {
    title: "Teachers",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-teachers",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <TeacherList />
</template>
