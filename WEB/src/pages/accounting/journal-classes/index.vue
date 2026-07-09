<script setup>
import JournalClassesList from "@/views/accounting/journal-classes/JournalClassesList.vue";

definePage({
  meta: {
    title: "Classes",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <JournalClassesList />
</template>
