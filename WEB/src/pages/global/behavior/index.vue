<script setup>
import BehaviorList from "@/views/global/behavior/BehaviorList.vue";

definePage({
  meta: {
    title: "Behavior",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <BehaviorList />
</template>
