<script setup>
import BranchesList from "@/views/admin/branches/BranchesList.vue";

definePage({
  meta: {
    title: "Dashboard",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <BranchesList />
</template>
