<script setup>
import PositionsList from "@/views/admin/positions/PositionsList.vue";

definePage({
  meta: {
    title: "Positions",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <PositionsList />
</template>
