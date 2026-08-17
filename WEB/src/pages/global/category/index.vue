<script setup>
import CategoryList from "@/views/global/category/CategoryList.vue";

definePage({
  meta: {
    title: "Category",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "positions:view-page",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <CategoryList />
</template>
