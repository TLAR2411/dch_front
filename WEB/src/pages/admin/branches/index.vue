<script setup>
import BranchesList from "@/views/admin/branches/BranchesList.vue";

definePage({
  meta: {
    title: "Branches",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "branches:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <BranchesList />
</template>
