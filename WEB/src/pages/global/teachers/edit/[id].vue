<script setup>
import EditTeacher from "@/views/global/teachers/EditTeacher.vue";
definePage({
  meta: {
    title: "Edit Teacher",
    layout: "default",
    subject: "EditTeacher",
    requiresAuth: true,
    // permissions: "students:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <EditTeacher />
</template>
