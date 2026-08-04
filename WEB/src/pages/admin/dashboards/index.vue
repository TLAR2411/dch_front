<script setup>
import AdminDashboard from "@/views/admin/dashboards/AdminDashboard.vue";

definePage({
  meta: {
    title: "Dashboards",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <AdminDashboard />
</template>
