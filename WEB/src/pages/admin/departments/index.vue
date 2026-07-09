<script setup>
import DepartmentsList from "@/views/admin/departments/DepartmentsList.vue";

definePage({
  meta: {
    title: "Departments",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-departments",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <DepartmentsList />
</template>
