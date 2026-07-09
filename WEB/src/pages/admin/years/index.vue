<script setup>
import YearList from "@/views/admin/years/YearList.vue";

definePage({
  meta: {
    title: "Years",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-students",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <YearList />
</template>