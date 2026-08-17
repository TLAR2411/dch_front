<script setup>
import SubjectDetail from "@/views/global/subjects/SubjectDetail.vue";

definePage({
  meta: {
    title: "Subject Detail",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "subjects:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <SubjectDetail />
</template>
