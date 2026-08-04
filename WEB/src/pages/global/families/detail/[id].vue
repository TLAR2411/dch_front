<script setup>
import FamilyDetail from "@/views/global/families/FamilyDetail.vue";

definePage({
  meta: {
    title: "Family Detail",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <FamilyDetail />
</template>
