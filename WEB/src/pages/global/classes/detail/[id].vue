<script setup>
import ClassDetail from "@/views/global/classses/ClassDetail.vue";

definePage({
  meta: {
    title: "Classes",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "classes:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <ClassDetail />
</template>
