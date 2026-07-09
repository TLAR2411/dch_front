<script setup>
import JournalSettingsList from "@/views/accounting/journal-settings/JournalSettingsList.vue";

definePage({
  meta: {
    title: "Journal Settings",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <JournalSettingsList />
</template>
