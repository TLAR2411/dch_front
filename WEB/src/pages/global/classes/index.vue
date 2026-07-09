<script setup>
import ClassesList from "@/views/global/classses/ClassesList.vue";
definePage({
  meta: {
    title: "Classes",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-classes",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <ClassesList />
</template>
