<script setup>
import PermissionsList from "@/views/admin/permissions/PermissionsList.vue";

definePage({
  meta: {
    title: "Permissions",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "permissions:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <PermissionsList />
</template>
