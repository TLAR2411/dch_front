<script setup>
import ScoreEntry from "@/views/global/score/ScoreEntry.vue";

definePage({
  meta: {
    title: "Score Entry",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <ScoreEntry />
</template>
