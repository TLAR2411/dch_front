<script setup>
import FamiliesList from "@/views/global/families/FamiliesList.vue";

definePage({
  meta: {
    title: "Families",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <FamiliesList />
</template>
