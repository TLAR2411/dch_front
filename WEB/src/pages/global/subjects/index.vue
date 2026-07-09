<script setup>
import SubjectsList from "@/views/global/subjects/SubjectList.vue";

definePage({
  meta: {
    title: "Subjects",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <SubjectsList />
</template>
