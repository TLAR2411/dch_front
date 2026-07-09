<script setup>

import TermList from "@/views/global/termperiod/TermList.vue";

definePage({
  meta: {
    title: "Subjects",
    layout: "default",
    subject: "Auth",
    requiresAuth: true,
    // permissions: "view-positions",
    layoutWrapperClasses: "layout-content-height-fixed",
  },
});
</script>

<template>
  <TermList />
</template>
