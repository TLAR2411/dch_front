<script setup>
import RolesList from "@/views/admin/roles/RolesList.vue";

definePage({
  meta: {
    title: "Roles",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-roles",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <RolesList />
</template>
