<script setup>
import EditStudent from "@/views/admin/students/EditStudent.vue";
definePage({
  meta: {
    title: "Edit Student",
    layout: "default",
    subject: "EditStudent",
    requiresAuth: true,
    // permissions: "view-students",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <EditStudent />
</template>