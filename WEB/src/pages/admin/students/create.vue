<script setup>
import CreateStudent from "@/views/admin/students/CreateStudent.vue";

definePage({
  meta: {
    title: "Create Student",
    layout: "default",
    subject: "CreateStudent",
    requiresAuth: true,
    // permissions: "view-students",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CreateStudent />
</template>