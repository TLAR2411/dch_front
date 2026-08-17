<script setup>
import CreateStudent from "@/views/admin/students/CreateStudent.vue";

definePage({
  meta: {
    title: "Create Student",
    layout: "default",
    subject: "CreateStudent",
    requiresAuth: true,
    // permissions: "students:view-page",
  },
});
</script>

<template>
  <CreateStudent />
</template>