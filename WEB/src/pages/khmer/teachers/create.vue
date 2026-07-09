<script setup>
import CreateTeacher from "@/views/global/teachers/CreateTeacher.vue";
definePage({
  meta: {
    title: "Create Teacher",
    layout: "default",
    subject: "CreateTeacher",
    requiresAuth: true,
    // permissions: "view-teacher",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CreateTeacher />
</template>
